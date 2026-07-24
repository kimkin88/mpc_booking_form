/**
 * Parse media-plan / MPC brief Excel documents into booking autofill payloads.
 *
 * Supported shapes (from production examples):
 * 1. Label/value media plan (CLIENT / CAMPAIGN NAME / MARKET table) — e.g. Keely OOH
 * 2. Multi-market brief sheets (KPI / Environment / Site/Network Name) — e.g. Nike RTP
 */

import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { MARKET_CITIES } from '@/lib/rateCard';

const MAX_SITES = 80;
const MAX_BYTES = 15 * 1024 * 1024;

const SHEET_CITY = {
  FR: 'Paris',
  UK: 'London',
  DE: 'Berlin',
  IT: 'Milan',
  ES: 'Barcelona',
  NL: 'Amsterdam',
  ZA: 'Johannesburg',
  TR: 'Istanbul',
};

const SHEET_CURRENCY = {
  FR: 'EUR',
  UK: 'GBP',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  ZA: 'USD',
  TR: 'USD',
};

function clean(value) {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function cellStr(row, idx) {
  return clean(row?.[idx]);
}

function normalizeKey(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toDateOnly(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // SheetJS often stores local midnight as previous-day UTC evening (e.g. 21:00Z).
    // Use local parts when time is not exactly UTC midnight.
    const useLocal = value.getUTCHours() !== 0 || value.getUTCMinutes() !== 0;
    const y = useLocal ? value.getFullYear() : value.getUTCFullYear();
    const m = String((useLocal ? value.getMonth() : value.getUTCMonth()) + 1).padStart(2, '0');
    const d = String(useLocal ? value.getDate() : value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial dates are typically ~30000–60000 for 1980–2060
    if (value < 20000 || value > 80000) return null;
    // Excel epoch (with 1900 leap-year bug): days since 1899-12-30
    const utc = Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000;
    const d = new Date(utc);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const raw = clean(value);
  if (!raw) return null;

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  // DD/MM/YY or DD/MM/YYYY
  let m = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const day = String(Number(m[1])).padStart(2, '0');
    const month = String(Number(m[2])).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // "17 July 2026" etc.
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime()) && /[a-zA-Z]/.test(raw)) {
    const y = asDate.getFullYear();
    const mo = String(asDate.getMonth() + 1).padStart(2, '0');
    const d = String(asDate.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return null;
}

function inferYearFromRows(rows = []) {
  const years = [];
  for (const row of rows) {
    for (const cell of row || []) {
      // Only real Date cells — ignore week-strip noise preference via mode/max below
      if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
        years.push(cell.getUTCFullYear());
      }
    }
  }
  if (!years.length) return new Date().getFullYear();
  // Prefer the latest year present (live dates often sit after calendar-strip headers)
  return Math.max(...years);
}

/** Keep label casing from the sheet (NIKE / KEELY); only soft-format guesses from filenames. */
function prettyName(value, { fromFilename = false } = {}) {
  const raw = clean(value);
  if (!raw) return null;
  if (!fromFilename) return raw;
  if (raw === raw.toUpperCase() && raw.length <= 12) {
    return raw.charAt(0) + raw.slice(1).toLowerCase();
  }
  return raw;
}

function formatMoneyNote(n, currency) {
  if (n == null) return null;
  const cur = currency || 'GBP';
  return `${cur} ${Math.round(n).toLocaleString('en-GB')}`;
}

function parseDateRangeText(text, fallbackYear = new Date().getFullYear()) {
  const raw = clean(text);
  if (!raw) return { start: null, end: null };

  // 17/07 - 19/07 or 17/07/26 - 19/07/26
  let m = raw.match(
    /(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\s*[-–—to]+\s*(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/i
  );
  if (m) {
    const y1 = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : fallbackYear;
    const y2 = m[6] ? (Number(m[6]) < 100 ? 2000 + Number(m[6]) : Number(m[6])) : y1;
    return {
      start: `${y1}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`,
      end: `${y2}-${String(Number(m[5])).padStart(2, '0')}-${String(Number(m[4])).padStart(2, '0')}`,
    };
  }

  // May (06.05-19.05) or Jul (01.07-14.07)
  m = raw.match(/(\d{1,2})\.(\d{1,2})\s*[-–—]\s*(\d{1,2})\.(\d{1,2})/);
  if (m) {
    const y = fallbackYear;
    return {
      start: `${y}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`,
      end: `${y}-${String(Number(m[4])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`,
    };
  }

  // 19th July - 28th July
  m = raw.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*[-–—to]+\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?/i
  );
  if (m) {
    const year = m[5] ? Number(m[5]) : fallbackYear;
    const start = toDateOnly(`${m[1]} ${m[2]} ${year}`);
    const end = toDateOnly(`${m[3]} ${m[4]} ${year}`);
    return { start, end };
  }

  // May (from 17th)
  m = raw.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\(\s*from\s+(\d{1,2})(?:st|nd|rd|th)?\s*\)/i
  );
  if (m) {
    const monthNames = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const month = monthNames[m[1].slice(0, 3).toLowerCase()];
    const day = String(Number(m[2])).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const start = `${fallbackYear}-${mm}-${day}`;
    // Month end as soft end
    const endDay = new Date(fallbackYear, month, 0).getDate();
    return { start, end: `${fallbackYear}-${mm}-${String(endDay).padStart(2, '0')}` };
  }

  // July 3-18 / July 19-31 / August 1-12
  m = raw.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})\b/i
  );
  if (m) {
    const monthNames = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const month = monthNames[m[1].slice(0, 3).toLowerCase()];
    const mm = String(month).padStart(2, '0');
    return {
      start: `${fallbackYear}-${mm}-${String(Number(m[2])).padStart(2, '0')}`,
      end: `${fallbackYear}-${mm}-${String(Number(m[3])).padStart(2, '0')}`,
    };
  }

  // Bare month name column e.g. June / September
  m = raw.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i);
  if (m) {
    const monthNames = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const month = monthNames[m[1].slice(0, 3).toLowerCase()];
    const mm = String(month).padStart(2, '0');
    const endDay = new Date(fallbackYear, month, 0).getDate();
    return {
      start: `${fallbackYear}-${mm}-01`,
      end: `${fallbackYear}-${mm}-${String(endDay).padStart(2, '0')}`,
    };
  }

  const single = toDateOnly(raw);
  return { start: single, end: single };
}

