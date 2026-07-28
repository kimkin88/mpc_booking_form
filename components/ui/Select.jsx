'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import styled from 'styled-components';
import { Field } from '@/components/ui/Input';

const Trigger = styled(SelectPrimitive.Trigger)`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  gap: ${({ theme }) => theme.space[2]};

  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.bgMuted};
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: not-allowed;
  }

  &[data-placeholder] {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Content = styled(SelectPrimitive.Content)`
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  min-width: var(--radix-select-trigger-width);
  max-height: min(500px, var(--radix-select-content-available-height));
`;

const Viewport = styled(SelectPrimitive.Viewport)`
  padding: ${({ theme }) => theme.space[1]};
  max-height: min(500px, var(--radix-select-content-available-height));
  overflow-y: auto;
`;

const Item = styled(SelectPrimitive.Item)`
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  outline: none;
  color: ${({ theme }) => theme.colors.text};

  &[data-highlighted] {
    background: ${({ theme }) => theme.colors.primaryMuted};
  }

  &[data-state='checked'] {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const Chevron = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.75rem;
  line-height: 1;
`;

export function Select({
  label,
  id,
  required,
  hint,
  error,
  value,
  onValueChange,
  placeholder = 'Select…',
  options = [],
  disabled,
  name,
  fullWidth = true,
}) {
  const inputId = id || name;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      required={required}
      hint={hint}
      error={error}
      fullWidth={fullWidth}
    >
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <Trigger id={inputId} aria-required={required} $error={!!error}>
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <Chevron aria-hidden>▾</Chevron>
          </SelectPrimitive.Icon>
        </Trigger>
        <SelectPrimitive.Portal>
          <Content position="popper" sideOffset={4}>
            <Viewport>
              {options.map((opt) => (
                <Item key={opt.value} value={opt.value}>
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </Item>
              ))}
            </Viewport>
          </Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </Field>
  );
}

export default Select;
