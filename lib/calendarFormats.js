/** Palette matching the Shoot Schedule & Live Dates mock. */
export const LIVE_FORMAT_COLORS = [
  { key: 'orange', bar: '#E08B6D', soft: '#F8EDE8', text: '#B45A3C', border: '#E08B6D' },
  { key: 'blue', bar: '#6BA3C9', soft: '#E8F2F8', text: '#3A6F8F', border: '#6BA3C9' },
  { key: 'green', bar: '#7AAD8C', soft: '#E8F3EC', text: '#3D6F4E', border: '#7AAD8C' },
  { key: 'purple', bar: '#9B7EB5', soft: '#F0EAF5', text: '#5C4570', border: '#9B7EB5' },
  { key: 'coral', bar: '#D9897A', soft: '#F8EBE8', text: '#7A3D34', border: '#D9897A' },
  { key: 'teal', bar: '#6FBFB5', soft: '#E6F5F3', text: '#2A6B64', border: '#6FBFB5' },
  { key: 'gold', bar: '#D4B06A', soft: '#F7F0E0', text: '#7A5C20', border: '#D4B06A' },
  { key: 'slate', bar: '#8A9BB0', soft: '#ECEFF3', text: '#3D4D60', border: '#8A9BB0' },
  { key: 'rose', bar: '#C97B9B', soft: '#F6EAF0', text: '#7A3D58', border: '#C97B9B' },
  { key: 'olive', bar: '#9AAA6E', soft: '#F0F3E6', text: '#55632E', border: '#9AAA6E' },
  { key: 'indigo', bar: '#7B8FC9', soft: '#EBEEF8', text: '#3D4A7A', border: '#7B8FC9' },
  { key: 'amber', bar: '#D49A5A', soft: '#F8EFE4', text: '#7A4E20', border: '#D49A5A' },
];

export const SHOOT_DAY_COLOR = '#E07A5F';

/** Map media-plan FORMAT / placement text to display labels like "6-Sheet". */
export function normalizeFormatLabel(format, placement = '') {
  const text = `${format || ''} ${placement || ''}`.trim();
  if (!text) return 'Format';
  if (/96[\s-]?sheet/i.test(text)) return '96-Sheet';
  if (/48[\s-]?sheet/i.test(text)) return '48-Sheet';
  if (/12[\s-]?sheet|\bd12\b/i.test(text)) return '12-Sheet';
  if (/6[\s-]?sheet|\bd6\b/i.test(text)) return '6-Sheet';
  if (/4[\s-]?sheet/i.test(text)) return '4-Sheet';
  if (/large\s*format/i.test(text)) return 'Large Format';
  const cleaned = String(format || placement || 'Format').trim();
  return cleaned.replace(/\s+/g, ' ');
}

/** Prefer fixed slots for common media formats; otherwise hash the label. */
const FORMAT_COLOR_HINTS = [
  [/96[\s-]?sheet/i, 0],
  [/48[\s-]?sheet/i, 1],
  [/12[\s-]?sheet|\bd12\b/i, 2],
  [/6[\s-]?sheet|\bd6\b/i, 3],
  [/4[\s-]?sheet|\bd4\b/i, 4],
  [/large\s*format/i, 5],
];

export function colorForFormat(format, index) {
  const idx =
    index === undefined || index === null
      ? stableColorIndex(format)
      : Math.abs(Number(index) || 0) % LIVE_FORMAT_COLORS.length;
  return LIVE_FORMAT_COLORS[idx];
}

/** Stable preferred palette slot from format label (may collide — use assignDistinctLaneColors). */
export function stableColorIndex(format) {
  const s = String(format || 'Format').trim();
  for (const [re, slot] of FORMAT_COLOR_HINTS) {
    if (re.test(s)) return slot % LIVE_FORMAT_COLORS.length;
  }
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0) % LIVE_FORMAT_COLORS.length;
}

/**
 * Assign distinct palette indices to live-format lanes.
 * Keeps previous assignments for remaining entries so removals do not recolor others.
 * Only repeats a color when there are more lanes than palette slots.
 */
export function assignDistinctLaneColors(entries = [], previous = new Map()) {
  const list = entries || [];
  const keys = list.map((e) => liveEntryKey(e));
  const next = new Map();
  const used = new Set();

  for (const key of keys) {
    if (!key || !previous.has(key)) continue;
    const idx = previous.get(key);
    if (used.has(idx)) continue;
    next.set(key, idx);
    used.add(idx);
  }

  list.forEach((entry, i) => {
    const key = keys[i];
    if (!key || next.has(key)) return;

    const preferred = stableColorIndex(entry?.format);
    let pick = null;
    if (!used.has(preferred)) {
      pick = preferred;
    } else {
      for (let c = 0; c < LIVE_FORMAT_COLORS.length; c += 1) {
        if (!used.has(c)) {
          pick = c;
          break;
        }
      }
    }
    if (pick == null) pick = i % LIVE_FORMAT_COLORS.length;
    next.set(key, pick);
    used.add(pick);
  });

  return next;
}

