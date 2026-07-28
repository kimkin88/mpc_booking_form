'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/apiClient';
import { formatRelative } from '@/utils/format';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const Trigger = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid ${({ theme }) => theme.colors.headerIconBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.headerText};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.headerIconHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const BadgeCount = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  font-size: 0.65rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Panel = styled(Popover.Content)`
  width: min(360px, calc(100vw - 1.5rem));
  max-height: 420px;
  overflow: auto;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: ${({ theme }) => theme.zIndex.modal};
  padding: 0;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.surface};
`;

const Item = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $unread }) =>
    $unread ? theme.colors.primaryMuted : theme.colors.surface};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const ItemTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ItemBody = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0.2rem;
`;

const BookingLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
  }
`;

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space[6]} ${({ theme }) => theme.space[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8a6 6 0 1 1 12 0c0 3.5 1.5 5.5 2 6.5H4c.5-1 2-3 2-6.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);
  const [syncedOpen, setSyncedOpen] = useState(false);

  if (open !== syncedOpen) {
    setSyncedOpen(open);
    if (open) {
      setLoading(true);
      setFetchKey((k) => k + 1);
    }
  }

  const applyNotifications = useCallback((data) => {
    setItems(data.items || []);
    setUnread(data.unread || 0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/notifications?limit=30');
      applyNotifications(data);
    } catch {
      // silent — header should stay usable
    } finally {
      setLoading(false);
    }
  }, [applyNotifications]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.get('/api/notifications?limit=30');
        if (!cancelled) applyNotifications(data);
      } catch {
        // silent — header should stay usable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, applyNotifications]);

  useEffect(() => {
    let cancelled = false;
    const id = setInterval(() => {
      api
        .get('/api/notifications?limit=30')
        .then((data) => {
          if (!cancelled) applyNotifications(data);
        })
        .catch(() => {
          // silent
        });
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [applyNotifications]);

  useDataRefresh(load);

  const markRead = async (id) => {
    try {
      await api.patch('/api/notifications', { id });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // ignore
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/api/notifications', { action: 'mark_all_read' });
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Trigger type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <BellIcon />
          {unread > 0 && <BadgeCount>{unread > 9 ? '9+' : unread}</BadgeCount>}
        </Trigger>
      </Popover.Trigger>
      <Popover.Portal>
        <Panel sideOffset={8} align="end">
          <PanelHead>
            <strong>Notifications</strong>
            <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread}>
              Mark all read
            </Button>
          </PanelHead>
          {loading && items.length === 0 && <Empty>Loading…</Empty>}
          {!loading && items.length === 0 && <Empty>No notifications yet</Empty>}
          {items.map((n) => (
            <Item
              key={n.id}
              type="button"
              $unread={!n.read_at}
              onClick={() => {
                if (!n.read_at) markRead(n.id);
              }}
            >
              <ItemTitle>{n.title}</ItemTitle>
              <ItemBody>{n.body}</ItemBody>
              <ItemBody>
                {formatRelative(n.created_at)}
                {n.booking_id && (
                  <>
                    {' · '}
                    <BookingLink
                      href={`/admin/bookings/${n.booking_id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open booking
                    </BookingLink>
                  </>
                )}
              </ItemBody>
            </Item>
          ))}
        </Panel>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default NotificationsBell;
