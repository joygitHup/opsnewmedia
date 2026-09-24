'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, type AuthUser } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 初次加载：拉 /me
  useEffect(() => {
    let mounted = true;
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      // 未登录 + 受保护页 → 跳 /login
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.replace('/login');
      }
      return;
    }
    authApi
      .me()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        tokenStorage.clear();
        if (mounted && !PUBLIC_PATHS.includes(pathname)) {
          router.replace('/login');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    tokenStorage.set(result.access, result.refresh);
    setUser(result.user);
    router.replace('/dashboard');
  };

  const register = async (email: string, password: string, name?: string) => {
    const result = await authApi.register({ email, password, name });
    tokenStorage.set(result.access, result.refresh);
    setUser(result.user);
    router.replace('/dashboard');
  };

  const logout = async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // ignore
    }
    tokenStorage.clear();
    setUser(null);
    router.replace('/login');
  };

  const refresh = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      tokenStorage.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** 检查路径是否公开（不需登录） */
export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}
