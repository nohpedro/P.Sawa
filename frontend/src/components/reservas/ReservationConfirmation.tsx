import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ReservationConfirmation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timer);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "grid",
        placeItems: "center",
        padding: 24,
        pointerEvents: "none",
        background: "rgba(5, 8, 15, 0.35)",
      }}
    >
      <div className="reservation-confirmation">
        <div className="reservation-confirmation__ball" aria-hidden="true" />
        <div className="reservation-confirmation__check" aria-hidden="true">✓</div>
        <div>
          <div className="reservation-confirmation__title">Reserva confirmada</div>
          <div className="reservation-confirmation__message">La cancha quedó agendada correctamente.</div>
        </div>
      </div>

      <style>{`
        .reservation-confirmation {
          min-width: min(360px, 100%);
          display: grid;
          justify-items: center;
          gap: 10px;
          border: 1px solid rgba(142, 229, 159, 0.55);
          border-radius: 12px;
          background: #0f172a;
          color: #f8fafc;
          padding: 22px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
          text-align: center;
          animation: reservationConfirmIn 420ms cubic-bezier(0.2, 0.85, 0.2, 1.12);
        }

        .reservation-confirmation__ball {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 3px solid #f8fafc;
          background:
            radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.82) 0 12%, transparent 13%),
            linear-gradient(135deg, transparent 0 42%, rgba(16, 19, 26, 0.22) 43% 48%, transparent 49% 100%),
            #ffd24a;
          box-shadow: inset -8px -10px 0 rgba(16, 19, 26, 0.14), 0 12px 18px rgba(0, 0, 0, 0.3);
          animation: reservationBallScore 720ms cubic-bezier(0.2, 0.85, 0.2, 1.1);
        }

        .reservation-confirmation__check {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          margin-top: -28px;
          border-radius: 50%;
          background: #8ee59f;
          color: #10131a;
          font-weight: 950;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
          animation: reservationCheckPop 320ms ease-out 360ms both;
        }

        .reservation-confirmation__title {
          font-size: 20px;
          font-weight: 950;
        }

        .reservation-confirmation__message {
          margin-top: 4px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 800;
        }

        @keyframes reservationConfirmIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes reservationBallScore {
          0% {
            opacity: 0;
            transform: translate(-120px, -80px) rotate(-180deg) scale(0.75);
          }
          68% {
            opacity: 1;
            transform: translate(8px, 7px) rotate(22deg) scale(1.05);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
        }

        @keyframes reservationCheckPop {
          from {
            opacity: 0;
            transform: scale(0.45);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
