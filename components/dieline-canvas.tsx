"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { DielineParams, BoxType } from "@/lib/dieline-math";
import { computeDims, fmt } from "@/lib/dieline-math";
import type { Unit } from "@/lib/dieline-math";

const BLEED_CLR  = "#22c55e";
const TRIM_CLR   = "#2563eb";
const CREASE_CLR = "#ef4444";
const ANNOT_CLR  = "#2563eb";
const STROKE     = 1.2;

interface Props {
  boxType: BoxType;
  params: DielineParams;
  unit: Unit;
  svgRef: React.RefObject<SVGSVGElement | null>;
  showBleed: boolean;
  showTrim: boolean;
  showCrease: boolean;
}

// ─── Mailer Box (Tuck-End) ──────────────────────────────────────────────────
function buildMailerBox(p: DielineParams): React.ReactNode {
  const { innerW: W, innerH: H, t, BL, N, R, SW } = p;
  const pw = 96; // px per inch

  const panelW = W * pw;
  const panelH = H * pw;
  const sideW  = SW * pw;
  const flapH  = N * pw;
  const rad    = Math.min(R * pw, flapH * 0.5, panelW * 0.3);
  const bleed  = BL * pw;
  const th     = t * pw;

  const totalW = sideW * 2 + panelW + th * 2;
  const totalH = flapH * 2 + panelH * 2 + th * 2;
  const ox = bleed + 8;
  const oy = bleed + 8;

  const frontX = ox + sideW + th;
  const frontY = oy + flapH + th;

  // Crease lines
  const creases: [number, number, number, number][] = [
    // horizontal creases
    [ox, frontY, ox + totalW, frontY],
    [ox, frontY + panelH, ox + totalW, frontY + panelH],
    [ox, frontY + panelH + th, ox + totalW, frontY + panelH + th],
    [ox, frontY + panelH * 2 + th, ox + totalW, frontY + panelH * 2 + th],
    // vertical creases
    [frontX, oy, frontX, oy + totalH],
    [frontX + panelW, oy, frontX + panelW, oy + totalH],
    [ox + sideW, oy, ox + sideW, oy + totalH],
    [ox + sideW + th + panelW, oy, ox + sideW + th + panelW, oy + totalH],
  ];

  // Trim path — outline of the whole dieline
  const tx = ox, ty = oy;
  const tw = totalW, th2 = totalH;
  // Top tuck flap (rounded top)
  const topFlapCX = frontX, topFlapCY = ty;
  const topFlapW = panelW;

  // Build outer trim path
  const trimPath = [
    // Start bottom-left of bottom tuck flap
    `M ${frontX} ${ty + th2}`,
    `Q ${frontX + topFlapW / 2} ${ty + th2 + flapH * 0.4} ${frontX + topFlapW} ${ty + th2}`,
    // right side going up
    `L ${frontX + topFlapW + sideW} ${ty + th2}`,
    `L ${frontX + topFlapW + sideW} ${ty + th2 - flapH}`,
    `L ${frontX + topFlapW} ${ty + th2 - flapH}`,
    `L ${frontX + topFlapW} ${ty + flapH}`,
    `L ${frontX + topFlapW + sideW} ${ty + flapH}`,
    `L ${frontX + topFlapW + sideW} ${ty}`,
    `L ${frontX} ${ty}`,
    // top tuck flap rounded
    `Q ${frontX + topFlapW / 2} ${ty - flapH * 0.4} ${frontX} ${ty}`,
    `M ${frontX} ${ty}`,
    `L ${frontX - sideW} ${ty}`,
    `L ${frontX - sideW} ${ty + flapH}`,
    `L ${frontX} ${ty + flapH}`,
    `L ${frontX} ${ty + th2 - flapH}`,
    `L ${frontX - sideW} ${ty + th2 - flapH}`,
    `L ${frontX - sideW} ${ty + th2}`,
    `L ${frontX} ${ty + th2}`,
  ].join(" ");

  // Bleed path (offset outward by bleed)
  const bd = bleed;
  const bleedPath = `M ${frontX - bd} ${ty - bd} L ${frontX + totalW + bd} ${ty - bd} L ${frontX + totalW + bd} ${ty + totalH + bd} L ${frontX - bd} ${ty + totalH + bd} Z`;

  return (
    <g>
      {/* Bleed */}
      <rect x={ox - bleed} y={oy - bleed} width={totalW + bleed * 2} height={totalH + bleed * 2}
        fill="none" stroke={BLEED_CLR} strokeWidth={STROKE} strokeDasharray="6,3" />
      {/* Crease lines */}
      {creases.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={CREASE_CLR} strokeWidth={STROKE} strokeDasharray="4,2" />
      ))}
      {/* Front panel fill */}
      <rect x={frontX} y={frontY} width={panelW} height={panelH} fill="#f8fafc" stroke="none" />
      <rect x={frontX} y={frontY + panelH + th} width={panelW} height={panelH} fill="#f8fafc" stroke="none" />
      {/* Side flaps */}
      <rect x={ox} y={frontY} width={sideW} height={panelH} fill="#f1f5f9" stroke="none" />
      <rect x={frontX + panelW + th} y={frontY} width={sideW} height={panelH} fill="#f1f5f9" stroke="none" />
      <rect x={ox} y={frontY + panelH + th} width={sideW} height={panelH} fill="#f1f5f9" stroke="none" />
      <rect x={frontX + panelW + th} y={frontY + panelH + th} width={sideW} height={panelH} fill="#f1f5f9" stroke="none" />
      {/* Trim outline */}
      <rect x={ox} y={oy} width={totalW} height={totalH} fill="none" stroke={TRIM_CLR} strokeWidth={STROKE} />
      {/* Top tuck flap rounded */}
      <path d={`M ${frontX} ${oy} Q ${frontX + panelW / 2} ${oy - flapH * 0.7} ${frontX + panelW} ${oy}`}
        fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      {/* Bottom tuck flap rounded */}
      <path d={`M ${frontX} ${oy + totalH} Q ${frontX + panelW / 2} ${oy + totalH + flapH * 0.7} ${frontX + panelW} ${oy + totalH}`}
        fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
    </g>
  );
}

