'use client';

import styled from 'styled-components';

const Wrap = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.space[10]} ${({ theme }) => theme.space[4]};
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.bgMuted};
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xl};
`;

const Description = styled.p`
  margin: 0 auto ${({ theme }) => theme.space[5]};
  max-width: 28rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: center;
`;

/**
 * Prefer this over the bare EmptyState styled div when you need guidance + CTA.
 */
export function EmptyStateBlock({ title, description, children, actions }) {
  return (
    <Wrap role="status">
      {title && <Title>{title}</Title>}
      {description && <Description>{description}</Description>}
      {children}
      {actions && <Actions>{actions}</Actions>}
    </Wrap>
  );
}

export default EmptyStateBlock;
