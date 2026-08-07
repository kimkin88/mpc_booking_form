'use client';

import styled from 'styled-components';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Switch';
import {
  hasBudgetCap,
  RATE_CARD_PACKAGES,
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

const Meta = styled.div`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.45;
`;

const MetaTitle = styled.div`
  margin-bottom: 0.35rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const PackageLine = styled.div`
  & + & {
    margin-top: 0.2rem;
  }
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
  const remainingPositive = budgetSet && Number.isFinite(remaining) && remaining > 0;
  const showExtraShotsCheckbox =
    showExtraShots && (remainingPositive || !!values.use_remaining_for_extra_shots);

  return (
    <Card>
      <Title>Rate card</Title>
      <Meta>
        <MetaTitle>{rates.label}</MetaTitle>
        {RATE_CARD_PACKAGES.map((pkg) => (
          <PackageLine key={pkg.value}>
            {money(rates[pkg.rateKey], currency)} = {pkg.label}
          </PackageLine>
        ))}
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

      {showExtraShotsCheckbox && (
        <CheckWrap>
          <Checkbox
            id="use-remaining-extra-shots"
            checked={!!values.use_remaining_for_extra_shots}
            disabled={readOnly || extraShotsDisabled || !remainingPositive}
            onCheckedChange={(v) => onChange?.('use_remaining_for_extra_shots', !!v)}
            label={
              remainingPositive
                ? `Use remaining balance (${money(remaining, currency)}) for extra shots`
                : 'Use remaining balance for extra shots'
            }
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
            label="0.5 Day - 5 fully retouched images"
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
            label="1 Day - 10 fully retouched images"
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
