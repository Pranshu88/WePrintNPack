"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import type { Product } from "@/lib/types";
import CheckoutOverlay from "@/components/checkout-overlay";

// ─── Mailer Box geometry (mm / px at zoom=1) ────────────────────────────────
const BW   = 315;  // base / front / back wall width
const BH   = 202;  // base / side wall height
const BD   = 62;   // depth  = side wall width = front/back wall height
const DWST = 24;   // dust flap height
const PAD  = 22;   // canvas padding

// ─── Key X positions ─────────────────────────────────────────────────────────
const NX0 = PAD;
const NX1 = PAD + BD;
const NX2 = PAD + BD + BW;
const NX3 = PAD + BD + BW + BD;

// ─── Key Y positions ─────────────────────────────────────────────────────────
const NY0 = PAD;
const NY1 = PAD + DWST;
const NY2 = PAD + DWST + BD;
const NY3 = PAD + DWST + BD + BH;
const NY4 = PAD + DWST + BD + BH + BD;
const NY5 = PAD + DWST + BD + BH + BD + DWST;

// ─── Dust Flap geometry ───────────────────────────────────────────────────────
const DUST_H  = BH / 2;                  // Dust Flap (Top) height — half of base height
const LID_H   = BD + DWST - 15;         // Back Side row height — same as Bot row
const BOT_H   = BD + DWST - 15;         // Bottom row height
const SUPER_H = LID_H;                  // Dust Flap Super Top height — same as Back Side
const NY_DUST = NY0 + SUPER_H;          // Dust Flap top y
const NY_LID  = NY_DUST + DUST_H;       // Back Side top y
const NY_BASE = NY_LID + LID_H;         // Base row top y
const NY_BOT  = NY_BASE + BH;           // Bottom row top y
const NY_DBOT        = NY_BOT + BOT_H;         // Dust Flap Bottom start y (below Front Side)
const DIELINE_H_FULL = NY_DBOT + DUST_H + PAD; // Total canvas height

// ─── Faces ───────────────────────────────────────────────────────────────────
type FaceId =
  | "dust-flap-top"
  | "lid" | "lid-left" | "lid-right"
  | "dust-flap-bottom"
  | "side-left-flap" | "side-left" | "front" | "side-right" | "side-right-flap"
  | "bottom" | "bot-left" | "bot-right"
  | "back"
  | "sq-dust-flap" | "sq-inner-flap" | "sq-outer-flap" | "sq-lock-flap"
  | "sq-inner-base-flap" | "sq-outer-base-flap" | "sq-support-flap" | "sq-closure-flap"
  | "sq-left-side-panel" | "sq-front-panel" | "sq-right-side-panel" | "sq-back-panel";

type FaceDef = { id: FaceId; label: string; x: number; y: number; w: number; h: number; small?: boolean; dashedLines?: boolean; clipBottomLeft?: boolean; clipBottomRight?: boolean; clipTopRight?: boolean; clipTopLeft?: boolean; roundTL?: boolean; roundTR?: boolean; verticalLabel?: boolean };

const FACES_OUTSIDE: FaceDef[] = [
  { id: "dust-flap-top",        label: "Dust Flap (Top)",          x: NX1,          y: NY_DUST, w: BW,                                    h: DUST_H },
  { id: "lid",           label: "Back Side",        x: NX1,      y: NY_LID,  w: BW,      h: LID_H },
  { id: "lid-left",      label: "Side Wall Flap (Left)",  x: NX0 - 20, y: NY_LID, w: BD + 20, h: LID_H, small: true },
  { id: "lid-right",     label: "Side Wall Flap (Right)", x: NX2,      y: NY_LID, w: BD + 20, h: LID_H, small: true },
  { id: "side-left-flap", label: "Left Side Flap", x: NX0 - 60, y: NY_BASE, w: 60,      h: BH },
  { id: "side-left",      label: "Left Side Wall", x: NX0,      y: NY_BASE, w: BD,      h: BH },
  { id: "front",          label: "Base",              x: NX1,      y: NY_BASE, w: BW,      h: BH },
  { id: "dust-flap-bottom", label: "Dust Flap Bottom",   x: NX1,    y: NY_DBOT, w: BW,      h: DUST_H },
  { id: "side-right",      label: "Right Side Wall", x: NX2,      y: NY_BASE, w: BD, h: BH },
  { id: "side-right-flap", label: "Right Side Flap", x: NX2 + BD, y: NY_BASE, w: 60, h: BH },
  { id: "bottom",        label: "Front Side",       x: NX1,      y: NY_BOT,  w: BW,      h: BOT_H },
  { id: "bot-left",      label: "Bot Flap L",       x: NX0 - 20, y: NY_BOT,  w: BD + 20, h: BOT_H, small: true },
  { id: "bot-right",     label: "Bot Flap R",       x: NX2,      y: NY_BOT,  w: BD + 20, h: BOT_H, small: true },
];

const TOTAL_DIELINE_W = NX3 + PAD;
const TOTAL_DIELINE_H = NY5 + PAD;

// ─── Dieline SVG variable aliases ────────────────────────────────────────────
const LX0 = NX0;    // left edge of left wing
const LX1 = NX1;    // left edge of base / flap
const LX2 = NX1;    // vertical fold line (left)
const LX3 = NX2;    // vertical fold line (right)
const LX4 = NX2;    // right edge of base / flap
const LX5 = NX3;    // right edge of right wing
const LY_TOP = NY0; // top of top flap
const LY2 = NY2;    // top of base row
const LY3 = NY3;    // bottom of base row
const LY4 = NY5;    // bottom of bottom flap
const COR = 8;      // corner rounding value

// ─── Item types ───────────────────────────────────────────────────────────────
type TextItem  = { id: string; kind: "text"; text: string; x: number; y: number; w: number; font: string; size: number; bold: boolean; color: string; align: "left"|"center"|"right" };
type ImageItem = { id: string; kind: "image"; src: string; x: number; y: number; w: number; h: number };
type CanvasItem = TextItem | ImageItem;

type ViewData   = { faceColors: Record<string, string>; items: Record<string, CanvasItem[]> };
type EditorState = { outside: ViewData; inside: ViewData; insideColor: string };

// ─── Colors ───────────────────────────────────────────────────────────────────
const BOX_COLORS = [
  { label: "Kraft Brown", value: "#c8a97e" },
  { label: "White",       value: "#f5f5f5" },
  { label: "Cream",       value: "#f5e6c8" },
  { label: "Gold",        value: "#d4a017" },
  { label: "Rose",        value: "#f4c2c2" },
  { label: "Brown",       value: "#5c3d1e" },
  { label: "Forest",      value: "#2d5a27" },
];

const INSIDE_COLORS = [
  { label: "Natural", value: "#d4b896" },
  { label: "White",   value: "#f9fafb" },
  { label: "Black",   value: "#111827" },
  { label: "Cream",   value: "#fef9c3" },
  { label: "Blue",    value: "#dbeafe" },
  { label: "Sage",    value: "#d1fae5" },
];

const TEXT_COLORS = ["#000000","#ffffff","#dc2626","#ea580c","#ca8a04","#16a34a","#0891b2","#1d4ed8","#7c3aed","#db2777"];

