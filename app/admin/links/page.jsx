'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Tabs';
import { EmptyStateBlock } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ActionsMenu, ActionsMenuItem } from '@/components/ui/ActionsMenu';
import { api } from '@/lib/apiClient';
import { PORTAL_STATUSES } from '@/lib/constants';
import { formatRelative } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useUnsavedChanges';
import { useToast } from '@/components/ui/Toast';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Table = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow-x: auto;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr 1fr 1.4fr 100px 120px 110px;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  align-items: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  min-width: 1020px;

  &:last-child {
    border-bottom: none;
  }
`;

const Head = styled(Row)`
  background: ${({ theme }) => theme.colors.bgMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  position: sticky;
  top: 0;
`;

const ClientInfo = styled.div`
  line-height: 1.35;
  small {
    display: block;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const LinkCell = styled.div`
  min-width: 0;
`;

const LinkText = styled.code`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  word-break: break-all;
  color: ${({ theme }) => theme.colors.text};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SbLink = styled(Link)`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
    text-decoration: underline;
  }
`;

const StatusTone = styled.span`
  color: ${({ theme, $ok }) => ($ok ? theme.colors.success : theme.colors.warning)};
`;

const WarnText = styled.small`
  color: ${({ theme }) => theme.colors.warning};
`;

function portalTone(status) {
  if (status === 'active' || status === 'submitted') return 'success';
  if (status === 'locked') return 'warning';
  if (status === 'disabled' || status === 'expired') return 'danger';
  return 'info';
}

export default function SentLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [reloadToken, setReloadToken] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (status !== 'all') params.set('status', status);

    api
      .get(`/api/portals?${params}`)
      .then((data) => {
        if (!cancelled) setLinks(data);
      })
      .catch((err) => toast(err.message, { variant: 'error' }))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, toast, reloadToken]);

  useDataRefresh(() => setReloadToken((n) => n + 1));

  const copyUrl = async (url) => {
    if (!url) {
      toast('No saved link for this portal — open the booking and regenerate', {
        variant: 'warning',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Portal link copied');
    } catch {
      toast('Could not copy link', { variant: 'error' });
    }
  };

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Admin"
        title="Sent Links"
        subtitle="All generated portal links. Copy or preview the saved unique URL anytime."
      />

      <Toolbar>
        <Input
          label="Search"
          placeholder="SB number, campaign, or client company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Portal status"
          value={status}
          onValueChange={setStatus}
          options={[{ value: 'all', label: 'All' }, ...PORTAL_STATUSES]}
        />
      </Toolbar>

      {loading && <TableSkeleton cols="120px 1fr 1fr 1.4fr 100px 120px 110px" />}

      {!loading && links.length === 0 && (
        <EmptyStateBlock
          title="No portal links yet"
          description="Open a booking and use the Portal & Permissions tab to generate a client link."
          actions={
            <Link href="/admin">
              <Button>Go to bookings</Button>
            </Link>
          }
        />
      )}

      {!loading && links.length > 0 && (
        <Table>
          <Head>
            <span>SB Number</span>
            <span>Client / Campaign</span>
            <span>Status</span>
            <span>Saved Link</span>
            <span>First Opened</span>
            <span>Last Activity</span>
            <span>Actions</span>
          </Head>
          {links.map((link) => (
            <Row key={link.id}>
              <SbLink href={`/admin/bookings/${link.booking_id}`}>{link.sb_number}</SbLink>

              <ClientInfo>
                {link.campaign_name || '—'}
                <small>{link.client_company || '—'}</small>
              </ClientInfo>

              <span>
                <Badge $tone={portalTone(link.status)}>{link.status}</Badge>
                {link.editing_locked && (
                  <Badge $tone="warning" style={{ marginLeft: 4 }}>
                    locked
                  </Badge>
                )}
              </span>

              <LinkCell>
                {link.url ? (
                  <LinkText title={link.url}>{link.url}</LinkText>
                ) : (
                  <WarnText>Regenerate on booking to save link</WarnText>
                )}
              </LinkCell>

              <StatusTone $ok={!!link.first_opened_at}>
                {link.first_opened_at ? formatRelative(link.first_opened_at) : 'Not yet'}
              </StatusTone>

              <span>{link.last_opened_at ? formatRelative(link.last_opened_at) : '—'}</span>

              <Actions>
                <ActionsMenu>
                  <ActionsMenuItem
                    disabled={!link.url}
                    onSelect={() => copyUrl(link.url)}
                  >
                    Copy
                  </ActionsMenuItem>
                  <ActionsMenuItem
                    disabled={!link.url}
                    onSelect={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  >
                    Open
                  </ActionsMenuItem>
                  <ActionsMenuItem
                    onSelect={() => router.push(`/admin/bookings/${link.booking_id}`)}
                  >
                    Booking
                  </ActionsMenuItem>
                </ActionsMenu>
              </Actions>
            </Row>
          ))}
        </Table>
      )}
    </AdminShell>
  );
}
