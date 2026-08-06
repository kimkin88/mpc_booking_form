'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import styled from 'styled-components';

const Root = styled(ScrollAreaPrimitive.Root)`
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
`;

const Viewport = styled(ScrollAreaPrimitive.Viewport)`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  /* Prevent browser scroll-anchoring from reversing wheel direction when
     nested content height changes (fonts/styles/images on production). */
  overflow-anchor: none;

  /* Radix wraps children; keep block layout without forcing min-height
     (forced min-height: 100% can prevent nested panels from scrolling). */
  > div {
    display: block !important;
    min-height: 0 !important;
    overflow-anchor: none;
  }
`;

const Scrollbar = styled(ScrollAreaPrimitive.Scrollbar)`
  display: flex;
  user-select: none;
  touch-action: none;
  padding: 2px;
  background: transparent;
  transition: background ${({ theme }) => theme.transitions.fast};
  z-index: 1;

  &[data-orientation='vertical'] {
    width: 10px;
  }

  &[data-orientation='horizontal'] {
    flex-direction: column;
    height: 10px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.bgMuted};
  }
`;

const Thumb = styled(ScrollAreaPrimitive.Thumb)`
  flex: 1;
  background: ${({ theme }) => theme.colors.borderStrong};
  border-radius: 999px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    min-width: 44px;
    min-height: 44px;
  }
`;

/**
 * Radix Scroll Area wrapper.
 * Parent must give a bounded height (e.g. max-height / flex child with min-height: 0).
 */
export function ScrollArea({
  children,
  type = 'hover',
  className,
  style,
  horizontal = false,
  ...props
}) {
  return (
    <Root type={type} className={className} style={style} {...props}>
      <Viewport>{children}</Viewport>
      <Scrollbar orientation="vertical">
        <Thumb />
      </Scrollbar>
      {horizontal && (
        <Scrollbar orientation="horizontal">
          <Thumb />
        </Scrollbar>
      )}
      <ScrollAreaPrimitive.Corner />
    </Root>
  );
}

export default ScrollArea;
