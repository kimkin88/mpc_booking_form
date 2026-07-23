'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { CURRENCIES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { Section, SectionTitle, SectionHint, Grid, Row, FieldAddon } from '@/components/layout/PageHeader';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isShown(fieldHidden, key) {
  return !fieldHidden?.[key];
}

function anyShown(fieldHidden, keys) {
  return keys.some((key) => isShown(fieldHidden, key));
}

export function ReferenceBudgetSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  id,
}) {
  if (!anyShown(fieldHidden, ['sb_number', 'currency', 'budget'])) return null;

  return (
    <Section id={id}>
      <SectionTitle>Reference & Budget</SectionTitle>
      <SectionHint>
        SB Number is required and must be unique. Currency is selected from a list. Budget accepts
        numeric values only and may be marked required by admin.
      </SectionHint>
      <Grid $cols={3}>
        {isShown(fieldHidden, 'sb_number') && (
          <Input
            label="SB Number"
            name="sb_number"
            required
            value={values.sb_number || ''}
            onChange={(e) => onChange('sb_number', e.target.value)}
            error={errors.sb_number}
            disabled={readOnly || fieldDisabled.sb_number}
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
            hint={
              values.budget_required || fieldRequired.budget
                ? 'Required for this booking'
                : 'Optional'
            }
          />
        )}
      </Grid>
      {!readOnly && !fieldDisabled.budget_required && (
        <div style={{ marginTop: '1rem' }}>
          <Switch
            id="budget_required"
            label="Budget required"
            checked={!!values.budget_required}
            onCheckedChange={(v) => onChange('budget_required', v)}
            description="When enabled, Budget must be completed before submission."
          />
        </div>
      )}
    </Section>
  );
}

export function ClientCampaignSection({
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
    'campaign_name',
    'city_market',
    'client_company',
    'client_name',
    'client_email',
  ];
  if (!anyShown(fieldHidden, keys)) return null;

  return (
    <Section id={id}>
      <SectionTitle>Client & Campaign</SectionTitle>
      <SectionHint>
        Campaign Name and Client Company are searchable from the admin bookings list.
      </SectionHint>
      <Grid>
        {isShown(fieldHidden, 'campaign_name') && (
          <Input
            label="Campaign Name"
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
          />
        )}
        {isShown(fieldHidden, 'client_company') && (
          <Input
            label="Client Company"
            name="client_company"
            required={!!fieldRequired.client_company}
            value={values.client_company || ''}
            onChange={(e) => onChange('client_company', e.target.value)}
            disabled={readOnly || fieldDisabled.client_company}
            error={errors.client_company}
          />
        )}
        {isShown(fieldHidden, 'client_name') && (
          <Input
            label="JCD Independent Client Name"
            name="client_name"
            required={!!fieldRequired.client_name}
            value={values.client_name || ''}
            onChange={(e) => onChange('client_name', e.target.value)}
            disabled={readOnly || fieldDisabled.client_name}
            error={errors.client_name}
          />
        )}
        {isShown(fieldHidden, 'client_email') && (
          <Input
            label="JCD Independent Client Email"
            name="client_email"
            type="email"
            required={!!fieldRequired.client_email}
            value={values.client_email || ''}
            onChange={(e) => onChange('client_email', e.target.value)}
            error={errors.client_email}
            disabled={readOnly || fieldDisabled.client_email}
          />
        )}
      </Grid>
    </Section>
  );
}

export function JcdContactSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  id,
}) {
  const [ccDraft, setCcDraft] = useState('');
  const [ccError, setCcError] = useState('');
  const emails = Array.isArray(values.cc_emails) ? values.cc_emails : [];
  const canEditCc = !readOnly && !fieldDisabled.cc_emails;

  if (!anyShown(fieldHidden, ['jcd_contact_name', 'jcd_contact_email', 'cc_emails'])) {
    return null;
  }

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
    <Section id={id}>
      <SectionTitle>JCD Contact</SectionTitle>
      <SectionHint>
        Add or remove multiple CC email recipients. All email addresses are validated.
      </SectionHint>
      <Grid>
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

      {isShown(fieldHidden, 'cc_emails') && (
        <div style={{ marginTop: '1.25rem' }}>
          <label
            htmlFor="cc-email-input"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
          >
            CC Email{fieldRequired.cc_emails ? ' *' : ''}
          </label>

          {emails.length > 0 && (
            <Row style={{ marginBottom: '0.75rem' }}>
              {emails.map((email) => (
                <EmailChip key={email}>
                  {email}
                  {canEditCc && (
                    <ChipRemove
                      type="button"
                      aria-label={`Remove ${email}`}
                      onClick={() => removeCc(email)}
                    >
                      ×
                    </ChipRemove>
                  )}
                </EmailChip>
              ))}
            </Row>
          )}

          {emails.length === 0 && <Muted>No CC recipients yet.</Muted>}

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
                  hint="Press Enter or click Add recipient"
                />
              </div>
              <FieldAddon>
                <Button type="button" variant="secondary" onClick={addCc}>
                  Add recipient
                </Button>
              </FieldAddon>
            </Row>
          )}
        </div>
      )}
    </Section>
  );
}

