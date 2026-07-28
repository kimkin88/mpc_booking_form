'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setUser(null);
        return null;
      }
      setUser(json.data.user);
      return json.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth', { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setUser(null);
          return;
        }
        setUser(json.data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'Invalid email or password');
    }
    setUser(json.data.user);
    return json.data.user;
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile: user
        ? {
            full_name: user.name,
            email: user.email,
            role: user.role || 'admin',
          }
        : null,
      loading,
      signIn,
      signOut,
      refresh,
      actor: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'admin',
          }
        : null,
    }),
    [user, loading, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