function looksLikeDateText(raw) {
  return (
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(raw) ||
    /\d{1,2}(?:st|nd|rd|th)/i.test(raw) ||
    /^\d{1,2}[\/.\-]\d{1,2}([\/.\-]\d{2,4})?$/.test(raw) ||
    /\d{1,2}[\/.\-]\d{1,2}\s*[-–—]/.test(raw)
  );
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial dates are typically 30000–60000; media costs are usually larger or currency-formatted.
    // Accept plain numbers; callers restrict which columns are scanned.
    return value;
  }
  if (value instanceof Date) return null;
  const raw = clean(value);
  if (!raw || /^[£€$₺]?\s*-?\s*$/.test(raw) || /n\/?a/i.test(raw)) return null;
  if (looksLikeDateText(raw)) return null;
  if (!/[£€$₺]/.test(raw) && !/^\(?-?[\d,.]+\)?$/.test(raw)) return null;
  const neg = /^\(.*\)$/.test(raw) || /^[£€$₺]?\s*-/.test(raw);
  const num = Number(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num === 0) return null;
  return neg ? -num : num;
}

function isPeriodHeader(text) {
  const raw = clean(text);
  if (!raw) return false;
  return (
    /\d{1,2}\.\d{1,2}\s*[-–—]\s*\d{1,2}\.\d{1,2}/.test(raw) ||
    /\((?:\d{1,2}\.\d{1,2}|from\s+\d)/i.test(raw) ||
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s+\d{1,2}\s*[-–—]|\s*\(|$)/i.test(
      raw
    )
  );
}

function detectCurrencyFromText(text) {
  const t = clean(text).toUpperCase();
  if (t.includes('GBP') || t.includes('£') || t.includes('(£)')) return 'GBP';
  if (t.includes('EUR') || t.includes('€') || t.includes('(€)')) return 'EUR';
  if (t.includes('USD') || t.includes('$') || t.includes('($)')) return 'USD';
  if (t.includes('ZAR')) return 'USD';
  if (t.includes('TRY') || t.includes('LIRA') || t.includes('₺')) return 'USD';
  return null;
}

function guessBrandFromFilename(filename = '') {
  const base = filename.replace(/\.[^.]+$/, '');
  const known = ['Nike', 'Adidas', 'Puma', 'Jordan', 'Converse', 'Apple', 'Samsung'];
  for (const brand of known) {
    if (new RegExp(`\\b${brand}\\b`, 'i').test(base)) return brand;
  }
  const first = base.split(/[\s_+-]+/).filter(Boolean)[0];
  if (first && first.length > 2 && !/^(ooh|mpc|brief|media|plan|collection)$/i.test(first)) {
    return first;
  }
  return null;
}

function guessCampaignFromFilename(filename = '') {
  const base = filename.replace(/\.[^.]+$/, '');
  // Nike RTP MPC Brief → RTP
  let m = base.match(/\b(RTP|EC24|A4A|ORF|Anthem)\b/i);
  if (m) return m[1].toUpperCase();
  // Keely Collection + Reactive… → Keely
  m = base.match(/^([A-Za-z][A-Za-z0-9'’-]{2,})\s+(Collection|Campaign|Brief)/i);
  if (m) return m[1];
  return null;
}

function mapCity(raw) {
  const value = clean(raw);
  if (!value) return null;
  const hit = MARKET_CITIES.find((c) => c.toLowerCase() === value.toLowerCase());
  if (hit) return hit;
  // London / Paris etc. stay as free-text city_market; shoot city may use Other
  return value;
}

function resolveShootCity(cityMarket, cityList = []) {
  const first = cityList[0] || String(cityMarket || '')
    .split(',')[0]
    ?.trim();
  if (!first) return 'Other';
  if (MARKET_CITIES.includes(first)) return first;
  const hit = MARKET_CITIES.find((c) => c.toLowerCase() === first.toLowerCase());
  return hit || 'Other';
}

/** Unique calendar shoot days from a list of YYYY-MM-DD dates. */
function buildScheduleFromDates(dates, { city, notesPrefix = 'From document' } = {}) {
  const unique = [...new Set((dates || []).filter(Boolean))].sort();
  const shootCity = resolveShootCity(city, [city]);
  return unique.slice(0, 40).map((shoot_date) => ({
    shoot_date,
    day_length: 1,
    city: shootCity,
    notes: notesPrefix,
    format: 'Shoot',
  }));
}

/** Expand inclusive date range into daily dates (capped). */
function expandDateRange(start, end, maxDays = 14) {
  if (!start) return [];
  if (!end || end === start) return [start];
  const out = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime()) || last < cur) return [start];
  while (cur <= last && out.length < maxDays) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function inferFormatType(tokens = []) {
  const text = tokens.map(clean).filter(Boolean).join(' ').toLowerCase();
  if (!text) return null;
  const digital =
    /\b(digital|dooh|d6|d12|led|screen|motion|mupi)\b/.test(text) ||
    /\bimpact\s*\(digital\)|\breach\s*\(digital\)/.test(text);
  const paper =
    /\b(paper|poster|banner|static|48[\s-]?sheet|96[\s-]?sheet|mural|flypost)\b/.test(text) ||
    /\bimpact\s*\(static\)|\breach\s*\(static\)/.test(text);
  if (digital && paper) return 'Both';
  if (digital) return 'Digital';
  if (paper) return 'Paper';
  return null;
}

function sheetRows(workbook, sheetName, { raw = false } = {}) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  // raw:false gives display strings like 17/07/26 for dates — more reliable for our parsers
  return xlsxUtils.sheet_to_json(sheet, { header: 1, defval: '', raw });
}

function detectDocumentType(workbook) {
  for (const name of workbook.SheetNames) {
    const rows = sheetRows(workbook, name).slice(0, 40);
    for (const row of rows) {
      const keys = row.map((c) => normalizeKey(c));
      if (keys.includes('client') && (keys.includes('campaign name') || keys.includes('campaign'))) {
        return 'media_plan';
      }
      if (keys.includes('market') && keys.includes('location') && keys.includes('placement')) {
        return 'media_plan';
      }
      if (
        keys.includes('kpi') &&
        (keys.includes('site network name') || keys.includes('environment'))
      ) {
        return 'mpc_brief';
      }
    }
  }
  return 'unknown';
}

function findHeaderRow(rows, requiredKeys) {
  for (let i = 0; i < Math.min(rows.length, 60); i += 1) {
    const map = {};
    (rows[i] || []).forEach((cell, idx) => {
      const key = normalizeKey(cell);
      if (key) map[key] = idx;
    });
    if (requiredKeys.every((k) => map[k] != null)) {
      return { index: i, map };
    }
  }
  return null;
}

function labelValueMap(rows) {
  const out = {};
  for (const row of rows.slice(0, 30)) {
    for (let i = 0; i < (row?.length || 0) - 1; i += 1) {
      const key = normalizeKey(row[i]);
      const val = clean(row[i + 1]);
      if (!key || !val) continue;
      if (
        [
          'client',
          'construct',
          'season',
          'campaign name',
          'campaign',
          'campaign dates',
          'market',
        ].includes(key)
      ) {
        out[key] = val;
      }
    }
  }
  return out;
}

function parseMediaPlanSheet(rows, { filename } = {}) {
  const labels = labelValueMap(rows);
  const header = findHeaderRow(rows, ['market', 'location', 'placement']);
  const warnings = [];
  const sites = [];
  const formatTokens = [];
  const liveStartDates = [];
  const liveEndDates = [];
  const cities = new Set();
  const markets = new Set();
  const yearHint = inferYearFromRows(rows);

  if (header) {
    const col = header.map;
    const startIdx =
      col['start date dd mm yyyy'] ??
      col['start date'] ??
      Object.keys(col).find((k) => k.startsWith('start date'));
    const endIdx =
      col['end date dd mm yyyy'] ??
      col['end date'] ??
      Object.keys(col).find((k) => k.startsWith('end date'));
    const startCol = typeof startIdx === 'number' ? startIdx : col[startIdx];
    const endCol = typeof endIdx === 'number' ? endIdx : col[endIdx];

    for (let r = header.index + 1; r < rows.length; r += 1) {
      const row = rows[r] || [];
      const market = cellStr(row, col.market);
      const location = cellStr(row, col.location);
      const partner = cellStr(row, col.partner);
      const placement = cellStr(row, col.placement);
      const format = cellStr(row, col.format);
      const panels = cellStr(row, col['number of panels']);
      if (!placement && !location) continue;
      if (/^google map/i.test(market) || /^https?:/i.test(market)) break;
      if (!market && !location) continue;

      if (location) cities.add(location);
      if (market) markets.add(market);
      if (format) formatTokens.push(format);
      if (placement) formatTokens.push(placement);

      const start = toDateOnly(row[startCol]);
      const end = toDateOnly(row[endCol]);
      if (start) liveStartDates.push(start);
      if (end) liveEndDates.push(end);

      // Prefer named placements; include partner so packages are distinguishable
      const siteName = partner && placement ? `${partner.trim()} — ${placement}` : placement || location;
      const noteParts = [
        format || null,
        panels ? `${panels} panels` : null,
        start && end ? `Live ${start} → ${end}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      sites.push({
        type: 'must_shoot',
        site_name: siteName,
        location: [location, market].filter(Boolean).join(', ') || null,
        notes: noteParts || null,
        reference_url: null,
      });
    }
  } else {
    warnings.push('Could not find MARKET / LOCATION / PLACEMENT table');
  }

  // Map link
  let mapUrl = null;
  for (const row of rows) {
    for (const cell of row || []) {
      const s = clean(cell);
      if (/^https?:\/\/.*google\.com\/maps/i.test(s)) {
        mapUrl = s;
        break;
      }
    }
    if (mapUrl) break;
  }

  const campaignDates = parseDateRangeText(
    labels['campaign dates'],
    liveStartDates[0] ? Number(liveStartDates[0].slice(0, 4)) : yearHint
  );
  liveStartDates.sort();
  liveEndDates.sort();
  let campaign_start = campaignDates.start || liveStartDates[0] || null;
  let campaign_end =
    campaignDates.end || liveEndDates[liveEndDates.length - 1] || liveStartDates[liveStartDates.length - 1] || null;

  // If label year disagrees with Excel live dates, trust Excel live dates for the window
  if (liveStartDates[0] && campaign_start && liveStartDates[0].slice(0, 4) !== campaign_start.slice(0, 4)) {
    campaign_start = liveStartDates[0];
    campaign_end = liveEndDates[liveEndDates.length - 1] || liveStartDates[liveStartDates.length - 1];
  }

  const brand = prettyName(labels.client) || prettyName(guessBrandFromFilename(filename), { fromFilename: true });
  const campaign_name =
    prettyName(labels['campaign name'] || labels.campaign) ||
    guessCampaignFromFilename(filename);
  const cityList = [...cities];
  const city_market =
    cityList.length === 1
      ? mapCity(cityList[0])
      : cityList.length
        ? cityList.join(', ')
        : mapCity([...markets][0]);

  const currency =
    detectCurrencyFromText([...markets].join(' ')) ||
    (/united kingdom|uk|london/i.test([...markets, ...cities].join(' ')) ? 'GBP' : null);

  const noteBits = [];
  if (labels.construct) noteBits.push(`Construct: ${labels.construct}`);
  if (labels.season) noteBits.push(`Season: ${labels.season}`);
  if (mapUrl) noteBits.push(`Map: ${mapUrl}`);

  const fields = {
    brand: brand || null,
    client_company: brand || null,
    campaign_name: campaign_name || null,
    city_market: city_market || null,
    currency: currency || 'GBP',
    // Media plans do not contain photography shoot budget
    budget: null,
    campaign_start,
    campaign_end,
    format_type: inferFormatType(formatTokens) || 'Digital',
    client_notes: noteBits.length ? noteBits.join('\n') : null,
    internal_notes: null,
  };

  // Calendar shoot days = unique live starts in the campaign year (+ short range expand)
  const campaignYear = (campaign_start || liveStartDates[0] || '').slice(0, 4);
  const scheduleDates = liveStartDates.filter((d) => !campaignYear || d.startsWith(campaignYear));
  if (campaign_start && campaign_end) {
    const spanDays =
      (Date.parse(`${campaign_end}T12:00:00`) - Date.parse(`${campaign_start}T12:00:00`)) /
      86400000;
    if (Number.isFinite(spanDays) && spanDays >= 0 && spanDays <= 14) {
      scheduleDates.push(...expandDateRange(campaign_start, campaign_end));
    }
  }
  const scheduleSuggestions = buildScheduleFromDates(scheduleDates, {
    city: cityList[0] || city_market,
    notesPrefix: 'Preferred shoot date from media plan',
  });

  return {
    documentType: 'media_plan',
    sheetName: null,
    fields,
    sites: sites.slice(0, MAX_SITES),
    scheduleSuggestions,
    warnings,
    summary: {
      brand: fields.brand,
      campaign: fields.campaign_name,
      city: fields.city_market,
      dates:
        fields.campaign_start || fields.campaign_end
          ? `${fields.campaign_start || '—'} → ${fields.campaign_end || '—'}`
          : null,
      sites: sites.length,
      format: fields.format_type,
      scheduleDays: scheduleSuggestions.length,
    },
  };
}

function extractBriefMeta(rows, sheetName, filename) {
  const warnings = [];
  let currency = SHEET_CURRENCY[sheetName] || null;
  let city = SHEET_CITY[sheetName] || null;
  let mediaTotal = null;

  for (const row of rows.slice(0, 3)) {
    for (const cell of row || []) {
      const c = detectCurrencyFromText(cell);
      if (c) currency = currency || c;
      const text = clean(cell);
      const totalCity = text.match(/^([A-Za-z][A-Za-z\s-]+)\s+Total$/i);
      if (totalCity) city = mapCity(totalCity[1]);
    }
  }

  for (const row of rows) {
    for (let i = 0; i < (row?.length || 0); i += 1) {
      const text = clean(row[i]);
      const m = text.match(/^([A-Za-z][A-Za-z\s-]+)\s+Total$/i);
      if (m) {
        city = mapCity(m[1]) || city;
        const money = parseMoney(row[i + 1]) ?? parseMoney(row[i + 2]);
        if (money != null) mediaTotal = money;
      }
      const cur = detectCurrencyFromText(text);
      if (cur && /gbp|eur|usd|£|€|\$/i.test(text)) currency = currency || cur;
    }
  }

  return {
    brand: prettyName(guessBrandFromFilename(filename), { fromFilename: true }),
    campaign_name: guessCampaignFromFilename(filename),
    city_market: city,
    currency,
    mediaTotal,
    warnings,
  };
}

function parseBriefSheet(rows, { sheetName, filename } = {}) {
  const header = findHeaderRow(rows, ['kpi', 'environment']);
  const warnings = [];
  const sites = [];
  const formatTokens = [];
  const bookedLiveStarts = [];
  const commentDates = [];
  const yearHint = inferYearFromRows(rows);
  let siteNameCol = null;
  let envCol = null;
  let kpiCol = null;
  let dateCols = [];

  if (!header) {
    warnings.push(`No KPI / Environment header found on sheet ${sheetName}`);
  } else {
    const map = header.map;
    const headerRow = rows[header.index] || [];
    kpiCol = map.kpi;
    envCol = map.environment;
    siteNameCol =
      map['site network name'] ??
      map['site name'] ??
      map.anbieter ??
      Object.entries(map).find(([k]) => k.includes('site') && k.includes('name'))?.[1] ??
      null;

    const skipCostCols = new Set();
    headerRow.forEach((cell, idx) => {
      const label = clean(cell);
      const key = normalizeKey(cell);
      if (/impact|address|anbieter|format type|availability|impression/i.test(key)) {
        skipCostCols.add(idx);
      }
      if (isPeriodHeader(label)) {
        const range = parseDateRangeText(label, yearHint);
        dateCols.push({ idx, start: range.start, end: range.end, label });
      }
    });

    let currentKpi = '';
    for (let r = header.index + 1; r < rows.length; r += 1) {
      const row = rows[r] || [];
      const kpi = cellStr(row, kpiCol) || currentKpi;
      if (cellStr(row, kpiCol)) currentKpi = cellStr(row, kpiCol);
      const env = cellStr(row, envCol);
      const siteName = siteNameCol != null ? cellStr(row, siteNameCol) : '';

      if (/^fees$/i.test(kpi) || /^emily update/i.test(env) || /total$/i.test(siteName)) {
        if (/total$/i.test(siteName)) break;
        if (/^fees$/i.test(kpi)) break;
      }
      if (!siteName) continue;
      if (/^environment$/i.test(env) && /^site/i.test(siteName)) continue;
      if (/available but not needed/i.test(siteName)) continue;

      formatTokens.push(kpi, env, siteName);

      let rowCost = null;
      let rowLiveStart = null;
      let rowLiveEnd = null;
      for (const dc of dateCols) {
        const money = parseMoney(row[dc.idx]);
        if (money == null || money <= 0) continue;
        rowCost = rowCost == null ? money : Math.max(rowCost, money);
        if (dc.start) {
          bookedLiveStarts.push(dc.start);
          rowLiveStart = rowLiveStart || dc.start;
        }
        if (dc.end) rowLiveEnd = dc.end;
      }

      for (let c = 0; c < row.length; c += 1) {
        if (typeof row[c] === 'number') continue;
        const text = clean(row[c]);
        if (!looksLikeDateText(text)) continue;
        const range = parseDateRangeText(text, yearHint);
        if (range.start) commentDates.push(range.start);
        if (range.end) commentDates.push(range.end);
        if (range.start && range.end) {
          const span =
            (Date.parse(`${range.end}T12:00:00`) - Date.parse(`${range.start}T12:00:00`)) /
            86400000;
          // Only expand very short windows into daily shoot days
          if (Number.isFinite(span) && span >= 0 && span <= 3) {
            commentDates.push(...expandDateRange(range.start, range.end));
          }
        }
      }

      sites.push({
        type: 'must_shoot',
        site_name: siteName,
        location: env || metaCityFallback(sheetName),
        notes: [
          kpi || null,
          rowLiveStart ? `Live from ${rowLiveStart}` : null,
          rowCost != null ? `Media cost ~ ${formatMoneyNote(rowCost, SHEET_CURRENCY[sheetName])}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
        reference_url: null,
        _cost: rowCost,
      });
    }
  }

  const meta = extractBriefMeta(rows, sheetName, filename);
  bookedLiveStarts.sort();
  commentDates.sort();

  // When no costs/comments, use period header window for campaign dates
  const headerDates = [];
  for (const dc of dateCols) {
    if (dc.start) headerDates.push(dc.start);
    if (dc.end) headerDates.push(dc.end);
  }
  headerDates.sort();

  const mediaSum = sites.reduce((acc, s) => acc + (Number(s._cost) > 0 ? Number(s._cost) : 0), 0);
  const mediaTotal = meta.mediaTotal || (mediaSum > 0 ? mediaSum : null);

  const allCampaignDates = (
    bookedLiveStarts.length || commentDates.length
      ? [...bookedLiveStarts, ...commentDates]
      : headerDates
  )
    .filter(Boolean)
    .sort();
  const campaign_start = allCampaignDates[0] || null;
  const campaign_end = allCampaignDates[allCampaignDates.length - 1] || null;

  const noteBits = [];
  if (mediaTotal) {
    noteBits.push(
      `Media plan total (not shoot budget): ${formatMoneyNote(mediaTotal, meta.currency)}`
    );
  }
  noteBits.push(`Imported from ${filename || 'brief'} · sheet ${sheetName}`);

  const fields = {
    brand: meta.brand,
    client_company: meta.brand,
    campaign_name: meta.campaign_name,
    city_market: meta.city_market,
    currency: meta.currency || 'GBP',
    // Never map media buy into photography Budget field
    budget: null,
    campaign_start,
    campaign_end,
    format_type: inferFormatType(formatTokens) || 'Both',
    client_notes: null,
    internal_notes: noteBits.join('\n'),
  };

  warnings.push(...meta.warnings);
  if (!fields.campaign_start) {
    warnings.push('Campaign dates not clearly found — set them manually');
  }
  if (mediaTotal) {
    warnings.push('Media buy totals were not copied into Budget (shoot budget stays empty)');
  }

  // Shoot calendar: prefer short comment windows; else unique booked live starts (capped)
  let scheduleDates = [];
  if (commentDates.length) {
    scheduleDates = commentDates;
  } else if (bookedLiveStarts.length) {
    scheduleDates = [...new Set(bookedLiveStarts)].slice(0, 5);
  } else if (campaign_start) {
    scheduleDates = [campaign_start];
  }

  const scheduleSuggestions = buildScheduleFromDates(scheduleDates, {
    city: fields.city_market,
    notesPrefix: 'Preferred shoot date from brief',
  }).slice(0, 8);

  return {
    documentType: 'mpc_brief',
    sheetName,
    fields,
    sites: sites.slice(0, MAX_SITES).map(({ _cost, ...rest }) => rest),
    scheduleSuggestions,
    warnings,
    summary: {
      brand: fields.brand,
      campaign: fields.campaign_name,
      city: fields.city_market,
      currency: fields.currency,
      budget: null,
      mediaTotal,
      dates:
        fields.campaign_start || fields.campaign_end
          ? `${fields.campaign_start || '—'} → ${fields.campaign_end || '—'}`
          : null,
      sites: Math.min(sites.length, MAX_SITES),
      format: fields.format_type,
      scheduleDays: scheduleSuggestions.length,
    },
  };
}

function metaCityFallback(sheetName) {
  return SHEET_CITY[sheetName] || null;
}

/**
 * @param {Buffer|ArrayBuffer|Uint8Array} buffer
 * @param {{ filename?: string, sheetName?: string, useAi?: boolean }} options
 */
export function parseBookingDocument(buffer, options = {}) {
  const { filename = 'document.xlsx', sheetName = null } = options;
  if (!buffer || buffer.byteLength === 0) {
    const err = new Error('Empty file');
    err.code = 'EMPTY_FILE';
    throw err;
  }
  if (buffer.byteLength > MAX_BYTES) {
    const err = new Error('File too large (max 15MB)');
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }

  const workbook = xlsxRead(buffer, { type: 'buffer', cellDates: true });
  if (!workbook.SheetNames?.length) {
    const err = new Error('No sheets found in workbook');
    err.code = 'NO_SHEETS';
    throw err;
  }

  const documentType = detectDocumentType(workbook);
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    city: SHEET_CITY[name] || null,
    currency: SHEET_CURRENCY[name] || null,
  }));

  let chosen;
  let parsed;

  if (documentType === 'media_plan') {
    chosen = sheetName || workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      const rows = sheetRows(workbook, name);
      if (findHeaderRow(rows, ['market', 'location', 'placement']) || labelValueMap(rows).client) {
        chosen = name;
        break;
      }
    }
    parsed = parseMediaPlanSheet(sheetRows(workbook, chosen), { filename });
  } else {
    chosen =
      sheetName && workbook.SheetNames.includes(sheetName)
        ? sheetName
        : workbook.SheetNames.find((n) => n === 'UK') || workbook.SheetNames[0];

    parsed = parseBriefSheet(sheetRows(workbook, chosen), {
      sheetName: chosen,
      filename,
    });

    if (documentType === 'unknown') {
      parsed.warnings = [
        ...(parsed.warnings || []),
        'Document layout not recognised exactly — review suggested fields carefully',
      ];
      parsed.documentType = parsed.sites.length ? 'mpc_brief' : 'unknown';
    }
  }

  return {
    ...parsed,
    filename,
    availableSheets: sheets,
    selectedSheet: chosen,
    aiUsed: false,
    _sheetRows: sheetRows(workbook, chosen),
  };
}