export function InvoiceSection({
  values,
  onChange,
  errors = {},
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  allowPoOverride = true,
  id,
}) {
  const keys = [
    'po_required',
    'po_received',
    'po_number',
    'payment_terms',
    'billing_address',
    'invoice_notes',
  ];
  if (!anyShown(fieldHidden, keys)) return null;

  const handlePoRequired = (enabled) => {
    onChange('po_required', enabled);
    if (!enabled && values.po_received) {
      onChange('po_received', false);
    }
  };

  const handlePoReceived = (enabled) => {
    if (enabled && !values.po_required && !allowPoOverride) return;
    onChange('po_received', enabled);
  };

  return (
    <Section id={id}>
      <SectionTitle>Invoice & Purchase Order</SectionTitle>
      <SectionHint>
        If PO Required is enabled, PO Number is required before the booking can be marked complete.
        Attach purchase order or invoice files in Files & Assets (max {MAX_FILE_SIZE_MB}MB per
        file).
      </SectionHint>
      <Grid>
        {isShown(fieldHidden, 'po_required') && (
          <Switch
            id="po_required"
            label="PO Required"
            checked={!!values.po_required}
            onCheckedChange={handlePoRequired}
            disabled={readOnly || fieldDisabled.po_required}
          />
        )}
        {isShown(fieldHidden, 'po_received') && (
          <Switch
            id="po_received"
            label="PO Received"
            checked={!!values.po_received}
            onCheckedChange={handlePoReceived}
            disabled={
              readOnly ||
              fieldDisabled.po_received ||
              (!values.po_required && !allowPoOverride)
            }
            description={
              !values.po_required && !allowPoOverride
                ? 'Enable PO Required first'
                : allowPoOverride && !values.po_required
                  ? 'Admin override allowed when PO Required is off'
                  : undefined
            }
          />
        )}
        {isShown(fieldHidden, 'po_number') && (
          <Input
            label="PO Number"
            name="po_number"
            required={!!values.po_required || !!fieldRequired.po_number}
            value={values.po_number || ''}
            onChange={(e) => onChange('po_number', e.target.value)}
            error={errors.po_number}
            disabled={readOnly || fieldDisabled.po_number}
            hint={values.po_required ? 'Required when PO Required is enabled' : undefined}
          />
        )}
        {isShown(fieldHidden, 'payment_terms') && (
          <Input
            label="Payment Terms"
            name="payment_terms"
            required={!!fieldRequired.payment_terms}
            value={values.payment_terms || ''}
            onChange={(e) => onChange('payment_terms', e.target.value)}
            disabled={readOnly || fieldDisabled.payment_terms}
            error={errors.payment_terms}
          />
        )}
        {isShown(fieldHidden, 'billing_address') && (
          <Textarea
            label="Billing Address"
            name="billing_address"
            required={!!fieldRequired.billing_address}
            value={values.billing_address || ''}
            onChange={(e) => onChange('billing_address', e.target.value)}
            disabled={readOnly || fieldDisabled.billing_address}
            error={errors.billing_address}
          />
        )}
        {isShown(fieldHidden, 'invoice_notes') && (
          <Textarea
            label="Miscellaneous Invoice Notes"
            name="invoice_notes"
            required={!!fieldRequired.invoice_notes}
            value={values.invoice_notes || ''}
            onChange={(e) => onChange('invoice_notes', e.target.value)}
            disabled={readOnly || fieldDisabled.invoice_notes}
            error={errors.invoice_notes}
          />
        )}
      </Grid>
    </Section>
  );
}

export function ClientNotesSection({
  values,
  onChange,
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
  id,
}) {
  if (!isShown(fieldHidden, 'client_notes')) return null;

  return (
    <Section id={id}>
      <SectionTitle>Client Notes</SectionTitle>
      <SectionHint>Client-facing notes and comments where permitted.</SectionHint>
      <Textarea
        label="Client Notes"
        name="client_notes"
        required={!!fieldRequired.client_notes}
        value={values.client_notes || ''}
        onChange={(e) => onChange('client_notes', e.target.value)}
        disabled={readOnly || fieldDisabled.client_notes}
      />
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

/** @deprecated Prefer ClientNotesSection / InternalNotesSection */
export function NotesSection({
  values,
  onChange,
  showInternal = true,
  showClient = true,
  readOnly = false,
  fieldDisabled = {},
  fieldHidden = {},
  fieldRequired = {},
}) {
  return (
    <>
      {showClient && (
        <ClientNotesSection
          values={values}
          onChange={onChange}
          readOnly={readOnly}
          fieldDisabled={fieldDisabled}
          fieldHidden={fieldHidden}
          fieldRequired={fieldRequired}
        />
      )}
      {showInternal && (
        <InternalNotesSection values={values} onChange={onChange} readOnly={readOnly} />
      )}
    </>
  );
}
