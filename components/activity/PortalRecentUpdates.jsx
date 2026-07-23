'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import { FIELD_LABELS } from '@/lib/constants';
import { formatDate } from '@/utils/format';

const Panel = styled.aside`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[4]};
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[1]};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Hint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[1]};
  margin: 0 0 ${({ theme }) => theme.space[4]};
`;

const FilterBtn = styled.button`
  appearance: none;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryMuted : theme.colors.bgMuted};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  padding: 0.3rem 0.55rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  line-height: 1.2;

  &:hover {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const RoleTag = styled.span`
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.65rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme, $role }) =>
    $role === 'admin' ? theme.colors.info : theme.colors.success};
`;

const Empty = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Tree = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const DayGroup = styled.section``;

const DayHeading = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Session = styled.div`
  position: relative;
  padding-left: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};

  &::before {
    content: '';
    position: absolute;
    left: 0.35rem;
    top: 0.55rem;
    bottom: 0.25rem;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const SessionDot = styled.span`
  position: absolute;
  left: 0;
  top: 0.4rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  border: 2px solid ${({ theme }) => theme.colors.surface};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
  z-index: 1;
`;

const SessionTime = styled.time`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const ChangeList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const ChangeItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FieldName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: 0.15rem;
`;

const ValueFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ValueChip = styled.span`
  display: inline-block;
  max-width: 100%;
  padding: 0.15rem 0.4rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) =>
    $tone === 'from' ? theme.colors.dangerMuted : theme.colors.successMuted};
  color: ${({ theme, $tone }) =>
    $tone === 'from' ? theme.colors.danger : theme.colors.success};
  word-break: break-word;
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
`;

const Meta = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ACTION_LABELS = {
  field_updated: 'Updated',
  status_changed: 'Status changed',
  schedule_entry_added: 'Schedule added',
  schedule_entry_updated: 'Schedule updated',
  schedule_entry_removed: 'Schedule removed',
  site_entry_added: 'Site added',
  site_entry_updated: 'Site updated',
  site_entry_removed: 'Site removed',
  file_uploaded: 'File uploaded',
  file_status_changed: 'File status changed',
  booking_submitted: 'Submitted',
};

function humanize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Empty';
    return value.map((v) => formatValue(v)).join(', ');
  }
  if (typeof value === 'object') {
    if (value.original_filename) return value.original_filename;
    if (value.format && value.shoot_date) return `${value.format} on ${value.shoot_date}`;
    if (value.site_name) {
      return value.type ? `${value.site_name} (${value.type})` : value.site_name;
    }
    if (value.filename) return value.filename;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function fieldLabel(item) {
  if (item.field_name) return FIELD_LABELS[item.field_name] || humanize(item.field_name);
  if (item.section) return FIELD_LABELS[item.section] || humanize(item.section);
  return ACTION_LABELS[item.action] || humanize(item.action);
}

function timeLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function dayKey(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toISOString().slice(0, 10);
}

function dayHeading(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = d.toISOString().slice(0, 10);
  if (key === today.toISOString().slice(0, 10)) return 'Today';
  if (key === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return formatDate(d);
}

function buildTree(items) {
  const byDay = new Map();
  items.forEach((item) => {
    const day = dayKey(item.created_at);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(item);
  });

  return Array.from(byDay.entries()).map(([, dayItems]) => {
    const sessions = [];
    dayItems.forEach((item) => {
      const stamp = `${timeLabel(item.created_at)}|${item.actor_role || ''}|${item.actor_name || ''}`;
      const last = sessions[sessions.length - 1];
      if (last && last.stamp === stamp) {
        last.changes.push(item);
      } else {
        sessions.push({
          id: item.id,
          stamp,
          time: timeLabel(item.created_at),
          created_at: item.created_at,
          actor_role: item.actor_role,
          actor_name: item.actor_name,
          changes: [item],
        });
      }
    });
    return {
      day: dayKey(dayItems[0]?.created_at),
      label: dayHeading(dayItems[0]?.created_at),
      sessions,
    };
  });
}

const ROLE_FILTERS = [
  { value: 'client', label: 'Client' },
  { value: 'admin', label: 'Admin' },
  { value: 'all', label: 'All' },
];

export function PortalRecentUpdates({
  items = [],
  title = 'Recent updates',
  hint = 'Your changes on this booking',
  empty = 'No updates yet. Your changes will appear here.',
  role,
  onRoleChange,
}) {
  const tree = useMemo(() => buildTree(items), [items]);
  const showRoleFilter = typeof onRoleChange === 'function' && role != null;
  const showRoleTags = role === 'all';

  return (
    <Panel aria-label={title}>
      <Title>{title}</Title>
      <Hint>{hint}</Hint>

      {showRoleFilter && (
        <FilterRow role="tablist" aria-label="Update source">
          {ROLE_FILTERS.map((opt) => (
            <FilterBtn
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={role === opt.value}
              $active={role === opt.value}
              onClick={() => onRoleChange(opt.value)}
            >
              {opt.label}
            </FilterBtn>
          ))}
        </FilterRow>
      )}

      {items.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <Tree>
          {tree.map((group) => (
            <DayGroup key={group.day}>
              <DayHeading>{group.label}</DayHeading>
              {group.sessions.map((session) => (
                <Session key={session.id}>
                  <SessionDot aria-hidden />
                  <SessionTime dateTime={session.created_at}>
                    {session.time}
                    {showRoleTags && session.actor_role && (
                      <RoleTag $role={session.actor_role}>
                        {session.actor_role === 'admin' ? 'Admin' : 'Client'}
                      </RoleTag>
                    )}
                  </SessionTime>
                  <ChangeList>
                    {session.changes.map((item) => {
                      const hasValues =
                        item.previous_value != null ||
                        item.new_value != null ||
                        item.action === 'field_updated';

                      return (
                        <ChangeItem key={item.id}>
                          <FieldName>{fieldLabel(item)}</FieldName>
                          {hasValues ? (
                            <ValueFlow>
                              <ValueChip $tone="from">{formatValue(item.previous_value)}</ValueChip>
                              <Arrow aria-hidden>→</Arrow>
                              <ValueChip $tone="to">{formatValue(item.new_value)}</ValueChip>
                            </ValueFlow>
                          ) : (
                            <Meta>{ACTION_LABELS[item.action] || humanize(item.action)}</Meta>
                          )}
                        </ChangeItem>
                      );
                    })}
                  </ChangeList>
                </Session>
              ))}
            </DayGroup>
          ))}
        </Tree>
      )}
    </Panel>
  );
}

export default PortalRecentUpdates;
