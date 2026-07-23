'use client';

import styled from 'styled-components';

const Footer = styled.footer`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: ${({ $hasMeta }) => ($hasMeta ? 'space-between' : 'flex-end')};
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[6]}`};
  }
`;

const Meta = styled.div`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  min-width: 10rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: flex-end;
`;

const PagePad = styled.div`
  padding-bottom: 5.5rem;
`;

/**
 * Fixed bottom admin bar. Wrap page content in `AdminFooter.Pad` so it isn't covered.
 */
export function AdminFooter({ meta, actions, wide = false, children, ...props }) {
  const hasMeta = meta != null;
  return (
    <Footer role="contentinfo" $hasMeta={hasMeta} {...props}>
      {hasMeta && <Meta>{meta}</Meta>}
      {children}
      {actions != null && <Actions>{actions}</Actions>}
    </Footer>
  );
}

AdminFooter.Pad = PagePad;
AdminFooter.Meta = Meta;
AdminFooter.Actions = Actions;

export default AdminFooter;
