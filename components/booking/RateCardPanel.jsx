'use client';

import styled from 'styled-components';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Switch';
import {
  hasBudgetCap,
  ratesFromBooking,
  remainingBudget,
  shootRowsCost,
} from '@/lib/rateCard';
import { formatCurrencyWhole } from '@/utils/format';

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[3]};
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Meta = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.4;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Fields = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[3]};
`;

const CheckWrap = styled.div`
  margin-top: ${({ theme }) => theme.space[3]};
`;

function money(n, currency = 'GBP') {
  return formatCurrencyWhole(n, currency);
}

/**
 * Left-rail rate card (admin editable rates; portal read-only summary).
 */
export function RateCardPanel({
  values = {},
  scheduleEntries = [],
  onChange,
  readOnly = false,
  editableRates = false,
  showExtraShots = true,
  extraShotsDisabled = false,
}) {
  const rates = ratesFromBooking(values);
  const currency = values.currency || 'GBP';
  const budgetSet = hasBudgetCap(values.budget);
  const spent = shootRowsCost(scheduleEntries, rates);
  const remaining = remainingBudget(values.budget, scheduleEntries, rates);

  return (
    <Card>
      <Title>Rate card</Title>
      <Meta>
        {rates.label}: {money(rates.fullDay, currency)} = 1 day ·{' '}
        {money(rates.halfDay, currency)} = 0.5 day
      </Meta>
      <Row>
        <span>
          Budget: <strong>{budgetSet ? money(values.budget, currency) : 'Not set'}</strong>
        </span>
      </Row>
      <Row>
        <span>
          Allocated: <strong>{money(spent, currency)}</strong>
        </span>
      </Row>
      <Row>
        <span>
          Remaining:{' '}
          <strong>{budgetSet ? money(remaining, currency) : '—'}</strong>
          {budgetSet && remaining < 0 ? ' — over budget' : ''}
        </span>
      </Row>

      {showExtraShots && (
        <CheckWrap>
          <Checkbox
            id="use-remaining-extra-shots"
            checked={!!values.use_remaining_for_extra_shots}
            disabled={readOnly || extraShotsDisabled}
            onCheckedChange={(v) => onChange?.('use_remaining_for_extra_shots', !!v)}
            label="Use remaining balance for extra shots"
          />
        </CheckWrap>
      )}

      {editableRates && !readOnly && (
        <Fields>
          <Input
            label="Rate card label"
            name="rate_card_label"
            value={values.rate_card_label || 'JCD Rates'}
            onChange={(e) => onChange?.('rate_card_label', e.target.value)}
          />
          <Input
            label="0.5 day rate"
            name="half_day_rate"
            type="number"
            step="0.01"
            min="0"
            value={values.half_day_rate ?? 640}
            onChange={(e) =>
              onChange?.('half_day_rate', e.target.value === '' ? null : e.target.value)
            }
          />
          <Input
            label="1 day rate"
            name="full_day_rate"
            type="number"
            step="0.01"
            min="0"
            value={values.full_day_rate ?? 1040}
            onChange={(e) =>
              onChange?.('full_day_rate', e.target.value === '' ? null : e.target.value)
            }
          />
        </Fields>
      )}
    </Card>
  );
}

export default RateCardPanel;
