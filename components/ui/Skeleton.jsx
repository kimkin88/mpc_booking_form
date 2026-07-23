'use client';

import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`;

export const Skeleton = styled.div`
  display: block;
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '1rem'};
  border-radius: ${({ theme, $radius }) => $radius || theme.radii.md};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.bgMuted} 0%,
    ${({ theme }) => theme.colors.surfaceHover} 45%,
    ${({ theme }) => theme.colors.bgMuted} 90%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => theme.space[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SkeletonTable = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`;

export function TableSkeleton({ rows = 5, cols = '140px 1.2fr 1fr 120px 140px 140px' }) {
  return (
    <SkeletonTable role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} $cols={cols}>
          <Skeleton $height="1.1rem" />
          <Skeleton $height="1.1rem" />
          <Skeleton $height="1.1rem" />
          <Skeleton $height="1.1rem" $width="70%" />
          <Skeleton $height="1.1rem" $width="60%" />
          <Skeleton $height="1.1rem" $width="80%" />
        </SkeletonRow>
      ))}
      <span className="sr-only">Loading content…</span>
    </SkeletonTable>
  );
}

export default Skeleton;
