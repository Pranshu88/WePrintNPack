"use client";

import React, { useState } from "react";
import {
  MATERIAL_CATEGORIES, defaultAdvanced,
  type DielineParams, type Unit, type SizeMode,
  fromUnit, toUnit,
} from "@/lib/dieline-math";
import type { MaterialOption } from "@/lib/dieline-math";
import type { BoxType } from "@/lib/dieline-math";

type Tab = "basic" | "advanced";

interface Props {
  boxType: BoxType;
  params: DielineParams;
  unit: Unit;
  sizeMode: SizeMode;
  selectedMaterialId: string;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onParamsChange: (p: DielineParams) => void;
  onUnitChange: (u: Unit) => void;
  onSizeModeChange: (m: SizeMode) => void;
  onMaterialChange: (id: string, thickness: number, isCorrugated: boolean) => void;
}

const ADVANCED_FIELDS: { key: keyof DielineParams; label: string; desc: string }[] = [
  { key: "BL",  label: "BL",  desc: "Bleed" },
  { key: "N",   label: "N",   desc: "Flap depth" },
  { key: "NX",  label: "NX",  desc: "Neck extension" },
  { key: "R",   label: "R",   desc: "Corner radius" },
  { key: "K",   label: "K",   desc: "K-factor" },
  { key: "SW",  label: "SW",  desc: "Side width" },
  { key: "SP",  label: "SP",  desc: "Side panel depth" },
  { key: "NY",  label: "NY",  desc: "Neck Y offset" },
  { key: "SWI", label: "SWI", desc: "Side width inner" },
  { key: "CR",  label: "CR",  desc: "Crease relief" },
];

