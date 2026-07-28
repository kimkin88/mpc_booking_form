'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Tabs';
import { RemoveIconButton } from '@/components/ui/IconButton';
import { Section, SectionTitle, SectionHint, Grid, Row } from '@/components/layout/PageHeader';
import {
  affordableDayLengths,
  canAddShootRow,
  costForDayLength,
  hasBudgetCap,
  MARKET_CITIES,
  ratesFromBooking,
  remainingBudget,
  shootRowsCost,
} from '@/lib/rateCard';
import { shootRequirementsFromSchedule, scheduleAddedByMeta } from '@/lib/calendarFormats';
import { formatDate, formatCurrencyWhole, toDateInputValue } from '@/utils/format';

const RowCard = styled.div`
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'draft' ? theme.colors.borderStrong : theme.colors.border};
  border-style: ${({ $variant }) => ($variant === 'draft' ? 'dashed' : 'solid')};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  background: ${({ theme, $variant }) =>
    $variant === 'draft' ? theme.colors.bgMuted : theme.colors.surface};
`;

const RowHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const BudgetBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const FieldError = styled.p`
  margin: 0.5rem 0 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FieldWarn = styled.p`
  margin: 0.5rem 0 0;
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AddRow = styled.div`
  display: flex;
  justify-content: flex-start;
  margin-top: ${({ theme }) => theme.space[2]};
`;

const emptyDraft = () => ({
  day_length: '1',
  city: 'London',
  shoot_date: '',
});

/** Prefer full day when it fits; otherwise first affordable option. */
function defaultDraftDayLength(options) {
  if (!options?.length) return '1';
  if (options.some((o) => o.value === '1')) return '1';
  return options[0].value;
}

function money(n, currency = 'GBP') {
  return formatCurrencyWhole(n, currency);
}

function rowKey(row) {
  return `${Number(row.day_length)}|${row.city || ''}|${toDateInputValue(row.shoot_date)}`;
}

/**
 * Section 3 — Shoot requirements
 * Saved rows as cards; + opens a draft card to add another when budget allows.
 */
