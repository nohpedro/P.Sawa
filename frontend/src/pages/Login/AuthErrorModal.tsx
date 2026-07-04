import { useEffect } from "react";
import { createPortal } from "react-dom";

type AuthErrorModalProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

export default function AuthErrorModal({ open, message, onClose }: AuthErrorModalProps) {
  const safeMessage = message.trim();
  const canUseDocument = typeof document !== "undefined";

  console.log("[AUTH_MODAL] render check", {
    open,
    hasMessage: Boolean(safeMessage),
    canUseDocument,
  });

  useEffect(() => {
    if (!open || !safeMessage || !canUseDocument) return;

    console.log("[AUTH_MODAL] portal mounted");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        console.log("[AUTH_MODAL] closing");
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [canUseDocument, onClose, open, safeMessage]);

  if (!open || !safeMessage || !canUseDocument) return null;

  const handleClose = () => {
    console.log("[AUTH_MODAL] closing");
    onClose();
  };

  return createPortal(
    <div
      className="auth-volley-backdrop"
      data-auth-error-modal="true"
      role="presentation"
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(5, 8, 15, 0.78)",
      }}
    >
      <div className="auth-volley-court" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-error-title"
        aria-describedby="auth-error-message"
        className="auth-volley-modal"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(410px, 100%)",
          display: "grid",
          gap: 14,
          justifyItems: "center",
          borderRadius: 8,
          background: "#10131a",
          color: "#eaeaea",
          padding: 24,
          textAlign: "center",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.48)",
        }}
      >
        <div className="auth-volley-ball" aria-hidden="true" />

        <div className="auth-volley-card" aria-hidden="true">
          FALTA
        </div>


        <p id="auth-error-message" className="auth-volley-message">
          {safeMessage}
        </p>

        <button type="button" className="auth-volley-button" onClick={handleClose} autoFocus>
          Intentar de nuevo
        </button>
      </div>
    </div>,
    document.body
  );
}