const FONT_OPTIONS = [
  { label: "Arial",   value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Impact",  value: "Impact, fantasy" },
  { label: "Tahoma",  value: "Tahoma, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

// ─── Shapes ───────────────────────────────────────────────────────────────────
const SHAPES = [
  { label: "Line",     svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20"><rect x="0" y="7" width="120" height="6" rx="3" fill="#374151"/></svg>`, w: 100, h: 14 },
  { label: "Dashed",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20"><line x1="0" y1="10" x2="120" y2="10" stroke="#374151" strokeWidth="5" strokeDasharray="12 6"/></svg>`, w: 100, h: 14 },
  { label: "Arrow →",  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><path d="M4 20 h42 m-12 -12 l12 12 -12 12" stroke="#374151" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>`, w: 60, h: 40 },
  { label: "Circle",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#374151"/></svg>`, w: 72, h: 72 },
  { label: "Square",   svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="6" fill="#374151"/></svg>`, w: 72, h: 72 },
  { label: "Triangle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 88"><polygon points="50,2 98,86 2,86" fill="#374151"/></svg>`, w: 72, h: 64 },
  { label: "Star",     svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151"/></svg>`, w: 72, h: 72 },
  { label: "Heart",    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151"/></svg>`, w: 72, h: 65 },
];

// ─── Packaging Symbols ────────────────────────────────────────────────────────
const PACKAGING_SYMBOLS = [
  { label: "Handle Care", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30 80 C20 70 15 55 15 45 C15 32 25 22 38 22 C44 22 49 25 52 30 C55 25 60 22 66 22 C79 22 89 32 89 45 C89 55 84 70 74 80 Z" stroke="#111" strokeWidth="5" fill="none" strokeLinejoin="round"/><path d="M40 80 L40 90 M60 80 L60 90" stroke="#111" strokeWidth="5" strokeLinecap="round"/></svg>`, w: 64, h: 64 },
  { label: "Keep Dry", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 12 Q90 45 50 55 Q10 45 50 12Z" stroke="#111" strokeWidth="4" fill="none" strokeLinejoin="round"/><path d="M50 55 L50 85 Q50 95 60 95" stroke="#111" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M20 72 L23 80 M35 68 L38 76 M55 68 L58 76 M70 72 L73 80" stroke="#4aabff" strokeWidth="3.5" strokeLinecap="round"/></svg>`, w: 64, h: 64 },
  { label: "This Side Up", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polyline points="50,15 50,75" stroke="#111" strokeWidth="5" strokeLinecap="round"/><polyline points="25,40 50,15 75,40" stroke="#111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="20" y1="85" x2="80" y2="85" stroke="#111" strokeWidth="5" strokeLinecap="round"/></svg>`, w: 64, h: 64 },
  { label: "Fragile", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 L55 30 L70 15 L58 35 L80 28 L62 45 L85 50 L62 55 L80 72 L58 65 L70 85 L55 70 L50 90 L45 70 L30 85 L42 65 L20 72 L38 55 L15 50 L38 45 L20 28 L42 35 L30 15 L45 30 Z" stroke="#111" strokeWidth="3" fill="none"/></svg>`, w: 64, h: 64 },
  { label: "Recycle", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 15 L62 35 L38 35 Z" fill="#111"/><path d="M62 35 L85 75 L50 75" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M38 35 L15 75 L50 75" stroke="#111" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>`, w: 64, h: 64 },
  { label: "No Stack", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="55" width="60" height="20" rx="4" stroke="#111" strokeWidth="4" fill="none"/><rect x="20" y="30" width="60" height="20" rx="4" stroke="#111" strokeWidth="4" fill="none"/><line x1="10" y1="10" x2="90" y2="90" stroke="#e11d48" strokeWidth="6" strokeLinecap="round"/></svg>`, w: 64, h: 64 },
];

// ─── Patterns ─────────────────────────────────────────────────────────────────
const PATTERNS = [
  { label: "Dots",      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><circle cx="10" cy="10" r="4" fill="#6b7280"/><circle cx="30" cy="10" r="4" fill="#6b7280"/><circle cx="50" cy="10" r="4" fill="#6b7280"/><circle cx="70" cy="10" r="4" fill="#6b7280"/><circle cx="10" cy="30" r="4" fill="#6b7280"/><circle cx="30" cy="30" r="4" fill="#6b7280"/><circle cx="50" cy="30" r="4" fill="#6b7280"/><circle cx="70" cy="30" r="4" fill="#6b7280"/><circle cx="10" cy="50" r="4" fill="#6b7280"/><circle cx="30" cy="50" r="4" fill="#6b7280"/><circle cx="50" cy="50" r="4" fill="#6b7280"/><circle cx="70" cy="50" r="4" fill="#6b7280"/><circle cx="10" cy="70" r="4" fill="#6b7280"/><circle cx="30" cy="70" r="4" fill="#6b7280"/><circle cx="50" cy="70" r="4" fill="#6b7280"/><circle cx="70" cy="70" r="4" fill="#6b7280"/></svg>` },
  { label: "Stripes",   svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><line x1="0" y1="0" x2="80" y2="80" stroke="#6b7280" strokeWidth="4"/><line x1="20" y1="0" x2="100" y2="80" stroke="#6b7280" strokeWidth="4"/><line x1="40" y1="0" x2="120" y2="80" stroke="#6b7280" strokeWidth="4"/><line x1="-20" y1="0" x2="60" y2="80" stroke="#6b7280" strokeWidth="4"/><line x1="-40" y1="0" x2="40" y2="80" stroke="#6b7280" strokeWidth="4"/></svg>` },
  { label: "Diamonds",  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><polygon points="20,5 35,20 20,35 5,20" fill="none" stroke="#6b7280" strokeWidth="2"/><polygon points="60,5 75,20 60,35 45,20" fill="none" stroke="#6b7280" strokeWidth="2"/><polygon points="20,45 35,60 20,75 5,60" fill="none" stroke="#6b7280" strokeWidth="2"/><polygon points="60,45 75,60 60,75 45,60" fill="none" stroke="#6b7280" strokeWidth="2"/></svg>` },
  { label: "Checker",   svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><rect x="0" y="0" width="20" height="20" fill="#374151"/><rect x="40" y="0" width="20" height="20" fill="#374151"/><rect x="20" y="20" width="20" height="20" fill="#374151"/><rect x="60" y="20" width="20" height="20" fill="#374151"/><rect x="0" y="40" width="20" height="20" fill="#374151"/><rect x="40" y="40" width="20" height="20" fill="#374151"/><rect x="20" y="60" width="20" height="20" fill="#374151"/><rect x="60" y="60" width="20" height="20" fill="#374151"/></svg>` },
  { label: "Floral",    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#fdf4ff"/><circle cx="20" cy="20" r="8" fill="#e879f9" opacity=".6"/><circle cx="60" cy="20" r="8" fill="#a855f7" opacity=".6"/><circle cx="20" cy="60" r="8" fill="#a855f7" opacity=".6"/><circle cx="60" cy="60" r="8" fill="#e879f9" opacity=".6"/><circle cx="40" cy="40" r="10" fill="#c026d3" opacity=".5"/></svg>` },
  { label: "Grid",      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f3f4f6"/><line x1="20" y1="0" x2="20" y2="80" stroke="#d1d5db" strokeWidth="1.5"/><line x1="40" y1="0" x2="40" y2="80" stroke="#d1d5db" strokeWidth="1.5"/><line x1="60" y1="0" x2="60" y2="80" stroke="#d1d5db" strokeWidth="1.5"/><line x1="0" y1="20" x2="80" y2="20" stroke="#d1d5db" strokeWidth="1.5"/><line x1="0" y1="40" x2="80" y2="40" stroke="#d1d5db" strokeWidth="1.5"/><line x1="0" y1="60" x2="80" y2="60" stroke="#d1d5db" strokeWidth="1.5"/></svg>` },
];

// ─── Text combos ─────────────────────────────────────────────────────────────
const TEXT_COMBOS = [
  { label: "Dark Badge",  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="8" fill="#111827"/><text x="100" y="40" textAnchor="middle" fill="#f59e0b" fontFamily="Georgia,serif" fontSize="13" fontWeight="bold">BRAND NAME</text><text x="100" y="62" textAnchor="middle" fill="#9ca3af" fontFamily="Arial" fontSize="9">SEALED WITH LOVE AND PATIENCE</text><text x="100" y="75" textAnchor="middle" fill="#9ca3af" fontFamily="Arial" fontSize="9">KEEPING GOOD INSIDE</text><text x="100" y="100" textAnchor="middle" fill="#f9fafb" fontFamily="Impact,fantasy" fontSize="22" fontWeight="bold">WINE</text></svg>`, w: 160, h: 96 },
  { label: "White Badge", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="8" fill="white" stroke="#111" strokeWidth="3"/><text x="100" y="35" textAnchor="middle" fill="#374151" fontFamily="Georgia,serif" fontSize="12" fontWeight="bold">BRAND NAME</text><text x="100" y="55" textAnchor="middle" fill="#6b7280" fontFamily="Arial" fontSize="9">SEALED WITH LOVE AND PATIENCE</text><text x="100" y="70" textAnchor="middle" fill="#6b7280" fontFamily="Arial" fontSize="9">KEEPING GOOD INSIDE</text><text x="100" y="100" textAnchor="middle" fill="#111827" fontFamily="Impact" fontSize="22" fontWeight="bold">BRAND</text></svg>`, w: 160, h: 96 },
  { label: "Round Badge", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#4338ca" stroke="#6366f1" strokeWidth="3"/><text x="60" y="45" textAnchor="middle" fill="#fde68a" fontFamily="Arial" fontSize="11" fontWeight="bold">YOUR BRAND</text><text x="60" y="62" textAnchor="middle" fill="white" fontFamily="Georgia" fontSize="14" fontWeight="bold">HERE</text><text x="60" y="80" textAnchor="middle" fill="#c7d2fe" fontFamily="Arial" fontSize="8">EST. 2024</text></svg>`, w: 80, h: 80 },
];

function uid() { return Math.random().toString(36).slice(2, 9); }
function svgUrl(svg: string) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }

function defaultViewData(): ViewData {
  const fc: Record<string, string> = {};
  FACES_OUTSIDE.forEach(f => { fc[f.id] = "#c8a97e"; });
  fc["back"] = "#c8a97e";
  return { faceColors: fc, items: {} };
}
function defaultState(): EditorState {
  return { outside: defaultViewData(), inside: defaultViewData(), insideColor: "#d4b896" };
}

// Faces that fold 90° vertical in step 1 (0 → 14.28%)
const FOLD_TOP_IDS = new Set([
  "lid-left", "lid", "lid-right",
  "dust-flap-top",
]);
const FOLD_BOT_IDS = new Set(["bot-left", "bottom", "bot-right", "dust-flap-bottom"]);
const FOLD_ALL_IDS = new Set([...FOLD_TOP_IDS, ...FOLD_BOT_IDS]);

// Square-mode step-1: Right Side Panel + Back Panel column + all attached flaps rotate inward
const SQ_FOLD1_IDS = new Set([
  "sq-right-side-panel", "sq-outer-flap", "sq-support-flap",
  "sq-back-panel", "sq-lock-flap", "sq-closure-flap",
]);
// Square-mode step-3: Back Panel + attached flaps get additional 90° sub-rotation inside step-1 group
const SQ_FOLD3_IDS = new Set(["sq-back-panel", "sq-lock-flap", "sq-closure-flap"]);
// Square-mode step-2: Left Side Panel + attached top/bottom flaps rotate 90° inward
const SQ_FOLD2_IDS = new Set(["sq-left-side-panel", "sq-dust-flap", "sq-inner-base-flap"]);
// Square-mode step-4: Outer Base Flap + Closure Flap fold 90° inward (rotateX around top edge)
const SQ_FOLD4_IDS = new Set(["sq-outer-base-flap", "sq-closure-flap"]);
// Square-mode step-5: Support Flap + Inner Base Flap fold 90° inward (rotateX around top edge)
const SQ_FOLD5_IDS = new Set(["sq-support-flap", "sq-inner-base-flap"]);
// Square-mode step-6: Dust Flap + Outer Flap fold 90° inward (rotateX around bottom edge)
const SQ_FOLD6_IDS = new Set(["sq-dust-flap", "sq-outer-flap"]);
// Square-mode step-7: Inner Flap + Lock Flap fold 90° inward (rotateX around bottom edge)
const SQ_FOLD7_IDS = new Set(["sq-inner-flap", "sq-lock-flap"]);

// ─── Clip path helper (shared by dieline + 3D preview) ───────────────────────
function getFaceClipPath(face: FaceDef, s: number, mirror = false): string | undefined {
  const bl = mirror ? face.clipBottomRight : face.clipBottomLeft;
  const br = mirror ? face.clipBottomLeft  : face.clipBottomRight;
  const tr = mirror ? face.clipTopLeft     : face.clipTopRight;
  const tl = mirror ? face.clipTopRight    : face.clipTopLeft;
  if (!bl && !br && !tr && !tl) return undefined;
  const W = face.w * s, H = face.h * s;
  const cs = 8 * s;
  const endY = H - Math.min(30 * s, H * 0.2);
  const startY = Math.min(30 * s, H * 0.2);
  if (bl && tr) return `path('M 0 ${startY + cs} Q 0 ${startY} ${cs} ${startY - cs} L ${W + 2} -2 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`;
  if (br && tl) return `path('M ${W + 2} ${startY + cs} Q ${W + 2} ${startY} ${W - cs} ${startY - cs} L -2 -2 L -2 ${H - cs} Q -2 ${H + 2} ${cs} ${H + 2} L ${W - cs} ${endY + cs} Q ${W + 2} ${endY} ${W + 2} ${endY - cs} Z')`;
  if (bl)  return `path('M 0 0 L ${W + 2} 0 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`;
  if (br)  return `path('M 0 0 L ${W} 0 L ${W} ${H} L ${W - cs} ${H} Q 0 ${H} 0 ${H - cs} L 0 ${endY - cs} Q 0 ${endY} ${cs} ${endY + cs} Z')`;
  if (tr)  return `path('M -2 ${H + 2} L ${W + 2} ${H + 2} L ${W + 2} ${cs} Q ${W + 2} -2 ${W - cs} -2 L ${cs} ${startY + cs} Q 0 ${startY} 0 ${startY - cs} Z')`;
  if (tl)  return `path('M 0 0 L ${W - cs} 0 Q ${W} 0 ${W} ${cs} L ${W} ${H} L 0 ${H} Z')`;
  return undefined;
}

// ─── Face canvas renderer (for admin preview snapshots) ──────────────────────
async function renderFaceToCanvas(
  color: string,
  items: CanvasItem[],
  wMM: number,
  hMM: number,
): Promise<string> {
  const sc = 1.8;
  const W = Math.round(wMM * sc);
  const H = Math.round(hMM * sc);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  for (const item of items) {
    if (item.kind === "image") {
      await new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => {
          try { ctx.drawImage(img, item.x * sc, item.y * sc, item.w * sc, item.h * sc); } catch { /* skip */ }
          res();
        };
        img.onerror = () => res();
        img.src = item.src;
      });
    } else if (item.kind === "text") {
      ctx.save();
      ctx.font = `${item.bold ? "bold " : ""}${item.size * sc}px ${item.font.split(",")[0].trim()}`;
      ctx.fillStyle = item.color;
      ctx.textAlign = item.align as CanvasTextAlign;
      const tx = item.align === "center" ? (item.x + item.w / 2) * sc
               : item.align === "right"  ? (item.x + item.w)     * sc
               :                            item.x                * sc;
      ctx.fillText(item.text, tx, (item.y + item.size) * sc);
      ctx.restore();
    }
  }
  return c.toDataURL("image/jpeg", 0.88);
}

// ─── 3D CSS Box ───────────────────────────────────────────────────────────────
function renderPreviewItem(item: CanvasItem, s: number) {
  if (item.kind === "text") return (
    <div key={item.id} style={{ position: "absolute", left: item.x * s, top: item.y * s, width: item.w * s, fontFamily: item.font, fontSize: `${item.size * s}px`, fontWeight: item.bold ? 700 : 400, color: item.color, textAlign: item.align, whiteSpace: "pre-wrap", wordBreak: "break-word", pointerEvents: "none", userSelect: "none" }}>{item.text}</div>
  );
  if (item.kind === "image") return (
    <img key={item.id} src={item.src} alt="" draggable={false} style={{ position: "absolute", left: item.x * s, top: item.y * s, width: item.w * s, height: item.h * s, display: "block", pointerEvents: "none" }} />
  );
  return null;
}

function Box3DPreview({ faceColors, insideFaceColors, insideColor, outsideItems, insideItems, openAmount, rotX, rotY, hideFlaps, squareFaces }: {
  faceColors: Record<string, string>; insideFaceColors: Record<string, string>; insideColor: string;
  outsideItems: Record<string, CanvasItem[]>; insideItems: Record<string, CanvasItem[]>;
  openAmount: number; rotX: number; rotY: number; hideFlaps?: boolean; squareFaces?: FaceDef[];
}) {
  const ps = 0.56;
  const sqMode = !!(hideFlaps && squareFaces);
  const cW = (sqMode ? Math.max(...squareFaces!.map(f => f.x + f.w)) + PAD : NX3 + PAD) * ps;
  const cH = (sqMode ? Math.max(...squareFaces!.map(f => f.y + f.h)) + PAD : DIELINE_H_FULL) * ps;

  const t = openAmount / 100;
  // aT starts only after all fold steps end (57.12%), so faces stay opaque during folds
  const FOLD_END = 6 / 7;
  const aT = 0;
  const sp = 1 - aT;
  const lT = Math.max(0, Math.min((t - 0.35) / 0.65, 1));
  const lidAngle = -110 * aT * (1 - lT);
  const step1T    = Math.min(t * 7, 1);
  const foldAngle  = 90 * step1T;
  const step2T    = Math.min(Math.max(0, (t - 1 / 7) * 7), 1);
  const foldAngle2 = 90 * step2T;
  const step3T    = Math.min(Math.max(0, (t - 2 / 7) * 7), 1);
  const foldAngle3 = 90 * step3T;
  const step4T       = Math.min(Math.max(0, (t - 3 / 7) * 7), 1);
  const foldAngle4   = 180 * step4T;
  const sqFoldAngle4 = 90 * step4T;
  const step5T       = Math.min(Math.max(0, (t - 4 / 7) * 7), 1);
  const foldAngle5   = 90 * step5T;
  const sqFoldAngle5 = 90 * step5T;
  const step6T       = Math.min(Math.max(0, (t - 5 / 7) * 7), 1);
  const foldAngle6   = 90 * step6T;
  const sqFoldAngle6 = 90 * step6T;
  const step7T       = Math.min(Math.max(0, (t - 6 / 7) * 7), 1);
  const foldAngle7   = 90 * step7T;
  const sqFoldAngle7 = 90 * step7T;

  const bw = BW * ps, bh = BH * ps, bd = BD * ps;
  const bx = NX1 * ps;
  const by = NY_BASE * ps;

  const fc = faceColors;
  const ff: React.CSSProperties = { position: "absolute", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box" };

  return (
    <div style={{ width: "100%", height: 620, display: "flex", alignItems: "center", justifyContent: "center", perspective: 700, perspectiveOrigin: "50% 30%", overflow: "hidden" }}>
      <div style={{ position: "relative", width: cW, height: cH, transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>

        {/* ── Flat dieline: double-sided — outside on front, inside on back ── */}
        {(sqMode
          ? squareFaces!.filter(f => (step1T === 0 || !SQ_FOLD1_IDS.has(f.id)) && (step2T === 0 || !SQ_FOLD2_IDS.has(f.id)) && (step4T === 0 || !SQ_FOLD4_IDS.has(f.id)) && (step7T === 0 || !SQ_FOLD7_IDS.has(f.id)))
          : FACES_OUTSIDE.filter(f => !FOLD_ALL_IDS.has(f.id) && f.id !== "side-left" && f.id !== "side-left-flap" && f.id !== "side-right" && f.id !== "side-right-flap" && !(hideFlaps && (f.id === "dust-flap-top" || f.id === "dust-flap-bottom" || f.id === "lid-left" || f.id === "lid-right" || f.id === "bot-left" || f.id === "bot-right")))).map(face => (
          <Fragment key={face.id + "-flat"}>
            <div style={{
              ...ff,
              left: face.x * ps, top: face.y * ps,
              width: face.w * ps, height: face.h * ps,
              background: fc[face.id] || "#c8a97e",
              opacity: sp,
              transform: "translateZ(0.5px)",
              backfaceVisibility: "hidden",
              borderRadius: face.roundTL ? `${50 * ps}px 0 0 ${15 * ps}px`
                          : face.roundTR ? `0 ${50 * ps}px ${15 * ps}px 0` : undefined,
            }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>
            <div style={{
              ...ff,
              left: face.x * ps, top: face.y * ps,
              width: face.w * ps, height: face.h * ps,
              background: insideFaceColors[face.id] || insideColor,
              opacity: sp, overflow: "hidden",
              transform: "rotateY(180deg) translateZ(0.5px)",
              backfaceVisibility: "hidden",
              borderRadius: face.roundTL ? `0 ${50 * ps}px ${15 * ps}px 0`
                          : face.roundTR ? `${50 * ps}px 0 0 ${15 * ps}px` : undefined,
            }}>
              {face.small ? (
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.03em", userSelect: "none", textAlign: "center", padding: "1px 2px", lineHeight: 1.2 }}>{face.label}</span>
              ) : (
                <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
              )}
              {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>
          </Fragment>
        ))}

        {/* ── Square Step 1: Right Side Panel + attached flaps rotate 90° inward ── */}
        {sqMode && squareFaces && (() => {
          const fold1Faces = squareFaces.filter(f => SQ_FOLD1_IDS.has(f.id));
          if (fold1Faces.length === 0) return null;
          const pivotXmm = Math.min(...fold1Faces.map(f => f.x)); // left edge of rightmost group
          const pivotX = pivotXmm * ps;
          const directFaces = fold1Faces.filter(f => !SQ_FOLD3_IDS.has(f.id));
          const step3Faces  = fold1Faces.filter(f => SQ_FOLD3_IDS.has(f.id));
          // sub-pivot = left edge of Back Panel column relative to Step-1 pivot
          const subPivotRelX = step3Faces.length > 0 ? (Math.min(...step3Faces.map(f => f.x)) - pivotXmm) * ps : 0;
          const renderS1Face = (face: FaceDef, relLeft: number, relTop?: number) => (
            <Fragment key={face.id + "-s1"}>
              <div style={{ ...ff, left: relLeft, top: relTop ?? face.y * ps, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                {face.small
                  ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                  : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
                {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
              <div style={{ ...ff, left: relLeft, top: relTop ?? face.y * ps, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                {face.small
                  ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                  : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
                {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
            </Fragment>
          );
          return (
            <div style={{ position: "absolute", left: pivotX, top: 0, width: 0, height: cH, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle}deg)` }}>
              {directFaces.filter(f => f.id !== "sq-support-flap" && f.id !== "sq-outer-flap").map(face => renderS1Face(face, (face.x - pivotXmm) * ps))}
              {/* Step-6 sub-fold: Outer Flap folds 90° inward around its bottom edge (pivot = bottom of face) */}
              {(() => {
                const of_ = directFaces.find(f => f.id === "sq-outer-flap");
                if (!of_) return null;
                const relLeft = (of_.x - pivotXmm) * ps;
                const pivotTop = (of_.y + of_.h) * ps; // bottom edge of the flap
                return (
                  <div style={{ position: "absolute", left: relLeft, top: pivotTop, width: of_.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${sqFoldAngle6}deg)` }}>
                    {renderS1Face(of_, 0, -of_.h * ps)}
                  </div>
                );
              })()}
              {/* Step-5 sub-fold: Support Flap folds 90° inward around its top edge */}
              {(() => {
                const sf = directFaces.find(f => f.id === "sq-support-flap");
                if (!sf) return null;
                return (
                  <div style={{ position: "absolute", left: (sf.x - pivotXmm) * ps, top: sf.y * ps, width: sf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${-sqFoldAngle5}deg)` }}>
                    {renderS1Face(sf, 0, 0)}
                  </div>
                );
              })()}
              {/* Step-3 sub-fold: Back Panel group rotates additional 90° around column-2/3 joint */}
              <div style={{ position: "absolute", left: subPivotRelX, top: 0, width: 0, height: cH, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle3}deg)` }}>
                {step3Faces.filter(f => f.id !== "sq-closure-flap" && f.id !== "sq-lock-flap").map(face => renderS1Face(face, 0))}
                {/* Step-7 sub-sub-fold: Lock Flap folds 90° inward around its bottom edge */}
                {(() => {
                  const lf = step3Faces.find(f => f.id === "sq-lock-flap");
                  if (!lf) return null;
                  return (
                    <div style={{ position: "absolute", left: 0, top: (lf.y + lf.h) * ps, width: lf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${sqFoldAngle7}deg)` }}>
                      {renderS1Face(lf, 0, -lf.h * ps)}
                    </div>
                  );
                })()}
                {/* Step-4 sub-sub-fold: Closure Flap folds 90° inward around its top edge */}
                {(() => {
                  const cf = step3Faces.find(f => f.id === "sq-closure-flap");
                  if (!cf) return null;
                  return (
                    <div style={{ position: "absolute", left: 0, top: cf.y * ps, width: cf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${-sqFoldAngle4}deg)` }}>
                      {renderS1Face(cf, 0, 0)}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* ── Square Step 2: Left Side Panel rotates 90° inward (pivot = right edge) ── */}
        {sqMode && squareFaces && step2T > 0 && (() => {
          const fold2Faces = squareFaces.filter(f => SQ_FOLD2_IDS.has(f.id));
          if (fold2Faces.length === 0) return null;
          const pivotXmm = fold2Faces[0].x + fold2Faces[0].w; // right edge (all share same x = NX1)
          return (
            <div style={{ position: "absolute", left: pivotXmm * ps, top: 0, width: 0, height: cH, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${-foldAngle2}deg)` }}>
              {fold2Faces.filter(f => f.id !== "sq-inner-base-flap" && f.id !== "sq-dust-flap").map(face => (
                <Fragment key={face.id + "-s2"}>
                  <div style={{ ...ff, left: (face.x - pivotXmm) * ps, top: face.y * ps, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                    {face.small
                      ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                      : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
                    {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                  <div style={{ ...ff, left: (face.x - pivotXmm) * ps, top: face.y * ps, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                    {face.small
                      ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                      : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
                    {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                </Fragment>
              ))}
              {/* Step-5 sub-fold: Inner Base Flap folds 90° inward around its top edge */}
              {(() => {
                const ibf = fold2Faces.find(f => f.id === "sq-inner-base-flap");
                if (!ibf) return null;
                return (
                  <div style={{ position: "absolute", left: (ibf.x - pivotXmm) * ps, top: ibf.y * ps, width: ibf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${-sqFoldAngle5}deg)` }}>
                    <div style={{ ...ff, left: 0, top: 0, width: ibf.w * ps, height: ibf.h * ps, background: fc[ibf.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{ibf.label}</span>
                      {(outsideItems[ibf.id] ?? []).map(item => renderPreviewItem(item, ps))}
                    </div>
                    <div style={{ ...ff, left: 0, top: 0, width: ibf.w * ps, height: ibf.h * ps, background: insideFaceColors[ibf.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{ibf.label}</span>
                      {(insideItems[ibf.id] ?? []).map(item => renderPreviewItem(item, ps))}
                    </div>
                  </div>
                );
              })()}
              {/* Step-6 sub-fold: Dust Flap folds 90° inward around its bottom edge (pivot = bottom of face) */}
              {(() => {
                const df = fold2Faces.find(f => f.id === "sq-dust-flap");
                if (!df) return null;
                const relLeft  = (df.x - pivotXmm) * ps;
                const pivotTop = (df.y + df.h) * ps; // bottom edge of the flap
                return (
                  <div style={{ position: "absolute", left: relLeft, top: pivotTop, width: df.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${sqFoldAngle6}deg)` }}>
                    <div style={{ ...ff, left: 0, top: -df.h * ps, width: df.w * ps, height: df.h * ps, background: fc[df.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{df.label}</span>
                      {(outsideItems[df.id] ?? []).map(item => renderPreviewItem(item, ps))}
                    </div>
                    <div style={{ ...ff, left: 0, top: -df.h * ps, width: df.w * ps, height: df.h * ps, background: insideFaceColors[df.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{df.label}</span>
                      {(insideItems[df.id] ?? []).map(item => renderPreviewItem(item, ps))}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── Square Step 4: Outer Base Flap folds 90° inward (rotateX around top edge) ── */}
        {sqMode && squareFaces && step4T > 0 && (() => {
          const obf = squareFaces.find(f => f.id === "sq-outer-base-flap");
          if (!obf) return null;
          return (
            <div style={{ position: "absolute", left: obf.x * ps, top: obf.y * ps, width: obf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${-sqFoldAngle4}deg)` }}>
              <div style={{ ...ff, left: 0, top: 0, width: obf.w * ps, height: obf.h * ps, background: fc[obf.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{obf.label}</span>
                {(outsideItems[obf.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
              <div style={{ ...ff, left: 0, top: 0, width: obf.w * ps, height: obf.h * ps, background: insideFaceColors[obf.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{obf.label}</span>
                {(insideItems[obf.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
            </div>
          );
        })()}

        {/* ── Square Step 7: Inner Flap folds 90° inward (rotateX around bottom edge) ── */}
        {sqMode && squareFaces && step7T > 0 && (() => {
          const inf = squareFaces.find(f => f.id === "sq-inner-flap");
          if (!inf) return null;
          const pivotTop = (inf.y + inf.h) * ps; // bottom edge of the flap
          return (
            <div style={{ position: "absolute", left: inf.x * ps, top: pivotTop, width: inf.w * ps, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateX(${sqFoldAngle7}deg)` }}>
              <div style={{ ...ff, left: 0, top: -inf.h * ps, width: inf.w * ps, height: inf.h * ps, background: fc[inf.id] || "#c8a97e", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{inf.label}</span>
                {(outsideItems[inf.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
              <div style={{ ...ff, left: 0, top: -inf.h * ps, width: inf.w * ps, height: inf.h * ps, background: insideFaceColors[inf.id] || insideColor, overflow: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0.5px)" }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{inf.label}</span>
                {(insideItems[inf.id] ?? []).map(item => renderPreviewItem(item, ps))}
              </div>
            </div>
          );
        })()}

        {/* ── Top fold group: 9 faces, pivot at NY_BASE ── */}
        {!sqMode && <div style={{ position: "absolute", left: 0, top: NY_BASE * ps, width: cW, height: 1, opacity: sp, transformStyle: "preserve-3d", transformOrigin: "top center", transform: `rotateX(${foldAngle}deg)` }}>
          {FACES_OUTSIDE.filter(f => FOLD_TOP_IDS.has(f.id) && !(f.id === "dust-flap-top" && step7T > 0) && !(hideFlaps && (f.id === "lid-left" || f.id === "lid-right" || f.id === "dust-flap-top"))).map(face => {
            const isSF = face.id === "lid-left" || face.id === "lid-right";
            const isL  = face.id === "lid-left";
            const fL   = isSF ? (isL ? -face.w * ps : 0) : face.x * ps;
            const fT   = isSF ? 0 : (face.y - NY_BASE) * ps;
            const fOut = <div key="o" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `${50*ps}px 0 0 ${15*ps}px` : face.roundTR ? `0 ${50*ps}px ${15*ps}px 0` : undefined, clipPath: getFaceClipPath(face, ps) }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>;
            const fIn = <div key="i" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `0 ${50*ps}px ${15*ps}px 0` : face.roundTR ? `${50*ps}px 0 0 ${15*ps}px` : undefined, clipPath: getFaceClipPath(face, ps, true) }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>;
            if (isSF) return (
              <div key={face.id + "-ft"} style={{ position: "absolute", left: isL ? (face.x + face.w) * ps : face.x * ps, top: (face.y - NY_BASE) * ps, width: 0, height: face.h * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${isL ? -foldAngle2 : foldAngle2}deg)` }}>
                {fOut}{fIn}
              </div>
            );
            return <Fragment key={face.id + "-ft"}>{fOut}{fIn}</Fragment>;
          })}
        </div>}

        {/* ── Bottom fold group: 3 faces, pivot at NY_BOT (top of bottom row) ── */}
        {!sqMode && <div style={{ position: "absolute", left: 0, top: NY_BOT * ps, width: cW, height: 1, opacity: sp, transformStyle: "preserve-3d", transformOrigin: "top center", transform: `rotateX(${-foldAngle}deg)` }}>
          {FACES_OUTSIDE.filter(f => FOLD_BOT_IDS.has(f.id) && !(f.id === "dust-flap-bottom" && step7T > 0) && !(hideFlaps && (f.id === "bot-left" || f.id === "bot-right" || f.id === "dust-flap-bottom"))).map(face => {
            const isSF = face.id === "bot-left" || face.id === "bot-right";
            const isL  = face.id === "bot-left";
            const fL   = isSF ? (isL ? -face.w * ps : 0) : face.x * ps;
            const fT   = isSF ? 0 : (face.y - NY_BOT) * ps;
            const fOut = <div key="o" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden" }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>;
            const fIn = <div key="i" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden" }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
            </div>;
            if (isSF) return (
              <div key={face.id + "-fb"} style={{ position: "absolute", left: isL ? (face.x + face.w) * ps : face.x * ps, top: (face.y - NY_BOT) * ps, width: 0, height: face.h * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${isL ? -foldAngle2 : foldAngle2}deg)` }}>
                {fOut}{fIn}
              </div>
            );
            return <Fragment key={face.id + "-fb"}>{fOut}{fIn}</Fragment>;
          })}
        </div>}

        {/* ── Step 7: full dust-flap group folds down around NY_LID ── */}
        {!hideFlaps && step7T > 0 && (() => {
          const renderFace = (face: typeof FACES_OUTSIDE[0], lft: number, tp: number, extraTransform = "") => (<>
            <div key={face.id+"-7o"} style={{ position:"absolute", left:lft, top:tp, width:face.w*ps, height:face.h*ps, background:fc[face.id]||"#c8a97e", border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:`translateZ(0.5px) ${extraTransform}`.trim(), borderRadius:face.roundTL?`${50*ps}px 0 0 ${15*ps}px`:face.roundTR?`0 ${50*ps}px ${15*ps}px 0`:undefined, clipPath:getFaceClipPath(face,ps) }}>
              <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{face.label}</span>
              {(outsideItems[face.id]??[]).map(item=>renderPreviewItem(item,ps))}
            </div>
            <div key={face.id+"-7i"} style={{ position:"absolute", left:lft, top:tp, width:face.w*ps, height:face.h*ps, background:insideFaceColors[face.id]||insideColor, border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:`rotateY(180deg) translateZ(0.5px) ${extraTransform}`.trim(), borderRadius:face.roundTL?`0 ${50*ps}px ${15*ps}px 0`:face.roundTR?`${50*ps}px 0 0 ${15*ps}px`:undefined, clipPath:getFaceClipPath(face,ps,true) }}>
              <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{face.label}</span>
              {(insideItems[face.id]??[]).map(item=>renderPreviewItem(item,ps))}
            </div>
          </>);
          const renderSideY = (face: typeof FACES_OUTSIDE[0], pivotX: number, yAngle: number, relTop: number) => (
            <div key={face.id+"-s7y"} style={{ position:"absolute", left:pivotX*ps, top:relTop, width:0, height:face.h*ps, transformStyle:"preserve-3d", transformOrigin:"0 0", transform:`rotateY(${yAngle}deg)` }}>
              {renderFace(face, (face.x-pivotX)*ps, 0)}
            </div>
          );
          const faceDFT  = FACES_OUTSIDE.find(f=>f.id==="dust-flap-top")!;
          const dFromLid = (NY_DUST - NY_LID) * ps;
          return (
            <div style={{ position:"absolute", left:0, top:NY_BASE*ps, width:cW, height:1, transformStyle:"preserve-3d", transformOrigin:"top center", transform:`rotateX(${foldAngle}deg)`, pointerEvents:"none" }}>
              <div style={{ position:"absolute", left:0, top:(NY_LID-NY_BASE)*ps, width:cW, height:1, transformStyle:"preserve-3d", transformOrigin:"top center", transform:`rotateX(${foldAngle7}deg)` }}>
                {/* dust-flap-top */}
                {renderFace(faceDFT, faceDFT.x*ps, dFromLid)}
              </div>
            </div>
          );
        })()}

        {/* ── Step 7 Bottom: dust-flap-bottom folds inward around NY_DBOT ── */}
        {!hideFlaps && step7T > 0 && (() => {
          const faceDFB = FACES_OUTSIDE.find(f=>f.id==="dust-flap-bottom")!;
          return (
            <div style={{ position:"absolute", left:0, top:NY_BOT*ps, width:cW, height:1, transformStyle:"preserve-3d", transformOrigin:"top center", transform:`rotateX(${-foldAngle}deg)`, pointerEvents:"none" }}>
              <div style={{ position:"absolute", left:0, top:(NY_DBOT-NY_BOT)*ps, width:cW, height:1, transformStyle:"preserve-3d", transformOrigin:"top center", transform:`rotateX(${-foldAngle7}deg)` }}>
                <div style={{ position:"absolute", left:faceDFB.x*ps, top:0, width:faceDFB.w*ps, height:faceDFB.h*ps, background:fc[faceDFB.id]||"#c8a97e", border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:"translateZ(0.5px)" }}>
                  <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{faceDFB.label}</span>
                  {(outsideItems[faceDFB.id]??[]).map(item=>renderPreviewItem(item,ps))}
                </div>
                <div style={{ position:"absolute", left:faceDFB.x*ps, top:0, width:faceDFB.w*ps, height:faceDFB.h*ps, background:insideFaceColors[faceDFB.id]||insideColor, border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:"rotateY(180deg) translateZ(0.5px)" }}>
                  <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{faceDFB.label}</span>
                  {(insideItems[faceDFB.id]??[]).map(item=>renderPreviewItem(item,ps))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Step 3: Right side assembly (side-right + side-right-flap) rotate right ── */}
        {!hideFlaps && (() => {
          const faces3R = ["side-right", "side-right-flap"].filter(id => id !== "side-right-flap" || step4T === 0).map(id => FACES_OUTSIDE.find(f => f.id === id)).filter(Boolean) as typeof FACES_OUTSIDE;
          return (
            <div style={{ position: "absolute", left: NX2 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle3}deg)`, opacity: sp }}>
              {faces3R.map(face => (
                <Fragment key={face.id + "-s3"}>
                  <div style={{ position: "absolute", left: (face.x - NX2) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                  <div style={{ position: "absolute", left: (face.x - NX2) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                </Fragment>
              ))}
              {/* side-right-flap tabs (outer right edge) */}
              {step4T === 0 && [BH * 0.30 - 19, BH * 0.65 - 19].flatMap((dy, i) => [
                <div key={"rft-o-"+i} style={{ position:"absolute", left:(BD+60)*ps, top:dy*ps, width:10*ps, height:38*ps, background:faceColors["side-right-flap"]??"#c8a97e", border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"translateZ(1px)", pointerEvents:"none" }} />,
                <div key={"rft-i-"+i} style={{ position:"absolute", left:(BD+60)*ps, top:dy*ps, width:10*ps, height:38*ps, background:insideFaceColors["side-right-flap"]??insideColor, border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"rotateY(180deg) translateZ(1px)", pointerEvents:"none" }} />,
              ])}
            </div>
          );
        })()}

        {/* ── Step 3: Left side assembly (side-left-flap + side-left) rotate left ── */}
        {!hideFlaps && (() => {
          const faces3L = ["side-left-flap", "side-left"].filter(id => id !== "side-left-flap" || step4T === 0).map(id => FACES_OUTSIDE.find(f => f.id === id)).filter(Boolean) as typeof FACES_OUTSIDE;
          return (
            <div style={{ position: "absolute", left: NX1 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${-foldAngle3}deg)`, opacity: sp }}>
              {faces3L.map(face => (
                <Fragment key={face.id + "-s3"}>
                  <div style={{ position: "absolute", left: (face.x - NX1) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {(outsideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                  <div style={{ position: "absolute", left: (face.x - NX1) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {(insideItems[face.id] ?? []).map(item => renderPreviewItem(item, ps))}
                  </div>
                </Fragment>
              ))}
              {step4T === 0 && [BH * 0.30 - 19, BH * 0.65 - 19].flatMap((dy, i) => [
                <div key={"lft-o-"+i} style={{ position:"absolute", left:-(BD+60)*ps-10*ps, top:dy*ps, width:10*ps, height:38*ps, background:faceColors["side-left-flap"]??"#c8a97e", border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"translateZ(1px)", pointerEvents:"none" }} />,
                <div key={"lft-i-"+i} style={{ position:"absolute", left:-(BD+60)*ps-10*ps, top:dy*ps, width:10*ps, height:38*ps, background:insideFaceColors["side-left-flap"]??insideColor, border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"rotateY(180deg) translateZ(1px)", pointerEvents:"none" }} />,
              ])}
            </div>
          );
        })()}

        {/* Locking tabs/slots are now inside the step-3 pivot groups */}

        {/* ── Step 4: side-left-flap folds inward — completely independent ── */}
        {!hideFlaps && (() => {
          const faceL  = FACES_OUTSIDE.find(f => f.id === "side-left")!;
          const faceLF = FACES_OUTSIDE.find(f => f.id === "side-left-flap")!;
          return (
            <div style={{ position: "absolute", left: NX1 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${-foldAngle3}deg)`, opacity: sp, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: (faceL.x - NX1) * ps, top: 0, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${-foldAngle4}deg)` }}>
                <div style={{ position: "absolute", left: -faceLF.w * ps, top: 0, width: faceLF.w * ps, height: faceLF.h * ps, background: fc["side-left-flap"] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(2px)" }}>
                  <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{faceLF.label}</span>
                  {(outsideItems["side-left-flap"] ?? []).map(item => renderPreviewItem(item, ps))}
                </div>
                <div style={{ position: "absolute", left: -faceLF.w * ps, top: 0, width: faceLF.w * ps, height: faceLF.h * ps, background: insideFaceColors["side-left-flap"] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(2px)", backfaceVisibility: "hidden", opacity: foldAngle4 > 90 ? 0 : 1 }}>
                  <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{faceLF.label}</span>
                  {(insideItems["side-left-flap"] ?? []).map(item => renderPreviewItem(item, ps))}
                </div>
                {[BH * 0.30 - 19, BH * 0.65 - 19].flatMap((dy, i) => [
                  <div key={"s4lft-o-"+i} style={{ position:"absolute", left:-faceLF.w*ps-10*ps, top:dy*ps, width:10*ps, height:38*ps, background:faceColors["side-left-flap"]??"#c8a97e", border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"translateZ(2px)", pointerEvents:"none" }} />,
                  <div key={"s4lft-i-"+i} style={{ position:"absolute", left:-faceLF.w*ps-10*ps, top:dy*ps, width:10*ps, height:38*ps, background:insideFaceColors["side-left-flap"]??insideColor, border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"rotateY(180deg) translateZ(2px)", pointerEvents:"none", opacity: foldAngle4 > 90 ? 0 : 1 }} />,
                ])}
              </div>
            </div>
          );
        })()}

        {/* ── Step 4: side-right-flap folds inward — completely independent ── */}
        {!hideFlaps && (() => {
          const faceR  = FACES_OUTSIDE.find(f => f.id === "side-right")!;
          const faceRF = FACES_OUTSIDE.find(f => f.id === "side-right-flap")!;
          return (
            <div style={{ position: "absolute", left: NX2 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle3}deg)`, opacity: sp, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: (faceR.x - NX2 + faceR.w) * ps, top: 0, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle4}deg)` }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: faceRF.w * ps, height: faceRF.h * ps, background: fc["side-right-flap"] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(2px)" }}>
                  <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{faceRF.label}</span>
                  {(outsideItems["side-right-flap"] ?? []).map(item => renderPreviewItem(item, ps))}
                </div>
                <div style={{ position: "absolute", left: 0, top: 0, width: faceRF.w * ps, height: faceRF.h * ps, background: insideFaceColors["side-right-flap"] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(2px)", backfaceVisibility: "hidden", opacity: foldAngle4 > 90 ? 0 : 1 }}>
                  <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{faceRF.label}</span>
                  {(insideItems["side-right-flap"] ?? []).map(item => renderPreviewItem(item, ps))}
                </div>
                {[BH * 0.30 - 19, BH * 0.65 - 19].flatMap((dy, i) => [
                  <div key={"s4rft-o-"+i} style={{ position:"absolute", left:faceRF.w*ps, top:dy*ps, width:10*ps, height:38*ps, background:faceColors["side-right-flap"]??"#c8a97e", border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"translateZ(2px)", pointerEvents:"none" }} />,
                  <div key={"s4rft-i-"+i} style={{ position:"absolute", left:faceRF.w*ps, top:dy*ps, width:10*ps, height:38*ps, background:insideFaceColors["side-right-flap"]??insideColor, border:"1px solid rgba(0,0,0,0.25)", boxSizing:"border-box", backfaceVisibility:"hidden", transform:"rotateY(180deg) translateZ(2px)", pointerEvents:"none", opacity: foldAngle4 > 90 ? 0 : 1 }} />,
                ])}
              </div>
            </div>
          );
        })()}

        {/* ── Assembled box faces ── */}

        {/* Front face (Base) */}
        <div style={{ ...ff, left: bx, top: by, width: bw, height: bh,
          background: fc["front"] || "#c8a97e",
          opacity: aT, transform: `translateZ(${bd / 2}px)` }} />

        {/* Back / inside face */}
        <div style={{ ...ff, left: bx, top: by, width: bw, height: bh,
          background: insideFaceColors["front"] ?? insideColor,
          opacity: aT, transform: `rotateY(180deg) translateZ(${bd / 2}px)` }} />

        {/* Left side wall — outside */}
        <div style={{ ...ff, left: bx, top: by, width: bd, height: bh,
          background: fc["side-left"] || "#b89060",
          transformOrigin: "left center",
          opacity: aT, transform: `rotateY(-90deg)` }} />

        {/* Left side wall — inside */}
        <div style={{ ...ff, left: bx, top: by, width: bd, height: bh,
          background: insideFaceColors["side-left"] ?? insideColor,
          transformOrigin: "left center",
          opacity: aT, transform: `rotateY(-90deg) rotateY(180deg) translateZ(${bd}px)` }} />

        {/* Right side wall — outside */}
        <div style={{ ...ff, left: bx + bw, top: by, width: bd, height: bh,
          background: fc["side-right"] || "#b89060",
          transformOrigin: "left center",
          opacity: aT, transform: `rotateY(90deg)` }} />

        {/* Right side wall — inside */}
        <div style={{ ...ff, left: bx + bw, top: by, width: bd, height: bh,
          background: insideFaceColors["side-right"] ?? insideColor,
          transformOrigin: "left center",
          opacity: aT, transform: `rotateY(90deg) rotateY(180deg) translateZ(${bd}px)` }} />

        {/* Bottom (Front Side) */}
        <div style={{ ...ff, left: bx, top: by + bh, width: bw, height: bd,
          background: fc["bottom"] || "#a07040",
          transformOrigin: "top center",
          opacity: aT, transform: `rotateX(90deg)` }} />

        {/* Lid / Back Side */}
        <div style={{ ...ff, left: bx, top: by - bd * 2, width: bw, height: bd * 2,
          background: fc["lid"] || "#c8a97e",
          transformOrigin: "bottom center",
          opacity: aT, transform: `translateZ(${bd / 2}px) rotateX(${lidAngle}deg)` }}>
          <div style={{ position: "absolute", inset: 0, background: insideFaceColors["lid"] ?? insideColor, opacity: aT > 0.4 ? 1 : 0, backfaceVisibility: "visible" }} />
        </div>

      </div>
    </div>
  );
}

// ─── Dieline face ─────────────────────────────────────────────────────────────
function DielineFace({ face, color, selected, hovered, onSelect, onHover, onLeave, items, zoom }: {
  face: FaceDef; color: string; selected: boolean; hovered: boolean;
  onSelect: () => void; onHover: () => void; onLeave: () => void;
  items: CanvasItem[]; zoom: number;
}) {
  const lineX1 = face.w * 0.47;
  const lineX2 = face.w * 0.53;
  const W = face.w * zoom, H = face.h * zoom;
  const cs = 8 * zoom, endY = H - Math.min(30 * zoom, H * 0.2);
  const startY = Math.min(30 * zoom, H * 0.2);
  const clipBL = face.clipBottomLeft  ? `path('M 0 0 L ${W + 2} 0 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')` : undefined;
  const clipBR = face.clipBottomRight ? `path('M 0 0 L ${W} 0 L ${W} ${H} L ${W - cs} ${H} Q 0 ${H} 0 ${H - cs} L 0 ${endY - cs} Q 0 ${endY} ${cs} ${endY + cs} Z')` : undefined;
  const clipTR = face.clipTopRight    ? `path('M -2 ${H + 2} L ${W + 2} ${H + 2} L ${W + 2} ${cs} Q ${W + 2} -2 ${W - cs} -2 L ${cs} ${startY + cs} Q 0 ${startY} 0 ${startY - cs} Z')` : undefined;
  const clipTL = face.clipTopLeft     ? `path('M 0 0 L ${W - cs} 0 Q ${W} 0 ${W} ${cs} L ${W} ${H} L 0 ${H} Z')` : undefined;
  const clipPath = (face.clipBottomLeft && face.clipTopRight)
    ? `path('M 0 ${startY + cs} Q 0 ${startY} ${cs} ${startY - cs} L ${W + 2} -2 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`
    : (face.clipBottomRight && face.clipTopLeft)
    ? `path('M ${W + 2} ${startY + cs} Q ${W + 2} ${startY} ${W - cs} ${startY - cs} L -2 -2 L -2 ${H - cs} Q -2 ${H + 2} ${cs} ${H + 2} L ${W - cs} ${endY + cs} Q ${W + 2} ${endY} ${W + 2} ${endY - cs} Z')`
    : clipBL ?? clipBR ?? clipTR ?? clipTL;
  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={face.label}
      style={{
        position: "absolute",
        left: face.x * zoom, top: face.y * zoom,
        width: face.w * zoom, height: face.h * zoom,
        background: color,
        border: selected ? "2px solid #3b82f6" : hovered ? "2px solid #93c5fd" : "1.5px dashed rgba(0,0,0,0.25)",
        boxSizing: "border-box", cursor: "pointer", overflow: "hidden",
        clipPath,
        borderRadius: face.roundTL ? `${65 * zoom}px 0 0 ${20 * zoom}px` : face.roundTR ? `0 ${65 * zoom}px ${20 * zoom}px 0` : undefined,
        transition: "border-color 0.15s",
        boxShadow: selected ? "0 0 0 3px rgba(59,130,246,0.2)" : "none",
      }}
    >
      {face.small ? (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none", textAlign: "center", padding: "2px 3px", lineHeight: 1.25 }}>
          {face.label}
        </span>
      ) : (
        <span style={{ position: "absolute", top: 6, left: 8, fontSize: "0.62rem", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.05em", userSelect: "none" }}>
          {face.label}
        </span>
      )}
      {face.dashedLines && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <line x1={lineX1 * zoom} y1={0} x2={lineX1 * zoom} y2={face.h * zoom} stroke="rgba(0,0,0,0.3)" strokeWidth={1.2} strokeDasharray="5 4" />
          <line x1={lineX2 * zoom} y1={0} x2={lineX2 * zoom} y2={face.h * zoom} stroke="rgba(0,0,0,0.3)" strokeWidth={1.2} strokeDasharray="5 4" />
        </svg>
      )}
      {items.map(item => (
        item.kind === "text" ? (
          <div key={item.id} style={{ position: "absolute", left: item.x * zoom, top: item.y * zoom, width: item.w * zoom, fontFamily: item.font, fontSize: `${item.size * zoom}px`, fontWeight: item.bold ? 700 : 400, color: item.color, textAlign: item.align, pointerEvents: "none", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{item.text}</div>
        ) : (
          <img key={item.id} src={item.src} alt="" draggable={false} style={{ position: "absolute", left: item.x * zoom, top: item.y * zoom, width: item.w * zoom, height: item.h * zoom, objectFit: "contain", pointerEvents: "none" }} />
        )
      ))}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
type Props = { product: Product; onClose: () => void; hideFlaps?: boolean };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShippingBoxEditor({ product, onClose, hideFlaps = false }: Props) {
  const [view, setView] = useState<"outside" | "inside">("inside");
  const [selectedFace, setSelectedFace] = useState<FaceId | null>(null);
  const [hoveredFace, setHoveredFace] = useState<FaceId | null>(null);
  const [openAmount, setOpenAmount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotX, setRotX] = useState(-20);
  const [rotY, setRotY] = useState(210);
  const [preview3dZoom, setPreview3dZoom] = useState(1.3);
  const [toolMode, setToolMode] = useState<"select" | "pan">("select");
  const [showFaceColorPopup, setShowFaceColorPopup] = useState(false);

  const [history, setHistory] = useState<EditorState[]>([defaultState()]);
  const [histIdx, setHistIdx] = useState(0);
  const state = history[histIdx];

  const [activeTab, setActiveTab] = useState<"uploads" | "elements" | "package-color">("uploads");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [finalStepsOpen, setFinalStepsOpen] = useState(false);
  const [selectedQty, setSelectedQty] = useState(0);
  const [designApproved, setDesignApproved] = useState(false);
  const [finalRotY, setFinalRotY] = useState(210);
  const [finalRotX, setFinalRotX] = useState(-20);
  const finalRotRef = useRef({ rx: -20, ry: 210 });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingCartId, setPendingCartId] = useState<string | null>(null);
  const [thumbDataUrl, setThumbDataUrl] = useState<string | undefined>(undefined);
  const [boxFaceImagesState, setBoxFaceImagesState] = useState<{ front?: string; right?: string; top?: string } | undefined>(undefined);
  const [boxPreviewOpen, setBoxPreviewOpen] = useState(false);
  const [boxPreviewRotY, setBoxPreviewRotY] = useState(210);
  const [boxPreviewRotX, setBoxPreviewRotX] = useState(-20);
  const boxPreviewRotRef = useRef({ rx: -20, ry: 210 });

  const uploadRef = useRef<HTMLInputElement>(null);
  const rotDragRef = useRef<{ sx: number; sy: number; rx: number; ry: number } | null>(null);

  const commit = useCallback((next: EditorState) => {
    setHistory(prev => { const t = prev.slice(0, histIdx + 1); return [...t, next]; });
    setHistIdx(idx => idx + 1);
  }, [histIdx]);

  const undo = () => { if (histIdx > 0) { setHistIdx(i => i - 1); setSelectedItemId(null); } };
  const redo = () => { if (histIdx < history.length - 1) { setHistIdx(i => i + 1); setSelectedItemId(null); } };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) { e.preventDefault(); redo(); }
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

  const SQUARE_HIDDEN = new Set([
    "dust-flap-top", "dust-flap-bottom",
    "lid", "lid-left", "lid-right",
    "side-left-flap", "side-left",
    "side-right", "side-right-flap",
    "bot-left", "bot-right",
  ]);
  const SQ_EXTRA_W = 320;
  const sqTotalW = BW + SQ_EXTRA_W;
  const sqPanelW = sqTotalW / 4;
  const sqLidH   = sqPanelW / 2;           // top row height = panel width / 2
  const lidFace  = FACES_OUTSIDE.find(f => f.id === "lid")!;
  const sqBaseY  = lidFace.y + sqLidH;     // base row starts after the taller lid row
  const frontFace = FACES_OUTSIDE.find(f => f.id === "front")!;
  const sqBotY   = sqBaseY + frontFace.h;  // bottom row starts after base row
  const botFace  = FACES_OUTSIDE.find(f => f.id === "bottom")!;
  const squareLidFaces: FaceDef[] = [
    { id: "sq-dust-flap",  label: "Dust Flap",  x: NX1,                  y: lidFace.y, w: sqPanelW, h: sqLidH },
    { id: "sq-inner-flap", label: "Inner Flap", x: NX1 + sqPanelW,       y: lidFace.y, w: sqPanelW, h: sqLidH },
    { id: "sq-outer-flap", label: "Outer Flap", x: NX1 + sqPanelW * 2,   y: lidFace.y, w: sqPanelW, h: sqLidH },
    { id: "sq-lock-flap",  label: "Lock Flap",  x: NX1 + sqPanelW * 3,   y: lidFace.y, w: sqPanelW, h: sqLidH },
  ];
  const squareBaseFaces: FaceDef[] = [
    { id: "sq-left-side-panel",  label: "Left Side Panel",  x: NX1,                  y: sqBaseY, w: sqPanelW, h: frontFace.h },
    { id: "sq-front-panel",      label: "Front Panel",      x: NX1 + sqPanelW,       y: sqBaseY, w: sqPanelW, h: frontFace.h },
    { id: "sq-right-side-panel", label: "Right Side Panel", x: NX1 + sqPanelW * 2,   y: sqBaseY, w: sqPanelW, h: frontFace.h },
    { id: "sq-back-panel",       label: "Back Panel",       x: NX1 + sqPanelW * 3,   y: sqBaseY, w: sqPanelW, h: frontFace.h },
  ];
  const squareBottomFaces: FaceDef[] = [
    { id: "sq-inner-base-flap", label: "Inner Base Flap", x: NX1,                  y: sqBotY, w: sqPanelW, h: sqLidH, small: true },
    { id: "sq-outer-base-flap", label: "Outer Base Flap", x: NX1 + sqPanelW,       y: sqBotY, w: sqPanelW, h: sqLidH, small: true },
    { id: "sq-support-flap",    label: "Support Flap",    x: NX1 + sqPanelW * 2,   y: sqBotY, w: sqPanelW, h: sqLidH, small: true },
    { id: "sq-closure-flap",    label: "Closure Flap",    x: NX1 + sqPanelW * 3,   y: sqBotY, w: sqPanelW, h: sqLidH, small: true },
  ];
  const faces = hideFlaps
    ? [
        ...FACES_OUTSIDE
          .filter(f => !SQUARE_HIDDEN.has(f.id) && f.id !== "bottom" && f.id !== "front"),
        ...squareLidFaces,
        ...squareBottomFaces,
        ...squareBaseFaces,
      ].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
    : FACES_OUTSIDE;
  const dilineCanvasW = hideFlaps ? TOTAL_DIELINE_W + SQ_EXTRA_W : TOTAL_DIELINE_W;

  const vd = state[view];

  function setFaceColor(faceId: string, color: string) {
    commit({ ...state, [view]: { ...vd, faceColors: { ...vd.faceColors, [faceId]: color } } });
  }

  function setBoxColor(color: string) {
    const fc = { ...vd.faceColors };
    FACES_OUTSIDE.forEach(f => { fc[f.id] = color; });
    fc["back"] = color;
    commit({ ...state, [view]: { ...vd, faceColors: fc } });
  }

  function setInsideColor(color: string) {
    commit({ ...state, insideColor: color });
  }

  function getFaceItems(faceId: string): CanvasItem[] {
    return vd.items[faceId] ?? [];
  }

  function addItem(faceId: string, item: CanvasItem) {
    commit({ ...state, [view]: { ...vd, items: { ...vd.items, [faceId]: [...(vd.items[faceId] ?? []), item] } } });
    setSelectedItemId(item.id);
  }

  function updateItem(faceId: string, id: string, updates: Partial<CanvasItem>) {
    commit({ ...state, [view]: { ...vd, items: { ...vd.items, [faceId]: (vd.items[faceId] ?? []).map((it: CanvasItem) => it.id === id ? { ...it, ...updates } as CanvasItem : it) } } });
  }

  function removeItem(faceId: string, id: string) {
    commit({ ...state, [view]: { ...vd, items: { ...vd.items, [faceId]: (vd.items[faceId] ?? []).filter((it: CanvasItem) => it.id !== id) } } });
  }

  function addText() {
    if (!selectedFace) return;
    const face = faces.find(f => f.id === selectedFace);
    if (!face) return;
    const item: TextItem = { id: uid(), kind: "text", text: "Add text", x: face.w / 2 - 60, y: face.h / 2 - 12, w: 140, font: "Arial, sans-serif", size: 16, bold: false, color: "#000000", align: "center" };
    addItem(selectedFace, item);
  }

  function addSvgItem(shape: { svg: string; w: number; h: number }) {
    if (!selectedFace) return;
    const face = faces.find(f => f.id === selectedFace);
    if (!face) return;
    const item: ImageItem = { id: uid(), kind: "image", src: svgUrl(shape.svg), x: Math.max(0, face.w / 2 - shape.w / 2), y: Math.max(0, face.h / 2 - shape.h / 2), w: shape.w, h: shape.h };
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
        const maxW = face.w - 20, maxH = face.h - 20;
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const item: ImageItem = { id: uid(), kind: "image", src, x: 10, y: 10, w: Math.round(img.naturalWidth * ratio), h: Math.round(img.naturalHeight * ratio) };
        addItem(selectedFace, item);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const currentItems = selectedFace ? getFaceItems(selectedFace) : [];
  const selectedItem = selectedItemId ? currentItems.find(i => i.id === selectedItemId) ?? null : null;
  const selectedText = selectedItem?.kind === "text" ? selectedItem : null;

  const dragRef = useRef<{ id: string; faceId: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = canvasScrollRef.current;
    if (!el) return;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  function startDragItem(e: React.PointerEvent, faceId: string, item: CanvasItem) {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { id: item.id, faceId, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y };
    setSelectedItemId(item.id);
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom, dy = (ev.clientY - d.sy) / zoom;
      setHistory(prev => {
        const cur = prev[histIdx];
        const curVd = cur[view]; const updated = { ...cur, [view]: { ...curVd, items: { ...curVd.items, [d.faceId]: (curVd.items[d.faceId] ?? []).map((it: CanvasItem) => it.id !== d.id ? it : { ...it, x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } as CanvasItem) } } };
        const copy = [...prev]; copy[histIdx] = updated; return copy;
      });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }

  function startResizeItem(e: React.PointerEvent, faceId: string, item: CanvasItem, corner: "tl"|"tr"|"bl"|"br"|"l"|"r") {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const ox = item.x, oy = item.y;
    const ow = item.kind === "image" ? item.w : (item as TextItem).w;
    const oh = item.kind === "image" ? item.h : 0;
    const MIN = 20;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / zoom, dy = (ev.clientY - sy) / zoom;
      let nx = ox, ny = oy, nw = ow, nh = oh;
      if (corner === "r")  { nw = Math.max(MIN, ow + dx); }
      else if (corner === "l")  { nw = Math.max(MIN, ow - dx); nx = ox + ow - nw; }
      else if (corner === "tr") { nw = Math.max(MIN, ow + dx); if (item.kind === "image") { nh = Math.max(MIN, oh - dy); ny = oy + oh - nh; } }
      else if (corner === "tl") { nw = Math.max(MIN, ow - dx); nx = ox + ow - nw; if (item.kind === "image") { nh = Math.max(MIN, oh - dy); ny = oy + oh - nh; } }
      else if (corner === "br") { nw = Math.max(MIN, ow + dx); if (item.kind === "image") nh = Math.max(MIN, oh + dy); }
      else if (corner === "bl") { nw = Math.max(MIN, ow - dx); nx = ox + ow - nw; if (item.kind === "image") nh = Math.max(MIN, oh + dy); }
      const updates: Partial<CanvasItem> = { x: nx, w: nw } as Partial<CanvasItem>;
      if (item.kind === "image") { (updates as Partial<ImageItem>).h = nh; (updates as Partial<ImageItem>).y = ny; }
      setHistory(prev => { const cur = prev[histIdx]; const curVd = cur[view]; const copy = [...prev]; copy[histIdx] = { ...cur, [view]: { ...curVd, items: { ...curVd.items, [faceId]: (curVd.items[faceId] ?? []).map((it: CanvasItem) => it.id !== item.id ? it : { ...it, ...updates } as CanvasItem) } } }; return copy; });
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }

  // 3D drag to rotate
  function start3DRotate(e: React.PointerEvent) {
    e.preventDefault();
    rotDragRef.current = { sx: e.clientX, sy: e.clientY, rx: rotX, ry: rotY };
    const onMove = (ev: PointerEvent) => {
      const d = rotDragRef.current;
      if (!d) return;
      setRotY(d.ry + (ev.clientX - d.sx) * 0.5);
      setRotX(d.rx - (ev.clientY - d.sy) * 0.5);
    };
    const onUp = () => { rotDragRef.current = null; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }

  const selectedFaceDef = selectedFace ? faces.find(f => f.id === selectedFace) ?? null : null;

  // ─── Horizontal scroll section ────────────────────────────────────────────
  function HScrollSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>{title}</span>
          <span style={{ fontSize: "0.72rem", color: "#9ca3af", cursor: "pointer" }}>More</span>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {children}
        </div>
      </div>
    );
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <Fragment>
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 54, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem", background: "#fff", flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.35rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{product.name}</span>
        </div>
        <button onClick={() => setFinalStepsOpen(true)} style={{ padding: "0.4rem 1.5rem", background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>Save and Continue</button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left icon rail ── */}
        <div style={{ width: 72, borderRight: "1px solid #e5e7eb", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", flexShrink: 0 }}>
          {(["uploads", "elements"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", border: "none", background: activeTab === tab ? "#eff6ff" : "transparent", borderRadius: 10, cursor: "pointer", color: activeTab === tab ? "#2563eb" : "#6b7280", width: "88%" }}>
              {tab === "uploads" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              )}
              <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "capitalize", textAlign: "center" }}>{tab === "uploads" ? "Uploads" : "Elements"}</span>
            </button>
          ))}
          {/* Package Color icon */}
          <button onClick={() => setActiveTab(activeTab === "package-color" ? "uploads" : "package-color")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", border: "none", background: activeTab === "package-color" ? "#eff6ff" : "transparent", borderRadius: 10, cursor: "pointer", color: activeTab === "package-color" ? "#2563eb" : "#6b7280", width: "88%" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: vd.faceColors["front"] ?? "#c8a97e", border: "2px solid currentColor", flexShrink: 0 }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>Package{"\n"}Color</span>
          </button>
        </div>

        {/* ── Left expanded panel ── */}
        <div style={{ width: 220, borderRight: "1px solid #e5e7eb", background: "#fff", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "0.65rem 1rem 0.4rem", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
              {activeTab === "uploads" ? "Uploads" : activeTab === "elements" ? "Elements" : "Package Color"}
            </span>
          </div>

          {/* ── Uploads panel ── */}
          {activeTab === "uploads" && (
            <div style={{ padding: "1rem" }}>
              {!selectedFace && (
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem", textAlign: "center" }}>Select a face first</p>
              )}
              <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              <button
                onClick={() => selectedFace && uploadRef.current?.click()}
                style={{ width: "100%", padding: "1.25rem 0.75rem", border: "2px dashed #d1d5db", borderRadius: 12, background: selectedFace ? "#fafafa" : "#f3f4f6", cursor: selectedFace ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#6b7280", fontSize: "0.8rem" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <div>
                  <div style={{ fontWeight: 700, color: "#7c3aed", marginBottom: 3 }}>Click to upload</div>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>or drop your images here</div>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#9ca3af", background: "#f3f4f6", padding: "3px 10px", borderRadius: 6 }}>JPG, PNG, SVG</span>
              </button>
            </div>
          )}

          {/* ── Elements panel ── */}
          {activeTab === "elements" && (
            <div style={{ padding: "1rem" }}>
              {!selectedFace && (
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem", textAlign: "center" }}>Select a face first</p>
              )}

              {/* Text */}
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827", display: "block", marginBottom: "0.6rem" }}>Text</span>
                <button
                  onClick={addText}
                  disabled={!selectedFace}
                  style={{ width: 80, height: 80, border: "1.5px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: selectedFace ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: selectedFace ? 1 : 0.5 }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#374151" }}>Add text</span>
                </button>
              </div>

              {/* Text style (when text selected) */}
              {selectedText && selectedFace && (
                <div style={{ marginBottom: "1.25rem", padding: "0.75rem", background: "#f9fafb", borderRadius: 10 }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>Text style</p>
                  <select value={selectedText.font} onChange={e => updateItem(selectedFace, selectedText.id, { font: e.target.value })} style={{ width: "100%", padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.75rem", marginBottom: 6 }}>
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <select value={selectedText.size} onChange={e => updateItem(selectedFace, selectedText.id, { size: Number(e.target.value) })} style={{ flex: 1, padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.75rem" }}>
                      {[10,12,14,16,18,20,24,28,32,36].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => updateItem(selectedFace, selectedText.id, { bold: !selectedText.bold })} style={{ padding: "0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, background: selectedText.bold ? "#1d4ed8" : "#fff", color: selectedText.bold ? "#fff" : "#374151", fontWeight: 700, cursor: "pointer" }}>B</button>
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
                    {TEXT_COLORS.map(c => <button key={c} onClick={() => updateItem(selectedFace, selectedText.id, { color: c })} style={{ width: 20, height: 20, borderRadius: "50%", background: c, padding: 0, cursor: "pointer", border: `2px solid ${selectedText.color === c ? "#3b82f6" : "#e5e7eb"}` }} />)}
                  </div>
                  <button onClick={() => { removeItem(selectedFace, selectedText.id); setSelectedItemId(null); }} style={{ width: "100%", padding: "0.35rem", border: "1px solid #fca5a5", borderRadius: 6, background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>Delete text</button>
                </div>
              )}

              {/* Shape */}
              <HScrollSection title="Shape">
                {SHAPES.map(s => (
                  <button key={s.label} onClick={() => addSvgItem(s)} disabled={!selectedFace} title={s.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: selectedFace ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedFace ? 1 : 0.5 }}>
                    <img src={svgUrl(s.svg)} alt={s.label} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Packaging Symbols */}
              <HScrollSection title="Packaging Symbols">
                {PACKAGING_SYMBOLS.map(s => (
                  <button key={s.label} onClick={() => addSvgItem({ svg: s.svg, w: 56, h: 56 })} disabled={!selectedFace} title={s.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: selectedFace ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", opacity: selectedFace ? 1 : 0.5 }}>
                    <img src={svgUrl(s.svg)} alt={s.label} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Text Combinations */}
              <HScrollSection title="Text Combinations">
                {TEXT_COMBOS.map(tc => (
                  <button key={tc.label} onClick={() => addSvgItem({ svg: tc.svg, w: tc.w, h: tc.h })} disabled={!selectedFace} title={tc.label} style={{ flexShrink: 0, width: 100, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#f9fafb", cursor: selectedFace ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: selectedFace ? 1 : 0.5 }}>
                    <img src={svgUrl(tc.svg)} alt={tc.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Patterns */}
              <HScrollSection title="Patterns">
                {PATTERNS.map(p => (
                  <button key={p.label} onClick={() => addSvgItem({ svg: p.svg, w: BW - 20, h: BH - 20 })} disabled={!selectedFace} title={p.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", cursor: selectedFace ? "pointer" : "not-allowed", opacity: selectedFace ? 1 : 0.5, padding: 0 }}>
                    <img src={svgUrl(p.svg)} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </HScrollSection>
            </div>
          )}

          {/* Package Color panel */}
          {activeTab === "package-color" && (
            <div style={{ padding: "1rem" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => {}} style={{ width: 32, height: 32, borderRadius: "50%", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border: "2px solid #e5e7eb", padding: 0, cursor: "pointer", position: "relative" }}>
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>+</span>
                </button>
                {BOX_COLORS.map(c => (
                  <button key={c.value} onClick={() => setBoxColor(c.value)} title={c.label} style={{ width: 32, height: 32, borderRadius: "50%", background: c.value, padding: 0, cursor: "pointer", border: `2px solid ${vd.faceColors["front"] === c.value ? "#7c3aed" : "#d1d5db"}`, outline: vd.faceColors["front"] === c.value ? "3px solid #ddd6fe" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Center: Dieline canvas ── */}
        <div style={{ flex: 1, background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <div
            ref={canvasScrollRef}
            style={{ flex: 1, height: 0, overflowY: "auto", overflowX: "auto", cursor: toolMode === "pan" ? "grab" : "default" }}
            onClick={() => { setSelectedFace(null); setSelectedItemId(null); setEditingItemId(null); setShowFaceColorPopup(false); }}
          >
            <div style={{ minHeight: "150vh", minWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", boxSizing: "border-box" }}>
            <div style={{ position: "relative", width: dilineCanvasW * zoom, height: DIELINE_H_FULL * zoom, flexShrink: 0 }}>

              {/* Dieline background */}
              <div style={{ position: "absolute", inset: 0, background: "#f5f5f0", borderRadius: 4 }} />

              {/* ── Mailer Box Dieline SVG ── */}
              {(() => {
                const z = zoom;
                const s = (n: number) => n * z;
                const x0=LX0*z, x1=LX1*z, x2=LX2*z, x3=LX3*z, x4=LX4*z, x5=LX5*z;
                const yt=LY_TOP*z, y2=LY2*z, y3=LY3*z, y4=LY4*z;
                const cr = s(COR);
                const W = TOTAL_DIELINE_W * z, H = TOTAL_DIELINE_H * z;

                // Wing geometry
                const ch    = s(16);   // chamfer size at wing outer corners
                const slLen = s(22);   // horizontal locking slot length
                const slThk = s(5);    // slot thickness
                const sl1   = y2 + (y3 - y2) * 0.32;  // upper slot centre-Y
                const sl2   = y2 + (y3 - y2) * 0.68;  // lower slot centre-Y

                // Bottom flap rounding
                const br = s(10);

                // ── OUTER CUT PATH (clockwise) ────────────────────────────────
                const cut = [
                  // TOP FLAP — rounded top-left corner (spans x1 to x4)
                  `M ${x1 + br},${yt}`,
                  `L ${x4 - br},${yt}`,
                  `A ${br} ${br} 0 0 1 ${x4},${yt + br}`,
                  // Right side of top flap down to main body
                  `L ${x4},${y2}`,
                  // Main body top-right going to right wing
                  `L ${x5 - ch},${y2}`,
                  `L ${x5},${y2 + ch}`,
                  // Right wing right side — straight down (slots are interior lines)
                  `L ${x5},${y3 - ch}`,
                  // Right wing — bottom chamfered corner
                  `L ${x5 - ch},${y3}`,
                  // Right wing bottom back to right depth
                  `L ${x4},${y3}`,
                  // Bottom flap — spans x1 to x4, rounded bottom corners
                  `L ${x4},${y4 - br}`,
                  `A ${br} ${br} 0 0 1 ${x4 - br},${y4}`,
                  `L ${x1 + br},${y4}`,
                  `A ${br} ${br} 0 0 1 ${x1},${y4 - br}`,
                  // Bottom flap left side back up to left wing bottom
                  `L ${x1},${y3}`,
                  // Left wing — bottom chamfered corner (mirror)
                  `L ${x0 + ch},${y3}`,
                  `L ${x0},${y3 - ch}`,
                  // Left wing left side — straight up
                  `L ${x0},${y2 + ch}`,
                  // Left wing — top chamfered corner, back to left of top flap
                  `L ${x0 + ch},${y2}`,
                  `L ${x1},${y2}`,
                  // Left side of top flap going UP
                  `L ${x1},${yt + br}`,
                  `A ${br} ${br} 0 0 1 ${x1 + br},${yt}`,
                  `Z`,
                ].join(" ");


                // ── FOLD LINES (dashed) ───────────────────────────────────────
                const folds = [
                  // Top flap fold at LY2 (full width x1 to x4)
                  `M ${x1},${y2} L ${x4},${y2}`,
                  // Full-height vertical fold at LX2 — top of Back Side to bottom of Front Side
                  `M ${x2},${y2} L ${x2},${y4}`,
                  // Full-height vertical fold at LX3
                  `M ${x3},${y2} L ${x3},${y4}`,
                  // Front face bottom fold at LY3
                  `M ${x2},${y3} L ${x3},${y3}`,
                  // Left wing fold at LX1
                  `M ${x1},${y2} L ${x1},${y3}`,
                  // Right wing fold at LX4
                  `M ${x4},${y2} L ${x4},${y3}`,
                  // Bottom flap outer fold at LY3
                  `M ${x1},${y3} L ${x4},${y3}`,
                  // Bottom flap outer side folds
                  `M ${x1},${y3} L ${x1},${y4 - br}`,
                  `M ${x4},${y3} L ${x4},${y4 - br}`,
                ].join(" ");

                // ── DIMENSIONS ───────────────────────────────────────────────
                const dz = s(10);
                const tk = s(4);

                return hideFlaps ? null : (
                  <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={W} height={H}>
                    {/* Fold lines */}
                    <path d={folds} fill="none" stroke="#3b82f6" strokeWidth={s(0.9)} strokeDasharray={`${s(4)} ${s(2.5)}`} />

                    {/* Dimensions */}
                    <g fill="none" stroke="#3b82f6" strokeWidth={s(0.8)}>
                      {/* Width 315mm */}
                      <line x1={x2} y1={y3+s(16)} x2={x3} y2={y3+s(16)} />
                      <line x1={x2} y1={y3+s(16)-tk} x2={x2} y2={y3+s(16)+tk} />
                      <line x1={x3} y1={y3+s(16)-tk} x2={x3} y2={y3+s(16)+tk} />
                      <text x={(x2+x3)/2} y={y3+s(12)} textAnchor="middle" fill="#3b82f6" stroke="none" fontSize={dz} fontWeight="700">{BW} mm</text>
                      {/* Height 202mm */}
                      <line x1={x3+s(16)} y1={y2} x2={x3+s(16)} y2={y3} />
                      <line x1={x3+s(16)-tk} y1={y2} x2={x3+s(16)+tk} y2={y2} />
                      <line x1={x3+s(16)-tk} y1={y3} x2={x3+s(16)+tk} y2={y3} />
                      <text x={x3+s(22)} y={(y2+y3)/2+dz/3} fill="#3b82f6" stroke="none" fontSize={dz} fontWeight="700">{BH} mm</text>
                    </g>
                  </svg>
                );
              })()}

              {/* Face panels */}
              {faces.map(face => {
                const faceColor = state[view].faceColors[face.id] ?? "#c8a97e";
                return (
                  <DielineFace
                    key={face.id + "-" + view}
                    face={face} color={faceColor}
                    selected={selectedFace === face.id}
                    hovered={hoveredFace === face.id && selectedFace !== face.id}
                    onSelect={() => { setSelectedFace(face.id as FaceId); setSelectedItemId(null); setShowFaceColorPopup(true); }}
                    onHover={() => setHoveredFace(face.id as FaceId)}
                    onLeave={() => setHoveredFace(null)}
                    items={getFaceItems(face.id)}
                    zoom={zoom}
                  />
                );
              })}

              {/* Locking tabs on side-left-flap (protrude left from left edge) */}
              {(() => {
                const face = faces.find(f => f.id === "side-left-flap");
                if (!face) return null;
                const faceColor = state[view].faceColors["side-left-flap"] ?? "#c8a97e";
                const nW = 10 * zoom;
                const nH = 38 * zoom;
                const nX = face.x * zoom - nW;
                const style: React.CSSProperties = { position: "absolute", width: nW, height: nH, background: faceColor, border: "1.5px dashed rgba(0,0,0,0.25)", boxSizing: "border-box", zIndex: 5, pointerEvents: "none" };
                return (
                  <>
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.30 - 11) * zoom }} />
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.65 - 11) * zoom }} />
                  </>
                );
              })()}

              {/* Locking slots on side-left right edge (white cutouts, same Y as tabs) */}
              {(() => {
                const face = faces.find(f => f.id === "side-left");
                if (!face) return null;
                const nW = 10 * zoom;
                const nH = 38 * zoom;
                const nX = (face.x + face.w) * zoom;
                const style: React.CSSProperties = { position: "absolute", width: nW, height: nH, background: "#ffffff", border: "1.5px dashed rgba(0,0,0,0.25)", boxSizing: "border-box", zIndex: 5, pointerEvents: "none" };
                return (
                  <>
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.30 - 19) * zoom }} />
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.65 - 19) * zoom }} />
                  </>
                );
              })()}

              {/* Locking tabs on side-right-flap (protrude right from right edge) */}
              {(() => {
                const face = faces.find(f => f.id === "side-right-flap");
                if (!face) return null;
                const faceColor = state[view].faceColors["side-right-flap"] ?? "#c8a97e";
                const nW = 10 * zoom;
                const nH = 38 * zoom;
                const nX = (face.x + face.w) * zoom;
                const style: React.CSSProperties = { position: "absolute", width: nW, height: nH, background: faceColor, border: "1.5px dashed rgba(0,0,0,0.25)", boxSizing: "border-box", zIndex: 5, pointerEvents: "none" };
                return (
                  <>
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.30 - 19) * zoom }} />
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.65 - 19) * zoom }} />
                  </>
                );
              })()}

              {/* Locking slots on side-right left edge (white cutouts into Base) */}
              {(() => {
                const face = faces.find(f => f.id === "side-right");
                if (!face) return null;
                const nW = 10 * zoom;
                const nH = 38 * zoom;
                const nX = face.x * zoom - nW;
                const style: React.CSSProperties = { position: "absolute", width: nW, height: nH, background: "#ffffff", border: "1.5px dashed rgba(0,0,0,0.25)", boxSizing: "border-box", zIndex: 5, pointerEvents: "none" };
                return (
                  <>
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.30 - 19) * zoom }} />
                    <div style={{ ...style, left: nX, top: (face.y + face.h * 0.65 - 19) * zoom }} />
                  </>
                );
              })()}

              {/* Dimension overlays — on top of face panels */}
              {!hideFlaps && (() => {
                const z = zoom;
                const s = (n: number) => n * z;
                const tk = s(5);
                const lx = s(NX1 + BW / 2);
                // 62mm — Back Side face (vertical)
                const by1 = s(NY_LID) + s(10);
                const by2 = s(NY_LID + BD) - s(10);
                // 202mm — Base face (vertical)
                const fy1 = s(NY_BASE) + s(10);
                const fy2 = s(NY_BASE + BH) - s(10);
                // 315mm — Base face bottom (horizontal)
                const hx1 = s(NX1) + s(10);
                const hx2 = s(NX2) - s(10);
                const hy  = s(NY_BASE + BH) - s(20);
                return (
                  <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }} width={TOTAL_DIELINE_W * z} height={DIELINE_H_FULL * z}>
                    <g fill="none" stroke="#3b82f6" strokeWidth={s(1.5)}>
                      {/* 62 mm depth */}
                      <line x1={lx} y1={by1} x2={lx} y2={by2} />
                      <line x1={lx - tk} y1={by1} x2={lx + tk} y2={by1} />
                      <line x1={lx - tk} y1={by2} x2={lx + tk} y2={by2} />
                      <text x={lx + s(20)} y={(by1 + by2) / 2 + s(6)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BD} mm</text>
                      {/* 202 mm height */}
                      <line x1={lx} y1={fy1} x2={lx} y2={fy2} />
                      <line x1={lx - tk} y1={fy1} x2={lx + tk} y2={fy1} />
                      <line x1={lx - tk} y1={fy2} x2={lx + tk} y2={fy2} />
                      <text x={lx + s(6)} y={(fy1 + fy2) / 2 + s(6)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BH} mm</text>
                      {/* 315 mm width — horizontal at bottom of Base face */}
                      <line x1={hx1} y1={hy} x2={hx2} y2={hy} />
                      <line x1={hx1} y1={hy - tk} x2={hx1} y2={hy + tk} />
                      <line x1={hx2} y1={hy - tk} x2={hx2} y2={hy + tk} />
                      <text x={hx2 - s(4)} y={hy - s(6)} textAnchor="end" fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BW} mm</text>
                    </g>
                  </svg>
                );
              })()}

              {/* Face color popup above selected face */}
              {selectedFace && selectedFaceDef && showFaceColorPopup && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: (selectedFaceDef.x + selectedFaceDef.w / 2 - 70) * zoom,
                    top: Math.max(0, selectedFaceDef.y * zoom - 52),
                    zIndex: 50,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 140,
                  }}
                >
                  <label title="Custom color" style={{ width: 22, height: 22, borderRadius: "50%", background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", flexShrink: 0, cursor: "pointer", display: "block", position: "relative" }}>
                    <input type="color" value={vd.faceColors[selectedFace] ?? "#c8a97e"} onChange={e => setFaceColor(selectedFace, e.target.value)} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                  </label>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#111827" }}>Face color</span>
                  <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                    {BOX_COLORS.map(c => (
                      <button key={c.value} onClick={() => setFaceColor(selectedFace, c.value)} title={c.label} style={{ width: 18, height: 18, borderRadius: "50%", background: c.value, border: `2px solid ${vd.faceColors[selectedFace] === c.value ? "#3b82f6" : "#e5e7eb"}`, padding: 0, cursor: "pointer", flexShrink: 0 }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Draggable items on selected face */}
              {selectedFace && (() => {
                const face = faces.find(f => f.id === selectedFace);
                if (!face) return null;
                return getFaceItems(selectedFace).map(item => {
                  const isSel = selectedItemId === item.id;
                  const isEd = editingItemId === item.id;
                  if (item.kind === "text") {
                    return (
                      <div key={item.id + (isEd ? "-e" : "")} contentEditable={isEd} suppressContentEditableWarning
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus={isEd}
                        style={{ position: "absolute", left: (face.x + item.x) * zoom, top: (face.y + item.y) * zoom, width: item.w * zoom, fontFamily: item.font, fontSize: `${item.size * zoom}px`, fontWeight: item.bold ? 700 : 400, color: item.color, textAlign: item.align, padding: "2px 4px", outline: isEd ? "none" : isSel ? "1.5px solid #3b82f6" : "none", outlineOffset: "0px", borderRadius: 2, cursor: isEd ? "text" : "move", userSelect: isEd ? "text" : "none", whiteSpace: "pre-wrap", wordBreak: "break-word", zIndex: isSel ? 20 : 10, background: "transparent" }}
                        onPointerDown={e => { if (isEd) return; e.stopPropagation(); setSelectedItemId(item.id); startDragItem(e, selectedFace, item); }}
                        onDoubleClick={e => { e.stopPropagation(); setEditingItemId(item.id); }}
                        onBlur={e => { updateItem(selectedFace, item.id, { text: e.currentTarget.textContent ?? item.text }); setEditingItemId(null); }}
                        onClick={e => e.stopPropagation()}
                      >{item.text}
                        {isSel && !isEd && (
                          <>
                            {(["tl","tr","bl","br"] as const).map(c => (
                              <div key={c} onPointerDown={e => startResizeItem(e, selectedFace, item, c)} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: c === "tl" ? "nw-resize" : c === "tr" ? "ne-resize" : c === "bl" ? "sw-resize" : "se-resize", ...(c[0]==="t" ? { top: -4 } : { bottom: -4 }), ...(c[1]==="l" ? { left: -4 } : { right: -4 }) }} />
                            ))}
                            <div onPointerDown={e => startResizeItem(e, selectedFace, item, "l")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: "ew-resize", left: -4, top: "calc(50% - 4px)" }} />
                            <div onPointerDown={e => startResizeItem(e, selectedFace, item, "r")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: "ew-resize", right: -4, top: "calc(50% - 4px)" }} />
                          </>
                        )}
                      </div>
                    );
                  }
                  if (item.kind === "image") {
                    return (
                      <div key={item.id} style={{ position: "absolute", left: (face.x + item.x) * zoom, top: (face.y + item.y) * zoom, width: item.w * zoom, height: item.h * zoom, outline: isSel ? "1.5px solid #3b82f6" : "none", outlineOffset: "0px", cursor: "move", zIndex: isSel ? 20 : 10, overflow: "hidden" }}
                        onPointerDown={e => { e.stopPropagation(); setSelectedItemId(item.id); startDragItem(e, selectedFace, item); }}
                        onClick={e => e.stopPropagation()}
                      >
                        <img src={item.src} alt="" draggable={false} style={{ width: `${item.w * zoom}px`, height: `${item.h * zoom}px`, display: "block", pointerEvents: "none" }} />
                        {isSel && (
                          <>
                            <button onClick={e => { e.stopPropagation(); removeItem(selectedFace, item.id); setSelectedItemId(null); }} style={{ position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>✕</button>
                            {(["tl","tr","bl","br"] as const).map(c => (
                              <div key={c} onPointerDown={e => startResizeItem(e, selectedFace, item, c)} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: c === "tl" ? "nw-resize" : c === "tr" ? "ne-resize" : c === "bl" ? "sw-resize" : "se-resize", ...(c[0]==="t" ? { top: -4 } : { bottom: -4 }), ...(c[1]==="l" ? { left: -4 } : { right: -4 }) }} />
                            ))}
                            <div onPointerDown={e => startResizeItem(e, selectedFace, item, "l")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: "ew-resize", left: -4, top: "calc(50% - 4px)" }} />
                            <div onPointerDown={e => startResizeItem(e, selectedFace, item, "r")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #3b82f6", borderRadius: 2, zIndex: 30, cursor: "ew-resize", right: -4, top: "calc(50% - 4px)" }} />
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                });
              })()}
</div>
            </div>
          </div>

          {/* ── Bottom toolbar ── */}
          <div style={{ height: 64, borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1.5rem", gap: "0.4rem", flexShrink: 0, position: "relative" }}>
            {/* Centered group */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {/* Tool mode */}
              <button onClick={() => setToolMode("select")} title="Select" style={{ width: 42, height: 42, border: "1px solid #e5e7eb", borderRadius: 10, background: toolMode === "select" ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: toolMode === "select" ? "#2563eb" : "#374151" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-7 1-4 7z"/></svg>
              </button>
              <button onClick={() => setToolMode("pan")} title="Pan" style={{ width: 42, height: 42, border: "1px solid #e5e7eb", borderRadius: 10, background: toolMode === "pan" ? "#eff6ff" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: toolMode === "pan" ? "#2563eb" : "#374151" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
              </button>

              <div style={{ width: 1, height: 30, background: "#e5e7eb", margin: "0 4px" }} />

              {/* Undo / Redo */}
              <button onClick={undo} disabled={histIdx === 0} title="Undo" style={{ width: 42, height: 42, border: "1px solid #e5e7eb", borderRadius: 10, background: histIdx === 0 ? "#f9fafb" : "#fff", cursor: histIdx === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: histIdx === 0 ? "#d1d5db" : "#374151" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
              </button>
              <button onClick={redo} disabled={histIdx >= history.length - 1} title="Redo" style={{ width: 42, height: 42, border: "1px solid #e5e7eb", borderRadius: 10, background: histIdx >= history.length - 1 ? "#f9fafb" : "#fff", cursor: histIdx >= history.length - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: histIdx >= history.length - 1 ? "#d1d5db" : "#374151" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4"/></svg>
              </button>

              <div style={{ width: 1, height: 30, background: "#e5e7eb", margin: "0 4px" }} />

              {/* Zoom */}
              <button onClick={() => setZoom(z => parseFloat(Math.max(0.4, z - 0.1).toFixed(1)))} style={{ width: 38, height: 38, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 700, color: "#374151", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#374151", minWidth: 52, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => parseFloat(Math.min(2, z + 0.1).toFixed(1)))} style={{ width: 38, height: 38, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 700, color: "#374151", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>

            </div>

            {/* Delete selected item — pinned right */}
            {selectedItemId && selectedFace && (
              <button onClick={() => { removeItem(selectedFace, selectedItemId); setSelectedItemId(null); }} style={{ position: "absolute", right: "1.5rem", padding: "0.4rem 1rem", border: "1px solid #fca5a5", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>Delete</button>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ width: 520, borderLeft: "1px solid #e5e7eb", background: "#fafafa", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* 3D Preview - draggable to rotate */}
          <div style={{ padding: "0.75rem", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>3D Preview</span>
              <span style={{ fontSize: "0.65rem", background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>3D</span>
            </div>
            <div
              onPointerDown={start3DRotate}
              style={{ cursor: "grab", borderRadius: 12, overflow: "hidden", background: "#f0f0f0", userSelect: "none", position: "relative" }}
            >
              <div style={{ transform: `scale(${preview3dZoom})`, transformOrigin: "center 65%", transition: "transform 0.15s" }}>
                <Box3DPreview faceColors={state.outside.faceColors} insideFaceColors={state.inside.faceColors} insideColor={state.insideColor} outsideItems={state.outside.items} insideItems={state.inside.items} openAmount={openAmount} rotX={rotX} rotY={rotY} hideFlaps={hideFlaps} squareFaces={hideFlaps ? faces : undefined} />
              </div>
              {/* Zoom buttons — bottom right */}
              <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setPreview3dZoom(z => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))))}
                  style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.92)", border: "1px solid #d1d5db", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
                >+</button>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setPreview3dZoom(z => Math.max(0.3, parseFloat((z - 0.15).toFixed(2))))}
                  style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.92)", border: "1px solid #d1d5db", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
                >−</button>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#374151", textAlign: "center", background: "rgba(255,255,255,0.85)", borderRadius: 4, padding: "2px 0" }}>{Math.round(preview3dZoom * 100)}%</span>
              </div>
            </div>
            {/* Open / Close slider */}
            <div style={{ padding: "0.6rem 0 0.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Open</span>
                <span style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 600 }}>Close</span>
              </div>
              <input type="range" min={0} max={100} value={openAmount} onChange={e => setOpenAmount(Number(e.target.value))} style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
            </div>
          </div>

          {/* Outside / Inside toggle */}
          <div style={{ padding: "0.75rem", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
              {(["outside", "inside"] as const).map(v => (
                <button key={v} onClick={() => { setView(v); setSelectedFace(null); setSelectedItemId(null); setShowFaceColorPopup(false); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", background: view === v ? "#fff" : "transparent", color: view === v ? "#111827" : "#6b7280", boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none", textTransform: "capitalize" }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* ── Finalize Your Order modal ───────────────────────────────────── */}
    {finalStepsOpen && (
      <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", flexDirection: "column", background: "#f0f2f5" }}>

        {/* Gradient header */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)", padding: "0 28px", height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>Finalize Your Order</span>
          </div>
          <button
            onClick={() => setFinalStepsOpen(false)}
            style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        {/* Body — 50/50 split */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — 3D box preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "24px 16px", borderRight: "1px solid #e5e7eb", background: "#fff", overflow: "hidden" }}>
            <div
              style={{ cursor: "grab", userSelect: "none", transform: "scale(2.2)", transformOrigin: "center center", flexShrink: 0 }}
              onMouseDown={(e) => {
                const startX = e.clientX, startY = e.clientY;
                const startRX = finalRotRef.current.rx, startRY = finalRotRef.current.ry;
                const onMove = (me: MouseEvent) => {
                  finalRotRef.current.ry = startRY + (me.clientX - startX) * 0.5;
                  finalRotRef.current.rx = Math.max(-80, Math.min(80, startRX - (me.clientY - startY) * 0.5));
                  setFinalRotY(finalRotRef.current.ry);
                  setFinalRotX(finalRotRef.current.rx);
                };
                const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            >
              <Box3DPreview
                faceColors={state.outside.faceColors}
                insideFaceColors={state.inside.faceColors}
                insideColor={state.insideColor}
                outsideItems={state.outside.items}
                insideItems={state.inside.items}
                openAmount={100}
                rotX={finalRotX}
                rotY={finalRotY}
                hideFlaps={hideFlaps}
                squareFaces={hideFlaps ? faces : undefined}
              />
            </div>
          </div>

          {/* RIGHT — Final Steps form */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 40px 32px", overflowY: "auto", background: "#f0f2f5" }}>

            {/* Title */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>Final Steps</h2>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#6b7280", lineHeight: 1.6 }}>
                Almost done! Make selections below to finalize your design.{" "}
                <span style={{ color: "#7c3aed", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Have questions?</span>
              </p>
            </div>

            {/* Quantity */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 24px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20, border: "1.5px solid #e5e7eb" }}>
              <label htmlFor="sb-qty-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Quantity
              </label>
              <input
                id="sb-qty-input"
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={selectedQty === 0 ? "" : selectedQty}
                onChange={(e) => { const v = parseInt(e.target.value, 10); setSelectedQty(isNaN(v) || v < 1 ? 0 : v); }}
                style={{ width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: "0.95rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
              />
              {/* Price calculation */}
              {(() => {
                const raw = product.startingPrice?.trim() ?? "";
                const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
                if (isNaN(num) || num <= 0 || selectedQty < 1) return null;
                const currency = raw.startsWith("₹") ? "₹" : "$";
                return (
                  <div style={{ marginTop: 14, padding: "12px 16px", background: "linear-gradient(135deg, #faf5ff, #fdf2f8)", borderRadius: 10, border: "1.5px solid #e9d5ff" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: 600 }}>
                        {currency}{num.toFixed(2)} × {selectedQty}
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, background: "linear-gradient(90deg,#7c3aed,#db2777)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        {currency}{(num * selectedQty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Terms & Conditions */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e5e7eb", marginBottom: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.76rem", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase" }}>Terms &amp; Conditions</p>
              <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Prices are subject to final artwork and production review.",
                  "Taxes are extra.",
                  "Production starts after payment and final artwork approval.",
                  "No cancellation or refund once order is sent to production.",
                  "Slight colour variation may occur between screen and final print.",
                  "Customer is responsible for proofreading before approval.",
                  "Turnaround time may vary by product and shipping.",
                  "Free basic design includes minor layout only, not full branding.",
                ].map((point) => (
                  <li key={point} style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>{point}</li>
                ))}
              </ul>
            </div>

            {/* Approval checkbox */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1.5px solid ${designApproved ? "#7c3aed" : "#e5e7eb"}`, marginBottom: 28, transition: "border-color 0.2s" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <input type="checkbox" checked={designApproved} onChange={(e) => setDesignApproved(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${designApproved ? "#7c3aed" : "#d1d5db"}`, background: designApproved ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    {designApproved && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                  </div>
                </div>
                <span style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.6, fontWeight: 500 }}>
                  I have authorization to use the design, I have reviewed and approve it.
                </span>
              </label>
            </div>

            {/* Continue button */}
            <button
              disabled={!designApproved || selectedQty < 1}
              onClick={async () => {
                if (!designApproved || selectedQty < 1) return;
                // Generate 2.5D box thumbnail using actual face colors
                let thumb: string | undefined;
                try {
                  const fc = state.outside.faceColors;
                  const DEFAULT = "#c8a97e";
                  const frontColor = fc["sq-front-panel"] ?? fc["front"] ?? DEFAULT;
                  const rightColor = fc["sq-right-side-panel"] ?? fc["side-right"] ?? frontColor;
                  const topColor   = fc["sq-outer-flap"] ?? fc["lid"] ?? frontColor;

                  // Darken a hex color by mixing with black
                  const mix = (hex: string, amount: number) => {
                    const n = parseInt(hex.replace("#",""), 16);
                    const r = Math.round(((n >> 16) & 0xff) * amount);
                    const g = Math.round(((n >> 8)  & 0xff) * amount);
                    const b = Math.round(((n)       & 0xff) * amount);
                    return `rgb(${r},${g},${b})`;
                  };

                  const c = document.createElement("canvas");
                  c.width = 160; c.height = 160;
                  const ctx = c.getContext("2d")!;

                  // Background
                  ctx.fillStyle = "#f5f5f5";
                  ctx.fillRect(0, 0, 160, 160);

                  // Square shipping box stays cubic; pizza/shipping are wider than tall
                  const isSquare = hideFlaps;
                  const W = isSquare ? 74 : 88;
                  const H = isSquare ? 74 : 56;
                  const D = isSquare ? 26 : 18;
                  const sx = isSquare ? 18 : 12;
                  const sy = isSquare ? 56 : 62;

                  // Top face
                  ctx.fillStyle = mix(topColor, 1.15) === topColor ? topColor : mix(topColor, 1.0);
                  ctx.fillStyle = topColor;
                  ctx.beginPath();
                  ctx.moveTo(sx,     sy);
                  ctx.lineTo(sx + D, sy - D);
                  ctx.lineTo(sx + W + D, sy - D);
                  ctx.lineTo(sx + W, sy);
                  ctx.closePath();
                  ctx.fill();

                  // Right face (slightly darker)
                  ctx.fillStyle = mix(rightColor, 0.78);
                  ctx.beginPath();
                  ctx.moveTo(sx + W,     sy);
                  ctx.lineTo(sx + W + D, sy - D);
                  ctx.lineTo(sx + W + D, sy + H - D);
                  ctx.lineTo(sx + W,     sy + H);
                  ctx.closePath();
                  ctx.fill();

                  // Front face
                  ctx.fillStyle = frontColor;
                  ctx.fillRect(sx, sy, W, H);

                  // Edge lines
                  ctx.strokeStyle = "rgba(0,0,0,0.22)";
                  ctx.lineWidth = 1.5;
                  // Front rect
                  ctx.strokeRect(sx, sy, W, H);
                  // Top
                  ctx.beginPath();
                  ctx.moveTo(sx, sy);
                  ctx.lineTo(sx + D, sy - D);
                  ctx.lineTo(sx + W + D, sy - D);
                  ctx.lineTo(sx + W, sy);
                  ctx.stroke();
                  // Right
                  ctx.beginPath();
                  ctx.moveTo(sx + W + D, sy - D);
                  ctx.lineTo(sx + W + D, sy + H - D);
                  ctx.lineTo(sx + W, sy + H);
                  ctx.stroke();

                  thumb = c.toDataURL("image/jpeg", 0.92);
                } catch { /* ignore */ }
                // Generate per-face canvas snapshots (color + images) for admin preview
                const DEFAULT_FC = "#c8a97e";
                const fc2 = state.outside.faceColors;
                const fi = (id: string) => state.outside.items[id] ?? [];
                let boxFaceImages: { front?: string; right?: string; top?: string } = {};
                try {
                  const [front, right, top] = await Promise.all([
                    renderFaceToCanvas(fc2["sq-front-panel"] ?? DEFAULT_FC, fi("sq-front-panel"), sqPanelW, frontFace.h),
                    renderFaceToCanvas(fc2["sq-right-side-panel"] ?? DEFAULT_FC, fi("sq-right-side-panel"), sqPanelW, frontFace.h),
                    renderFaceToCanvas(fc2["sq-outer-flap"] ?? DEFAULT_FC, fi("sq-outer-flap"), sqPanelW, sqLidH),
                  ]);
                  boxFaceImages = { front, right, top };
                } catch { /* ignore */ }

                const cartId = Date.now().toString();
                // Save to localStorage immediately so header badge updates
                try {
                  const raw = product.startingPrice?.trim() ?? "";
                  const ppu = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
                  const existing = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<Record<string, unknown>>;
                  existing.push({ id: cartId, name: product.name, qty: selectedQty, pricePerUnit: ppu, total: ppu * selectedQty, thumb, boxFaceImages });
                  localStorage.setItem("wp_cart", JSON.stringify(existing));
                  localStorage.setItem("wp_cart_count", String(existing.length));
                  window.dispatchEvent(new CustomEvent("wp-cart-updated", { detail: { count: existing.length } }));
                } catch { /* ignore */ }
                setPendingCartId(cartId);
                setThumbDataUrl(thumb);
                setBoxFaceImagesState(boxFaceImages);
                setCheckoutOpen(true);
              }}
              style={{
                width: "100%", padding: "16px",
                background: designApproved && selectedQty >= 1
                  ? "linear-gradient(135deg, #7c3aed, #db2777)"
                  : "#e5e7eb",
                color: designApproved && selectedQty >= 1 ? "#fff" : "#9ca3af",
                border: "none", borderRadius: 14, fontSize: "1rem", fontWeight: 800,
                cursor: designApproved && selectedQty >= 1 ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                boxShadow: designApproved && selectedQty >= 1 ? "0 4px 18px rgba(124,58,237,0.35)" : "none",
              }}
            >
              {designApproved && selectedQty >= 1 ? "Continue" : "Please approve your design to continue"}
            </button>
            {!(designApproved && selectedQty >= 1) && (
              <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#9ca3af", marginTop: 8 }}>
                Check the box above to enable the continue button
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Checkout Overlay ─────────────────────────────────────────────────── */}
    {checkoutOpen && (() => {
      const raw = product.startingPrice?.trim() ?? "";
      const pricePerUnit = parseFloat(raw.replace(/[^0-9.]/g, ""));
      return (
        <CheckoutOverlay
          productName={product.name ?? "Shipping Box"}
          pricePerUnit={isNaN(pricePerUnit) ? 0 : pricePerUnit}
          selectedQty={selectedQty}
          setSelectedQty={(fn) => setSelectedQty(fn)}
          pendingCartId={pendingCartId}
          thumb={thumbDataUrl}
          boxFaceImages={boxFaceImagesState}
          isDoubleSided={false}
          onClose={() => setCheckoutOpen(false)}
          onCloseAll={() => { setCheckoutOpen(false); setFinalStepsOpen(false); }}
          onPreviewClick={() => {
            boxPreviewRotRef.current = { rx: -20, ry: 210 };
            setBoxPreviewRotX(-20);
            setBoxPreviewRotY(210);
            setBoxPreviewOpen(true);
          }}
        />
      );
    })()}

    {/* ── Box 3D Preview Modal (from checkout thumbnail click) ── */}
    {boxPreviewOpen && (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)", padding: "0 28px", height: 54, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{product.name}</span>
          <button onClick={() => setBoxPreviewOpen(false)} style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {/* 3D preview area */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", overflow: "hidden" }}>
          <div
            style={{ cursor: "grab", userSelect: "none", transform: "scale(2.4)", transformOrigin: "center center" }}
            onMouseDown={(e) => {
              const startX = e.clientX, startY = e.clientY;
              const startRX = boxPreviewRotRef.current.rx, startRY = boxPreviewRotRef.current.ry;
              const onMove = (me: MouseEvent) => {
                boxPreviewRotRef.current.ry = startRY + (me.clientX - startX) * 0.5;
                boxPreviewRotRef.current.rx = Math.max(-80, Math.min(80, startRX - (me.clientY - startY) * 0.5));
                setBoxPreviewRotY(boxPreviewRotRef.current.ry);
                setBoxPreviewRotX(boxPreviewRotRef.current.rx);
              };
              const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          >
            <Box3DPreview
              faceColors={state.outside.faceColors}
              insideFaceColors={state.inside.faceColors}
              insideColor={state.insideColor}
              outsideItems={state.outside.items}
              insideItems={state.inside.items}
              openAmount={100}
              rotX={boxPreviewRotX}
              rotY={boxPreviewRotY}
              hideFlaps={hideFlaps}
              squareFaces={hideFlaps ? faces : undefined}
            />
          </div>
        </div>
        <div style={{ padding: "12px 0 16px", textAlign: "center", background: "#f5f5f5", fontSize: "0.78rem", color: "#9ca3af" }}>
          Drag to rotate
        </div>
      </div>
    )}
    </Fragment>
  );
}
