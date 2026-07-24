'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Badge, EmptyState } from '@/components/ui/Tabs';
import { RemoveIconButton } from '@/components/ui/IconButton';
import { Section, SectionTitle, SectionHint, Grid, Row } from '@/components/layout/PageHeader';
import { formatDate, formatCurrency } from '@/utils/format';

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
  font-size: 0.62rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.15;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 0.15rem;
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
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const EntryTitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const EntryMeta = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  dt {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  dd {
    margin: 0;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text};
  }
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

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayLengthLabel(dayLength) {
  const n = Number(dayLength);
  if (n === 0.5) return '0.5 day';
  if (n === 1) return '1 day';
  if (Number.isFinite(n) && n > 0) return `${n} day`;
  return null;
}

function shootCellLabel(dayEntries = []) {
  if (!dayEntries.length) return '\u00A0';
  if (dayEntries.length > 1) return `${dayEntries.length} shoots`;
  const e = dayEntries[0];
  const length = dayLengthLabel(e.day_length);
  const city = e.city ? String(e.city).trim() : '';
  if (length && city) return `${length.replace(' day', 'd')} · ${city}`;
  if (city) return city;
  if (length) return length;
  return 'Shoot';
}

function shootAriaLabel(dayEntries = []) {
  if (!dayEntries.length) return '';
  return dayEntries
    .map((e) => {
      const parts = [
        dayLengthLabel(e.day_length),
        e.city || null,
        e.applied_rate != null
          ? formatCurrency(e.applied_rate, e.applied_currency || 'GBP')
          : null,
      ].filter(Boolean);
      return parts.join(', ') || 'Shoot';
    })
    .join('; ');
}

/** Section 5 — Calendar of preferred shoot dates from booking requirements */
export function CalendarSection({ entries = [], locale = 'en-GB', id }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);

  const entriesByDate = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = e.shoot_date ? String(e.shoot_date).slice(0, 10) : null;
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
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
  const selectedKey = selected ? String(selected).slice(0, 10) : null;
  const selectedEntries = selectedKey ? entriesByDate.get(selectedKey) || [] : [];

  const goToday = () => {
    const now = new Date();
    setCursor(startOfMonth(now));
    setSelected(toKey(now));
  };

  return (
    <Section id={id}>
      <SectionTitle>Calendar</SectionTitle>
      <SectionHint>
        Preferred shoot dates are highlighted. Select a day to see full shoot details (length, city,
        cost).
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

        <Calendar role="grid" aria-label="Preferred shoot dates calendar">
          {days.map((day) => {
            const key = toKey(day);
            const outside = day.getMonth() !== cursor.getMonth();
            const dayEntries = entriesByDate.get(key) || [];
            const count = dayEntries.length;
            const isToday = key === todayKey;
            const isSelected = selected === key;
            const shootInfo = shootAriaLabel(dayEntries);
            return (
              <DayCell
                key={key}
                type="button"
                $outside={outside}
                $selected={isSelected}
                $hasEntries={count > 0}
                $today={isToday && !isSelected}
                title={shootInfo || undefined}
                aria-label={`${formatDate(day, locale)}${isToday ? ', today' : ''}${
                  shootInfo ? `, ${shootInfo}` : ''
                }${isSelected ? ', selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelected(key);
                  if (outside) setCursor(startOfMonth(day));
                }}
              >
                <DayNumber $selected={isSelected} $today={isToday}>
                  {day.getDate()}
                </DayNumber>
                <DayMeta $selected={isSelected}>{shootCellLabel(dayEntries)}</DayMeta>
              </DayCell>
            );
          })}
        </Calendar>

        <CalendarLegend>
          <LegendItem>
            <LegendSwatch $tone="today" /> Today
          </LegendItem>
          <LegendItem>
            <LegendSwatch $tone="booked" /> Preferred shoot date
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
              {selectedEntries.length} shoot{selectedEntries.length === 1 ? '' : 's'}
            </Badge>
          </SelectedDayPanel>
          {selectedEntries.length === 0 ? (
            <EmptyState style={{ padding: '1.25rem' }}>No preferred shoot on this day.</EmptyState>
          ) : (
            selectedEntries.map((entry, index) => {
              const length = dayLengthLabel(entry.day_length);
              const cost =
                entry.applied_rate != null
                  ? formatCurrency(entry.applied_rate, entry.applied_currency || 'GBP', locale)
                  : null;
              return (
                <EntryCard key={entry.id}>
                  <EntryTitle>
                    Shoot {selectedEntries.length > 1 ? `${index + 1}` : ''}
                    {length ? ` · ${length}` : ''}
                    {entry.city ? ` · ${entry.city}` : ''}
                  </EntryTitle>
                  <EntryMeta>
                    <dt>Day length</dt>
                    <dd>{length || '—'}</dd>
                    <dt>City</dt>
                    <dd>{entry.city || '—'}</dd>
                    <dt>Preferred date</dt>
                    <dd>{formatDate(entry.shoot_date, locale)}</dd>
                    <dt>Cost</dt>
                    <dd>{cost || '—'}</dd>
                    {entry.format && entry.format !== 'Shoot' && (
                      <>
                        <dt>Format</dt>
                        <dd>{entry.format}</dd>
                      </>
                    )}
                    {(entry.live_start || entry.live_end) && (
                      <>
                        <dt>Live dates</dt>
                        <dd>
                          {entry.live_start ? formatDate(entry.live_start, locale) : '—'}
                          {' → '}
                          {entry.live_end ? formatDate(entry.live_end, locale) : '—'}
                        </dd>
                      </>
                    )}
                    {entry.notes && (
                      <>
                        <dt>Notes</dt>
                        <dd>{entry.notes}</dd>
                      </>
                    )}
                  </EntryMeta>
                </EntryCard>
              );
            })
          )}
        </>
      ) : (
        <EmptyState style={{ padding: '1.5rem' }}>
          Select a highlighted day to see shoot details.
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
