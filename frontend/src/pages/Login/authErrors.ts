type AuthErrorPayload = {
  code?: string;
  detail?: string;
  message?: string;
  ok?: boolean;
  response?: {
    data?: AuthErrorPayload;
    status?: number;
  };
  status?: number;
  success?: boolean;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "Usuario no encontrado.",
  PASSWORD_INCORRECT: "Contraseña incorrecta.",
};

const FALLBACK_AUTH_ERROR = "Usuario o contraseña incorrectos.";

function normalizeMessage(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getMessageFromText(text: string): string | null {
  const normalizedText = normalizeMessage(text);

  if (
    text.includes("USER_NOT_FOUND") ||
    normalizedText.includes("usuario no encontrado")
  ) {
    return AUTH_ERROR_MESSAGES.USER_NOT_FOUND;
  }

  if (
    text.includes("PASSWORD_INCORRECT") ||
    normalizedText.includes("contrasena incorrecta")
  ) {
    return AUTH_ERROR_MESSAGES.PASSWORD_INCORRECT;
  }

  return null;
}

function getMessageFromPayload(payload?: AuthErrorPayload): string | null {
  if (!payload) return null;

  if (payload.code && AUTH_ERROR_MESSAGES[payload.code]) {
    return AUTH_ERROR_MESSAGES[payload.code];
  }

  if (payload.detail) {
    return getMessageFromText(payload.detail) || payload.detail;
  }

  if (payload.message) {
    return getMessageFromText(payload.message) || payload.message;
  }

  return null;
}

function parseJsonFromText(text: string): AuthErrorPayload | null {
  const jsonStart = text.indexOf("{");
  if (jsonStart === -1) return null;

  try {
    return JSON.parse(text.slice(jsonStart)) as AuthErrorPayload;
  } catch {
    return null;
  }
}

export function getLoginErrorMessage(error: unknown): string {
  const directPayloadMessage = getMessageFromPayload(error as AuthErrorPayload);
  if (directPayloadMessage) return directPayloadMessage;

  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as AuthErrorPayload).response;
    const responseMessage = getMessageFromPayload(response?.data);
    if (responseMessage) return responseMessage;
    if (typeof response?.status === "number" && response.status >= 400) {
      return FALLBACK_AUTH_ERROR;
    }
  }

  if (typeof error === "object" && error !== null) {
    const payload = error as AuthErrorPayload;
    if (typeof payload.status === "number" && payload.status >= 400) {
      return FALLBACK_AUTH_ERROR;
    }

    if (payload.success === false || payload.ok === false) {
      return getMessageFromPayload(payload) || FALLBACK_AUTH_ERROR;
    }
  }

  if (typeof error === "string") {
    const parsedPayload = parseJsonFromText(error);
    const parsedMessage = getMessageFromPayload(parsedPayload ?? undefined);
    return parsedMessage || getMessageFromText(error) || FALLBACK_AUTH_ERROR;
  }

  if (error instanceof Error) {
    const knownMessage = getMessageFromText(error.message);
    if (knownMessage) return knownMessage;

    const parsedPayload = parseJsonFromText(error.message);
    const parsedMessage = getMessageFromPayload(parsedPayload ?? undefined);
    return parsedMessage || FALLBACK_AUTH_ERROR;
  }

  return FALLBACK_AUTH_ERROR;
}

export function isFailedLoginResult(result: unknown): boolean {
  if (result === false) return true;

  if (typeof result !== "object" || result === null) return false;

  const payload = result as {
    ok?: boolean;
    success?: boolean;
    status?: number;
    code?: string;
    detail?: string;
    message?: string;
  };

  if (payload.ok === false) return true;
  if (payload.success === false) return true;
  if (typeof payload.status === "number" && payload.status >= 400) return true;
  if (payload.code === "USER_NOT_FOUND") return true;
  if (payload.code === "PASSWORD_INCORRECT") return true;

  return false;
}
