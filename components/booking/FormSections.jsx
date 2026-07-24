'use client';

import { useMemo, useState, isValidElement, cloneElement } from 'react';
import styled from 'styled-components';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CURRENCIES, FORMAT_TYPES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { Section, SectionTitle, SectionHint, Grid, Row, FieldAddon } from '@/components/layout/PageHeader';
import {
  hasBudgetCap,
  ratesFromBooking,
  remainingBudget,
  shootRowsCost,
} from '@/lib/rateCard';
import { calculateDeliveryDate, effectiveDeliveryDate } from '@/lib/deliveryDate';
import { calculateInCharge, calculatePortalLockDate } from '@/lib/inCharge';
import { formatDate, formatCurrencyWhole } from '@/utils/format';

const EmailChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ChipRemove = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 1rem;

  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const Muted = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const NestedFiles = styled.div`
  margin-top: ${({ theme }) => theme.space[4]};
`;

const CalcPanel = styled.div`
  margin-top: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgMuted};
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const CalcRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  align-items: baseline;

  strong {
    font-weight: 600;
  }

  span.meta {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Warn = styled.p`
  margin: 0.25rem 0 0;
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isShown(fieldHidden, key) {
  return !fieldHidden?.[key];
}

function anyShown(fieldHidden, keys) {
  return keys.some((key) => isShown(fieldHidden, key));
}

function money(n, currency = 'GBP') {
  return formatCurrencyWhole(n, currency);
}

function CcEmailsField({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldRequired = {},
}) {
  const [ccDraft, setCcDraft] = useState('');
  const [ccError, setCcError] = useState('');
  const emails = Array.isArray(values.cc_emails) ? values.cc_emails : [];
  const canEditCc = !readOnly && !fieldDisabled.cc_emails;

  const addCc = () => {
    setCcError('');
    const email = ccDraft.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setCcError('Invalid email address');
      return;
    }
    if (emails.includes(email)) {
      setCcError('Recipient already added');
      return;
    }
    onChange('cc_emails', [...emails, email]);
    setCcDraft('');
  };

  const removeCc = (email) => {
    onChange(
      'cc_emails',
      emails.filter((item) => item !== email)
    );
  };

  return (
    <div>
      <label
        htmlFor="cc-email-input"
        style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
      >
        Team Email / CC Emails{fieldRequired.cc_emails ? ' *' : ''}
      </label>

      {emails.length > 0 && (
        <Row style={{ marginBottom: '0.75rem' }}>
          {emails.map((email) => (
            <EmailChip key={email}>
              {email}
              {canEditCc && (
                <ChipRemove type="button" aria-label={`Remove ${email}`} onClick={() => removeCc(email)}>
                  ×
                </ChipRemove>
              )}
            </EmailChip>
          ))}
        </Row>
      )}

      {emails.length === 0 && <Muted>No team / CC recipients yet.</Muted>}

      {canEditCc && (
        <Row style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              id="cc-email-input"
              label=""
              type="email"
              value={ccDraft}
              onChange={(e) => {
                setCcDraft(e.target.value);
                setCcError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCc();
                }
              }}
              placeholder="name@example.com"
              error={ccError || errors.cc_emails}
              hint="Press Enter or click Add"
            />
          </div>
          <FieldAddon>
            <Button type="button" variant="secondary" onClick={addCc}>
              Add
            </Button>
          </FieldAddon>
        </Row>
      )}
    </div>
  );
}

