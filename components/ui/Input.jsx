'use client';

import styled, { css } from 'styled-components';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text};
`;

const Required = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  margin-left: 2px;
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger};
`;

const inputStyles = css`
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.bgMuted};
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
    opacity: 0.7;
  }

  /* Date / time picker glyph (WebKit / Chromium) */
  &[type='date'],
  &[type='time'],
  &[type='datetime-local'],
  &[type='month'],
  &[type='week'] {
    color-scheme: light;
  }

  &[type='date']::-webkit-calendar-picker-indicator,
  &[type='time']::-webkit-calendar-picker-indicator,
  &[type='datetime-local']::-webkit-calendar-picker-indicator,
  &[type='month']::-webkit-calendar-picker-indicator,
  &[type='week']::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            filter: invert(1) brightness(1.25);
            opacity: 0.95;
          `
        : css``}
  }
`;

const StyledInput = styled.input`
  ${inputStyles}
  border-color: ${({ theme, $error }) =>
    $error ? theme.colors.danger : theme.colors.border};

  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
    outline: none;
  }
`;

const StyledTextarea = styled.textarea`
  ${inputStyles}
  border-color: ${({ theme, $error }) =>
    $error ? theme.colors.danger : theme.colors.border};
  min-height: 96px;
  resize: vertical;

  &:focus {
    border-color: ${({ theme }) => theme.colors.focus};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
    outline: none;
  }
`;

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  fullWidth = true,
}) {
  return (
    <Wrap $fullWidth={fullWidth}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <Required aria-hidden="true">*</Required>}
          {required && <span className="sr-only"> (required)</span>}
        </Label>
      )}
      {children}
      {hint && !error && <Hint>{hint}</Hint>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Wrap>
  );
}

export function Input({ label, id, required, hint, error, fullWidth, ...props }) {
  const inputId = id || props.name;
  return (
    <Field
      label={label}
      htmlFor={inputId}
      required={required}
      hint={hint}
      error={error}
      fullWidth={fullWidth}
    >
      <StyledInput
        id={inputId}
        $error={!!error}
        aria-invalid={!!error}
        aria-required={required}
        required={required}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, id, required, hint, error, fullWidth, ...props }) {
  const inputId = id || props.name;
  return (
    <Field
      label={label}
      htmlFor={inputId}
      required={required}
      hint={hint}
      error={error}
      fullWidth={fullWidth}
    >
      <StyledTextarea
        id={inputId}
        $error={!!error}
        aria-invalid={!!error}
        aria-required={required}
        required={required}
        {...props}
      />
    </Field>
  );
}

export { StyledInput, StyledTextarea };
