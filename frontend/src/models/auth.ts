// src/models/auth.ts

/**
 * Payload enviado al backend para iniciar sesión
 * POST /api/token/ (o endpoint equivalente)
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Información básica del usuario autenticado
 * Devuelta junto con el token
 */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  role: string;
  modules: string[];
}

/**
 * Respuesta del backend al iniciar sesión correctamente
 */
export interface LoginResponse {
  access: string;      // JWT access token
  user: AuthUser;
}

/**
 * Estado de autenticación dentro del frontend
 * (para Context / Store)
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
}

/**
 * Tipo para errores comunes de autenticación
 * (credenciales inválidas, expiración, etc.)
 */
export interface AuthError {
  message: string;
  statusCode?: number;
}
