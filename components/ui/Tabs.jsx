'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import styled from 'styled-components';

export const Tabs = styled(TabsPrimitive.Root)``;

export const TabsList = styled(TabsPrimitive.List)`
  display: flex;
  gap: ${({ theme }) => theme.space[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  overflow-x: auto;
  margin-bottom: ${({ theme }) => theme.space[6]};
`;

export const TabsTrigger = styled(TabsPrimitive.Trigger)`
  appearance: none;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  white-space: nowrap;
  transition:
    color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &[data-state='active'] {
    color: ${({ theme }) => theme.colors.text};
    border-bottom-color: ${({ theme }) => theme.colors.primary};
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: -2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;

export const TabsContent = styled(TabsPrimitive.Content)`
  outline: none;
  animation: tabIn 200ms ease;

  @keyframes tabIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TooltipContent = styled(TooltipPrimitive.Content)`
  background: ${({ theme }) => theme.colors.bgDark};
  color: ${({ theme }) => theme.colors.textInverse};
  padding: 0.5rem 0.7rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.45;
  max-width: min(280px, calc(100vw - 2rem));
  z-index: ${({ theme }) => theme.zIndex.dropdown};
`;

export function Tooltip({ content, children }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipContent sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow />
          </TooltipContent>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export const Accordion = styled(AccordionPrimitive.Root)``;

export const AccordionItem = styled(AccordionPrimitive.Item)`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

export const AccordionTrigger = styled(AccordionPrimitive.Trigger)`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.space[4]};
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-align: left;

  &[data-state='open'] > span {
    transform: rotate(180deg);
  }
`;

export const AccordionContent = styled(AccordionPrimitive.Content)`
  padding: 0 ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[4]};
  overflow: hidden;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.2;
  vertical-align: middle;
  background: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.successMuted;
    if ($tone === 'danger') return theme.colors.dangerMuted;
    if ($tone === 'warning') return theme.colors.warningMuted;
    if ($tone === 'info') return theme.colors.infoMuted;
    if ($tone === 'accent') return theme.colors.accentMuted;
    return theme.colors.bgMuted;
  }};
  color: ${({ theme, $tone }) => {
    if ($tone === 'success') return theme.colors.success;
    if ($tone === 'danger') return theme.colors.danger;
    if ($tone === 'warning') return theme.colors.warning;
    if ($tone === 'info') return theme.colors.info;
    if ($tone === 'accent') return theme.colors.accent;
    return theme.colors.textMuted;
  }};
  border: 1px solid currentColor;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.space[10]} ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.bgMuted};
`;

export const Spinner = styled.div`
  width: ${({ $size }) => $size || '1.25rem'};
  height: ${({ $size }) => $size || '1.25rem'};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const LoadingBlock = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[10]};
  color: ${({ theme }) => theme.colors.textMuted};
`;
