'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/apiClient';
import { MAX_SHOOT_BUDGET } from '@/lib/constants';
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

const PARSEABLE_EXT = /\.(xlsx|xls|csv)$/i;

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
    word-break: break-word;
  }
`;

const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Check = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
`;

const DocList = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  max-height: 12rem;
  overflow: auto;
`;

const DocRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surface};

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }
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

function isParseableFile(file) {
  const name = file?.original_filename || file?.name || '';
  return PARSEABLE_EXT.test(name);
}

function siteKey(site) {
  return `${(site.site_name || '').trim().toLowerCase()}|${(site.location || '').trim().toLowerCase()}`;
}

function mergeParsedResults(results) {
  if (!results.length) return null;
  const fields = {};
  const sites = [];
  const scheduleSuggestions = [];
  const siteSeen = new Set();
  const scheduleSeen = new Set();
  const warnings = [];
  let documentType = 'unknown';
  let selectedSheet = null;
  let availableSheets = [];
  let aiUsed = false;
  const sourceNames = [];

  for (const data of results) {
    if (data.sourceFilename) sourceNames.push(data.sourceFilename);
    if (data.aiUsed) aiUsed = true;
    if (data.documentType && data.documentType !== 'unknown') documentType = data.documentType;
    if (data.selectedSheet) selectedSheet = data.selectedSheet;
    if (data.availableSheets?.length && !availableSheets.length) {
      availableSheets = data.availableSheets;
    }
    for (const key of Object.keys(data.fields || {})) {
      if (hasValue(data.fields[key]) && !hasValue(fields[key])) {
        fields[key] = data.fields[key];
      }
    }
    for (const site of data.sites || []) {
      const key = siteKey(site);
      if (!key.startsWith('|') && siteSeen.has(key)) continue;
      if (key !== '|') siteSeen.add(key);
      sites.push(site);
    }
    for (const entry of data.scheduleSuggestions || []) {
      const key = `${entry.format}|${entry.live_start || entry.shoot_date}|${entry.live_end || ''}`;
      if (scheduleSeen.has(key)) continue;
      scheduleSeen.add(key);
      scheduleSuggestions.push(entry);
    }
    if (data.warnings?.length) warnings.push(...data.warnings);
  }

  return {
    documentType,
    fields,
    sites,
    scheduleSuggestions,
    warnings: [...new Set(warnings)],
    selectedSheet,
    availableSheets,
    aiUsed,
    openaiConfigured: results.some((r) => r.openaiConfigured),
    sourceFilename: sourceNames.join(', '),
    summary: {
      brand: fields.brand,
      campaign: fields.campaign_name,
      city: fields.city_market,
      dates:
        fields.campaign_start || fields.campaign_end
          ? `${fields.campaign_start || '—'} → ${fields.campaign_end || '—'}`
          : null,
      format: fields.format_type,
      calendarFormats: scheduleSuggestions.length,
    },
  };
}

/**
 * Admin dialog: parse Excel media plan / MPC brief.
 *
 * @param {'fields' | 'full' | 'calendar'} mode
 *   fields = booking scalar fields
 *   full = fields + sites
 *   calendar = live format ranges only (calendar bars)
 */
export function DocumentImportDialog({
  open,
  onOpenChange,
  mode = 'full',
  currentValues = {},
  bookingId = null,
  existingSchedule: _existingSchedule = [],
  existingFiles = [],
  onApplyFields,
  onApplied,
}) {
  const calendarOnly = mode === 'calendar';
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [file, setFile] = useState(null);
  const [sourceFileIds, setSourceFileIds] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [selected, setSelected] = useState({});
  const [overwrite, setOverwrite] = useState(true);
  const [addSites, setAddSites] = useState(true);
  const [useAi, setUseAi] = useState(false);

  const parseableExisting = useMemo(
    () => (existingFiles || []).filter((f) => !f.is_removed && isParseableFile(f)),
    [existingFiles]
  );
  const preferExisting = parseableExisting.length > 0;

  const reset = () => {
    setParsing(false);
    setApplying(false);
    setParsed(null);
    setSheetName('');
    setFile(null);
    setSourceFileIds([]);
    setSelectedDocIds(parseableExisting.map((f) => f.id));
    setSelected({});
    setOverwrite(true);
    setAddSites(true);
    setUseAi(false);
  };

  useEffect(() => {
    if (open) {
      setSelectedDocIds(parseableExisting.map((f) => f.id));
    }
  }, [open, parseableExisting]);

  const close = (next) => {
    if (!next) reset();
    onOpenChange?.(next);
  };

  const availableFields = useMemo(() => {
    if (!parsed?.fields) return [];
    return FIELD_META.filter((f) => hasValue(parsed.fields[f.key]));
  }, [parsed]);

  const applyParsedPayload = (data) => {
    setParsed(data);
    setSheetName(data.selectedSheet || '');
    const nextSelectedFixed = {};
    for (const field of FIELD_META) {
      const incoming = data.fields?.[field.key];
      if (!hasValue(incoming)) continue;
      if (field.key === 'budget' && Number(incoming) > MAX_SHOOT_BUDGET) continue;
      nextSelectedFixed[field.key] = true;
    }
    setSelected(nextSelectedFixed);
  };

  const runParseUpload = async (nextFile, nextSheet, aiFlag = useAi) => {
    if (!nextFile) return;
    setParsing(true);
    try {
      const body = new FormData();
      body.append('file', nextFile);
      if (nextSheet) body.append('sheetName', nextSheet);
      body.append('useAi', aiFlag ? '1' : '0');
      const data = await api.upload('/api/bookings/parse-document', body);
      setFile(nextFile);
      setSourceFileIds([]);
      applyParsedPayload(data);
      const via = data.aiUsed ? ' (AI)' : '';
      const formats = data.scheduleSuggestions?.length || 0;
      toast(
        calendarOnly
          ? `Parsed ${formats} live format${formats === 1 ? '' : 's'} for calendar${via}`
          : `Parsed ${data.documentType === 'media_plan' ? 'media plan' : 'MPC brief'}${via} · ${data.sites?.length || 0} sites`
      );
    } catch (err) {
      toast(err.message, { variant: 'error' });
      setParsed(null);
    } finally {
      setParsing(false);
    }
  };

  const runParseExisting = async (ids, nextSheet = null, aiFlag = useAi) => {
    const list = (ids || []).filter(Boolean);
    if (!list.length) {
      toast('Select at least one spreadsheet', { variant: 'warning' });
      return;
    }
    setParsing(true);
    try {
      const results = [];
      for (const id of list) {
        const body = new FormData();
        body.append('fileId', id);
        if (nextSheet && list.length === 1) body.append('sheetName', nextSheet);
        body.append('useAi', aiFlag ? '1' : '0');
        const data = await api.upload('/api/bookings/parse-document', body);
        results.push(data);
      }
      const merged = mergeParsedResults(results);
      setFile(null);
      setSourceFileIds(list);
      applyParsedPayload(merged);
      const via = merged.aiUsed ? ' (AI)' : '';
      const formats = merged.scheduleSuggestions?.length || 0;
      toast(
        calendarOnly
          ? `Parsed ${formats} live format${formats === 1 ? '' : 's'} for calendar${via}`
          : `Parsed ${list.length} doc${list.length === 1 ? '' : 's'}${via} · ${merged.sites?.length || 0} sites`
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
    await runParseUpload(next, null);
  };

  const onSheetChange = async (name) => {
    setSheetName(name);
    if (file) await runParseUpload(file, name);
    else if (sourceFileIds.length === 1) await runParseExisting(sourceFileIds, name);
  };

  const toggleField = (key) => {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  };

  const toggleDoc = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const apply = async () => {
    if (!parsed) return;
    setApplying(true);
    try {
      if (calendarOnly) {
        if (!bookingId) {
          toast('Save the booking before importing calendar dates', { variant: 'error' });
          return;
        }
        const formats = parsed.scheduleSuggestions || [];
        if (!formats.length) {
          toast('No live format dates found in the document', { variant: 'warning' });
          return;
        }

        await api.delete(`/api/bookings/${bookingId}/schedule`, { removeLiveFormats: true });

        let scheduleAdded = 0;
        for (const entry of formats) {
          try {
            await api.post(`/api/bookings/${bookingId}/schedule`, {
              shoot_date: entry.shoot_date || entry.live_start,
              live_start: entry.live_start || entry.shoot_date,
              live_end: entry.live_end || entry.live_start || entry.shoot_date,
              format: entry.format || 'Format',
              city: entry.city || null,
              day_length: null,
              notes: entry.notes || null,
              kind: 'live_format',
            });
            scheduleAdded += 1;
          } catch (err) {
            toast(err.message || 'Could not add calendar format', { variant: 'warning' });
          }
        }

        toast(
          scheduleAdded
            ? `Added ${scheduleAdded} live format${scheduleAdded === 1 ? '' : 's'} to calendar`
            : 'Nothing added to calendar'
        );
        await onApplied?.({ patch: {}, sitesAdded: 0, scheduleAdded, parsed });
        close(false);
        return;
      }

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

      const bits = [];
      if (Object.keys(patch).length) bits.push(`${Object.keys(patch).length} fields`);
      if (sitesAdded) bits.push(`${sitesAdded} sites`);
      toast(bits.length ? `Imported ${bits.join(', ')}` : 'Nothing selected to import');

      await onApplied?.({ patch, sitesAdded, scheduleAdded: 0, parsed });
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

  const canChangeSheet =
    sheetOptions.length > 1 && (file || sourceFileIds.length === 1);

  return (
    <Modal
      open={open}
      onOpenChange={close}
      size="lg"
      title={calendarOnly ? 'Import live dates to calendar' : 'Autofill from documents'}
      description={
        calendarOnly
          ? preferExisting
            ? 'Select uploaded Media Plan spreadsheets to fill the calendar with format live date ranges (coloured bars). Booking fields and sites are not changed.'
            : 'Upload an OOH media plan (.xlsx) to fill the calendar with format live date ranges. Booking fields and sites are not changed.'
          : preferExisting
            ? 'Select uploaded Media Plan spreadsheets (.xlsx / .xls / .csv) to extract booking fields and sites. Shoot requirements stay manual.'
            : 'Upload an OOH media plan or MPC brief (.xlsx). Fields and sites are mapped for review before applying. Shoot requirements are added manually.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)} disabled={applying}>
            Cancel
          </Button>
          <Button
            onClick={apply}
            loading={applying}
            disabled={
              !parsed ||
              parsing ||
              applying ||
              (calendarOnly && !(parsed?.scheduleSuggestions?.length > 0))
            }
          >
            {applying
              ? 'Applying…'
              : calendarOnly
                ? 'Apply to calendar'
                : 'Apply to form'}
          </Button>
        </>
      }
    >
      {preferExisting && (
        <>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <strong>Uploaded documents</strong>
          </div>
          <DocList>
            {parseableExisting.map((doc) => (
              <DocRow key={doc.id}>
                <input
                  type="checkbox"
                  checked={selectedDocIds.includes(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  disabled={parsing || applying}
                />
                <span>{doc.original_filename || 'Document'}</span>
              </DocRow>
            ))}
          </DocList>
          <Button
            type="button"
            variant="secondary"
            onClick={() => runParseExisting(selectedDocIds)}
            loading={parsing && !file}
            disabled={parsing || applying || !selectedDocIds.length}
            style={{ marginBottom: '1rem' }}
          >
            {parsing && !file ? 'Parsing…' : 'Parse selected'}
          </Button>
          <div
            style={{
              fontSize: '0.8rem',
              opacity: 0.8,
              marginBottom: '0.75rem',
            }}
          >
            Or upload a different spreadsheet:
          </div>
        </>
      )}

      <Drop>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={onFile}
          disabled={parsing || applying}
        />
        <strong>
          {parsing && file
            ? 'Parsing…'
            : file
              ? file.name
              : preferExisting
                ? 'Choose another Excel file'
                : 'Choose Excel file'}
        </strong>
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
              if (file) await runParseUpload(file, sheetName || null, on);
              else if (sourceFileIds.length) await runParseExisting(sourceFileIds, sheetName || null, on);
            }}
            disabled={parsing || applying}
          />
          <span>
            Use OpenAI for smarter field extraction
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
          {canChangeSheet && (
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
              {parsed.sourceFilename ? ` · ${parsed.sourceFilename}` : ''}
            </div>
            {calendarOnly ? (
              <div>
                <strong>Live formats for calendar:</strong>{' '}
                {parsed.scheduleSuggestions?.length || 0}
              </div>
            ) : (
              <>
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
                  {parsed.summary?.format ? ` · Format ${parsed.summary.format}` : ''}
                </div>
              </>
            )}
          </Summary>

          {calendarOnly && !!parsed.scheduleSuggestions?.length && (
            <FieldList>
              {parsed.scheduleSuggestions.map((entry) => (
                <FieldRow
                  key={`${entry.format}-${entry.live_start}-${entry.live_end}`}
                  as="div"
                  style={{ cursor: 'default', gridTemplateColumns: '9rem 1fr' }}
                >
                  <span className="label">{entry.format}</span>
                  <span className="value">
                    {entry.live_start} → {entry.live_end}
                  </span>
                </FieldRow>
              ))}
            </FieldList>
          )}

          {!!parsed.warnings?.length && (
            <WarnList>
              {parsed.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </WarnList>
          )}

          {!calendarOnly && (
            <>
          <FieldList>
            {availableFields.map((field) => {
              const value = displayValue(
                field.key,
                parsed.fields[field.key],
                parsed.fields.currency || 'GBP'
              );
              return (
                <FieldRow key={field.key} data-disabled={applying ? 'true' : undefined}>
                  <input
                    type="checkbox"
                    checked={!!selected[field.key]}
                    onChange={() => toggleField(field.key)}
                    disabled={applying}
                  />
                  <span className="label">{field.label}</span>
                  <span className="value">{value}</span>
                </FieldRow>
              );
            })}
            {!availableFields.length && (
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>No mapped fields found.</div>
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
            )}
          </Options>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