/** Color for a live entry; pass colorByKey from assignDistinctLaneColors for unique lanes. */
export function colorForLiveEntry(entry, colorByKey) {
  if (colorByKey instanceof Map) {
    const idx = colorByKey.get(liveEntryKey(entry));
    if (idx != null) return LIVE_FORMAT_COLORS[idx % LIVE_FORMAT_COLORS.length];
  }
  return colorForFormat(entry?.format);
}

export function liveEntryKey(entry) {
  if (!entry) return '';
  if (entry.id) return `id:${entry.id}`;
  return `${entry.format}|${String(entry.live_start || '').slice(0, 10)}|${String(entry.live_end || '').slice(0, 10)}`;
}

export function isLiveFormatEntry(entry) {
  if (!entry) return false;
  if (entry.live_start && entry.live_end) return true;
  return entry.day_length == null && entry.format && entry.format !== 'Shoot';
}

export function isShootRequirementEntry(entry) {
  if (!entry) return false;
  if (isLiveFormatEntry(entry)) return false;
  return entry.day_length != null || entry.format === 'Shoot' || !entry.live_start;
}

export function liveFormatsFromSchedule(entries = []) {
  return (entries || []).filter(isLiveFormatEntry);
}

/** Shoot requirement rows only (excludes calendar live-format entries). */
export function shootRequirementsFromSchedule(entries = []) {
  return (entries || []).filter(isShootRequirementEntry);
}

export function shootDatesFromSchedule(entries = []) {
  const set = new Set();
  for (const entry of shootRequirementsFromSchedule(entries)) {
    const key = entry.shoot_date ? String(entry.shoot_date).slice(0, 10) : null;
    if (key) set.add(key);
  }
  return set;
}

/** Shoot requirement rows booked on a specific calendar day. */
export function shootsOnDate(entries = [], dateKey) {
  if (!dateKey) return [];
  const key = String(dateKey).slice(0, 10);
  return shootRequirementsFromSchedule(entries).filter(
    (e) => String(e.shoot_date || '').slice(0, 10) === key
  );
}

/** Admin vs Client label for schedule / shoot rows. */
export function scheduleAddedByMeta(entry) {
  const via = entry?.added_via;
  if (via === 'client_portal') {
    return {
      role: 'client',
      label: 'Client',
      tone: 'accent',
      name: entry?.added_by_name || null,
    };
  }
  return {
    role: 'admin',
    label: 'Admin',
    tone: 'info',
    name: entry?.added_by_name || null,
  };
}

export function entryCoversDate(entry, dateKey) {
  const start = String(entry.live_start || entry.shoot_date || '').slice(0, 10);
  const end = String(entry.live_end || entry.live_start || entry.shoot_date || '').slice(0, 10);
  if (!start || !dateKey) return false;
  return dateKey >= start && dateKey <= (end || start);
}

export function formatsOnDate(entries, dateKey, liveFormats) {
  const list = liveFormats || uniqueLiveFormats(entries);
  return list.filter((e) => entryCoversDate(e, dateKey));
}

/** Unique formats sorted by first live_start for legend + lane order. */
export function uniqueLiveFormats(entries = []) {
  const map = new Map();
  for (const entry of liveFormatsFromSchedule(entries)) {
    const key = liveEntryKey(entry) || `${entry.format}|${String(entry.live_start).slice(0, 10)}|${String(entry.live_end).slice(0, 10)}`;
    if (!map.has(key)) map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => {
    const byStart = String(a.live_start).localeCompare(String(b.live_start));
    if (byStart) return byStart;
    return String(a.format).localeCompare(String(b.format));
  });
}

/** YYYY-MM-DD ± N calendar days (noon-safe). */
export function addCalendarDays(isoDate, delta) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(delta || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Plan removing one calendar day from a schedule entry.
 * Live ranges shrink or split; single-day / shoot rows delete.
 */
export function planRemoveCalendarDay(entry, dateKey) {
  const day = String(dateKey || '').slice(0, 10);
  if (!entry || !day) return { error: 'Date is required' };

  if (isShootRequirementEntry(entry)) {
    const shoot = String(entry.shoot_date || '').slice(0, 10);
    if (shoot && shoot !== day) {
      return { error: 'Shoot is not on this day' };
    }
    return { mode: 'delete' };
  }

  const start = String(entry.live_start || '').slice(0, 10);
  const end = String(entry.live_end || entry.live_start || '').slice(0, 10);
  if (!start || day < start || day > end) {
    return { error: 'Format is not live on this day' };
  }
  if (start === end) {
    return { mode: 'delete' };
  }
  if (day === start) {
    const next = addCalendarDays(start, 1);
    return { mode: 'update', patch: { live_start: next, live_end: end, shoot_date: next } };
  }
  if (day === end) {
    const prev = addCalendarDays(end, -1);
    return { mode: 'update', patch: { live_start: start, live_end: prev, shoot_date: start } };
  }

  const leftEnd = addCalendarDays(day, -1);
  const rightStart = addCalendarDays(day, 1);
  return {
    mode: 'split',
    patch: { live_start: start, live_end: leftEnd, shoot_date: start },
    insert: { live_start: rightStart, live_end: end, shoot_date: rightStart },
  };
}

/** Short date like "13 Jul 2026" for pills / cards. */
export function formatLiveDate(value, locale = 'en-GB') {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
