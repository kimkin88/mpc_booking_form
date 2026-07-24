'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader, Section, Grid } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/apiClient';
import { CURRENCIES } from '@/lib/constants';

const SbHintRow = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[1]};
`;

const SbHint = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const RegenerateButton = styled(Button)`
  padding: 0.1rem 0.4rem;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  min-height: 0;
  line-height: 1.2;
`;

export default function NewBookingPage() {
  const [form, setForm] = useState({
    sb_number: '',
    currency: 'GBP',
    budget: '',
    campaign_name: '',
    client_company: '',
    city_market: '',
    brand: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setSuggesting(true);
    api
      .get('/api/bookings?suggestSb=1')
      .then((data) => {
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          // Only fill if the admin hasn't already typed something
          sb_number: f.sb_number || data.sb_number || '',
        }));
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback local suggestion if API is unavailable
        const year = new Date().getFullYear();
        setForm((f) => ({
          ...f,
          sb_number: f.sb_number || `SB-${year}-001`,
        }));
      })
      .finally(() => {
        if (!cancelled) setSuggesting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const regenerateSb = async () => {
    try {
      const data = await api.get('/api/bookings?suggestSb=1');
      set('sb_number', data.sb_number);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.sb_number.trim()) nextErrors.sb_number = 'SB Number is required';
    if (!form.currency) nextErrors.currency = 'Currency is required';
    if (form.budget && Number.isNaN(Number(form.budget))) {
      nextErrors.budget = 'Budget must be numeric';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const booking = await api.post('/api/bookings', {
        ...form,
        budget: form.budget === '' ? null : form.budget,
      });
      toast('Booking created');
      router.push(`/admin/bookings/${booking.id}`);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Bookings', href: '/admin' },
          { label: 'New Booking' },
        ]}
        eyebrow="Admin"
        title="New Booking"
        subtitle="Only the essentials to get started. You can fill in the rest on the next screen."
      />
      <form onSubmit={handleSubmit}>
        <Section>
          <Grid $cols={2}>
            <div>
              <Input
                label="SB Number"
                required
                value={form.sb_number}
                onChange={(e) => set('sb_number', e.target.value)}
                error={errors.sb_number}
                placeholder="SB-2026-001"
              />
              <SbHintRow>
                <SbHint>
                  {suggesting ? 'Generating…' : 'Auto-generated — edit if needed'}
                </SbHint>
                <RegenerateButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={regenerateSb}
                  disabled={suggesting || saving}
                >
                  Regenerate
                </RegenerateButton>
              </SbHintRow>
            </div>
            <Select
              label="Currency"
              required
              value={form.currency}
              onValueChange={(v) => set('currency', v)}
              options={CURRENCIES}
              error={errors.currency}
            />
            <Input
              label="Budget"
              type="number"
              step="0.01"
              value={form.budget}
              onChange={(e) => set('budget', e.target.value)}
              error={errors.budget}
            />
            <Input
              label="Brand"
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
            />
            <Input
              label="Campaign Name"
              value={form.campaign_name}
              onChange={(e) => set('campaign_name', e.target.value)}
            />
            <Input
              label="Client Company"
              value={form.client_company}
              onChange={(e) => set('client_company', e.target.value)}
            />
            <Input
              label="City / Market"
              value={form.city_market}
              onChange={(e) => set('city_market', e.target.value)}
            />
          </Grid>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <Button type="submit" disabled={saving || suggesting}>
              {saving ? 'Creating…' : 'Create Booking'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin')}>
              Cancel
            </Button>
          </div>
        </Section>
      </form>
    </AdminShell>
  );
}
