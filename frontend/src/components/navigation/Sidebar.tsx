import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { SidebarSection } from "./sidebar.types";

export default function Sidebar({
  sections = [],
  footer,
}: {
  sections: SidebarSection[];
  footer?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
        style={{
          width: collapsed ? 72 : 260,
          transition: "width 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)",
          borderRight: "1px solid rgba(255, 210, 74, 0.16)",
          background:
            "linear-gradient(180deg, rgba(255, 210, 74, 0.055), transparent 160px), var(--color-surface)",
          color: "var(--color-text)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="app-sidebar__court" aria-hidden="true" />

        <div
          style={{
            padding: 12,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
            position: "relative",
            zIndex: 1,
          }}
        >
          <button
            className="app-sidebar__toggle"
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background: "rgba(15, 20, 32, 0.78)",
              border: "1px solid rgba(255, 210, 74, 0.24)",
              borderRadius: 6,
              color: "var(--color-text)",
              cursor: "pointer",
              padding: "7px 9px",
              fontWeight: 900,
              minWidth: 34,
            }}
            title={collapsed ? "Expandir menú" : "Ocultar menú"}
          >
            {collapsed ? "->" : "≡"}
          </button>
        </div>

        <div style={{ flex: 1, padding: collapsed ? "8px 6px" : "8px 12px", position: "relative", zIndex: 1 }}>
          {sections.map((section) => (
            <div key={section.title} className="app-sidebar__section" style={{ marginBottom: 16 }}>
              {!collapsed && (
                <div className="app-sidebar__section-title">
                  {section.title}
                </div>
              )}

              <div style={{ display: "grid", gap: 7 }}>
                {section.items.map((it) => {
                  const Icon = it.icon;

                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      title={collapsed ? it.label : undefined}
                      className={({ isActive }) =>
                        `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`
                      }
                      style={({ isActive }) => ({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-start",
                        padding: collapsed ? "10px" : "10px 12px",
                        borderRadius: 8,
                        border: isActive
                          ? "1px solid rgba(255, 210, 74, 0.5)"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        background: isActive
                          ? "linear-gradient(90deg, rgba(255, 210, 74, 0.18), rgba(255, 255, 255, 0.055))"
                          : "rgba(15, 20, 32, 0.22)",
                        color: "var(--color-text)",
                        textDecoration: "none",
                        fontWeight: isActive ? 850 : 650,
                        letterSpacing: 0,
                        gap: 10,
                        minHeight: 42,
                        position: "relative",
                        overflow: "hidden",
                      })}
                    >
                      <span className="app-sidebar__active-ball" aria-hidden="true" />
                      <Icon className="app-sidebar__icon" size={18} />
                      {!collapsed && <span className="app-sidebar__label">{it.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {footer && (
          <div
            style={{
              padding: collapsed ? 8 : 12,
              borderTop: "1px solid rgba(255, 210, 74, 0.16)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {footer}
          </div>
        )}
      </aside>

      <style>{`
        .app-sidebar__court {
          position: absolute;
          inset: 58px 10px 14px;
          border: 1px solid rgba(255, 210, 74, 0.08);
          border-radius: 8px;
          pointer-events: none;
          opacity: 0.75;
        }

        .app-sidebar__court::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(255, 210, 74, 0.18), transparent);
        }

        .app-sidebar__toggle {
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .app-sidebar__toggle:hover {
          border-color: rgba(255, 210, 74, 0.52) !important;
          box-shadow: 0 0 0 3px rgba(255, 210, 74, 0.08);
          transform: translateY(-1px);
        }

        .app-sidebar__section {
          animation: sidebarSectionIn 260ms ease-out both;
        }

        .app-sidebar__section-title {
          margin-bottom: 7px;
          padding-left: 4px;
          color: rgba(234, 234, 234, 0.72);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .app-sidebar__link {
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }

        .app-sidebar__link:hover {
          transform: translateX(3px);
          border-color: rgba(255, 210, 74, 0.32) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .app-sidebar--collapsed .app-sidebar__link:hover {
          transform: translateY(-2px);
        }

        .app-sidebar__link--active {
          animation: activeServe 320ms cubic-bezier(0.2, 0.85, 0.2, 1);
          box-shadow: inset 3px 0 0 #ffd24a, 0 10px 22px rgba(255, 210, 74, 0.08);
        }

        .app-sidebar__link--active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, #ffd24a, transparent);
          animation: activeCourtLine 480ms ease-out;
        }

        .app-sidebar__active-ball {
          position: absolute;
          left: 8px;
          top: 50%;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffd24a;
          box-shadow: 0 0 12px rgba(255, 210, 74, 0.55);
          opacity: 0;
          transform: translate(-12px, -50%) scale(0.6);
        }

        .app-sidebar__link--active .app-sidebar__active-ball {
          opacity: 1;
          animation: activeBallServe 380ms ease-out;
        }

        .app-sidebar--collapsed .app-sidebar__active-ball {
          left: 50%;
          top: 8px;
          transform: translate(-50%, -8px) scale(0.7);
        }

        .app-sidebar__icon {
          flex: 0 0 auto;
          transition: transform 180ms ease, color 180ms ease;
        }

        .app-sidebar__link--active .app-sidebar__icon,
        .app-sidebar__link:hover .app-sidebar__icon {
          color: #ffd24a;
          transform: rotate(-4deg) scale(1.06);
        }

        .app-sidebar__label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @keyframes sidebarSectionIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes activeServe {
          0% {
            transform: translateX(-4px);
          }
          62% {
            transform: translateX(2px);
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes activeBallServe {
          0% {
            opacity: 0;
            transform: translate(-18px, -50%) scale(0.55);
          }
          70% {
            opacity: 1;
            transform: translate(2px, -50%) scale(1.12);
          }
          100% {
            opacity: 1;
            transform: translate(-12px, -50%) scale(0.6);
          }
        }

        @keyframes activeCourtLine {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
