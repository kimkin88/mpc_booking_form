'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, portalRequest } from '@/lib/apiClient';
import { formatRelative } from '@/utils/format';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import { useBookingMessagesTarget } from '@/contexts/BookingMessagesContext';
import { useVisibilityInterval } from '@/hooks/useVisibilityInterval';
import { useToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useUnsavedChanges';

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

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
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

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  height: min(70vh, 36rem);
  min-height: min(70vh, 36rem);
  max-height: min(70vh, 36rem);
  min-width: 0;
  overflow: hidden;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: ${({ $inbox }) => ($inbox ? '16rem minmax(0, 1fr)' : '1fr')};
  }
`;

const Inbox = styled.div`
  display: ${({ $show }) => ($show ? 'flex' : 'none')};
  flex-direction: column;
  min-height: 0;
  max-height: 14rem;
  overflow: hidden;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.space[2]};
  gap: ${({ theme }) => theme.space[2]};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    max-height: none;
    border-bottom: none;
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    padding-bottom: 0;
    padding-right: ${({ theme }) => theme.space[2]};
  }
`;

const InboxSearch = styled.div`
  flex-shrink: 0;
`;

const InboxList = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-anchor: none;
  overscroll-behavior: contain;
  padding-right: 0.15rem;
`;

const ThreadBtn = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  background: ${({ theme, $active, $unread }) =>
    $active ? theme.colors.primaryMuted : $unread ? theme.colors.bgMuted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.55rem 0.65rem;
  margin-bottom: 0.35rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }
`;

const ThreadTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const ThreadMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Chat = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`;

const ChatHead = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  padding-bottom: ${({ theme }) => theme.space[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ChatTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
`;

const ChatSub = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Messages = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-anchor: none;
  overscroll-behavior: contain;
  padding: ${({ theme }) => theme.space[3]} 0.15rem ${({ theme }) => theme.space[3]} 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const Bubble = styled.div`
  align-self: ${({ $mine }) => ($mine ? 'flex-end' : 'flex-start')};
  max-width: min(85%, 28rem);
  padding: 0.65rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme, $mine }) => ($mine ? theme.colors.primaryMuted : theme.colors.bgMuted)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
`;

const BubbleMeta = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 0.25rem;
`;

const BubbleBody = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
`;

const Composer = styled.form`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  /* Inset so focus ring isn’t clipped by overflow:hidden ancestors */
  padding: ${({ theme }) => theme.space[2]} 3px 1px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 4.5rem;
  max-height: 8rem;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.65rem 0.75rem;
  font: inherit;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.focus};
  }
`;

const ComposerRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
`;

const Empty = styled.p`
  margin: auto;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  padding: ${({ theme }) => theme.space[4]};
`;

const BookingLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
  }
