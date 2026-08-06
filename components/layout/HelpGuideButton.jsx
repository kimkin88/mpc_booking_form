'use client';

import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

const Trigger = styled.button`
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

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1 1 auto;
  /* Fixed height so switching topics does not resize the modal */
  height: min(70vh, 36rem);
  min-height: min(70vh, 36rem);
  max-height: min(70vh, 36rem);
  min-width: 0;
  overflow: hidden;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 11.5rem minmax(0, 1fr);
    gap: ${({ theme }) => theme.space[4]};
  }
`;

const Sidebar = styled.nav`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-content: flex-start;
  flex-shrink: 0;
  min-height: 0;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    flex-wrap: nowrap;
    border-right: 1px solid ${({ theme }) => theme.colors.border};
    padding-right: ${({ theme }) => theme.space[3]};
    overflow-x: hidden;
    overflow-y: auto;
    overflow-anchor: none;
    overscroll-behavior: contain;
    max-height: 100%;
  }
`;

const NavBtn = styled.button`
  display: block;
  width: auto;
  text-align: left;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryMuted : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.4rem 0.65rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.medium};
  cursor: pointer;
  line-height: 1.3;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 1px;
  }
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`;

const SearchField = styled.input`
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.55rem 0.75rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ScrollBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overflow-anchor: none;
  overscroll-behavior: contain;
  padding-right: 0.25rem;
`;

