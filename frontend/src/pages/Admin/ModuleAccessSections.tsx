import type { CSSProperties } from "react";
import { MODULES, type ModuleKey } from "../../models/modules";
import { MODULE_SECTIONS } from "./userRoles.constants";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

function toggleModule(list: ModuleKey[], module: ModuleKey): ModuleKey[] {
  return list.includes(module) ? list.filter((item) => item !== module) : [...list, module];
}

function setSectionModules(list: ModuleKey[], modules: ModuleKey[], checked: boolean): ModuleKey[] {
  if (checked) {
    return Array.from(new Set([...list, ...modules]));
  }

  return list.filter((item) => !modules.includes(item));
}

export default function ModuleAccessSections({
  value,
  disabled = false,
  includeUsers = true,
  onChange,
}: {
  value: ModuleKey[];
  disabled?: boolean;
  includeUsers?: boolean;
  onChange: (modules: ModuleKey[]) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {MODULE_SECTIONS.map((section) => {
        const sectionModules = section.modules.filter((module) => includeUsers || module !== "users");
        if (sectionModules.length === 0) return null;

        const selectedCount = sectionModules.filter((module) => value.includes(module)).length;
        const allChecked = selectedCount === sectionModules.length;

        return (
          <div key={section.title} style={{ ...panelStyle, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 950 }}>{section.title}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                  {section.description}
                </div>
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  disabled={disabled}
                  onChange={(event) => onChange(setSectionModules(value, sectionModules, event.target.checked))}
                />
                Todos
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {sectionModules.map((module) => {
                const checked = value.includes(module);

                return (
                  <label
                    key={module}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      border: `1px solid ${checked ? "rgba(255,210,74,0.55)" : "var(--color-border)"}`,
                      borderRadius: 8,
                      background: checked ? "rgba(255,210,74,0.08)" : "rgba(255,255,255,0.02)",
                      padding: "9px 10px",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onChange(toggleModule(value, module))}
                    />
                    {MODULES.find((item) => item.key === module)?.label ?? module}
                  </label>
                );
              })}
            </div>

            {section.includedViews && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {section.includedViews.map((view) => (
                  <span
                    key={view}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.03)",
                      color: "var(--color-text-muted)",
                      padding: "5px 8px",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {view}
                  </span>
                ))}
              </div>
            )}

            <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
              {selectedCount} de {sectionModules.length} accesos seleccionados
            </div>
          </div>
        );
      })}
    </div>
  );
}
