'use client';

import styled from 'styled-components';
import { useThemeMode } from '@/contexts/ThemeContext';

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $compact }) => ($compact ? 'center' : 'flex-start')};
  gap: 0.5rem;
  min-height: ${({ $compact, $inHeader }) => {
    if ($inHeader) return '2.5rem';
    if ($compact) return '2rem';
    return '2.5rem';
  }};
  padding: 0
    ${({ theme, $compact, $inHeader }) =>
      $inHeader || $compact ? theme.space[2] : theme.space[4]};
  width: ${({ $compact, $inHeader }) => ($compact || $inHeader ? '2.5rem' : 'auto')};
  height: ${({ $inHeader }) => ($inHeader ? '2.5rem' : 'auto')};
  border: 1px solid
    ${({ theme, $inHeader }) =>
      $inHeader ? theme.colors.headerIconBorder : theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $inHeader }) => ($inHeader ? 'transparent' : theme.colors.surface)};
  color: ${({ theme, $inHeader }) => ($inHeader ? theme.colors.headerText : theme.colors.text)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme, $inHeader }) =>
      $inHeader ? theme.colors.headerIconHover : theme.colors.surfaceHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: ${({ $inHeader }) => ($inHeader ? '1.25rem' : '1.1rem')};
    height: ${({ $inHeader }) => ($inHeader ? '1.25rem' : '1.1rem')};
    flex-shrink: 0;
  }
`;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle({ variant = 'default', label, compact = false }) {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const text = label || (isDark ? 'Light mode' : 'Dark mode');
  const inHeader = variant === 'header';
  const isCompact = compact || variant === 'icon' || inHeader;

  return (
    <Toggle
      type="button"
      onClick={toggleMode}
      $inHeader={inHeader}
      $compact={isCompact}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={text}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {variant !== 'icon' && variant !== 'header' && <span>{text}</span>}
    </Toggle>
  );
}

export default ThemeToggle;
