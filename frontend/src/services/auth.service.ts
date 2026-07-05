// src/services/auth.service.ts

import RequestHandler from "./RequestHandler";
import type { LoginRequest, LoginResponse, AuthUser } from "../models/auth";

const ACCESS_TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

const AUTH_ENDPOINTS = {
  login: "/api/auth/Login/",
  logout: "/api/auth/logout/",
};

export class AuthService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  /**
   * POST /api/auth/Login/
   * Guarda access token en localStorage para que RequestHandler lo use en _getAuthHeader()
   */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    this.clearSession();

    try {
      const data = (await this.request.postRequest(
        AUTH_ENDPOINTS.login,
        payload
      )) as LoginResponse;

      if (!data?.access || !data?.user) {
        throw new Error("Respuesta de Login inválida: se esperaba { access, user }");
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  /**
   * POST /api/auth/logout/
   * Body esperado:
   * { "token": "Bearer eyJhbGciOi..." }
   *
   * Nota: tu RequestHandler agregará Authorization automáticamente si hay token,
   * pero igual enviamos el body porque tu backend lo exige.
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      // Si no hay token, igual dejamos el estado limpio
      this.clearSession();
      return;
    }

    try {
      await this.request.postRequest(AUTH_ENDPOINTS.logout, {
        token: `Bearer ${token}`,
      });
    } finally {
      // Pase lo que pase, limpiamos sesión local
      this.clearSession();
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

const authService = new AuthService();
export default authService;