// ─── Pizza Box ──────────────────────────────────────────────────────────────
function buildPizzaBox(p: DielineParams): React.ReactNode {
  const { innerL: L, innerW: W, innerH: H, t, BL } = p;
  const pw = 96;
  const pL = L * pw, pW = W * pw, pH = H * pw;
  const th = t * pw, bl = BL * pw;
  const ox = bl + 8, oy = bl + 8;

  // Base panel at center
  const baseX = ox + pH + th;
  const baseY = oy + pH + th;

  // Hole radius
  const holeR = Math.min(pW * 0.07, 14);

  // Corner diagonal cut size
  const cut = Math.min(pH * 0.5, pL * 0.1);

  const trimColor = TRIM_CLR;
  const creaseColor = CREASE_CLR;

  return (
    <g>
      {/* Bleed outer rect */}
      <rect x={ox - bl} y={oy - bl}
        width={pL + (pH + th) * 2 + bl * 2}
        height={pW + (pH + th) * 2 + bl * 2}
        fill="none" stroke={BLEED_CLR} strokeWidth={STROKE} strokeDasharray="6,3" />

      {/* Lid panel (above base) */}
      <rect x={baseX} y={oy} width={pL} height={pH + th} fill="#f8fafc" stroke={trimColor} strokeWidth={STROKE} />
      {/* Lid front flap (above lid) */}
      <rect x={baseX} y={oy - (pH - th)} width={pL} height={pH - th} fill="#f1f5f9" stroke={trimColor} strokeWidth={STROKE} />

      {/* Base panel */}
      <rect x={baseX} y={baseY} width={pL} height={pW} fill="#f8fafc" stroke={trimColor} strokeWidth={STROKE} />

      {/* Left side flap */}
      <polygon
        points={`
          ${baseX},${baseY}
          ${baseX - pH + cut},${baseY}
          ${baseX - pH},${baseY + cut}
          ${baseX - pH},${baseY + pW - cut}
          ${baseX - pH + cut},${baseY + pW}
          ${baseX},${baseY + pW}
        `}
        fill="#f1f5f9" stroke={trimColor} strokeWidth={STROKE} />

      {/* Right side flap */}
      <polygon
        points={`
          ${baseX + pL},${baseY}
          ${baseX + pL + pH - cut},${baseY}
          ${baseX + pL + pH},${baseY + cut}
          ${baseX + pL + pH},${baseY + pW - cut}
          ${baseX + pL + pH - cut},${baseY + pW}
          ${baseX + pL},${baseY + pW}
        `}
        fill="#f1f5f9" stroke={trimColor} strokeWidth={STROKE} />

      {/* Front flap (below base) */}
      <rect x={baseX} y={baseY + pW} width={pL} height={pH} fill="#f1f5f9" stroke={trimColor} strokeWidth={STROKE} />

      {/* Crease lines */}
      {/* back crease (lid/base join) */}
      <line x1={baseX} y1={baseY} x2={baseX + pL} y2={baseY} stroke={creaseColor} strokeWidth={STROKE} strokeDasharray="4,2" />
      {/* lid top crease */}
      <line x1={baseX} y1={oy + pH + th} x2={baseX + pL} y2={oy + pH + th} stroke={creaseColor} strokeWidth={STROKE} strokeDasharray="4,2" />
      {/* front crease */}
      <line x1={baseX} y1={baseY + pW} x2={baseX + pL} y2={baseY + pW} stroke={creaseColor} strokeWidth={STROKE} strokeDasharray="4,2" />
      {/* left/right side creases */}
      <line x1={baseX} y1={baseY} x2={baseX} y2={baseY + pW} stroke={creaseColor} strokeWidth={STROKE} strokeDasharray="4,2" />
      <line x1={baseX + pL} y1={baseY} x2={baseX + pL} y2={baseY + pW} stroke={creaseColor} strokeWidth={STROKE} strokeDasharray="4,2" />

      {/* Finger holes on side flaps */}
      <circle cx={baseX - pH / 2} cy={baseY + pW / 2} r={holeR} fill="white" stroke={trimColor} strokeWidth={STROKE} />
      <circle cx={baseX + pL + pH / 2} cy={baseY + pW / 2} r={holeR} fill="white" stroke={trimColor} strokeWidth={STROKE} />
    </g>
  );
}

