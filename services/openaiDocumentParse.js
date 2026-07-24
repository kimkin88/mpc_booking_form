/**
 * OpenAI enrichment for booking document parsing.
 * Maps OOH media plans / MPC briefs onto the MPC booking form fields.
 */

const FIELD_KEYS = [
  'brand',
  'client_company',
  'campaign_name',
  'city_market',
  'currency',
  'budget',
  'format_type',
  'campaign_start',
  'campaign_end',
  'client_notes',
  'internal_notes',
];

/** Photography shoot budget ceiling — media buys are much larger. */
const MAX_SHOOT_BUDGET = 20000;

function hasOpenAi() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Compact sheet → TSV text for the model (keeps token use reasonable).
 */
export function sheetToPromptText(rows, { maxRows = 70, maxCols = 14 } = {}) {
  const lines = [];
  for (let r = 0; r < Math.min(rows.length, maxRows); r += 1) {
    const row = rows[r] || [];
    const cells = [];
    for (let c = 0; c < Math.min(row.length, maxCols); c += 1) {
      let v = row[c];
      if (v == null || v === '') {
        cells.push('');
        continue;
      }
      if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const y = v.getUTCFullYear();
        const m = String(v.getUTCMonth() + 1).padStart(2, '0');
        const d = String(v.getUTCDate()).padStart(2, '0');
        v = `${y}-${m}-${d}`;
      }
      cells.push(String(v).replace(/\t|\n|\r/g, ' ').trim().slice(0, 80));
    }
    if (cells.some((c) => c)) lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

function normalizeAiPayload(ai, fallbackCity = 'London') {
  const fields = {};
  for (const key of FIELD_KEYS) {
    const val = ai?.fields?.[key];
    if (val == null || val === '') continue;
    if (key === 'budget') {
      const n = Number(val);
      if (Number.isFinite(n) && n > 0 && n <= MAX_SHOOT_BUDGET) fields.budget = n;
      continue;
    }
    if (key === 'format_type') {
      const f = String(val);
      fields.format_type = ['Digital', 'Paper', 'Both', 'Other'].includes(f) ? f : 'Other';
      if (fields.format_type === 'Other' && f !== 'Other') fields.format_type_other = f;
      continue;
    }
    if (key === 'currency') {
      const c = String(val).toUpperCase();
      if (['GBP', 'EUR', 'USD', 'AUD', 'CAD', 'CHF', 'JPY', 'SGD', 'HKD', 'NZD'].includes(c)) {
        fields.currency = c;
      }
      continue;
    }
    fields[key] = String(val).trim();
  }

  const sites = Array.isArray(ai?.sites)
    ? ai.sites
        .filter((s) => s?.site_name)
        .slice(0, 80)
        .map((s) => ({
          type: s.type === 'avoid' ? 'avoid' : 'must_shoot',
          site_name: String(s.site_name).trim(),
          location: s.location ? String(s.location).trim() : null,
          notes: s.notes ? String(s.notes).trim() : null,
          reference_url: null,
        }))
    : [];

  const cityFallback = fields.city_market?.split(',')[0]?.trim() || fallbackCity;

  const scheduleSuggestions = Array.isArray(ai?.schedule)
    ? ai.schedule
        .filter((e) => e?.shoot_date)
        .map((e) => ({
          shoot_date: String(e.shoot_date).slice(0, 10),
          day_length: Number(e.day_length) === 0.5 ? 0.5 : 1,
          city: e.city ? String(e.city).trim() : cityFallback,
          notes: e.notes ? String(e.notes).trim() : 'From document (AI)',
          format: 'Shoot',
        }))
    : [];

  const seen = new Set();
  const uniqueSchedule = [];
  for (const entry of scheduleSuggestions) {
    const key = `${entry.shoot_date}|${entry.city}|${entry.day_length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSchedule.push(entry);
  }
  uniqueSchedule.sort((a, b) => a.shoot_date.localeCompare(b.shoot_date));

  return {
    fields,
    sites,
    scheduleSuggestions: uniqueSchedule.slice(0, 12),
    warnings: Array.isArray(ai?.warnings) ? ai.warnings.map(String) : [],
  };
}

/**
 * @param {{
 *   filename: string,
 *   sheetName: string,
 *   sheetText: string,
 *   heuristic: object,
 * }} args
 */
export async function enrichParseWithOpenAI({ filename, sheetName, sheetText, heuristic }) {
  if (!hasOpenAi()) {
    return { used: false, result: null };
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const system = `You map OOH / MPC Excel documents onto an MPC photography BOOKING FORM.

Return ONLY valid JSON:
{
  "fields": {
    "brand": string|null,
    "client_company": string|null,
    "campaign_name": string|null,
    "city_market": string|null,
    "currency": "GBP"|"EUR"|"USD"|null,
    "budget": number|null,
    "format_type": "Digital"|"Paper"|"Both"|"Other"|null,
    "campaign_start": "YYYY-MM-DD"|null,
    "campaign_end": "YYYY-MM-DD"|null,
    "client_notes": string|null,
    "internal_notes": string|null
  },
  "sites": [{"type":"must_shoot","site_name":string,"location":string|null,"notes":string|null}],
  "schedule": [{"shoot_date":"YYYY-MM-DD","day_length":0.5|1,"city":string,"notes":string|null}],
  "warnings": string[]
}

FIELD MEANINGS (must match the booking form exactly):
- brand ← CLIENT / advertiser (e.g. Nike). Title case preferred.
- client_company ← same as brand unless a different agency/client company is clear.
- campaign_name ← CAMPAIGN NAME (e.g. KEELY, RTP). Not the filename alone if a clearer name exists.
- city_market ← shoot city (London, Paris, Berlin…). From LOCATION / market sheet / "London Total".
- currency ← GBP/EUR/USD from £/€/$ or market.
- budget ← ONLY an explicit photography / MPC SHOOT budget (typically under £20,000).
  NEVER copy media-buy / ORF / EC24 / site package / "London Total" media costs into budget.
  If unsure, set budget to null.
- format_type ← Digital | Paper | Both | Other from placements (D6/DOOH/Digital → Digital; poster/banner/static → Paper; mix → Both).
- campaign_start / campaign_end ← campaign live window (CAMPAIGN DATES or earliest/latest live dates). YYYY-MM-DD.
- client_notes ← construct, season, map links, short extras for the client.
- internal_notes ← import source / media totals for admin only.

SITES:
- One must_shoot row per distinct site/network/placement to photograph.
- site_name = placement or site/network name (include partner when useful, e.g. "Ocean Outdoor — Skyline @ Westfield").
- location = city / environment.

SCHEDULE (calendar preferred shoot days):
- These are photography shoot days, NOT every media flight week.
- For a short campaign (e.g. 17–19 Jul), include each day in that window (or unique live starts).
- For long multi-month briefs, prefer 1–5 shoot days near the main live window / availability comments — NEVER dump every fortnight column.
- city must match city_market when possible.
- Max 8 schedule entries.

Dates must be YYYY-MM-DD. Prefer improving the heuristic parse; keep strong heuristic values when the sheet is ambiguous.`;

  const user = `Filename: ${filename}
Sheet: ${sheetName}
Document type hint: ${heuristic?.documentType || 'unknown'}

Heuristic parse (correct what is wrong; keep what is right):
${JSON.stringify(
    {
      fields: heuristic?.fields || {},
      sites: (heuristic?.sites || []).slice(0, 25),
      schedule: heuristic?.scheduleSuggestions || [],
      summary: heuristic?.summary || {},
    },
    null,
    2
  )}

Spreadsheet (TSV, truncated):
${sheetText.slice(0, 24000)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`OpenAI parse failed (${res.status})`);
    err.code = 'OPENAI_ERROR';
    err.detail = text.slice(0, 300);
    throw err;
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '{}';

  try {
    const { recordOpenAiUsage } = await import('@/lib/openaiUsage');
    await recordOpenAiUsage(json.usage);
  } catch (err) {
    console.error('openai usage record failed', err);
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const err = new Error('OpenAI returned invalid JSON');
    err.code = 'OPENAI_BAD_JSON';
    throw err;
  }

  const cityGuess =
    heuristic?.fields?.city_market?.split(',')[0]?.trim() ||
    heuristic?.scheduleSuggestions?.[0]?.city ||
    'London';

  return {
    used: true,
    result: normalizeAiPayload(parsed, cityGuess),
    model,
    usage: json.usage || null,
  };
}

export function mergeHeuristicAndAi(heuristic, aiNormalized) {
  if (!aiNormalized) return { ...heuristic, aiUsed: false };

  const fields = { ...(heuristic.fields || {}) };
  // Structured media-plan labels are authoritative — don't let the model overwrite them
  const lockedWhenPresent =
    heuristic.documentType === 'media_plan'
      ? new Set([
          'brand',
          'client_company',
          'campaign_name',
          'city_market',
          'currency',
          'campaign_start',
          'campaign_end',
          'format_type',
          'client_notes',
        ])
      : new Set(['brand', 'campaign_name', 'currency', 'city_market']);

  for (const [key, value] of Object.entries(aiNormalized.fields || {})) {
    if (value == null || value === '') continue;
    if (lockedWhenPresent.has(key) && fields[key] != null && String(fields[key]).trim() !== '') {
      continue;
    }
    if (key === 'budget') {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0 && n <= MAX_SHOOT_BUDGET) fields.budget = n;
      continue;
    }
    fields[key] = value;
  }
  if (fields.budget != null && Number(fields.budget) > MAX_SHOOT_BUDGET) {
    fields.budget = null;
  }

  // Prefer heuristic sites for media plans (table parse is reliable); AI may refine briefs
  const sites =
    heuristic.documentType === 'media_plan' && heuristic.sites?.length
      ? heuristic.sites
      : aiNormalized.sites?.length > 0
        ? aiNormalized.sites
        : heuristic.sites || [];

  // Prefer heuristic schedule when it already has dates; AI can fill gaps only
  const scheduleSuggestions =
    heuristic.scheduleSuggestions?.length > 0
      ? heuristic.scheduleSuggestions
      : aiNormalized.scheduleSuggestions?.length > 0
        ? aiNormalized.scheduleSuggestions
        : [];

  const warnings = [...(heuristic.warnings || []), ...(aiNormalized.warnings || [])].filter(
    (w, i, arr) => arr.indexOf(w) === i
  );

  return {
    ...heuristic,
    fields,
    sites,
    scheduleSuggestions,
    warnings,
    aiUsed: true,
    summary: {
      ...(heuristic.summary || {}),
      brand: fields.brand,
      campaign: fields.campaign_name,
      city: fields.city_market,
      currency: fields.currency,
      budget: fields.budget,
      dates:
        fields.campaign_start || fields.campaign_end
          ? `${fields.campaign_start || '—'} → ${fields.campaign_end || '—'}`
          : heuristic.summary?.dates || null,
      sites: sites.length,
      format: fields.format_type,
      scheduleDays: scheduleSuggestions.length,
    },
  };
}

export { hasOpenAi, MAX_SHOOT_BUDGET };
