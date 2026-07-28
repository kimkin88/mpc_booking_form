'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Tabs';
import { EmptyStateBlock } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { RemoveIconButton } from '@/components/ui/IconButton';
import { api } from '@/lib/apiClient';
import { BOOKING_STATUSES } from '@/lib/constants';
import { formatCurrency } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useUnsavedChanges';
import { useToast } from '@/components/ui/Toast';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Updated: Newest first' },
  { value: 'updated_asc', label: 'Updated: Oldest first' },
  { value: 'created_desc', label: 'Created: Newest first' },
  { value: 'created_asc', label: 'Created: Oldest first' },
  { value: 'sb_asc', label: 'SB Number: A-Z' },
  { value: 'sb_desc', label: 'SB Number: Z-A' },
  { value: 'client_asc', label: 'Client: A-Z' },
  { value: 'client_desc', label: 'Client: Z-A' },
  { value: 'campaign_asc', label: 'Campaign: A-Z' },
  { value: 'campaign_desc', label: 'Campaign: Z-A' },
];

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 220px 240px;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

const Table = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1.2fr 1fr 120px 140px 140px 100px;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  align-items: center;
  color: inherit;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr 1fr;
    gap: ${({ theme }) => theme.space[2]};
  }
`;

const RowLink = styled(Link)`
  display: contents;
  text-decoration: none;
  color: inherit;

  &:focus-visible > span {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: 140px 1.2fr 1fr 120px 140px 140px 100px;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.bgMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.textMuted};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

const MobileLabel = styled.span`
  display: none;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    margin-bottom: 0.15rem;
  }
`;

const Cell = styled.span`
  min-width: 0;
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-start;
  min-width: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-column: 1 / -1;
    padding-top: ${({ theme }) => theme.space[1]};
  }
`;

const ResultMeta = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PaginationBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[4]};
`;

const PageStatus = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const PageButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  align-items: center;
`;

const MutedText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

function statusTone(status) {
  if (['approved', 'completed'].includes(status)) return 'success';
  if (['cancelled', 'archived'].includes(status)) return 'danger';
  if (['ready_for_review', 'changes_requested'].includes(status)) return 'warning';
  if (['client_updating', 'waiting_for_client'].includes(status)) return 'info';
  return 'neutral';
}

function formatUpdatedCell(value, locale = 'en-GB') {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('updated_desc');
  const [confirmBooking, setConfirmBooking] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { toast } = useToast();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sort]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      if (sort !== 'updated_desc') params.set('sort', sort);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      try {
        const data = await api.get(`/api/bookings?${params}`);
        if (!cancelled) {
          setBookings(data.items || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!cancelled) toast(err.message, { variant: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, sort, page, toast, reloadToken]);

  useDataRefresh(() => setReloadToken((n) => n + 1));

  const handleDelete = async () => {
    if (!confirmBooking) return;
    setDeleting(true);
    try {
      await api.delete(`/api/bookings/${confirmBooking.id}`);
      toast(`Deleted ${confirmBooking.sb_number}`);
      setConfirmBooking(null);
      // If we deleted the last item on a page > 1, step back
      if (bookings.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReloadToken((n) => n + 1);
      }
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(debouncedSearch) || status !== 'all' || sort !== 'updated_desc';
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Admin"
        title="Bookings"
        subtitle="Create and manage bookings, share secure client portals, and review activity."
        actions={
          <Link href="/admin/bookings/new">
            <Button>New Booking</Button>
          </Link>
        }
      />

      <Toolbar>
        <Input
          label="Search"
          placeholder="SB number, campaign, or client company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          hint="Results update as you type"
        />
        <Select
          label="Status"
          value={status}
          onValueChange={setStatus}
          options={[{ value: 'all', label: 'All statuses' }, ...BOOKING_STATUSES]}
        />
        <Select label="Sort" value={sort} onValueChange={setSort} options={SORT_OPTIONS} />
      </Toolbar>

      {loading && <TableSkeleton />}

      {!loading && bookings.length === 0 && (
        <EmptyStateBlock
          title={hasFilters ? 'No matching bookings' : 'No bookings yet'}
          description={
            hasFilters
              ? 'Try a different search or clear the status filter.'
              : 'Create a booking, then share a portal link with your client.'
          }
          actions={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                  setSort('updated_desc');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link href="/admin/bookings/new">
                <Button>Create your first booking</Button>
              </Link>
            )
          }
        />
      )}

      {!loading && bookings.length > 0 && (
        <>
          <ResultMeta>
            Showing {from}–{to} of {total} booking{total === 1 ? '' : 's'}
            {hasFilters ? ' matching filters' : ''}
          </ResultMeta>
          <Table role="table" aria-label="Bookings">
            <Head role="row">
              <span>SB Number</span>
              <span>Campaign</span>
              <span>Client</span>
              <span>Status</span>
              <span>Budget</span>
              <span>Updated</span>
              <span style={{ marginLeft: '0.5rem' }}>Actions</span>
            </Head>
            {bookings.map((b) => (
              <TableRow key={b.id} role="row">
                <RowLink href={`/admin/bookings/${b.id}`} aria-label={`Open ${b.sb_number}`}>
                  <Cell>
                    <MobileLabel>SB Number</MobileLabel>
                    <strong>{b.sb_number}</strong>
                  </Cell>
                  <Cell>
                    <MobileLabel>Campaign</MobileLabel>
                    {b.campaign_name || '—'}
                  </Cell>
                  <Cell>
                    <MobileLabel>Client</MobileLabel>
                    {b.client_company || '—'}
                  </Cell>
                  <Cell>
                    <MobileLabel>Status</MobileLabel>
                    <Badge $tone={statusTone(b.status)}>
                      {BOOKING_STATUSES.find((s) => s.value === b.status)?.label || b.status}
                    </Badge>
                  </Cell>
                  <Cell>
                    <MobileLabel>Budget</MobileLabel>
                    {formatCurrency(b.budget, b.currency)}
                  </Cell>
                  <Cell>
                    <MobileLabel>Updated</MobileLabel>
                    <MutedText>{formatUpdatedCell(b.updated_at)}</MutedText>
                  </Cell>
                </RowLink>
                <ActionsCell>
                  <MobileLabel>Actions</MobileLabel>
                  <RemoveIconButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmBooking(b);
                    }}
                  />
                </ActionsCell>
              </TableRow>
            ))}
          </Table>

          {totalPages > 1 && (
            <PaginationBar>
              <PageStatus>
                Page {page} of {totalPages}
              </PageStatus>
              <PageButtons>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </PageButtons>
            </PaginationBar>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmBooking}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmBooking(null);
        }}
        title="Remove booking permanently?"
        description={
          confirmBooking
            ? `Deletes ${confirmBooking.sb_number} and all related data — portal link, permissions, schedule, sites, files, activity, and versions. This cannot be undone.`
            : ''
        }
        confirmLabel="Remove booking"
        danger
        loading={deleting}
        onConfirm={handleDelete}
      />
    </AdminShell>
  );
}
