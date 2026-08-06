'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { EmptyState, Badge } from '@/components/ui/Tabs';
import { PencilIcon, RemoveIconButton } from '@/components/ui/IconButton';
import { Section, SectionTitle, SectionHint, Grid, Row } from '@/components/layout/PageHeader';
import { formatDate } from '@/utils/format';
import {
  assignDistinctLaneColors,
  colorForLiveEntry,
  entryCoversDate,
  formatsOnDate,
  formatLiveDate,
  liveEntryKey,
  scheduleAddedByMeta,
  SHOOT_DAY_COLOR,
  shootDatesFromSchedule,
  shootsOnDate,
  uniqueLiveFormats,
} from '@/lib/calendarFormats';
import { CalendarDayModal } from '@/components/booking/CalendarDayModal';

const CalendarShell = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[5]};
  margin-bottom: ${({ theme }) => theme.space[5]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.text};
`;

const MonthTitle = styled.h3`
  margin: 0;
  min-width: 9rem;
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const ChevronBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: 1.85rem;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const Weekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  margin-bottom: 0.35rem;
`;

const Weekday = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0.35rem 0;
`;

const Calendar = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
`;

const DayCell = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  min-height: 4.5rem;
  padding: 0.35rem 0 0.45rem;
  border: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $outside, $selected, $today }) => {
    if ($selected) return theme.colors.surface;
    if ($today && !$outside) return theme.colors.primaryMuted;
    if ($outside) return theme.colors.bgMuted;
    return theme.colors.surface;
  }};
  box-shadow: ${({ $selected }) =>
    $selected ? `inset 0 0 0 2px ${SHOOT_DAY_COLOR}` : 'none'};
  cursor: pointer;
  color: ${({ theme, $outside }) => ($outside ? theme.colors.textMuted : theme.colors.text)};
  z-index: ${({ $selected }) => ($selected ? 1 : 0)};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    min-height: 5.25rem;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: -2px;
    z-index: 2;
  }
`;

const DayEditBtn = styled.button`
  position: absolute;
  top: 0.15rem;
  right: 0.15rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  line-height: 1;

  svg {
    width: 0.8rem;
    height: 0.8rem;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bgMuted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 1px;
  }
`;

const DayNumberWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 1.5rem;
  margin-bottom: 0.2rem;
`;

const DayNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-variant-numeric: tabular-nums;
  line-height: 1;
  background: ${({ $shoot, theme, $today }) => {
    if ($shoot) return SHOOT_DAY_COLOR;
    if ($today) return theme.colors.primary;
    return 'transparent';
  }};
  color: ${({ theme, $shoot, $outside, $today }) => {
    if ($shoot || $today) return theme.colors.onPrimary || '#fff';
    if ($outside) return theme.colors.textMuted;
    return theme.colors.text;
  }};
  box-shadow: ${({ $today, $shoot, theme }) =>
    $today && !$shoot ? `0 0 0 2px ${theme.colors.primaryMuted}` : 'none'};
`;

const DayBars = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: 3px;
  width: 100%;
  padding-top: 0.15rem;
`;

const DayBar = styled.span`
  display: block;
  height: 7px;
  width: 100%;
  border-radius: 0;
  background: ${({ $color, $empty }) => ($empty ? 'transparent' : $color || '#8a9bb0')};
  opacity: ${({ $faded, $empty }) => {
    if ($empty) return 0;
    return $faded ? 0.45 : 1;
  }};
  /* Keep lane height even when inactive so colours stay aligned across days */
  flex-shrink: 0;
`;

const FormatPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: ${({ theme }) => theme.space[4]};
`;

const FormatPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background: ${({ $soft }) => $soft || '#eceff3'};
  color: ${({ $text }) => $text || 'inherit'};
  border: 2px solid ${({ $active, $text }) => ($active ? $text || 'currentColor' : 'transparent')};
  cursor: pointer;
  font-family: inherit;
  line-height: 1.3;
  transition:
    border-color 120ms ease,
    filter 120ms ease,
    box-shadow 120ms ease;

  &:hover {
    filter: brightness(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const FormatDot = styled.span`
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: ${({ $color }) => $color || '#8a9bb0'};
  flex-shrink: 0;
`;

const FormatCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: 1rem 1.15rem;
  margin-bottom: ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: none;
  background: ${({ $soft }) => $soft || '#f7f7f7'};
`;

const FormatCardMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

const FormatCardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ $text }) => $text || 'inherit'};
`;

const FormatCardMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  padding-left: 1.1rem;
`;

const SelectedDayPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const SelectedDayLabel = styled.strong`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const SelectedDayCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const DayGroupTitle = styled.h4`
  margin: ${({ theme }) => theme.space[4]} 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &:first-of-type {
    margin-top: 0;
  }
`;

const CardBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
`;

const ShootLegend = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  margin-top: ${({ theme }) => theme.space[3]};
`;

const ShootLegendDot = styled.span`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: ${SHOOT_DAY_COLOR};
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const TodayLegendDot = styled.span`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  flex-shrink: 0;
`;

const EntryCard = styled.div`
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'draft' ? theme.colors.borderStrong : theme.colors.border};
  border-style: ${({ $variant }) => ($variant === 'draft' ? 'dashed' : 'solid')};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  background: ${({ theme, $variant }) =>
    $variant === 'draft' ? theme.colors.bgMuted : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

const AddRow = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: ${({ theme }) => theme.space[2]};
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
  margin: 0.5rem 0 0;
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

/** Section 5 — Live format calendar + shoot requirement days */
export function CalendarSection({
  entries = [],
  locale = 'en-GB',
  id,
  onRemove,
  onAdd,
  onUpdate,
  readOnly = false,
}) {
  const liveFormats = useMemo(() => uniqueLiveFormats(entries), [entries]);
  const shootDates = useMemo(() => shootDatesFromSchedule(entries), [entries]);
  const liveFormatsKey = useMemo(
    () => liveFormats.map((entry) => liveEntryKey(entry)).join('|'),
    [liveFormats]
  );
  const [colorByKey, setColorByKey] = useState(() => new Map());
  const [syncedFormatsKey, setSyncedFormatsKey] = useState('');
  if (liveFormatsKey !== syncedFormatsKey) {
    setSyncedFormatsKey(liveFormatsKey);
    setColorByKey((prev) => assignDistinctLaneColors(liveFormats, prev));
  }

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

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

  const selectedKey = selected ? String(selected).slice(0, 10) : null;
  const selectedFormats = selectedKey
    ? formatsOnDate(entries, selectedKey, liveFormats)
    : [];
  const selectedShoots = selectedKey ? shootsOnDate(entries, selectedKey) : [];
  const todayKey = toKey(new Date());
  const canEditDay = !readOnly && (onRemove || onAdd || onUpdate);

  return (
    <Section id={id}>
      <SectionTitle>Shoot Schedule &amp; Live Dates</SectionTitle>
      <SectionHint>
        Orange day numbers are manually added shoot requirements. Coloured bars are live media
        formats from the media plan. Click a day to review, or a format badge to jump to its live
        dates
        {readOnly
          ? '.'
          : ', then use the pencil in the day square to add, edit, or remove actions.'}
      </SectionHint>

      <CalendarShell>
        <MonthNav>
          <ChevronBtn
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            ‹
          </ChevronBtn>
          <MonthTitle>
            {cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </MonthTitle>
          <ChevronBtn
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            ›
          </ChevronBtn>
        </MonthNav>

        <Weekdays aria-hidden>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Weekday key={d}>{d}</Weekday>
          ))}
        </Weekdays>

        <Calendar role="grid" aria-label="Shoot schedule and live format calendar">
          {days.map((day) => {
            const key = toKey(day);
            const outside = day.getMonth() !== cursor.getMonth();
            const dayFormats = formatsOnDate(entries, key, liveFormats);
            const isSelected = selected === key;
            const isShoot = shootDates.has(key);
            const isToday = key === todayKey;
            return (
              <DayCell
                key={key}
                role="gridcell"
                tabIndex={0}
                $outside={outside}
                $selected={isSelected}
                $today={isToday}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${formatDate(day, locale)}${isToday ? ', today' : ''}${
                  isShoot ? ', shoot day' : ''
                }${
                  dayFormats.length
                    ? `, ${dayFormats.length} format${dayFormats.length === 1 ? '' : 's'} live`
                    : ''
                }${isSelected ? ', selected' : ''}`}
                aria-selected={isSelected}
                onClick={() => {
                  setSelected(key);
                  if (outside) setCursor(startOfMonth(day));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(key);
                    if (outside) setCursor(startOfMonth(day));
                  }
                }}
              >
                {isSelected && canEditDay && (
                  <DayEditBtn
                    type="button"
                    aria-label="Edit this day"
                    title="Edit this day"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayModalOpen(true);
                    }}
                  >
                    <PencilIcon />
                  </DayEditBtn>
                )}
                <DayNumberWrap>
                  <DayNumber $shoot={isShoot} $outside={outside} $today={isToday && !outside}>
                    {day.getDate()}
                  </DayNumber>
                </DayNumberWrap>
                <DayBars>
                  {liveFormats.map((entry) => {
                    const color = colorForLiveEntry(entry, colorByKey);
                    const active = entryCoversDate(entry, key);
                    return (
                      <DayBar
                        key={entry.id || `${entry.format}-${entry.live_start}-${entry.live_end}`}
                        $color={color.bar}
                        $empty={!active}
                        $faded={outside}
                        title={active ? entry.format : undefined}
                      />
                    );
                  })}
                </DayBars>
              </DayCell>
            );
          })}
        </Calendar>

        {liveFormats.length > 0 && (
          <FormatPills>
            {liveFormats.map((entry) => {
              const color = colorForLiveEntry(entry, colorByKey);
              const startKey = String(entry.live_start || '').slice(0, 10);
              const active = Boolean(selectedKey && entryCoversDate(entry, selectedKey));
              const label = `${entry.format} ${formatLiveDate(entry.live_start, locale)} – ${formatLiveDate(entry.live_end, locale)}`;
              return (
                <FormatPill
                  key={entry.id || `${entry.format}-${entry.live_start}-${entry.live_end}`}
                  type="button"
                  $soft={color.soft}
                  $text={color.text}
                  $active={active}
                  aria-pressed={active}
                  aria-label={`Jump to ${label}`}
                  title={`Jump to ${formatLiveDate(entry.live_start, locale)}`}
                  onClick={() => {
                    if (!startKey) return;
                    setCursor(startOfMonth(new Date(`${startKey}T12:00:00`)));
                    setSelected(startKey);
                  }}
                >
                  <FormatDot $color={color.bar} />
                  {entry.format} {formatLiveDate(entry.live_start, locale)} –{' '}
                  {formatLiveDate(entry.live_end, locale)}
                </FormatPill>
              );
            })}
          </FormatPills>
        )}

        <LegendRow>
          <ShootLegend>
            <TodayLegendDot aria-hidden />
            Today
          </ShootLegend>
          {shootDates.size > 0 && (
            <ShootLegend>
              <ShootLegendDot aria-hidden>●</ShootLegendDot>
              Shoot requirement day
              {shootDates.size > 1 ? `s (${shootDates.size})` : ''}
            </ShootLegend>
          )}
        </LegendRow>
      </CalendarShell>

      {selected ? (
        <>
          <SelectedDayPanel>
            <div>
              <SelectedDayLabel>
                {new Date(`${selectedKey}T12:00:00`).toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </SelectedDayLabel>
              <SelectedDayCount style={{ display: 'block', marginTop: '0.25rem' }}>
                {selectedShoots.length
                  ? `${selectedShoots.length} shoot${selectedShoots.length === 1 ? '' : 's'}`
                  : null}
                {selectedShoots.length && selectedFormats.length ? ' · ' : null}
                {selectedFormats.length
                  ? `${selectedFormats.length} format${selectedFormats.length === 1 ? '' : 's'} live`
                  : selectedShoots.length
                    ? null
                    : 'Nothing booked'}
              </SelectedDayCount>
            </div>
          </SelectedDayPanel>

          {selectedShoots.length === 0 && selectedFormats.length === 0 ? (
            <EmptyState style={{ padding: '1.25rem' }}>
              No shoot requirements or live formats on this day.
              {canEditDay ? ' Use the pencil to add an action.' : ''}
            </EmptyState>
          ) : (
            <>
              {selectedShoots.length > 0 && (
                <>
                  <DayGroupTitle>Shoot requirements</DayGroupTitle>
                  {selectedShoots.map((entry) => {
                    const who = scheduleAddedByMeta(entry);
                    const length =
                      Number(entry.day_length) === 0.5 ? '0.5 day' : '1 day';
                    return (
                      <FormatCard
                        key={entry.id || `shoot-${entry.shoot_date}-${entry.city}`}
                        $soft="#F8EDE8"
                      >
                        <FormatCardMain>
                          <FormatCardTitle $text="#B45A3C">
                            <FormatDot $color={SHOOT_DAY_COLOR} />
                            Shoot · {length}
                            {entry.city ? ` · ${entry.city}` : ''}
                          </FormatCardTitle>
                          <FormatCardMeta>
                            Preferred date: {formatLiveDate(entry.shoot_date, locale)}
                            {who.name ? ` · Added by ${who.name}` : ''}
                          </FormatCardMeta>
                        </FormatCardMain>
                        <CardBadgeRow>
                          <Badge $tone={who.tone}>{who.label}</Badge>
                        </CardBadgeRow>
                      </FormatCard>
                    );
                  })}
                </>
              )}

              {selectedFormats.length > 0 && (
                <>
                  <DayGroupTitle>Live formats</DayGroupTitle>
                  {selectedFormats.map((entry) => {
                    const color = colorForLiveEntry(entry, colorByKey);
                    return (
                      <FormatCard
                        key={entry.id || `${entry.format}-${entry.live_start}`}
                        $soft={color.soft}
                      >
                        <FormatCardMain>
                          <FormatCardTitle $text={color.text}>
                            <FormatDot $color={color.bar} />
                            {entry.format}
                          </FormatCardTitle>
                          <FormatCardMeta>
                            Live: {formatLiveDate(entry.live_start, locale)} →{' '}
                            {formatLiveDate(entry.live_end, locale)}
                          </FormatCardMeta>
                        </FormatCardMain>
                      </FormatCard>
                    );
                  })}
                </>
              )}
            </>
          )}

          {canEditDay && (
            <CalendarDayModal
              open={dayModalOpen}
              onOpenChange={setDayModalOpen}
              dateKey={selectedKey}
              locale={locale}
              shoots={selectedShoots}
              liveFormats={selectedFormats}
              colorByKey={colorByKey}
              onRemoveFromDay={
                onRemove
                  ? async (entryId, date) => {
                      await onRemove(entryId, { date });
                    }
                  : null
              }
              onDeleteEntry={
                onRemove
                  ? async (entryId) => {
                      await onRemove(entryId);
                    }
                  : null
              }
              onAdd={onAdd || null}
              onUpdate={onUpdate || null}
            />
          )}
        </>
      ) : (
        <EmptyState style={{ padding: '1.5rem' }}>
          Select a day to see shoot requirements and live formats.
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
  onRemoveAll,
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  id,
}) {
  const emptyDraft = () => ({
    type: 'must_shoot',
    site_name: '',
    location: '',
    notes: '',
    reference_url: '',
  });

  const [draft, setDraft] = useState(emptyDraft);
  const [draftOpen, setDraftOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingType, setRemovingType] = useState(null);

  const showToggle = !fieldHidden.mpc_chooses_sites;
  const showSites = !fieldHidden.sites;
  if (!showToggle && !showSites) return null;

  const mustShoot = sites.filter((s) => s.type === 'must_shoot');
  const avoid = sites.filter((s) => s.type === 'avoid');
  const mpcChooses = values.mpc_chooses_sites !== false;
  const needsSiteInstructions = showSites && !mpcChooses && sites.length === 0;
  const canEditSites = showSites && !readOnly && !fieldDisabled.sites;

  const openDraft = () => {
    setError('');
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

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
    setSaving(true);
    try {
      await onAdd({
        ...draft,
        reference_url: draft.reference_url || null,
      });
      setDraft(emptyDraft());
      setDraftOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAll = async (type) => {
    const list = type === 'avoid' ? avoid : mustShoot;
    if (!list.length) return;
    const kind = type === 'avoid' ? 'avoid' : 'must-shoot';
    if (
      !window.confirm(
        `Remove all ${list.length} ${kind} site${list.length === 1 ? '' : 's'}?`
      )
    ) {
      return;
    }
    setError('');
    setRemovingType(type);
    try {
      if (onRemoveAll) {
        await onRemoveAll(type);
      } else if (onRemove) {
        for (const site of list) {
          await onRemove(site.id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingType(null);
    }
  };

  return (
    <Section id={id}>
      <SectionTitle>Sites</SectionTitle>
      <SectionHint>
        MPC Chooses Sites is enabled by default. When disabled, provide at least one Must-Shoot
        Site or other site instruction. Use + to add a site with name, location, notes, and an
        optional reference link.
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
          <Row
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.35rem',
            }}
          >
            <h3 style={{ fontSize: '1rem', margin: 0 }}>
              Must-Shoot Sites
              {!mpcChooses && <RequiredMark> *</RequiredMark>}
            </h3>
            {canEditSites && mustShoot.length > 0 && (onRemove || onRemoveAll) && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemoveAll('must_shoot')}
                loading={removingType === 'must_shoot'}
                disabled={!!removingType || saving}
              >
                Remove all
              </Button>
            )}
          </Row>
          {mustShoot.length === 0 && <EmptyState style={{ padding: '1rem' }}>None yet</EmptyState>}
          {mustShoot.map((site) => (
            <EntryCard key={site.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <strong>{site.site_name}</strong>
                {!readOnly && !fieldDisabled.sites && (
                  <RemoveIconButton
                    onClick={() => onRemove(site.id)}
                    disabled={!!removingType || saving}
                  />
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

          <Row
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '1.25rem',
              marginBottom: '0.35rem',
            }}
          >
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Sites to Avoid</h3>
            {canEditSites && avoid.length > 0 && (onRemove || onRemoveAll) && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemoveAll('avoid')}
                loading={removingType === 'avoid'}
                disabled={!!removingType || saving}
              >
                Remove all
              </Button>
            )}
          </Row>
          {avoid.length === 0 && <EmptyState style={{ padding: '1rem' }}>None yet</EmptyState>}
          {avoid.map((site) => (
            <EntryCard key={site.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <strong>{site.site_name}</strong>
                {!readOnly && !fieldDisabled.sites && (
                  <RemoveIconButton
                    onClick={() => onRemove(site.id)}
                    disabled={!!removingType || saving}
                  />
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

      {canEditSites && draftOpen && (
        <EntryCard $variant="draft" style={{ marginTop: '1.25rem' }}>
          <Grid>
            <Select
              label="Type"
              value={draft.type}
              onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
              options={[
                { value: 'must_shoot', label: 'Must-Shoot' },
                { value: 'avoid', label: 'Avoid' },
              ]}
              disabled={saving}
            />
            <Input
              label="Site Name"
              required
              value={draft.site_name}
              onChange={(e) => setDraft((d) => ({ ...d, site_name: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Location"
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              disabled={saving}
            />
            <Input
              label="Reference URL"
              value={draft.reference_url}
              onChange={(e) => setDraft((d) => ({ ...d, reference_url: e.target.value }))}
              hint="Optional"
              disabled={saving}
            />
            <Textarea
              label="Notes"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              disabled={saving}
            />
          </Grid>
          <Row style={{ marginTop: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            <AddRow style={{ marginTop: 0 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAdd}
                disabled={saving}
                aria-label="Add site"
                title="Add site"
              >
                +
              </Button>
            </AddRow>
          </Row>
        </EntryCard>
      )}

      {canEditSites && !draftOpen && (
        <AddRow style={{ marginTop: '1.25rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={openDraft}
            disabled={saving}
            aria-label="Add site"
            title="Add site"
          >
            +
          </Button>
        </AddRow>
      )}

      {error && <FieldError role="alert">{error}</FieldError>}
    </Section>
  );
}
