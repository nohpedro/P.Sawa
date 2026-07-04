export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (message.includes("ProtectedError")) {
      return "No se puede eliminar porque este registro esta en uso.";
    }

    if (message.includes("<!DOCTYPE html") || message.includes("<html")) {
      return fallback;
    }

    return message.length > 220 ? fallback : message;
  }
  return fallback;
}