/** Section 1 — Brand and commercial details */
export function CampaignDetailsSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  scheduleEntries = [],
  poFiles = null,
  showRateCard = false,
  showAdminOwnership = false,
  id,
}) {
  const keys = ['brand', 'campaign_name', 'city_market', 'sb_number', 'budget', 'currency', 'po_number'];
  if (!anyShown(fieldHidden, keys) && !poFiles && !showAdminOwnership) return null;

  const rates = ratesFromBooking(values);
  const budgetSet = hasBudgetCap(values.budget);
  const spent = shootRowsCost(scheduleEntries, rates);
  const remaining = remainingBudget(values.budget, scheduleEntries, rates);

  return (
    <Section id={id}>
      <SectionTitle>Brand and commercial details</SectionTitle>
      <Grid $cols={2}>
        {isShown(fieldHidden, 'brand') && (
          <Input
            label="Brand"
            name="brand"
            required={!!fieldRequired.brand}
            value={values.brand || ''}
            onChange={(e) => onChange('brand', e.target.value)}
            disabled={readOnly || fieldDisabled.brand}
            error={errors.brand}
            placeholder="Nike"
          />
        )}
        {isShown(fieldHidden, 'campaign_name') && (
          <Input
            label="Campaign"
            name="campaign_name"
            required={!!fieldRequired.campaign_name}
            value={values.campaign_name || ''}
            onChange={(e) => onChange('campaign_name', e.target.value)}
            disabled={readOnly || fieldDisabled.campaign_name}
            error={errors.campaign_name}
          />
        )}
        {isShown(fieldHidden, 'city_market') && (
          <Input
            label="City / Market"
            name="city_market"
            required={!!fieldRequired.city_market}
            value={values.city_market || ''}
            onChange={(e) => onChange('city_market', e.target.value)}
            disabled={readOnly || fieldDisabled.city_market}
            error={errors.city_market}
            placeholder="London"
          />
        )}
        {isShown(fieldHidden, 'sb_number') && (
          <Input
            label="Reference Number"
            name="sb_number"
            required
            value={values.sb_number || ''}
            onChange={(e) => onChange('sb_number', e.target.value)}
            error={errors.sb_number}
            disabled={readOnly || fieldDisabled.sb_number}
            placeholder="CAM-00123"
          />
        )}
        {isShown(fieldHidden, 'po_number') && (
          poFiles && isValidElement(poFiles) ? (
            cloneElement(poFiles, {
              poNumberField: (
                <Input
                  label="PO Number"
                  name="po_number"
                  required={!!fieldRequired.po_number}
                  value={values.po_number || ''}
                  onChange={(e) => onChange('po_number', e.target.value)}
                  error={errors.po_number}
                  disabled={readOnly || fieldDisabled.po_number}
                  placeholder="PO-12345"
                />
              ),
            })
          ) : (
            <Input
              label="PO Number"
              name="po_number"
              required={!!fieldRequired.po_number}
              value={values.po_number || ''}
              onChange={(e) => onChange('po_number', e.target.value)}
              error={errors.po_number}
              disabled={readOnly || fieldDisabled.po_number}
              placeholder="PO-12345"
            />
          )
        )}
        {!isShown(fieldHidden, 'po_number') && poFiles ? <div>{poFiles}</div> : null}
      </Grid>
      <Grid $cols={2} style={{ marginTop: '1rem' }}>
        {isShown(fieldHidden, 'budget') && (
          <Input
            label="Budget"
            name="budget"
            type="number"
            step="0.01"
            min="0"
            required={!!values.budget_required || !!fieldRequired.budget}
            value={values.budget ?? ''}
            onChange={(e) => onChange('budget', e.target.value === '' ? null : e.target.value)}
            error={errors.budget}
            disabled={readOnly || fieldDisabled.budget}
            placeholder="1680"
          />
        )}
        {isShown(fieldHidden, 'currency') && (
          <Select
            label="Currency"
            name="currency"
            required={!!fieldRequired.currency}
            value={values.currency || 'GBP'}
            onValueChange={(v) => onChange('currency', v)}
            options={CURRENCIES}
            disabled={readOnly || fieldDisabled.currency}
            error={errors.currency}
          />
        )}
      </Grid>

      {isShown(fieldHidden, 'budget') && (
        <CalcPanel>
          <CalcRow>
            <span>
              Rate card: <strong>{rates.label}</strong>
            </span>
            <span className="meta">
              1 day {money(rates.fullDay, values.currency)} · 0.5 day{' '}
              {money(rates.halfDay, values.currency)}
            </span>
          </CalcRow>
          <CalcRow>
            <span>
              Shoot cost allocated: <strong>{money(spent, values.currency)}</strong>
            </span>
            <span>
              Remaining shoot budget:{' '}
              <strong>{budgetSet ? money(remaining, values.currency) : 'Not set'}</strong>
              {budgetSet && remaining < 0 ? ' — over budget' : ''}
            </span>
          </CalcRow>
        </CalcPanel>
      )}

      {showRateCard && (
        <Grid $cols={3} style={{ marginTop: '1rem' }}>
          <Input
            label="Rate card label"
            name="rate_card_label"
            value={values.rate_card_label || 'JCD Rates'}
            onChange={(e) => onChange('rate_card_label', e.target.value)}
            disabled={readOnly}
            hint="Configurable per client"
          />
          <Input
            label="0.5 day rate"
            name="half_day_rate"
            type="number"
            step="0.01"
            min="0"
            value={values.half_day_rate ?? 640}
            onChange={(e) => onChange('half_day_rate', e.target.value === '' ? null : e.target.value)}
            disabled={readOnly}
          />
          <Input
            label="1 day rate"
            name="full_day_rate"
            type="number"
            step="0.01"
            min="0"
            value={values.full_day_rate ?? 1040}
            onChange={(e) => onChange('full_day_rate', e.target.value === '' ? null : e.target.value)}
            disabled={readOnly}
          />
        </Grid>
      )}

      {showAdminOwnership && (
        <Grid $cols={2} style={{ marginTop: '1rem' }}>
          <Input
            label="MPC Booking Owner"
            name="mpc_owner_name"
            value={values.mpc_owner_name || ''}
            onChange={(e) => onChange('mpc_owner_name', e.target.value)}
            disabled={readOnly}
          />
          <Input
            label="MPC Backup Owner"
            name="mpc_backup_owner_name"
            value={values.mpc_backup_owner_name || ''}
            onChange={(e) => onChange('mpc_backup_owner_name', e.target.value)}
            disabled={readOnly}
          />
        </Grid>
      )}
    </Section>
  );
}