const SectionBlock = styled.section`
  margin-bottom: ${({ theme }) => theme.space[5]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Topic = styled.div`
  margin-bottom: ${({ theme }) => theme.space[3]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const TopicTitle = styled.h4`
  margin: 0 0 0.35rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const List = styled.ul`
  margin: 0;
  padding-left: 1.15rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.55;

  li + li {
    margin-top: 0.3rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Empty = styled.p`
  margin: ${({ theme }) => theme.space[4]} 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Mark = styled.mark`
  background: ${({ theme }) => theme.colors.warningMuted};
  color: inherit;
  padding: 0 0.1em;
  border-radius: 2px;
`;

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.6 9.4a2.4 2.4 0 1 1 3.7 2c-.7.4-1.3.9-1.3 1.8V14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** @typedef {{ title: string, bullets: string[] }} HelpTopic */
/** @typedef {{ id: string, label: string, title: string, topics: HelpTopic[] }} HelpSection */

/** @type {HelpSection[]} */
const ADMIN_SECTIONS = [
  {
    id: 'start',
    label: 'Getting started',
    title: 'Getting started',
    topics: [
      {
        title: 'Sign in',
        bullets: [
          'Open the app and go to Sign in.',
          'Use your admin email and password.',
          'Only accounts with the admin role can open Bookings and other admin pages.',
          'Change your password anytime from Settings (gear icon) → Change password (minimum 6 characters).',
        ],
      },
      {
        title: 'Header controls',
        bullets: [
          'Refresh reloads the current page data (list, booking, or sent links).',
          'This Help button opens this guide.',
          'The bell shows in-app notifications from client activity.',
          'Theme switches light and dark appearance.',
          'Settings shows your account, OpenAI usage (document AI), password change, and Sign out.',
        ],
      },
    ],
  },
  {
    id: 'nav',
    label: 'Navigation',
    title: 'Main navigation',
    topics: [
      {
        title: 'Bookings',
        bullets: [
          'Home page after login. Search by SB number, campaign, or client.',
          'Filter by booking status and change sort order.',
          'Open a row to enter the booking workspace. Delete requires confirmation.',
          'Pagination shows 20 bookings per page.',
        ],
      },
      {
        title: 'Sent Links',
        bullets: [
          'Lists every client portal URL across bookings.',
          'See portal status, first opened, and last activity.',
          'Copy or Open a link, or jump back to the Booking.',
        ],
      },
      {
        title: 'New Booking',
        bullets: [
          'Creates a draft booking with an SB number (suggested as SB-YYYY-NNN; use Regenerate if needed).',
          'Enter brand, campaign, client, city/market, currency, and budget as known.',
          'Currency is optional on create. Defaults include day rates 640 / 1040 (JCD Rates) and MPC Chooses Sites on.',
        ],
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Booking workspace',
    title: 'Booking workspace',
    topics: [
      {
        title: 'Tabs',
        bullets: [
          'Details — form sections, sites, files, and save.',
          'Calendar — shoot days and live media formats.',
          'Portal & Permissions — client link, PIN, lock, field rules, reminders.',
          'Activity & Versions — change history and revert.',
        ],
      },
      {
        title: 'Saving',
        bullets: [
          'Use Save Booking. Unsaved changes appear as a badge.',
          'Discard clears local edits back to the last saved state.',
          'If a version conflict appears, load the latest data before saving again (often the client saved first).',
          'While the client is editing, a remote-updates banner may appear — use Load latest when needed.',
        ],
      },
      {
        title: 'Booking status',
        bullets: [
          'Statuses: Draft → Waiting for Client → Client Updating → Ready for Review → Changes Requested → Approved → In Production → Completed (also Archived / Cancelled).',
          'Change status from the Details header select, then save.',
          'Client Submit moves the booking toward Ready for Review; it does not lock the portal by itself.',
        ],
      },
    ],
  },
  {
    id: 'details',
    label: 'Details form',
    title: 'Details form',
    topics: [
      {
        title: 'Brand & commercial',
        bullets: [
          'Brand, Campaign, Reference Number, PO Number (with PO upload), Budget, Currency.',
          'MPC Booking Owner and Backup Owner (admin only) help route notifications.',
          'Rate card: label, half-day and full-day rates. Optional “use remaining for extra shots”.',
        ],
      },
      {
        title: 'Contacts',
        bullets: [
          'Client Name and Email (needed for reminders).',
          'CC / team emails and JCD contact name/email.',
        ],
      },
      {
        title: 'Shoot requirements',
        bullets: [
          'Add preferred shoot days with day length (0.5 or 1) and city.',
          'Adding days requires budget and enough remaining balance for at least a half day.',
          'Delivery due date is calculated from campaign start and format (Digital 5 working days; Paper/Both 8; Other → TBC).',
          'In-Charge and portal lock date (Friday before the in-charge period) are calculated from the earliest preferred shoot date, or campaign start.',
        ],
      },
      {
        title: 'Sites & notes',
        bullets: [
          'MPC Chooses Sites is on by default. Turn off to collect must-shoot / avoid sites from the form.',
          'Internal Notes are admin-only and never shown on the portal.',
        ],
      },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    title: 'Calendar (Shoot Schedule & Live Dates)',
    topics: [
      {
        title: 'Reading the grid',
        bullets: [
          'Opens on the current month. Use chevrons to change month.',
          'Today is a filled coral day number. Selected day has a coral cell border.',
          'Orange filled numbers also mark shoot requirement days.',
          'Coloured bars are live media formats (aligned by lane across days).',
        ],
      },
      {
        title: 'Editing',
        bullets: [
          'Click a day to select it and see the detail panel.',
          'Use the pencil on the selected day (or Edit day / double-click) to open the day editor.',
          'Add, edit, or remove shoot days and live format ranges in the modal.',
          'Click a format badge under the grid to jump to that format’s start date.',
        ],
      },
    ],
  },
  {
    id: 'portal',
    label: 'Portal & permissions',
    title: 'Client portal & permissions',
    topics: [
      {
        title: 'Share a link',
        bullets: [
          'Generate Link (first time), then Copy link or Open portal.',
          'Optional PIN (about 4–8 digits), Show/Hide, Copy PIN, Remove PIN.',
          'Optional expiry date — Set or Clear.',
          'Regenerate creates a new URL; the old link stops working — tell the client.',
          'Disable / Re-enable stops or restores access without deleting history.',
        ],
      },
      {
        title: 'Locking',
        bullets: [
          'Lock makes the portal read-only. Unlock restores editing.',
          'Unlock also turns off auto-lock for that booking so it is not locked again immediately — re-enable auto-lock if you still want it.',
          'Auto-lock can run on/after the portal lock date (cron and when the portal opens), unless disabled or manually unlocked.',
        ],
      },
      {
        title: 'Field permissions',
        bullets: [
          'Levels: Hidden, Read-only, Editable, Required.',
          'Required fields must be filled before the client can Submit.',
          'Some fields stay blocked for clients even if mis-set (rates, owners, SB number, internal notes, and similar).',
          'Editable by booking status controls whether the portal stays editable for each status (defaults: editable through review/changes; read-only after Approved).',
        ],
      },
      {
        title: 'Reminders',
        bullets: [
          'Missing-field reminder emails can send at offsets before the lock date (default 7, 3, and 1 days).',
          'Use Send missing-fields reminder now for an immediate email when addresses exist.',
          'Recipients: client email, JCD contact, and CC emails when present.',
        ],
      },
    ],
  },
  {
    id: 'files',
    label: 'Files & import',
    title: 'Files & document import',
    topics: [
      {
        title: 'Files',
        bullets: [
          'Categories in the UI: Purchase Order, Media Plan, Site Lists, Creatives.',
          'Category status: Missing → Requested → Uploaded → Under Review → Approved / Rejected / Not Required.',
          'Upload, replace, soft-delete; admins can restore. Default max size about 25MB.',
          'Supported types include images, PDF, Office, CSV, TXT, and common archives.',
        ],
      },
      {
        title: 'Autofill from documents',
        bullets: [
          'From Media Plan options or the import dialog: upload Excel (.xlsx) or parse existing uploads.',
          'Supports OOH media-plan layouts and multi-market MPC brief sheets (pick the market sheet when asked).',
          'Optional OpenAI enrichment when configured — review mapped fields before Apply.',
          'Applies booking fields, sites, and live calendar formats. Shoot requirement days are not auto-created — add them manually.',
          'Media-plan money is not copied into shoot Budget (may appear in internal notes instead).',
        ],
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity & versions',
    title: 'Activity & versions',
    topics: [
      {
        title: 'Activity',
        bullets: [
          'Recent updates appear in the booking sidebar while the client works.',
          'Activity & Versions tab (and full Activity page) show searchable change history with before/after values.',
        ],
      },
      {
        title: 'Versions',
        bullets: [
          'Compare versions and revert the full booking, one section, or one field.',
          'Revert always creates a new version — history is kept.',
        ],
      },
    ],
  },
  {
    id: 'notify',
    label: 'Notifications',
    title: 'Notifications',
    topics: [
      {
        title: 'In-app bell',
        bullets: [
          'Examples: client opened portal, updated booking, uploaded or removed files, completed required fields, PIN lockout, reminder failures, auto-lock.',
          'Click an item to mark it read; use Mark all read when catching up.',
          'Owner matching prefers MPC Booking Owner name when it matches an admin profile.',
        ],
      },
    ],
  },
  {
    id: 'tips',
    label: 'Tips',
    title: 'Tips & common pitfalls',
    topics: [
      {
        title: 'Recommended flow',
        bullets: [
          'Create booking → set budget/rates → optional document import → add shoot days → generate portal → set Required fields → share link (+ PIN) → monitor bell / Sent Links → review on Ready for Review.',
        ],
      },
      {
        title: 'Watch outs',
        bullets: [
          'Do not regenerate the portal casually without telling the client.',
          'Sites are managed in admin Details — the client portal page does not show the Sites UI.',
          'After Unlock, remember auto-lock is turned off until you enable it again.',
          'There is no separate reports dashboard — use Bookings filters, Sent Links, and Activity.',
        ],
      },
    ],
  },
];

/** @type {HelpSection[]} */
const PORTAL_SECTIONS = [
  {
    id: 'start',
    label: 'Getting started',
    title: 'Getting started',
    topics: [
      {
        title: 'Open your link',
        bullets: [
          'Use the unique link MPC sent you. Bookmark it if you will return later.',
          'If asked, enter the PIN and continue. Too many wrong attempts can temporarily lock PIN entry — wait and retry, or ask MPC for help.',
          'The header shows the booking name, status, and whether the form is Editable or Read-only.',
        ],
      },
      {
        title: 'Header controls',
        bullets: [
          'Refresh reloads the latest form from MPC. Confirm if you have unsaved local changes.',
          'This Help button opens this guide.',
          'Theme switches light and dark.',
        ],
      },
    ],
  },
  {
    id: 'form',
    label: 'Filling the form',
    title: 'Filling the form',
    topics: [
      {
        title: 'Sections',
        bullets: [
          'Only sections and fields MPC made visible appear for you.',
          'On larger screens, use the left navigation to jump between sections.',
          'Required fields must be completed before Submit.',
        ],
      },
      {
        title: 'Auto-save',
        bullets: [
          'Edits save automatically. Watch for Saving… then Saved in the header.',
          'If you see Update failed, change a field and try again, or refresh and re-enter the change.',
          'Unsaved means a change is still waiting to save — stay on the page briefly.',
        ],
      },
      {
        title: 'Read-only mode',
        bullets: [
          'If the header says Read-only, MPC has locked editing (or the booking status no longer allows edits).',
          'Contact your MPC booking owner if you need changes after lock.',
        ],
      },
    ],
  },
  {
    id: 'shoot',
    label: 'Shoot & rates',
    title: 'Shoot days & rate card',
    topics: [
      {
        title: 'Preferred shoot days',
        bullets: [
          'Add preferred dates and day length when the form allows it.',
          'You can only add a day when enough remaining budget covers a half or full day rate.',
          'Delivery and lock dates may show as information calculated by MPC.',
        ],
      },
      {
        title: 'Rate card',
        bullets: [
          'The left rate card shows half-day / full-day rates and remaining budget.',
          'Rates are set by MPC and are read-only for you.',
        ],
      },
    ],
  },
  {
    id: 'files',
    label: 'Files',
    title: 'Uploading files',
    topics: [
      {
        title: 'What to upload',
        bullets: [
          'Upload into the categories shown (for example Purchase Order, Media Plan, Site Lists, Creatives).',
          'You can replace a file when the section allows it.',
          'Some files cannot be removed after they are under review or approved — ask MPC if you need a change.',
        ],
      },
    ],
  },
  {
    id: 'submit',
    label: 'Submit',
    title: 'Submit for review',
    topics: [
      {
        title: 'When you are ready',
        bullets: [
          'Complete required fields and uploads.',
          'Press Submit at the bottom. You should see a success message.',
          'You can usually keep editing after Submit unless the form becomes Read-only.',
          'MPC will review and may ask for more information (status may move to Changes Requested).',
        ],
      },
    ],
  },
  {
    id: 'tips',
    label: 'Tips',
    title: 'Tips',
    topics: [
      {
        title: 'If something looks wrong',
        bullets: [
          'Use Refresh to pull the latest version from MPC.',
          'Keep the same portal link — regenerating it (done by MPC) would invalidate your bookmark.',
          'For access problems (PIN, expired link, read-only), contact your MPC booking owner.',
        ],
      },
    ],
  },
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD');
}

function highlight(text, query) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let start = 0;
  let idx = lower.indexOf(needle, start);
  if (idx === -1) return text;
  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(<Mark key={`${idx}-${start}`}>{text.slice(idx, idx + needle.length)}</Mark>);
    start = idx + needle.length;
    idx = lower.indexOf(needle, start);
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

function filterSections(sections, query) {
  const q = normalize(query).trim();
  if (!q) return sections;
  return sections
    .map((section) => {
      const topics = section.topics
        .map((topic) => {
          const bullets = topic.bullets.filter(
            (b) =>
              normalize(b).includes(q) ||
              normalize(topic.title).includes(q) ||
              normalize(section.title).includes(q) ||
              normalize(section.label).includes(q)
          );
          const topicHit =
            normalize(topic.title).includes(q) ||
            normalize(section.title).includes(q) ||
            normalize(section.label).includes(q);
          if (topicHit && bullets.length === 0) {
            return { ...topic, bullets: topic.bullets };
          }
          if (bullets.length === 0) return null;
          return { ...topic, bullets };
        })
        .filter(Boolean);
      if (topics.length === 0) return null;
      return { ...section, topics };
    })
    .filter(Boolean);
}

/**
 * Header help control — searchable how-to guide for admins or portal clients.
 * @param {{ variant?: 'admin' | 'portal' }} props
 */
export function HelpGuideButton({ variant = 'admin' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('start');
  const scrollRef = useRef(null);
  const isPortal = variant === 'portal';
  const allSections = isPortal ? PORTAL_SECTIONS : ADMIN_SECTIONS;

  const filtered = useMemo(() => filterSections(allSections, query), [allSections, query]);

  const activeSection =
    filtered.find((s) => s.id === activeId) || filtered[0] || null;

  const scrollToSection = (sectionId, { smooth = false } = {}) => {
    const root = scrollRef.current;
    if (!root) return;
    if (!sectionId || !query.trim()) {
      root.scrollTop = 0;
      return;
    }
    const el = root.querySelector(`#help-${sectionId}`);
    if (!el) {
      root.scrollTop = 0;
      return;
    }
    const top = el.offsetTop - root.offsetTop;
    if (smooth) {
      root.scrollTo({ top, behavior: 'smooth' });
    } else {
      root.scrollTop = top;
    }
  };

  const selectSection = (sectionId) => {
    setActiveId(sectionId);
    requestAnimationFrame(() => scrollToSection(sectionId, { smooth: Boolean(query.trim()) }));
  };

  const openGuide = () => {
    setQuery('');
    setActiveId('start');
    setOpen(true);
  };

  return (
    <>
      <Trigger
        type="button"
        aria-label={isPortal ? 'How to use this portal' : 'How to use MPC Booking'}
        title={isPortal ? 'How to use this portal' : 'How to use MPC Booking'}
        onClick={openGuide}
      >
        <HelpIcon />
      </Trigger>

      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery('');
        }}
        title={isPortal ? 'How to use this portal' : 'How to use MPC Booking'}
        description={
          isPortal
            ? 'Search or browse topics to complete and submit your booking form.'
            : 'Search or browse topics for bookings, portal links, calendar, files, and more.'
        }
        size="lg"
        scrollable
        footer={
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <Layout>
          <Sidebar aria-label="Help topics">
            {(query.trim() ? filtered : allSections).map((section) => {
              const visible = filtered.some((s) => s.id === section.id);
              if (query.trim() && !visible) return null;
              const selected = (activeSection?.id || activeId) === section.id;
              return (
                <NavBtn
                  key={section.id}
                  type="button"
                  $active={selected}
                  onClick={() => selectSection(section.id)}
                >
                  {section.label}
                </NavBtn>
              );
            })}
          </Sidebar>

          <Main>
            <SearchField
              type="search"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                const next = filterSections(allSections, value);
                const nextId =
                  next.find((s) => s.id === activeId)?.id || next[0]?.id || activeId;
                setActiveId(nextId);
                requestAnimationFrame(() => {
                  scrollRef.current && (scrollRef.current.scrollTop = 0);
                });
              }}
              placeholder="Search help… e.g. portal, PIN, calendar, Submit"
              aria-label="Search help"
              autoComplete="off"
            />

            <ScrollBody ref={scrollRef}>
              {!activeSection ? (
                <Empty>No topics match “{query.trim()}”. Try another word.</Empty>
              ) : query.trim() ? (
                filtered.map((section) => (
                  <SectionBlock key={section.id} id={`help-${section.id}`}>
                    <SectionTitle>{highlight(section.title, query)}</SectionTitle>
                    {section.topics.map((topic) => (
                      <Topic key={topic.title}>
                        <TopicTitle>{highlight(topic.title, query)}</TopicTitle>
                        <List>
                          {topic.bullets.map((bullet) => (
                            <li key={bullet}>{highlight(bullet, query)}</li>
                          ))}
                        </List>
                      </Topic>
                    ))}
                  </SectionBlock>
                ))
              ) : (
                <SectionBlock id={`help-${activeSection.id}`}>
                  <SectionTitle>{activeSection.title}</SectionTitle>
                  {activeSection.topics.map((topic) => (
                    <Topic key={topic.title}>
                      <TopicTitle>{topic.title}</TopicTitle>
                      <List>
                        {topic.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </List>
                    </Topic>
                  ))}
                </SectionBlock>
              )}
            </ScrollBody>
          </Main>
        </Layout>
      </Modal>
    </>
  );
}

export default HelpGuideButton;
