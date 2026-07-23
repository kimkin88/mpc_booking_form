'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Badge, EmptyState } from '@/components/ui/Tabs';
import { EditIconButton, RemoveIconButton } from '@/components/ui/IconButton';
import { Section, SectionTitle, SectionHint, Grid, Row } from '@/components/layout/PageHeader';
import { SHOOT_FORMATS } from '@/lib/constants';
import { formatDate, toDateInputValue } from '@/utils/format';

const CalendarShell = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[5]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const MonthNav = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.text};
`;

const MonthTitle = styled.h3`
  margin: 0;
  flex: 1;
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  min-width: 10rem;
`;

const NavButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
`;

const Weekday = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0.35rem 0;
`;

const Calendar = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
`;

const DayCell = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 3.25rem;
  padding: 0.35rem 0.2rem 0.45rem;
  border: 2px solid
    ${({ theme, $selected, $today, $hasEntries }) => {
      if ($selected) return theme.colors.primary;
      if ($today) return theme.colors.success;
      if ($hasEntries) return theme.colors.accent;
      return theme.colors.border;
    }};
  background: ${({ theme, $selected, $hasEntries, $outside, $today }) => {
    if ($outside) return theme.colors.bgMuted;
    if ($selected) return theme.colors.primaryMuted;
    if ($today) return theme.colors.successMuted;
    if ($hasEntries) return theme.colors.accentMuted;
    return theme.colors.bg;
  }};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  color: ${({ theme, $outside }) => ($outside ? theme.colors.textMuted : theme.colors.text)};
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    min-height: 3.75rem;
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryMuted};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

const DayNumber = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme, $selected, $today }) =>
    $selected || $today ? theme.fontWeights.bold : theme.fontWeights.semibold};
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $today, $selected }) => {
    if ($selected) return theme.colors.primary;
    if ($today) return theme.colors.success;
    return 'inherit';
  }};
`;

const DayMeta = styled.span`
  font-size: 0.65rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1;
  color: ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.accent)};
  min-height: 0.65rem;
`;

const CalendarLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[4]};
  margin-top: ${({ theme }) => theme.space[4]};
  padding-top: ${({ theme }) => theme.space[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

const LegendSwatch = styled.span`
  width: 0.85rem;
  height: 0.85rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 2px solid ${({ theme, $tone }) => {
    if ($tone === 'selected') return theme.colors.primary;
    if ($tone === 'today') return theme.colors.success;
    if ($tone === 'booked') return theme.colors.accent;
    return theme.colors.border;
  }};
  background: ${({ theme, $tone }) => {
    if ($tone === 'selected') return theme.colors.primaryMuted;
    if ($tone === 'today') return theme.colors.successMuted;
    if ($tone === 'booked') return theme.colors.accentMuted;
    return theme.colors.surface;
  }};
`;

const SelectedDayPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.primaryMuted};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.md};
`;

const SelectedDayLabel = styled.strong`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
`;

const EntryCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.bgMuted};
  color: ${({ theme }) => theme.colors.text};
`;

const FieldError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const WarningBanner = styled.p`
  margin: 0.75rem 0 0;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.warningMuted};
  border: 1px solid ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.danger};
