'use client';

import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/apiClient';
import { formatCurrency } from '@/utils/format';

const FIELD_META = [
  { key: 'brand', label: 'Brand' },
  { key: 'campaign_name', label: 'Campaign' },
  { key: 'client_company', label: 'Client company' },
  { key: 'city_market', label: 'City / market' },
  { key: 'currency', label: 'Currency' },
  { key: 'budget', label: 'Budget (shoot)' },
  { key: 'format_type', label: 'Format type' },
  { key: 'campaign_start', label: 'Campaign start' },
  { key: 'campaign_end', label: 'Campaign end' },
  { key: 'client_notes', label: 'Additional notes' },
  { key: 'internal_notes', label: 'Internal notes' },
];

/** Prefer these form fields when present (checked by default if empty). */
const MAX_SHOOT_BUDGET = 20000;
const Drop = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  min-height: 8rem;
  padding: ${({ theme }) => theme.space[5]};
  border: 1.5px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgMuted};
  cursor: pointer;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  input {
    display: none;
  }
`;

const Summary = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  margin: ${({ theme }) => theme.space[4]} 0;
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primaryMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const WarnList = styled.ul`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  padding-left: 1.1rem;
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FieldList = styled.div`
  display: grid;
  gap: 0.35rem;
  max-height: 16rem;
  overflow: auto;
  margin-bottom: ${({ theme }) => theme.space[3]};
`;

const FieldRow = styled.label`
  display: grid;
  grid-template-columns: auto 9rem 1fr;
  gap: ${({ theme }) => theme.space[3]};
  align-items: start;
  padding: 0.45rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid transparent;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }

  &[data-disabled='true'] {
    opacity: 0.45;
    cursor: not-allowed;
  }

  span.label {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  span.value {
    color: ${({ theme }) => theme.colors.text};
    word-break: break-word;
    white-space: pre-wrap;
  }
`;

const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const DateChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.35rem 0 0.75rem;
`;

const DateChip = styled.span`
  display: inline-flex;
  padding: 0.2rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text};
`;

const Check = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
`;

