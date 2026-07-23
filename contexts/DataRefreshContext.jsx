'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled, { keyframes, css } from 'styled-components';

const DataRefreshContext = createContext(null);

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid ${({ theme }) => theme.colors.headerIconBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.headerText};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.headerIconHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 1.2rem;
    height: 1.2rem;
    ${({ $spinning }) =>
      $spinning &&
      css`
        animation: ${spin} 0.7s linear infinite;
      `}
  }
`;

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12a9 9 0 1 1-2.5-6.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M21 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DataRefreshProvider({ children }) {
  const listeners = useRef(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const tasks = [...listeners.current].map((fn) =>
        Promise.resolve().then(() => fn()).catch(() => {})
      );
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const value = useMemo(
    () => ({ subscribe, refresh, refreshing }),
    [subscribe, refresh, refreshing]
  );

  return (
    <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>
  );
}

export function useDataRefreshContext() {
  return useContext(DataRefreshContext);
}

/**
 * Register a reload callback for the header refresh button.
 * @param {() => void | Promise<void>} callback
 */
export function useDataRefresh(callback) {
  const ctx = useContext(DataRefreshContext);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!ctx) return undefined;
    return ctx.subscribe(() => cbRef.current());
  }, [ctx]);
}

export function DataRefreshButton() {
  const ctx = useContext(DataRefreshContext);
  if (!ctx) return null;

  return (
    <Trigger
      type="button"
      aria-label={ctx.refreshing ? 'Refreshing data' : 'Refresh data'}
      title="Refresh data"
      onClick={() => ctx.refresh()}
      disabled={ctx.refreshing}
      $spinning={ctx.refreshing}
    >
      <RefreshIcon />
    </Trigger>
  );
}

export default DataRefreshProvider;
