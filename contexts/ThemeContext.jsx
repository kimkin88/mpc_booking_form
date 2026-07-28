'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
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

const listeners = new Set();

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

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

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    media.removeEventListener('change', listener);
  };
}

function getServerSnapshot() {
  return 'light';
}

export function AppThemeProvider({ children }) {
  const mode = useSyncExternalStore(subscribe, readStoredMode, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setMode = useCallback((next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    emitThemeChange();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({ mode, theme, setMode, toggleMode, ready: true }),
    [mode, theme, setMode, toggleMode]
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
