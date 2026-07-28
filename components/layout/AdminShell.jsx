'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  DataRefreshProvider,
  DataRefreshButton,
} from '@/contexts/DataRefreshContext';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';
import { ChangePasswordDialog } from '@/components/layout/ChangePasswordDialog';
import { NotificationsBell } from '@/components/layout/NotificationsBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ScrollArea } from '@/components/ui/ScrollArea';

function formatTokens(n) {
  const value = Number(n) || 0;
  return value.toLocaleString();
}

const Shell = styled.div`
  height: 100dvh;
  height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr;
  overflow: hidden;
`;

const Header = styled.header`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  background: ${({ theme }) => theme.colors.headerBg};
  color: ${({ theme }) => theme.colors.headerText};
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerBorder};
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  transition:
    background ${({ theme }) => theme.transitions.base},
    color ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr auto 1fr;
    padding: ${({ theme }) => `${theme.space[4]} ${theme.space[6]}`};
  }
`;

const Brand = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.headerText};
  text-decoration: none;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  justify-self: start;
  transition: color ${({ theme }) => theme.transitions.base};

  span {
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline-offset: 4px;
  }
`;

const Nav = styled.nav`
  display: none;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[1]};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    display: flex;
  }
`;

const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.headerText : theme.colors.headerMuted};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.2;
  white-space: nowrap;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  margin-bottom: -1px;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.headerText};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
    border-radius: 2px;
  }

  &[aria-current='page'] {
    color: ${({ theme }) => theme.colors.headerText};
  }
`;

const MainRegion = styled.div`
  min-height: 0;
  overflow: hidden;
`;

const Main = styled.main`
  width: min(${({ $wide }) => ($wide ? '1400px' : '1200px')}, 100%);
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space[6]} ${theme.space[4]}`};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => `${theme.space[8]} ${theme.space[4]}`};
  }
`;

const HeaderEnd = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
  justify-self: end;
`;

const IconButton = styled.button`
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

const MobileNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]} ${theme.space[3]}`};
  background: ${({ theme }) => theme.colors.headerBg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerBorder};
  transition:
    background ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const overlayShow = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const panelShow = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const SettingsOverlay = styled(Dialog.Overlay)`
  background: ${({ theme }) => theme.colors.overlay};
  position: fixed;
  inset: 0;
  animation: ${overlayShow} 150ms ease;
  z-index: ${({ theme }) => theme.zIndex.modal};
`;

const SettingsPanel = styled(Dialog.Content)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(20rem, 100vw);
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space[5]};
  animation: ${panelShow} 220ms ease;
  z-index: ${({ theme }) => theme.zIndex.modal};
  outline: none;
  overflow: hidden;
`;

const SettingsHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  flex-shrink: 0;
`;

const SettingsTitle = styled(Dialog.Title)`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const SettingsDesc = styled(Dialog.Description)`
  margin: ${({ theme }) => theme.space[1]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const AccountCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[5]};
  background: ${({ theme }) => theme.colors.bgMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const AccountName = styled.p`
  margin: 0;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const AccountMeta = styled.dl`
  margin: 0;
  display: grid;
  gap: 0.35rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};

  dt {
    margin: 0;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    text-align: right;
    word-break: break-all;
  }
`;

const SettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[5]};

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const SettingsBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const SettingsBodyInner = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: ${({ theme }) => theme.space[2]};
  padding-bottom: ${({ theme }) => theme.space[2]};
`;

const SettingsFooter = styled.div`
  flex-shrink: 0;
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const GroupLabel = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const UsageHint = styled.p`
  margin: ${({ theme }) => theme.space[2]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.4;
`;

const SettingsActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};

  > * {
    width: 100%;
    justify-content: flex-start;
  }

  svg {
    width: 1.1rem;
    height: 1.1rem;
    flex-shrink: 0;
  }
`;

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.998 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M11 12.5 20 3.5M17 4.5l2.5 2.5M15 6.5l2 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Bookings',
    match: (p) =>
      p === '/admin' || (p.startsWith('/admin/bookings/') && p !== '/admin/bookings/new'),
  },
  {
    href: '/admin/links',
    label: 'Sent Links',
    match: (p) => p.startsWith('/admin/links'),
  },
  {
    href: '/admin/bookings/new',
    label: 'New Booking',
    match: (p) => p === '/admin/bookings/new',
  },
];

