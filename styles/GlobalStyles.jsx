'use client';

import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
    color-scheme: ${({ theme }) => theme.mode};
    height: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  body {
    margin: 0;
    min-height: 100%;
    height: 100%;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ theme }) => theme.fontSizes.md};
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text};
    background:
      radial-gradient(ellipse 80% 50% at 100% -10%, ${({ theme }) => theme.colors.glow}, transparent 55%),
      radial-gradient(ellipse 55% 40% at 0% 100%, ${({ theme }) => theme.colors.glowAccent}, transparent 50%),
      ${({ theme }) => theme.colors.bg};
    transition:
      background-color ${({ theme }) => theme.transitions.base},
      color ${({ theme }) => theme.transitions.base};
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.display};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: 1.2;
    margin: 0 0 ${({ theme }) => theme.space[3]};
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.colors.text};
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space[3]};
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
  }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  svg {
    color: inherit;
  }

  input, textarea, select {
    color-scheme: ${({ theme }) => theme.mode};
  }

  /*
   * Date/time picker icons: force a black glyph base, then invert in dark mode.
   * Mixing color-scheme:dark with invert() often leaves the icon black.
   */
  input[type='date'],
  input[type='time'],
  input[type='datetime-local'],
  input[type='month'],
  input[type='week'] {
    color-scheme: light;
  }

  input[type='date']::-webkit-calendar-picker-indicator,
  input[type='time']::-webkit-calendar-picker-indicator,
  input[type='datetime-local']::-webkit-calendar-picker-indicator,
  input[type='month']::-webkit-calendar-picker-indicator,
  input[type='week']::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.7;
  }

  html[data-theme='dark'] input[type='date']::-webkit-calendar-picker-indicator,
  html[data-theme='dark'] input[type='time']::-webkit-calendar-picker-indicator,
  html[data-theme='dark'] input[type='datetime-local']::-webkit-calendar-picker-indicator,
  html[data-theme='dark'] input[type='month']::-webkit-calendar-picker-indicator,
  html[data-theme='dark'] input[type='week']::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(1.25);
    opacity: 0.95;
  }

  html[data-theme='dark'] input[type='search']::-webkit-search-cancel-button {
    filter: invert(1);
  }

  :focus {
    outline: none;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }

  ::selection {
    background: ${({ theme }) => theme.colors.primaryMuted};
    color: ${({ theme }) => theme.colors.text};
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .skip-link {
    position: absolute;
    top: -100px;
    left: ${({ theme }) => theme.space[4]};
    z-index: 1000;
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
    background: ${({ theme }) => theme.colors.bgDark};
    color: ${({ theme }) => theme.colors.textInverse};
    border-radius: ${({ theme }) => theme.radii.md};
    text-decoration: none;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  .skip-link:focus {
    top: ${({ theme }) => theme.space[4]};
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  [data-disabled] {
    opacity: 0.55;
    pointer-events: none;
  }

  body[data-scroll-locked] {
    overflow: hidden;
    padding-right: var(--removed-body-scroll-bar-size, 0px);
  }
`;
