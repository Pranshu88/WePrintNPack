"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { BoxType, Unit, SizeMode, DielineParams } from "@/lib/dieline-math";
import { MATERIAL_CATEGORIES, defaultAdvanced, fromUnit } from "@/lib/dieline-math";
import DielineCanvas from "./dieline-canvas";
import DielineLeftPanel from "./dieline-left-panel";
import Dieline3DPreview from "./dieline-3d-preview";
import { downloadSVG, downloadAI, downloadPDF, downloadDXF } from "@/lib/dieline-export";

const BOX_LABELS: Record<BoxType, string> = {
  "mailer-boxes":          "Mailer Box",
  "pizza-boxes":           "Pizza Box",
  "shipping-boxes":        "Shipping Box",
  "square-shipping-boxes": "Square Shipping Box",
};

const DEFAULT_DIMS: Record<BoxType, { L: number; W: number; H: number }> = {
  "mailer-boxes":          { L: 12, W: 6,  H: 4  },
  "pizza-boxes":           { L: 12, W: 12, H: 2  },
  "shipping-boxes":        { L: 16, W: 10, H: 8  },
  "square-shipping-boxes": { L: 12, W: 12, H: 8  },
};

function buildInitialParams(boxType: BoxType): DielineParams {
  const { L, W, H } = DEFAULT_DIMS[boxType];
  const defaultMat = MATERIAL_CATEGORIES[0].options[2]; // 300g white paperboard
  const t = defaultMat.thickness;
  const adv = defaultAdvanced(L, W, H, t, false);
  return { innerL: L, innerW: W, innerH: H, t, ...adv };
}

interface DownloadFmt { id: string; label: string; icon: React.ReactNode; ext: string }

const DOWNLOAD_FMTS: DownloadFmt[] = [
  {
    id: "ai", label: "AI dieline", ext: "ai",
    icon: <div style={{ width: 28, height: 28, background: "#f97316", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>Ai</div>,
  },
  {
    id: "pdf", label: "PDF dieline", ext: "pdf",
    icon: <div style={{ width: 28, height: 28, background: "#ef4444", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 800 }}>PDF</div>,
  },
  {
    id: "dxf", label: "DXF dieline", ext: "dxf",
    icon: <div style={{ width: 28, height: 28, background: "#374151", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 800 }}>DXF</div>,
  },
  {
    id: "3d", label: "3D mockup", ext: "jpg",
    icon: <div style={{ width: 28, height: 28, background: "#22c55e", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 8, fontWeight: 800 }}>JPG</div>,
  },
];

export default function DielineGenerator({ boxType }: { boxType: BoxType }) {
  const [params, setParams] = useState<DielineParams>(() => buildInitialParams(boxType));
  const [unit, setUnit] = useState<Unit>("in");
  const [sizeMode, setSizeMode] = useState<SizeMode>("manufacture");
  const [selectedMaterialId, setSelectedMaterialId] = useState("wpb-300");
  const [tab, setTab] = useState<"basic" | "advanced">("basic");
  const [selectedFmt, setSelectedFmt] = useState("ai");
  const [showBleed, setShowBleed] = useState(true);
  const [showTrim, setShowTrim] = useState(true);
  const [showCrease, setShowCrease] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const label = BOX_LABELS[boxType];
  const filename = boxType;

  function handleMaterialChange(id: string, thickness: number, isCorrugated: boolean) {
    setSelectedMaterialId(id);
  }

  function handleParamsChange(p: DielineParams) {
    if (boxType === "square-shipping-boxes") {
      p = { ...p, innerW: p.innerL };
    }
    setParams(p);
  }

  async function handleDownload(fmt: DownloadFmt) {
    setSelectedFmt(fmt.id);
    const svg = svgRef.current;
    if (!svg) return;
    if (fmt.id === "ai")  downloadAI(svg, `${filename}-dieline.ai`);
    if (fmt.id === "pdf") await downloadPDF(svg, `${filename}-dieline.pdf`);
    if (fmt.id === "dxf") downloadDXF(svg, `${filename}-dieline.dxf`);
    if (fmt.id === "svg") downloadSVG(svg, `${filename}-dieline.svg`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f9fafb" }}>
      {/* Top bar */}
      <div style={{ height: 52, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0, zIndex: 10 }}>
        <Link href="/products/packaging-box" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#111827" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Dieline generator</span>
        </Link>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>

        <div style={{ flex: 1 }} />

        <Link
          href={`/products/packaging-box/${boxType}`}
          style={{ padding: "7px 18px", border: "1.5px solid #111827", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#111827", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          Design Online
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
        </Link>

        <button
          onClick={async () => {
            const fmt = DOWNLOAD_FMTS.find(f => f.id === selectedFmt) ?? DOWNLOAD_FMTS[0];
            await handleDownload(fmt);
          }}
          style={{ padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
        >
          <span style={{ fontSize: 15 }}>⬇</span>
          Download the dieline
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left panel */}
        <DielineLeftPanel
          boxType={boxType}
          params={params}
          unit={unit}
          sizeMode={sizeMode}
          selectedMaterialId={selectedMaterialId}
          tab={tab}
          onTabChange={setTab}
          onParamsChange={handleParamsChange}
          onUnitChange={setUnit}
          onSizeModeChange={setSizeMode}
          onMaterialChange={handleMaterialChange}
        />

        {/* Center canvas */}
        <DielineCanvas
          boxType={boxType}
          params={params}
          unit={unit}
          svgRef={svgRef}
          showBleed={showBleed}
          showTrim={showTrim}
          showCrease={showCrease}
        />

        {/* Right panel */}
        <div style={{ width: 290, background: "#fff", borderLeft: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* 3D Preview */}
          <div style={{ flex: 1, overflow: "hidden", borderBottom: "1px solid #e5e7eb", minHeight: 0 }}>
            <Dieline3DPreview boxType={boxType} params={params} />
          </div>

          {/* File formats */}
          <div style={{ padding: 16, flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 12 }}>File formats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {DOWNLOAD_FMTS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => handleDownload(fmt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 10px", borderRadius: 8,
                    border: `1.5px solid ${selectedFmt === fmt.id ? "#2563eb" : "#e5e7eb"}`,
                    background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500,
                    color: "#111827", transition: "border-color 0.15s",
                  }}
                >
                  {fmt.icon}
                  {fmt.label}
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 600, fontSize: 12, color: "#111827", marginBottom: 8 }}>You will get</div>
            <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 11, color: "#6b7280", lineHeight: 1.7 }}>
              <li>All dieline files can be generated and downloaded</li>
              <li>Print-ready with bleed and crop marks</li>
              <li>Compatible with Adobe Illustrator, Inkscape, and CAD tools</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