export function AdminShell({ children, wide = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut, loading } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageResetting, setUsageResetting] = useState(false);

  const displayName = profile?.full_name || user?.name || user?.email || 'Admin';
  const username = user?.email || 'admin';
  const roleLabel = profile?.role === 'admin' || user?.role === 'admin' ? 'Admin' : 'User';

  useEffect(() => {
    if (!settingsOpen) return undefined;
    let cancelled = false;
    setUsageLoading(true);
    api
      .get('/api/admin/openai-usage')
      .then((data) => {
        if (!cancelled) setTokenUsage(data);
      })
      .catch(() => {
        if (!cancelled) setTokenUsage(null);
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen]);

  const handleResetUsage = async () => {
    setUsageResetting(true);
    try {
      const data = await api.post('/api/admin/openai-usage', { action: 'reset' });
      setTokenUsage(data);
    } catch {
      // keep previous counter on failure
    } finally {
      setUsageResetting(false);
    }
  };

  const handleSignOut = async () => {
    setSettingsOpen(false);
    await signOut();
    router.push('/login');
  };

  const renderNavLinks = () =>
    NAV_ITEMS.map((item) => {
      const active = item.match(pathname);
      return (
        <NavLink
          key={item.href}
          href={item.href}
          $active={active}
          aria-current={active ? 'page' : undefined}
        >
          {item.label}
        </NavLink>
      );
    });

  return (
    <DataRefreshProvider>
      <Shell>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Header>
          <Brand href="/admin">
            MPC <span>Booking</span>
          </Brand>

          <Nav aria-label="Primary">{renderNavLinks()}</Nav>

          <HeaderEnd>
            <DataRefreshButton />
            <NotificationsBell />
            <ThemeToggle variant="header" />
            {!loading && (
              <IconButton
                type="button"
                aria-label="Open settings"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon />
              </IconButton>
            )}
          </HeaderEnd>
        </Header>

        <MobileNav aria-label="Primary">{renderNavLinks()}</MobileNav>

        <MainRegion>
          <ScrollArea type="hover">
            <Main id="main-content" $wide={wide}>
              {children}
            </Main>
          </ScrollArea>
        </MainRegion>

        <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
          <Dialog.Portal>
            <SettingsOverlay />
            <SettingsPanel>
              <SettingsHeader>
                <div>
                  <SettingsTitle>Settings</SettingsTitle>
                  <SettingsDesc>Account and appearance</SettingsDesc>
                </div>
                <Dialog.Close asChild>
                  <CloseButton type="button" aria-label="Close settings">
                    ✕
                  </CloseButton>
                </Dialog.Close>
              </SettingsHeader>

              <SettingsBody>
                <ScrollArea type="hover">
                  <SettingsBodyInner>
                    <AccountCard>
                      <AccountName>{displayName}</AccountName>
                      <AccountMeta>
                        <MetaRow>
                          <dt>Email</dt>
                          <dd>{username}</dd>
                        </MetaRow>
                        <MetaRow>
                          <dt>Role</dt>
                          <dd>{roleLabel}</dd>
                        </MetaRow>
                      </AccountMeta>
                    </AccountCard>
                    <SettingsGroup>
                      <GroupLabel>OpenAI usage</GroupLabel>
                      <AccountCard>
                        <AccountMeta>
                          <MetaRow>
                            <dt>Spent tokens</dt>
                            <dd>
                              {usageLoading
                                ? '…'
                                : formatTokens(tokenUsage?.totalTokens)}
                            </dd>
                          </MetaRow>
                          <MetaRow>
                            <dt>Prompt</dt>
                            <dd>
                              {usageLoading
                                ? '…'
                                : formatTokens(tokenUsage?.promptTokens)}
                            </dd>
                          </MetaRow>
                          <MetaRow>
                            <dt>Completion</dt>
                            <dd>
                              {usageLoading
                                ? '…'
                                : formatTokens(tokenUsage?.completionTokens)}
                            </dd>
                          </MetaRow>
                          <MetaRow>
                            <dt>Requests</dt>
                            <dd>
                              {usageLoading
                                ? '…'
                                : formatTokens(tokenUsage?.requestCount)}
                            </dd>
                          </MetaRow>
                        </AccountMeta>
                        <UsageHint>
                          {tokenUsage?.openaiConfigured === false
                            ? 'OpenAI is not configured. Token counts stay at zero until document AI parsing runs.'
                            : 'Counts tokens from document AI parsing on this server.'}
                        </UsageHint>
                      </AccountCard>
                      <SettingsActions>
                        <Button
                          variant="secondary"
                          disabled={usageLoading || usageResetting || !tokenUsage?.totalTokens}
                          onClick={handleResetUsage}
                        >
                          {usageResetting ? 'Resetting…' : 'Reset counter'}
                        </Button>
                      </SettingsActions>
                    </SettingsGroup>
                  </SettingsBodyInner>
                </ScrollArea>
              </SettingsBody>

              <SettingsFooter>
                <SettingsGroup>
                  <GroupLabel>Account</GroupLabel>
                  <SettingsActions>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSettingsOpen(false);
                        setPasswordOpen(true);
                      }}
                    >
                      <KeyIcon />
                      Change password
                    </Button>
                    <Button variant="danger" onClick={handleSignOut}>
                      <SignOutIcon />
                      Sign out
                    </Button>
                  </SettingsActions>
                </SettingsGroup>
              </SettingsFooter>
            </SettingsPanel>
          </Dialog.Portal>
        </Dialog.Root>

        <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      </Shell>
    </DataRefreshProvider>
  );
}

export default AdminShell;
