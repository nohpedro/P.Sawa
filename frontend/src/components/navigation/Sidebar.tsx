import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { SidebarSection } from "./sidebar.types";

export default function Sidebar({
  sections = [],
  footer,
}: {
  sections: SidebarSection[];
  footer?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const visibleSectionTitles = useMemo(() => sections.map((section) => section.title), [sections]);

  const isItemActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  useEffect(() => {
    setExpandedSections((current) => {
      const next: Record<string, boolean> = {};
      sections.forEach((section) => {
        const hasActiveItem = section.items.some((item) => isItemActive(item.to, item.end));
        next[section.title] = current[section.title] ?? true;
        if (hasActiveItem) next[section.title] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visibleSectionTitles.join("|")]);

  const toggleSection = (title: string) => {
    setExpandedSections((current) => ({ ...current, [title]: !(current[title] ?? true) }));
  };

  return (
    <>
      <aside
        className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
        style={{
          width: collapsed ? 72 : 260,
          transition: "width 0.34s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.34s ease",
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
            transition: "justify-content 0.34s ease",
          }}
        >
          <button
            className="app-sidebar__toggle"
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 210, 74, 0.16), rgba(15, 20, 32, 0.92))",
              border: "1px solid rgba(255, 210, 74, 0.24)",
              borderRadius: 999,
              color: "var(--color-text)",
              cursor: "pointer",
              padding: 0,
              fontWeight: 900,
              width: 38,
              height: 38,
              display: "inline-grid",
              placeItems: "center",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.22)",
            }}
            aria-label={collapsed ? "Expandir menu" : "Ocultar menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menú" : "Ocultar menú"}
          >
            <span className="app-sidebar__toggle-halo" aria-hidden="true" />
            <span className="app-sidebar__toggle-icon" aria-hidden="true">
              {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
            </span>
          </button>
        </div>

        <div className="app-sidebar__content" style={{ flex: 1, padding: collapsed ? "8px 6px" : "8px 12px", position: "relative", zIndex: 1 }}>
          {sections.map((section) => {
            const sectionExpanded = collapsed || (expandedSections[section.title] ?? true);
            const sectionActive = section.items.some((item) => isItemActive(item.to, item.end));

            return (
              <div key={section.title} className="app-sidebar__section" style={{ marginBottom: sectionExpanded ? 16 : 8 }}>
                <button
                  type="button"
                  className={`app-sidebar__section-toggle${sectionActive ? " app-sidebar__section-toggle--active" : ""}`}
                  onClick={() => toggleSection(section.title)}
                  disabled={collapsed}
                  aria-expanded={sectionExpanded}
                  title={collapsed ? section.title : undefined}
                >
                  <span className="app-sidebar__section-title">
                    {section.title}
                  </span>
                  <span className="app-sidebar__section-count">{section.items.length}</span>
                  <FiChevronDown className="app-sidebar__section-chevron" size={15} />
                </button>

                <div
                  className="app-sidebar__section-items"
                  style={{
                    display: "grid",
                    gap: 7,
                    gridTemplateRows: sectionExpanded ? "1fr" : "0fr",
                    opacity: sectionExpanded ? 1 : 0,
                    pointerEvents: sectionExpanded ? "auto" : "none",
                  }}
                >
                  <div style={{ display: "grid", gap: 7, minHeight: 0, overflow: "hidden" }}>
                    {section.items.map((it) => {
                      const Icon = it.icon;

                      return (
                        <NavLink
                          key={it.to}
                          to={it.to}
                          end={it.end}
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
                            maxWidth: "100%",
                            position: "relative",
                            overflow: "hidden",
                            transition:
                              "transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, padding 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
                          })}
                        >
                          <span className="app-sidebar__active-ball" aria-hidden="true" />
                          <Icon className="app-sidebar__icon" size={18} />
                          <span className="app-sidebar__label">{it.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {footer && (
          <div
            style={{
              padding: collapsed ? 8 : 12,
              borderTop: "1px solid rgba(255, 210, 74, 0.16)",
              position: "relative",
              zIndex: 1,
              transition: "padding 0.34s cubic-bezier(0.22, 1, 0.36, 1)",
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
          position: relative;
          overflow: hidden;
          isolation: isolate;
          font-size: 0;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .app-sidebar__toggle:hover {
          border-color: rgba(255, 210, 74, 0.52) !important;
          box-shadow: 0 0 0 3px rgba(255, 210, 74, 0.1), 0 12px 26px rgba(0, 0, 0, 0.26) !important;
          transform: translateY(-1px);
        }

        .app-sidebar__toggle:active {
          transform: translateY(0) scale(0.96);
        }

        .app-sidebar__toggle-halo {
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: rgba(255, 210, 74, 0.14);
          opacity: 0;
          transform: scale(0.48);
          transition: opacity 220ms ease, transform 220ms ease;
          z-index: -1;
        }

        .app-sidebar__toggle:hover .app-sidebar__toggle-halo {
          opacity: 1;
          transform: scale(1.45);
        }

        .app-sidebar__toggle-icon {
          display: grid;
          place-items: center;
          font-size: 18px;
          line-height: 1;
          transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), color 180ms ease;
        }

        .app-sidebar__toggle:hover .app-sidebar__toggle-icon {
          color: #ffd24a;
          transform: translateX(-1px) scale(1.08);
        }

        .app-sidebar--collapsed .app-sidebar__toggle:hover .app-sidebar__toggle-icon {
          transform: translateX(1px) scale(1.08);
        }

        .app-sidebar__content {
          transition: padding 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar__section {
          animation: sidebarSectionIn 260ms ease-out both;
          transition: margin 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar__section-toggle {
          width: 100%;
          margin: 0 0 7px;
          padding: 6px 6px 6px 4px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: rgba(234, 234, 234, 0.72);
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-align: left;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            margin-bottom 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar__section-toggle:hover {
          background: rgba(255, 210, 74, 0.06);
          border-color: rgba(255, 210, 74, 0.14);
          color: var(--color-text);
        }

        .app-sidebar__section-toggle--active {
          color: #ffd24a;
        }

        .app-sidebar__section-toggle:disabled {
          cursor: default;
        }

        .app-sidebar__section-title {
          flex: 1;
          color: rgba(234, 234, 234, 0.72);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1px;
          text-transform: uppercase;
          max-width: 220px;
          max-height: 18px;
          overflow: hidden;
          opacity: 1;
          transform: translateX(0);
          transition:
            opacity 180ms ease,
            transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
            max-width 0.34s cubic-bezier(0.22, 1, 0.36, 1),
            max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1),
            margin-bottom 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar__section-count {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          color: rgba(234, 234, 234, 0.66);
          font-size: 10px;
          font-weight: 850;
          line-height: 1;
          padding: 4px 6px;
          transition: opacity 180ms ease, max-width 0.34s cubic-bezier(0.22, 1, 0.36, 1), padding 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar__section-chevron {
          flex: 0 0 auto;
          color: rgba(234, 234, 234, 0.66);
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, color 180ms ease;
        }

        .app-sidebar__section-toggle[aria-expanded="false"] .app-sidebar__section-chevron {
          transform: rotate(-90deg);
        }

        .app-sidebar__section-toggle:hover .app-sidebar__section-chevron,
        .app-sidebar__section-toggle--active .app-sidebar__section-chevron {
          color: #ffd24a;
        }

        .app-sidebar__section-items {
          transition: grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
        }

        .app-sidebar--collapsed .app-sidebar__section-title {
          max-width: 0;
          max-height: 0;
          margin-bottom: 0;
          opacity: 0;
          transform: translateX(-10px);
        }

        .app-sidebar--collapsed .app-sidebar__section-toggle {
          height: 0;
          max-height: 0;
          margin: 0;
          padding: 0;
          border-width: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .app-sidebar--collapsed .app-sidebar__section-count,
        .app-sidebar--collapsed .app-sidebar__section-chevron {
          max-width: 0;
          padding: 0;
          opacity: 0;
          overflow: hidden;
        }

        .app-sidebar__link {
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
          will-change: transform;
        }

        .app-sidebar--collapsed .app-sidebar__link {
          gap: 0 !important;
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
          display: inline-block;
          min-width: 0;
          max-width: 174px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          opacity: 1;
          transform: translateX(0);
          transition:
            opacity 190ms ease,
            transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            max-width 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .app-sidebar--collapsed .app-sidebar__label {
          max-width: 0;
          opacity: 0;
          transform: translateX(-8px);
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
