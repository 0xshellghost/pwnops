'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; requires2FA?: boolean; email?: string }>;
  verify2FA: (email: string, token: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok || data.requires2FA) {
      if (data.requires2FA) {
        return { ok: true, requires2FA: true, email: data.email };
      }
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Login failed' };
  };

  const verify2FA = async (email: string, token: string) => {
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Verification failed' };
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Registration failed' };
  };

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
