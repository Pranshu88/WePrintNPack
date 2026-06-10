"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { DielineParams, BoxType } from "@/lib/dieline-math";

interface Props {
  boxType: BoxType;
  params: DielineParams;
}

export default function Dieline3DPreview({ boxType, params }: Props) {
  const [rotX, setRotX] = useState(-25);
  const [rotY, setRotY] = useState(35);
  const [openAmount, setOpenAmount] = useState(0); // 0 = closed, 1 = open
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const { innerL: L, innerW: W, innerH: H, t } = params;
  const MAX = 110;
  const sc = MAX / Math.max(L, W, H);
  const bw = Math.max(L * sc, 8);
  const bh = Math.max(H * sc, 8);
  const bd = Math.max(W * sc, 8);
  const lidAngle = openAmount * -110;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotY(r => r + dx * 0.5);
    setRotX(r => Math.max(-60, Math.min(0, r - dy * 0.3)));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const face = (w: number, h: number, color: string, transform: string, opacity = 1): React.CSSProperties => ({
    position: "absolute",
    width: w, height: h,
    left: (bw - w) / 2, top: (bh - h) / 2,
    background: color,
    border: "1px solid rgba(0,0,0,0.15)",
    backfaceVisibility: "hidden",
    boxSizing: "border-box",
    transform,
    opacity,
  });

  const boxColor = "#d4b896";
  const boxDark  = "#b8956e";
  const boxLight = "#e8d0b0";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 3D View */}
      <div
        style={{ flex: 1, position: "relative", background: "linear-gradient(135deg,#e8e8e8,#d0d0d0)", borderRadius: "12px 12px 0 0", overflow: "hidden", cursor: isDragging.current ? "grabbing" : "grab", minHeight: 200 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* 3D badge */}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: "#374151", zIndex: 10 }}>3D</div>

        {/* 3D box */}
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: 500 }}>
          <div style={{ position: "relative", width: bw, height: bh, transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>
            {/* Front */}
            <div style={face(bw, bh, boxColor, `translateZ(${bd / 2}px)`)} />
            {/* Back */}
            <div style={face(bw, bh, boxColor, `rotateY(180deg) translateZ(${bd / 2}px)`)} />
            {/* Right */}
            <div style={face(bd, bh, boxDark, `rotateY(90deg) translateZ(${bw / 2}px)`)} />
            {/* Left */}
            <div style={face(bd, bh, boxDark, `rotateY(-90deg) translateZ(${bw / 2}px)`)} />
            {/* Bottom */}
            <div style={face(bw, bd, boxDark, `rotateX(90deg) translateZ(${bh / 2}px)`)} />
            {/* Top / Lid */}
            <div style={{
              ...face(bw, bd, boxLight, `rotateX(-90deg) translateZ(${bh / 2}px)`),
              transformOrigin: boxType === "pizza-boxes" ? "center bottom" : "center top",
              transform: boxType === "pizza-boxes"
                ? `rotateX(-90deg) translateZ(${bh / 2}px) rotateX(${lidAngle}deg)`
                : `rotateX(-90deg) translateZ(${bh / 2}px) rotateX(${lidAngle * 0.7}deg)`,
            }} />
          </div>
        </div>
      </div>

      {/* Open / Close slider */}
      <div style={{ background: "white", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #e5e7eb" }}>
        <span style={{ fontSize: 12, color: "#374151", minWidth: 36 }}>Open</span>
        <input
          type="range" min={0} max={100} value={openAmount * 100}
          onChange={e => setOpenAmount(parseInt(e.target.value) / 100)}
          style={{ flex: 1, accentColor: "#2563eb", height: 4 }}
        />
        <span style={{ fontSize: 12, color: "#374151", minWidth: 36, textAlign: "right" }}>Close</span>
      </div>
    </div>
  );
}
