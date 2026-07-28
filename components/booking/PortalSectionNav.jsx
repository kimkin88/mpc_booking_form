'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

const Nav = styled.nav`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[4]};
`;

const Title = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[1]};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Hint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const NavLink = styled.a`
  display: block;
  padding: 0.45rem 0.65rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.fontWeights.semibold : theme.fontWeights.medium};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primaryMuted : 'transparent')};
  border-left: 3px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  text-decoration: none;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
  }
`;

/**
 * Sticky section jump links for the client portal form (left rail).
 * @param {{ sections: { id: string, label: string }[] }} props
 */
export function PortalSectionNav({ sections = [] }) {
  const sectionIds = useMemo(() => sections.map((s) => s.id).join('|'), [sections]);
  const firstSectionId = sections[0]?.id || null;
  const [activeId, setActiveId] = useState(firstSectionId);
  const [syncedSectionIds, setSyncedSectionIds] = useState(sectionIds);

  if (sectionIds !== syncedSectionIds) {
    setSyncedSectionIds(sectionIds);
    setActiveId(firstSectionId);
  }

  useEffect(() => {
    if (!sections.length) return undefined;

    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!nodes.length) return undefined;

    const ratios = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId) setActiveId(bestId);
      },
      {
        rootMargin: '-15% 0px -60% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionIds, sections]);

  const jumpTo = (id, e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  if (!sections.length) return null;

  return (
    <Nav aria-label="Form sections">
      <Title>On this form</Title>
      <Hint>Jump to a section</Hint>
      <List>
        {sections.map((section) => (
          <li key={section.id}>
            <NavLink
              href={`#${section.id}`}
              $active={activeId === section.id}
              onClick={(e) => jumpTo(section.id, e)}
              aria-current={activeId === section.id ? 'true' : undefined}
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </List>
    </Nav>
  );
}