// ─── Shipping Box (RSC) ─────────────────────────────────────────────────────
function buildShippingBox(p: DielineParams): React.ReactNode {
  const { innerL: L, innerW: W, innerH: H, t, BL } = p;
  const pw = 96;
  const pL = L * pw, pW = W * pw, pH = H * pw;
  const th = t * pw, bl = BL * pw;
  const flapH = Math.min((pW / 2) * pw / pw, pL / 2);
  const flapHpx = (W / 2) * pw;
  const ox = bl + 8, oy = bl + 8;

  // Layout: [top-flaps row] [panels row] [bottom-flaps row]
  const panelY = oy + flapHpx + th;
  // panels: left-side | front | right-side | back
  const frontX = ox + pW + th;

  return (
    <g>
      {/* Bleed */}
      <rect x={ox - bl} y={oy - bl}
        width={pL * 2 + pW * 2 + th * 3 + bl * 2}
        height={pH + flapHpx * 2 + th * 2 + bl * 2}
        fill="none" stroke={BLEED_CLR} strokeWidth={STROKE} strokeDasharray="6,3" />

      {/* Side panels */}
      <rect x={ox} y={panelY} width={pW} height={pH} fill="#f1f5f9" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX + pL + th} y={panelY} width={pW} height={pH} fill="#f1f5f9" stroke={TRIM_CLR} strokeWidth={STROKE} />
      {/* Back panel */}
      <rect x={frontX + pL + pW + th * 2} y={panelY} width={pL} height={pH} fill="#f8fafc" stroke={TRIM_CLR} strokeWidth={STROKE} />
      {/* Front panel */}
      <rect x={frontX} y={panelY} width={pL} height={pH} fill="#f8fafc" stroke={TRIM_CLR} strokeWidth={STROKE} />

      {/* Top flaps */}
      <rect x={ox} y={oy} width={pW} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX} y={oy} width={pL} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX + pL + th} y={oy} width={pW} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX + pL + pW + th * 2} y={oy} width={pL} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />

      {/* Bottom flaps */}
      <rect x={ox} y={panelY + pH + th} width={pW} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX} y={panelY + pH + th} width={pL} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX + pL + th} y={panelY + pH + th} width={pW} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />
      <rect x={frontX + pL + pW + th * 2} y={panelY + pH + th} width={pL} height={flapHpx} fill="#e0f2fe" stroke={TRIM_CLR} strokeWidth={STROKE} />

      {/* Crease lines — vertical */}
      {[ox + pW, frontX, frontX + pL, frontX + pL + pW + th, frontX + pL * 2 + pW + th].map((x, i) => (
        <line key={i} x1={x} y1={oy} x2={x} y2={panelY + pH + flapHpx + th}
          stroke={CREASE_CLR} strokeWidth={STROKE} strokeDasharray="4,2" />
      ))}
      {/* Crease lines — horizontal */}
      <line x1={ox} y1={panelY} x2={ox + pL * 2 + pW * 2 + th * 3} y2={panelY}
        stroke={CREASE_CLR} strokeWidth={STROKE} strokeDasharray="4,2" />
      <line x1={ox} y1={panelY + pH} x2={ox + pL * 2 + pW * 2 + th * 3} y2={panelY + pH}
        stroke={CREASE_CLR} strokeWidth={STROKE} strokeDasharray="4,2" />
    </g>
  );
}

