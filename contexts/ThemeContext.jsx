'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { darkTheme, lightTheme } from '@/styles/theme';
import { GlobalStyles } from '@/styles/GlobalStyles';

const STORAGE_KEY = 'mpc-theme';

const ThemeContext = createContext({
  mode: 'light',
  theme: lightTheme,
  setMode: () => {},
  toggleMode: () => {},
});

function readStoredMode() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore */
  }
  return 'light';
}

export function AppThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readStoredMode();
    setModeState(initial);
    document.documentElement.dataset.theme = initial;
    setReady(true);
  }, []);

  const setMode = useCallback((next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    setModeState(value);
    document.documentElement.dataset.theme = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ mode, theme, setMode, toggleMode, ready }),
    [mode, theme, setMode, toggleMode, ready]
  );

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}

export default AppThemeProvider;