`;

const emptyDraft = {
  format: '48-Sheet',
  custom_format: '',
  live_start: '',
  live_end: '',
  notes: '',
};

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function resolveFormat(draft) {
  if (draft.format === 'Custom Size' && draft.custom_format?.trim()) {
    return draft.custom_format.trim();
  }
  return draft.format;
}

function FormatFields({ draft, setDraft, formats = SHOOT_FORMATS }) {
  const known = formats.includes(draft.format) ? draft.format : 'Custom Size';
  return (
    <>
      <Select
        label="Format / Size"
        value={known}
        onValueChange={(v) =>
          setDraft((d) => ({
            ...d,
            format: v,
            custom_format: v === 'Custom Size' ? d.custom_format || '' : '',
          }))
        }
        options={formats.map((f) => ({ value: f, label: f }))}
      />
      {(known === 'Custom Size' || !formats.includes(draft.format)) && (
        <Input
          label="Custom Size detail"
          value={draft.custom_format || (formats.includes(draft.format) ? '' : draft.format)}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              format: 'Custom Size',
              custom_format: e.target.value,
            }))
          }
          placeholder="Describe the custom size"
          required
        />
      )}
    </>
  );
}

export function ScheduleSection({
  entries = [],
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
  locale = 'en-GB',
  id,
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const entryCountByDate = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      map.set(e.shoot_date, (map.get(e.shoot_date) || 0) + 1);
    });
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = new Date(first);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const todayKey = toKey(new Date());
  const selectedEntries = entries.filter((e) => e.shoot_date === selected);

  const goToday = () => {
    const now = new Date();
    setCursor(startOfMonth(now));
    setSelected(toKey(now));
    setEditingId(null);
  };

  const validateLiveDates = (start, end) => {
    if (start && end && end < start) {
      return 'Live End cannot be earlier than Live Start';
    }
    return '';
  };

  const handleAdd = async () => {
    setError('');
    if (!selected) {
      setError('Select a day first');
      return;
    }
    const liveError = validateLiveDates(draft.live_start, draft.live_end);
    if (liveError) {
      setError(liveError);
      return;
    }
    const format = resolveFormat(draft);
    if (!format) {
      setError('Format / Size is required');
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        shoot_date: selected,
        format,
        live_start: draft.live_start || null,
        live_end: draft.live_end || null,
        notes: draft.notes || null,
      });
      setDraft(emptyDraft);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    const isKnown = SHOOT_FORMATS.includes(entry.format);
    setEditingId(entry.id);
    setEditDraft({
      format: isKnown ? entry.format : 'Custom Size',
      custom_format: isKnown ? '' : entry.format,
      live_start: toDateInputValue(entry.live_start),
      live_end: toDateInputValue(entry.live_end),
      notes: entry.notes || '',
    });
    setError('');
  };

  const handleUpdate = async () => {
    if (!onUpdate || !editingId) return;
    setError('');
    const liveError = validateLiveDates(editDraft.live_start, editDraft.live_end);
    if (liveError) {
      setError(liveError);
      return;
    }
    const format = resolveFormat(editDraft);
    if (!format) {
      setError('Format / Size is required');
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        entryId: editingId,
        shoot_date: selected,
        format,
        live_start: editDraft.live_start || null,
        live_end: editDraft.live_end || null,
        notes: editDraft.notes || null,
      });
      setEditingId(null);
      setEditDraft(emptyDraft);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section id={id}>
      <SectionTitle>Shoot Schedule & Live Dates</SectionTitle>
      <SectionHint>
        Pick a day on the calendar, then add format entries for that shoot date. Days with entries
        show a count.
      </SectionHint>

      <CalendarShell>
        <MonthNav>
          <NavButtons>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ← Prev
            </Button>
          </NavButtons>
          <MonthTitle>
            {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </MonthTitle>
          <NavButtons>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              Next →
            </Button>
          </NavButtons>
        </MonthNav>

        <Weekdays aria-hidden>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Weekday key={d}>{d}</Weekday>
          ))}
        </Weekdays>

        <Calendar role="grid" aria-label="Shoot schedule calendar">
          {days.map((day) => {
            const key = toKey(day);
            const outside = day.getMonth() !== cursor.getMonth();
            const count = entryCountByDate.get(key) || 0;
            const isToday = key === todayKey;
            const isSelected = selected === key;
            return (
              <DayCell
                key={key}
                type="button"
                $outside={outside}
                $selected={isSelected}
                $hasEntries={count > 0}
                $today={isToday && !isSelected}
                aria-label={`${formatDate(day, locale)}${isToday ? ', today' : ''}${
                  count ? `, ${count} entr${count === 1 ? 'y' : 'ies'}` : ''
                }${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelected(key);
                  setEditingId(null);
                  if (outside) setCursor(startOfMonth(day));
                }}
              >
                <DayNumber $selected={isSelected} $today={isToday}>
                  {day.getDate()}
                </DayNumber>
                <DayMeta $selected={isSelected}>
                  {count > 0 ? `${count}` : '\u00A0'}
                </DayMeta>
              </DayCell>
            );
          })}
        </Calendar>

        <CalendarLegend>
          <LegendItem>
            <LegendSwatch $tone="today" /> Today
          </LegendItem>
          <LegendItem>
            <LegendSwatch $tone="booked" /> Has entries
          </LegendItem>
          <LegendItem>
            <LegendSwatch $tone="selected" /> Selected
          </LegendItem>
        </CalendarLegend>
      </CalendarShell>

      {selected ? (
        <>
          <SelectedDayPanel>
            <SelectedDayLabel>{formatDate(selected, locale)}</SelectedDayLabel>
            <Badge $tone="accent">
              {selectedEntries.length} format entr{selectedEntries.length === 1 ? 'y' : 'ies'}
            </Badge>
            {!readOnly && (
              <span style={{ fontSize: '0.875rem', color: 'inherit', opacity: 0.8 }}>
                Add formats for this shoot day below
              </span>
            )}
          </SelectedDayPanel>

          {selectedEntries.length === 0 && (
            <EmptyState style={{ marginTop: '1rem', padding: '1.5rem' }}>
              No formats for this day yet.
            </EmptyState>
          )}

          {selectedEntries.map((entry) => (
            <EntryCard key={entry.id}>
              {editingId === entry.id ? (
                <>
                  <Grid $cols={2}>
                    <FormatFields draft={editDraft} setDraft={setEditDraft} />
                    <Input
                      label="Live Start"
                      type="date"
                      value={editDraft.live_start}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, live_start: e.target.value }))
                      }
                    />
                    <Input
                      label="Live End"
                      type="date"
                      value={editDraft.live_end}
                      onChange={(e) => setEditDraft((d) => ({ ...d, live_end: e.target.value }))}
                      error={validateLiveDates(editDraft.live_start, editDraft.live_end) || undefined}
                    />
                    <Textarea
                      label="Notes"
                      value={editDraft.notes}
                      onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                    />
                  </Grid>
                  <Row style={{ marginTop: '0.75rem' }}>
                    <Button size="sm" onClick={handleUpdate} disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setError('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Row>
                </>
              ) : (
                <>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <strong>{entry.format}</strong>
                    {!readOnly && (
                      <Row>
                        {onUpdate && <EditIconButton onClick={() => startEdit(entry)} />}
                        <RemoveIconButton onClick={() => onRemove(entry.id)} />
                      </Row>
                    )}
                  </Row>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                    Live: {entry.live_start ? formatDate(entry.live_start, locale) : '—'} →{' '}
                    {entry.live_end ? formatDate(entry.live_end, locale) : '—'}
                  </p>
                  {entry.notes && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>{entry.notes}</p>
                  )}
                </>
              )}
            </EntryCard>
          ))}

          {!readOnly && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add format entry</h3>
              <Grid $cols={2}>
                <FormatFields draft={draft} setDraft={setDraft} />
                <Input
                  label="Live Start"
                  type="date"
                  value={draft.live_start}
                  onChange={(e) => setDraft((d) => ({ ...d, live_start: e.target.value }))}
                />
                <Input
                  label="Live End"
                  type="date"
                  value={draft.live_end}
                  onChange={(e) => setDraft((d) => ({ ...d, live_end: e.target.value }))}
                  error={validateLiveDates(draft.live_start, draft.live_end) || undefined}
                />
                <Textarea
                  label="Notes"
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                />
              </Grid>
              {error && (
                <FieldError role="alert">{error}</FieldError>
              )}
              <Button onClick={handleAdd} disabled={saving} style={{ marginTop: '0.75rem' }}>
                {saving ? 'Adding…' : 'Add Format Entry'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState style={{ padding: '2rem 1.5rem' }}>
          <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Choose a shoot day</strong>
          Click a date on the calendar above to view or add formats.
        </EmptyState>
      )}
    </Section>
  );
}