// ─── Watermark ───────────────────────────────────────────────────────────────
function Watermark({ vw, vh }: { vw: number; vh: number }) {
  const text = "WePrintNPack";
  const spacing = 120;
  const marks: React.ReactNode[] = [];
  for (let x = 0; x < vw + spacing; x += spacing) {
    for (let y = 0; y < vh + spacing; y += spacing) {
      marks.push(
        <text key={`${x}-${y}`} x={x} y={y} fontSize={11} fill="rgba(0,0,0,0.07)"
          fontFamily="Inter,sans-serif" transform={`rotate(-30,${x},${y})`} style={{ userSelect: "none" }}>
          {text}
        </text>
      );
    }
  }
  return <g pointerEvents="none">{marks}</g>;
}

// ─── Dimension Annotations ───────────────────────────────────────────────────
function Annotation({ x1, y1, x2, y2, label, dir }: { x1: number; y1: number; x2: number; y2: number; label: string; dir: "h" | "v" }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const ah = 5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ANNOT_CLR} strokeWidth={1} markerStart="url(#arrowS)" markerEnd="url(#arrowE)" />
      <rect x={midX - label.length * 3.5} y={midY - 8} width={label.length * 7} height={14} fill="white" rx={2} />
      <text x={midX} y={midY + 4} textAnchor="middle" fontSize={10} fill={ANNOT_CLR} fontFamily="Inter,sans-serif">{label}</text>
    </g>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────
