'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState } from '@/components/ui/Tabs';
import { RemoveIconButton } from '@/components/ui/IconButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Grid, Row } from '@/components/layout/PageHeader';
import {
  colorForLiveEntry,
  formatLiveDate,
  scheduleAddedByMeta,
  SHOOT_DAY_COLOR,
} from '@/lib/calendarFormats';
import { DAY_LENGTH_OPTIONS, dayLengthLabel, MARKET_CITIES } from '@/lib/rateCard';
import { toDateInputValue } from '@/utils/format';

const SectionLabel = styled.h4`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
`;

const SectionBlock = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 0;
`;

const SectionScroll = styled(ScrollArea)`
  flex: 1 1 auto;
  min-height: 0;
  margin-right: -0.25rem;
  padding-right: 0.25rem;

  && {
    height: 100%;
    min-height: 7rem;
    max-height: 100%;
  }
`;

const DayModalLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
  min-height: 0;
  flex: 1 1 auto;
  height: min(72vh, calc(100vh - 12rem));
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $soft }) => $soft || theme.colors.surface};
`;

const ActionMain = styled.div`
  flex: 1;
  min-width: 12rem;
`;

const ActionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $text }) => $text || theme.colors.text};
`;

const ActionMeta = styled.div`
  margin-top: 0.25rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ActionControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
`;

const Dot = styled.span`
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const AddPanel = styled.div`
  padding: ${({ theme }) => theme.space[4]};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgMuted};
`;

const FieldError = styled.p`
  margin: 0;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const KindField = styled.div`
  margin-bottom: ${({ theme }) => theme.space[1]};
`;

const KindLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.35rem;
`;

const KindHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.35;
`;

const KindToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]};
`;

const KindButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryMuted : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }

  strong {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textMuted};
    line-height: 1.3;
  }