`;

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Admin ↔ portal messaging control for the header.
 * @param {{ variant?: 'admin' | 'portal', token?: string }} props
 */
export function MessagesButton({ variant = 'admin', token = null }) {
  const isPortal = variant === 'portal';
  const { toast } = useToast();
  const { bookingId: contextBookingId } = useBookingMessagesTarget();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [threads, setThreads] = useState([]);
  const [portalSearch, setPortalSearch] = useState('');
  const debouncedPortalSearch = useDebouncedValue(portalSearch, 200);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [threadLabel, setThreadLabel] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const listRef = useRef(null);
  const threadsRef = useRef([]);

  const loadUnread = useCallback(async () => {
    try {
      if (isPortal) {
        if (!token) return;
        const data = await portalRequest(`/api/portal/${token}/messages`);
        setUnread(data?.unread || 0);
        return;
      }
      const data = await api.get('/api/messages');
      setUnread(data?.unread || 0);
      const nextThreads = data?.threads || [];
      setThreads(nextThreads);
      threadsRef.current = nextThreads;
    } catch {
      /* ignore badge poll errors */
    }
  }, [isPortal, token]);

  useDataRefresh(loadUnread);

  useEffect(() => {
    const timer = window.setTimeout(loadUnread, 0);
    return () => window.clearTimeout(timer);
  }, [loadUnread]);

  useVisibilityInterval(loadUnread, { enabled: !open, intervalMs: 45000 });

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const loadThread = useCallback(
    async (bookingId) => {
      if (!isPortal && !bookingId) return;
      setLoadingThread(true);
      try {
        if (isPortal) {
          const data = await portalRequest(`/api/portal/${token}/messages`);
          setMessages(data?.messages || []);
          setUnread(data?.unread || 0);
          await portalRequest(`/api/portal/${token}/messages`, { method: 'PATCH' });
          setUnread(0);
        } else {
          const data = await api.get(`/api/bookings/${bookingId}/messages`);
          setMessages(data?.messages || []);
          await api.patch(`/api/bookings/${bookingId}/messages`, {});
          await loadUnread();
        }
        scrollToBottom();
      } catch (err) {
        toast(err.message || 'Could not load messages', { variant: 'error' });
      } finally {
        setLoadingThread(false);
      }
    },
    [isPortal, token, toast, loadUnread]
  );

  const refreshOpenThread = useCallback(async () => {
    if (!open) return;
    try {
      if (isPortal) {
        const data = await portalRequest(`/api/portal/${token}/messages`);
        setMessages(data?.messages || []);
        if ((data?.unread || 0) > 0) {
          await portalRequest(`/api/portal/${token}/messages`, { method: 'PATCH' });
          setUnread(0);
        }
      } else if (activeBookingId) {
        const data = await api.get(`/api/bookings/${activeBookingId}/messages`);
        setMessages(data?.messages || []);
        if ((data?.unread || 0) > 0) {
          await api.patch(`/api/bookings/${activeBookingId}/messages`, {});
          await loadUnread();
        }
      }
    } catch {
      /* ignore live poll errors */
    }
  }, [open, isPortal, token, activeBookingId, loadUnread]);

  useVisibilityInterval(refreshOpenThread, { enabled: open, intervalMs: 4000 });

  const openPanel = async () => {
    setOpen(true);
    setDraft('');
    setPortalSearch('');
    if (isPortal) {
      setActiveBookingId('portal');
      setThreadLabel('Messages with MPC');
      await loadThread(null);
      return;
    }

    await loadUnread();
    const preferred = contextBookingId || null;
    if (preferred) {
      setActiveBookingId(preferred);
      const thread = threadsRef.current.find((t) => t.booking_id === preferred);
      setThreadLabel(thread?.client_label || thread?.sb_number || 'Booking messages');
      await loadThread(preferred);
    } else {
      setActiveBookingId(null);
      setMessages([]);
      setThreadLabel('');
    }
  };

  const searchQuery = String(debouncedPortalSearch || '')
    .trim()
    .toLowerCase();
  const filteredThreads = !searchQuery
    ? threads
    : threads.filter((thread) => {
        const haystack = [
          thread.sb_number,
          thread.client_label,
          thread.campaign_name,
          thread.latest_message?.body,
          thread.portal_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchQuery);
      });

  const selectThread = async (thread) => {
    setActiveBookingId(thread.booking_id);
    setThreadLabel(thread.client_label || thread.sb_number || 'Booking');
    setDraft('');
    await loadThread(thread.booking_id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      let created;
      if (isPortal) {
        created = await portalRequest(`/api/portal/${token}/messages`, {
          method: 'POST',
          body: { body },
        });
      } else {
        if (!activeBookingId) throw new Error('Select a booking conversation first');
        created = await api.post(`/api/bookings/${activeBookingId}/messages`, { body });
      }
      setMessages((prev) => [...prev, created]);
      setDraft('');
      scrollToBottom();
      await loadUnread();
    } catch (err) {
      toast(err.message || 'Could not send message', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const mineRole = isPortal ? 'client' : 'admin';
  const showInbox = !isPortal;

  return (
    <>
      <Trigger
        type="button"
        aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
        title="Messages"
        onClick={openPanel}
      >
        <MessageIcon />
        {unread > 0 && <BadgeCount>{unread > 99 ? '99+' : unread}</BadgeCount>}
      </Trigger>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Messages"
        description={
          isPortal
            ? 'Chat with your MPC booking team about this booking.'
            : 'Message any client portal. Search and pick a booking on the left.'
        }
        size="lg"
        scrollable
      >
        <Shell>
          <Layout $inbox={showInbox}>
            {showInbox && (
              <Inbox $show>
                <InboxSearch>
                  <Input
                    aria-label="Search portals"
                    placeholder="Search portals…"
                    value={portalSearch}
                    onChange={(e) => setPortalSearch(e.target.value)}
                    fullWidth
                  />
                </InboxSearch>
                <InboxList>
                  {threads.length === 0 ? (
                    <Empty style={{ margin: '1rem 0' }}>No portals created yet.</Empty>
                  ) : filteredThreads.length === 0 ? (
                    <Empty style={{ margin: '1rem 0' }}>No portals match your search.</Empty>
                  ) : (
                    filteredThreads.map((thread) => (
                      <ThreadBtn
                        key={thread.booking_id}
                        type="button"
                        $active={activeBookingId === thread.booking_id}
                        $unread={thread.unread_count > 0}
                        onClick={() => selectThread(thread)}
                      >
                        <ThreadTitle>
                          {thread.sb_number || 'Booking'}
                          {thread.unread_count > 0 ? ` · ${thread.unread_count}` : ''}
                        </ThreadTitle>
                        <ThreadMeta>
                          {thread.client_label}
                          {thread.latest_message?.body
                            ? ` — ${thread.latest_message.body}`
                            : ' — No messages yet'}
                        </ThreadMeta>
                      </ThreadBtn>
                    ))
                  )}
                </InboxList>
              </Inbox>
            )}

            <Chat>
              {!activeBookingId && !isPortal ? (
                <Empty>
                  {contextBookingId
                    ? 'Loading conversation…'
                    : 'Pick a portal on the left to message the client.'}
                </Empty>
              ) : (
                <>
                  <ChatHead>
                    <div>
                      <ChatTitle>{threadLabel || 'Conversation'}</ChatTitle>
                      <ChatSub>
                        {isPortal
                          ? 'Messages are saved to this booking'
                          : 'Visible to the client on their portal link'}
                      </ChatSub>
                    </div>
                    {!isPortal && activeBookingId && (
                      <BookingLink href={`/admin/bookings/${activeBookingId}`}>
                        Open booking
                      </BookingLink>
                    )}
                  </ChatHead>

                  <Messages ref={listRef}>
                    {loadingThread && messages.length === 0 ? (
                      <Empty>Loading…</Empty>
                    ) : messages.length === 0 ? (
                      <Empty>No messages yet. Say hello to start the conversation.</Empty>
                    ) : (
                      messages.map((msg) => {
                        const mine = msg.sender_role === mineRole;
                        return (
                          <Bubble key={msg.id} $mine={mine}>
                            <BubbleMeta>
                              {mine
                                ? 'You'
                                : msg.sender_name ||
                                  (msg.sender_role === 'admin' ? 'MPC' : 'Client')}
                              {' · '}
                              {formatRelative(msg.created_at)}
                            </BubbleMeta>
                            <BubbleBody>{msg.body}</BubbleBody>
                          </Bubble>
                        );
                      })
                    )}
                  </Messages>

                  <Composer onSubmit={handleSend}>
                    <TextArea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        isPortal ? 'Write a message to MPC…' : 'Write a message to the client…'
                      }
                      maxLength={4000}
                      disabled={sending || (!isPortal && !activeBookingId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                    />
                    <ComposerRow>
                      <Button
                        type="submit"
                        disabled={sending || !draft.trim() || (!isPortal && !activeBookingId)}
                      >
                        {sending ? 'Sending…' : 'Send'}
                      </Button>
                    </ComposerRow>
                  </Composer>
                </>
              )}
            </Chat>
          </Layout>
        </Shell>
      </Modal>
    </>
  );
}

export default MessagesButton;
