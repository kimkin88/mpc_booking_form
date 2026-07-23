'use client';

import Link from 'next/link';
import styled from 'styled-components';

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[6]};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    margin-bottom: ${({ theme }) => theme.space[8]};
  }
`;

const Text = styled.div`
  flex: 1;
  min-width: 200px;
`;

const Breadcrumb = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const CrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;

const CrumbSep = styled.span`
  opacity: 0.5;
  user-select: none;
`;

const Eyebrow = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.5rem, 3vw, ${({ theme }) => theme.fontSizes['3xl']});
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  margin: ${({ theme }) => theme.space[2]} 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 42rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

export function PageHeader({ eyebrow, title, subtitle, actions, breadcrumbs }) {
  return (
    <Wrap>
      <Text>
        {breadcrumbs?.length > 0 && (
          <Breadcrumb aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} style={{ display: 'inline-flex', gap: '0.5rem' }}>
                {i > 0 && <CrumbSep aria-hidden>/</CrumbSep>}
                {crumb.href ? (
                  <CrumbLink href={crumb.href}>{crumb.label}</CrumbLink>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </span>
            ))}
          </Breadcrumb>
        )}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Text>
      {actions && <Actions>{actions}</Actions>}
    </Wrap>
  );
}

export const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[5]};
  margin-bottom: ${({ theme }) => theme.space[5]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  scroll-margin-top: calc(var(--portal-header-h, 3.5rem) + ${({ theme }) => theme.space[4]});
  transition: box-shadow ${({ theme }) => theme.transitions.base};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.space[6]};
  }

  &:focus-within {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.space[1]};
`;

export const SectionHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols || 2}, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[4]};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $gap }) => theme.space[$gap || 4]};
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
`;

/** Sits beside a Field control, aligned to the input (not the label or hint). */
export const FieldAddon = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  align-self: flex-start;
  /* Match Select/Input control height (padding + text + border) */
  min-height: calc(1.1rem + 1.25em + 2px);
  ${({ $withLabel, theme }) =>
    $withLabel
      ? `
    /* Skip past Field label + gap so we line up with the control only */
    margin-top: calc(${theme.fontSizes.sm} * 1.25 + ${theme.space[1]});
  `
      : ''}
`;

export const StickyActionBar = styled.div`
  position: sticky;
  bottom: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[6]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;