export default function DielineLeftPanel({
  boxType, params, unit, sizeMode, selectedMaterialId, tab,
  onTabChange, onParamsChange, onUnitChange, onSizeModeChange, onMaterialChange,
}: Props) {
  const [matOpen, setMatOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);

  const allOptions = MATERIAL_CATEGORIES.flatMap(c => c.options);
  const selectedMat = allOptions.find(m => m.id === selectedMaterialId) ?? allOptions[3];

  const displayL = toUnit(params.innerL, unit);
  const displayW = toUnit(params.innerW, unit);
  const displayH = toUnit(params.innerH, unit);

  function setDim(key: "innerL" | "innerW" | "innerH", raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    const inInches = fromUnit(v, unit);
    const next: DielineParams = { ...params, [key]: inInches };
    onParamsChange(next);
  }

  function setAdvanced(key: keyof DielineParams, raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    const inInches = key === "K" ? v : fromUnit(v, unit);
    onParamsChange({ ...params, [key]: inInches });
  }

  function selectMaterial(opt: MaterialOption) {
    setMatOpen(false);
    const isCorrugated = !!opt.isCorrugated;
    const adv = defaultAdvanced(params.innerL, params.innerW, params.innerH, opt.thickness, isCorrugated);
    onMaterialChange(opt.id, opt.thickness, isCorrugated);
    onParamsChange({ ...params, t: opt.thickness, ...adv });
  }

  const thickDisplay = toUnit(params.t, unit).toFixed(4);
  const isSquare = boxType === "square-shipping-boxes";

  return (
    <div style={{ width: 300, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Left icon nav */}
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{ width: 64, background: "#fafafa", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, gap: 4, flexShrink: 0 }}>
          <NavIcon label="Models" active={false} onClick={() => {}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </NavIcon>
          <NavIcon label="Basic" active={tab === "basic"} onClick={() => onTabChange("basic")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tab === "basic" ? "#2563eb" : "currentColor"} strokeWidth="1.8"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </NavIcon>
          <NavIcon label="Advanced" active={tab === "advanced"} onClick={() => onTabChange("advanced")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tab === "advanced" ? "#2563eb" : "currentColor"} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          </NavIcon>
          <div style={{ flex: 1 }} />
          <NavIcon label="More" active={false} onClick={() => {}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </NavIcon>
          <div style={{ height: 16 }} />
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, padding: "16px 14px", overflowY: "auto" }}>
          {tab === "basic" && (
            <>
              {/* Custom size */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Custom size</span>
                <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  {(["mm", "in"] as Unit[]).map(u => (
                    <button key={u} onClick={() => onUnitChange(u)} style={{ padding: "3px 10px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: unit === u ? "#2563eb" : "#fff", color: unit === u ? "#fff" : "#374151", transition: "background 0.15s" }}>{u}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <DimInput label="Length" value={displayL} unit={unit} onChange={v => setDim("innerL", v)} />
                <DimInput label="Width" value={isSquare ? displayL : displayW} unit={unit} onChange={v => { setDim("innerW", v); if (isSquare) setDim("innerL", v); }} disabled={isSquare} />
              </div>
              <DimInput label="Height" value={displayH} unit={unit} onChange={v => setDim("innerH", v)} fullWidth />

              {/* Material */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Choose material</span>
                  <InfoIcon />
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setMatOpen(o => !o)}
                    style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${matOpen ? "#2563eb" : "#e5e7eb"}`, borderRadius: 8, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#111827" }}
                  >
                    <SwatchCircle swatch={selectedMat.swatch} />
                    <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedMat.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: matOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>

                  {matOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, display: "flex", overflow: "hidden" }}>
                      {/* Categories */}
                      <div style={{ width: "50%", borderRight: "1px solid #f0f0f0" }}>
                        {MATERIAL_CATEGORIES.map((cat, i) => (
                          <div key={cat.label} onMouseEnter={() => setActiveCat(i)}
                            style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#111827", background: activeCat === i ? "#f9fafb" : "#fff", cursor: "pointer" }}>
                            {cat.label}
                          </div>
                        ))}
                      </div>
                      {/* Sub-options */}
                      <div style={{ width: "50%" }}>
                        {MATERIAL_CATEGORIES[activeCat].options.map(opt => (
                          <div key={opt.id} onClick={() => selectMaterial(opt)}
                            style={{ padding: "10px 14px", fontSize: 12, color: "#111827", background: opt.id === selectedMaterialId ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                            <SwatchCircle swatch={opt.swatch} />
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thickness */}
              <div style={{ marginTop: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827", display: "block", marginBottom: 4 }}>
                  {selectedMat.customThickness ? "Custom thickness" : "Thickness"}
                </span>
                {selectedMat.customThickness && selectedMat.thicknessMin && selectedMat.thicknessMax && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
                    ({toUnit(selectedMat.thicknessMin, unit).toFixed(4)}–{toUnit(selectedMat.thicknessMax, unit).toFixed(4)} {unit})
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", background: "#f9fafb" }}>
                  {selectedMat.customThickness && (
                    <button onClick={() => onParamsChange({ ...params, t: Math.max(params.t - 0.0005, selectedMat.thicknessMin ?? 0.001) })}
                      style={{ width: 22, height: 22, border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  )}
                  <span style={{ flex: 1, textAlign: "center", fontSize: 13, color: "#111827" }}>{thickDisplay}</span>
                  {selectedMat.customThickness && (
                    <button onClick={() => onParamsChange({ ...params, t: Math.min(params.t + 0.0005, selectedMat.thicknessMax ?? 0.2) })}
                      style={{ width: 22, height: 22, border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  )}
                </div>
              </div>

              {/* Size mode */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Size mode</span>
                  <InfoIcon />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {(["manufacture", "inner"] as SizeMode[]).map(m => (
                    <button key={m} onClick={() => onSizeModeChange(m)}
                      style={{ padding: "8px 6px", fontSize: 11, fontWeight: 600, borderRadius: 7, border: `1.5px solid ${sizeMode === m ? "#2563eb" : "#e5e7eb"}`, background: "#fff", cursor: "pointer", color: sizeMode === m ? "#2563eb" : "#374151", transition: "border-color 0.15s, color 0.15s" }}>
                      {m === "manufacture" ? "Manufacture\ndimensions" : "Inner\ndimensions"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "advanced" && (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>Advanced parameters</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {ADVANCED_FIELDS.map(({ key, label, desc }) => {
                  const val = params[key] as number;
                  const display = key === "K" ? val.toFixed(2) : toUnit(val, unit).toFixed(4);
                  return (
                    <div key={key}>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>{label} <span style={{ color: "#d1d5db" }}>— {desc}</span></div>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 7, overflow: "hidden" }}>
                        <input
                          type="number" value={display} step={key === "K" ? 0.01 : 0.001}
                          onChange={e => setAdvanced(key, e.target.value)}
                          style={{ flex: 1, border: "none", outline: "none", padding: "6px 8px", fontSize: 12, background: "#fff", minWidth: 0 }}
                        />
                        <span style={{ padding: "0 7px", fontSize: 11, color: "#9ca3af", background: "#f9fafb", borderLeft: "1px solid #e5e7eb" }}>{key === "K" ? "" : unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const adv = defaultAdvanced(params.innerL, params.innerW, params.innerH, params.t, !!allOptions.find(m => m.id === selectedMaterialId)?.isCorrugated);
                  onParamsChange({ ...params, ...adv });
                }}
                style={{ marginTop: 16, width: "100%", padding: "8px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#f9fafb", cursor: "pointer", fontSize: 12, color: "#374151", fontWeight: 600 }}>
                Reset to defaults
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DimInput({ label, value, unit, onChange, fullWidth, disabled }: { label: string; value: number; unit: Unit; onChange: (v: string) => void; fullWidth?: boolean; disabled?: boolean }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 7, overflow: "hidden", background: disabled ? "#f9fafb" : "#fff" }}>
        <input
          type="number" value={value.toFixed(4)} step={0.01} min={0.1}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", padding: "7px 8px", fontSize: 13, background: "transparent", minWidth: 0 }}
        />
        <span style={{ padding: "0 8px", fontSize: 12, color: "#9ca3af", background: "#f9fafb", borderLeft: "1px solid #e5e7eb" }}>{unit}</span>
      </div>
    </div>
  );
}

function SwatchCircle({ swatch }: { swatch: "white" | "kraft" }) {
  return (
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: swatch === "white" ? "#f0f0f0" : "#c8956e", border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
  );
}

function NavIcon({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", border: "none", background: "transparent", cursor: "pointer", color: active ? "#2563eb" : "#6b7280", width: 56, borderRadius: 8 }}>
      {children}
      <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, lineHeight: 1 }}>{label}</span>
    </button>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  );
}
