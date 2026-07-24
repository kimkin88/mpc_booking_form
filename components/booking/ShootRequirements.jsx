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

const emptyDraft = (rates) => ({
  day_length: '1',
  city: 'London',
  shoot_date: '',
  // default to full day when affordable, else half
  ...(rates ? {} : {}),
});

function money(n, currency = 'GBP') {
  return formatCurrencyWhole(n, currency);
}

function rowKey(row) {
  return `${Number(row.day_length)}|${row.city || ''}|${toDateInputValue(row.shoot_date)}`;
}

/**
 * Section 3 — Shoot requirements
 * Always shows one row (draft when empty). Plus adds more when budget allows.
 */
export function ShootRequirementsSection({
  booking,
  entries = [],
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
  id,
}) {
  const rates = useMemo(() => ratesFromBooking(booking), [booking]);
  const budget = booking?.budget;
  const currency = booking?.currency || 'GBP';

  const [draft, setDraft] = useState(() => emptyDraft());
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);

  const spent = shootRowsCost(entries, rates);
  const remaining = remainingBudget(budget, entries, rates);
  const budgetSet = hasBudgetCap(budget);
  const canAddMore = !readOnly && canAddShootRow(budget, entries, rates);
  // Always show draft row when empty; when entries exist, show + only if budget allows
  const showDraftRow = !readOnly && (entries.length === 0 || canAddMore);

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

  const cityOptions = MARKET_CITIES.map((c) => ({ value: c, label: c }));

  const checkDuplicate = (candidate, excludeId = null) => {
    const key = rowKey(candidate);
    return entries.some((e) => e.id !== excludeId && rowKey(e) === key);
  };

  const handleAdd = async () => {
    setError('');
    setWarning('');
    if (!draft.day_length) {
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
      if (!affordable.some((o) => o.value === String(draft.day_length))) {
        setError('This day length would exceed the remaining budget');
        return;
      }
    }
    if (checkDuplicate(draft)) {
      setWarning('A shoot row with the same length, city, and date already exists.');
    }

    const appliedRate = costForDayLength(draft.day_length, rates);
    setSaving(true);
    try {
      await onAdd({
        shoot_date: draft.shoot_date,
        day_length: Number(draft.day_length),
        city: draft.city,
        format: 'Shoot',
        applied_rate: appliedRate,
        applied_currency: currency,
      });
      setDraft(emptyDraft());
      setWarning('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
    if (entries.length <= 1) {
      setError('At least one shoot row must remain');
      return;
    }
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
        Starts with one shoot row. {rates.label}: {money(rates.fullDay, currency)} = 1 day ·{' '}
        {money(rates.halfDay, currency)} = 0.5 day. Use + to add another row when remaining budget
        allows.
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

        return (
          <RowCard key={entry.id} $variant="saved">
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
              {!readOnly && (
                <RemoveIconButton
                  onClick={() => handleRemove(entry.id)}
                  disabled={saving || entries.length <= 1}
                  title={
                    entries.length <= 1
                      ? 'At least one shoot row must remain'
                      : 'Remove shoot row'
                  }
                />
              )}
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
              value={
                draftOptions.some((o) => o.value === draft.day_length)
                  ? draft.day_length
                  : draftOptions[0]?.value || ''
              }
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
              Calculated cost:{' '}
              {money(costForDayLength(draft.day_length || draftOptions[0]?.value, rates), currency)}
            </span>
            <AddRow style={{ marginTop: 0 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAdd}
                disabled={saving || !draftOptions.length}
                aria-label={entries.length === 0 ? 'Save shoot row' : 'Add shoot day'}
                title={
                  entries.length === 0
                    ? 'Save this shoot row'
                    : canAddMore
                      ? 'Add another shoot row'
                      : 'Budget exhausted'
                }
              >
                {entries.length === 0 ? 'Save row' : '+'}
              </Button>
            </AddRow>
          </Row>
        </RowCard>
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