export default function DielineCanvas({ boxType, params, unit, svgRef, showBleed, showTrim, showCrease }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState<"select" | "pan">("pan");
  const [showSettings, setShowSettings] = useState(false);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const dims = computeDims(params);

  // Reset view when box type changes
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [boxType]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.2), 5));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "pan") return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { isPanning.current = false; };

  // Compute SVG viewBox
  const VW = 900, VH = 700;

  let boxSVG: React.ReactNode;
  let annotW = 0, annotH = 0, annotD = 0, annotOX = 0, annotOY = 0;
  const bl = params.BL * 96;

  if (boxType === "mailer-boxes") {
    boxSVG = buildMailerBox(params);
    annotW = params.innerW * 96;
    annotH = params.innerH * 96;
    annotD = params.t * 96;
    annotOX = bl + 8 + params.SW * 96 + params.t * 96;
    annotOY = bl + 8 + params.N * 96 + params.t * 96;
  } else if (boxType === "pizza-boxes") {
    boxSVG = buildPizzaBox(params);
    annotW = params.innerL * 96;
    annotH = params.innerW * 96;
    annotD = params.innerH * 96;
    annotOX = bl + 8 + params.innerH * 96 + params.t * 96;
    annotOY = bl + 8 + params.innerH * 96 + params.t * 96;
  } else if (boxType === "shipping-boxes" || boxType === "square-shipping-boxes") {
    boxSVG = buildShippingBox(params);
    annotW = params.innerL * 96;
    annotH = params.innerW * 96;
    annotD = params.innerH * 96;
    annotOX = bl + 8 + params.innerW * 96 + params.t * 96;
    annotOY = bl + 8 + (params.innerW / 2) * 96 + params.t * 96;
  }

  const wLabel = fmt(boxType === "pizza-boxes" ? params.innerL : params.innerW, unit);
  const hLabel = fmt(boxType === "mailer-boxes" ? params.innerH : params.innerW, unit);
  const dLabel = fmt(boxType === "pizza-boxes" ? params.innerH : params.innerH, unit);

  return (
    <div ref={containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f3f4f6", position: "relative", overflow: "hidden", minHeight: 0 }}>
      {/* Top legend */}
      <div style={{ display: "flex", gap: 20, padding: "10px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", alignItems: "center", fontSize: 12, flexShrink: 0 }}>
        {[{ color: BLEED_CLR, label: "Bleed" }, { color: TRIM_CLR, label: "Trim" }, { color: CREASE_CLR, label: "Crease" }].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 2, background: color }} />
            <span style={{ color: "#374151", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { label: "Manufacture dimensions", val: `${fmt(dims.manufacture.L, unit)} × ${fmt(dims.manufacture.W, unit)} × ${fmt(dims.manufacture.H, unit)}` },
            { label: "Inner dimensions",       val: `${fmt(dims.inner.L, unit)} × ${fmt(dims.inner.W, unit)} × ${fmt(dims.inner.H, unit)}` },
            { label: "Outer dimensions",       val: `${fmt(dims.outer.L, unit)} × ${fmt(dims.outer.W, unit)} × ${fmt(dims.outer.H, unit)}` },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", gap: 8, fontSize: 11 }}>
              <span style={{ color: "#9ca3af", minWidth: 160 }}>{label}</span>
              <span style={{ color: "#111827", fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        style={{ flex: 1, overflow: "hidden", cursor: activeTool === "pan" ? (isPanning.current ? "grabbing" : "grab") : "default" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg
          ref={svgRef as React.RefObject<SVGSVGElement>}
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          height="100%"
          style={{ display: "block", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "center center", transition: isPanning.current ? "none" : "transform 0.05s" }}
        >
          <defs>
            <marker id="arrowS" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M6,0 L0,3 L6,6" fill="none" stroke={ANNOT_CLR} strokeWidth="1" />
            </marker>
            <marker id="arrowE" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="none" stroke={ANNOT_CLR} strokeWidth="1" />
            </marker>
          </defs>

          <rect width={VW} height={VH} fill="#f3f4f6" />
          <Watermark vw={VW} vh={VH} />

          <g opacity={showBleed ? 1 : 0}>
            {/* bleed layer rendered inside boxSVG with BLEED_CLR */}
          </g>

          {boxSVG}

          {/* Dimension annotations */}
          <Annotation
            x1={annotOX} y1={annotOY + annotH + 30}
            x2={annotOX + annotW} y2={annotOY + annotH + 30}
            label={wLabel} dir="h"
          />
          <Annotation
            x1={annotOX + annotW + 30} y1={annotOY}
            x2={annotOX + annotW + 30} y2={annotOY + annotH}
            label={hLabel} dir="v"
          />
        </svg>
      </div>

      {/* Bottom Toolbar */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "white", borderRadius: 999, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", padding: "6px 12px", gap: 4 }}>
        {/* Select */}
        <ToolBtn active={activeTool === "select"} onClick={() => setActiveTool("select")} title="Select">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-7 1-3 7L5 3z"/></svg>
        </ToolBtn>
        {/* Pan */}
        <ToolBtn active={activeTool === "pan"} onClick={() => setActiveTool("pan")} title="Pan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0m0 6V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M6 14v-2a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4l4 3V15"/></svg>
        </ToolBtn>

        <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px" }} />

        {/* Zoom in */}
        <ToolBtn active={false} onClick={() => setZoom(z => Math.min(z * 1.2, 5))} title="Zoom in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </ToolBtn>
        {/* Zoom out */}
        <ToolBtn active={false} onClick={() => setZoom(z => Math.max(z * 0.8, 0.2))} title="Zoom out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </ToolBtn>

        <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px" }} />

        {/* Settings / line toggle */}
        <ToolBtn active={showSettings} onClick={() => setShowSettings(s => !s)} title="Display settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "#f0f9ff" : "transparent",
        color: active ? "#2563eb" : "#374151",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}
