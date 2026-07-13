"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import type { Product } from "@/lib/types";
import CheckoutOverlay from "@/components/checkout-overlay";
import {
  type MaterialOption,
  WHITE_PAPERBOARD_OPTIONS, KRAFT_PAPERBOARD_OPTIONS, ART_PAPER_OPTIONS, CORRUGATED_OPTIONS,
  CUSTOM_MATERIAL_RANGES, CUSTOM_DELTA_TABLES, MATERIAL_CATEGORIES,
} from "@/lib/box-materials";

// ─── Mailer Box geometry (mm / px at zoom=1) ────────────────────────────────
const BW   = 315;  // base / front / back wall width
const BD   = 62;   // depth  = side wall width = front/back wall height
const DWST = 24;   // dust flap height
const PAD  = 22;   // canvas padding

// ─── Uniform flap-row height ─────────────────────────────────────────────────
// Every "flap" band in the unfolded dieline renders at a single uniform visible
// row height (FLAP_H = 65mm), so the layout looks even instead of having
// inconsistent flap heights. This single constant now drives:
//  - LID_H            → Back Side ("lid") / Side Wall Flap L/R ("lid-left"/"lid-right") row height
//  - TOP_LOCK_R        → Dust Flap Super Top band height AND the Top Lock Flap diamond's
//                        half-diagonal, so the diamond's lower half (the part that shares
//                        the Dust Flap Super Top row) is exactly FLAP_H tall. The full
//                        diamond bounding box is therefore 2×FLAP_H (130mm) — expected,
//                        since a diamond is a rotated square spanning two stacked rows.
//  - LOCK_FLAP_SIZE    → Front Bottom Flap height, Bottom Lock Flap diamond half-diagonal
//                        (same "half the diamond sits in the row" logic as the top corner),
//                        and Bottom Tuck Flap L/R size.
//  - SIDE_WALL_H       → Left/Right Side Wall height (previously derived as BH - LOCK_FLAP_SIZE;
//                        now independent so it can equal FLAP_H without blowing up the
//                        bottom-corner diamond math).
// Since the side wall sits directly above the bottom-corner diamond row and must tile
// edge-to-edge with no gap, BH (the Base/front panel height, and therefore the side wall's
// containing row) is recomputed as SIDE_WALL_H + LOCK_FLAP_SIZE = FLAP_H * 2, which keeps
// the side wall's bottom edge flush with the top of the bottom-corner diamond — exactly the
// same relationship the geometry relied on before (sideWallBottom === diamondTop).
const FLAP_H = 65;          // uniform visible height for every flap row (default)
const TOP_LOCK_FIXED_W = 65; // top lock flap diamond half-size (W and H equal for 45° angle)

// ─── Faces ───────────────────────────────────────────────────────────────────
type FaceId =
  | "dust-flap-top" | "top-side-flap-left" | "top-side-flap-right"
  | "top-lock-flap-l" | "top-lock-flap-r"
  | "lid" | "lid-left" | "lid-right"
  | "side-left" | "front" | "side-right"
  | "lock-flap-bl" | "left-bottom-tri"
  | "lock-flap-br" | "right-bottom-tri"
  | "bottom-tuck-flap-l" | "bottom-tuck-flap-r"
  | "front-bottom-flap" | "front-top-flap"
  | "bottom-lock-gusset-l" | "bottom-lock-gusset-r";

type FaceDef = { id: FaceId; label: string; x: number; y: number; w: number; h: number; small?: boolean; dashedLines?: boolean; clipBottomLeft?: boolean; clipBottomRight?: boolean; clipTopRight?: boolean; clipTopLeft?: boolean; roundTL?: boolean; roundTR?: boolean; verticalLabel?: boolean; chamferTR?: boolean; chamferTL?: boolean; chamferBL?: boolean; chamferBR?: boolean; chamferW?: number; diamond?: boolean; diamondOutsideTLCut?: boolean; diamondCutBL?: boolean; diamondCutBR?: boolean; diagCutDiamondBR?: boolean; diagCutDiamondBL?: boolean; triangleTL?: boolean; triangleTR?: boolean; triangleTop?: boolean; sideLabels?: boolean; diagCutTopRight?: boolean; diagCutRightSide?: boolean; diagCutBothSides?: boolean; diagCutTopSides?: boolean; topLockGapFillR?: boolean; topLockGapFillL?: boolean; roundDiamondTL?: boolean; roundDiamondTR?: boolean; roundTopCorners?: boolean; roundBottomCorners?: boolean; frameOnly?: boolean; gapLockTuckL?: boolean; gapLockTuckR?: boolean; tuckWithGapBL?: boolean; tuckWithGapBR?: boolean; leftBottomCorner?: boolean; rightBottomCorner?: boolean; triCutBR?: boolean; triCutBL?: boolean; cutW?: number; triExTR?: boolean; triExTL?: boolean; diamondMergedGusset?: boolean; diamondMergedGussetMirror?: boolean; kiteMidY?: number; gussetQuad?: boolean; gussetQuadMirror?: boolean };

// ─── Pure geometry builder ────────────────────────────────────────────────────
// Re-derives every constant that used to be hardcoded at module scope, but
// parameterized by `flapH` (the uniform visible height for every flap row,
// driven by the Basics → Height input) instead of the literal 65. All formulas
// below are unchanged copies of the original module-level computations.
function buildGeometry(flapH: number, topLockFlapH: number = TOP_LOCK_FIXED_W, bw: number = BW, bh: number = 2 * flapH) {
  const LOCK_FLAP_SIZE = flapH;                        // bottom-corner tuck/tri/flap unit — Front Bottom Flap height
  const SIDE_WALL_H = Math.max(0, bh - LOCK_FLAP_SIZE); // fills Base row down to where lock flaps begin — no gap
  const BOTTOM_LOCK_W = Math.round(2 * flapH / 3);  // bottom lock flap diamond half-diagonal — fits within BD=62 side wing
  const TOP_LOCK_W = Math.round(2 * flapH / 3);  // scales with flapH so diamond height ≈ side flap height
  const TOP_LOCK_R = Math.round(2 * flapH / 3);  // equal to W for 45° diamond angle
  const BH   = SIDE_WALL_H + LOCK_FLAP_SIZE; // base / side wall row height — keeps side wall flush with bottom-corner diamond, no gap/overlap

  // ─── Key X positions ───────────────────────────────────────────────────────
  const NX0 = PAD;
  const NX1 = PAD + BD;
  const NX2 = PAD + BD + bw;
  const NX3 = PAD + BD + bw + BD;

  // ─── Key Y positions ───────────────────────────────────────────────────────
  const NY0 = PAD;
  const NY1 = PAD + DWST;
  const NY2 = PAD + DWST + BD;
  const NY3 = PAD + DWST + BD + BH;
  const NY4 = PAD + DWST + BD + BH + BD;
  const NY5 = PAD + DWST + BD + BH + BD + DWST;

  // ─── Dust Flap geometry ─────────────────────────────────────────────────────
  const DUST_H  = bh;                     // Dust Flap (Top) height — driven by WIDTH input, same as Base height
  const LID_H   = flapH;                  // Back Side / Side Wall Flap L/R row height
  const NY_DUST = NY0;                     // Dust Flap top y (at canvas top)
  const NY_LID  = NY_DUST + DUST_H;       // Back Side top y
  const NY_BASE = NY_LID + LID_H;         // Base row top y
  const NY_BOT  = NY_BASE + bh;           // Bottom row top y
  const DIELINE_H_FULL = NY_BOT + BOTTOM_LOCK_W * 2 + PAD; // Total canvas height (includes tuck flap below)

  const FACES_OUTSIDE: FaceDef[] = [
    { id: "dust-flap-top",          label: "Dust Flap Super Top",        x: NX1,                               y: NY0,                               w: bw,                 h: DUST_H, diagCutTopSides: true },
    { id: "front-top-flap",         label: "Front Top Flap",             x: NX1 + BOTTOM_LOCK_W,              y: NY0 - topLockFlapH,                w: bw - 2 * BOTTOM_LOCK_W, h: topLockFlapH, roundTopCorners: true },
    { id: "top-lock-flap-l",        label: "Top Lock Flap (Left)",       x: NX2 - TOP_LOCK_W,                 y: NY0 + TOP_LOCK_R - TOP_LOCK_W * 2,     w: TOP_LOCK_W * 2,     h: TOP_LOCK_W * 2,     small: true, diamond: true, roundDiamondTL: true },
    { id: "top-lock-flap-r",        label: "Top Lock Flap (Right)",      x: NX1 - TOP_LOCK_W,                 y: NY0 + TOP_LOCK_R - TOP_LOCK_W * 2,     w: TOP_LOCK_W * 2,     h: TOP_LOCK_W * 2,     small: true, diamond: true, sideLabels: true, roundDiamondTR: true },
    { id: "top-side-flap-left",  label: "Top Side Flap (Left)",     x: NX1 - LOCK_FLAP_SIZE, y: NY0 + TOP_LOCK_R, w: LOCK_FLAP_SIZE, h: DUST_H - TOP_LOCK_R, small: true, clipBottomLeft: true, clipTopRight: true },
    { id: "top-side-flap-right", label: "Top Side Flap (Right)",    x: NX2,          y: NY0 + TOP_LOCK_R, w: LOCK_FLAP_SIZE,                          h: DUST_H - TOP_LOCK_R, small: true, clipBottomRight: true, clipTopLeft: true },
    { id: "lid",           label: "Back Side",        x: NX1,      y: NY_LID,  w: bw,      h: LID_H },
    { id: "lid-left",      label: "Side Wall Flap (Left)",  x: NX1 - LOCK_FLAP_SIZE, y: NY_LID, w: LOCK_FLAP_SIZE, h: LID_H, small: true },
    { id: "lid-right",     label: "Side Wall Flap (Right)", x: NX2,      y: NY_LID, w: LOCK_FLAP_SIZE, h: LID_H, small: true },
    { id: "side-left",      label: "Left Side Wall", x: NX1 - LOCK_FLAP_SIZE, y: NY_BASE, w: LOCK_FLAP_SIZE, h: BH + BOTTOM_LOCK_W },
    { id: "front",      label: "Base",            x: NX1,      y: NY_BASE, w: bw,      h: bh, chamferBR: true, chamferBL: true, chamferW: BOTTOM_LOCK_W },
    { id: "side-right",      label: "Right Side Wall", x: NX2,      y: NY_BASE, w: LOCK_FLAP_SIZE, h: BH + BOTTOM_LOCK_W },
    { id: "front-bottom-flap",    label: "Front Bottom Flap",      x: NX1 + BOTTOM_LOCK_W,              y: NY_BOT,                            w: bw - 2 * BOTTOM_LOCK_W,  h: topLockFlapH },
    { id: "left-bottom-tri",    label: "Left Bottom Triangle",   x: NX2,                       y: NY_BOT - BOTTOM_LOCK_W,   w: LOCK_FLAP_SIZE,     h: BOTTOM_LOCK_W * 2,     small: true, triCutBR: true, cutW: BOTTOM_LOCK_W },
    { id: "bottom-tuck-flap-l", label: "Bottom Tuck Flap Left",  x: NX2,  y: NY_BOT,  w: BOTTOM_LOCK_W * 2 + Math.round(BOTTOM_LOCK_W * 0.8),  h: BOTTOM_LOCK_W * 2,  small: true, tuckWithGapBL: true },
    { id: "lock-flap-bl",       label: "Bottom Lock Flap",       x: NX2 - BOTTOM_LOCK_W,      y: NY_BOT - BOTTOM_LOCK_W,    w: BOTTOM_LOCK_W * 2,  h: BOTTOM_LOCK_W * 2,  small: true, diamond: true },
    { id: "right-bottom-tri",   label: "Right Bottom Triangle",  x: NX1 - LOCK_FLAP_SIZE,      y: NY_BOT - BOTTOM_LOCK_W,   w: LOCK_FLAP_SIZE,     h: BOTTOM_LOCK_W * 2,     small: true, triCutBL: true, cutW: BOTTOM_LOCK_W },
    { id: "bottom-lock-gusset-l", label: "Bottom Lock Flap",     x: NX2 - BOTTOM_LOCK_W,       y: NY_BOT,                    w: BOTTOM_LOCK_W,      h: topLockFlapH,         small: true, gussetQuad: true, kiteMidY: BOTTOM_LOCK_W / topLockFlapH },
    { id: "bottom-lock-gusset-r", label: "Bottom Lock Flap Right", x: NX1,                     y: NY_BOT,                    w: BOTTOM_LOCK_W,      h: topLockFlapH,         small: true, gussetQuadMirror: true, kiteMidY: BOTTOM_LOCK_W / topLockFlapH },
    { id: "bottom-tuck-flap-r", label: "Bottom Tuck Flap Right", x: NX1 - BOTTOM_LOCK_W * 2 - Math.round(BOTTOM_LOCK_W * 0.8),  y: NY_BOT,  w: BOTTOM_LOCK_W * 2 + Math.round(BOTTOM_LOCK_W * 0.8),  h: BOTTOM_LOCK_W * 2,  small: true, tuckWithGapBR: true },
    { id: "lock-flap-br",       label: "Bottom Lock Flap Right", x: NX1 - BOTTOM_LOCK_W,      y: NY_BOT - BOTTOM_LOCK_W,    w: BOTTOM_LOCK_W * 2,  h: BOTTOM_LOCK_W * 2,  small: true, diamond: true, sideLabels: true },
  ];

  const TOTAL_DIELINE_W = NX3 + PAD;
  const TOTAL_DIELINE_H = NY5 + PAD;

  // ─── Dieline SVG variable aliases ──────────────────────────────────────────
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

  return {
    BW: bw, BD, DWST, PAD, FLAP_H: flapH,
    SIDE_WALL_H, LOCK_FLAP_SIZE, BOTTOM_LOCK_W, TOP_LOCK_R, TOP_LOCK_W, BH: bh,
    NX0, NX1, NX2, NX3,
    NY0, NY1, NY2, NY3, NY4, NY5,
    DUST_H, LID_H, NY_DUST, NY_LID, NY_BASE, NY_BOT, DIELINE_H_FULL,
    FACES_OUTSIDE, TOTAL_DIELINE_W, TOTAL_DIELINE_H,
    LX0, LX1, LX2, LX3, LX4, LX5, LY_TOP, LY2, LY3, LY4, COR,
  };
}

// Default geometry (flapH = FLAP_H) — used by module-level helpers that only
// need face ids (not affected by dimensions) before the component mounts.
const DEFAULT_GEOMETRY = buildGeometry(FLAP_H);
const FACES_OUTSIDE = DEFAULT_GEOMETRY.FACES_OUTSIDE;

// ─── Item types ───────────────────────────────────────────────────────────────
type TextItem  = { id: string; kind: "text"; text: string; x: number; y: number; w: number; font: string; size: number; bold: boolean; color: string; align: "left"|"center"|"right" };
type ImageItem = { id: string; kind: "image"; src: string; x: number; y: number; w: number; h: number };
type CanvasItem = TextItem | ImageItem;

type ViewData   = { faceColors: Record<string, string>; items: Record<string, CanvasItem[]>; globalItems?: CanvasItem[] };
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