export function SitesSection({
  values,
  onChange,
  sites = [],
  onAdd,
  onRemove,
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  id,
}) {
  const [draft, setDraft] = useState({
    type: 'must_shoot',
    site_name: '',
    location: '',
    notes: '',
    reference_url: '',
  });
  const [error, setError] = useState('');

  const showToggle = !fieldHidden.mpc_chooses_sites;
  const showSites = !fieldHidden.sites;
  if (!showToggle && !showSites) return null;

  const mustShoot = sites.filter((s) => s.type === 'must_shoot');
  const avoid = sites.filter((s) => s.type === 'avoid');
  const mpcChooses = values.mpc_chooses_sites !== false;
  const needsSiteInstructions = showSites && !mpcChooses && sites.length === 0;

  const handleAdd = async () => {
    setError('');
    if (!draft.site_name.trim()) {
      setError('Site name is required');
      return;
    }
    if (draft.reference_url?.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(draft.reference_url.trim());
      } catch {
        setError('Reference link must be a valid URL');
        return;
      }
    }
    try {
      await onAdd({
        ...draft,
        reference_url: draft.reference_url || null,
      });
      setDraft({
        type: 'must_shoot',
        site_name: '',
        location: '',
        notes: '',
        reference_url: '',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Section id={id}>
      <SectionTitle>Sites</SectionTitle>
      <SectionHint>
        MPC Chooses Sites is enabled by default. When disabled, provide at least one Must-Shoot
        Site or other site instruction. Each site may include a name, location, notes, and optional
        reference link.
      </SectionHint>

      {showToggle && (
        <Switch
          id="mpc_chooses_sites"
          label="MPC Chooses Sites"
          checked={mpcChooses}
          onCheckedChange={(v) => onChange('mpc_chooses_sites', v)}
          disabled={readOnly || fieldDisabled.mpc_chooses_sites}
          description="When enabled, Must-Shoot / Avoid sites remain optional."
        />
      )}

      {needsSiteInstructions && (
        <WarningBanner role="alert">
          MPC Chooses Sites is off — add at least one Must-Shoot Site or Sites to Avoid entry.
        </WarningBanner>
      )}

      {showSites && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem' }}>
            Must-Shoot Sites
            {!mpcChooses && <RequiredMark> *</RequiredMark>}
          </h3>
          {mustShoot.length === 0 && <EmptyState style={{ padding: '1rem' }}>None yet</EmptyState>}
          {mustShoot.map((site) => (
            <EntryCard key={site.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <strong>{site.site_name}</strong>
                {!readOnly && !fieldDisabled.sites && (
                  <RemoveIconButton onClick={() => onRemove(site.id)} />
                )}
              </Row>
              {site.location && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>{site.location}</p>
              )}
              {site.notes && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{site.notes}</p>
              )}
              {site.reference_url && (
                <a href={site.reference_url} target="_blank" rel="noreferrer">
                  Reference
                </a>
              )}
            </EntryCard>
          ))}

          <h3 style={{ fontSize: '1rem', marginTop: '1.25rem' }}>Sites to Avoid</h3>
          {avoid.length === 0 && <EmptyState style={{ padding: '1rem' }}>None yet</EmptyState>}
          {avoid.map((site) => (
            <EntryCard key={site.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <strong>{site.site_name}</strong>
                {!readOnly && !fieldDisabled.sites && (
                  <RemoveIconButton onClick={() => onRemove(site.id)} />
                )}
              </Row>
              {site.location && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>{site.location}</p>
              )}
              {site.notes && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{site.notes}</p>
              )}
              {site.reference_url && (
                <a href={site.reference_url} target="_blank" rel="noreferrer">
                  Reference
                </a>
              )}
            </EntryCard>
          ))}
        </div>
      )}

      {showSites && !readOnly && !fieldDisabled.sites && (
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add site entry</h3>
          <Grid>
            <Select
              label="Type"
              value={draft.type}
              onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
              options={[
                { value: 'must_shoot', label: 'Must-Shoot' },
                { value: 'avoid', label: 'Avoid' },
              ]}
            />
            <Input
              label="Site Name"
              required
              value={draft.site_name}
              onChange={(e) => setDraft((d) => ({ ...d, site_name: e.target.value }))}
            />
            <Input
              label="Location"
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            />
            <Input
              label="Reference URL"
              value={draft.reference_url}
              onChange={(e) => setDraft((d) => ({ ...d, reference_url: e.target.value }))}
              hint="Optional"
            />
            <Textarea
              label="Notes"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </Grid>
          {error && <FieldError role="alert">{error}</FieldError>}
          <Button onClick={handleAdd} style={{ marginTop: '0.75rem' }}>
            Add Site
          </Button>
        </div>
      )}
    </Section>
  );
}
