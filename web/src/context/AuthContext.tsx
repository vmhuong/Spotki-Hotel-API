import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStorage } from '../api/client';
import type { ApiResponse, AuthResponse, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isCustomer: boolean;
  isStaff: boolean;
  loginSession: (auth: AuthResponse) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStorage.getUser());

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('spotki-auth-expired', onExpired);
    return () => window.removeEventListener('spotki-auth-expired', onExpired);
  }, []);

  const loginSession = (auth: AuthResponse) => {
    tokenStorage.setSession(auth);
    setUser({
      userId: auth.userId,
      username: auth.username,
      fullName: auth.fullName,
      role: auth.role,
      hotelId: auth.hotelId,
    });
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (tokenStorage.getAccessToken()) {
        await api.post<ApiResponse<void>>('/auth/logout', refreshToken ? { refreshToken } : {});
      }
    } catch {
      // ignore if token already expired
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  const isCustomer = user?.role === 'ROLE_CUSTOMER';
  const isStaff = Boolean(user && user.role !== 'ROLE_CUSTOMER');

  return (
    <AuthContext.Provider value={{ user, isCustomer, isStaff, loginSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
