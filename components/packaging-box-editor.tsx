"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Product } from "@/lib/types";

// ─── Box geometry (px) ───────────────────────────────────────────────────────
const BW = 300; // box face width
const BH = 190; // box face height
const BD = 60;  // box depth / side width
const PAD = 28; // dieline padding

// ─── Faces ───────────────────────────────────────────────────────────────────
type FaceId =
  | "lid" | "lid-left" | "lid-right"
  | "side-left" | "front" | "side-right"
  | "bottom" | "bot-left" | "bot-right"
  | "back";

type FaceDef = { id: FaceId; label: string; x: number; y: number; w: number; h: number; small?: boolean };

const FACES_OUTSIDE: FaceDef[] = [
  { id: "lid",        label: "Lid",          x: PAD + BD,       y: PAD,                    w: BW, h: BD * 2 },
  { id: "lid-left",   label: "Lid Left",     x: PAD,            y: PAD + BD,               w: BD, h: BD, small: true },
  { id: "lid-right",  label: "Lid Right",    x: PAD + BD + BW,  y: PAD + BD,               w: BD, h: BD, small: true },
  { id: "side-left",  label: "Left Side",    x: PAD,            y: PAD + BD * 2,           w: BD, h: BH },
  { id: "front",      label: "Front Face",   x: PAD + BD,       y: PAD + BD * 2,           w: BW, h: BH },
  { id: "side-right", label: "Right Side",   x: PAD + BD + BW,  y: PAD + BD * 2,           w: BD, h: BH },
  { id: "bottom",     label: "Bottom",       x: PAD + BD,       y: PAD + BD * 2 + BH,      w: BW, h: BD },
  { id: "bot-left",   label: "Base Left",    x: PAD,            y: PAD + BD * 2 + BH,      w: BD, h: BD, small: true },
  { id: "bot-right",  label: "Base Right",   x: PAD + BD + BW,  y: PAD + BD * 2 + BH,      w: BD, h: BD, small: true },
];

const FACES_INSIDE: FaceDef[] = [
  { id: "back",       label: "Inside Base",  x: PAD + BD,       y: PAD + BD * 2,           w: BW, h: BH },
  { id: "side-left",  label: "Inside Left",  x: PAD,            y: PAD + BD * 2,           w: BD, h: BH },
  { id: "side-right", label: "Inside Right", x: PAD + BD + BW,  y: PAD + BD * 2,           w: BD, h: BH },
  { id: "lid",        label: "Lid Inside",   x: PAD + BD,       y: PAD,                    w: BW, h: BD * 2 },
  { id: "bottom",     label: "Inside Bottom",x: PAD + BD,       y: PAD + BD * 2 + BH,      w: BW, h: BD },
];

const TOTAL_DIELINE_W = PAD * 2 + BD + BW + BD;
const TOTAL_DIELINE_H = PAD * 2 + BD * 2 + BH + BD;

// ─── Item types ───────────────────────────────────────────────────────────────
type TextItem = {
  id: string; kind: "text"; text: string;
  x: number; y: number; w: number;
  font: string; size: number; bold: boolean; color: string; align: "left" | "center" | "right";
};
type ImageItem = {
  id: string; kind: "image"; src: string;
  x: number; y: number; w: number; h: number;
};
type CanvasItem = TextItem | ImageItem;

// ─── State shape ─────────────────────────────────────────────────────────────
type EditorState = {
  faceColors: Record<string, string>;
  insideColor: string;
  items: Record<string, CanvasItem[]>;
};

// ─── Presets ─────────────────────────────────────────────────────────────────
const BOX_COLORS = [
  { label: "Kraft Brown",  value: "#c8a97e" },
  { label: "White",        value: "#f5f5f5" },
  { label: "Black",        value: "#1a1a1a" },
  { label: "Navy",         value: "#1e3a5f" },
  { label: "Forest",       value: "#2d5a27" },
  { label: "Burgundy",     value: "#7c1d1d" },
  { label: "Slate",        value: "#475569" },
  { label: "Sky Blue",     value: "#0ea5e9" },
  { label: "Gold",         value: "#b45309" },
  { label: "Rose",         value: "#be185d" },
];

const INSIDE_COLORS = [
  { label: "Natural Kraft", value: "#d4b896" },
  { label: "White",         value: "#f9fafb" },
  { label: "Black",         value: "#111827" },
  { label: "Cream",         value: "#fef9c3" },
  { label: "Light Blue",    value: "#dbeafe" },
  { label: "Sage",          value: "#d1fae5" },
];