function displayValue(key, value, currency = 'GBP') {
  if (value == null || value === '') return null;
  if (key === 'budget') return formatCurrency(value, currency || 'GBP');
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function hasValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Admin dialog: parse Excel media plan / MPC brief and autofill booking fields.
 *
 * @param {'fields' | 'full'} mode
 *   fields = only booking scalar fields (new booking)
 *   full = also sites + optional schedule (existing booking)
 */
export function DocumentImportDialog({
  open,
  onOpenChange,
  mode = 'full',
  currentValues = {},
  bookingId = null,
  existingSchedule = [],
  onApplyFields,
  onApplied,
}) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState({});
  const [overwrite, setOverwrite] = useState(true);
  const [addSites, setAddSites] = useState(true);
  const [addSchedule, setAddSchedule] = useState(true);
  const [useAi, setUseAi] = useState(false);

  const reset = () => {
    setParsing(false);
    setApplying(false);
    setParsed(null);
    setSheetName('');
    setFile(null);
    setSelected({});
    setOverwrite(true);
    setAddSites(true);
    setAddSchedule(true);
    setUseAi(true);
  };

  const close = (next) => {
    if (!next) reset();
    onOpenChange?.(next);
  };

  const availableFields = useMemo(() => {
    if (!parsed?.fields) return [];
    return FIELD_META.filter((f) => hasValue(parsed.fields[f.key]));
  }, [parsed]);

  const runParse = async (nextFile, nextSheet) => {
    if (!nextFile) return;
    setParsing(true);
    try {
      const body = new FormData();
      body.append('file', nextFile);
      if (nextSheet) body.append('sheetName', nextSheet);
      body.append('useAi', useAi ? '1' : '0');
      const data = await api.upload('/api/bookings/parse-document', body);
      setParsed(data);
      setSheetName(data.selectedSheet || '');
      setAddSchedule(!!data.scheduleSuggestions?.length);
      const nextSelectedFixed = {};
      for (const field of FIELD_META) {
        const incoming = data.fields?.[field.key];
        if (!hasValue(incoming)) continue;
        if (field.key === 'budget' && Number(incoming) > MAX_SHOOT_BUDGET) continue;
        // Always pre-check mapped form fields so Apply fills them
        nextSelectedFixed[field.key] = true;
      }
      setSelected(nextSelectedFixed);
      const via = data.aiUsed ? ' (AI)' : '';
      toast(
        `Parsed ${data.documentType === 'media_plan' ? 'media plan' : 'MPC brief'}${via} · ${data.scheduleSuggestions?.length || 0} calendar days`
      );
    } catch (err) {
      toast(err.message, { variant: 'error' });
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const onFile = async (e) => {
    const next = e.target.files?.[0];
    e.target.value = '';
    if (!next) return;
    setFile(next);
    await runParse(next, null);
  };

  const onSheetChange = async (name) => {
    setSheetName(name);
    if (file) await runParse(file, name);
  };

  const toggleField = (key) => {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  };

  const apply = async () => {
    if (!parsed) return;
    setApplying(true);
    try {
      const patch = {};
      for (const field of FIELD_META) {
        if (!selected[field.key]) continue;
        const incoming = parsed.fields?.[field.key];
        if (!hasValue(incoming)) continue;
        if (field.key === 'budget' && Number(incoming) > MAX_SHOOT_BUDGET) continue;
        const existing = currentValues?.[field.key];
        if (!overwrite && hasValue(existing) && String(existing) === String(incoming)) continue;
        if (!overwrite && hasValue(existing)) continue;
        patch[field.key] = incoming;
      }

      // Force-apply core booking fields from the parse even if checkbox state drifted
      const coreKeys = [
        'brand',
        'campaign_name',
        'client_company',
        'city_market',
        'currency',
        'format_type',
        'campaign_start',
        'campaign_end',
        'client_notes',
      ];
      if (overwrite) {
        for (const key of coreKeys) {
          if (hasValue(parsed.fields?.[key])) patch[key] = parsed.fields[key];
        }
      }

      if (Object.keys(patch).length) {
        onApplyFields?.(patch);
      }

      let sitesAdded = 0;
      let scheduleAdded = 0;

      if (mode === 'full' && bookingId && addSites && parsed.sites?.length) {
        for (const site of parsed.sites) {
          try {
            await api.post(`/api/bookings/${bookingId}/sites`, {
              type: site.type || 'must_shoot',
              site_name: site.site_name,
              location: site.location || null,
              notes: site.notes || null,
              reference_url: site.reference_url || null,
            });
            sitesAdded += 1;
          } catch {
            // continue remaining sites
          }
        }
      }

      if (mode === 'full' && bookingId && addSchedule && parsed.scheduleSuggestions?.length) {
        const existingKeys = new Set(
          (existingSchedule || []).map(
            (e) =>
              `${String(e.shoot_date).slice(0, 10)}|${e.city || ''}|${Number(e.day_length)}`
          )
        );
        let skippedDup = 0;
        let skippedBudget = 0;
        for (const entry of parsed.scheduleSuggestions) {
          const key = `${entry.shoot_date}|${entry.city || ''}|${Number(entry.day_length)}`;
          if (existingKeys.has(key)) {
            skippedDup += 1;
            continue;
          }
          try {
            await api.post(`/api/bookings/${bookingId}/schedule`, {
              shoot_date: entry.shoot_date,
              day_length: entry.day_length ?? 1,
              city: entry.city || 'Other',
              notes: entry.notes || null,
              format: entry.format || 'Shoot',
            });
            existingKeys.add(key);
            scheduleAdded += 1;
          } catch (err) {
            if (err.message?.includes('budget') || err.code === 'BUDGET_EXCEEDED') {
              skippedBudget += 1;
            } else {
              toast(err.message || 'Could not add shoot day', { variant: 'warning' });
            }
          }
        }
        if (skippedBudget) {
          toast(
            `${skippedBudget} shoot day(s) skipped — would exceed remaining shoot budget`,
            { variant: 'warning' }
          );
        }
        if (skippedDup && !scheduleAdded) {
          toast('Those calendar days were already on the schedule', { variant: 'info' });
        }
      }

      const bits = [];
      if (Object.keys(patch).length) bits.push(`${Object.keys(patch).length} fields`);
      if (sitesAdded) bits.push(`${sitesAdded} sites`);
      if (scheduleAdded) bits.push(`${scheduleAdded} calendar day${scheduleAdded === 1 ? '' : 's'}`);
      toast(bits.length ? `Imported ${bits.join(', ')}` : 'Nothing selected to import');

      await onApplied?.({ patch, sitesAdded, scheduleAdded, parsed });
      close(false);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setApplying(false);
    }
  };

  const sheetOptions = (parsed?.availableSheets || []).map((s) => ({
    value: s.name,
    label: s.city ? `${s.name} — ${s.city}` : s.name,
  }));

  return (
    <Modal
      open={open}
      onOpenChange={close}
      size="lg"
      title="Import from document"
      description="Upload an OOH media plan or MPC brief (.xlsx). Fields, sites, and calendar shoot days are mapped for review before applying."
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={apply} loading={applying} disabled={!parsed || parsing || applying}>
            {applying ? 'Applying…' : 'Apply to form & calendar'}
          </Button>
        </>
      }
    >
      <Drop>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={onFile}
          disabled={parsing || applying}
        />
        <strong>{parsing ? 'Parsing…' : file ? file.name : 'Choose Excel file'}</strong>
        <span>Media plan (CLIENT / CAMPAIGN NAME) or MPC brief (KPI / sites)</span>
      </Drop>

      <Options style={{ marginTop: '0.75rem' }}>
        <Check>
          <input
            type="checkbox"
            checked={useAi}
            onChange={async (e) => {
              const on = e.target.checked;
              setUseAi(on);
              if (file) {
                // Re-parse with the new AI setting
                setParsing(true);
                try {
                  const body = new FormData();
                  body.append('file', file);
                  if (sheetName) body.append('sheetName', sheetName);
                  body.append('useAi', on ? '1' : '0');
                  const data = await api.upload('/api/bookings/parse-document', body);
                  setParsed(data);
                  setSheetName(data.selectedSheet || '');
                  setAddSchedule(!!data.scheduleSuggestions?.length);
                  const nextSelected = {};
                  for (const field of FIELD_META) {
                    const incoming = data.fields?.[field.key];
                    if (!hasValue(incoming)) continue;
                    const existing = currentValues?.[field.key];
                    nextSelected[field.key] = overwrite || !hasValue(existing);
                  }
                  setSelected(nextSelected);
                } catch (err) {
                  toast(err.message, { variant: 'error' });
                } finally {
                  setParsing(false);
                }
              }
            }}
            disabled={parsing || applying}
          />
          <span>
            Use OpenAI for smarter field + calendar extraction
            {parsed && parsed.openaiConfigured === false
              ? ' (add OPENAI_API_KEY to .env.local)'
              : parsed?.aiUsed
                ? ' · used on this parse'
                : ''}
          </span>
        </Check>
      </Options>

      {parsed && (
        <>
          {sheetOptions.length > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <Select
                label="Market sheet"
                value={sheetName || parsed.selectedSheet}
                onValueChange={onSheetChange}
                options={sheetOptions}
                disabled={parsing || applying}
              />
            </div>
          )}

          <Summary>
            <div>
              <strong>Type:</strong>{' '}
              {parsed.documentType === 'media_plan' ? 'OOH media plan' : 'MPC brief'}
              {parsed.selectedSheet ? ` · ${parsed.selectedSheet}` : ''}
              {parsed.aiUsed ? ' · AI enriched' : ''}
            </div>
            {parsed.summary?.brand && (
              <div>
                <strong>Brand:</strong> {parsed.summary.brand}
                {parsed.summary.campaign ? ` · ${parsed.summary.campaign}` : ''}
              </div>
            )}
            {parsed.summary?.city && (
              <div>
                <strong>City:</strong> {parsed.summary.city}
                {parsed.summary.dates ? ` · ${parsed.summary.dates}` : ''}
              </div>
            )}
            <div>
              <strong>Sites:</strong> {parsed.sites?.length || 0}
              {' · '}
              <strong>Calendar days:</strong> {parsed.scheduleSuggestions?.length || 0}
              {parsed.summary?.format ? ` · Format ${parsed.summary.format}` : ''}
            </div>
          </Summary>

          {!!parsed.scheduleSuggestions?.length && (
            <>
              <div style={{ fontSize: '0.875rem', color: 'inherit' }}>
                <strong>Calendar shoot days</strong>
              </div>
              <DateChips>
                {parsed.scheduleSuggestions.map((e) => (
                  <DateChip key={`${e.shoot_date}-${e.city}-${e.day_length}`}>
                    {e.shoot_date}
                    {e.city ? ` · ${e.city}` : ''}
                    {Number(e.day_length) === 0.5 ? ' · ½ day' : ''}
                  </DateChip>
                ))}
              </DateChips>
            </>
          )}

          {!!parsed.warnings?.length && (
            <WarnList>
              {parsed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </WarnList>
          )}

          <FieldList>
            {availableFields.map((field) => {
              const value = displayValue(
                field.key,
                parsed.fields[field.key],
                parsed.fields.currency || 'GBP'
              );
              const existing = currentValues?.[field.key];
              const blocked = !overwrite && hasValue(existing);
              return (
                <FieldRow key={field.key} data-disabled={blocked ? 'true' : 'false'}>
                  <input
                    type="checkbox"
                    checked={!!selected[field.key] && !blocked}
                    disabled={blocked || applying}
                    onChange={() => toggleField(field.key)}
                  />
                  <span className="label">{field.label}</span>
                  <span className="value">
                    {value}
                    {blocked ? ' (already set — enable overwrite)' : ''}
                  </span>
                </FieldRow>
              );
            })}
            {!availableFields.length && (
              <span style={{ fontSize: '0.875rem' }}>No scalar fields detected.</span>
            )}
          </FieldList>

          <Options>
            <Check>
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => {
                  const on = e.target.checked;
                  setOverwrite(on);
                  if (on && parsed?.fields) {
                    setSelected((prev) => {
                      const next = { ...prev };
                      for (const field of FIELD_META) {
                        if (hasValue(parsed.fields[field.key])) next[field.key] = true;
                      }
                      return next;
                    });
                  }
                }}
              />
              <span>Overwrite existing form values with parsed fields (recommended)</span>
            </Check>

            {mode === 'full' && (
              <>
                <Check>
                  <input
                    type="checkbox"
                    checked={addSites}
                    disabled={!parsed.sites?.length}
                    onChange={(e) => setAddSites(e.target.checked)}
                  />
                  <span>
                    Add {parsed.sites?.length || 0} sites as must-shoot
                    {!parsed.sites?.length ? ' (none found)' : ''}
                  </span>
                </Check>
                <Check>
                  <input
                    type="checkbox"
                    checked={addSchedule}
                    disabled={!parsed.scheduleSuggestions?.length}
                    onChange={(e) => setAddSchedule(e.target.checked)}
                  />
                  <span>
                    Update calendar with {parsed.scheduleSuggestions?.length || 0} shoot day
                    {(parsed.scheduleSuggestions?.length || 0) === 1 ? '' : 's'}
                    {!parsed.scheduleSuggestions?.length ? ' (none found)' : ''}
                  </span>
                </Check>
              </>
            )}
          </Options>
        </>
      )}
    </Modal>
  );
}