`;

const cityOptions = MARKET_CITIES.map((c) => ({ value: c, label: c }));

function emptyLiveDraft(dateKey) {
  return {
    kind: 'live_format',
    format: '',
    live_start: dateKey || '',
    live_end: dateKey || '',
    notes: '',
  };
}

function emptyShootDraft(dateKey) {
  return {
    kind: 'shoot',
    day_length: '1',
    city: 'London',
    shoot_date: dateKey || '',
  };
}

/**
 * Google Calendar–style day editor: list/remove day actions, add live range or shoot.
 */
export function CalendarDayModal({
  open,
  onOpenChange,
  dateKey,
  locale = 'en-GB',
  shoots = [],
  liveFormats = [],
  colorByKey,
  onRemoveFromDay,
  onDeleteEntry,
  onAdd,
  onUpdate,
}) {
  const [addKind, setAddKind] = useState(() => 'live_format');
  const [liveDraft, setLiveDraft] = useState(() => emptyLiveDraft(dateKey));
  const [shootDraft, setShootDraft] = useState(() => emptyShootDraft(dateKey));
  const [editingId, setEditingId] = useState(() => null);
  const [editRange, setEditRange] = useState(() => ({ live_start: '', live_end: '', format: '', notes: '' }));
  const [error, setError] = useState(() => '');
  const [busy, setBusy] = useState(() => false);

  useEffect(() => {
    if (!open || !dateKey) return;
    return () => {
      setAddKind('live_format');
      setLiveDraft(emptyLiveDraft(dateKey));
      setShootDraft(emptyShootDraft(dateKey));
      setEditingId(null);
      setError('');
    };
  }, [open, dateKey]);

  const title = useMemo(() => {
    if (!dateKey) return 'Edit day';
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [dateKey, locale]);

  const dayEntries = useMemo(
    () => [
      ...shoots.map((e) => ({ entry: e, kind: 'shoot' })),
      ...liveFormats.map((e) => ({ entry: e, kind: 'live' })),
    ],
    [shoots, liveFormats]
  );

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () =>
    run(async () => {
      if (!onAdd) return;
      if (addKind === 'live_format') {
        const format = liveDraft.format.trim();
        const start = toDateInputValue(liveDraft.live_start);
        const end = toDateInputValue(liveDraft.live_end || liveDraft.live_start);
        if (!format) throw new Error('Format name is required');
        if (!start || !end) throw new Error('Start and end dates are required');
        if (end < start) throw new Error('End date cannot be before start date');
        await onAdd({
          kind: 'live_format',
          format,
          live_start: start,
          live_end: end,
          shoot_date: start,
          day_length: null,
          city: null,
          notes: liveDraft.notes.trim() || null,
        });
        setLiveDraft(emptyLiveDraft(dateKey));
      } else {
        const shootDate = toDateInputValue(shootDraft.shoot_date || dateKey);
        if (!shootDate) throw new Error('Shoot date is required');
        if (!shootDraft.city) throw new Error('City is required');
        await onAdd({
          shoot_date: shootDate,
          day_length: Number(shootDraft.day_length),
          city: shootDraft.city,
          format: 'Shoot',
          live_start: null,
          live_end: null,
        });
        setShootDraft(emptyShootDraft(dateKey));
      }
    });

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditRange({
      format: entry.format || '',
      live_start: toDateInputValue(entry.live_start),
      live_end: toDateInputValue(entry.live_end || entry.live_start),
      notes: entry.notes || '',
    });
    setError('');
  };

  const saveEdit = (entry) =>
    run(async () => {
      if (!onUpdate) return;
      const start = toDateInputValue(editRange.live_start);
      const end = toDateInputValue(editRange.live_end || editRange.live_start);
      const format = editRange.format.trim();
      if (!format) throw new Error('Format name is required');
      if (!start || !end) throw new Error('Start and end dates are required');
      if (end < start) throw new Error('End date cannot be before start date');
      await onUpdate({
        entryId: entry.id,
        kind: 'live_format',
        format,
        live_start: start,
        live_end: end,
        shoot_date: start,
        day_length: null,
        city: null,
        notes: editRange.notes.trim() || null,
      });
      setEditingId(null);
    });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Add, edit, or remove calendar actions for this day."
      size="lg"
      scrollable
      footer={
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
          Done
        </Button>
      }
    >
      <DayModalLayout>
        <SectionBlock>
          <SectionLabel>Actions this day</SectionLabel>
          <SectionScroll type="scroll">
            {dayEntries.length === 0 ? (
              <EmptyState style={{ padding: '1rem' }}>Nothing on this day yet.</EmptyState>
            ) : (
              dayEntries.map(({ entry, kind }) => {
                if (kind === 'shoot') {
                  const who = scheduleAddedByMeta(entry);
                  const length = dayLengthLabel(entry.day_length);
                  return (
                    <ActionRow key={entry.id || `shoot-${entry.shoot_date}`} $soft="#F8EDE8">
                      <ActionMain>
                        <ActionTitle $text="#B45A3C">
                          <Dot $color={SHOOT_DAY_COLOR} />
                          Shoot · {length}
                          {entry.city ? ` · ${entry.city}` : ''}
                        </ActionTitle>
                        <ActionMeta>
                          {formatLiveDate(entry.shoot_date, locale)}
                          {who.name ? ` · ${who.label}: ${who.name}` : ` · ${who.label}`}
                        </ActionMeta>
                      </ActionMain>
                      <ActionControls>
                        <Badge $tone={who.tone}>{who.label}</Badge>
                        {onRemoveFromDay && entry.id && (
                          <RemoveIconButton
                            disabled={busy}
                            label="Remove from this day"
                            title="Remove from this day"
                            onClick={() => run(() => onRemoveFromDay(entry.id, dateKey))}
                          />
                        )}
                      </ActionControls>
                    </ActionRow>
                  );
                }

                const color = colorForLiveEntry(entry, colorByKey);
                const multiDay =
                  String(entry.live_start || '').slice(0, 10) !==
                  String(entry.live_end || entry.live_start || '').slice(0, 10);
                const isEditing = editingId === entry.id;

                return (
                  <ActionRow key={entry.id || `${entry.format}-${entry.live_start}`} $soft={color.soft}>
                    <ActionMain style={{ width: '100%' }}>
                      <Row
                        style={{
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <ActionTitle $text={color.text}>
                            <Dot $color={color.bar} />
                            {entry.format}
                          </ActionTitle>
                          <ActionMeta>
                            Live: {formatLiveDate(entry.live_start, locale)} →{' '}
                            {formatLiveDate(entry.live_end, locale)}
                          </ActionMeta>
                        </div>
                        <ActionControls>
                          {onUpdate && entry.id && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(entry))}
                            >
                              {isEditing ? 'Cancel' : 'Edit'}
                            </Button>
                          )}
                          {onRemoveFromDay && entry.id && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => run(() => onRemoveFromDay(entry.id, dateKey))}
                              title="Remove this action from the selected day only"
                            >
                              Remove from this day
                            </Button>
                          )}
                          {onDeleteEntry && entry.id && (
                            <RemoveIconButton
                              disabled={busy}
                              label={
                                multiDay
                                  ? 'Remove entire action from calendar (all days in this range)'
                                  : 'Remove entire action from calendar'
                              }
                              onClick={() => {
                                if (
                                  multiDay &&
                                  !window.confirm(
                                    `Delete the entire “${entry.format}” range (${formatLiveDate(entry.live_start, locale)} – ${formatLiveDate(entry.live_end, locale)})?`
                                  )
                                ) {
                                  return;
                                }
                                run(() => onDeleteEntry(entry.id));
                              }}
                            />
                          )}
                        </ActionControls>
                      </Row>

                      {isEditing && (
                        <div style={{ marginTop: '0.85rem' }}>
                          <Grid $cols={2}>
                            <Input
                              label="Format"
                              required
                              value={editRange.format}
                              onChange={(e) =>
                                setEditRange((d) => ({ ...d, format: e.target.value }))
                              }
                              disabled={busy}
                            />
                            <Input
                              label="Notes"
                              value={editRange.notes}
                              onChange={(e) =>
                                setEditRange((d) => ({ ...d, notes: e.target.value }))
                              }
                              disabled={busy}
                            />
                            <Input
                              label="Start"
                              type="date"
                              required
                              value={editRange.live_start}
                              onChange={(e) =>
                                setEditRange((d) => ({ ...d, live_start: e.target.value }))
                              }
                              disabled={busy}
                            />
                            <Input
                              label="End"
                              type="date"
                              required
                              value={editRange.live_end}
                              onChange={(e) =>
                                setEditRange((d) => ({ ...d, live_end: e.target.value }))
                              }
                              disabled={busy}
                            />
                          </Grid>
                          <Row style={{ marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => saveEdit(entry)}
                            >
                              Save changes
                            </Button>
                          </Row>
                        </div>
                      )}
                    </ActionMain>
                  </ActionRow>
                );
              })
            )}
          </SectionScroll>
        </SectionBlock>

        <SectionBlock>
          <SectionLabel>Add action</SectionLabel>
          <SectionScroll type="scroll">
            <AddPanel>
              <KindField>
                <KindLabel>What to add</KindLabel>
                <KindHint>
                  Choose a live media format (can span several days) or a shoot requirement for a
                  single day.
                </KindHint>
                <KindToggle role="group" aria-label="What to add">
                  <KindButton
                    type="button"
                    $active={addKind === 'live_format'}
                    disabled={busy || !onAdd}
                    aria-pressed={addKind === 'live_format'}
                    onClick={() => setAddKind('live_format')}
                  >
                    <strong>Live format</strong>
                    <span>Bars on the calendar · date range</span>
                  </KindButton>
                  <KindButton
                    type="button"
                    $active={addKind === 'shoot'}
                    disabled={busy || !onAdd}
                    aria-pressed={addKind === 'shoot'}
                    onClick={() => setAddKind('shoot')}
                  >
                    <strong>Shoot day</strong>
                    <span>Orange day number · one date</span>
                  </KindButton>
                </KindToggle>
              </KindField>

              {addKind === 'live_format' ? (
                <Grid $cols={2} style={{ marginTop: '0.75rem' }}>
                  <Input
                    label="Format name"
                    required
                    placeholder="e.g. 6-Sheet"
                    value={liveDraft.format}
                    onChange={(e) => setLiveDraft((d) => ({ ...d, format: e.target.value }))}
                    disabled={busy || !onAdd}
                  />
                  <Input
                    label="Notes"
                    value={liveDraft.notes}
                    onChange={(e) => setLiveDraft((d) => ({ ...d, notes: e.target.value }))}
                    disabled={busy || !onAdd}
                  />
                  <Input
                    label="Start date"
                    type="date"
                    required
                    value={liveDraft.live_start}
                    onChange={(e) => setLiveDraft((d) => ({ ...d, live_start: e.target.value }))}
                    disabled={busy || !onAdd}
                  />
                  <Input
                    label="End date"
                    type="date"
                    required
                    value={liveDraft.live_end}
                    onChange={(e) => setLiveDraft((d) => ({ ...d, live_end: e.target.value }))}
                    disabled={busy || !onAdd}
                    hint="Same as start for a single day"
                  />
                </Grid>
              ) : (
                <Grid $cols={3} style={{ marginTop: '0.75rem' }}>
                  <Select
                    label="Day length"
                    required
                    value={shootDraft.day_length}
                    onValueChange={(v) => setShootDraft((d) => ({ ...d, day_length: v }))}
                    options={DAY_LENGTH_OPTIONS}
                    disabled={busy || !onAdd}
                  />
                  <Select
                    label="City"
                    required
                    value={shootDraft.city}
                    onValueChange={(v) => setShootDraft((d) => ({ ...d, city: v }))}
                    options={cityOptions}
                    disabled={busy || !onAdd}
                  />
                  <Input
                    label="Shoot date"
                    type="date"
                    required
                    value={shootDraft.shoot_date}
                    onChange={(e) => setShootDraft((d) => ({ ...d, shoot_date: e.target.value }))}
                    disabled={busy || !onAdd}
                  />
                </Grid>
              )}

              <Row style={{ marginTop: '0.85rem', justifyContent: 'flex-end' }}>
                <Button type="button" onClick={handleAdd} disabled={busy || !onAdd} loading={busy}>
                  Add to calendar
                </Button>
              </Row>
            </AddPanel>
          </SectionScroll>
        </SectionBlock>

        {error && <FieldError role="alert">{error}</FieldError>}
      </DayModalLayout>
    </Modal>
  );
}

export default CalendarDayModal;
