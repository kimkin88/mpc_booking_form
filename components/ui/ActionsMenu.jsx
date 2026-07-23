'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';

const MenuContent = styled(DropdownMenu.Content)`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: ${({ theme }) => theme.space[1]};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  min-width: 160px;
`;

const MenuItem = styled(DropdownMenu.Item)`
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  outline: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};

  &[data-disabled] {
    opacity: 0.45;
    pointer-events: none;
  }

  &[data-highlighted] {
    background: ${({ theme }) => theme.colors.primaryMuted};
  }
`;

const Chevron = styled.span`
  display: inline-flex;
  margin-left: 0.15rem;

  svg {
    width: 0.85rem;
    height: 0.85rem;
  }
`;

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Standard “Actions ▾” dropdown trigger used across admin tables/lists.
 */
export function ActionsMenu({
  label = 'Actions',
  variant = 'secondary',
  size = 'sm',
  align = 'end',
  disabled = false,
  children,
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          {label}
          <Chevron>
            <ChevronIcon />
          </Chevron>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <MenuContent align={align} sideOffset={4}>
          {children}
        </MenuContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ActionsMenuItem({ children, disabled, onSelect, ...props }) {
  return (
    <MenuItem disabled={disabled} onSelect={onSelect} {...props}>
      {children}
    </MenuItem>
  );
}

export { ChevronIcon };

export default ActionsMenu;
