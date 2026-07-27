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

export function colorForFormat(format, index = 0) {
  const idx = Math.abs(Number(index) || 0) % LIVE_FORMAT_COLORS.length;
  return LIVE_FORMAT_COLORS[idx];
}

/** Color by stable lane index in the live-formats list (bars + legend + cards). */
export function colorForLiveEntry(entry, liveFormats = []) {
  const idx = liveFormats.findIndex((e) => liveEntryKey(e) === liveEntryKey(entry));
  return colorForFormat(entry.format, idx >= 0 ? idx : 0);
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

/** Short date like "13 Jul 2026" for pills / cards. */
export function formatLiveDate(value, locale = 'en-GB') {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