/**
 * Heuristic parse + optional OpenAI enrichment (calendar dates, fields, sites).
 */
export async function parseBookingDocumentSmart(buffer, options = {}) {
  const { useAi = true, ...rest } = options;
  const parsed = parseBookingDocument(buffer, rest);
  const sheetRowsForAi = parsed._sheetRows || [];
  delete parsed._sheetRows;

  if (!useAi) return parsed;

  try {
    const {
      enrichParseWithOpenAI,
      mergeHeuristicAndAi,
      sheetToPromptText,
      hasOpenAi,
    } = await import('@/services/openaiDocumentParse');

    if (!hasOpenAi()) {
      parsed.warnings = [
        ...(parsed.warnings || []),
        'Set OPENAI_API_KEY for smarter field + calendar extraction',
      ];
      return parsed;
    }

    const { used, result } = await enrichParseWithOpenAI({
      filename: parsed.filename,
      sheetName: parsed.selectedSheet,
      sheetText: sheetToPromptText(sheetRowsForAi),
      heuristic: parsed,
    });

    if (!used || !result) return parsed;
    return mergeHeuristicAndAi(parsed, result);
  } catch (err) {
    console.error('openai document enrich', err);
    return {
      ...parsed,
      warnings: [
        ...(parsed.warnings || []),
        `AI enrichment skipped: ${err.message || 'OpenAI error'}`,
      ],
      aiUsed: false,
    };
  }
}

export const DOCUMENT_PARSE_LIMITS = { MAX_BYTES, MAX_SITES };