const FONT_OPTIONS: { label: string; value: string; previewWeight?: number }[] = [
  { label: "Abel",                        value: "'Abel', sans-serif" },
  { label: "Adelle",                      value: "'Adelle', serif" },
  { label: "Advent Pro",                  value: "'Advent Pro', sans-serif" },
  { label: "Alegreya Black",              value: "'Alegreya', serif",                      previewWeight: 900 },
  { label: "Alex Brush",                  value: "'Alex Brush', cursive" },
  { label: "Allison",                     value: "'Allison', cursive" },
  { label: "Alumni Sans",                 value: "'Alumni Sans', sans-serif" },
  { label: "Amaranth",                    value: "'Amaranth', sans-serif",                 previewWeight: 700 },
  { label: "Antic Slab",                  value: "'Antic Slab', serif" },
  { label: "Archivo",                     value: "'Archivo', sans-serif" },
  { label: "Archivo Narrow",              value: "'Archivo Narrow', sans-serif" },
  { label: "Arimo",                       value: "'Arimo', sans-serif" },
  { label: "Barlow Semi Condensed",       value: "'Barlow Semi Condensed', sans-serif" },
  { label: "Bellefair",                   value: "'Bellefair', serif" },
  { label: "Bellota",                     value: "'Bellota', cursive" },
  { label: "Benchnine",                   value: "'BenchNine', sans-serif" },
  { label: "Bevan",                       value: "'Bevan', serif",                         previewWeight: 700 },
  { label: "BioRhyme Expanded",           value: "'BioRhyme Expanded', serif" },
  { label: "Blazma",                      value: "'Blazma', sans-serif" },
  { label: "Boogaloo",                    value: "'Boogaloo', cursive" },
  { label: "Bowlby One",                  value: "'Bowlby One', cursive",                  previewWeight: 700 },
  { label: "BravoSC",                     value: "'BravoSC', serif" },
  { label: "Bree Serif",                  value: "'Bree Serif', serif" },
  { label: "Carrois Gothic",              value: "'Carrois Gothic', sans-serif" },
  { label: "Chomsky",                     value: "'Chomsky', fantasy" },
  { label: "Cinzel Medium",               value: "'Cinzel', serif",                        previewWeight: 500 },
  { label: "Comic Neue",                  value: "'Comic Neue', cursive" },
  { label: "Cookie",                      value: "'Cookie', cursive" },
  { label: "Corinthia",                   value: "'Corinthia', cursive" },
  { label: "Cormorant Garamond",          value: "'Cormorant Garamond', serif" },
  { label: "Cormorant Infant",            value: "'Cormorant Infant', serif" },
  { label: "Cormorant SC",                value: "'Cormorant SC', serif" },
  { label: "Crete Round",                 value: "'Crete Round', serif",                   previewWeight: 700 },
  { label: "Crimson Pro",                 value: "'Crimson Pro', serif" },
  { label: "Ephesis",                     value: "'Ephesis', cursive" },
  { label: "Euphoria Script",             value: "'Euphoria Script', cursive" },
  { label: "Fanwood Text",                value: "'Fanwood Text', serif" },
  { label: "Fira Sans",                   value: "'Fira Sans', sans-serif" },
  { label: "Fira Sans Extra Condensed",   value: "'Fira Sans Extra Condensed', sans-serif" },
  { label: "Fjalla One",                  value: "'Fjalla One', sans-serif",               previewWeight: 700 },
  { label: "Fondamento",                  value: "'Fondamento', cursive" },
  { label: "Forum",                       value: "'Forum', cursive" },
  { label: "Fruktur",                     value: "'Fruktur', cursive",                     previewWeight: 700 },
  { label: "Fugaz One",                   value: "'Fugaz One', cursive" },
  { label: "Gelasio",                     value: "'Gelasio', serif" },
  { label: "Gilda Display",               value: "'Gilda Display', serif" },
  { label: "Gochi Hand",                  value: "'Gochi Hand', cursive" },
  { label: "Godia SemiCondensed",         value: "'Godia SemiCondensed', sans-serif" },
  { label: "Grand Hotel",                 value: "'Grand Hotel', cursive" },
  { label: "Grandstander",                value: "'Grandstander', cursive",                previewWeight: 700 },
  { label: "Great Vibes",                 value: "'Great Vibes', cursive" },
  { label: "Griffy",                      value: "'Griffy', cursive" },
  { label: "Gruppo",                      value: "'Gruppo', cursive" },
  { label: "Gwendolyn",                   value: "'Gwendolyn', cursive" },
  { label: "Henny Penny",                 value: "'Henny Penny', cursive" },
  { label: "Ingrid Darling",              value: "'Ingrid Darling', cursive" },
  { label: "Irish Grover",                value: "'Irish Grover', cursive",                previewWeight: 700 },
  { label: "Italiana",                    value: "'Italiana', serif" },
  { label: "Josefin Sans",                value: "'Josefin Sans', sans-serif" },
  { label: "Jost",                        value: "'Jost', sans-serif" },
  { label: "Joti One",                    value: "'Joti One', cursive" },
  { label: "Kalam",                       value: "'Kalam', cursive" },
  { label: "Lato",                        value: "'Lato', sans-serif" },
  { label: "Lobster",                     value: "'Lobster', cursive",                     previewWeight: 700 },
  { label: "Lobster Two",                 value: "'Lobster Two', cursive",                 previewWeight: 700 },
  { label: "Mallanna",                    value: "'Mallanna', sans-serif" },
  { label: "Mea Culpa",                   value: "'Mea Culpa', cursive" },
  { label: "MonteCarlo",                  value: "'MonteCarlo', cursive" },
  { label: "Montez",                      value: "'Montez', cursive" },
  { label: "Montserrat",                  value: "'Montserrat', sans-serif",               previewWeight: 700 },
  { label: "Moon Dance",                  value: "'Moondance', cursive" },
  { label: "Mr Dafoe",                    value: "'Mr Dafoe', cursive",                    previewWeight: 700 },
  { label: "Mystery Quest",               value: "'Mystery Quest', cursive" },
  { label: "Nunito Sans",                 value: "'Nunito Sans', sans-serif" },
  { label: "Oleo Script Swash Caps",      value: "'Oleo Script Swash Caps', cursive",      previewWeight: 700 },
  { label: "Open Sans",                   value: "'Open Sans', sans-serif" },
  { label: "Pacifico",                    value: "'Pacifico', cursive",                    previewWeight: 700 },
  { label: "Parisienne",                  value: "'Parisienne', cursive" },
  { label: "Petit Formal Script",         value: "'Petit Formal Script', cursive" },
  { label: "Pinyon Script",               value: "'Pinyon Script', cursive" },
  { label: "Pirata One",                  value: "'Pirata One', cursive" },
  { label: "Playfair Display Black",      value: "'Playfair Display', serif",              previewWeight: 900 },
  { label: "Poiret One",                  value: "'Poiret One', cursive" },
  { label: "QT Bookmann",                 value: "'QT Bookmann', serif" },
  { label: "QT BrushStroke",              value: "'QT BrushStroke', cursive" },
  { label: "QT Caslan",                   value: "'QT Caslan', serif" },
  { label: "QT CaslanOpen",               value: "'QT CaslanOpen', serif" },
  { label: "QT Casual",                   value: "'QT Casual', sans-serif",                previewWeight: 700 },
  { label: "QT Graveure",                 value: "'QT Graveure', sans-serif" },
  { label: "QT Impromptu",                value: "'QT Impromptu', sans-serif",             previewWeight: 700 },
  { label: "QT Jupiter",                  value: "'QT Jupiter', serif",                    previewWeight: 700 },
  { label: "QT Linoscroll",               value: "'QT Linoscroll', fantasy" },
  { label: "QT Linostroke",               value: "'QT Linostroke', fantasy" },
  { label: "QT Military",                 value: "'QT Military', sans-serif",              previewWeight: 700 },
  { label: "QT OKCorral",                 value: "'QT OKCorral', cursive",                 previewWeight: 700 },
  { label: "QT OldGoudy",                 value: "'QT OldGoudy', serif" },
  { label: "QT VagaRound",                value: "'QT VagaRound', sans-serif" },
  { label: "Quattrocento",                value: "'Quattrocento', serif" },
  { label: "Quicksand",                   value: "'Quicksand', sans-serif" },
  { label: "Risque",                      value: "'Risque', cursive" },
  { label: "Roboto Slab",                 value: "'Roboto Slab', serif" },
  { label: "Sacramento",                  value: "'Sacramento', cursive" },
  { label: "Sail",                        value: "'Sail', cursive" },
  { label: "Sarabun",                     value: "'Sarabun', sans-serif" },
  { label: "Satisfy",                     value: "'Satisfy', cursive" },
  { label: "Science Gothic",              value: "'Science Gothic', sans-serif",           previewWeight: 700 },
  { label: "Secuela",                     value: "'Secuela', sans-serif" },
  { label: "Shalimar",                    value: "'Shalimar', cursive" },
  { label: "Shrikhand",                   value: "'Shrikhand', cursive",                   previewWeight: 700 },
  { label: "Slabo 27Px",                  value: "'Slabo 27px', serif" },
  { label: "Smooch",                      value: "'Smooch', cursive" },
  { label: "Sofia",                       value: "'Sofia', cursive" },
  { label: "Stalemate",                   value: "'Stalemate', cursive" },
  { label: "Stint Ultra Expanded",        value: "'Stint Ultra Expanded', serif" },
  { label: "Style Script",                value: "'Style Script', cursive" },
  { label: "Sunshiney",                   value: "'Sunshiney', cursive" },
  { label: "Teko",                        value: "'Teko', sans-serif" },
  { label: "TeXGyre Heros",               value: "'TeX Gyre Heros', sans-serif" },
  { label: "TeXGyre Termes",              value: "'TeX Gyre Termes', serif" },
  { label: "Trade Winds",                 value: "'Trade Winds', cursive" },
  { label: "Troubleside",                 value: "'Troubleside', sans-serif",              previewWeight: 700 },
  { label: "Truculenta",                  value: "'Truculenta', sans-serif" },
  { label: "Twinkle Star",                value: "'Twinkle Star', cursive" },
  { label: "WindSong",                    value: "'WindSong', cursive" },
  { label: "Yesteryear",                  value: "'Yesteryear', cursive" },
  { label: "YoungSerif",                  value: "'Young Serif', serif",                   previewWeight: 700 },
  { label: "Zilla Slab",                  value: "'Zilla Slab', serif" },
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
  { label: "Beige Tartan", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f0e0c0"/><rect x="0" y="0" width="14" height="80" fill="#7a3015" opacity="0.75"/><rect x="40" y="0" width="14" height="80" fill="#7a3015" opacity="0.75"/><rect x="26" y="0" width="2.5" height="80" fill="#c04020" opacity="0.6"/><rect x="66" y="0" width="2.5" height="80" fill="#c04020" opacity="0.6"/><rect x="0" y="0" width="80" height="14" fill="#7a3015" opacity="0.5"/><rect x="0" y="40" width="80" height="14" fill="#7a3015" opacity="0.5"/><rect x="0" y="26" width="80" height="2.5" fill="#c04020" opacity="0.4"/><rect x="0" y="66" width="80" height="2.5" fill="#c04020" opacity="0.4"/></svg>` },
  { label: "Blue Tartan",  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#5aabdc"/><rect x="0" y="0" width="16" height="80" fill="#0a2a5a" opacity="0.85"/><rect x="36" y="0" width="16" height="80" fill="#0a2a5a" opacity="0.85"/><rect x="22" y="0" width="2" height="80" fill="#ffffff" opacity="0.7"/><rect x="62" y="0" width="2" height="80" fill="#ffffff" opacity="0.7"/><rect x="0" y="0" width="80" height="16" fill="#0a2a5a" opacity="0.65"/><rect x="0" y="36" width="80" height="16" fill="#0a2a5a" opacity="0.65"/><rect x="0" y="22" width="80" height="2" fill="#ffffff" opacity="0.7"/><rect x="0" y="62" width="80" height="2" fill="#ffffff" opacity="0.7"/></svg>` },
  { label: "Floral Damask", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f5e5c0"/><ellipse cx="20" cy="12" rx="6" ry="9" fill="#b04020"/><ellipse cx="20" cy="28" rx="6" ry="9" fill="#b04020"/><ellipse cx="12" cy="20" rx="9" ry="6" fill="#b04020"/><ellipse cx="28" cy="20" rx="9" ry="6" fill="#b04020"/><circle cx="20" cy="20" r="5" fill="#f5e5c0"/><circle cx="20" cy="20" r="3" fill="#8a5020"/><ellipse cx="60" cy="12" rx="6" ry="9" fill="#b04020"/><ellipse cx="60" cy="28" rx="6" ry="9" fill="#b04020"/><ellipse cx="52" cy="20" rx="9" ry="6" fill="#b04020"/><ellipse cx="68" cy="20" rx="9" ry="6" fill="#b04020"/><circle cx="60" cy="20" r="5" fill="#f5e5c0"/><circle cx="60" cy="20" r="3" fill="#8a5020"/><ellipse cx="20" cy="52" rx="6" ry="9" fill="#b04020"/><ellipse cx="20" cy="68" rx="6" ry="9" fill="#b04020"/><ellipse cx="12" cy="60" rx="9" ry="6" fill="#b04020"/><ellipse cx="28" cy="60" rx="9" ry="6" fill="#b04020"/><circle cx="20" cy="60" r="5" fill="#f5e5c0"/><circle cx="20" cy="60" r="3" fill="#8a5020"/><ellipse cx="60" cy="52" rx="6" ry="9" fill="#b04020"/><ellipse cx="60" cy="68" rx="6" ry="9" fill="#b04020"/><ellipse cx="52" cy="60" rx="9" ry="6" fill="#b04020"/><ellipse cx="68" cy="60" rx="9" ry="6" fill="#b04020"/><circle cx="60" cy="60" r="5" fill="#f5e5c0"/><circle cx="60" cy="60" r="3" fill="#8a5020"/><circle cx="2" cy="2" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="38" cy="2" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="2" cy="38" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="42" cy="2" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="78" cy="2" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="2" cy="42" r="2.5" fill="#b04020" opacity="0.7"/><circle cx="40" cy="40" r="3" fill="#b04020" opacity="0.4"/></svg>` },
  { label: "Black Lace",   svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#080808"/><circle cx="20" cy="20" r="12" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="20" r="7" fill="none" stroke="#fff" stroke-width="1"/><line x1="20" y1="8" x2="20" y2="32" stroke="#fff" stroke-width="1"/><line x1="8" y1="20" x2="32" y2="20" stroke="#fff" stroke-width="1"/><line x1="11.5" y1="11.5" x2="28.5" y2="28.5" stroke="#fff" stroke-width="1"/><line x1="28.5" y1="11.5" x2="11.5" y2="28.5" stroke="#fff" stroke-width="1"/><circle cx="60" cy="20" r="12" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="60" cy="20" r="7" fill="none" stroke="#fff" stroke-width="1"/><line x1="60" y1="8" x2="60" y2="32" stroke="#fff" stroke-width="1"/><line x1="48" y1="20" x2="72" y2="20" stroke="#fff" stroke-width="1"/><line x1="51.5" y1="11.5" x2="68.5" y2="28.5" stroke="#fff" stroke-width="1"/><line x1="68.5" y1="11.5" x2="51.5" y2="28.5" stroke="#fff" stroke-width="1"/><circle cx="20" cy="60" r="12" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="60" r="7" fill="none" stroke="#fff" stroke-width="1"/><line x1="20" y1="48" x2="20" y2="72" stroke="#fff" stroke-width="1"/><line x1="8" y1="60" x2="32" y2="60" stroke="#fff" stroke-width="1"/><line x1="11.5" y1="51.5" x2="28.5" y2="68.5" stroke="#fff" stroke-width="1"/><line x1="28.5" y1="51.5" x2="11.5" y2="68.5" stroke="#fff" stroke-width="1"/><circle cx="60" cy="60" r="12" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="60" cy="60" r="7" fill="none" stroke="#fff" stroke-width="1"/><line x1="60" y1="48" x2="60" y2="72" stroke="#fff" stroke-width="1"/><line x1="48" y1="60" x2="72" y2="60" stroke="#fff" stroke-width="1"/><line x1="51.5" y1="51.5" x2="68.5" y2="68.5" stroke="#fff" stroke-width="1"/><line x1="68.5" y1="51.5" x2="51.5" y2="68.5" stroke="#fff" stroke-width="1"/><circle cx="40" cy="40" r="12" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5"/><circle cx="40" cy="40" r="7" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/></svg>` },
];

// ─── Text combos ─────────────────────────────────────────────────────────────
const TEXT_COMBOS = [
  { label: "Dark Badge",  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="8" fill="#111827"/><text x="100" y="40" textAnchor="middle" fill="#f59e0b" fontFamily="Georgia,serif" fontSize="13" fontWeight="bold">BRAND NAME</text><text x="100" y="62" textAnchor="middle" fill="#9ca3af" fontFamily="Arial" fontSize="9">SEALED WITH LOVE AND PATIENCE</text><text x="100" y="75" textAnchor="middle" fill="#9ca3af" fontFamily="Arial" fontSize="9">KEEPING GOOD INSIDE</text><text x="100" y="100" textAnchor="middle" fill="#f9fafb" fontFamily="Impact,fantasy" fontSize="22" fontWeight="bold">WINE</text></svg>`, w: 160, h: 96 },
  { label: "White Badge", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="8" fill="white" stroke="#111" strokeWidth="3"/><text x="100" y="35" textAnchor="middle" fill="#374151" fontFamily="Georgia,serif" fontSize="12" fontWeight="bold">BRAND NAME</text><text x="100" y="55" textAnchor="middle" fill="#6b7280" fontFamily="Arial" fontSize="9">SEALED WITH LOVE AND PATIENCE</text><text x="100" y="70" textAnchor="middle" fill="#6b7280" fontFamily="Arial" fontSize="9">KEEPING GOOD INSIDE</text><text x="100" y="100" textAnchor="middle" fill="#111827" fontFamily="Impact" fontSize="22" fontWeight="bold">BRAND</text></svg>`, w: 160, h: 96 },
  { label: "Round Badge", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#4338ca" stroke="#6366f1" strokeWidth="3"/><text x="60" y="45" textAnchor="middle" fill="#fde68a" fontFamily="Arial" fontSize="11" fontWeight="bold">YOUR BRAND</text><text x="60" y="62" textAnchor="middle" fill="white" fontFamily="Georgia" fontSize="14" fontWeight="bold">HERE</text><text x="60" y="80" textAnchor="middle" fill="#c7d2fe" fontFamily="Arial" fontSize="8">EST. 2024</text></svg>`, w: 80, h: 80 },
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const handleToggle = () => {
    if (!open && btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left }); }
    setOpen(o => !o);
  };
  useEffect(() => {
    if (!open) return;
    setTimeout(() => selectedRef.current?.scrollIntoView({ block: "center" }), 0);
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);
  const selected = FONT_OPTIONS.find(f => f.value === value) ?? FONT_OPTIONS[0];
  return (
    <>
      <button ref={btnRef} onClick={handleToggle} style={{ padding: "0.3rem 0.5rem 0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "0.9rem", fontFamily: selected.value, fontWeight: selected.previewWeight ?? "normal", maxWidth: "170px", minWidth: "110px", flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontFamily: selected.value, fontWeight: selected.previewWeight ?? "normal" }}>{selected.label}</span>
        <span style={{ fontSize: "0.55rem", color: "#9ca3af", flexShrink: 0, fontFamily: "sans-serif", fontWeight: "normal" }}>▼</span>
      </button>
      {open && (
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, background: "#fff", borderRadius: "14px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", width: "270px", maxHeight: "380px", overflowY: "auto", padding: "6px 0" }}>
          {FONT_OPTIONS.map(f => {
            const isSel = f.value === value;
            return (
              <div key={f.value} ref={isSel ? selectedRef : undefined} onMouseDown={e => e.preventDefault()} onClick={() => { onChange(f.value); setOpen(false); }} style={{ padding: "7px 16px", margin: isSel ? "1px 8px" : "0", cursor: "pointer", fontSize: "1.05rem", lineHeight: 1.4, fontFamily: f.value, fontWeight: f.previewWeight ?? "normal", background: isSel ? "#f3f4f6" : "transparent", borderRadius: isSel ? "8px" : "0", userSelect: "none" }}>{f.label}</div>
            );
          })}
        </div>
      )}
    </>
  );
}

function uid() { return Math.random().toString(36).slice(2, 9); }
function svgUrl(svg: string) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }

function defaultViewData(): ViewData {
  const fc: Record<string, string> = {};
  FACES_OUTSIDE.forEach(f => { fc[f.id] = "#ffffff"; });
  return { faceColors: fc, items: {}, globalItems: [] };
}
function defaultState(): EditorState {
  return { outside: defaultViewData(), inside: defaultViewData(), insideColor: "#d4b896" };
}

// Faces that fold 90° vertical in step 1 (0 → 14.28%)
const FOLD_TOP_IDS = new Set([
  "lid-left", "lid", "lid-right",
  "top-side-flap-left", "dust-flap-top", "top-side-flap-right",
]);
const FOLD_BOT_IDS = new Set<string>([]);
const FOLD_ALL_IDS = new Set([...FOLD_TOP_IDS, ...FOLD_BOT_IDS]);

// ─── Clip path helper (shared by dieline + 3D preview) ───────────────────────
function getFaceClipPath(face: FaceDef, s: number, mirror = false): string | undefined {
  const bl = mirror ? face.clipBottomRight : face.clipBottomLeft;
  const br = mirror ? face.clipBottomLeft  : face.clipBottomRight;
  const tr = mirror ? face.clipTopLeft     : face.clipTopRight;
  const tl = mirror ? face.clipTopRight    : face.clipTopLeft;
  if (!bl && !br && !tr && !tl) return undefined;
  const W = face.w * s, H = face.h * s;
  const cs = 8 * s;
  const endY = H - Math.min(15 * s, H * 0.2);
  const startY = Math.min(15 * s, H * 0.2);
  if (bl && tr) return `path('M 0 ${startY + cs} Q 0 ${startY} ${cs} ${startY - cs} L ${W + 2} -2 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`;
  if (br && tl) return `path('M ${W + 2} ${startY + cs} Q ${W + 2} ${startY} ${W - cs} ${startY - cs} L -2 -2 L -2 ${H - cs} Q -2 ${H + 2} ${cs} ${H + 2} L ${W - cs} ${endY + cs} Q ${W + 2} ${endY} ${W + 2} ${endY - cs} Z')`;
  if (bl)  return `path('M 0 0 L ${W + 2} 0 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`;
  if (br)  return `path('M 0 0 L ${W} 0 L ${W} ${H} L ${W - cs} ${H} Q 0 ${H} 0 ${H - cs} L 0 ${endY - cs} Q 0 ${endY} ${cs} ${endY + cs} Z')`;
  if (tr)  return `path('M -2 ${H + 2} L ${W + 2} ${H + 2} L ${W + 2} ${cs} Q ${W + 2} -2 ${W - cs} -2 L ${cs} ${startY + cs} Q 0 ${startY} 0 ${startY - cs} Z')`;
  if (tl)  return `path('M 0 0 L ${W - cs} 0 Q ${W} 0 ${W} ${cs} L ${W} ${H} L 0 ${H} Z')`;
  return undefined;
}

// ─── Face canvas renderer for order preview ───────────────────────────────────
async function renderFaceToCanvas(color: string, items: CanvasItem[], wMM: number, hMM: number): Promise<string> {
  const sc = 1.8;
  const W = Math.round(wMM * sc); const H = Math.round(hMM * sc);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const urlMatch = color.match(/^url\(["']?(.+?)["']?\)$/);
  if (urlMatch) {
    await new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => {
        try { const pat = ctx.createPattern(img, "repeat"); ctx.fillStyle = pat ?? "#c8a97e"; } catch { ctx.fillStyle = "#c8a97e"; }
        ctx.fillRect(0, 0, W, H); res();
      };
      img.onerror = () => { ctx.fillStyle = "#c8a97e"; ctx.fillRect(0, 0, W, H); res(); };
      img.src = urlMatch[1];
    });
  } else {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  }
  for (const item of items) {
    if (item.kind === "image") {
      await new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => { try { ctx.drawImage(img, item.x*sc, item.y*sc, item.w*sc, item.h*sc); } catch {} res(); };
        img.onerror = () => res(); img.src = item.src;
      });
    } else if (item.kind === "text") {
      ctx.save();
      ctx.font = `${item.bold?"bold ":""}${item.size*sc}px ${item.font.split(",")[0].trim()}`;
      ctx.fillStyle = item.color; ctx.textAlign = item.align as CanvasTextAlign;
      const tx = item.align==="center"?(item.x+item.w/2)*sc:item.align==="right"?(item.x+item.w)*sc:item.x*sc;
      ctx.fillText(item.text, tx, (item.y+item.size)*sc); ctx.restore();
    }
  }
  return c.toDataURL("image/jpeg", 0.88);
}

// ─── Project global items to faces ───────────────────────────────────────────
function projectGlobalItemsToFaces(globalItems: CanvasItem[], faces: FaceDef[]): Record<string, CanvasItem[]> {
  const result: Record<string, CanvasItem[]> = {};
  for (const item of globalItems) {
    const ih = item.kind === "image" ? item.h : (item as TextItem).size;
    const overlapping = faces.filter(f =>
      item.x < f.x + f.w && item.x + item.w > f.x &&
      item.y < f.y + f.h && item.y + ih > f.y
    );
    const targets = overlapping.length > 0 ? overlapping : (() => {
      if (faces.length === 0) return [];
      const cx = item.x + item.w / 2, cy = item.y + ih / 2;
      return [faces.reduce((best, f) => {
        const d = Math.hypot(cx - (f.x + f.w / 2), cy - (f.y + f.h / 2));
        const bd = Math.hypot(cx - (best.x + best.w / 2), cy - (best.y + best.h / 2));
        return d < bd ? f : best;
      })];
    })();
    for (const face of targets) {
      result[face.id] = [...(result[face.id] ?? []), { ...item, x: item.x - face.x, y: item.y - face.y }];
    }
  }
  return result;
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

function Box3DPreview({ faceColors, insideFaceColors, insideColor, outsideItems, insideItems, outsideGlobalItems, insideGlobalItems, openAmount, rotX, rotY, geo }: {
  faceColors: Record<string, string>; insideFaceColors: Record<string, string>; insideColor: string;
  outsideItems: Record<string, CanvasItem[]>; insideItems: Record<string, CanvasItem[]>;
  outsideGlobalItems?: CanvasItem[]; insideGlobalItems?: CanvasItem[];
  openAmount: number; rotX: number; rotY: number;
  geo?: ReturnType<typeof buildGeometry>;
}) {
  const g = geo ?? DEFAULT_GEOMETRY;
  const { NX1, NX2, NX3, PAD, BW, BH, BD, NY_BASE, NY_DUST, NY_LID, DIELINE_H_FULL, FACES_OUTSIDE } = g;
  const ps = 0.56;
  const cW = (NX3 + PAD) * ps;
  const cH = DIELINE_H_FULL * ps;

  const t = openAmount / 100;
  // aT starts only after all fold steps end (57.12%), so faces stay opaque during folds
  const FOLD_END = 5 / 6;
  const aT = 0;
  const sp = 1 - aT;
  const lT = Math.max(0, Math.min((t - 0.35) / 0.65, 1));
  const lidAngle = -110 * aT * (1 - lT);
  const step1T    = Math.min(t * 6, 1);
  const foldAngle  = 90 * step1T;
  const step2T    = Math.min(Math.max(0, (t - 1 / 6) * 6), 1);
  const foldAngle2 = 90 * step2T;
  const step3T    = Math.min(Math.max(0, (t - 2 / 6) * 6), 1);
  const foldAngle3 = 90 * step3T;
  const step5T    = Math.min(Math.max(0, (t - 4 / 6) * 6), 1);
  const foldAngle5 = 90 * step5T;
  const step7T    = Math.min(Math.max(0, (t - 5 / 6) * 6), 1);
  const foldAngle7 = 90 * step7T;

  const bw = BW * ps, bh = BH * ps, bd = BD * ps;
  const bx = NX1 * ps;
  const by = NY_BASE * ps;

  const fc = faceColors;
  const ff: React.CSSProperties = { position: "absolute", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden" };
  const pMirrorMin = FACES_OUTSIDE.reduce((m, f) => Math.min(m, f.x), Infinity);
  const pMirrorMax = FACES_OUTSIDE.reduce((m, f) => Math.max(m, f.x + f.w), -Infinity);
  const pMirrorTotal = pMirrorMin + pMirrorMax;
  const pInFaces = FACES_OUTSIDE.map(f => ({ ...f, x: pMirrorTotal - f.x - f.w }));
  const outProjected = outsideGlobalItems && outsideGlobalItems.length > 0 ? projectGlobalItemsToFaces(outsideGlobalItems, FACES_OUTSIDE) : {};
  const inProjected = insideGlobalItems && insideGlobalItems.length > 0 ? projectGlobalItemsToFaces(insideGlobalItems, pInFaces) : {};
  const mOut = (id: string) => [...(outsideItems[id] ?? []), ...(outProjected[id] ?? [])];
  const mIn  = (id: string) => [...(insideItems[id] ?? []),  ...(inProjected[id] ?? [])];

  return (
    <div style={{ width: "100%", height: 620, display: "flex", alignItems: "center", justifyContent: "center", perspective: 700, perspectiveOrigin: "50% 30%", overflow: "hidden" }}>
      <div style={{ position: "relative", width: cW, height: cH, transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>

        {/* ── Flat dieline: double-sided — outside on front, inside on back ── */}
        {FACES_OUTSIDE.filter(f => !FOLD_ALL_IDS.has(f.id) && f.id !== "side-left" && f.id !== "side-right").map(face => (
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
              {mOut(face.id).map(item => renderPreviewItem(item, ps))}
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
              {mIn(face.id).map(item => renderPreviewItem(item, ps))}
            </div>
          </Fragment>
        ))}

        {/* ── Top fold group: 9 faces, pivot at NY_BASE ── */}
        <div style={{ position: "absolute", left: 0, top: NY_BASE * ps, width: cW, height: 1, opacity: sp, transformStyle: "preserve-3d", transformOrigin: "top center", transform: `rotateX(${foldAngle}deg)` }}>
          {FACES_OUTSIDE.filter(f => FOLD_TOP_IDS.has(f.id) && !((f.id === "top-side-flap-right" || f.id === "top-side-flap-left") && step5T > 0) && !(f.id === "dust-flap-top" && step7T > 0)).map(face => {
            const isSF = face.id === "lid-left" || face.id === "lid-right";
            const isL  = face.id === "lid-left";
            const fL   = isSF ? (isL ? -face.w * ps : 0) : face.x * ps;
            const fT   = isSF ? 0 : (face.y - NY_BASE) * ps;
            const fOut = <div key="o" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `${50*ps}px 0 0 ${15*ps}px` : face.roundTR ? `0 ${50*ps}px ${15*ps}px 0` : undefined, clipPath: getFaceClipPath(face, ps) }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {mOut(face.id).map(item => renderPreviewItem(item, ps))}
            </div>;
            const fIn = <div key="i" style={{ position: "absolute", left: fL, top: fT, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `0 ${50*ps}px ${15*ps}px 0` : face.roundTR ? `${50*ps}px 0 0 ${15*ps}px` : undefined, clipPath: getFaceClipPath(face, ps, true) }}>
              {face.small ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span> : <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>}
              {mIn(face.id).map(item => renderPreviewItem(item, ps))}
            </div>;
            if (isSF) return (
              <div key={face.id + "-ft"} style={{ position: "absolute", left: isL ? (face.x + face.w) * ps : face.x * ps, top: (face.y - NY_BASE) * ps, width: 0, height: face.h * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${isL ? -foldAngle2 : foldAngle2}deg)` }}>
                {fOut}{fIn}
              </div>
            );
            return <Fragment key={face.id + "-ft"}>{fOut}{fIn}</Fragment>;
          })}
        </div>


        {/* ── Step 5: right + left top flaps fold inward ── */}
        {step5T > 0 && (() => {
          const s5R = (step7T === 0 ? ["top-side-flap-right"] : []).map(id => FACES_OUTSIDE.find(f => f.id === id)!);
          const s5L = (step7T === 0 ? ["top-side-flap-left"] : []).map(id => FACES_OUTSIDE.find(f => f.id === id)!);
          const renderS5Face = (face: typeof FACES_OUTSIDE[0], pivotX: number, angle: number) => (
            <div key={face.id + "-s5"} style={{ position: "absolute", left: pivotX * ps, top: (face.y - NY_BASE) * ps, width: 0, height: face.h * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${angle}deg)` }}>
              <div style={{ position: "absolute", left: (face.x - pivotX) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `${50*ps}px 0 0 ${15*ps}px` : face.roundTR ? `0 ${50*ps}px ${15*ps}px 0` : undefined, clipPath: getFaceClipPath(face, ps) }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                {mOut(face.id).map(item => renderPreviewItem(item, ps))}
              </div>
              <div style={{ position: "absolute", left: (face.x - pivotX) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden", borderRadius: face.roundTL ? `0 ${50*ps}px ${15*ps}px 0` : face.roundTR ? `${50*ps}px 0 0 ${15*ps}px` : undefined, clipPath: getFaceClipPath(face, ps, true) }}>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5px", fontWeight: 700, color: "rgba(0,0,0,0.45)", pointerEvents: "none", textTransform: "uppercase", userSelect: "none", textAlign: "center", lineHeight: 1.2 }}>{face.label}</span>
                {mIn(face.id).map(item => renderPreviewItem(item, ps))}
              </div>
            </div>
          );
          return (
            <div style={{ position: "absolute", left: 0, top: NY_BASE * ps, width: cW, height: 1, transformStyle: "preserve-3d", transformOrigin: "top center", transform: `rotateX(${foldAngle}deg)`, pointerEvents: "none" }}>
              {s5R.map(face => renderS5Face(face, NX2, foldAngle5))}
              {s5L.map(face => renderS5Face(face, NX1, -foldAngle5))}
            </div>
          );
        })()}

        {/* ── Step 7: full dust-flap group folds down around NY_LID ── */}
        {step7T > 0 && (() => {
          const renderFace = (face: typeof FACES_OUTSIDE[0], lft: number, tp: number, extraTransform = "") => (<>
            <div key={face.id+"-7o"} style={{ position:"absolute", left:lft, top:tp, width:face.w*ps, height:face.h*ps, background:fc[face.id]||"#c8a97e", border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:`translateZ(0.5px) ${extraTransform}`.trim(), borderRadius:face.roundTL?`${50*ps}px 0 0 ${15*ps}px`:face.roundTR?`0 ${50*ps}px ${15*ps}px 0`:undefined, clipPath:getFaceClipPath(face,ps) }}>
              <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{face.label}</span>
              {mOut(face.id).map(item=>renderPreviewItem(item,ps))}
            </div>
            <div key={face.id+"-7i"} style={{ position:"absolute", left:lft, top:tp, width:face.w*ps, height:face.h*ps, background:insideFaceColors[face.id]||insideColor, border:"1px solid rgba(0,0,0,0.18)", boxSizing:"border-box", overflow:"hidden", backfaceVisibility:"hidden", transform:`rotateY(180deg) translateZ(0.5px) ${extraTransform}`.trim(), borderRadius:face.roundTL?`0 ${50*ps}px ${15*ps}px 0`:face.roundTR?`${50*ps}px 0 0 ${15*ps}px`:undefined, clipPath:getFaceClipPath(face,ps,true) }}>
              <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5px",fontWeight:700,color:"rgba(0,0,0,0.45)",pointerEvents:"none",textTransform:"uppercase",userSelect:"none",textAlign:"center",lineHeight:1.2}}>{face.label}</span>
              {mIn(face.id).map(item=>renderPreviewItem(item,ps))}
            </div>
          </>);
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

        {/* ── Step 3: Right side assembly (side-right) rotate right ── */}
        {(() => {
          const faces3R = ["side-right"].map(id => FACES_OUTSIDE.find(f => f.id === id)).filter(Boolean) as typeof FACES_OUTSIDE;
          return (
            <div style={{ position: "absolute", left: NX2 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${foldAngle3}deg)`, opacity: sp }}>
              {faces3R.map(face => (
                <Fragment key={face.id + "-s3"}>
                  <div style={{ position: "absolute", left: (face.x - NX2) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {mOut(face.id).map(item => renderPreviewItem(item, ps))}
                  </div>
                  <div style={{ position: "absolute", left: (face.x - NX2) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {mIn(face.id).map(item => renderPreviewItem(item, ps))}
                  </div>
                </Fragment>
              ))}
            </div>
          );
        })()}

        {/* ── Step 3: Left side assembly (side-left) rotate left ── */}
        {(() => {
          const faces3L = ["side-left"].map(id => FACES_OUTSIDE.find(f => f.id === id)).filter(Boolean) as typeof FACES_OUTSIDE;
          return (
            <div style={{ position: "absolute", left: NX1 * ps, top: NY_BASE * ps, width: 0, height: BH * ps, transformStyle: "preserve-3d", transformOrigin: "0 0", transform: `rotateY(${-foldAngle3}deg)`, opacity: sp }}>
              {faces3L.map(face => (
                <Fragment key={face.id + "-s3"}>
                  <div style={{ position: "absolute", left: (face.x - NX1) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: fc[face.id] || "#c8a97e", border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", transform: "translateZ(0.5px)" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {mOut(face.id).map(item => renderPreviewItem(item, ps))}
                  </div>
                  <div style={{ position: "absolute", left: (face.x - NX1) * ps, top: 0, width: face.w * ps, height: face.h * ps, background: insideFaceColors[face.id] || insideColor, border: "1px solid rgba(0,0,0,0.18)", boxSizing: "border-box", overflow: "hidden", transform: "rotateY(180deg) translateZ(0.5px)", backfaceVisibility: "hidden" }}>
                    <span style={{ position: "absolute", top: 3, left: 4, fontSize: "6px", fontWeight: 700, color: "rgba(0,0,0,0.4)", pointerEvents: "none", textTransform: "uppercase", letterSpacing: "0.04em", userSelect: "none" }}>{face.label}</span>
                    {mIn(face.id).map(item => renderPreviewItem(item, ps))}
                  </div>
                </Fragment>
              ))}
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
          background: fc["bot-inner-base-flap"] || "#a07040",
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
function DielineFace({ face, color, selected, hovered, onSelect, onHover, onLeave, items, zoom, lockFlapSize, topLockR, topLockW, silhouetteOnly }: {
  face: FaceDef; color: string; selected: boolean; hovered: boolean;
  onSelect: () => void; onHover: () => void; onLeave: () => void;
  items: CanvasItem[]; zoom: number;
  lockFlapSize: number; topLockR: number; topLockW: number;
  silhouetteOnly?: boolean;
}) {
  const lineX1 = face.w * 0.47;
  const lineX2 = face.w * 0.53;
  const W = face.w * zoom, H = face.h * zoom;
  const cs = 8 * zoom, endY = H - Math.min(15 * zoom, H * 0.2);
  const startY = Math.min(15 * zoom, H * 0.2);
  const clipBL = face.clipBottomLeft  ? `path('M 0 0 L ${W + 2} 0 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')` : undefined;
  const clipBR = face.clipBottomRight ? `path('M 0 0 L ${W} 0 L ${W} ${H} L ${W - cs} ${H} Q 0 ${H} 0 ${H - cs} L 0 ${endY - cs} Q 0 ${endY} ${cs} ${endY + cs} Z')` : undefined;
  const clipTR = face.clipTopRight    ? `path('M -2 ${H + 2} L ${W + 2} ${H + 2} L ${W + 2} ${cs} Q ${W + 2} -2 ${W - cs} -2 L ${cs} ${startY + cs} Q 0 ${startY} 0 ${startY - cs} Z')` : undefined;
  const clipTL = face.clipTopLeft     ? `path('M 0 0 L ${W - cs} 0 Q ${W} 0 ${W} ${cs} L ${W} ${H} L 0 ${H} Z')` : undefined;
  const chs = lockFlapSize * zoom;
  const bchs = (face.chamferW ?? lockFlapSize) * zoom;
  const chamferTRPath = face.chamferTR ? `path('M 0 0 L ${W - chs} 0 L ${W} ${chs} L ${W} ${H} L 0 ${H} Z')` : undefined;
  const chamferTLPath = face.chamferTL ? `path('M ${chs} 0 L ${W} 0 L ${W} ${H} L 0 ${H} L 0 ${chs} Z')` : undefined;
  const chamferBLPath = face.chamferBL ? `path('M 0 0 L ${W} 0 L ${W} ${H} L ${bchs} ${H} L 0 ${H - bchs} Z')` : undefined;
  const chamferBRPath = face.chamferBR ? `path('M 0 0 L ${W} 0 L ${W} ${H - bchs} L ${W - bchs} ${H} L 0 ${H} Z')` : undefined;
  const roundDiamondTLPath = (() => {
    if (!face.roundDiamondTL) return undefined;
    const cr = 6 * zoom, off = cr / Math.SQRT2;
    return `path('M ${W/2+off} ${off} L ${W} ${H/2} L ${W/2} ${H} L ${off} ${H/2+off} A ${cr} ${cr} 0 0 1 ${off} ${H/2-off} L ${W/2-off} ${off} A ${cr} ${cr} 0 0 1 ${W/2+off} ${off} Z')`;
  })();
  const roundDiamondTRPath = (() => {
    if (!face.roundDiamondTR) return undefined;
    const cr = 6 * zoom, off = cr / Math.SQRT2;
    return `path('M 0 ${H/2} L ${W/2-off} ${off} A ${cr} ${cr} 0 0 1 ${W/2+off} ${off} L ${W-off} ${H/2-off} A ${cr} ${cr} 0 0 1 ${W-off} ${H/2+off} L ${W/2} ${H} Z')`;
  })();
  const diamondPath      = face.diamond      ? `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` : undefined;
  // Diamond clipped to outside of the top-left diagonal cut (screen x+y ≤ 177)
  // ry = y on right edge where cut intersects; bx = x on bottom edge
  const diamondOutsideTLCutPath = face.diamondOutsideTLCut ? (() => {
    const cutLocal = (177 - face.x - face.y) * zoom;
    const ry = cutLocal - W;
    const bx = cutLocal - H;
    if (ry <= 0 || bx <= 0) return `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`;
    return `polygon(${W / 2}px 0px, ${W}px ${ry}px, ${bx}px ${H}px, 0px ${H / 2}px)`;
  })() : undefined;
  const sh = topLockR * zoom;  // diagCutTopSides depth = TOP_LOCK_R (matches diamond side angle)
  const slw = topLockW * zoom; // horizontal cut offset for diagCutTopSides (= flapH, matches diamond edge)
  const tlGapRPath = face.topLockGapFillR ? `polygon(0px 0px, ${W}px 0px, ${W}px ${H}px)` : undefined;
  const tlGapLPath = face.topLockGapFillL ? `polygon(0px 0px, ${W}px 0px, 0px ${H}px)` : undefined;
  const gapLockTuckLPath  = face.gapLockTuckL  ? `polygon(44% 0%, 100% 56%, 56% 100%, 0% 44%)` : undefined;
  const gapLockTuckRPath  = face.gapLockTuckR  ? `polygon(56% 0%, 0% 56%, 44% 100%, 100% 44%)` : undefined;
  // tuck + gap combined: diamond-cut tuck extended to cover gap parallelogram above it
  const tuckWithGapBLPath    = face.tuckWithGapBL    ? `polygon(64% 0%, 100% 50%, 71% 90%, 64% 100%, 43% 100%, 29% 80%, 29% 50%, 36% 40%)` : undefined;
  const tuckWithGapBRPath    = face.tuckWithGapBR    ? `polygon(36% 0%, 0% 50%, 29% 90%, 36% 100%, 57% 100%, 71% 80%, 71% 50%, 64% 40%)` : undefined;
  const leftBottomCornerPath = face.leftBottomCorner ? `polygon(0px 0px, ${W}px 0px, ${W}px ${H - sh}px, ${W - sh}px ${H}px, 0px ${H}px)` : undefined;
  const rightBottomCornerPath= face.rightBottomCorner? `polygon(0px 0px, ${W}px 0px, ${W}px ${H}px, ${sh}px ${H}px, 0px ${H - sh}px)` : undefined;
  const diagCutTRPath    = face.diagCutTopRight  ? `polygon(0px 0px, ${W - sh}px 0px, ${W}px ${sh}px, ${W}px ${H}px, 0px ${H}px)` : undefined;
  const diagCutRSPath    = face.diagCutRightSide ? `polygon(0px 0px, ${W - sh}px 0px, ${W}px ${sh}px, ${W}px ${H - sh}px, ${W - sh}px ${H}px, 0px ${H}px)` : undefined;
  const diagCutBSPath    = face.diagCutBothSides ? `polygon(${sh}px 0px, ${W - sh}px 0px, ${W}px ${sh}px, ${W}px ${H - sh}px, ${W - sh}px ${H}px, ${sh}px ${H}px, 0px ${H - sh}px, 0px ${sh}px)` : undefined;
  const diagCutTSPath    = face.diagCutTopSides  ? `polygon(${slw}px 0px, ${W - slw}px 0px, ${W}px ${sh}px, ${W}px ${H}px, 0px ${H}px, 0px ${sh}px)` : undefined;
  const diamondCutBLPath = face.diamondCutBL ? `polygon(50% 0%, 100% 50%, 90% 60%, 60% 60%, 40% 40%, 40% 10%)` : undefined;
  const diamondCutBRPath = face.diamondCutBR ? `polygon(50% 0%, 0% 50%, 10% 60%, 40% 60%, 60% 40%, 60% 10%)` : undefined;
  const triTRPath     = face.triangleTR   ? `polygon(0% 0%, 100% 0%, 0% 100%)` : undefined;
  const triTLPath     = face.triangleTL   ? `polygon(0% 0%, 100% 0%, 100% 100%)` : undefined;
  const triTopPath    = face.triangleTop  ? `polygon(50% 0%, 100% 100%, 0% 100%)` : undefined;
  // Cuts the corner touching the adjacent bottom-corner diamond along the diamond's own
  // edge (45°, rise = cutW), while the far corner (away from the diamond) keeps full face
  // height — so the wedge hugs the diamond exactly with no overlap and no gap beside it.
  const cw = (face.cutW ?? 0) * zoom;
  const triCutBRPath  = face.triCutBR ? `polygon(0px 0px, ${W}px 0px, ${W - cw}px ${cw}px, ${W - cw}px ${H}px, 0px ${H}px)` : undefined;
  const triCutBLPath  = face.triCutBL ? `polygon(0px 0px, ${W}px 0px, ${W}px ${H}px, ${cw}px ${H}px, ${cw}px ${cw}px)` : undefined;
  // Gusset triangle filling the pocket between a bottom-corner diamond's edge and Front
  // Bottom Flap — excludes the corner touching neither (Left: top-right, Right: top-left).
  const triExTRPath   = face.triExTR ? `polygon(0% 0%, 100% 100%, 0% 100%)` : undefined;
  const triExTLPath   = face.triExTL ? `polygon(100% 0%, 100% 100%, 0% 100%)` : undefined;
  // Single-piece Bottom Lock Flap: diamond top (N-E-S) plus a rectangular gusset tab
  // hugging the diamond's near-side edge, extended straight down to the face's full
  // height (Front Bottom Flap's baseline). One outline, one selectable/colorable face.
  const kiteMidYPct = (face.kiteMidY ?? 0.5) * 100;
  const kiteSMidYPct = 2 * kiteMidYPct;
  const diamondMergedGussetPath = face.diamondMergedGusset
    ? `polygon(50% 0%, 100% ${kiteMidYPct}%, 50% ${kiteSMidYPct}%, 50% 100%, 0% 100%, 0% ${kiteMidYPct}%)` : undefined;
  const diamondMergedGussetMirrorPath = face.diamondMergedGussetMirror
    ? `polygon(50% 0%, 0% ${kiteMidYPct}%, 50% ${kiteSMidYPct}%, 50% 100%, 100% 100%, 100% ${kiteMidYPct}%)` : undefined;
  // Combined gusset (triangle hugging the diamond's edge + rectangular tab below it) as
  // one quadrilateral: full-height on the near side, tapering to a point partway down on
  // the far side (matching the diamond's edge) — same outline as the two-piece version.
  const gussetQuadPath       = face.gussetQuad       ? `polygon(100% 0%, 100% 100%, 0% 100%, 0% ${kiteMidYPct}%)` : undefined;
  const gussetQuadMirrorPath = face.gussetQuadMirror ? `polygon(0% 0%, 0% 100%, 100% 100%, 100% ${kiteMidYPct}%)` : undefined;
  const clipPath = (face.clipBottomLeft && face.clipTopRight)
    ? `path('M 0 ${startY + cs} Q 0 ${startY} ${cs} ${startY - cs} L ${W + 2} -2 L ${W + 2} ${H - cs} Q ${W + 2} ${H + 2} ${W - cs} ${H + 2} L ${cs} ${endY + cs} Q 0 ${endY} 0 ${endY - cs} Z')`
    : (face.clipBottomRight && face.clipTopLeft)
    ? `path('M ${W + 2} ${startY + cs} Q ${W + 2} ${startY} ${W - cs} ${startY - cs} L -2 -2 L -2 ${H - cs} Q -2 ${H + 2} ${cs} ${H + 2} L ${W - cs} ${endY + cs} Q ${W + 2} ${endY} ${W + 2} ${endY - cs} Z')`
    : (face.chamferBL && face.chamferBR)
    ? `path('M 0 0 L ${W} 0 L ${W} ${H - bchs} L ${W - bchs} ${H} L ${bchs} ${H} L 0 ${H - bchs} Z')`
    : triCutBRPath ?? triCutBLPath ?? triExTRPath ?? triExTLPath ?? diamondMergedGussetPath ?? diamondMergedGussetMirrorPath ?? gussetQuadPath ?? gussetQuadMirrorPath ?? triTopPath ?? triTRPath ?? triTLPath ?? tlGapRPath ?? tlGapLPath ?? leftBottomCornerPath ?? rightBottomCornerPath ?? tuckWithGapBLPath ?? tuckWithGapBRPath ?? gapLockTuckLPath ?? gapLockTuckRPath ?? diagCutTSPath ?? diagCutBSPath ?? diagCutRSPath ?? diagCutTRPath ?? diamondCutBLPath ?? diamondCutBRPath ?? diamondOutsideTLCutPath ?? roundDiamondTLPath ?? roundDiamondTRPath ?? diamondPath ?? chamferTRPath ?? chamferTLPath ?? chamferBLPath ?? chamferBRPath ?? clipBL ?? clipBR ?? clipTR ?? clipTL;

  if (silhouetteOnly) {
    return (
      <div
        style={{
          position: "absolute",
          left: face.x * zoom, top: face.y * zoom,
          width: face.w * zoom, height: face.h * zoom,
          background: "#000",
          boxSizing: "border-box", overflow: "hidden",
          clipPath,
          borderRadius: face.roundTL ? `${65 * zoom}px 0 0 ${20 * zoom}px` : face.roundTR ? `0 ${65 * zoom}px ${20 * zoom}px 0` : face.roundTopCorners ? `${6 * zoom}px ${6 * zoom}px 0 0` : face.roundBottomCorners ? `0 0 ${6 * zoom}px ${6 * zoom}px` : undefined,
        }}
      />
    );
  }

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
        ...(face.id === "front-top-flap" && !selected && !hovered ? {
          borderTop: "2.5px solid #1e3a8a",
          borderLeft: "2.5px solid #1e3a8a",
          borderRight: "2.5px solid #1e3a8a",
        } : {}),
        boxSizing: "border-box", cursor: "pointer", overflow: "hidden",
        clipPath,
        borderRadius: face.roundTL ? `${65 * zoom}px 0 0 ${20 * zoom}px` : face.roundTR ? `0 ${65 * zoom}px ${20 * zoom}px 0` : face.roundTopCorners ? `${6 * zoom}px ${6 * zoom}px 0 0` : face.roundBottomCorners ? `0 0 ${6 * zoom}px ${6 * zoom}px` : undefined,
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
      {face.sideLabels && (
        <>
          {[
            { label: "T", style: { top: "6%", left: "50%", transform: "translateX(-50%)" } },
            { label: "B", style: { bottom: "6%", left: "50%", transform: "translateX(-50%)" } },
            { label: "L", style: { top: "50%", left: "6%", transform: "translateY(-50%)" } },
            { label: "R", style: { top: "50%", right: "6%", transform: "translateY(-50%)" } },
          ].map(({ label, style }) => (
            <span key={label} style={{ position: "absolute", fontSize: `${0.55 * zoom}rem`, fontWeight: 800, color: "rgba(0,0,0,0.5)", pointerEvents: "none", userSelect: "none", lineHeight: 1, ...style }}>
              {label}
            </span>
          ))}
        </>
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
type Props = { product: Product; onClose: () => void };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PizzaBoxEditor({ product, onClose }: Props) {
  const [view, setView] = useState<"outside" | "inside">("inside");
  const [selectedFace, setSelectedFace] = useState<FaceId | null>(null);
  const [hoveredFace, setHoveredFace] = useState<FaceId | null>(null);
  const [openAmount, setOpenAmount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [rotX, setRotX] = useState(-20);
  const [rotY, setRotY] = useState(210);
  const [preview3dZoom, setPreview3dZoom] = useState(1.3);
  const [toolMode, setToolMode] = useState<"select" | "pan">("select");

  // ── Finalize / Checkout flow ──────────────────────────────────────────────
  const [finalStepsOpen, setFinalStepsOpen] = useState(false);
  const [selectedQty, setSelectedQty] = useState(0);
  const [designApproved, setDesignApproved] = useState(false);
  const [finalRotX, setFinalRotX] = useState(-20);
  const [finalRotY, setFinalRotY] = useState(210);
  const finalRotRef = useRef({ rx: -20, ry: 210 });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingCartId, setPendingCartId] = useState<string | null>(null);
  const [thumbDataUrl, setThumbDataUrl] = useState<string | undefined>(undefined);
  const [boxFaceImagesState, setBoxFaceImagesState] = useState<{ front?: string; right?: string; top?: string }>({});
  const [boxPreviewOpen, setBoxPreviewOpen] = useState(false);
  const [boxPreviewRotX, setBoxPreviewRotX] = useState(-20);
  const [boxPreviewRotY, setBoxPreviewRotY] = useState(210);
  const boxPreviewRotRef = useRef({ rx: -20, ry: 210 });
  const [showFaceColorPopup, setShowFaceColorPopup] = useState(false);

  const [history, setHistory] = useState<EditorState[]>([defaultState()]);
  const [histIdx, setHistIdx] = useState(0);
  const state = history[histIdx];

  const [activeTab, setActiveTab] = useState<"basics" | "uploads" | "elements" | "package-color">("basics");
  const [boxHeightMM, setBoxHeightMM] = useState<number>(FLAP_H);
  const [heightDraft, setHeightDraft] = useState<string>(String(FLAP_H));
  const [isApplyingHeight, setIsApplyingHeight] = useState(false);
  const [topLockFlapH, setTopLockFlapH] = useState<number>(TOP_LOCK_FIXED_W);
  const [topLockFlapHDraft, setTopLockFlapHDraft] = useState<string>(String(TOP_LOCK_FIXED_W));
  const [boxLengthMM, setBoxLengthMM] = useState<number>(260);
  const [boxWidthMM,  setBoxWidthMM]  = useState<number>(2 * FLAP_H);
  const [lengthDraft, setLengthDraft] = useState<string>("260");
  const [widthDraft,  setWidthDraft]  = useState<string>(String(2 * FLAP_H));

  // ── Choose material dropdown (Basics panel) ──
  const [materialMenuOpen, setMaterialMenuOpen] = useState(false);
  const [activeMaterialCat, setActiveMaterialCat] = useState<number | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(WHITE_PAPERBOARD_OPTIONS[0].id);
  const [customThicknessById, setCustomThicknessById] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const id in CUSTOM_MATERIAL_RANGES) init[id] = CUSTOM_MATERIAL_RANGES[id].min;
    return init;
  });
  const materialMenuRef = useRef<HTMLDivElement>(null);
  const materialBtnRef = useRef<HTMLButtonElement>(null);
  const materialDropRef = useRef<HTMLDivElement>(null);
  const [materialMenuPos, setMaterialMenuPos] = useState({ top: 0, left: 0 });

  const toggleMaterialMenu = useCallback(() => {
    if (!materialMenuOpen && materialBtnRef.current) {
      const r = materialBtnRef.current.getBoundingClientRect();
      setMaterialMenuPos({ top: r.bottom + 4, left: r.left });
    }
    setMaterialMenuOpen(o => !o);
  }, [materialMenuOpen]);

  useEffect(() => {
    if (!materialMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!materialBtnRef.current?.contains(e.target as Node) && !materialDropRef.current?.contains(e.target as Node)) {
        setMaterialMenuOpen(false); setActiveMaterialCat(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [materialMenuOpen]);

  const customRange = CUSTOM_MATERIAL_RANGES[selectedMaterialId];
  const isCustomSelected = !!customRange;
  const customThickness = customRange ? (customThicknessById[selectedMaterialId] ?? customRange.min) : 0;

  const selectedMaterial = useMemo(() => {
    const allOptions = [...WHITE_PAPERBOARD_OPTIONS, ...KRAFT_PAPERBOARD_OPTIONS, ...ART_PAPER_OPTIONS, ...CORRUGATED_OPTIONS];
    const base = allOptions.find(m => m.id === selectedMaterialId) ?? WHITE_PAPERBOARD_OPTIONS[0];
    const range = CUSTOM_MATERIAL_RANGES[selectedMaterialId];
    if (range) {
      const t = customThicknessById[selectedMaterialId] ?? range.min;
      const key = t.toFixed(1);
      const table = CUSTOM_DELTA_TABLES[selectedMaterialId];
      const deltas = table?.[key] ?? table?.[range.min.toFixed(1)];
      if (deltas) return { ...base, thickness: t, innerDelta: deltas.innerDelta, outerDelta: deltas.outerDelta };
    }
    return base;
  }, [selectedMaterialId, customThicknessById]);

  const selectMaterial = useCallback((opt: MaterialOption) => {
    setMaterialMenuOpen(false);
    setActiveMaterialCat(null);
    setIsApplyingHeight(true);
    setTimeout(() => { setSelectedMaterialId(opt.id); setIsApplyingHeight(false); }, 700);
  }, []);

  const stepCustomThickness = useCallback((dir: 1 | -1) => {
    setIsApplyingHeight(true);
    setTimeout(() => {
      setCustomThicknessById(prev => {
        const range = CUSTOM_MATERIAL_RANGES[selectedMaterialId];
        if (!range) return prev;
        const cur = prev[selectedMaterialId] ?? range.min;
        const next = Math.round((cur + dir * 0.1) * 10) / 10;
        return { ...prev, [selectedMaterialId]: Math.min(range.max, Math.max(range.min, next)) };
      });
      setIsApplyingHeight(false);
    }, 700);
  }, [selectedMaterialId]);

  const [sizeMode, setSizeMode] = useState<"manufacture" | "inner" | "outer">("manufacture");

  const selectSizeMode = useCallback((mode: "manufacture" | "inner" | "outer") => {
    setIsApplyingHeight(true);
    setTimeout(() => { setSizeMode(mode); setIsApplyingHeight(false); }, 700);
  }, []);

  const boxDims = useMemo(() => {
    const L = boxLengthMM > 0 ? boxLengthMM : 260;
    const W = boxWidthMM > 0 ? boxWidthMM : 2 * FLAP_H;
    const H = boxHeightMM > 0 ? boxHeightMM : FLAP_H;
    const m = selectedMaterial;

    // Org* — the original (Manufacture-mode) dimensions, unchanged formulas.
    const orgMfg = { l: L, w: W, h: H };
    const orgInner = { l: L - m.innerDelta.l, w: W - m.innerDelta.w, h: H - m.innerDelta.h };
    const orgOuter = { l: L + m.outerDelta.l, w: W + m.outerDelta.w, h: H + m.outerDelta.h };

    const axis = (k: "l" | "w" | "h") => {
      if (sizeMode === "inner") {
        const mfg = orgMfg[k] + (orgMfg[k] - orgInner[k]);
        const inner = orgMfg[k];
        const outer = mfg + (orgOuter[k] - orgMfg[k]);
        return { mfg, inner, outer };
      }
      if (sizeMode === "outer") {
        const mfg = orgMfg[k] - (orgOuter[k] - orgMfg[k]);
        const inner = orgMfg[k] - (orgOuter[k] - orgInner[k]);
        const outer = orgMfg[k];
        return { mfg, inner, outer };
      }
      return { mfg: orgMfg[k], inner: orgInner[k], outer: orgOuter[k] };
    };

    const aL = axis("l"), aW = axis("w"), aH = axis("h");
    return {
      mfgL: aL.mfg, mfgW: aW.mfg, mfgH: aH.mfg,
      innerL: aL.inner, innerW: aW.inner, innerH: aH.inner,
      outerL: aL.outer, outerW: aW.outer, outerH: aH.outer,
    };
  }, [boxLengthMM, boxWidthMM, boxHeightMM, selectedMaterial, sizeMode]);
  const geo = useMemo(() => buildGeometry(
    boxHeightMM  > 0 ? boxHeightMM  : FLAP_H,
    topLockFlapH > 0 ? topLockFlapH : TOP_LOCK_FIXED_W,
    boxLengthMM  > 0 ? boxLengthMM  : 260,
    boxWidthMM   > 0 ? boxWidthMM   : 2 * FLAP_H,
  ), [boxHeightMM, topLockFlapH, boxLengthMM, boxWidthMM]);

  const applyHeightDraft = useCallback(() => {
    const v = parseFloat(heightDraft);
    if (isNaN(v) || v <= 0) { setHeightDraft(String(boxHeightMM)); return; }
    setIsApplyingHeight(true);
    setTimeout(() => { setBoxHeightMM(v); setIsApplyingHeight(false); }, 700);
  }, [heightDraft, boxHeightMM]);

  const applyTopLockFlapHDraft = useCallback(() => {
    const v = parseFloat(topLockFlapHDraft);
    if (isNaN(v) || v <= 0) { setTopLockFlapHDraft(String(topLockFlapH)); return; }
    setIsApplyingHeight(true);
    setTimeout(() => { setTopLockFlapH(v); setIsApplyingHeight(false); }, 700);
  }, [topLockFlapHDraft, topLockFlapH]);

  const applyLengthDraft = useCallback(() => {
    const v = parseFloat(lengthDraft);
    if (isNaN(v) || v <= 0) { setLengthDraft(String(boxLengthMM)); return; }
    setIsApplyingHeight(true);
    setTimeout(() => { setBoxLengthMM(v); setIsApplyingHeight(false); }, 700);
  }, [lengthDraft, boxLengthMM]);

  const applyWidthDraft = useCallback(() => {
    const v = parseFloat(widthDraft);
    if (isNaN(v) || v <= 0) { setWidthDraft(String(boxWidthMM)); return; }
    setIsApplyingHeight(true);
    setTimeout(() => { setBoxWidthMM(v); setIsApplyingHeight(false); }, 700);
  }, [widthDraft, boxWidthMM]);
  const {
    BW, BD, DWST, PAD, FLAP_H: GEO_FLAP_H,
    SIDE_WALL_H, LOCK_FLAP_SIZE, BOTTOM_LOCK_W, TOP_LOCK_R, TOP_LOCK_W, BH,
    NX0, NX1, NX2, NX3,
    NY0, NY1, NY2, NY3, NY4, NY5,
    DUST_H, LID_H, NY_DUST, NY_LID, NY_BASE, NY_BOT, DIELINE_H_FULL,
    FACES_OUTSIDE, TOTAL_DIELINE_W, TOTAL_DIELINE_H,
    LX0, LX1, LX2, LX3, LX4, LX5, LY_TOP, LY2, LY3, LY4, COR,
  } = geo;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemIsGlobal, setSelectedItemIsGlobal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
        if (selectedItemIsGlobal) { removeGlobalItem(selectedItemId); }
        else if (selectedFace) removeItem(selectedFace, selectedItemId);
        setSelectedItemId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histIdx, history.length, selectedItemId, selectedFace, selectedItemIsGlobal]);

  const faces = FACES_OUTSIDE;
  const regMirrorMin = faces.reduce((m, f) => Math.min(m, f.x), Infinity);
  const regMirrorMax = faces.reduce((m, f) => Math.max(m, f.x + f.w), -Infinity);
  const regMirrorTotal = regMirrorMin + regMirrorMax;
  const dielineW = regMirrorMax + PAD;
  const _dfSwaps: Partial<Record<FaceId, FaceId>> = {
    "top-side-flap-left": "top-side-flap-right",   "top-side-flap-right": "top-side-flap-left",
  };
  const dielineFaces = faces.map(f => {
    const swapId = _dfSwaps[f.id];
    const def = swapId ? faces.find(tf => tf.id === swapId)! : f;
    return { ...def, x: regMirrorTotal - f.x - f.w, y: f.y, chamferTR: def.chamferTL, chamferTL: def.chamferTR, chamferBL: def.chamferBR, chamferBR: def.chamferBL, triangleTL: def.triangleTR, triangleTR: def.triangleTL };
  }).sort((a, b) => {
    if (a.id === "dust-flap-top" && (b.id === "top-lock-flap-l" || b.id === "top-lock-flap-r")) return -1;
    if ((a.id === "top-lock-flap-l" || a.id === "top-lock-flap-r") && b.id === "dust-flap-top") return 1;
    if (a.id === "bottom-tuck-flap-l" && b.id === "lock-flap-bl") return -1;
    if (a.id === "lock-flap-bl" && b.id === "bottom-tuck-flap-l") return 1;
    if (a.id === "bottom-tuck-flap-r" && b.id === "lock-flap-br") return -1;
    if (a.id === "lock-flap-br" && b.id === "bottom-tuck-flap-r") return 1;
    return a.y !== b.y ? a.y - b.y : a.x - b.x;
  });
  const outGlobalForPreview = (state.outside.globalItems ?? []).map(item => ({ ...item, x: regMirrorTotal - item.x - item.w }));
  const inGlobalForPreview = state.inside.globalItems ?? [];

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

  function addGlobalItem(item: CanvasItem) {
    commit({ ...state, [view]: { ...vd, globalItems: [...(vd.globalItems ?? []), item] } });
    setSelectedItemId(item.id);
    setSelectedItemIsGlobal(true);
  }
  function updateGlobalItem(id: string, updates: Partial<CanvasItem>) {
    commit({ ...state, [view]: { ...vd, globalItems: (vd.globalItems ?? []).map(it => it.id === id ? { ...it, ...updates } as CanvasItem : it) } });
  }
  function removeGlobalItem(id: string) {
    commit({ ...state, [view]: { ...vd, globalItems: (vd.globalItems ?? []).filter(it => it.id !== id) } });
  }

  function addText() {
    const item: TextItem = { id: uid(), kind: "text", text: "Add text", x: NX1 + BW / 2 - 60, y: NY_BASE + BH / 2 - 12, w: 140, font: "Arial, sans-serif", size: 16, bold: false, color: "#000000", align: "center" };
    addGlobalItem(item);
  }

  function addSvgItem(shape: { svg: string; w: number; h: number }) {
    const item: ImageItem = { id: uid(), kind: "image", src: svgUrl(shape.svg), x: Math.max(0, NX1 + BW / 2 - shape.w / 2), y: Math.max(0, NY_BASE + BH / 2 - shape.h / 2), w: shape.w, h: shape.h };
    addGlobalItem(item);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = BW - 20, maxH = BH - 20;
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const item: ImageItem = { id: uid(), kind: "image", src, x: NX1 + 10, y: NY_BASE + 10, w: Math.round(img.naturalWidth * ratio), h: Math.round(img.naturalHeight * ratio) };
        addGlobalItem(item);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const globalItems = vd.globalItems ?? [];
  const currentItems = selectedItemIsGlobal ? globalItems : (selectedFace ? getFaceItems(selectedFace) : []);
  const selectedItem = selectedItemId ? currentItems.find(i => i.id === selectedItemId) ?? null : null;
  const selectedText = selectedItem?.kind === "text" ? selectedItem : null;

  const dragRef = useRef<{ id: string; faceId: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const globalDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
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

  function startDragGlobalItem(e: React.PointerEvent, item: CanvasItem) {
    e.preventDefault(); e.stopPropagation();
    globalDragRef.current = { id: item.id, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y };
    setSelectedItemId(item.id); setSelectedItemIsGlobal(true);
    const onMove = (ev: PointerEvent) => {
      const d = globalDragRef.current; if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom, dy = (ev.clientY - d.sy) / zoom;
      setHistory(prev => { const cur = prev[histIdx]; const curVd = cur[view]; const updated = { ...cur, [view]: { ...curVd, globalItems: (curVd.globalItems ?? []).map((it) => it.id !== d.id ? it : { ...it, x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } as CanvasItem) } }; const copy = [...prev]; copy[histIdx] = updated; return copy; });
    };
    const onUp = () => { globalDragRef.current = null; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
  }

  function startResizeGlobalItem(e: React.PointerEvent, item: CanvasItem, corner: "tl"|"tr"|"bl"|"br"|"l"|"r") {
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
      setHistory(prev => { const cur = prev[histIdx]; const curVd = cur[view]; const copy = [...prev]; copy[histIdx] = { ...cur, [view]: { ...curVd, globalItems: (curVd.globalItems ?? []).map(it => it.id !== item.id ? it : { ...it, ...updates } as CanvasItem) } }; return copy; });
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

  const selectedFaceDef = selectedFace ? dielineFaces.find(f => f.id === selectedFace) ?? null : null;

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

  // Bleed outline — dilates the face-panel silhouette outward by bleedR using a
  // rectangular (feMorphology) kernel rather than a circular one, so corners stay
  // sharp/mitered like the cut line itself instead of rounding off, and it stays
  // evenly (parallel) spaced from the boundary around every notch/flap. One filter
  // operation, so it's cheap regardless of how complex the outline is.
  const bleedR = Math.round(8 * zoom);
  const bleedLineW = Math.max(1, Math.round(3 * zoom));
  const bleedFillColor = state[view].faceColors["front"] ?? "#c8a97e";

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (<Fragment>
    {isApplyingHeight && (
      <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(255,255,255,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes pb-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 42, height: 42, borderRadius: "50%", border: "4px solid #e5e7eb", borderTopColor: "#7c3aed", animation: "pb-spin 0.7s linear infinite" }} />
      </div>
    )}
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 54, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem", background: "#fff", flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.35rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        {selectedText ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", minWidth: 0 }}>
            <FontPicker value={selectedText.font} onChange={v => selectedItemIsGlobal ? updateGlobalItem(selectedText.id, { font: v }) : selectedFace && updateItem(selectedFace, selectedText.id, { font: v })} />
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <select value={selectedText.size} onChange={e => selectedItemIsGlobal ? updateGlobalItem(selectedText.id, { size: Number(e.target.value) }) : selectedFace && updateItem(selectedFace, selectedText.id, { size: Number(e.target.value) })} style={{ padding: "0.4rem 0.5rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.82rem", color: "#374151", width: "72px", flexShrink: 0, background: "#fafafa", fontWeight: 600, cursor: "pointer" }}>
              {[10,12,14,16,18,20,24,28,32,36,42,48,56,64].map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <button onClick={() => selectedItemIsGlobal ? updateGlobalItem(selectedText.id, { bold: !selectedText.bold }) : selectedFace && updateItem(selectedFace, selectedText.id, { bold: !selectedText.bold })} style={{ width: "36px", height: "36px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: selectedText.bold ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#fff", color: selectedText.bold ? "#fff" : "#374151", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: selectedText.bold ? "0 2px 8px rgba(124,58,237,0.35)" : "none" }}>B</button>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
              {(["left","center","right"] as const).map(a => (
                <button key={a} onClick={() => selectedItemIsGlobal ? updateGlobalItem(selectedText.id, { align: a }) : selectedFace && updateItem(selectedFace, selectedText.id, { align: a })} title={a} style={{ width: "34px", height: "34px", border: "1.5px solid #e5e7eb", borderRadius: "8px", background: selectedText.align === a ? "#f3f0ff" : "#fff", color: selectedText.align === a ? "#7c3aed" : "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {a === "left"   && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>}
                  {a === "center" && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>}
                  {a === "right"  && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>}
                </button>
              ))}
            </div>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {TEXT_COLORS.map(c => (
                <button key={c} onClick={() => selectedItemIsGlobal ? updateGlobalItem(selectedText.id, { color: c }) : selectedFace && updateItem(selectedFace, selectedText.id, { color: c })} title={c} style={{ width: "24px", height: "24px", borderRadius: "50%", background: c, border: `2.5px solid ${selectedText.color === c ? "#7c3aed" : "#e5e7eb"}`, cursor: "pointer", padding: 0, flexShrink: 0, boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #d1d5db" : "0 1px 4px rgba(0,0,0,0.15)", outline: selectedText.color === c ? "2px solid rgba(124,58,237,0.25)" : "none", outlineOffset: "2px", transform: selectedText.color === c ? "scale(1.15)" : "scale(1)", transition: "transform 0.1s" }} />
              ))}
            </div>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <button onClick={() => { selectedItemIsGlobal ? removeGlobalItem(selectedText.id) : selectedFace && removeItem(selectedFace, selectedText.id); setSelectedItemId(null); }} style={{ padding: "0.4rem 1rem", border: "1px solid #fca5a5", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, flexShrink: 0 }}>Delete</button>
          </div>
        ) : (
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{product.name}</span>
          </div>
        )}
        <button onClick={() => setFinalStepsOpen(true)} style={{ padding: "0.4rem 1.5rem", background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}>Save and Continue</button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left icon rail ── */}
        <div style={{ width: 72, borderRight: "1px solid #e5e7eb", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", flexShrink: 0 }}>
          {/* Basics icon */}
          <button onClick={() => setActiveTab("basics")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", border: "none", background: activeTab === "basics" ? "#eff6ff" : "transparent", borderRadius: 10, cursor: "pointer", color: activeTab === "basics" ? "#2563eb" : "#6b7280", width: "88%" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, textAlign: "center" }}>Basics</span>
          </button>
          {/* Uploads / Elements / Package Color icons hidden — pizza box editor only exposes Basics for now. Code kept intact below. */}
          {false && (["uploads", "elements"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", border: "none", background: activeTab === tab ? "#eff6ff" : "transparent", borderRadius: 10, cursor: "pointer", color: activeTab === tab ? "#2563eb" : "#6b7280", width: "88%" }}>
              {tab === "uploads" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              )}
              <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "capitalize", textAlign: "center" }}>{tab === "uploads" ? "Uploads" : "Elements"}</span>
            </button>
          ))}
          {false && (
            <button onClick={() => setActiveTab(activeTab === "package-color" ? "uploads" : "package-color")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 6px", border: "none", background: activeTab === "package-color" ? "#eff6ff" : "transparent", borderRadius: 10, cursor: "pointer", color: activeTab === "package-color" ? "#2563eb" : "#6b7280", width: "88%" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: vd.faceColors["front"] ?? "#c8a97e", border: "2px solid currentColor", flexShrink: 0 }} />
              <span style={{ fontSize: "0.6rem", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>Package{"\n"}Color</span>
            </button>
          )}
        </div>

        {/* ── Left expanded panel ── */}
        <div style={{ width: 290, borderRight: "1px solid #e5e7eb", background: "#fff", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "0.65rem 1rem 0.4rem", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>
              {activeTab === "basics" ? "Basics" : activeTab === "uploads" ? "Uploads" : activeTab === "elements" ? "Elements" : "Package Color"}
            </span>
          </div>

          {/* ── Basics panel ── */}
          {activeTab === "basics" && (
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Length */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Length</label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="number"
                    min={0}
                    value={lengthDraft}
                    onChange={e => setLengthDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); applyLengthDraft(); } }}
                    onBlur={applyLengthDraft}
                    style={{ width: "100%", padding: "0.6rem 2.2rem 0.6rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                  <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", fontWeight: 700, color: "#6b7280", pointerEvents: "none" }}>mm</span>
                </div>
              </div>

              {/* Width */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Width</label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="number"
                    min={0}
                    value={widthDraft}
                    onChange={e => setWidthDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); applyWidthDraft(); } }}
                    onBlur={applyWidthDraft}
                    style={{ width: "100%", padding: "0.6rem 2.2rem 0.6rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                  <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", fontWeight: 700, color: "#6b7280", pointerEvents: "none" }}>mm</span>
                </div>
              </div>

              {/* Overall Height */}
              <div>
                <label htmlFor="pb-height-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
                  Height
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    id="pb-height-input"
                    type="number"
                    min={0}
                    value={heightDraft}
                    onChange={e => setHeightDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); applyHeightDraft(); } }}
                    onBlur={applyHeightDraft}
                    style={{ width: "100%", padding: "0.6rem 2.2rem 0.6rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
                  />
                  <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", fontWeight: 700, color: "#6b7280", pointerEvents: "none" }}>mm</span>
                </div>
              </div>

              {/* Choose material */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Choose material</label>
                <div ref={materialMenuRef} style={{ position: "relative", width: "100%" }}>
                  <button
                    ref={materialBtnRef}
                    onClick={toggleMaterialMenu}
                    style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1.5px solid ${materialMenuOpen ? "#7c3aed" : "#e5e7eb"}`, borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedMaterial.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: materialMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>

                  {materialMenuOpen && (
                    <div ref={materialDropRef} style={{ position: "fixed", top: materialMenuPos.top, left: materialMenuPos.left, width: "max-content", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 9999, display: "flex", overflow: "hidden" }}>
                      <div style={{ width: 168, flexShrink: 0, borderRight: "1px solid #f0f0f0" }}>
                        {MATERIAL_CATEGORIES.map((cat, i) => (
                          <div
                            key={cat.label}
                            onMouseEnter={() => setActiveMaterialCat(i)}
                            style={{ padding: "10px 12px", fontSize: "0.8rem", fontWeight: 600, color: "#111827", background: activeMaterialCat === i ? "#f9fafb" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, whiteSpace: "nowrap" }}
                          >
                            {cat.label}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M9 6l6 6-6 6"/></svg>
                          </div>
                        ))}
                      </div>
                      {activeMaterialCat !== null && (
                        <div style={{ width: 270, flexShrink: 0 }}>
                          {MATERIAL_CATEGORIES[activeMaterialCat].options.map(opt => (
                            <div
                              key={opt.id}
                              onClick={() => selectMaterial(opt)}
                              style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#111827", background: opt.id === selectedMaterialId ? "#f5f3ff" : "#fff", cursor: "pointer", fontWeight: opt.id === selectedMaterialId ? 700 : 500, whiteSpace: "nowrap" }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Thickness (derived from selected material; "Custom …" options get a +/- stepper) */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                  {isCustomSelected ? "Custom thickness" : "Thickness"}
                </label>
                {isCustomSelected && customRange && (
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 6 }}>({customRange.min}~{customRange.max}mm)</div>
                )}
                {isCustomSelected && customRange ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "0.35rem 0.5rem", background: "#fff" }}>
                    <button
                      onClick={() => stepCustomThickness(-1)}
                      disabled={customThickness <= customRange.min}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 8, background: "#f3f4f6", cursor: customThickness <= customRange.min ? "not-allowed" : "pointer", fontSize: 16, lineHeight: 1, color: customThickness <= customRange.min ? "#d1d5db" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >−</button>
                    <span style={{ flex: 1, textAlign: "center", fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{customThickness.toFixed(1)}</span>
                    <button
                      onClick={() => stepCustomThickness(1)}
                      disabled={customThickness >= customRange.max}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 8, background: "#f3f4f6", cursor: customThickness >= customRange.max ? "not-allowed" : "pointer", fontSize: 16, lineHeight: 1, color: customThickness >= customRange.max ? "#d1d5db" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >+</button>
                  </div>
                ) : (
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type="text"
                      readOnly
                      value={selectedMaterial.thickness.toFixed(2)}
                      style={{ width: "100%", padding: "0.6rem 2.2rem 0.6rem 0.75rem", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem", fontWeight: 700, color: "#111827", background: "#f9fafb", outline: "none", boxSizing: "border-box" }}
                    />
                    <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", fontWeight: 700, color: "#6b7280", pointerEvents: "none" }}>mm</span>
                  </div>
                )}
              </div>

              {/* Size mode */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.05em", textTransform: "uppercase" }}>Size mode</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#9ca3af"><circle cx="12" cy="12" r="10"/><rect x="11" y="10" width="2" height="7" fill="#fff"/><rect x="11" y="6.5" width="2" height="2" fill="#fff"/></svg>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {([
                    { id: "manufacture", label: "Manufacture\ndimensions" },
                    { id: "inner", label: "Inner\ndimensions" },
                    { id: "outer", label: "Outer\ndimensions" },
                  ] as { id: "manufacture" | "inner" | "outer"; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => selectSizeMode(opt.id)}
                      style={{ padding: "0.75rem 0.5rem", border: `1.5px solid ${sizeMode === opt.id ? "#2563eb" : "#e5e7eb"}`, borderRadius: 12, background: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#111827", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.3 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Uploads panel ── */}
          {activeTab === "uploads" && (
            <div style={{ padding: "1rem" }}>
              <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              <button
                onClick={() => uploadRef.current?.click()}
                style={{ width: "100%", padding: "1.25rem 0.75rem", border: "2px dashed #d1d5db", borderRadius: 12, background: "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#6b7280", fontSize: "0.8rem" }}
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

              {/* Text */}
              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827", display: "block", marginBottom: "0.6rem" }}>Text</span>
                <button
                  onClick={addText}
                  style={{ width: 80, height: 80, border: "1.5px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: 1 }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#374151" }}>Add text</span>
                </button>
              </div>

              {/* Shape */}
              <HScrollSection title="Shape">
                {SHAPES.map(s => (
                  <button key={s.label} onClick={() => addSvgItem(s)} title={s.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 }}>
                    <img src={svgUrl(s.svg)} alt={s.label} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Packaging Symbols */}
              <HScrollSection title="Packaging Symbols">
                {PACKAGING_SYMBOLS.map(s => (
                  <button key={s.label} onClick={() => addSvgItem({ svg: s.svg, w: 56, h: 56 })} title={s.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 }}>
                    <img src={svgUrl(s.svg)} alt={s.label} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Text Combinations */}
              <HScrollSection title="Text Combinations">
                {TEXT_COMBOS.map(tc => (
                  <button key={tc.label} onClick={() => addSvgItem({ svg: tc.svg, w: tc.w, h: tc.h })} title={tc.label} style={{ flexShrink: 0, width: 100, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: 1 }}>
                    <img src={svgUrl(tc.svg)} alt={tc.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </button>
                ))}
              </HScrollSection>

              {/* Patterns */}
              <HScrollSection title="Patterns">
                {PATTERNS.map(p => (
                  <button key={p.label} onClick={() => setBoxColor("url(" + svgUrl(p.svg) + ")")} title={p.label} style={{ flexShrink: 0, width: 72, height: 72, border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden", cursor: "pointer", opacity: 1, padding: 0 }}>
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
          {/* Line-color legend — Bleed / Trim / Crease */}
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 30, display: "flex", alignItems: "center", gap: 20, background: "#eef1f5", padding: "8px 16px", borderRadius: 8, pointerEvents: "none" }}>
            {[
              { label: "Bleed", color: "#22c55e" },
              { label: "Trim", color: "#3b3bfa" },
              { label: "Crease", color: "#ef4444" },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
                <span style={{ fontSize: "0.85rem", color: "#4b5563" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Manufacture / Inner / Outer dimensions — updates with L/W/H and material */}
          <div style={{ position: "absolute", top: 60, left: 16, zIndex: 30, background: "#eef1f5", padding: "12px 16px", borderRadius: 8, minWidth: 210, pointerEvents: "none" }}>
            <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Manufacture dimensions</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{boxDims.mfgL.toFixed(2)} × {boxDims.mfgW.toFixed(2)} × {boxDims.mfgH.toFixed(2)} mm</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Inner dimensions</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{boxDims.innerL.toFixed(2)} × {boxDims.innerW.toFixed(2)} × {boxDims.innerH.toFixed(2)} mm</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Outer dimensions</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{boxDims.outerL.toFixed(2)} × {boxDims.outerW.toFixed(2)} × {boxDims.outerH.toFixed(2)} mm</div>
                </div>
              </>
          </div>

          <div
            ref={canvasScrollRef}
            style={{ flex: 1, height: 0, overflowY: "auto", overflowX: "auto", cursor: toolMode === "pan" ? "grab" : "default" }}
            onClick={() => { setSelectedFace(null); setSelectedItemId(null); setEditingItemId(null); setShowFaceColorPopup(false); setSelectedItemIsGlobal(false); }}
          >
            <div style={{ minHeight: "150vh", minWidth: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: `${Math.max(48, Math.max(topLockFlapH, TOP_LOCK_R) * zoom + 8)}px`, paddingRight: "3rem", paddingBottom: "3rem", paddingLeft: "3rem", boxSizing: "border-box" }}>
            <div style={{ position: "relative", width: dielineW * zoom, height: (DIELINE_H_FULL + Math.max(0, Math.max(topLockFlapH, TOP_LOCK_R) - PAD)) * zoom, flexShrink: 0, transform: `rotate(${canvasRotation}deg)`, transformOrigin: "center center", transition: "transform 0.3s ease" }}>

              {/* Dieline background — extends up to cover top flap and dust flap which sit above y=0 */}
              <div style={{ position: "absolute", top: -(Math.max(topLockFlapH, TOP_LOCK_R) - PAD) * zoom, bottom: 0, left: 0, right: 0, background: "#f5f5f0", borderRadius: 4 }} />

              {/* Bleed outline filter def — dilates with a rectangular kernel (sharp
                  corners), fills the margin with the box's own material color, and
                  draws a thin dark-green line only at the outer edge of that margin. */}
              <svg width="0" height="0" style={{ position: "absolute" }}>
                <defs>
                  <filter id="bleedDilateFilter" x="-20%" y="-20%" width="140%" height="140%">
                    <feMorphology in="SourceAlpha" operator="dilate" radius={bleedR} result="dilatedOuter" />
                    <feMorphology in="SourceAlpha" operator="dilate" radius={Math.max(0, bleedR - bleedLineW)} result="dilatedInner" />
                    <feComposite in="dilatedOuter" in2="dilatedInner" operator="out" result="ring" />
                    <feFlood floodColor={bleedFillColor} result="tanFlood" />
                    <feComposite in="tanFlood" in2="dilatedOuter" operator="in" result="tanFill" />
                    <feFlood floodColor="#166534" result="greenFlood" />
                    <feComposite in="greenFlood" in2="ring" operator="in" result="greenRing" />
                    <feMerge>
                      <feMergeNode in="tanFill" />
                      <feMergeNode in="greenRing" />
                    </feMerge>
                  </filter>
                </defs>
              </svg>

              {/* ── Mailer Box Dieline SVG ── */}
              {(() => {
                const z = zoom;
                const s = (n: number) => n * z;
                const x0=LX0*z, x1=LX1*z, x2=LX2*z, x3=LX3*z, x4=LX4*z, x5=LX5*z;
                const yt=LY_TOP*z, y2=LY2*z, y3=LY3*z, y4=LY4*z;
                const cr = s(COR);
                const W = dielineW * z, H = TOTAL_DIELINE_H * z;

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
                  // Bottom flap left side back up, with chamfer at top-left corner
                  `L ${x1},${y3 + ch}`,
                  `L ${x1 - ch},${y3}`,
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
                  // Top flap outer side folds
                  `M ${x1},${yt + br} L ${x1},${y2}`,
                  `M ${x4},${yt + br} L ${x4},${y2}`,
                  // Full-height vertical fold at LX2 — top of Back Side to bottom of Front Side
                  `M ${x2},${yt} L ${x2},${y4}`,
                  // Full-height vertical fold at LX3
                  `M ${x3},${yt} L ${x3},${y4}`,
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
                  // Bottom flap inner dividers (4 equal sections)
                  `M ${x1 + (x4 - x1) / 4},${y3} L ${x1 + (x4 - x1) / 4},${y4}`,
                  `M ${x1 + (x4 - x1) / 2},${y3} L ${x1 + (x4 - x1) / 2},${y4}`,
                  `M ${x1 + (x4 - x1) * 3 / 4},${y3} L ${x1 + (x4 - x1) * 3 / 4},${y4}`,
                  // Right Side Wall bottom separator — connects to Left Bottom Triangle (wedge), touching Bottom Lock Flap corner
                  `M ${x3},${s(NY_BOT - BOTTOM_LOCK_W)} L ${x3 + s(LOCK_FLAP_SIZE)},${s(NY_BOT - BOTTOM_LOCK_W)}`,
                ].join(" ");

                // ── DIMENSIONS ───────────────────────────────────────────────
                const dz = s(10);
                const tk = s(4);

                return (
                  <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width={W} height={H}>
                    {/* Fold lines */}
                    <path d={folds} fill="none" stroke="#3b82f6" strokeWidth={s(0.9)} strokeDasharray={`${s(4)} ${s(2.5)}`} />



                    {/* Dimensions */}
                    <g fill="none" stroke="#3b82f6" strokeWidth={s(0.8)}>
                      {/* Width (BW mm) */}
                      <line x1={x2} y1={s(NY_BOT)+s(16)} x2={x3} y2={s(NY_BOT)+s(16)} />
                      <line x1={x2} y1={s(NY_BOT)+s(16)-tk} x2={x2} y2={s(NY_BOT)+s(16)+tk} />
                      <line x1={x3} y1={s(NY_BOT)+s(16)-tk} x2={x3} y2={s(NY_BOT)+s(16)+tk} />
                      <text x={(x2+x3)/2} y={s(NY_BOT)+s(12)} textAnchor="middle" fill="#3b82f6" stroke="none" fontSize={dz} fontWeight="700">{BW} mm</text>
                      {/* Height (BH mm) — right of Base face */}
                      <line x1={x3+s(16)} y1={s(NY_BASE)} x2={x3+s(16)} y2={s(NY_BOT)} />
                      <line x1={x3+s(16)-tk} y1={s(NY_BASE)} x2={x3+s(16)+tk} y2={s(NY_BASE)} />
                      <line x1={x3+s(16)-tk} y1={s(NY_BOT)} x2={x3+s(16)+tk} y2={s(NY_BOT)} />
                      <text x={x3+s(22)} y={(s(NY_BASE)+s(NY_BOT))/2+dz/3} fill="#3b82f6" stroke="none" fontSize={dz} fontWeight="700">{BH} mm</text>
                    </g>
                  </svg>
                );
              })()}

              {/* Bleed outline — dark-green margin, evenly (parallel) offset outward
                  from the whole outer silhouette with sharp/mitered corners. A hidden
                  plain-silhouette copy of the panels feeds the dilate filter (so labels/
                  borders don't leak into the alpha mask); it renders behind the real,
                  unfiltered panels below. */}
              <div style={{ position: "relative", filter: "url(#bleedDilateFilter)" }}>
                {dielineFaces.map(face => (
                  <DielineFace
                    key={face.id + "-silhouette"}
                    face={face} color="#000"
                    selected={false} hovered={false}
                    onSelect={() => {}} onHover={() => {}} onLeave={() => {}}
                    items={[]} zoom={zoom} lockFlapSize={LOCK_FLAP_SIZE}
                    topLockR={TOP_LOCK_R} topLockW={TOP_LOCK_W}
                    silhouetteOnly
                  />
                ))}
              </div>

              {/* Face panels */}
              {dielineFaces.map(face => {
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
                    lockFlapSize={LOCK_FLAP_SIZE}

                    topLockR={TOP_LOCK_R}
                    topLockW={TOP_LOCK_W}
                  />
                );
              })}






              {/* Bottom Tuck Flap Left — T/L/B/R edge labels */}
              {(() => {
                const z = zoom;
                const faceX = regMirrorTotal - NX2 - BOTTOM_LOCK_W * 2;
                const cx = (faceX + BOTTOM_LOCK_W) * z;
                const cy = (NY_BOT + BOTTOM_LOCK_W) * z;
                const r  = BOTTOM_LOCK_W * z;
                const off = 10 * z;
                const style: React.CSSProperties = {
                  position: "absolute", pointerEvents: "none",
                  fontSize: 9 * z, fontWeight: 700, color: "rgba(0,0,0,0.55)",
                  letterSpacing: "0.04em", transform: "translate(-50%,-50%)",
                  userSelect: "none", lineHeight: 1,
                };
                return (
                  <>
                    <span style={{ ...style, left: cx,           top: cy - r - off }}>T</span>
                    <span style={{ ...style, left: cx + r + off, top: cy           }}>R</span>
                    <span style={{ ...style, left: cx,           top: cy + r + off }}>B</span>
                    <span style={{ ...style, left: cx - r - off, top: cy           }}>L</span>
                  </>
                );
              })()}

              {/* Bottom Tuck Flap Right — T/L/B/R edge labels */}
              {(() => {
                const z = zoom;
                // face rendered x = regMirrorTotal - NX1; center = +BOTTOM_LOCK_W
                const cx = (regMirrorTotal - NX1 + BOTTOM_LOCK_W) * z;
                const cy = (NY_BOT + BOTTOM_LOCK_W) * z;
                const r  = BOTTOM_LOCK_W * z;
                const off = 10 * z;
                const style: React.CSSProperties = {
                  position: "absolute", pointerEvents: "none",
                  fontSize: 9 * z, fontWeight: 700, color: "rgba(0,0,0,0.55)",
                  letterSpacing: "0.04em", transform: "translate(-50%,-50%)",
                  userSelect: "none", lineHeight: 1,
                };
                return (
                  <>
                    <span style={{ ...style, left: cx,           top: cy - r - off }}>T</span>
                    <span style={{ ...style, left: cx + r + off, top: cy           }}>R</span>
                    <span style={{ ...style, left: cx,           top: cy + r + off }}>B</span>
                    <span style={{ ...style, left: cx - r - off, top: cy           }}>L</span>
                  </>
                );
              })()}

              {/* Dust Flap Top — TL / TR corner labels */}
              {(() => {
                const z = zoom;
                // mirrored: x = regMirrorTotal - NX1 - BW, w = BW
                const faceLeft  = (regMirrorTotal - NX1 - BW) * z;
                const faceRight = (regMirrorTotal - NX1) * z;
                const faceTop   = NY0 * z;
                const off = 10 * z;
                const style: React.CSSProperties = {
                  position: "absolute", pointerEvents: "none",
                  fontSize: 8 * z, fontWeight: 700, color: "rgba(0,0,0,0.5)",
                  letterSpacing: "0.03em", transform: "translate(-50%,-50%)",
                  userSelect: "none", lineHeight: 1, textAlign: "center",
                };
                return (
                  <>
                    <span style={{ ...style, left: faceLeft  + off * 1.5, top: faceTop + off * 1.5 }}>TL</span>
                    <span style={{ ...style, left: faceRight - off * 1.5, top: faceTop + off * 1.5 }}>TR</span>
                  </>
                );
              })()}

              {/* Top Side Flap Left — top-left / top-right corner labels */}
              {(() => {
                const z = zoom;
                // mirrored face: x = regMirrorTotal - NX1, w = (BD + 60) / 2
                const faceLeft  = (regMirrorTotal - NX1) * z;
                const faceRight = (regMirrorTotal - NX1 + (BD + 60) / 2) * z;
                const faceTop   = NY_DUST * z;
                const off = 10 * z;
                const style: React.CSSProperties = {
                  position: "absolute", pointerEvents: "none",
                  fontSize: 8 * z, fontWeight: 700, color: "rgba(0,0,0,0.5)",
                  letterSpacing: "0.03em", transform: "translate(-50%,-50%)",
                  userSelect: "none", lineHeight: 1, textAlign: "center",
                };
                return (
                  <>
                    <span style={{ ...style, left: faceLeft  + off * 1.5, top: faceTop + off * 1.5 }}>TL</span>
                    <span style={{ ...style, left: faceRight - off * 1.5, top: faceTop + off * 1.5 }}>TR</span>
                  </>
                );
              })()}

              {/* Top Side Flap Left (left-side appearance) — TL / TR labels */}
              {(() => {
                const z = zoom;
                // This face renders from top-side-flap-right's mirrored position
                const faceLeft  = (regMirrorTotal - NX2 - (BD + 60) / 2) * z;
                const faceRight = (regMirrorTotal - NX2) * z;
                const faceTop   = NY_DUST * z;
                const off = 10 * z;
                const style: React.CSSProperties = {
                  position: "absolute", pointerEvents: "none",
                  fontSize: 8 * z, fontWeight: 700, color: "rgba(0,0,0,0.5)",
                  letterSpacing: "0.03em", transform: "translate(-50%,-50%)",
                  userSelect: "none", lineHeight: 1, textAlign: "center",
                };
                return (
                  <>
                    <span style={{ ...style, left: faceLeft  + off * 1.5, top: faceTop + off * 1.5 }}>TL</span>
                    <span style={{ ...style, left: faceRight - off * 1.5, top: faceTop + off * 1.5 }}>TR</span>
                  </>
                );
              })()}

              {/* Dimension overlays — on top of face panels */}
              {(() => {
                const z = zoom;
                const s = (n: number) => n * z;
                const tk = s(5);
                const lx = s(regMirrorTotal - NX1 - BW / 2);
                // 62mm — Back Side face (vertical)
                const by1 = s(NY_LID) + s(10);
                const by2 = s(NY_LID + BD) - s(10);
                // 202mm — Base face (vertical)
                const fy1 = s(NY_BASE) + s(10);
                const fy2 = s(NY_BASE + BH) - s(10);
                // 315mm — Base face bottom (horizontal)
                const hx1 = s(NX1) + s(10);
                const hx2 = s(NX2) - s(10);
                const hy  = s(NY_BASE + BH) - s(160);
                return (
                  <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, overflow: "visible" }} width={dielineW * z} height={DIELINE_H_FULL * z} overflow="visible">
                    <g fill="none" stroke="#3b82f6" strokeWidth={s(1.5)}>
                      {/* 62 mm depth */}
                      <line x1={lx} y1={by1} x2={lx} y2={by2} />
                      <line x1={lx - tk} y1={by1} x2={lx + tk} y2={by1} />
                      <line x1={lx - tk} y1={by2} x2={lx + tk} y2={by2} />
                      <text x={lx + s(20)} y={(by1 + by2) / 2 + s(6)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BD} mm</text>
                      {/* Base/side-wall row height (BH) */}
                      <line x1={lx} y1={fy1} x2={lx} y2={fy2} />
                      <line x1={lx - tk} y1={fy1} x2={lx + tk} y2={fy1} />
                      <line x1={lx - tk} y1={fy2} x2={lx + tk} y2={fy2} />
                      <text x={lx + s(6)} y={(fy1 + fy2) / 2 + s(6)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BH} mm</text>
                      {/* 315 mm width */}
                      <line x1={hx1} y1={hy} x2={hx2} y2={hy} />
                      <line x1={hx1} y1={hy - tk} x2={hx1} y2={hy + tk} />
                      <line x1={hx2} y1={hy - tk} x2={hx2} y2={hy + tk} />
                      <text x={(hx1 + hx2) / 2} y={hy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800" textAnchor="middle">{BW} mm</text>
                      {/* Base horizontal dimension (BH*2) — center of base panel */}
                      {(() => { const bhy = s(NY_BASE + BH / 2); return (<>
                        <line x1={hx1} y1={bhy} x2={hx2} y2={bhy} />
                        <line x1={hx1} y1={bhy - tk} x2={hx1} y2={bhy + tk} />
                        <line x1={hx2} y1={bhy - tk} x2={hx2} y2={bhy + tk} />
                        <text x={(hx1 + hx2) / 2} y={bhy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800" textAnchor="middle">{BH} mm</text>
                      </>); })()}
                      {/* Dust Flap Super Top — vertical annotation (BH*2) */}
                      {(() => { const dy1 = s(NY0) + s(10); const dy2 = s(NY0 + DUST_H) - s(10); return (<>
                        <line x1={lx} y1={dy1} x2={lx} y2={dy2} />
                        <line x1={lx - tk} y1={dy1} x2={lx + tk} y2={dy1} />
                        <line x1={lx - tk} y1={dy2} x2={lx + tk} y2={dy2} />
                        <text x={lx + s(6)} y={(dy1 + dy2) / 2 + s(6)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800">{BH} mm</text>
                      </>); })()}
                      {/* Dust Flap Super Top — horizontal annotation (BH*2) — center of dust panel */}
                      {(() => { const dhy = s(NY0 + DUST_H / 2); return (<>
                        <line x1={hx1} y1={dhy} x2={hx2} y2={dhy} />
                        <line x1={hx1} y1={dhy - tk} x2={hx1} y2={dhy + tk} />
                        <line x1={hx2} y1={dhy - tk} x2={hx2} y2={dhy + tk} />
                        <text x={(hx1 + hx2) / 2} y={dhy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(13)} fontWeight="800" textAnchor="middle">{BH} mm</text>
                      </>); })()}
                      {/* Side Wall Flap (Right) height — vertical, left band (NX0→NX1) */}
                      {(() => { const lbx = s(NX0 + (NX1 - NX0) / 2); const ly1 = s(NY_LID) + s(5); const ly2 = s(NY_LID + LID_H) - s(5); return (<>
                        <line x1={lbx} y1={ly1} x2={lbx} y2={ly2} />
                        <line x1={lbx - tk} y1={ly1} x2={lbx + tk} y2={ly1} />
                        <line x1={lbx - tk} y1={ly2} x2={lbx + tk} y2={ly2} />
                        <text x={lbx} y={(ly1 + ly2) / 2} fill="#3b82f6" stroke="none" fontSize={s(11)} fontWeight="800" textAnchor="middle" transform={`rotate(-90 ${lbx} ${(ly1 + ly2) / 2})`}>{LID_H} mm</text>
                      </>); })()}
                      {/* Side Wall Flap (Left) height — vertical, right band (NX2→NX3) */}
                      {(() => { const rbx = s(NX2 + (NX3 - NX2) / 2); const ry1 = s(NY_LID) + s(5); const ry2 = s(NY_LID + LID_H) - s(5); return (<>
                        <line x1={rbx} y1={ry1} x2={rbx} y2={ry2} />
                        <line x1={rbx - tk} y1={ry1} x2={rbx + tk} y2={ry1} />
                        <line x1={rbx - tk} y1={ry2} x2={rbx + tk} y2={ry2} />
                        <text x={rbx} y={(ry1 + ry2) / 2} fill="#3b82f6" stroke="none" fontSize={s(11)} fontWeight="800" textAnchor="middle" transform={`rotate(-90 ${rbx} ${(ry1 + ry2) / 2})`}>{LID_H} mm</text>
                      </>); })()}
                      {/* Left Side Wall height — horizontal, side-left face */}
                      {(() => { const sideWallH = SIDE_WALL_H; const cy = s(NY_BASE + sideWallH / 2); const x1 = s(regMirrorTotal - NX1) + s(5); const x2 = s(regMirrorTotal - NX1 + LOCK_FLAP_SIZE) - s(5); return (<>
                        <line x1={x1} y1={cy} x2={x2} y2={cy} />
                        <line x1={x1} y1={cy - tk} x2={x1} y2={cy + tk} />
                        <line x1={x2} y1={cy - tk} x2={x2} y2={cy + tk} />
                        <text x={(x1 + x2) / 2} y={cy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{sideWallH} mm</text>
                      </>); })()}
                      {/* Right Side Wall height — horizontal, side-right face */}
                      {(() => { const sideWallH = SIDE_WALL_H; const cy = s(NY_BASE + sideWallH / 2); const x1 = s(regMirrorTotal - NX2 - LOCK_FLAP_SIZE) + s(5); const x2 = s(regMirrorTotal - NX2) - s(5); return (<>
                        <line x1={x1} y1={cy} x2={x2} y2={cy} />
                        <line x1={x1} y1={cy - tk} x2={x1} y2={cy + tk} />
                        <line x1={x2} y1={cy - tk} x2={x2} y2={cy + tk} />
                        <text x={(x1 + x2) / 2} y={cy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{sideWallH} mm</text>
                      </>); })()}
                      {/* Top Side Flap (Left) height — split into two equal FLAP_H bands, horizontal, top-side-flap-left face */}
                      {(() => { const tsfH = DUST_H - TOP_LOCK_R; const yTop = NY0 + TOP_LOCK_R; const cyU = s(yTop + GEO_FLAP_H / 2); const cyL = s(yTop + tsfH - GEO_FLAP_H / 2); const divY = s(yTop + tsfH / 2); const x1 = s(regMirrorTotal - NX1) + s(5); const x2 = s(regMirrorTotal - (NX0 - 60 + (BD + 60) / 2)) - s(5); return (<>
                        <line x1={x1} y1={divY} x2={x2} y2={divY} stroke="#9ca3af" strokeDasharray="4 3" strokeWidth={s(1)} />
                        <line x1={x1} y1={cyU} x2={x2} y2={cyU} />
                        <line x1={x1} y1={cyU - tk} x2={x1} y2={cyU + tk} />
                        <line x1={x2} y1={cyU - tk} x2={x2} y2={cyU + tk} />
                        <text x={(x1 + x2) / 2} y={cyU - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{Math.round(GEO_FLAP_H)} mm</text>
                        <line x1={x1} y1={cyL} x2={x2} y2={cyL} />
                        <line x1={x1} y1={cyL - tk} x2={x1} y2={cyL + tk} />
                        <line x1={x2} y1={cyL - tk} x2={x2} y2={cyL + tk} />
                        <text x={(x1 + x2) / 2} y={cyL - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{Math.round(GEO_FLAP_H)} mm</text>
                      </>); })()}
                      {/* Top Side Flap (Right) height — split into two equal FLAP_H bands, horizontal, top-side-flap-right face */}
                      {(() => { const tsfH = DUST_H - TOP_LOCK_R; const yTop = NY0 + TOP_LOCK_R; const cyU = s(yTop + GEO_FLAP_H / 2); const cyL = s(yTop + tsfH - GEO_FLAP_H / 2); const divY = s(yTop + tsfH / 2); const x1 = s(regMirrorTotal - NX2 - (BD + 60) / 2) + s(5); const x2 = s(regMirrorTotal - NX2) - s(5); return (<>
                        <line x1={x1} y1={divY} x2={x2} y2={divY} stroke="#9ca3af" strokeDasharray="4 3" strokeWidth={s(1)} />
                        <line x1={x1} y1={cyU} x2={x2} y2={cyU} />
                        <line x1={x1} y1={cyU - tk} x2={x1} y2={cyU + tk} />
                        <line x1={x2} y1={cyU - tk} x2={x2} y2={cyU + tk} />
                        <text x={(x1 + x2) / 2} y={cyU - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{Math.round(GEO_FLAP_H)} mm</text>
                        <line x1={x1} y1={cyL} x2={x2} y2={cyL} />
                        <line x1={x1} y1={cyL - tk} x2={x1} y2={cyL + tk} />
                        <line x1={x2} y1={cyL - tk} x2={x2} y2={cyL + tk} />
                        <text x={(x1 + x2) / 2} y={cyL - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{Math.round(GEO_FLAP_H)} mm</text>
                      </>); })()}
                      {/* Front Bottom Flap height — vertical */}
                      {(() => { const fby1 = s(NY_BOT) + s(5); const fby2 = s(NY_BOT + topLockFlapH) - s(5); return (<>
                        <line x1={lx} y1={fby1} x2={lx} y2={fby2} />
                        <line x1={lx - tk} y1={fby1} x2={lx + tk} y2={fby1} />
                        <line x1={lx - tk} y1={fby2} x2={lx + tk} y2={fby2} />
                        <text x={lx} y={(fby1 + fby2) / 2} fill="#3b82f6" stroke="none" fontSize={s(11)} fontWeight="800" textAnchor="middle" transform={`rotate(-90 ${lx} ${(fby1 + fby2) / 2})`}>{topLockFlapH} mm</text>
                      </>); })()}
                      {/* Left Bottom Triangle height — horizontal */}
                      {(() => { const cy = s(NY_BOT - BOTTOM_LOCK_W / 2); const x1 = s(regMirrorTotal - NX2 - BOTTOM_LOCK_W) + s(5); const x2 = s(regMirrorTotal - NX2) - s(5); return (<>
                        <line x1={x1} y1={cy} x2={x2} y2={cy} />
                        <line x1={x1} y1={cy - tk} x2={x1} y2={cy + tk} />
                        <line x1={x2} y1={cy - tk} x2={x2} y2={cy + tk} />
                        <text x={(x1 + x2) / 2} y={cy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{BOTTOM_LOCK_W} mm</text>
                      </>); })()}
                      {/* Right Bottom Triangle height — horizontal */}
                      {(() => { const cy = s(NY_BOT - BOTTOM_LOCK_W / 2); const x1 = s(regMirrorTotal - NX1) + s(5); const x2 = s(regMirrorTotal - NX1 + BOTTOM_LOCK_W) - s(5); return (<>
                        <line x1={x1} y1={cy} x2={x2} y2={cy} />
                        <line x1={x1} y1={cy - tk} x2={x1} y2={cy + tk} />
                        <line x1={x2} y1={cy - tk} x2={x2} y2={cy + tk} />
                        <text x={(x1 + x2) / 2} y={cy - s(8)} fill="#3b82f6" stroke="none" fontSize={s(10)} fontWeight="800" textAnchor="middle">{BOTTOM_LOCK_W} mm</text>
                      </>); })()}
                    </g>
                    {/* Bottom Tuck Flap Left — W and H dimensions along tuck flap sides (same style as lock flap) */}
                    {(() => {
                      const z = zoom;
                      const s = (n: number) => n * z;
                      // Tuck flap "diamond equivalent" center = (regMirrorTotal-NX2-k, NY_BOT+k)
                      // top vertex = (tcx, tcy-r), right vertex = (tcx+r, tcy), bottom vertex = (tcx, tcy+r)
                      const tcx  = s(regMirrorTotal - NX2 - BOTTOM_LOCK_W);
                      const tcy  = s(NY_BOT + BOTTOM_LOCK_W);
                      const r    = s(BOTTOM_LOCK_W);
                      const sq2  = Math.SQRT2;
                      const od   = s(16) / sq2;   // outward offset (lower-left direction)
                      const td   = s(5)  / sq2;   // tick half-size
                      const sideLen = Math.round(GEO_FLAP_H);

                      // W: top→right side, offset lower-left = (-od, +od)
                      const wx1 = tcx - od,     wy1 = (tcy - r) + od;
                      const wx2 = (tcx + r) - od, wy2 = tcy + od;
                      const wMX = (wx1 + wx2) / 2, wMY = (wy1 + wy2) / 2;

                      // H: right→bottom side, offset lower-left = (-od, +od)
                      // Clamped to tuck face bottom boundary (NY_BOT + 2k) so it stays within frame
                      const faceBotPx = s(NY_BOT + BOTTOM_LOCK_W * 2);
                      const hx1 = (tcx + r) - od, hy1 = tcy + od;
                      const hx2Raw = tcx - od,     hy2Raw = (tcy + r) + od;
                      const hx2 = hy2Raw > faceBotPx
                        ? hx1 + (hx2Raw - hx1) * (faceBotPx - hy1) / (hy2Raw - hy1)
                        : hx2Raw;
                      const hy2 = Math.min(hy2Raw, faceBotPx);
                      const hMX = (hx1 + hx2) / 2, hMY = (hy1 + hy2) / 2;

                      return (
                        <g fill="none" stroke="#9333ea" strokeWidth={s(1.2)}>
                          {/* W line + ticks */}
                          <line x1={wx1} y1={wy1} x2={wx2} y2={wy2} />
                          <line x1={wx1 + td} y1={wy1 - td} x2={wx1 - td} y2={wy1 + td} />
                          <line x1={wx2 + td} y1={wy2 - td} x2={wx2 - td} y2={wy2 + td} />
                          <text x={wMX} y={wMY} fill="#9333ea" stroke="none"
                            fontSize={s(11)} fontWeight="800" textAnchor="middle" dominantBaseline="middle"
                            transform={`rotate(-45 ${wMX} ${wMY})`}>W: {sideLen} mm</text>
                          {/* H line + ticks — right→bottom side, clamped to face boundary */}
                          <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} />
                          <line x1={hx1 - td} y1={hy1 - td} x2={hx1 + td} y2={hy1 + td} />
                          <line x1={hx2 - td} y1={hy2 - td} x2={hx2 + td} y2={hy2 + td} />
                          <text x={hMX} y={hMY} fill="#9333ea" stroke="none"
                            fontSize={s(11)} fontWeight="800" textAnchor="middle" dominantBaseline="middle"
                            transform={`rotate(45 ${hMX} ${hMY})`}>H: {sideLen} mm</text>
                        </g>
                      );
                    })()}
                    {/* Bottom Lock Flap Left + Right — W and H dimensions along diamond sides */}
                    {[s(regMirrorTotal - NX2), s(regMirrorTotal - NX1)].map((cx, i) => {
                      const cy  = s(NY_BOT);
                      const r   = s(BOTTOM_LOCK_W);
                      const sq2 = Math.SQRT2;
                      const od  = s(16) / sq2;  // outward offset component
                      const td  = s(5)  / sq2;  // tick half-size component
                      const sideLen = Math.round(GEO_FLAP_H);
                      const hLen    = Math.round(GEO_FLAP_H);

                      // W: along top-right side (Top→Right), outward normal = (1,-1)/√2
                      const wx1 = cx + od,     wy1 = cy - r - od;
                      const wx2 = cx + r + od, wy2 = cy     - od;
                      const wMX = (wx1 + wx2) / 2, wMY = (wy1 + wy2) / 2;

                      // H: along bottom-right side (Right→Bottom), outward normal = (1,1)/√2
                      const hx1 = cx + r + od, hy1 = cy     + od;
                      const hx2 = cx     + od, hy2 = cy + r + od;
                      const hMX = (hx1 + hx2) / 2, hMY = (hy1 + hy2) / 2;

                      return (
                        <g key={i} fill="none" stroke="#9333ea" strokeWidth={s(1.2)}>
                          {/* W line + ticks */}
                          <line x1={wx1} y1={wy1} x2={wx2} y2={wy2} />
                          <line x1={wx1 - td} y1={wy1 + td} x2={wx1 + td} y2={wy1 - td} />
                          <line x1={wx2 - td} y1={wy2 + td} x2={wx2 + td} y2={wy2 - td} />
                          <text x={wMX} y={wMY} fill="#9333ea" stroke="none"
                            fontSize={s(11)} fontWeight="800"
                            textAnchor="middle" dominantBaseline="middle"
                            transform={`rotate(-45 ${wMX} ${wMY})`}>
                            {i === 1 ? `H: ${sideLen} mm` : `W: ${sideLen} mm`}
                          </text>
                          {/* H line + ticks */}
                          <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} />
                          <line x1={hx1 - td} y1={hy1 - td} x2={hx1 + td} y2={hy1 + td} />
                          <line x1={hx2 - td} y1={hy2 - td} x2={hx2 + td} y2={hy2 + td} />
                          <text x={hMX} y={hMY} fill="#9333ea" stroke="none"
                            fontSize={s(11)} fontWeight="800"
                            textAnchor="middle" dominantBaseline="middle"
                            transform={`rotate(45 ${hMX} ${hMY})`}>
                            {i === 1 ? `W: ${hLen} mm` : `H: ${hLen} mm`}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

              {/* Key row dividers, highlighted red — rendered last so it stays on top of the
                  purple dimension lines that share some of the same positions */}
              <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, overflow: "visible" }} width={TOTAL_DIELINE_W * zoom} height={DIELINE_H_FULL * zoom}>
                {/* Top Lock Flap (Left)/(Right) — outer cut edges (left, top, right of each
                    diamond), leaving only the fold edge shared with Dust Flap Super Top red.
                    The diamond peak sits above y=0 in this SVG's own coordinate space (the
                    Top Lock Flap diamonds poke above the canvas top edge), so overflow must
                    stay visible or the N-tip arc gets clipped by the SVG's default bounds.
                    dielineFaces mirrors each face's position (regMirrorTotal - f.x - f.w) but
                    NOT its interior clip-path, so a diamond's local W/E tips land on the
                    OPPOSITE mx() point from what the raw world x would suggest — e.g. local
                    W-tip screen-x is mx(NX2 + TOP_LOCK_W), not mx(NX2 - TOP_LOCK_W). Endpoints
                    below are inset by the same radius/offset the roundDiamondTL/TR clip-path
                    uses so the stroke follows the rounded tip instead of overshooting past it. */}
                {(() => {
                  const rcr = 6 * zoom, roff = rcr / Math.SQRT2;
                  const k = TOP_LOCK_R * zoom; // == TOP_LOCK_W * zoom
                  const mx = (n: number) => (regMirrorTotal - n) * zoom;
                  const ny0 = NY0 * zoom;
                  return (
                    <g stroke="#1e3a8a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      {/* Left flap: rounded tips are local N & W; fold (red) is the local S↔E edge */}
                      <path d={`M ${mx(NX2)} ${ny0 + k}
                                L ${mx(NX2 + TOP_LOCK_W) + roff} ${ny0 + roff}
                                A ${rcr} ${rcr} 0 0 1 ${mx(NX2 + TOP_LOCK_W) + roff} ${ny0 - roff}
                                L ${mx(NX2) - roff} ${ny0 - k + roff}
                                A ${rcr} ${rcr} 0 0 1 ${mx(NX2) + roff} ${ny0 - k + roff}
                                L ${mx(NX2 - TOP_LOCK_W)} ${ny0}`} />
                      {/* Right flap: rounded tips are local N & E; fold (red) is the local W↔S edge */}
                      <path d={`M ${mx(NX1 + TOP_LOCK_W)} ${ny0}
                                L ${mx(NX1) - roff} ${ny0 - k + roff}
                                A ${rcr} ${rcr} 0 0 1 ${mx(NX1) + roff} ${ny0 - k + roff}
                                L ${mx(NX1 - TOP_LOCK_W) - roff} ${ny0 - roff}
                                A ${rcr} ${rcr} 0 0 1 ${mx(NX1 - TOP_LOCK_W) - roff} ${ny0 + roff}
                                L ${mx(NX1)} ${ny0 + k}`} />
                    </g>
                  );
                })()}
                {/* Top Side Flap (Left)/(Right) — outer cut edges (the wing outline minus the
                    straight edge that folds into the main body). Per the _dfSwaps table, the
                    div labeled "(Left)" actually uses the clipBottomLeft+clipTopRight geometry
                    anchored at NX2, and "(Right)" uses clipBottomRight+clipTopLeft anchored at
                    NX1 — verified empirically against the live clip-path/rect, since the swap
                    makes the naive world-x assumption unreliable (as it was for the diamonds). */}
                {(() => {
                  const mx = (n: number) => (regMirrorTotal - n) * zoom;
                  const w = LOCK_FLAP_SIZE * zoom;
                  const h = (DUST_H - TOP_LOCK_R) * zoom;
                  const cs = 8 * zoom;
                  const startY = Math.min(15 * zoom, h * 0.2);
                  const endY = h - startY;
                  const fy = (NY0 + TOP_LOCK_R) * zoom;
                  const fxLeft = mx(NX2) - w;
                  const fxRight = mx(NX1);
                  return (
                    <g stroke="#1e3a8a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d={`M ${fxLeft + w + 2} ${fy + h - cs}
                                Q ${fxLeft + w + 2} ${fy + h + 2} ${fxLeft + w - cs} ${fy + h + 2}
                                L ${fxLeft + cs} ${fy + endY + cs}
                                Q ${fxLeft} ${fy + endY} ${fxLeft} ${fy + endY - cs}
                                L ${fxLeft} ${fy + startY + cs}
                                Q ${fxLeft} ${fy + startY} ${fxLeft + cs} ${fy + startY - cs}
                                L ${fxLeft + w + 2} ${fy - 2}`} />
                      <path d={`M ${fxRight - 2} ${fy + h - cs}
                                Q ${fxRight - 2} ${fy + h + 2} ${fxRight + cs} ${fy + h + 2}
                                L ${fxRight + w - cs} ${fy + endY + cs}
                                Q ${fxRight + w + 2} ${fy + endY} ${fxRight + w + 2} ${fy + endY - cs}
                                L ${fxRight + w + 2} ${fy + startY + cs}
                                Q ${fxRight + w + 2} ${fy + startY} ${fxRight + w - cs} ${fy + startY - cs}
                                L ${fxRight - 2} ${fy - 2}`} />
                    </g>
                  );
                })()}
                {/* Side Wall Flap (Left)/(Right) — outer top + outer side edge, plus the
                    edge shared with Back Side (vertical, full row height). */}
                {(() => {
                  const mx = (n: number) => (regMirrorTotal - n) * zoom;
                  const yTop = NY_LID * zoom;
                  const yBot = (NY_LID + LID_H) * zoom;
                  const outerRight = mx(NX1) + LOCK_FLAP_SIZE * zoom; // Side Wall Flap (Left), screen-right
                  const innerRight = mx(NX1);
                  const outerLeft = mx(NX2) - LOCK_FLAP_SIZE * zoom;  // Side Wall Flap (Right), screen-left
                  const innerLeft = mx(NX2);
                  return (
                    <g stroke="#1e3a8a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d={`M ${innerLeft} ${yTop} L ${outerLeft} ${yTop} L ${outerLeft} ${yBot}`} />
                      <path d={`M ${innerRight} ${yTop} L ${outerRight} ${yTop} L ${outerRight} ${yBot}`} />
                      <line x1={innerLeft} y1={yTop} x2={innerLeft} y2={yBot} />
                      <line x1={innerRight} y1={yTop} x2={innerRight} y2={yBot} />
                    </g>
                  );
                })()}
                {/* Right Side Wall / Left Side Wall — outer vertical edge only (top is already
                    covered by the existing Back Side ↔ Base red line; bottom is left as-is). */}
                {(() => {
                  const mx = (n: number) => (regMirrorTotal - n) * zoom;
                  const ySwTop = NY_BASE * zoom;
                  // Right/Left Side Wall's own portion extends down only until it just touches
                  // Bottom Tuck Flap Left/Right's own outer edge (the (0.64,0)-(0.36,0.40)
                  // segment of its outline, and its mirror) — not past it, so the lines meet
                  // without crossing.
                  const tuckW = BOTTOM_LOCK_W * 2 + Math.round(BOTTOM_LOCK_W * 0.8);
                  const tuckH = BOTTOM_LOCK_W * 2;
                  const tTuck = (LOCK_FLAP_SIZE - 0.36 * tuckW) / (0.28 * tuckW);
                  const ySwBotTuck = (NY_BOT + tTuck * 0.40 * tuckH) * zoom;
                  const outerRight = mx(NX1) + LOCK_FLAP_SIZE * zoom; // Left Side Wall, screen-right
                  const outerLeft = mx(NX2) - LOCK_FLAP_SIZE * zoom;  // Right Side Wall, screen-left
                  return (
                    <g stroke="#1e3a8a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <line x1={outerLeft} y1={ySwTop} x2={outerLeft} y2={ySwBotTuck} />
                      <line x1={outerRight} y1={ySwTop} x2={outerRight} y2={ySwBotTuck} />
                    </g>
                  );
                })()}
                {/* Bottom Tuck Flap (Left)/(Right) — outline of the arrow-shaped tuck. The
                    peak-to-tip edge (local 0.64,0 → 1.00,0.50 and its mirror) is omitted:
                    those two points sit exactly on the adjacent Bottom Lock Flap diamond's
                    W/N and S vertices, so that edge is the diamond's own W↔S edge, already
                    its boundary — drawing it again here just duplicates a line that lands
                    on top of (and pokes into) the diamond's base vertex. */}
                {(() => {
                  const mx = (n: number) => (regMirrorTotal - n) * zoom;
                  const w = (BOTTOM_LOCK_W * 2 + Math.round(BOTTOM_LOCK_W * 0.8)) * zoom;
                  const h = BOTTOM_LOCK_W * 2 * zoom;
                  const fxLeft = mx(NX2) - w;
                  const fxRight = mx(NX1);
                  const fy = NY_BOT * zoom;
                  const pt = (fx: number, xPct: number, yPct: number) => `${fx + xPct * w} ${fy + yPct * h}`;
                  return (
                    <g stroke="#1e3a8a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d={`M ${pt(fxLeft, 0.29, 0.50)}
                                L ${pt(fxLeft, 0.36, 0.40)}
                                L ${pt(fxLeft, 0.64, 0)}`} />
                      <path d={`M ${pt(fxLeft, 1.00, 0.50)}
                                L ${pt(fxLeft, 0.71, 0.90)}
                                L ${pt(fxLeft, 0.64, 1.00)}
                                L ${pt(fxLeft, 0.43, 1.00)}
                                L ${pt(fxLeft, 0.29, 0.80)}
                                L ${pt(fxLeft, 0.29, 0.50)}`} />
                      <path d={`M ${pt(fxRight, 0.71, 0.50)}
                                L ${pt(fxRight, 0.64, 0.40)}
                                L ${pt(fxRight, 0.36, 0)}`} />
                      <path d={`M ${pt(fxRight, 0, 0.50)}
                                L ${pt(fxRight, 0.29, 0.90)}
                                L ${pt(fxRight, 0.36, 1.00)}
                                L ${pt(fxRight, 0.57, 1.00)}
                                L ${pt(fxRight, 0.71, 0.80)}
                                L ${pt(fxRight, 0.71, 0.50)}`} />
                      {/* Front Bottom Flap bottom edge, extended across the Bottom Lock Flap
                          gusset tabs on either side — the whole row's outer cut edge (their
                          top/left/right edges are folds, drawn red below; this is the one
                          free cut edge shared by all three faces at this row's bottom). */}
                      <line x1={(regMirrorTotal - NX2) * zoom} y1={(NY_BOT + topLockFlapH) * zoom}
                            x2={(regMirrorTotal - NX1) * zoom} y2={(NY_BOT + topLockFlapH) * zoom} />
                      {/* Bottom Lock Flap gusset ↔ Bottom Tuck Flap shared vertical edge —
                          from the tuck's tip (diamond's base vertex) down to the bottom edge. */}
                      <line x1={(regMirrorTotal - NX2) * zoom} y1={(NY_BOT + BOTTOM_LOCK_W) * zoom}
                            x2={(regMirrorTotal - NX2) * zoom} y2={(NY_BOT + topLockFlapH) * zoom} />
                      <line x1={(regMirrorTotal - NX1) * zoom} y1={(NY_BOT + BOTTOM_LOCK_W) * zoom}
                            x2={(regMirrorTotal - NX1) * zoom} y2={(NY_BOT + topLockFlapH) * zoom} />
                      {/* Bottom Lock Flap diamond's outer edge on the tuck-flap side — N vertex
                          down to the vertex shared with the tuck's peak, closing the gap between
                          the diamond and the tuck flap outline on the left/right. */}
                      <line x1={(regMirrorTotal - NX2) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                            x2={(regMirrorTotal - (NX2 + BOTTOM_LOCK_W)) * zoom} y2={NY_BOT * zoom} />
                      <line x1={(regMirrorTotal - NX1) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                            x2={(regMirrorTotal - (NX1 - BOTTOM_LOCK_W)) * zoom} y2={NY_BOT * zoom} />
                      {/* Bottom Lock Flap diamond's outer edge on the Front Bottom Flap side —
                          L vertex down to the base vertex, mirroring the tuck-flap-side edge
                          above so the diamond's boundary is fully closed on both sides. */}
                      <line x1={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y1={NY_BOT * zoom}
                            x2={(regMirrorTotal - NX2) * zoom} y2={(NY_BOT + BOTTOM_LOCK_W) * zoom} />
                      <line x1={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y1={NY_BOT * zoom}
                            x2={(regMirrorTotal - NX1) * zoom} y2={(NY_BOT + BOTTOM_LOCK_W) * zoom} />
                    </g>
                  );
                })()}
                <g stroke="#ef4444" strokeWidth={1.4 * zoom} strokeLinecap="round" strokeLinejoin="round" fill="none">
                  {/* Front Top Flap bottom edge ↔ Dust Flap Super Top */}
                  <line x1={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y1={NY0 * zoom}
                        x2={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y2={NY0 * zoom} />
                  {/* Left spine: diagonal into Top Lock Flap (Left) corner, then straight down
                      to the top of the Side Wall Flap (Right) / Back Side row — skips that row,
                      resumes below it down to the Bottom Lock Flap diamond's top corner */}
                  <path d={`M ${(regMirrorTotal - (NX2 - TOP_LOCK_W)) * zoom} ${NY0 * zoom}
                            L ${(regMirrorTotal - NX2) * zoom} ${(NY0 + TOP_LOCK_R) * zoom}
                            L ${(regMirrorTotal - NX2) * zoom} ${NY_LID * zoom}`} />
                  <path d={`M ${(regMirrorTotal - NX2) * zoom} ${NY_BASE * zoom}
                            L ${(regMirrorTotal - NX2) * zoom} ${(NY_BOT - BOTTOM_LOCK_W) * zoom}`} />
                  {/* Right spine: mirror of the above through Top Lock Flap (Right) — also skips
                      the Side Wall Flap (Left) / Back Side row */}
                  <path d={`M ${(regMirrorTotal - (NX1 + TOP_LOCK_W)) * zoom} ${NY0 * zoom}
                            L ${(regMirrorTotal - NX1) * zoom} ${(NY0 + TOP_LOCK_R) * zoom}
                            L ${(regMirrorTotal - NX1) * zoom} ${NY_LID * zoom}`} />
                  <path d={`M ${(regMirrorTotal - NX1) * zoom} ${NY_BASE * zoom}
                            L ${(regMirrorTotal - NX1) * zoom} ${(NY_BOT - BOTTOM_LOCK_W) * zoom}`} />
                  {/* Dust Flap Super Top ↔ Back Side row boundary — skips both the Side Wall
                      Flap (Right) and Side Wall Flap (Left) wings on top, covers Back Side only */}
                  <line x1={(regMirrorTotal - NX2) * zoom} y1={NY_LID * zoom}
                        x2={(regMirrorTotal - NX1) * zoom} y2={NY_LID * zoom} />
                  {/* Back Side ↔ Base row boundary, full width incl. wings */}
                  <line x1={(regMirrorTotal - (NX2 + LOCK_FLAP_SIZE)) * zoom} y1={NY_BASE * zoom}
                        x2={(regMirrorTotal - (NX1 - LOCK_FLAP_SIZE)) * zoom} y2={NY_BASE * zoom} />
                  {/* Left Bottom Triangle top edge */}
                  <line x1={(regMirrorTotal - NX2) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                        x2={(regMirrorTotal - (NX2 + LOCK_FLAP_SIZE)) * zoom} y2={(NY_BOT - BOTTOM_LOCK_W) * zoom} />
                  {/* Right Bottom Triangle top edge */}
                  <line x1={(regMirrorTotal - NX1) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                        x2={(regMirrorTotal - (NX1 - LOCK_FLAP_SIZE)) * zoom} y2={(NY_BOT - BOTTOM_LOCK_W) * zoom} />
                  {/* Front Bottom Flap top edge */}
                  <line x1={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y1={NY_BOT * zoom}
                        x2={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y2={NY_BOT * zoom} />
                  {/* Front Bottom Flap left edge */}
                  <line x1={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y1={NY_BOT * zoom}
                        x2={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y2={(NY_BOT + topLockFlapH) * zoom} />
                  {/* Front Bottom Flap right edge */}
                  <line x1={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y1={NY_BOT * zoom}
                        x2={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y2={(NY_BOT + topLockFlapH) * zoom} />
                  {/* Base's chamfered corner ↔ Bottom Lock Flap diamond (the diamond's other
                      top edge, opposite side from the Left Bottom Triangle wedge) */}
                  <line x1={(regMirrorTotal - NX2) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                        x2={(regMirrorTotal - (NX2 - BOTTOM_LOCK_W)) * zoom} y2={NY_BOT * zoom} />
                  {/* Base's chamfered corner ↔ Bottom Lock Flap Right diamond */}
                  <line x1={(regMirrorTotal - NX1) * zoom} y1={(NY_BOT - BOTTOM_LOCK_W) * zoom}
                        x2={(regMirrorTotal - (NX1 + BOTTOM_LOCK_W)) * zoom} y2={NY_BOT * zoom} />
                </g>
              </svg>

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
                const face = dielineFaces.find(f => f.id === selectedFace);
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

              {/* Global items overlay */}
              {(vd.globalItems ?? []).map(item => {
                const isSel = selectedItemId === item.id && selectedItemIsGlobal;
                const isEd = editingItemId === item.id && selectedItemIsGlobal;
                if (item.kind === "text") {
                  return (
                    <div key={item.id + (isEd ? "-e" : "")} contentEditable={isEd} suppressContentEditableWarning
                      autoFocus={isEd}
                      style={{ position: "absolute", left: item.x * zoom, top: item.y * zoom, width: item.w * zoom, fontFamily: item.font, fontSize: `${item.size * zoom}px`, fontWeight: item.bold ? 700 : 400, color: item.color, textAlign: item.align, padding: "2px 4px", outline: isEd ? "none" : isSel ? "1.5px solid #f59e0b" : "none", outlineOffset: "0px", borderRadius: 2, cursor: isEd ? "text" : "move", userSelect: isEd ? "text" : "none", whiteSpace: "pre-wrap", wordBreak: "break-word", zIndex: isSel ? 25 : 15, background: "transparent" }}
                      onPointerDown={e => { if (isEd) return; e.stopPropagation(); setSelectedFace(null); setSelectedItemId(item.id); setSelectedItemIsGlobal(true); startDragGlobalItem(e, item); }}
                      onDoubleClick={e => { e.stopPropagation(); setEditingItemId(item.id); }}
                      onBlur={e => { updateGlobalItem(item.id, { text: e.currentTarget.textContent ?? item.text }); setEditingItemId(null); }}
                      onClick={e => e.stopPropagation()}
                    >{item.text}
                      {isSel && !isEd && (
                        <>
                          {(["tl","tr","bl","br"] as const).map(c => (
                            <div key={c} onPointerDown={e => startResizeGlobalItem(e, item, c)} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: c === "tl" ? "nw-resize" : c === "tr" ? "ne-resize" : c === "bl" ? "sw-resize" : "se-resize", ...(c[0]==="t" ? { top: -4 } : { bottom: -4 }), ...(c[1]==="l" ? { left: -4 } : { right: -4 }) }} />
                          ))}
                          <div onPointerDown={e => startResizeGlobalItem(e, item, "l")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: "ew-resize", left: -4, top: "calc(50% - 4px)" }} />
                          <div onPointerDown={e => startResizeGlobalItem(e, item, "r")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: "ew-resize", right: -4, top: "calc(50% - 4px)" }} />
                        </>
                      )}
                    </div>
                  );
                }
                if (item.kind === "image") {
                  return (
                    <div key={item.id} style={{ position: "absolute", left: item.x * zoom, top: item.y * zoom, width: item.w * zoom, height: item.h * zoom, outline: isSel ? "1.5px solid #f59e0b" : "none", outlineOffset: "0px", cursor: "move", zIndex: isSel ? 25 : 15, overflow: "hidden" }}
                      onPointerDown={e => { e.stopPropagation(); setSelectedFace(null); setSelectedItemId(item.id); setSelectedItemIsGlobal(true); startDragGlobalItem(e, item); }}
                      onClick={e => e.stopPropagation()}
                    >
                      <img src={item.src} alt="" draggable={false} style={{ width: `${item.w * zoom}px`, height: `${item.h * zoom}px`, display: "block", pointerEvents: "none" }} />
                      {isSel && (
                        <>
                          <button onClick={e => { e.stopPropagation(); removeGlobalItem(item.id); setSelectedItemId(null); }} style={{ position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>✕</button>
                          {(["tl","tr","bl","br"] as const).map(c => (
                            <div key={c} onPointerDown={e => startResizeGlobalItem(e, item, c)} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: c === "tl" ? "nw-resize" : c === "tr" ? "ne-resize" : c === "bl" ? "sw-resize" : "se-resize", ...(c[0]==="t" ? { top: -4 } : { bottom: -4 }), ...(c[1]==="l" ? { left: -4 } : { right: -4 }) }} />
                          ))}
                          <div onPointerDown={e => startResizeGlobalItem(e, item, "l")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: "ew-resize", left: -4, top: "calc(50% - 4px)" }} />
                          <div onPointerDown={e => startResizeGlobalItem(e, item, "r")} style={{ position: "absolute", width: 8, height: 8, background: "#fff", border: "1.5px solid #f59e0b", borderRadius: 2, zIndex: 30, cursor: "ew-resize", right: -4, top: "calc(50% - 4px)" }} />
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              })}
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
            {selectedItemId && (selectedFace || selectedItemIsGlobal) && (
              <button onClick={() => { if (selectedItemIsGlobal) { removeGlobalItem(selectedItemId); } else if (selectedFace) { removeItem(selectedFace, selectedItemId); } setSelectedItemId(null); }} style={{ position: "absolute", right: "1.5rem", padding: "0.4rem 1rem", border: "1px solid #fca5a5", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>Delete</button>
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
                <Box3DPreview faceColors={state.outside.faceColors} insideFaceColors={state.inside.faceColors} insideColor={state.insideColor} outsideItems={state.outside.items} insideItems={state.inside.items} outsideGlobalItems={outGlobalForPreview} insideGlobalItems={inGlobalForPreview} openAmount={openAmount} rotX={rotX} rotY={rotY} geo={geo} />
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
                <button key={v} onClick={() => { setView(v); setSelectedFace(null); setSelectedItemId(null); setShowFaceColorPopup(false); setSelectedItemIsGlobal(false); }} style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", background: view === v ? "#fff" : "transparent", color: view === v ? "#111827" : "#6b7280", boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none", textTransform: "capitalize" }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* ── Finalize Your Order modal ─────────────────────────────────────── */}
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
                outsideGlobalItems={outGlobalForPreview}
                insideGlobalItems={inGlobalForPreview}
                openAmount={100}
                rotX={finalRotX}
                rotY={finalRotY}
                geo={geo}
              />
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Drag to rotate</p>
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
              <label htmlFor="pb-qty-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Quantity
              </label>
              <input
                id="pb-qty-input"
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={selectedQty === 0 ? "" : selectedQty}
                onChange={(e) => { const v = parseInt(e.target.value, 10); setSelectedQty(isNaN(v) || v < 1 ? 0 : v); }}
                style={{ width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: "0.95rem", fontWeight: 700, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e)  => (e.target.style.borderColor = "#e5e7eb")}
              />
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
                // Generate 2.5D box thumbnail
                let thumb: string | undefined;
                try {
                  const fc = state.outside.faceColors;
                  const DEFAULT = "#c8a97e";
                  const frontColor = fc["front"] ?? DEFAULT;
                  const rightColor = fc["side-right"] ?? frontColor;
                  const topColor   = fc["lid"] ?? frontColor;
                  const mix = (hex: string, amount: number) => {
                    const n = parseInt(hex.replace("#",""), 16);
                    const r = Math.round(((n >> 16) & 0xff) * amount);
                    const g = Math.round(((n >> 8)  & 0xff) * amount);
                    const b = Math.round(((n)       & 0xff) * amount);
                    return `rgb(${r},${g},${b})`;
                  };
                  const cv = document.createElement("canvas");
                  cv.width = 160; cv.height = 160;
                  const ctx = cv.getContext("2d")!;
                  ctx.fillStyle = "#f5f5f5"; ctx.fillRect(0, 0, 160, 160);
                  // Mailer box is wider than tall (BW=315, BH derived from FLAP_H — see geometry constants)
                  const W = 88, H = 56, D = 18;
                  const sx = 12, sy = 62;
                  ctx.fillStyle = topColor;
                  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+D, sy-D); ctx.lineTo(sx+W+D, sy-D); ctx.lineTo(sx+W, sy); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = mix(rightColor, 0.78);
                  ctx.beginPath(); ctx.moveTo(sx+W, sy); ctx.lineTo(sx+W+D, sy-D); ctx.lineTo(sx+W+D, sy+H-D); ctx.lineTo(sx+W, sy+H); ctx.closePath(); ctx.fill();
                  ctx.fillStyle = frontColor; ctx.fillRect(sx, sy, W, H);
                  ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1.5;
                  ctx.strokeRect(sx, sy, W, H);
                  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx+D, sy-D); ctx.lineTo(sx+W+D, sy-D); ctx.lineTo(sx+W, sy); ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(sx+W+D, sy-D); ctx.lineTo(sx+W+D, sy+H-D); ctx.lineTo(sx+W, sy+H); ctx.stroke();
                  thumb = cv.toDataURL("image/jpeg", 0.92);
                } catch { /* ignore */ }
                // Generate per-face canvas snapshots for admin preview
                const DEFAULT_FC = "#c8a97e";
                const fc2 = state.outside.faceColors;
                // Project global items onto faces with face-relative coordinates
                const globalProjected2 = projectGlobalItemsToFaces(state.outside.globalItems ?? [], FACES_OUTSIDE);
                const fi = (id: string): CanvasItem[] => {
                  const fDef = FACES_OUTSIDE.find(f => f.id === id);
                  const perFace = state.outside.items[id] ?? [];
                  if (!fDef) return perFace;
                  const translated = (globalProjected2[id] ?? []).map(item => ({ ...item, x: item.x - fDef.x, y: item.y - fDef.y }));
                  return [...translated, ...perFace];
                };
                let boxFaceImages: { front?: string; right?: string; top?: string } = {};
                try {
                  const [front, right, top] = await Promise.all([
                    renderFaceToCanvas(fc2["front"] ?? DEFAULT_FC, fi("front"), BW, BH),
                    renderFaceToCanvas(fc2["side-right"] ?? DEFAULT_FC, fi("side-right"), BD, BH),
                    renderFaceToCanvas(fc2["lid"] ?? DEFAULT_FC, fi("lid"), BW, LID_H),
                  ]);
                  boxFaceImages = { front, right, top };
                } catch { /* ignore */ }
                const cartId = Date.now().toString();
                try {
                  const raw = product.startingPrice?.trim() ?? "";
                  const ppu = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
                  const existing = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<Record<string, unknown>>;
                  const previewBoxColor = Object.values(state.outside.faceColors)[0] ?? "#c8a97e";
                  existing.push({ id: cartId, name: product.name, qty: selectedQty, pricePerUnit: ppu, total: ppu * selectedQty, thumb, boxFaceImages, previewBoxColor, previewW: BW, previewH: BH, previewD: BD });
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
                background: designApproved && selectedQty >= 1 ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#e5e7eb",
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

    {/* ── Checkout Overlay ──────────────────────────────────────────────────── */}
    {checkoutOpen && (() => {
      const raw = product.startingPrice?.trim() ?? "";
      const pricePerUnit = parseFloat(raw.replace(/[^0-9.]/g, ""));
      return (
        <CheckoutOverlay
          productName={product.name ?? "Packaging Box"}
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
          previewRender={(rx, ry) => (
            <Box3DPreview
              faceColors={state.outside.faceColors}
              insideFaceColors={state.inside.faceColors}
              insideColor={state.insideColor}
              outsideItems={state.outside.items}
              insideItems={state.inside.items}
              outsideGlobalItems={outGlobalForPreview}
              insideGlobalItems={inGlobalForPreview}
              openAmount={100}
              rotX={rx}
              rotY={ry}
              geo={geo}
            />
          )}
        />
      );
    })()}

    {/* ── Box 3D Preview Modal (from checkout thumbnail click) ── */}
    {boxPreviewOpen && (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)", padding: "0 28px", height: 54, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{product.name}</span>
          <button onClick={() => setBoxPreviewOpen(false)} style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", overflow: "hidden" }}>
          <div
            style={{ cursor: "grab", userSelect: "none", transform: "scale(2.4)", transformOrigin: "center center" }}
            onMouseDown={(e) => {
              const startX = e.clientX, startY = e.clientY;
              const startRX = boxPreviewRotRef.current.rx, startRY = boxPreviewRotRef.current.ry;
              const onMove = (me: MouseEvent) => {
                boxPreviewRotRef.current.ry = startRY + (me.clientX - startX) * 0.5;
                boxPreviewRotRef.current.rx = Math.max(-80, Math.min(80, startRX - (me.clientY - startY) * 0.5));
                setBoxPreviewRotX(boxPreviewRotRef.current.rx);
                setBoxPreviewRotY(boxPreviewRotRef.current.ry);
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
              geo={geo}
            />
          </div>
        </div>
        <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "10px 28px", display: "flex", justifyContent: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>Drag to rotate</span>
        </div>
      </div>
    )}

  </Fragment>);
}
