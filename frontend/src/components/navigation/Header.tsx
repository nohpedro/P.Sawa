import React from "react";

export default function Header({
  title = "Wally Sas",
  rightSlot,
}: {
  title?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <>
      <header
        className="app-header"
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          borderBottom: "1px solid rgba(255, 210, 74, 0.18)",
          background: "linear-gradient(90deg, #0f1420 0%, #111827 48%, #0f1420 100%)",
          color: "#eaeaea",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="app-header__brand">
          <span className="app-header__ball" aria-hidden="true" />
          <span className="app-header__title">{title}</span>
          <span className="app-header__court-line" aria-hidden="true" />
        </div>

        <div className="app-header__right">{rightSlot}</div>
      </header>

      <style>{`
        .app-header::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent 0 28%, rgba(255, 210, 74, 0.08) 48%, transparent 70%),
            repeating-linear-gradient(90deg, transparent 0 78px, rgba(255, 255, 255, 0.035) 79px 80px);
          transform: translateX(-18%);
          animation: headerCourtSweep 7s ease-in-out infinite;
          pointer-events: none;
        }

        .app-header__brand,
        .app-header__right {
          position: relative;
          z-index: 1;
        }

        .app-header__brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .app-header__ball {
          width: 26px;
          height: 26px;
          border: 2px solid #f8fafc;
          border-radius: 50%;
          background:
            radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.85) 0 12%, transparent 13%),
            linear-gradient(135deg, transparent 0 42%, rgba(16, 19, 26, 0.28) 43% 48%, transparent 49% 100%),
            #ffd24a;
          box-shadow: inset -5px -6px 0 rgba(16, 19, 26, 0.16), 0 0 18px rgba(255, 210, 74, 0.22);
          animation: headerBallBounce 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
          flex: 0 0 auto;
        }

        .app-header__title {
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          white-space: nowrap;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
        }

        .app-header__court-line {
          width: min(18vw, 160px);
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 210, 74, 0.7), transparent);
          opacity: 0.72;
        }

        .app-header__right {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        @keyframes headerBallBounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          45% {
            transform: translateY(-4px) rotate(18deg);
          }
          58% {
            transform: translateY(1px) rotate(24deg);
          }
        }

        @keyframes headerCourtSweep {
          0%, 100% {
            transform: translateX(-18%);
            opacity: 0.8;
          }
          50% {
            transform: translateX(18%);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
