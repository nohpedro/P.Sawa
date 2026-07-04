import { useEffect } from "react";

type ToastType = "info" | "success" | "error";
type SportIcon = "soccer" | "basketball" | "tennis" | "volleyball";

const sportIcons: SportIcon[] = ["soccer", "basketball", "tennis", "volleyball"];

function pickSportIcon(type: ToastType, message: string): SportIcon {
  const source = `${type}:${message}`;
  const score = Array.from(source).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return sportIcons[score % sportIcons.length];
}

export interface ToastProps {
  open: boolean;
  message: string;
  type?: ToastType;
  onClose?: () => void;
  durationMs?: number;
}

export default function Toast({ open, message, type = "info", onClose, durationMs = 2800 }: ToastProps) {
  useEffect(() => {
    if (!open || !onClose) return;

    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onClose, open, message, type]);

  if (!open) return null;

  const theme: Record<
    ToastType,
    {
      borderColor: string;
      accent: string;
      glow: string;
      label: string;
    }
  > = {
    info: {
      borderColor: "#2a3243",
      accent: "#ffd24a",
      glow: "rgba(255,210,74,0.18)",
      label: "Aviso",
    },
    success: {
      borderColor: "#8ee59f",
      accent: "#8ee59f",
      glow: "rgba(142,229,159,0.2)",
      label: "Correcto",
    },
    error: {
      borderColor: "#ff5252",
      accent: "#ff7a7a",
      glow: "rgba(255,82,82,0.18)",
      label: "Error",
    },
  };

  const currentTheme = theme[type];
  const sportIcon = pickSportIcon(type, message);

  return (
    <>
      <div
        className="sport-toast"
        style={{
          position: "fixed",
          bottom: 18,
          right: 18,
          minWidth: 280,
          maxWidth: 430,
          borderRadius: 10,
          border: `1px solid ${currentTheme.borderColor}`,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(15,20,32,0.98) 42%)",
          color: "#eaeaea",
          padding: "12px 14px 14px",
          boxShadow: `0 14px 34px rgba(0,0,0,0.36), 0 0 0 4px ${currentTheme.glow}`,
          overflow: "hidden",
        }}
        role="status"
        aria-live="polite"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span className={`sport-toast__icon sport-toast__icon--${sportIcon}`} aria-hidden="true" />

          <div style={{ minWidth: 0 }}>
            <div style={{ color: currentTheme.accent, fontSize: 11, fontWeight: 950, textTransform: "uppercase" }}>
              {currentTheme.label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.96, lineHeight: 1.35 }}>
              {message}
            </div>
          </div>
        </div>

        <div
          className="sport-toast__timer"
          style={{
            background: currentTheme.accent,
            animationDuration: `${durationMs}ms`,
          }}
        />
      </div>

      <style>{`
        .sport-toast {
          animation: toastServeIn 260ms cubic-bezier(0.2, 0.85, 0.2, 1.12), toastServeOut 220ms ease-in forwards;
          animation-delay: 0ms, ${Math.max(0, durationMs - 220)}ms;
        }

        .sport-toast__icon {
          position: relative;
          width: 26px;
          height: 26px;
          border: 2px solid #f8fafc;
          border-radius: 50%;
          overflow: hidden;
          flex: 0 0 auto;
          box-shadow: inset -5px -6px 0 rgba(16,19,26,0.14), 0 8px 14px rgba(0,0,0,0.24);
          animation: toastIconBounce 780ms cubic-bezier(0.2, 0.85, 0.2, 1.1);
        }

        .sport-toast__icon::before,
        .sport-toast__icon::after {
          content: "";
          position: absolute;
          inset: 0;
        }

        .sport-toast__icon--soccer {
          background:
            radial-gradient(circle at 50% 50%, #10131a 0 18%, transparent 19%),
            radial-gradient(circle at 18% 24%, #10131a 0 10%, transparent 11%),
            radial-gradient(circle at 80% 28%, #10131a 0 10%, transparent 11%),
            radial-gradient(circle at 30% 82%, #10131a 0 10%, transparent 11%),
            radial-gradient(circle at 78% 78%, #10131a 0 10%, transparent 11%),
            #f8fafc;
        }

        .sport-toast__icon--basketball {
          border-color: #f97316;
          background:
            linear-gradient(90deg, transparent 47%, rgba(16,19,26,0.55) 48% 52%, transparent 53%),
            linear-gradient(0deg, transparent 47%, rgba(16,19,26,0.55) 48% 52%, transparent 53%),
            radial-gradient(circle at 0 50%, transparent 0 46%, rgba(16,19,26,0.48) 47% 53%, transparent 54%),
            radial-gradient(circle at 100% 50%, transparent 0 46%, rgba(16,19,26,0.48) 47% 53%, transparent 54%),
            #f97316;
        }

        .sport-toast__icon--tennis {
          border-color: #d9f99d;
          background:
            radial-gradient(circle at -10% 50%, transparent 0 45%, rgba(248,250,252,0.9) 46% 52%, transparent 53%),
            radial-gradient(circle at 110% 50%, transparent 0 45%, rgba(248,250,252,0.9) 46% 52%, transparent 53%),
            #bef264;
        }

        .sport-toast__icon--volleyball {
          background:
            radial-gradient(circle at 32% 28%, rgba(255,255,255,0.82) 0 12%, transparent 13%),
            linear-gradient(135deg, transparent 0 42%, rgba(16,19,26,0.24) 43% 48%, transparent 49% 100%),
            linear-gradient(45deg, transparent 0 58%, rgba(255,255,255,0.44) 59% 64%, transparent 65% 100%),
            #ffd24a;
        }

        .sport-toast__timer {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 3px;
          width: 100%;
          transform-origin: left;
          animation-name: toastTimerDrain;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }

        @keyframes toastServeIn {
          from {
            opacity: 0;
            transform: translate(26px, 12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }

        @keyframes toastServeOut {
          to {
            opacity: 0;
            transform: translate(22px, 8px) scale(0.98);
          }
        }

        @keyframes toastIconBounce {
          0% {
            transform: translate(-18px, -14px) rotate(-160deg) scale(0.72);
            opacity: 0;
          }
          58% {
            transform: translate(3px, 3px) rotate(18deg) scale(1.08);
            opacity: 1;
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
        }

        @keyframes toastTimerDrain {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </>
  );
}
