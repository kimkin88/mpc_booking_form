'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
  from { transform: translateX(110%); }
  to { transform: translateX(0); }
`;

const Viewport = styled(ToastPrimitive.Viewport)`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(380px, calc(100vw - 2rem));
  z-index: ${({ theme }) => theme.zIndex.toast};
  outline: none;
`;

const Root = styled(ToastPrimitive.Root)`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid
    ${({ theme, $variant }) => {
      if ($variant === 'success') return theme.colors.success;
      if ($variant === 'error') return theme.colors.danger;
      if ($variant === 'warning') return theme.colors.warning;
      return theme.colors.info;
    }};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space[4]} ${theme.space[8]} ${theme.space[4]} ${theme.space[4]}`};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${slideIn} 180ms ease;
  opacity: 1;
`;

const Title = styled(ToastPrimitive.Title)`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled(ToastPrimitive.Description)`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: 0.25rem;
  color: ${({ theme }) => theme.colors.text};
  opacity: 1;
`;

const Close = styled(ToastPrimitive.Close)`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
`;

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title || (options.variant === 'error' ? 'Error' : 'Success'),
        description: message,
        variant: options.variant || 'success',
      },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Root
            key={t.id}
            $variant={t.variant}
            duration={4500}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <Title>{t.title}</Title>
            {t.description && <Description>{t.description}</Description>}
            <Close aria-label="Dismiss">×</Close>
          </Root>
        ))}
        <Viewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