/** Section 2 — Client and JCD contacts */
export function ContactInformationSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  id,
}) {
  const keys = [
    'client_name',
    'client_email',
    'cc_emails',
    'jcd_contact_name',
    'jcd_contact_email',
  ];
  if (!anyShown(fieldHidden, keys)) return null;

  const nameRequired = fieldRequired.client_name !== false;
  const emailRequired = fieldRequired.client_email !== false;

  return (
    <Section id={id}>
      <SectionTitle>Client and JCD contacts</SectionTitle>
      <Grid $cols={2}>
        {isShown(fieldHidden, 'client_name') && (
          <Input
            label="Name"
            name="client_name"
            required={nameRequired || !!fieldRequired.client_name}
            value={values.client_name || ''}
            onChange={(e) => onChange('client_name', e.target.value)}
            disabled={readOnly || fieldDisabled.client_name}
            error={errors.client_name}
          />
        )}
        {isShown(fieldHidden, 'client_email') && (
          <Input
            label="Email"
            name="client_email"
            type="email"
            required={emailRequired || !!fieldRequired.client_email}
            value={values.client_email || ''}
            onChange={(e) => onChange('client_email', e.target.value)}
            error={errors.client_email}
            disabled={readOnly || fieldDisabled.client_email}
          />
        )}
      </Grid>

      {isShown(fieldHidden, 'cc_emails') && (
        <div style={{ marginTop: '1.25rem' }}>
          <CcEmailsField
            values={values}
            onChange={onChange}
            errors={errors}
            readOnly={readOnly}
            fieldDisabled={fieldDisabled}
            fieldRequired={fieldRequired}
          />
        </div>
      )}

      <Grid $cols={2} style={{ marginTop: '1.25rem' }}>
        {isShown(fieldHidden, 'jcd_contact_name') && (
          <Input
            label="JCD Contact Name"
            name="jcd_contact_name"
            required={!!fieldRequired.jcd_contact_name}
            value={values.jcd_contact_name || ''}
            onChange={(e) => onChange('jcd_contact_name', e.target.value)}
            disabled={readOnly || fieldDisabled.jcd_contact_name}
            error={errors.jcd_contact_name}
          />
        )}
        {isShown(fieldHidden, 'jcd_contact_email') && (
          <Input
            label="JCD Contact Email"
            name="jcd_contact_email"
            type="email"
            required={!!fieldRequired.jcd_contact_email}
            value={values.jcd_contact_email || ''}
            onChange={(e) => onChange('jcd_contact_email', e.target.value)}
            error={errors.jcd_contact_email}
            disabled={readOnly || fieldDisabled.jcd_contact_email}
          />
        )}
      </Grid>
    </Section>
  );
}

