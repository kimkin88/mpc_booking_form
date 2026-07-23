'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import styled from 'styled-components';

const SwitchRoot = styled(SwitchPrimitive.Root)`
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  width: 2.75rem;
  height: 1.5rem;
  flex-shrink: 0;
  padding: 0.15rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.borderStrong};
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast};

  &[data-state='checked'] {
    background: ${({ theme }) => theme.colors.primary};
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.textMuted};
  }

  &[data-state='checked']:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SwitchThumb = styled(SwitchPrimitive.Thumb)`
  display: block;
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.onPrimary};
  border-radius: 999px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: transform ${({ theme }) => theme.transitions.fast};
  transform: translateX(0);
  will-change: transform;

  &[data-state='checked'] {
    transform: translateX(1.2rem);
  }
`;

const SwitchWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  min-width: 0;
`;

const SwitchRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.3;
  user-select: none;
`;

const Desc = styled.p`
  margin: 0;
  padding-left: calc(2.75rem + ${({ theme }) => theme.space[3]});
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.4;
`;

export function Switch({ checked, onCheckedChange, label, id, disabled, description }) {
  return (
    <SwitchWrap>
      <SwitchRow htmlFor={id} $disabled={disabled}>
        <SwitchRoot
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
        >
          <SwitchThumb />
        </SwitchRoot>
        {label}
      </SwitchRow>
      {description && <Desc id={`${id}-desc`}>{description}</Desc>}
    </SwitchWrap>
  );
}

const CheckboxRoot = styled(CheckboxPrimitive.Root)`
  all: unset;
  box-sizing: border-box;
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  border: 1.5px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textInverse};

  &[data-state='checked'] {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
  user-select: none;
`;

export function Checkbox({ checked, onCheckedChange, label, id, disabled }) {
  return (
    <CheckboxRow htmlFor={id}>
      <CheckboxRoot
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      >
        <CheckboxPrimitive.Indicator>✓</CheckboxPrimitive.Indicator>
      </CheckboxRoot>
      {label}
    </CheckboxRow>
  );
}