export function ShootRequirementsSection({
  booking,
  entries: entriesProp = [],
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
  showCalendarHint = true,
  id,
}) {
  const rates = useMemo(() => ratesFromBooking(booking), [booking]);
  const budget = booking?.budget;
  const currency = booking?.currency || 'GBP';
  // Never show calendar live-format rows here — those belong on the Calendar tab only
  const entries = useMemo(
    () => shootRequirementsFromSchedule(entriesProp),
    [entriesProp]
  );

  const [draft, setDraft] = useState(() => emptyDraft());
  const [draftOpen, setDraftOpen] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);

  const spent = shootRowsCost(entries, rates);
  const remaining = remainingBudget(budget, entries, rates);
  const budgetSet = hasBudgetCap(budget);
  const canAddMore = !readOnly && budgetSet && canAddShootRow(budget, entries, rates);
  const showDraftRow = draftOpen && canAddMore;

  const draftOptions = useMemo(() => {
    const base = budgetSet
      ? affordableDayLengths(budget, entries, rates)
      : [
          { value: '0.5', label: '0.5 day' },
          { value: '1', label: '1 day' },
        ];
    return base.map((opt) => ({
      value: opt.value,
      label: `${opt.label || `${opt.value} day`} (${money(costForDayLength(opt.value, rates), currency)})`,
    }));
  }, [budget, budgetSet, currency, entries, rates]);

  const draftDayLength = draftOptions.some((o) => o.value === draft.day_length)
    ? draft.day_length
    : defaultDraftDayLength(draftOptions);

  const cityOptions = MARKET_CITIES.map((c) => ({ value: c, label: c }));

  const checkDuplicate = (candidate, excludeId = null) => {
    const key = rowKey(candidate);
    return entries.some((e) => e.id !== excludeId && rowKey(e) === key);
  };

  const handleAdd = async () => {
    setError('');
    setWarning('');
    const dayLength = draftDayLength;
    if (!dayLength) {
      setError('Shoot Day Length is required');
      return;
    }
    if (!draft.city) {
      setError('City is required');
      return;
    }
    if (!draft.shoot_date) {
      setError('Preferred Shoot Date is required');
      return;
    }
    if (budgetSet) {
      const affordable = affordableDayLengths(budget, entries, rates);
      if (!affordable.some((o) => Number(o.value) === Number(dayLength))) {
        setError('This day length would exceed the remaining budget');
        return;
      }
    }
    if (checkDuplicate({ ...draft, day_length: dayLength })) {
      setWarning('A shoot row with the same length, city, and date already exists.');
    }

    const appliedRate = costForDayLength(dayLength, rates);
    setSaving(true);
    try {
      await onAdd({
        shoot_date: draft.shoot_date,
        day_length: Number(dayLength),
        city: draft.city,
        format: 'Shoot',
        applied_rate: appliedRate,
        applied_currency: currency,
      });
      setDraft(emptyDraft());
      setDraftOpen(false);
      setWarning('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDraft = () => {
    if (!canAddMore) return;
    setError('');
    setWarning('');
    const options = budgetSet
      ? affordableDayLengths(budget, entries, rates)
      : [
          { value: '0.5', label: '0.5 day' },
          { value: '1', label: '1 day' },
        ];
    setDraft({
      ...emptyDraft(),
      day_length: defaultDraftDayLength(options),
    });
    setDraftOpen(true);
  };

  const handleLengthChange = async (entry, nextLength) => {
    setError('');
    setWarning('');
    if (budgetSet) {
      const affordable = affordableDayLengths(budget, entries, rates, {
        excludeEntryId: entry.id,
      });
      if (!affordable.some((o) => o.value === String(nextLength))) {
        setError('That day length would exceed the remaining budget');
        return;
      }
    }
    if (!onUpdate) return;
    const next = {
      day_length: Number(nextLength),
      city: entry.city || 'London',
      shoot_date: toDateInputValue(entry.shoot_date),
    };
    if (checkDuplicate(next, entry.id)) {
      setWarning('A shoot row with the same length, city, and date already exists.');
    }
    setSaving(true);
    try {
      await onUpdate({
        entryId: entry.id,
        shoot_date: next.shoot_date,
        day_length: next.day_length,
        city: next.city,
        format: entry.format || 'Shoot',
        applied_rate: costForDayLength(next.day_length, rates),
        applied_currency: currency,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldUpdate = async (entry, patch) => {
    if (!onUpdate) return;
    setError('');
    setWarning('');
    const next = {
      day_length: Number(entry.day_length) || 1,
      city: entry.city || 'London',
      shoot_date: toDateInputValue(entry.shoot_date),
      ...patch,
    };
    if (checkDuplicate(next, entry.id)) {
      setWarning('A shoot row with the same length, city, and date already exists.');
    }
    setSaving(true);
    try {
      await onUpdate({
        entryId: entry.id,
        shoot_date: next.shoot_date,
        day_length: next.day_length,
        city: next.city,
        format: entry.format || 'Shoot',
        applied_rate: costForDayLength(next.day_length, rates),
        applied_currency: currency,
        ...patch,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (entryId) => {
    setError('');
    setWarning('');
    try {
      await onRemove(entryId);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Section id={id}>
      <SectionTitle>Shoot requirements</SectionTitle>
      <SectionHint>
        {rates.label}: {money(rates.fullDay, currency)} = 1 day ·{' '}
        {money(rates.halfDay, currency)} = 0.5 day.
        {budgetSet
          ? ' Use + to add a shoot row when remaining budget allows.'
          : ' Set a shoot budget above before adding shoot rows.'}
        {showCalendarHint
          ? ' Preferred dates also appear on the Calendar tab (orange day numbers).'
          : null}
      </SectionHint>

      <BudgetBar>
        <Badge $tone="info">{rates.label}</Badge>
        <span>
          Budget: <strong>{budgetSet ? money(budget, currency) : 'Not set'}</strong>
        </span>
        <span>
          Allocated: <strong>{money(spent, currency)}</strong>
        </span>
        {budgetSet && (
          <span>
            Remaining: <strong>{money(remaining, currency)}</strong>
            {remaining < 0 ? ' — over budget' : ''}
          </span>
        )}
      </BudgetBar>

      {entries.map((entry) => {
        const lengthOpts = budgetSet
          ? affordableDayLengths(budget, entries, rates, { excludeEntryId: entry.id }).map(
              (opt) => ({
                value: opt.value,
                label: `${opt.label} (${money(costForDayLength(opt.value, rates), currency)})`,
              })
            )
          : [
              { value: '0.5', label: '0.5 day' },
              { value: '1', label: '1 day' },
            ];
        const current = String(entry.day_length ?? '1');
        if (!lengthOpts.some((o) => o.value === current)) {
          lengthOpts.unshift({
            value: current,
            label: `${current} day (current)`,
          });
        }
        const rowCost =
          entry.applied_rate != null
            ? Number(entry.applied_rate)
            : costForDayLength(entry.day_length, rates);
        const who = scheduleAddedByMeta(entry);

        return (
          <RowCard key={entry.id} $variant="saved">
            <RowHeader>
              <Badge $tone={who.tone} title={who.name ? `Added by ${who.name}` : undefined}>
                {who.label}
                {who.name ? ` · ${who.name}` : ''}
              </Badge>
              {!readOnly && (
                <RemoveIconButton
                  onClick={() => handleRemove(entry.id)}
                  disabled={saving}
                  title="Remove shoot row"
                />
              )}
            </RowHeader>
            <Grid $cols={3}>
              <Select
                label="Shoot Day Length"
                value={current}
                onValueChange={(v) => handleLengthChange(entry, v)}
                options={lengthOpts}
                disabled={readOnly || saving}
              />
              <Select
                label="City"
                value={entry.city || 'London'}
                onValueChange={(v) => handleFieldUpdate(entry, { city: v })}
                options={cityOptions}
                disabled={readOnly || saving}
              />
              <Input
                label="Preferred Shoot Date"
                type="date"
                value={toDateInputValue(entry.shoot_date)}
                onChange={(e) => handleFieldUpdate(entry, { shoot_date: e.target.value })}
                disabled={readOnly || saving}
              />
            </Grid>
            <Row style={{ marginTop: '0.75rem', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>
                Calculated cost: {money(rowCost, entry.applied_currency || currency)}
                {entry.shoot_date ? ` · ${formatDate(entry.shoot_date)}` : ''}
              </span>
            </Row>
          </RowCard>
        );
      })}

      {showDraftRow && (
        <RowCard $variant="draft">
          <Grid $cols={3}>
            <Select
              label="Shoot Day Length"
              required
              value={draftDayLength || ''}
              onValueChange={(v) => setDraft((d) => ({ ...d, day_length: v }))}
              options={draftOptions}
              disabled={!draftOptions.length || saving}
            />
            <Select
              label="City"
              required
              value={draft.city}
              onValueChange={(v) => setDraft((d) => ({ ...d, city: v }))}
              options={cityOptions}
              disabled={saving}
            />
            <Input
              label="Preferred Shoot Date"
              type="date"
              required
              value={draft.shoot_date}
              onChange={(e) => setDraft((d) => ({ ...d, shoot_date: e.target.value }))}
              disabled={saving}
            />
          </Grid>
          <Row style={{ marginTop: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>
              Calculated cost: {money(costForDayLength(draftDayLength, rates), currency)}
            </span>
            <AddRow style={{ marginTop: 0 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAdd}
                disabled={saving || !draftOptions.length}
                aria-label="Add shoot day"
                title="Add shoot row"
              >
                +
              </Button>
            </AddRow>
          </Row>
        </RowCard>
      )}

      {canAddMore && !draftOpen && (
        <AddRow>
          <Button
            type="button"
            variant="secondary"
            onClick={openDraft}
            disabled={saving || !draftOptions.length}
            aria-label="Add shoot day"
            title={budgetSet && !draftOptions.length ? 'Budget exhausted' : 'Add shoot row'}
          >
            +
          </Button>
        </AddRow>
      )}

      {!canAddMore && !readOnly && budgetSet && entries.length > 0 && (
        <SectionHint>
          Remaining budget ({money(remaining, currency)}) is below the lowest rate — plus is
          disabled.
        </SectionHint>
      )}

      {warning && <FieldWarn role="status">{warning}</FieldWarn>}
      {error && <FieldError role="alert">{error}</FieldError>}
    </Section>
  );
}
