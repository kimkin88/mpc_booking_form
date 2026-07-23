'use client';

import styled from 'styled-components';

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme, $tone }) =>
    $tone === 'danger' ? theme.colors.danger : theme.colors.textMuted};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  svg {
    width: 1.05rem;
    height: 1.05rem;
  }

  &:hover:not(:disabled) {
    background: ${({ theme, $tone }) =>
      $tone === 'danger' ? theme.colors.dangerMuted : theme.colors.bgMuted};
    color: ${({ theme, $tone }) =>
      $tone === 'danger' ? theme.colors.danger : theme.colors.text};
    border-color: ${({ theme, $tone }) =>
      $tone === 'danger' ? theme.colors.danger : theme.colors.border};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 6h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({
  label,
  tone = 'default',
  children,
  type = 'button',
  ...props
}) {
  return (
    <Btn type={type} $tone={tone} aria-label={label} title={label} {...props}>
      {children}
    </Btn>
  );
}

export function EditIconButton(props) {
  return (
    <IconButton label="Edit" {...props}>
      <PencilIcon />
    </IconButton>
  );
}

export function RemoveIconButton(props) {
  return (
    <IconButton label="Remove" tone="danger" {...props}>
      <TrashIcon />
    </IconButton>
  );
}

export default IconButton;
