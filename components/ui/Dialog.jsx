'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import styled, { keyframes } from 'styled-components';
import { Button } from '@/components/ui/Button';

const overlayShow = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const contentShow = keyframes`
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Overlay = styled(Dialog.Overlay)`
  background: ${({ theme }) => theme.colors.overlay};
  position: fixed;
  inset: 0;
  animation: ${overlayShow} 150ms ease;
  z-index: ${({ theme }) => theme.zIndex.modal};
`;

const Content = styled(Dialog.Content)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(
    ${({ $size }) => ($size === 'lg' ? '920px' : $size === 'sm' ? '400px' : '560px')},
    calc(100vw - 2rem)
  );
  max-height: calc(100vh - 2rem);
  overflow: auto;
  padding: ${({ theme }) => theme.space[6]};
  animation: ${contentShow} 180ms ease;
  z-index: ${({ theme }) => theme.zIndex.modal};
`;

const Title = styled(Dialog.Title)`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.space[2]};
`;

const Description = styled(Dialog.Description)`
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[6]};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Overlay />
        <Content $size={size} aria-describedby={description ? undefined : undefined}>
          <Title>{title}</Title>
          {description && <Description>{description}</Description>}
          {children}
          {footer && <Footer>{footer}</Footer>}
          <Dialog.Close asChild>
            <CloseButton aria-label="Close">×</CloseButton>
          </Dialog.Close>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const AlertOverlay = styled(AlertDialog.Overlay)`
  background: ${({ theme }) => theme.colors.overlay};
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
`;

const AlertContent = styled(AlertDialog.Content)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(480px, calc(100vw - 2rem));
  padding: ${({ theme }) => theme.space[6]};
  z-index: ${({ theme }) => theme.zIndex.modal};
`;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  danger = false,
  loading = false,
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertOverlay />
        <AlertContent>
          <AlertDialog.Title asChild>
            <Title as="h2">{title}</Title>
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <Description as="p">{description}</Description>
          </AlertDialog.Description>
          <Footer>
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={danger ? 'danger' : 'primary'}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Working…' : confirmLabel}
              </Button>
            </AlertDialog.Action>
          </Footer>
        </AlertContent>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