/** Section 4 — Format, campaign dates, files, notes + calculated delivery / in-charge */
export function DeliverablesSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  filesSlot = null,
  showAdminOverride = false,
  id,
}) {
  const keys = ['format_type', 'campaign_start', 'campaign_end', 'client_notes', 'files'];
  const formatType = values.format_type || '';
  const isKnownFormat = FORMAT_TYPES.some((f) => f.value === formatType);
  const isOther = formatType === 'Other' || (formatType && !isKnownFormat);

  const delivery = useMemo(
    () => calculateDeliveryDate(formatType, values.campaign_start),
    [formatType, values.campaign_start]
  );
  const effective = useMemo(() => effectiveDeliveryDate(values), [values]);
  const inCharge = useMemo(
    () => calculateInCharge(values.campaign_start),
    [values.campaign_start]
  );
  const lockInfo = useMemo(
    () => calculatePortalLockDate(values.campaign_start),
    [values.campaign_start]
  );

  if (!anyShown(fieldHidden, keys) && !filesSlot) return null;

  const formatRequired = fieldRequired.format_type !== false;
  const startRequired = fieldRequired.campaign_start !== false;
  const endRequired = fieldRequired.campaign_end !== false;

  return (
    <Section id={id}>
      <SectionTitle>Format, campaign dates, files and notes</SectionTitle>
      <Grid $cols={2}>
        {isShown(fieldHidden, 'format_type') && (
          <Select
            label="Format Type"
            name="format_type"
            required={formatRequired || !!fieldRequired.format_type}
            value={isKnownFormat ? formatType : formatType ? 'Other' : ''}
            onValueChange={(v) => {
              if (v === 'Other') {
                onChange('format_type', 'Other');
                if (!values.format_type_other) onChange('format_type_other', '');
              } else {
                onChange('format_type', v);
                onChange('format_type_other', null);
              }
            }}
            options={FORMAT_TYPES}
            disabled={readOnly || fieldDisabled.format_type}
            error={errors.format_type}
            placeholder="Select format"
          />
        )}
        {isShown(fieldHidden, 'format_type') && isOther && (
          <Input
            label="If other, please specify"
            name="format_type_other"
            required
            value={values.format_type_other || (formatType !== 'Other' ? formatType : '')}
            onChange={(e) => {
              onChange('format_type_other', e.target.value);
              onChange('format_type', 'Other');
            }}
            disabled={readOnly || fieldDisabled.format_type}
            error={errors.format_type_other}
            placeholder="Describe format"
            hint="Required for Other — delivery date stays TBC until MPC confirms"
          />
        )}
      </Grid>

      {(isShown(fieldHidden, 'campaign_start') || isShown(fieldHidden, 'campaign_end')) && (
        <Grid $cols={2} style={{ marginTop: '1rem' }}>
          {isShown(fieldHidden, 'campaign_start') && (
            <Input
              label="Campaign Start Date"
              name="campaign_start"
              type="date"
              required={startRequired || !!fieldRequired.campaign_start}
              value={values.campaign_start || ''}
              onChange={(e) => onChange('campaign_start', e.target.value || null)}
              disabled={readOnly || fieldDisabled.campaign_start}
              error={errors.campaign_start}
            />
          )}
          {isShown(fieldHidden, 'campaign_end') && (
            <Input
              label="Campaign End Date"
              name="campaign_end"
              type="date"
              required={endRequired || !!fieldRequired.campaign_end}
              value={values.campaign_end || ''}
              onChange={(e) => onChange('campaign_end', e.target.value || null)}
              disabled={readOnly || fieldDisabled.campaign_end}
              error={errors.campaign_end}
            />
          )}
        </Grid>
      )}

      <CalcPanel>
        <CalcRow>
          <span>
            Delivery due date:{' '}
            <strong>
              {effective.status === 'override'
                ? formatDate(effective.date)
                : delivery.status === 'calculated'
                  ? formatDate(delivery.date)
                  : delivery.status === 'tbc'
                    ? 'TBC'
                    : '—'}
            </strong>
          </span>
          <span className="meta">{effective.status === 'override' ? effective.label : delivery.label}</span>
        </CalcRow>
        <CalcRow>
          <span>
            In-Charge Reference:{' '}
            <strong>{inCharge.reference || values.in_charge_reference || '—'}</strong>
          </span>
          {inCharge.periodStart && (
            <span className="meta">
              {formatDate(inCharge.periodStart)} → {formatDate(inCharge.periodEnd)}
            </span>
          )}
        </CalcRow>
        <CalcRow>
          <span>
            Portal lock date:{' '}
            <strong>
              {lockInfo.lockDate
                ? formatDate(lockInfo.lockDate)
                : values.portal_lock_date
                  ? formatDate(values.portal_lock_date)
                  : '—'}
            </strong>
          </span>
          <span className="meta">7 days before in-charge period start</span>
        </CalcRow>
        {inCharge.warning && <Warn>{inCharge.warning}</Warn>}
      </CalcPanel>

      {showAdminOverride && (
        <Grid $cols={2} style={{ marginTop: '1rem' }}>
          <Input
            label="Delivery date override"
            name="delivery_date_override"
            type="date"
            value={values.delivery_date_override || ''}
            onChange={(e) => onChange('delivery_date_override', e.target.value || null)}
            disabled={readOnly}
            hint="Optional admin override — leave blank to use calculated date"
          />
        </Grid>
      )}

      {filesSlot && (
        <NestedFiles>
          <SectionHint style={{ marginBottom: '0.75rem' }}>
            Media Plan, Site Lists, and Creatives — multiple files per category (max{' '}
            {MAX_FILE_SIZE_MB}MB each).
          </SectionHint>
          {filesSlot}
        </NestedFiles>
      )}

      {isShown(fieldHidden, 'client_notes') && (
        <div style={{ marginTop: '1.25rem' }}>
          <Textarea
            label="Additional Notes"
            name="client_notes"
            required={!!fieldRequired.client_notes}
            value={values.client_notes || ''}
            onChange={(e) => onChange('client_notes', e.target.value)}
            disabled={readOnly || fieldDisabled.client_notes}
            placeholder="Any extra context for the booking"
          />
        </div>
      )}
    </Section>
  );
}

export function InternalNotesSection({ values, onChange, readOnly = false }) {
  return (
    <Section>
      <SectionTitle>Internal Notes</SectionTitle>
      <SectionHint>
        Admin only — never shown in the client portal. Supports plain text and line breaks.
      </SectionHint>
      <Textarea
        label="Internal Notes"
        name="internal_notes"
        value={values.internal_notes || ''}
        onChange={(e) => onChange('internal_notes', e.target.value)}
        disabled={readOnly}
      />
    </Section>
  );
}