const TEXT_COLORS = ["#000000","#ffffff","#dc2626","#ea580c","#ca8a04","#16a34a","#0891b2","#1d4ed8","#7c3aed","#db2777"];
const FONT_OPTIONS = [
  { label: "Arial",    value: "Arial, sans-serif" },
  { label: "Georgia",  value: "Georgia, serif" },
  { label: "Courier",  value: "'Courier New', monospace" },
  { label: "Impact",   value: "Impact, fantasy" },
  { label: "Tahoma",   value: "Tahoma, sans-serif" },
  { label: "Verdana",  value: "Verdana, sans-serif" },
];

const SHAPES = [
  { label: "Circle",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#374151"/></svg>`, w: 80, h: 80 },
  { label: "Square",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="6" fill="#374151"/></svg>`, w: 80, h: 80 },
  { label: "Star",     svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151"/></svg>`, w: 80, h: 80 },
  { label: "Triangle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 88"><polygon points="50,2 98,86 2,86" fill="#374151"/></svg>`, w: 80, h: 70 },
  { label: "Heart",    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151"/></svg>`, w: 80, h: 72 },
  { label: "Line",     svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20"><rect x="0" y="7" width="120" height="6" rx="3" fill="#374151"/></svg>`, w: 100, h: 20 },
];

function uid() { return Math.random().toString(36).slice(2, 9); }
function svgUrl(svg: string) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }

function defaultState(): EditorState {
  const fc: Record<string, string> = {};
  FACES_OUTSIDE.forEach(f => { fc[f.id] = "#c8a97e"; });
  fc["back"] = "#c8a97e";
  return { faceColors: fc, insideColor: "#d4b896", items: {} };
}

// ─── 3D CSS Box ───────────────────────────────────────────────────────────────
function Box3DPreview({
  faceColors, insideColor, openAmount,
}: {
  faceColors: Record<string, string>;
  insideColor: string;
  openAmount: number;
}) {
  const scale = 0.48;
  const w = BW * scale;
  const h = BH * scale;
  const d = BD * scale;
  const lidAngle = -(openAmount / 100) * 110;

  const face: React.CSSProperties = {
    position: "absolute",
    border: "1px solid rgba(0,0,0,0.18)",
  };

  return (
    <div style={{
      width: "100%", height: 180,
      display: "flex", alignItems: "center", justifyContent: "center",
      perspective: 600,
      perspectiveOrigin: "50% 40%",
    }}>
      <div style={{
        position: "relative",
        width: w, height: h,
        transformStyle: "preserve-3d",
        transform: "rotateX(-20deg) rotateY(30deg)",
      }}>
        {/* Front */}
        <div style={{ ...face, width: w, height: h, background: faceColors["front"] || faceColors["lid"] || "#c8a97e", transform: `translateZ(${d / 2}px)` }} />
        {/* Back */}
        <div style={{ ...face, width: w, height: h, background: insideColor, transform: `rotateY(180deg) translateZ(${d / 2}px)` }} />
        {/* Left */}
        <div style={{ ...face, width: d, height: h, background: faceColors["side-left"] || "#b89060", transformOrigin: "left", transform: `rotateY(-90deg) translateZ(0px)`, left: 0 }} />
        {/* Right */}
        <div style={{ ...face, width: d, height: h, background: faceColors["side-right"] || "#b89060", transformOrigin: "right", transform: `rotateY(90deg) translateZ(${w}px) translateX(-${d}px)`, left: 0 }} />
        {/* Bottom */}
        <div style={{ ...face, width: w, height: d, background: faceColors["bottom"] || "#a07040", transformOrigin: "bottom", transform: `rotateX(-90deg) translateZ(${h}px) translateY(-${d}px)`, top: 0 }} />
        {/* Lid (animated) */}
        <div style={{
          ...face,
          width: w, height: d * 2,
          background: faceColors["lid"] || "#c8a97e",
          transformOrigin: "top center",
          transform: `translateZ(${d / 2}px) translateY(-${d * 2}px) rotateX(${lidAngle}deg)`,
          top: 0,
        }}>
          {/* Inside of lid */}
          <div style={{
            position: "absolute", inset: 0,
            background: insideColor,
            opacity: openAmount > 10 ? 1 : 0,
            backfaceVisibility: "visible",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Dieline face ─────────────────────────────────────────────────────────────
function DielineFace({
  face, color, selected, hovered, onSelect, onHover, onLeave, items, zoom,
}: {
  face: FaceDef;
  color: string;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
  items: CanvasItem[];
  zoom: number;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={face.label}
      style={{
        position: "absolute",
        left: face.x * zoom,
        top: face.y * zoom,
        width: face.w * zoom,
        height: face.h * zoom,
        background: color,
        border: selected
          ? "2px solid #3b82f6"
          : hovered
            ? "2px solid #93c5fd"
            : "1.5px dashed rgba(0,0,0,0.25)",
        boxSizing: "border-box",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.15s",
        boxShadow: selected ? "0 0 0 3px rgba(59,130,246,0.2)" : "none",
      }}
    >
      {/* Face label */}
      {!face.small && (
        <span style={{
          position: "absolute", top: 4, left: 6,
          fontSize: "0.58rem", fontWeight: 700,
          color: "rgba(0,0,0,0.35)", pointerEvents: "none",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {face.label}
        </span>
      )}

      {/* Items overlay */}
      {items.map(item => (
        item.kind === "text" ? (
          <div key={item.id} style={{
            position: "absolute",
            left: item.x * zoom, top: item.y * zoom, width: item.w * zoom,
            fontFamily: item.font, fontSize: `${item.size * zoom}px`,
            fontWeight: item.bold ? 700 : 400, color: item.color,
            textAlign: item.align, pointerEvents: "none",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>{item.text}</div>
        ) : (
          <img key={item.id} src={item.src} alt="" draggable={false} style={{
            position: "absolute",
            left: item.x * zoom, top: item.y * zoom,
            width: item.w * zoom, height: item.h * zoom,
            objectFit: "contain", pointerEvents: "none",
          }} />
        )
      ))}

      {/* Selection tooltip */}
      {selected && (
        <div style={{
          position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
          background: "#1e293b", color: "#fff", fontSize: "0.65rem", fontWeight: 700,
          padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap", pointerEvents: "none",
          zIndex: 20,
        }}>
          {face.label}
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
type Props = { product: Product; onClose: () => void };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PackagingBoxEditor({ product, onClose }: Props) {
  const [view, setView] = useState<"outside" | "inside">("outside");
  const [selectedFace, setSelectedFace] = useState<FaceId | null>(null);
  const [hoveredFace, setHoveredFace] = useState<FaceId | null>(null);
  const [openAmount, setOpenAmount] = useState(40);
  const [zoom, setZoom] = useState(1);

  // History stack
  const [history, setHistory] = useState<EditorState[]>([defaultState()]);
  const [histIdx, setHistIdx] = useState(0);
  const state = history[histIdx];

  const [activeTab, setActiveTab] = useState<"uploads" | "text" | "elements">("uploads");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);

  // Commit a new state (push to history)
  const commit = useCallback((next: EditorState) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, next];
    });
    setHistIdx(idx => idx + 1);
  }, [histIdx]);

  const undo = () => { if (histIdx > 0) { setHistIdx(i => i - 1); setSelectedItemId(null); } };
  const redo = () => { if (histIdx < history.length - 1) { setHistIdx(i => i + 1); setSelectedItemId(null); } };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Z") { e.preventDefault(); redo(); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (["input", "textarea", "select"].includes(tag)) return;
        e.preventDefault();
        if (selectedFace) removeItem(selectedFace, selectedItemId);
        setSelectedItemId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histIdx, history.length, selectedItemId, selectedFace]);

  const faces = view === "outside" ? FACES_OUTSIDE : FACES_INSIDE;

  // ─── State helpers ─────────────────────────────────────────────────────────
  function setFaceColor(faceId: string, color: string) {
    if (applyToAll) {
      const fc = { ...state.faceColors };
      faces.forEach(f => { fc[f.id] = color; });
      commit({ ...state, faceColors: fc });
    } else {
      commit({ ...state, faceColors: { ...state.faceColors, [faceId]: color } });
    }
  }

  function setBoxColor(color: string) {
    const fc = { ...state.faceColors };
    FACES_OUTSIDE.forEach(f => { fc[f.id] = color; });
    fc["back"] = color;
    commit({ ...state, faceColors: fc });
  }

  function setInsideColor(color: string) {
    commit({ ...state, insideColor: color });
  }

  function getFaceItems(faceId: string): CanvasItem[] {
    return state.items[faceId] ?? [];
  }

  function addItem(faceId: string, item: CanvasItem) {
    commit({
      ...state,
      items: {
        ...state.items,
        [faceId]: [...(state.items[faceId] ?? []), item],
      },
    });
    setSelectedItemId(item.id);
  }

  function updateItem(faceId: string, id: string, updates: Partial<CanvasItem>) {
    commit({
      ...state,
      items: {
        ...state.items,
        [faceId]: (state.items[faceId] ?? []).map(it =>
          it.id === id ? ({ ...it, ...updates } as CanvasItem) : it
        ),
      },
    });
  }

  function removeItem(faceId: string, id: string) {
    commit({
      ...state,
      items: {
        ...state.items,
        [faceId]: (state.items[faceId] ?? []).filter(it => it.id !== id),
      },
    });
  }

  function addText(text: string) {
    if (!selectedFace) return;
    const face = faces.find(f => f.id === selectedFace);
    if (!face) return;
    const item: TextItem = {
      id: uid(), kind: "text", text,
      x: face.w / 2 - 60, y: face.h / 2 - 12, w: 140,
      font: "Arial, sans-serif", size: 16, bold: false, color: "#000000", align: "center",
    };
    addItem(selectedFace, item);
    setActiveTab("text");
  }

  function addShape(shape: typeof SHAPES[0]) {
    if (!selectedFace) return;
    const face = faces.find(f => f.id === selectedFace);
    if (!face) return;
    const item: ImageItem = {
      id: uid(), kind: "image", src: svgUrl(shape.svg),
      x: Math.max(0, face.w / 2 - shape.w / 2),
      y: Math.max(0, face.h / 2 - shape.h / 2),
      w: shape.w, h: shape.h,
    };
    addItem(selectedFace, item);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedFace) return;
    const face = faces.find(f => f.id === selectedFace);
    if (!face) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = face.w - 20;
        const maxH = face.h - 20;
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const item: ImageItem = {
          id: uid(), kind: "image", src,
          x: 10, y: 10,
          w: Math.round(img.naturalWidth * ratio), h: Math.round(img.naturalHeight * ratio),
        };
        addItem(selectedFace, item);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ─── Selected item helpers ──────────────────────────────────────────────────
  const currentItems = selectedFace ? getFaceItems(selectedFace) : [];
  const selectedItem = selectedItemId ? currentItems.find(i => i.id === selectedItemId) ?? null : null;
  const selectedText = selectedItem?.kind === "text" ? selectedItem : null;

  // ─── Drag items within dieline face ────────────────────────────────────────
  const dragRef = useRef<{ id: string; faceId: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  function startDragItem(e: React.PointerEvent, faceId: string, item: CanvasItem) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id: item.id, faceId, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y };
    setSelectedItemId(item.id);

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom;
      const dy = (ev.clientY - d.sy) / zoom;
      const face = faces.find(f => f.id === d.faceId);
      if (!face) return;
      setHistory(prev => {
        const current = prev[histIdx];
        const updated = { ...current, items: { ...current.items, [d.faceId]: (current.items[d.faceId] ?? []).map(it => it.id !== d.id ? it : { ...it, x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } as CanvasItem) } };
        const copy = [...prev];
        copy[histIdx] = updated;
        return copy;
      });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ─── Icon button helper ─────────────────────────────────────────────────────
  const tabBtn = (id: typeof activeTab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      title={label}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "10px 6px", border: "none",
        background: activeTab === id ? "#eff6ff" : "transparent",
        borderRadius: 10, cursor: "pointer",
        color: activeTab === id ? "#2563eb" : "#6b7280", width: "100%",
      }}
    >
      {icon}
      <span style={{ fontSize: "0.6rem", fontWeight: 700, textAlign: "center" }}>{label}</span>
    </button>
  );

  const selectedFaceDef = selectedFace ? faces.find(f => f.id === selectedFace) ?? null : null;

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 54, borderBottom: "1px solid #e5e7eb", display: "flex",
        alignItems: "center", padding: "0 1rem", gap: "0.75rem",
        background: "#fff", flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "0.35rem 0.75rem", border: "1px solid #e5e7eb",
            borderRadius: 8, background: "#fff", cursor: "pointer",
            fontSize: "0.85rem", color: "#374151", fontWeight: 600,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Upload &amp; Design
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{product.name}</span>
        </div>

        {/* Outside / Inside toggle */}
        <div style={{
          display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 2,
        }}>
          {(["outside", "inside"] as const).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSelectedFace(null); setSelectedItemId(null); }}
              style={{
                padding: "4px 14px", border: "none", borderRadius: 6, cursor: "pointer",
                fontWeight: 700, fontSize: "0.8rem",
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "#111827" : "#6b7280",
                boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <button style={{
          padding: "0.4rem 1.25rem", background: "#7c3aed", color: "#fff",
          border: "none", borderRadius: 8, cursor: "pointer",
          fontSize: "0.875rem", fontWeight: 700,
        }}>
          Save
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left icon rail */}
        <div style={{
          width: 68, borderRight: "1px solid #e5e7eb", background: "#fff",
          display: "flex", flexDirection: "column", gap: 4, padding: "8px 5px", flexShrink: 0,
        }}>
          {tabBtn("uploads",
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>,
            "Uploads"
          )}
          {tabBtn("text",
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
            "Text"
          )}
          {tabBtn("elements",
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="10" strokeDasharray="4 2"/></svg>,
            "Elements"
          )}
        </div>

        {/* Left expanded panel */}
        <div style={{
          width: 200, borderRight: "1px solid #e5e7eb", background: "#fff",
          overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ padding: "0.65rem 1rem 0.4rem", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
              {activeTab}
            </span>
          </div>

          {activeTab === "uploads" && (
            <div style={{ padding: "1rem" }}>
              {!selectedFace && (
                <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 0.75rem", textAlign: "center" }}>
                  Select a face on the dieline first
                </p>
              )}
              <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              <button
                onClick={() => selectedFace && uploadRef.current?.click()}
                style={{
                  width: "100%", padding: "1rem", border: "2px dashed #d1d5db",
                  borderRadius: 10, background: selectedFace ? "#fafafa" : "#f3f4f6",
                  cursor: selectedFace ? "pointer" : "not-allowed",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  color: "#6b7280", fontSize: "0.78rem",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <span style={{ fontWeight: 600 }}>Upload Image</span>
                <span style={{ color: "#9ca3af", fontSize: "0.7rem" }}>JPG, PNG, SVG</span>
              </button>
            </div>
          )}

          {activeTab === "text" && (
            <div style={{ padding: "1rem" }}>
              {!selectedFace && (
                <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 0.75rem", textAlign: "center" }}>
                  Select a face on the dieline first
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Brand Name", "Tagline", "Volume", "Website", "Contact"].map(label => (
                  <button
                    key={label}
                    onClick={() => addText(label)}
                    disabled={!selectedFace}
                    style={{
                      padding: "0.6rem 0.7rem", border: "1px solid #e5e7eb",
                      borderRadius: 8, background: "#fff", cursor: selectedFace ? "pointer" : "not-allowed",
                      textAlign: "left", fontSize: "0.82rem", color: "#374151", fontWeight: 500,
                      opacity: selectedFace ? 1 : 0.5,
                    }}
                  >
                    + {label}
                  </button>
                ))}
                <button
                  onClick={() => addText("Custom text")}
                  disabled={!selectedFace}
                  style={{
                    padding: "0.6rem 0.7rem", border: "2px dashed #7c3aed",
                    borderRadius: 8, background: "#faf5ff", cursor: selectedFace ? "pointer" : "not-allowed",
                    textAlign: "left", fontSize: "0.82rem", color: "#7c3aed", fontWeight: 600,
                    opacity: selectedFace ? 1 : 0.5,
                  }}
                >
                  + Add custom text
                </button>
              </div>

              {/* Text property controls (when text selected) */}
              {selectedText && selectedFace && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>Text style</p>
                  <select
                    value={selectedText.font}
                    onChange={e => updateItem(selectedFace, selectedText.id, { font: e.target.value })}
                    style={{ width: "100%", padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.78rem", marginBottom: 6 }}
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <select
                      value={selectedText.size}
                      onChange={e => updateItem(selectedFace, selectedText.id, { size: Number(e.target.value) })}
                      style={{ flex: 1, padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.78rem" }}
                    >
                      {[10,12,14,16,18,20,24,28,32,36,42].map(s => <option key={s} value={s}>{s}px</option>)}
                    </select>
                    <button
                      onClick={() => updateItem(selectedFace, selectedText.id, { bold: !selectedText.bold })}
                      style={{
                        padding: "0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6,
                        background: selectedText.bold ? "#1d4ed8" : "#fff",
                        color: selectedText.bold ? "#fff" : "#374151",
                        fontWeight: 700, cursor: "pointer",
                      }}
                    >B</button>
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
                    {TEXT_COLORS.map(c => (
                      <button key={c} onClick={() => updateItem(selectedFace, selectedText.id, { color: c })} style={{
                        width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                        border: `2px solid ${selectedText.color === c ? "#3b82f6" : "#e5e7eb"}`,
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={() => { removeItem(selectedFace, selectedText.id); setSelectedItemId(null); }}
                    style={{
                      width: "100%", padding: "0.4rem", border: "1px solid #fca5a5",
                      borderRadius: 6, background: "#fef2f2", color: "#b91c1c",
                      cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                    }}
                  >
                    Delete text
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "elements" && (
            <div style={{ padding: "1rem" }}>
              {!selectedFace && (
                <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "0 0 0.75rem", textAlign: "center" }}>
                  Select a face on the dieline first
                </p>
              )}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>Shapes</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {SHAPES.map(shape => (
                  <button
                    key={shape.label}
                    onClick={() => addShape(shape)}
                    disabled={!selectedFace}
                    title={shape.label}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "8px 4px", border: "1px solid #e5e7eb", borderRadius: 8,
                      background: "#fff", cursor: selectedFace ? "pointer" : "not-allowed",
                      opacity: selectedFace ? 1 : 0.5,
                    }}
                  >
                    <img src={svgUrl(shape.svg)} alt={shape.label} style={{ width: 36, height: 28, objectFit: "contain" }} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#374151" }}>{shape.label}</span>
                  </button>
                ))}
              </div>

              {/* Box color section */}
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>Box Color (all faces)</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  {BOX_COLORS.map(c => (
                    <button key={c.value} onClick={() => setBoxColor(c.value)} title={c.label} style={{
                      width: 26, height: 26, borderRadius: "50%", background: c.value, padding: 0,
                      cursor: "pointer", border: "2px solid #e5e7eb",
                    }} />
                  ))}
                </div>
                <p style={{ margin: "0.75rem 0 0.4rem", fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>Inside Color</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {INSIDE_COLORS.map(c => (
                    <button key={c.value} onClick={() => setInsideColor(c.value)} title={c.label} style={{
                      width: 26, height: 26, borderRadius: "50%", background: c.value, padding: 0,
                      cursor: "pointer", border: `2px solid ${state.insideColor === c.value ? "#7c3aed" : "#e5e7eb"}`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Center: Dieline canvas ── */}
        <div style={{
          flex: 1, background: "#f1f5f9", display: "flex", flexDirection: "column",
          overflow: "hidden", position: "relative",
        }}>
          {/* Canvas scroll area */}
          <div
            style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
            onClick={() => { setSelectedFace(null); setSelectedItemId(null); setEditingItemId(null); }}
          >
            {/* Dieline container */}
            <div style={{
              position: "relative",
              width: TOTAL_DIELINE_W * zoom,
              height: TOTAL_DIELINE_H * zoom,
              flexShrink: 0,
            }}>
              {/* Dieline background */}
              <div style={{
                position: "absolute", inset: 0,
                background: "#e8d5b7",
                borderRadius: 4,
                opacity: 0.3,
              }} />

              {/* Cut/fold lines */}
              <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                width={TOTAL_DIELINE_W * zoom} height={TOTAL_DIELINE_H * zoom}>
                {/* Outer border */}
                <rect x={PAD * zoom} y={PAD * zoom}
                  width={(TOTAL_DIELINE_W - PAD * 2) * zoom}
                  height={(TOTAL_DIELINE_H - PAD * 2) * zoom}
                  fill="none" stroke="#aaa" strokeWidth="0.8" strokeDasharray="4 3" />
              </svg>

              {/* Face panels */}
              {faces.map(face => {
                const faceColor = view === "inside" && face.id === "back"
                  ? state.insideColor
                  : (state.faceColors[face.id] ?? "#c8a97e");
                return (
                  <DielineFace
                    key={face.id + "-" + view}
                    face={face}
                    color={faceColor}
                    selected={selectedFace === face.id}
                    hovered={hoveredFace === face.id && selectedFace !== face.id}
                    onSelect={() => { setSelectedFace(face.id as FaceId); setSelectedItemId(null); }}
                    onHover={() => setHoveredFace(face.id as FaceId)}
                    onLeave={() => setHoveredFace(null)}
                    items={(getFaceItems(face.id)).map(item => ({
                      ...item,
                      // items are in face-local coords
                    }))}
                    zoom={zoom}
                  />
                );
              })}

              {/* Draggable items on selected face */}
              {selectedFace && (() => {
                const face = faces.find(f => f.id === selectedFace);
                if (!face) return null;
                const items = getFaceItems(selectedFace);
                return items.map(item => {
                  const isSelected = selectedItemId === item.id;
                  const isEditing = editingItemId === item.id;

                  if (item.kind === "text") {
                    return (
                      <div
                        key={item.id + (isEditing ? "-e" : "")}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={isEditing}
                        style={{
                          position: "absolute",
                          left: (face.x + item.x) * zoom,
                          top: (face.y + item.y) * zoom,
                          width: item.w * zoom,
                          fontFamily: item.font,
                          fontSize: `${item.size * zoom}px`,
                          fontWeight: item.bold ? 700 : 400,
                          color: item.color,
                          textAlign: item.align,
                          padding: "2px 4px",
                          border: isSelected ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                          borderRadius: 2,
                          cursor: isEditing ? "text" : "move",
                          userSelect: isEditing ? "text" : "none",
                          outline: "none",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          zIndex: isSelected ? 20 : 10,
                          background: "transparent",
                        }}
                        onPointerDown={e => {
                          if (isEditing) return;
                          e.stopPropagation();
                          setSelectedItemId(item.id);
                          startDragItem(e, selectedFace, item);
                        }}
                        onDoubleClick={e => { e.stopPropagation(); setEditingItemId(item.id); }}
                        onBlur={e => {
                          updateItem(selectedFace, item.id, { text: e.currentTarget.textContent ?? item.text });
                          setEditingItemId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {item.text}
                      </div>
                    );
                  }

                  if (item.kind === "image") {
                    return (
                      <div
                        key={item.id}
                        style={{
                          position: "absolute",
                          left: (face.x + item.x) * zoom,
                          top: (face.y + item.y) * zoom,
                          width: item.w * zoom,
                          height: item.h * zoom,
                          border: isSelected ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                          cursor: "move", zIndex: isSelected ? 20 : 10,
                        }}
                        onPointerDown={e => { e.stopPropagation(); setSelectedItemId(item.id); startDragItem(e, selectedFace, item); }}
                        onClick={e => e.stopPropagation()}
                      >
                        <img src={item.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
                        {isSelected && (
                          <button
                            onClick={e => { e.stopPropagation(); removeItem(selectedFace, item.id); setSelectedItemId(null); }}
                            style={{
                              position: "absolute", top: -8, right: -8,
                              width: 18, height: 18, borderRadius: "50%",
                              background: "#ef4444", color: "#fff", border: "none",
                              cursor: "pointer", fontSize: "0.6rem", fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              zIndex: 30,
                            }}
                          >✕</button>
                        )}
                      </div>
                    );
                  }
                  return null;
                });
              })()}
            </div>
          </div>

          {/* ── Bottom toolbar: undo/redo + zoom + face color ── */}
          <div style={{
            height: 50, borderTop: "1px solid #e5e7eb", background: "#fff",
            display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem",
            flexShrink: 0,
          }}>
            {/* Undo / Redo */}
            <button
              onClick={undo}
              disabled={histIdx === 0}
              title="Undo (⌘Z)"
              style={{
                width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 8,
                background: histIdx === 0 ? "#f9fafb" : "#fff", cursor: histIdx === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: histIdx === 0 ? "#d1d5db" : "#374151",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={histIdx >= history.length - 1}
              title="Redo (⌘Y)"
              style={{
                width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 8,
                background: histIdx >= history.length - 1 ? "#f9fafb" : "#fff",
                cursor: histIdx >= history.length - 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: histIdx >= history.length - 1 ? "#d1d5db" : "#374151",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4"/>
              </svg>
            </button>

            <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

            {/* Zoom */}
            <button onClick={() => setZoom(z => parseFloat(Math.max(0.5, z - 0.1).toFixed(1)))} style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 700, color: "#374151" }}>−</button>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", minWidth: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => parseFloat(Math.min(2, z + 0.1).toFixed(1)))} style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 700, color: "#374151" }}>+</button>
            <button onClick={() => setZoom(1)} style={{ padding: "0 8px", height: 28, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280" }}>Fit</button>

            <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

            {/* Selected face color picker */}
            {selectedFace && selectedFaceDef && (
              <>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>
                  {selectedFaceDef.label} color:
                </span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {BOX_COLORS.map(c => (
                    <button key={c.value} onClick={() => setFaceColor(selectedFace, c.value)} title={c.label} style={{
                      width: 22, height: 22, borderRadius: "50%", background: c.value, padding: 0, cursor: "pointer",
                      border: `2px solid ${state.faceColors[selectedFace] === c.value ? "#3b82f6" : "#e5e7eb"}`,
                    }} />
                  ))}
                  <input type="color" value={state.faceColors[selectedFace] ?? "#c8a97e"} onChange={e => setFaceColor(selectedFace, e.target.value)}
                    style={{ width: 28, height: 28, border: "1px solid #d1d5db", borderRadius: 6, padding: 2, cursor: "pointer" }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "#6b7280", cursor: "pointer" }}>
                    <input type="checkbox" checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} style={{ width: 13, height: 13 }} />
                    All faces
                  </label>
                </div>
              </>
            )}

            {!selectedFace && (
              <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                Click a panel on the dieline to select and edit it
              </span>
            )}

            {/* Delete selected item */}
            {selectedItemId && selectedFace && (
              <>
                <div style={{ width: 1, height: 24, background: "#e5e7eb", marginLeft: "auto" }} />
                <button
                  onClick={() => { removeItem(selectedFace, selectedItemId); setSelectedItemId(null); }}
                  style={{
                    padding: "0.3rem 0.8rem", border: "1px solid #fca5a5",
                    borderRadius: 6, background: "#fef2f2", color: "#b91c1c",
                    cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                  }}
                >Delete item</button>
              </>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          width: 220, borderLeft: "1px solid #e5e7eb", background: "#fafafa",
          flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* 3D Preview */}
          <div style={{ padding: "0.75rem 0.75rem 0", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                3D Preview
              </span>
              <span style={{ fontSize: "0.65rem", background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>3D</span>
            </div>
            <Box3DPreview
              faceColors={state.faceColors}
              insideColor={state.insideColor}
              openAmount={openAmount}
            />

            {/* Open / Close slider */}
            <div style={{ padding: "0.5rem 0 0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Open</span>
                <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Close</span>
              </div>
              <input
                type="range" min={0} max={100} value={openAmount}
                onChange={e => setOpenAmount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }}
              />
            </div>
          </div>

          {/* Package Color (outside) */}
          <div style={{ padding: "0.75rem", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Package Color
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BOX_COLORS.map(c => (
                <button key={c.value} onClick={() => setBoxColor(c.value)} title={c.label} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c.value, padding: 0, cursor: "pointer",
                  border: `2px solid ${state.faceColors["front"] === c.value ? "#7c3aed" : "#d1d5db"}`,
                  outline: state.faceColors["front"] === c.value ? "3px solid #ddd6fe" : "none",
                  outlineOffset: 2,
                }} />
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>
                Custom color
                <input type="color" defaultValue="#c8a97e" onChange={e => setBoxColor(e.target.value)}
                  style={{ width: "100%", height: 32, border: "1px solid #d1d5db", borderRadius: 6, padding: 2, cursor: "pointer" }} />
              </label>
            </div>
          </div>

          {/* Inside Color */}
          <div style={{ padding: "0.75rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Inside Color
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {INSIDE_COLORS.map(c => (
                <button key={c.value} onClick={() => setInsideColor(c.value)} title={c.label} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c.value, padding: 0, cursor: "pointer",
                  border: `2px solid ${state.insideColor === c.value ? "#7c3aed" : "#d1d5db"}`,
                  outline: state.insideColor === c.value ? "3px solid #ddd6fe" : "none",
                  outlineOffset: 2,
                }} />
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>
                Custom color
                <input type="color" value={state.insideColor} onChange={e => setInsideColor(e.target.value)}
                  style={{ width: "100%", height: 32, border: "1px solid #d1d5db", borderRadius: 6, padding: 2, cursor: "pointer" }} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
