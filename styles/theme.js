/**
 * MPC brand themes — neon magenta / electric red light trails on black,
 * with indigo cool accents. Poppins as the primary typeface.
 */

const shared = {
  fonts: {
    display: "'Poppins', 'Helvetica Neue', sans-serif",
    body: "'Poppins', 'Helvetica Neue', sans-serif",
    mono: "'IBM Plex Mono', 'Menlo', monospace",
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.375rem',
    '2xl': '1.75rem',
    '3xl': '2.25rem',
    '4xl': '3rem',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  space: {
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  transitions: {
    fast: '120ms ease',
    base: '200ms ease',
    slow: '320ms ease',
  },
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    /** Menus / selects that open inside dialogs */
    popover: 350,
    toast: 400,
  },
};

/** Magenta / red from the MPC light-trail mark */
const brand = {
  magenta: '#FF2D6B',
  magentaHover: '#E01F58',
  magentaDeep: '#C4184A',
  red: '#FF3B4A',
  indigo: '#3B3F8C',
  indigoDeep: '#1A1B4B',
  cyan: '#4CC9F0',
  black: '#050508',
};

export const lightTheme = {
  ...shared,
  mode: 'light',
  colors: {
    bg: '#F5F5FA',
    bgElevated: '#FFFFFF',
    bgMuted: '#EBECF5',
    bgDark: brand.black,
    surface: '#FFFFFF',
    surfaceHover: '#F0F1F8',
    border: '#D5D7E8',
    borderStrong: '#A8ACC8',
    text: '#12122A',
    textMuted: '#5C6078',
    textInverse: '#F7F7FB',
    onPrimary: '#FFFFFF',
    primary: brand.magenta,
    primaryHover: brand.magentaHover,
    primaryMuted: '#FFE0EA',
    accent: brand.indigo,
    accentMuted: '#E4E6F6',
    danger: '#D92D20',
    dangerMuted: '#FEE4E2',
    warning: '#B54708',
    warningMuted: '#FEF0C7',
    success: '#027A48',
    successMuted: '#D1FADF',
    info: brand.indigo,
    infoMuted: '#E0E7FF',
    focus: brand.magenta,
    overlay: 'rgba(5, 5, 8, 0.5)',
    headerBg: '#FFFFFF',
    headerText: '#12122A',
    headerMuted: '#5C6078',
    headerBorder: '#D5D7E8',
    headerIconBorder: 'rgba(18, 18, 42, 0.14)',
    headerIconHover: 'rgba(18, 18, 42, 0.06)',
    glow: 'rgba(255, 45, 107, 0.12)',
    glowAccent: 'rgba(59, 63, 140, 0.1)',
  },
  shadows: {
    sm: '0 1px 2px rgba(18, 18, 42, 0.06)',
    md: '0 4px 14px rgba(18, 18, 42, 0.08)',
    lg: '0 14px 36px rgba(18, 18, 42, 0.12)',
  },
};

export const darkTheme = {
  ...shared,
  mode: 'dark',
  colors: {
    bg: brand.black,
    bgElevated: '#101016',
    bgMuted: '#18181F',
    bgDark: '#000000',
    surface: '#14141C',
    surfaceHover: '#1C1C28',
    border: '#2A2A3A',
    borderStrong: '#3F4158',
    text: '#F4F4F8',
    textMuted: '#A8A9BC',
    textInverse: '#F4F4F8',
    onPrimary: '#FFFFFF',
    primary: brand.magenta,
    primaryHover: '#FF4F82',
    primaryMuted: 'rgba(255, 45, 107, 0.18)',
    accent: brand.cyan,
    accentMuted: 'rgba(76, 201, 240, 0.12)',
    danger: '#FF6B6B',
    dangerMuted: 'rgba(255, 107, 107, 0.16)',
    warning: '#FDB022',
    warningMuted: 'rgba(253, 176, 34, 0.16)',
    success: '#32D583',
    successMuted: 'rgba(50, 213, 131, 0.16)',
    info: brand.cyan,
    infoMuted: 'rgba(76, 201, 240, 0.14)',
    focus: brand.magenta,
    overlay: 'rgba(0, 0, 0, 0.65)',
    headerBg: '#0A0A10',
    headerText: '#F4F4F8',
    headerMuted: 'rgba(244, 244, 248, 0.62)',
    headerBorder: '#2A2A3A',
    headerIconBorder: 'rgba(247, 247, 251, 0.22)',
    headerIconHover: 'rgba(247, 247, 251, 0.08)',
    glow: 'rgba(255, 45, 107, 0.18)',
    glowAccent: 'rgba(76, 201, 240, 0.1)',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.35)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 16px 40px rgba(0, 0, 0, 0.5)',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

/** @deprecated use lightTheme / darkTheme via ThemeProvider */
export const theme = lightTheme;

export default lightTheme;
