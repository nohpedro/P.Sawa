import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import authService from "../../services/auth.service";
import type { AuthState, LoginRequest, LoginResponse } from "../../models/auth";

interface AuthContextValue extends AuthState {
  login: (payload: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshFromStorage: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  loading: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const refreshFromStorage = useCallback(() => {
    const token = authService.getAccessToken();
    const user = authService.getUser();

    setState({
      isAuthenticated: !!token,
      user: user ?? null,
      accessToken: token,
      loading: false,
    });
  }, []);

  useEffect(() => {
    // Al montar la app: carga sesión desde localStorage
    refreshFromStorage();
  }, [refreshFromStorage]);

  const login = useCallback(async (payload: LoginRequest) => {
    setState((s) => ({ ...s, loading: false }));

    try {
      const data = await authService.login(payload);

      setState({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.access,
        loading: false,
      });

      return data;
    } catch (err) {
      // Si falla, deja estado consistente
      authService.clearSession();
      setState({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));

    try {
      await authService.logout();
    } finally {
      setState({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        loading: false,
      });
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      ...state,
      login,
      logout,
      refreshFromStorage,
    };
  }, [state, login, logout, refreshFromStorage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
