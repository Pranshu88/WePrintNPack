"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { ShirtProduct, ShirtColor } from "@/lib/shirt-data";
import type { GalleryTemplate, DesignTemplateItem, DesignColorVariant, SerializableItem } from "@/lib/template-data";
import AuthModal from "@/components/auth-modal";

// ─── Canvas config ────────────────────────────────────────────────────────────
const SHIRT_DIMS         = { CW: 460, CH: 560, PX: 100, PY: 100, PW: 260, PH: 300 };
const BC_DIMS            = { CW: 460, CH: 270, PX: 30,  PY: 25,  PW: 400, PH: 220 };
// Express Flyer: 8.5" × 5.5" at ~54px/inch
const FLYER_EXPRESS_DIMS = { CW: 460, CH: 297, PX: 20,  PY: 15,  PW: 420, PH: 267 };
// Prime Flyer: 8.5" × 11" at ~54px/inch
const FLYER_PRIME_DIMS   = { CW: 1700, CH: 1098, PX: 20,  PY: 20,  PW: 1660, PH: 1058 };
// Small Poster: 11" × 17" (portrait)
const POSTER_SMALL_DIMS  = { CW: 440, CH: 680, PX: 20,  PY: 20,  PW: 400, PH: 640 };
// Large Poster: 18" × 24" (3:4 ratio)
const POSTER_LARGE_DIMS  = { CW: 440, CH: 660, PX: 20,  PY: 20,  PW: 400, PH: 620 };
// Vinyl Banner: same canvas as Large Outdoor Banner (2:1 landscape)
const BANNER_VINYL_DIMS  = { CW: 950, CH: 475, PX: 15,  PY: 15,  PW: 920, PH: 445 };
// Large Outdoor Banner: 4' × 8' landscape (2:1 ratio) — same width as Roll-Up Banner
const BANNER_OUTDOOR_DIMS = { CW: 950, CH: 475, PX: 15, PY: 15,  PW: 920, PH: 445 };
// Roll-Up Banner: 33" × 81" portrait (matches 240×600 SVG viewBox)
const BANNER_ROLLUP_DIMS = { CW: 950, CH: 950, PX: 15,  PY: 15,  PW: 920, PH: 920 };
// Yard Sign: 8.5" × 5.5" landscape (matches 600×450 SVG viewBox used in seed-yardsigns.mjs)
const YARD_SIGN_DIMS = { CW: 600, CH: 450, PX: 0, PY: 0, PW: 600, PH: 450 };
// Sticker / Label: canvas scaled to MAX 260px — overridden dynamically per template viewBox
const LABEL_MAX_PX = 260;
const LABEL_DIMS_DEFAULT = { CW: LABEL_MAX_PX, CH: LABEL_MAX_PX, PX: 0, PY: 0, PW: LABEL_MAX_PX, PH: LABEL_MAX_PX, coordScale: 1 };

// Parse viewBox from an SVG data URL — returns null if not parseable
function parseSvgViewBox(url: string): { vw: number; vh: number } | null {
  try {
    let raw = "";
    if (url.startsWith("data:image/svg+xml")) {
      const comma = url.indexOf(",");
      if (comma === -1) return null;
      const meta = url.slice(0, comma);
      const enc  = url.slice(comma + 1);
      raw = meta.includes(";base64") ? atob(enc) : decodeURIComponent(enc);
    } else { return null; }
    const m = raw.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (!m) return null;
    const parts = m[1].trim().split(/[\s,]+/);
    if (parts.length < 4) return null;
    const vw = parseFloat(parts[2]);
    const vh = parseFloat(parts[3]);
    return vw > 0 && vh > 0 ? { vw, vh } : null;
  } catch { return null; }
}
function computeLabelDims(vw: number, vh: number) {
  const coordScale = LABEL_MAX_PX / Math.max(vw, vh);
  const CW = Math.round(vw * coordScale);
  const CH = Math.round(vh * coordScale);
  return { CW, CH, PX: 0, PY: 0, PW: CW, PH: CH, coordScale };
}

// Business card outline SVG (transparent fill, just a border)
const BC_CARD_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">' +
    '<rect width="460" height="270" rx="10" fill="none" stroke="#d1d5db" stroke-width="1.5"/>' +
    "</svg>"
  );

const FONT_OPTIONS: { label: string; value: string; previewWeight?: number }[] = [
  { label: "Abel",                        value: "'Abel', sans-serif" },
  { label: "Adelle",                      value: "'Adelle', serif" },
  { label: "Advent Pro",                  value: "'Advent Pro', sans-serif" },
  { label: "Alegreya Black",             value: "'Alegreya', serif",                      previewWeight: 900 },
  { label: "Alex Brush",                 value: "'Alex Brush', cursive" },
  { label: "Allison",                    value: "'Allison', cursive" },
  { label: "Alumni Sans",                value: "'Alumni Sans', sans-serif" },
  { label: "Amaranth",                   value: "'Amaranth', sans-serif",                 previewWeight: 700 },
  { label: "Antic Slab",                 value: "'Antic Slab', serif" },
  { label: "Archivo",                    value: "'Archivo', sans-serif" },
  { label: "Archivo Narrow",             value: "'Archivo Narrow', sans-serif" },
  { label: "Arimo",                      value: "'Arimo', sans-serif" },
  { label: "Barlow Semi Condensed",      value: "'Barlow Semi Condensed', sans-serif" },
  { label: "Bellefair",                  value: "'Bellefair', serif" },
  { label: "Bellota",                    value: "'Bellota', cursive" },
  { label: "Benchnine",                  value: "'BenchNine', sans-serif" },
  { label: "Bevan",                      value: "'Bevan', serif",                         previewWeight: 700 },
  { label: "BioRhyme Expanded",          value: "'BioRhyme Expanded', serif" },
  { label: "Blazma",                     value: "'Blazma', sans-serif" },
  { label: "Boogaloo",                   value: "'Boogaloo', cursive" },
  { label: "Bowlby One",                 value: "'Bowlby One', cursive",                  previewWeight: 700 },
  { label: "BravoSC",                    value: "'BravoSC', serif" },
  { label: "Bree Serif",                 value: "'Bree Serif', serif" },
  { label: "Carrois Gothic",             value: "'Carrois Gothic', sans-serif" },
  { label: "Chomsky",                    value: "'Chomsky', fantasy" },
  { label: "Cinzel Medium",              value: "'Cinzel', serif",                        previewWeight: 500 },
  { label: "Comic Neue",                 value: "'Comic Neue', cursive" },
  { label: "Cookie",                     value: "'Cookie', cursive" },
  { label: "Corinthia",                  value: "'Corinthia', cursive" },
  { label: "Cormorant Garamond",         value: "'Cormorant Garamond', serif" },
  { label: "Cormorant Infant",           value: "'Cormorant Infant', serif" },
  { label: "Cormorant SC",               value: "'Cormorant SC', serif" },
  { label: "Crete Round",                value: "'Crete Round', serif",                   previewWeight: 700 },
  { label: "Crimson Pro",                value: "'Crimson Pro', serif" },
  { label: "Ephesis",                    value: "'Ephesis', cursive" },
  { label: "Euphoria Script",            value: "'Euphoria Script', cursive" },
  { label: "Fanwood Text",               value: "'Fanwood Text', serif" },
  { label: "Fira Sans",                  value: "'Fira Sans', sans-serif" },
  { label: "Fira Sans Extra Condensed",  value: "'Fira Sans Extra Condensed', sans-serif" },
  { label: "Fjalla One",                 value: "'Fjalla One', sans-serif",               previewWeight: 700 },
  { label: "Fondamento",                 value: "'Fondamento', cursive" },
  { label: "Forum",                      value: "'Forum', cursive" },
  { label: "Fruktur",                    value: "'Fruktur', cursive",                     previewWeight: 700 },
  { label: "Fugaz One",                  value: "'Fugaz One', cursive" },
  { label: "Gelasio",                    value: "'Gelasio', serif" },
  { label: "Gilda Display",              value: "'Gilda Display', serif" },
  { label: "Gochi Hand",                 value: "'Gochi Hand', cursive" },
  { label: "Godia SemiCondensed",        value: "'Godia SemiCondensed', sans-serif" },
  { label: "Grand Hotel",                value: "'Grand Hotel', cursive" },
  { label: "Grandstander",               value: "'Grandstander', cursive",                previewWeight: 700 },
  { label: "Great Vibes",                value: "'Great Vibes', cursive" },
  { label: "Griffy",                     value: "'Griffy', cursive" },
  { label: "Gruppo",                     value: "'Gruppo', cursive" },
  { label: "Gwendolyn",                  value: "'Gwendolyn', cursive" },
  { label: "Henny Penny",                value: "'Henny Penny', cursive" },
  { label: "Ingrid Darling",             value: "'Ingrid Darling', cursive" },
  { label: "Irish Grover",               value: "'Irish Grover', cursive",                previewWeight: 700 },
  { label: "Italiana",                   value: "'Italiana', serif" },
  { label: "Josefin Sans",               value: "'Josefin Sans', sans-serif" },
  { label: "Jost",                       value: "'Jost', sans-serif" },
  { label: "Joti One",                   value: "'Joti One', cursive" },
  { label: "Kalam",                      value: "'Kalam', cursive" },
  { label: "Lato",                       value: "'Lato', sans-serif" },
  { label: "Lobster",                    value: "'Lobster', cursive",                     previewWeight: 700 },
  { label: "Lobster Two",                value: "'Lobster Two', cursive",                 previewWeight: 700 },
  { label: "Mallanna",                   value: "'Mallanna', sans-serif" },
  { label: "Mea Culpa",                  value: "'Mea Culpa', cursive" },
  { label: "MonteCarlo",                 value: "'MonteCarlo', cursive" },
  { label: "Montez",                     value: "'Montez', cursive" },
  { label: "Montserrat",                 value: "'Montserrat', sans-serif",               previewWeight: 700 },
  { label: "Moon Dance",                 value: "'Moondance', cursive" },
  { label: "Mr Dafoe",                   value: "'Mr Dafoe', cursive",                    previewWeight: 700 },
  { label: "Mystery Quest",              value: "'Mystery Quest', cursive" },
  { label: "Nunito Sans",                value: "'Nunito Sans', sans-serif" },
  { label: "Oleo Script Swash Caps",     value: "'Oleo Script Swash Caps', cursive",      previewWeight: 700 },
  { label: "Open Sans",                  value: "'Open Sans', sans-serif" },
  { label: "Pacifico",                   value: "'Pacifico', cursive",                    previewWeight: 700 },
  { label: "Parisienne",                 value: "'Parisienne', cursive" },
  { label: "Petit Formal Script",        value: "'Petit Formal Script', cursive" },
  { label: "Pinyon Script",              value: "'Pinyon Script', cursive" },
  { label: "Pirata One",                 value: "'Pirata One', cursive" },
  { label: "Playfair Display Black",     value: "'Playfair Display', serif",              previewWeight: 900 },
  { label: "Poiret One",                 value: "'Poiret One', cursive" },
  { label: "QT Bookmann",                value: "'QT Bookmann', serif" },
  { label: "QT BrushStroke",             value: "'QT BrushStroke', cursive" },
  { label: "QT Caslan",                  value: "'QT Caslan', serif" },
  { label: "QT CaslanOpen",              value: "'QT CaslanOpen', serif" },
  { label: "QT Casual",                  value: "'QT Casual', sans-serif",                previewWeight: 700 },
  { label: "QT Graveure",                value: "'QT Graveure', sans-serif" },
  { label: "QT Impromptu",               value: "'QT Impromptu', sans-serif",             previewWeight: 700 },
  { label: "QT Jupiter",                 value: "'QT Jupiter', serif",                    previewWeight: 700 },
  { label: "QT Linoscroll",              value: "'QT Linoscroll', fantasy" },
  { label: "QT Linostroke",              value: "'QT Linostroke', fantasy" },
  { label: "QT Military",                value: "'QT Military', sans-serif",              previewWeight: 700 },
  { label: "QT OKCorral",                value: "'QT OKCorral', cursive",                 previewWeight: 700 },
  { label: "QT OldGoudy",                value: "'QT OldGoudy', serif" },
  { label: "QT VagaRound",               value: "'QT VagaRound', sans-serif" },
  { label: "Quattrocento",               value: "'Quattrocento', serif" },
  { label: "Quicksand",                  value: "'Quicksand', sans-serif" },
  { label: "Risque",                     value: "'Risque', cursive" },
  { label: "Roboto Slab",                value: "'Roboto Slab', serif" },
  { label: "Sacramento",                 value: "'Sacramento', cursive" },
  { label: "Sail",                       value: "'Sail', cursive" },
  { label: "Sarabun",                    value: "'Sarabun', sans-serif" },
  { label: "Satisfy",                    value: "'Satisfy', cursive" },
  { label: "Science Gothic",             value: "'Science Gothic', sans-serif",           previewWeight: 700 },
  { label: "Secuela",                    value: "'Secuela', sans-serif" },
  { label: "Shalimar",                   value: "'Shalimar', cursive" },
  { label: "Shrikhand",                  value: "'Shrikhand', cursive",                   previewWeight: 700 },
  { label: "Slabo 27Px",                 value: "'Slabo 27px', serif" },
  { label: "Smooch",                     value: "'Smooch', cursive" },
  { label: "Sofia",                      value: "'Sofia', cursive" },
  { label: "Stalemate",                  value: "'Stalemate', cursive" },
  { label: "Stint Ultra Expanded",       value: "'Stint Ultra Expanded', serif" },
  { label: "Style Script",               value: "'Style Script', cursive" },
  { label: "Sunshiney",                  value: "'Sunshiney', cursive" },
  { label: "Teko",                       value: "'Teko', sans-serif" },
  { label: "TeXGyre Heros",              value: "'TeX Gyre Heros', sans-serif" },
  { label: "TeXGyre Termes",             value: "'TeX Gyre Termes', serif" },
  { label: "Trade Winds",                value: "'Trade Winds', cursive" },
  { label: "Troubleside",                value: "'Troubleside', sans-serif",              previewWeight: 700 },
  { label: "Truculenta",                 value: "'Truculenta', sans-serif" },
  { label: "Twinkle Star",               value: "'Twinkle Star', cursive" },
  { label: "WindSong",                   value: "'WindSong', cursive" },
  { label: "Yesteryear",                 value: "'Yesteryear', cursive" },
  { label: "YoungSerif",                 value: "'Young Serif', serif",                   previewWeight: 700 },
  { label: "Zilla Slab",                 value: "'Zilla Slab', serif" },
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    setTimeout(() => selectedRef.current?.scrollIntoView({ block: "center" }), 0);
    const handler = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = FONT_OPTIONS.find(f => f.value === value) ?? FONT_OPTIONS[0];

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          padding: "0.3rem 0.5rem 0.3rem 0.6rem",
          border: "1px solid #d1d5db", borderRadius: "6px",
          background: "#fff", cursor: "pointer", fontSize: "0.9rem",
          fontFamily: selected.value, fontWeight: selected.previewWeight ?? "normal",
          maxWidth: "170px", minWidth: "110px", flexShrink: 0,
          overflow: "hidden", whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: "4px",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontFamily: selected.value, fontWeight: selected.previewWeight ?? "normal" }}>
          {selected.label}
        </span>
        <span style={{ fontSize: "0.55rem", color: "#9ca3af", flexShrink: 0, fontFamily: "sans-serif", fontWeight: "normal" }}>▼</span>
      </button>
      {open && (
        <div
          ref={dropRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
            background: "#fff", borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", width: "270px",
            maxHeight: "380px", overflowY: "auto", padding: "6px 0",
          }}
        >
          {FONT_OPTIONS.map(f => {
            const isSel = f.value === value;
            return (
              <div
                key={f.value}
                ref={isSel ? selectedRef : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(f.value); setOpen(false); }}
                style={{
                  padding: "7px 16px",
                  margin: isSel ? "1px 8px" : "0",
                  cursor: "pointer",
                  fontSize: "1.05rem",
                  lineHeight: 1.4,
                  fontFamily: f.value,
                  fontWeight: f.previewWeight ?? "normal",
                  background: isSel ? "#f3f4f6" : "transparent",
                  borderRadius: isSel ? "8px" : "0",
                  userSelect: "none",
                }}
              >
                {f.label}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const TEXT_COLORS = [
  "#000000", "#ffffff", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#1d4ed8",
  "#7c3aed", "#db2777",
];

const GRAPHIC_COLORS = [
  "#374151", "#000000", "#ffffff", "#dc2626", "#ea580c",
  "#f59e0b", "#16a34a", "#0891b2", "#1d4ed8", "#7c3aed",
  "#db2777", "#9ca3af", "#ca8a04", "#0f172a", "#1e3a8a",
];

// Replace all non-none fills in an SVG data URL with a new color.
function patchGraphicColor(src: string, color: string): string {
  if (!src.startsWith("data:image/svg+xml")) return src;
  try {
    const encoded = src.split(",").slice(1).join(",");
    const raw = src.includes(";base64,") ? atob(encoded) : decodeURIComponent(encoded);
    let patched = raw.replace(/\bfill="([^"]+)"/g, (match, val) => {
      if (val === "none" || val === "transparent" || val.startsWith("url(")) return match;
      return `fill="${color}"`;
    });
    // Also patch stroke so dotted/outline shapes (fill="none") get color-updated too
    patched = patched.replace(/\bstroke="([^"]+)"/g, (match, val) => {
      if (val === "none" || val === "transparent" || val.startsWith("url(")) return match;
      return `stroke="${color}"`;
    });
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(patched);
  } catch { return src; }
}

// Read the first non-none fill (or stroke for outline-only shapes) from an SVG data URL.
function readGraphicColor(src: string): string {
  if (!src.startsWith("data:image/svg+xml")) return "#374151";
  try {
    const encoded = src.split(",").slice(1).join(",");
    const raw = src.includes(";base64,") ? atob(encoded) : decodeURIComponent(encoded);
    const mFill = raw.match(/\bfill="([^"]+)"/);
    if (mFill && mFill[1] !== "none" && mFill[1] !== "transparent" && !mFill[1].startsWith("url(")) return mFill[1];
    // Fallback: stroke color (for dotted/outline shapes with fill="none")
    const mStroke = raw.match(/\bstroke="([^"]+)"/);
    if (mStroke && mStroke[1] !== "none" && mStroke[1] !== "transparent" && !mStroke[1].startsWith("url(")) return mStroke[1];
  } catch { /* ignore */ }
  return "#374151";
}

const OVERLAY_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#000000" },
  { label: "Red", value: "#dc2626" },
  { label: "Royal Blue", value: "#1d4ed8" },
  { label: "Navy", value: "#1e3a5f" },
  { label: "Green", value: "#15803d" },
  { label: "Gold", value: "#ca8a04" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Silver", value: "#9ca3af" },
];

const BG_COLOR_PRESETS = [
  { label: "White", value: "#ffffff" },
  { label: "Cream", value: "#fefce8" },
  { label: "Light Blue", value: "#eff6ff" },
  { label: "Light Gray", value: "#f9fafb" },
  { label: "Black", value: "#111827" },
  { label: "Navy", value: "#1e3a8a" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#15803d" },
  { label: "Gold", value: "#ca8a04" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Teal", value: "#0d9488" },
];

const GRAPHIC_SHAPES = [
  {
    label: "Circle",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><circle cx="50" cy="50" r="48" fill="#374151"/></svg>`,
    preview: <circle cx="50" cy="50" r="48" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Square",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" rx="4" fill="#374151"/></svg>`,
    preview: <rect x="2" y="2" width="96" height="96" rx="4" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Star",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151"/></svg>`,
    preview: <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Arrow",
    w: 120, h: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" preserveAspectRatio="none"><polygon points="0,15 80,15 80,0 120,30 80,60 80,45 0,45" fill="#374151"/></svg>`,
    preview: <polygon points="0,15 80,15 80,0 120,30 80,60 80,45 0,45" fill="#374151" />,
    vb: "0 0 120 60",
  },
  {
    label: "Line",
    w: 120, h: 8,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 8" preserveAspectRatio="none"><rect x="0" y="0" width="120" height="8" rx="3" fill="#374151"/></svg>`,
    preview: <rect x="0" y="7" width="120" height="6" rx="3" fill="#374151" />,
    vb: "0 0 120 8",
  },
  {
    label: "Slim Line",
    w: 120, h: 2,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 2" preserveAspectRatio="none"><rect x="0" y="0" width="120" height="2" fill="#374151"/></svg>`,
    preview: <rect x="0" y="8" width="120" height="2" fill="#374151" />,
    vb: "0 0 120 2",
  },
  {
    label: "V. Line",
    w: 8, h: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 120" preserveAspectRatio="none"><rect x="0" y="0" width="8" height="120" rx="3" fill="#374151"/></svg>`,
    preview: <rect x="0" y="0" width="8" height="120" rx="3" fill="#374151" />,
    vb: "0 0 8 120",
  },
  {
    label: "V. Slim",
    w: 2, h: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 120" preserveAspectRatio="none"><rect x="0" y="0" width="2" height="120" fill="#374151"/></svg>`,
    preview: <rect x="0" y="0" width="2" height="120" fill="#374151" />,
    vb: "0 0 2 120",
  },
  {
    label: "Diamond",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 98,50 50,98 2,50" fill="#374151"/></svg>`,
    preview: <polygon points="50,2 98,50 50,98 2,50" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Triangle",
    w: 100, h: 88,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 88" preserveAspectRatio="none"><polygon points="50,2 98,86 2,86" fill="#374151"/></svg>`,
    preview: <polygon points="50,2 98,86 2,86" fill="#374151" />,
    vb: "0 0 100 88",
  },
  {
    label: "Heart",
    w: 100, h: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" preserveAspectRatio="none"><path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151"/></svg>`,
    preview: <path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151" />,
    vb: "0 0 100 90",
  },
  {
    label: "Dot Circle",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><circle cx="50" cy="50" r="46" fill="none" stroke="#374151" stroke-width="3" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/></svg>`,
    preview: <circle cx="50" cy="50" r="46" fill="none" stroke="#374151" strokeWidth="3" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />,
    vb: "0 0 100 100",
  },
  {
    label: "Dot Square",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="3" y="3" width="94" height="94" rx="4" fill="none" stroke="#374151" stroke-width="3" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/></svg>`,
    preview: <rect x="3" y="3" width="94" height="94" rx="4" fill="none" stroke="#374151" strokeWidth="3" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />,
    vb: "0 0 100 100",
  },
];

// ── Built-in frames ───────────────────────────────────────────────────────────
const BUILT_IN_FRAMES: { label: string; svg: string }[] = [
  {
    label: "Thin Line",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="none"><rect x="6" y="6" width="388" height="388" fill="none" stroke="#1e293b" stroke-width="3"/></svg>`,
  },
  {
    label: "Rounded",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="none"><rect x="5" y="5" width="390" height="210" rx="14" fill="none" stroke="#1e293b" stroke-width="2.5"/></svg>`,
  },
  {
    label: "Double Line",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="none"><rect x="6" y="6" width="388" height="388" fill="none" stroke="#1e293b" stroke-width="3.5"/><rect x="16" y="16" width="368" height="368" fill="none" stroke="#1e293b" stroke-width="1.2"/></svg>`,
  },
  {
    label: "Double Rounded",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="none"><rect x="5" y="5" width="390" height="210" rx="14" fill="none" stroke="#1e293b" stroke-width="3"/><rect x="13" y="13" width="374" height="194" rx="8" fill="none" stroke="#1e293b" stroke-width="1.2"/></svg>`,
  },
  {
    label: "Corner Brackets",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="none"><polyline points="8,55 8,8 55,8" fill="none" stroke="#1e293b" stroke-width="5"/><polyline points="345,8 392,8 392,55" fill="none" stroke="#1e293b" stroke-width="5"/><polyline points="392,345 392,392 345,392" fill="none" stroke="#1e293b" stroke-width="5"/><polyline points="55,392 8,392 8,345" fill="none" stroke="#1e293b" stroke-width="5"/></svg>`,
  },
  {
    label: "Gold Border",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="none"><defs><linearGradient id="gf2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fde68a"/><stop offset="50%" stop-color="#d97706"/><stop offset="100%" stop-color="#fde68a"/></linearGradient></defs><rect x="8" y="8" width="384" height="384" fill="none" stroke="url(#gf2)" stroke-width="5"/><rect x="18" y="18" width="364" height="364" fill="none" stroke="url(#gf2)" stroke-width="1.5"/><circle cx="8" cy="8" r="7" fill="#d97706"/><circle cx="392" cy="8" r="7" fill="#d97706"/><circle cx="392" cy="392" r="7" fill="#d97706"/><circle cx="8" cy="392" r="7" fill="#d97706"/></svg>`,
  },
];

function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ─── Back-side templates ──────────────────────────────────────────────────────

const BACK_TEMPLATES = [
  {
    label: "Ornamental",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><line x1="100" y1="135" x2="360" y2="135" stroke="#d4af37" stroke-width="0.5"/><text x="230" y="105" text-anchor="middle" font-family="serif" font-size="11" fill="#d4af37" letter-spacing="3">✦ ── ✦ ── ✦</text><text x="230" y="152" text-anchor="middle" font-family="serif" font-size="10" fill="#d4af37" letter-spacing="4">COMPANY MESSAGE</text></svg>`,
  },
  {
    label: "Appointment",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><text x="230" y="44" text-anchor="middle" font-family="serif" font-size="13" fill="#d4af37" letter-spacing="3">YOUR NEXT APPOINTMENT</text><line x1="60" y1="52" x2="400" y2="52" stroke="#d4af37" stroke-width="0.5"/>${[0,1,2,3].map(i=>`<text x="68" y="${82+i*38}" font-family="serif" font-size="9" fill="#d0ccc4" letter-spacing="1">DATE</text><rect x="92" y="${70+i*38}" width="110" height="16" rx="2" fill="#1e1e1e" stroke="#444" stroke-width="0.5"/><text x="222" y="${82+i*38}" font-family="serif" font-size="9" fill="#d0ccc4" letter-spacing="1">TIME</text><rect x="244" y="${70+i*38}" width="90" height="16" rx="2" fill="#1e1e1e" stroke="#444" stroke-width="0.5"/>`).join("")}<text x="230" y="242" text-anchor="middle" font-family="serif" font-size="7" fill="#888" letter-spacing="1">IF YOU ARE UNABLE TO KEEP YOUR APPOINTMENT, PLEASE</text><text x="230" y="254" text-anchor="middle" font-family="serif" font-size="7" fill="#888" letter-spacing="1">CONTACT US AS SOON AS POSSIBLE.</text></svg>`,
  },
  {
    label: "Contact Info",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><rect x="30" y="30" width="54" height="54" rx="4" fill="#1a1a1a" stroke="#d4af37" stroke-width="0.5"/>${[0,1,2,3,4,5].map((i)=>`<rect x="${34+i*8}" y="${34+i%3*8}" width="5" height="5" fill="#333"/>`).join("")}<text x="395" y="68" text-anchor="end" font-family="serif" font-size="13" fill="#d0ccc4" letter-spacing="2">FULL NAME</text><text x="395" y="88" text-anchor="end" font-family="serif" font-size="9" fill="#d4af37" letter-spacing="3">JOB TITLE</text><line x1="200" y1="100" x2="395" y2="100" stroke="#d4af37" stroke-width="0.5"/><text x="395" y="118" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">PHONE / OTHER</text><text x="395" y="134" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">EMAIL / OTHER</text><text x="395" y="152" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">ADDRESS LINE 1</text><text x="395" y="168" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">ADDRESS LINE 2</text><line x1="200" y1="180" x2="395" y2="180" stroke="#d4af37" stroke-width="0.5"/><text x="395" y="198" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">INSTAGRAM.COM/COMPANYNAME</text><text x="395" y="214" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">WEB / OTHER</text></svg>`,
  },
  {
    label: "Loyalty Card",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><text x="230" y="52" text-anchor="middle" font-family="serif" font-size="14" fill="#d4af37" letter-spacing="4">LOYALTY CARD</text><text x="230" y="72" text-anchor="middle" font-family="serif" font-size="9" fill="#888" letter-spacing="3">COMPANY MESSAGE</text><line x1="60" y1="84" x2="400" y2="84" stroke="#d4af37" stroke-width="0.5"/>${[0,1,2,3,4].map(i=>`<circle cx="${95+i*68}" cy="158" r="30" fill="#1e1e1e" stroke="#d4af37" stroke-width="1"/>`).join("")}<text x="60" y="238" font-family="serif" font-size="8" fill="#888" letter-spacing="1">@SOCIALMEDIA</text><text x="400" y="238" text-anchor="end" font-family="serif" font-size="8" fill="#888" letter-spacing="1">WEB / OTHER</text></svg>`,
  },
  {
    label: "Monogram",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><rect x="50" y="28" width="100" height="56" rx="3" fill="none" stroke="#d4af37" stroke-width="1"/><line x1="98" y1="28" x2="98" y2="84" stroke="#d4af37" stroke-width="1"/><text x="73" y="65" text-anchor="middle" font-family="serif" font-size="22" fill="#d4af37">H</text><text x="123" y="65" text-anchor="middle" font-family="serif" font-size="22" fill="#d4af37">S</text><text x="230" y="120" text-anchor="middle" font-family="serif" font-size="14" fill="#d0ccc4" letter-spacing="3">FULL NAME</text><text x="230" y="140" text-anchor="middle" font-family="serif" font-size="9" fill="#d4af37" letter-spacing="3">JOB TITLE</text><line x1="100" y1="152" x2="360" y2="152" stroke="#d4af37" stroke-width="0.4"/><text x="230" y="170" text-anchor="middle" font-family="serif" font-size="8" fill="#888" letter-spacing="1">PHONE / OTHER</text><text x="230" y="186" text-anchor="middle" font-family="serif" font-size="8" fill="#888" letter-spacing="1">EMAIL / OTHER</text><text x="230" y="204" text-anchor="middle" font-family="serif" font-size="8" fill="#888" letter-spacing="1">INSTAGRAM.COM/COMPANYNAME</text><text x="230" y="220" text-anchor="middle" font-family="serif" font-size="8" fill="#888" letter-spacing="1">WEB / OTHER</text></svg>`,
  },
  {
    label: "Simple",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270"><rect width="460" height="270" rx="10" fill="#0a0a0a"/><text x="230" y="124" text-anchor="middle" font-family="serif" font-size="16" fill="#d0ccc4" letter-spacing="4">COMPANY NAME</text><line x1="130" y1="136" x2="330" y2="136" stroke="#d4af37" stroke-width="0.5"/><text x="230" y="154" text-anchor="middle" font-family="serif" font-size="9" fill="#888" letter-spacing="3">COMPANY MESSAGE</text></svg>`,
  },
];

// ─── SVG parse / edit helpers ─────────────────────────────────────────────────

type ParsedSVG = {
  bgStr: string;       // SVG markup with text removed, data-id on shapes
  textItems: TextItem[];
  graphicItems: ImageItem[];
};

function getSvgElementBBox(el: Element): { x: number; y: number; w: number; h: number } | null {
  const tag = el.tagName.toLowerCase();
  const sw  = Math.max(0.5, parseFloat(el.getAttribute("stroke-width") ?? "0"));
  const pad = sw / 2 + 1;

  if (tag === "circle") {
    const cx = parseFloat(el.getAttribute("cx") ?? "0");
    const cy = parseFloat(el.getAttribute("cy") ?? "0");
    const r  = parseFloat(el.getAttribute("r")  ?? "0");
    if (!r) return null;
    return { x: cx - r - pad, y: cy - r - pad, w: (r + pad) * 2, h: (r + pad) * 2 };
  }
  if (tag === "ellipse") {
    const cx = parseFloat(el.getAttribute("cx") ?? "0");
    const cy = parseFloat(el.getAttribute("cy") ?? "0");
    const rx = parseFloat(el.getAttribute("rx") ?? "0");
    const ry = parseFloat(el.getAttribute("ry") ?? "0");
    if (!rx && !ry) return null;
    return { x: cx - rx - pad, y: cy - ry - pad, w: (rx + pad) * 2, h: (ry + pad) * 2 };
  }
  if (tag === "rect") {
    const x = parseFloat(el.getAttribute("x") ?? "0");
    const y = parseFloat(el.getAttribute("y") ?? "0");
    const w = parseFloat(el.getAttribute("width") ?? "0");
    const h = parseFloat(el.getAttribute("height") ?? "0");
    if (!w || !h || (w < 8 && h < 8)) return null; // skip tiny dots
    return { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 };
  }
  if (tag === "line") {
    const x1 = parseFloat(el.getAttribute("x1") ?? "0");
    const y1 = parseFloat(el.getAttribute("y1") ?? "0");
    const x2 = parseFloat(el.getAttribute("x2") ?? "0");
    const y2 = parseFloat(el.getAttribute("y2") ?? "0");
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2), maxY = Math.max(y1, y2);
    return { x: minX - pad, y: minY - pad, w: Math.max(4, maxX - minX) + pad * 2, h: Math.max(4, maxY - minY) + pad * 2 };
  }
  if (tag === "polygon" || tag === "polyline") {
    const pts = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (pts.length < 4) return null;
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i + 1 < pts.length; i += 2) { xs.push(pts[i]); ys.push(pts[i + 1]); }
    const minX = Math.min(...xs), minY = Math.min(...ys);
    return { x: minX - pad, y: minY - pad, w: Math.max(...xs) - minX + pad * 2, h: Math.max(...ys) - minY + pad * 2 };
  }
  return null;
}

const SHAPE_TAGS = ["rect", "circle", "polygon", "path", "line", "ellipse", "polyline"] as const;

function parseSVGForEditing(svgDataUrl: string, opts?: { extractGraphics?: boolean; px?: number; py?: number }): ParsedSVG | null {
  if (typeof window === "undefined") return null;
  if (!svgDataUrl.startsWith("data:image/svg+xml")) return null;
  let raw = "";
  try {
    if (svgDataUrl.includes(";base64,")) {
      // atob returns a byte string, not Unicode — use TextDecoder to handle UTF-8 multi-byte chars
      const binary = atob(svgDataUrl.split(";base64,")[1]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      raw = new TextDecoder().decode(bytes);
    } else {
      raw = decodeURIComponent(svgDataUrl.split(",").slice(1).join(","));
    }
  } catch { return null; }

  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const svg = doc.documentElement;

  // Preserve intrinsic dimensions from viewBox so the SVG renders at the
  // correct aspect ratio when used as an <img> src outside the editor.
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      svg.setAttribute("width",  parts[2]);
      svg.setAttribute("height", parts[3]);
    }
  } else {
    svg.setAttribute("width", "460");
    svg.setAttribute("height", "270");
  }
  svg.style.cssText = "display:block;width:100%;height:100%;";

  // Tag each editable shape with a unique data-id and force pointer-events so
  // fill="none" shapes (e.g. BC_CARD_OUTLINE rect) are still clickable.
  let counter = 0;
  SHAPE_TAGS.forEach((tag) => {
    svg.querySelectorAll(tag).forEach((el) => {
      if (!el.getAttribute("data-id")) el.setAttribute("data-id", `s${counter++}`);
      el.setAttribute("pointer-events", "all");
    });
  });

  // Extract <text> elements → TextItem[]
  const textItems: TextItem[] = [];
  Array.from(svg.querySelectorAll("text")).forEach((el) => {
    const opacity = parseFloat(el.getAttribute("opacity") ?? "1");
    if (opacity < 0.15) { el.remove(); return; }
    const fill = el.getAttribute("fill") ?? "#111827";
    if (fill === "transparent" || fill === "none") { el.remove(); return; }
    const rawText = (el.textContent ?? "").trim();
    if (!rawText) { el.remove(); return; }

    const svgX    = parseFloat(el.getAttribute("x") ?? "0");
    const svgY    = parseFloat(el.getAttribute("y") ?? "0"); // SVG y = baseline
    const fs      = parseFloat(el.getAttribute("font-size") ?? "14");
    const anchor  = el.getAttribute("text-anchor") ?? "start";
    const fw      = el.getAttribute("font-weight") ?? "normal";
    const ff      = el.getAttribute("font-family") ?? "Arial, sans-serif";

    let align: "left" | "center" | "right" = "left";
    if (anchor === "middle") align = "center";
    else if (anchor === "end") align = "right";

    const isBoldEst = fw === "bold" || parseInt(fw || "0", 10) >= 700;
    const wMult = isBoldEst ? 0.78 : 0.68;
    const estW = Math.max(80, Math.min(420, rawText.length * fs * wMult + 24));
    // Convert SVG absolute coords → print-area-local coords
    const tPX = opts?.px ?? 30, tPY = opts?.py ?? 25;
    let ix = svgX - tPX;
    const iy = svgY - fs - tPY;          // baseline → top; minus print-area Y offset
    if (align === "center") ix -= estW / 2;
    else if (align === "right") ix -= estW;

    const isSolidColor = fill.startsWith("#") || fill.startsWith("rgb") ||
                         fill === "white" || fill === "black";

    textItems.push({
      id: uid(), kind: "text",
      text: rawText,
      x: Math.round(ix), y: Math.round(iy),
      w: Math.round(estW),
      font: ff,
      size: Math.round(fs),
      bold: fw === "bold" || parseInt(fw || "0", 10) >= 700,
      italic: false, effect: "none", shape: "none", rotation: 0,
      color: isSolidColor ? fill : "#111827",
      align,
    });
    el.remove();
  });

  // Extract non-background graphic elements as individual ImageItems (back-template mode)
  const graphicItems: ImageItem[] = [];
  if (opts?.extractGraphics) {
    const PX = opts?.px ?? 30, PY = opts?.py ?? 25;
    const isBackgroundRect = (el: Element) => {
      const w = parseFloat(el.getAttribute("width") ?? "0");
      const h = parseFloat(el.getAttribute("height") ?? "0");
      const x = parseFloat(el.getAttribute("x") ?? "0");
      const y = parseFloat(el.getAttribute("y") ?? "0");
      // Full-canvas background at origin
      if (w >= 440 && h >= 250 && x === 0 && y === 0) return true;
      // Large structural/layout element — e.g. column backgrounds, section fills.
      // Threshold (30k px²) sits above placeholder rects (196×145 = 28,420) so
      // photo placeholders are still extracted as interactive items.
      if (w * h >= 30_000) return true;
      return false;
    };
    // Capture parent <defs> so gradient/pattern references are preserved in extracted elements
    const parentDefs = svg.querySelector("defs");
    const defsStr = parentDefs
      ? new XMLSerializer().serializeToString(parentDefs).replace(/^<\?xml[^?]*\?>\s*/, "")
      : "";
    const graphicTags = ["rect", "circle", "ellipse", "line", "polygon", "polyline", "path"] as const;
    graphicTags.forEach((tag) => {
      Array.from(svg.querySelectorAll(tag)).forEach((el) => {
        const isPlaceholder = el.getAttribute("data-placeholder") === "photo";
        if (tag === "rect" && !isPlaceholder && isBackgroundRect(el)) return; // keep bg rect in bgStr
        const bbox = getSvgElementBBox(el);
        if (!bbox || bbox.w < 2 || bbox.h < 2) return;
        const elStr = new XMLSerializer().serializeToString(el).replace(/^<\?xml[^?]*\?>\s*/, "");
        // Expand the SVG viewBox slightly beyond the bbox so the stroke/shape has visible
        // background margin and doesn't appear cut at the edge of its container div.
        // The item x/y/w/h stays based on original bbox for correct canvas positioning.
        const VP = 8;
        const elSvg = isPlaceholder ? "" : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x - VP} ${bbox.y - VP} ${bbox.w + VP * 2} ${bbox.h + VP * 2}" width="${Math.round(bbox.w)}" height="${Math.round(bbox.h)}" preserveAspectRatio="none">${defsStr}${elStr}</svg>`;
        graphicItems.push({
          id: uid(), kind: "image",
          // Empty src for placeholders → editor renders grey "Upload Photo" box
          src: isPlaceholder ? "" : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(elSvg),
          x: Math.round(bbox.x - PX),
          y: Math.round(bbox.y - PY),
          w: Math.max(2, Math.round(bbox.w)),
          h: Math.max(2, Math.round(bbox.h)),
          rotation: 0,
          ...(isPlaceholder ? { photoPlaceholder: true } : {}),
        });
        // Remove from bgStr to avoid double-rendering. Placeholders are shown via the
        // empty-src ImageItem (editor), SVG parsing in buildDesignPreview (gallery cards),
        // and generateItemsPNG (overlay PNGs) — so bgStr does not need them.
        el.remove();
      });
    });
  }

  let bgStr = new XMLSerializer().serializeToString(doc);
  bgStr = bgStr.replace(/^<\?xml[^?]*\?>\s*/, "");
  // Allow SVG content (e.g. stroked paths near the viewBox edge) to render beyond the
  // viewBox boundary — the parent div's overflow:hidden clips at the canvas boundary.
  // Strip any existing overflow attribute first to avoid duplicates on re-parse.
  bgStr = bgStr.replace(/ overflow="[^"]*"/g, "").replace(/<svg\b/, '<svg overflow="visible"');
  // Ensure SVG fills its container without letterboxing
  bgStr = bgStr.replace(/ preserveAspectRatio="[^"]*"/g, "").replace(/<svg\b/, '<svg preserveAspectRatio="none"');
  return { bgStr, textItems, graphicItems };
}

function patchShapeColor(svgStr: string, dataId: string, fill: string, stroke: string): string {
  const doc = new DOMParser().parseFromString(svgStr, "image/svg+xml");
  const el = doc.querySelector(`[data-id="${dataId}"]`);
  if (!el) return svgStr;
  if (fill)   el.setAttribute("fill",   fill);
  if (stroke) el.setAttribute("stroke", stroke);
  let out = new XMLSerializer().serializeToString(doc);
  out = out.replace(/^<\?xml[^?]*\?>\s*/, "");
  return out;
}

// Patch the first full-card background rect in an inline SVG string.
// Used so the "Front/Back background" picker also updates SVG-based seed designs.
function patchSvgBackground(svgStr: string, color: string): string {
  if (!svgStr) return svgStr;
  const doc = new DOMParser().parseFromString(svgStr, "image/svg+xml");
  const rects = Array.from(doc.querySelectorAll("rect"));
  const bg = rects.find((r) => {
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const x = parseFloat(r.getAttribute("x") ?? "0");
    const y = parseFloat(r.getAttribute("y") ?? "0");
    return w >= 440 && h >= 250 && x === 0 && y === 0;
  });
  if (!bg) return svgStr;
  bg.setAttribute("fill", color);
  let out = new XMLSerializer().serializeToString(doc);
  out = out.replace(/^<\?xml[^?]*\?>\s*/, "");
  return out;
}

// Read the fill of the full-card background rect from an inline SVG string.
function readSvgBackground(svgStr: string): string | null {
  if (!svgStr) return null;
  try {
    const doc = new DOMParser().parseFromString(svgStr, "image/svg+xml");
    const rects = Array.from(doc.querySelectorAll("rect"));
    const bg = rects.find((r) => {
      const w = parseFloat(r.getAttribute("width") ?? "0");
      const h = parseFloat(r.getAttribute("height") ?? "0");
      const x = parseFloat(r.getAttribute("x") ?? "0");
      const y = parseFloat(r.getAttribute("y") ?? "0");
      return w >= 440 && h >= 250 && x === 0 && y === 0;
    });
    if (bg) {
      const fill = bg.getAttribute("fill");
      if (fill && fill !== "none" && fill !== "transparent") return fill;
    }
  } catch { /* ignore */ }
  return null;
}

const NEAR_WHITE = new Set(["#ffffff", "#fff", "white", "#fefefe", "#fdfdfd", "transparent", "none"]);
function isNearWhite(c: string) {
  if (!c) return true;
  const lower = c.toLowerCase();
  if (NEAR_WHITE.has(lower) || /^#[fF]{3}$/.test(c) || /^#[fF]{6}$/.test(c)) return true;
  // Any 6-digit hex where all RGB channels ≥ 240 counts as near-white (e.g. #fffef9, #fafaf8)
  const m = lower.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (m) return parseInt(m[1], 16) >= 240 && parseInt(m[2], 16) >= 240 && parseInt(m[3], 16) >= 240;
  return false;
}

// Detect the most prominent accent/theme color from a front-card SVG.
// Priority: explicit CSS bg → full-card bg rect → largest colored rect
//           → largest colored polygon/path/ellipse → first non-white fill anywhere.
function getFrontThemeColor(bgSvgStr: string, bgColorCss: string): string {
  // 1. Use the CSS background if it was explicitly set to something non-white.
  if (bgColorCss && !isNearWhite(bgColorCss)) return bgColorCss;

  if (!bgSvgStr) return bgColorCss;
  try {
    const doc = new DOMParser().parseFromString(bgSvgStr, "image/svg+xml");

    // 2. Full-card colored background rect (same logic as patchSvgBackground)
    const fullBg = Array.from(doc.querySelectorAll("rect")).find((r) => {
      const w = parseFloat(r.getAttribute("width") ?? "0");
      const h = parseFloat(r.getAttribute("height") ?? "0");
      const x = parseFloat(r.getAttribute("x") ?? "0");
      const y = parseFloat(r.getAttribute("y") ?? "0");
      return w >= 440 && h >= 250 && x === 0 && y === 0;
    });
    if (fullBg) {
      const fill = fullBg.getAttribute("fill") ?? "";
      if (!isNearWhite(fill)) return fill;
    }

    // 3. Largest colored rect (half-panels, headers, stripes)
    let bestRectArea = 0, bestRectColor = "";
    doc.querySelectorAll("rect").forEach((r) => {
      const fill = r.getAttribute("fill") ?? "";
      if (isNearWhite(fill)) return;
      const w = parseFloat(r.getAttribute("width") ?? "0");
      const h = parseFloat(r.getAttribute("height") ?? "0");
      const area = w * h;
      if (area > bestRectArea) { bestRectArea = area; bestRectColor = fill; }
    });
    if (bestRectColor && bestRectArea > 800) return bestRectColor;

    // 4. Largest colored polygon / ellipse (arch banners, waves, ribbons)
    // Use bounding-box heuristic via viewBox dimensions of each element.
    const shapeEls = Array.from(doc.querySelectorAll("polygon,polyline,ellipse,circle,path"));
    let bestShapeScore = 0, bestShapeColor = "";
    shapeEls.forEach((el, i) => {
      const fill = el.getAttribute("fill") ?? "";
      if (isNearWhite(fill)) return;
      // Score by rough order of appearance (earlier = more prominent) weighted by index
      const score = 1000 - i;
      if (score > bestShapeScore) { bestShapeScore = score; bestShapeColor = fill; }
    });
    if (bestShapeColor) return bestShapeColor;

    // 5. First non-white fill anywhere
    const all = Array.from(doc.querySelectorAll("[fill]"));
    for (const el of all) {
      const fill = el.getAttribute("fill") ?? "";
      if (!isNearWhite(fill)) return fill;
    }
  } catch { /* ignore */ }
  return bgColorCss;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("load failed"));
    img.src = src;
  });
}

// Fill a canvas with a CSS color or linear-gradient string
function fillCanvasBg(ctx: CanvasRenderingContext2D, w: number, h: number, bgColor: string) {
  const m = bgColor.match(/linear-gradient\(\s*(\d+)deg\s*,\s*(.+)\)/);
  if (m) {
    const deg = parseFloat(m[1]);
    const rad = (deg - 90) * (Math.PI / 180);
    const stops = m[2].split(",").map((s) => s.trim());
    const x1 = w / 2 - Math.cos(rad) * w / 2;
    const y1 = h / 2 - Math.sin(rad) * h / 2;
    const x2 = w / 2 + Math.cos(rad) * w / 2;
    const y2 = h / 2 + Math.sin(rad) * h / 2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    stops.forEach((stop, i) => {
      const parts = stop.split(/\s+/);
      const color = parts[0];
      const pos = parts[1] ? parseFloat(parts[1]) / 100 : i / (stops.length - 1);
      try { grad.addColorStop(pos, color); } catch { /* skip invalid */ }
    });
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bgColor;
  }
  ctx.fillRect(0, 0, w, h);
}

function clipRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: { tl: number; tr: number; br: number; bl: number }
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
  ctx.clip();
}

// Word-wrap text to fit maxWidth on canvas, respecting newlines (pre-wrap).
function getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para) { lines.push(""); continue; }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

async function generateItemsPNG(
  items: CanvasItem[],
  dims: { CW: number; CH: number; PX: number; PY: number },
  bgColor?: string,
  scale = 1,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width  = dims.CW * scale;
  canvas.height = dims.CH * scale;
  const ctx = canvas.getContext("2d")!;
  if (scale !== 1) ctx.scale(scale, scale);
  if (bgColor) {
    fillCanvasBg(ctx, dims.CW, dims.CH, bgColor);
  }
  for (const item of items) {
    if (item.kind === "text") {
      if (item.shape === "curve") {
        // Render curved text using an SVG textPath (same arc as the live editor)
        const w = item.w;
        const r = w * 0.7;
        const h = r - Math.sqrt(r * r - (w / 2) * (w / 2));
        const svgH = Math.max(h + item.size + 8, item.size + 12);
        const pathId = `cp-${item.id}`;
        const escaped = item.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${svgH}"><defs><path id="${pathId}" d="M 0 ${r} Q ${w / 2} 0 ${w} ${r}"/></defs><text font-family="${item.font}" font-size="${item.size}" font-weight="${item.bold ? 700 : 400}" font-style="${item.italic ? "italic" : "normal"}" fill="${item.color}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escaped}</textPath></text></svg>`;
        try {
          const svgImg = await loadImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`);
          ctx.drawImage(svgImg, dims.PX + item.x, dims.PY + item.y, w, svgH);
        } catch { /* skip */ }
        continue;
      }
      ctx.save();
      if (item.rotation) {
        const cx = dims.PX + item.x + item.w / 2;
        const cy = dims.PY + item.y + item.size / 2;
        ctx.translate(cx, cy);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.font = `${item.italic ? "italic " : ""}${item.bold ? "bold " : ""}${item.size}px ${item.font}`;
      ctx.textAlign = item.align as CanvasTextAlign;
      const tx = item.align === "center" ? dims.PX + item.x + item.w / 2
               : item.align === "right"  ? dims.PX + item.x + item.w
               : dims.PX + item.x;
      const ty0 = dims.PY + item.y + item.size;
      const lineH = item.size * 1.3;
      const lines = getWrappedLines(ctx, item.text, item.w);
      lines.forEach((line, li) => {
        const ty = ty0 + li * lineH;
        if (item.effect === "shadow") {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillText(line, tx + 3, ty + 3);
        } else if (item.effect === "echo") {
          for (let i = 3; i >= 1; i--) {
            ctx.globalAlpha = 0.18 * i;
            ctx.fillStyle = "#888";
            ctx.fillText(line, tx + i * 3, ty + i * 3);
          }
          ctx.globalAlpha = 1;
        } else if (item.effect === "glitch") {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "#00bcd4";
          ctx.fillText(line, tx - 2, ty);
          ctx.fillStyle = "#e040fb";
          ctx.fillText(line, tx + 2, ty);
          ctx.globalAlpha = 1;
        } else if (item.effect === "highlight") {
          const m = ctx.measureText(line);
          const bx = item.align === "center" ? tx - m.width / 2 - 3
                   : item.align === "right"  ? tx - m.width - 3 : tx - 3;
          ctx.fillStyle = "#4FC3F7";
          ctx.fillRect(bx, ty - item.size * 0.85, m.width + 6, item.size * 1.1);
        }
        ctx.fillStyle = item.color;
        ctx.fillText(line, tx, ty);
      });
      ctx.restore();
    } else if (item.kind === "image") {
      const ix = dims.PX + item.x, iy = dims.PY + item.y;
      if (!item.src) {
        // Photo placeholder — draw the same grey box + camera icon shown in the 2D editor
        ctx.save();
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(ix, iy, item.w, item.h);
        const iconPx = Math.min(item.w, item.h) * 0.28;
        const cx2 = ix + item.w / 2, cy2 = iy + item.h / 2 - iconPx * 0.2;
        // Use the exact same camera SVG as the 2D editor
        const camSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconPx}" height="${iconPx}" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        try {
          const camImg = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(camSvg));
          ctx.drawImage(camImg, cx2 - iconPx / 2, cy2 - iconPx / 2, iconPx, iconPx);
        } catch { /* skip icon */ }
        // "Upload Photo" label
        const fontSize = Math.max(8, Math.min(14, item.h * 0.1));
        ctx.font = `700 ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "center";
        ctx.fillText("Upload Photo", cx2, cy2 + iconPx * 0.7 + fontSize);
        ctx.restore();
      } else {
        try {
          const img = await loadImg(item.src);
          ctx.save();
          if (item.rotation) {
            const cx = ix + item.w / 2;
            const cy = iy + item.h / 2;
            ctx.translate(cx, cy);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          if (item.radii) {
            clipRoundedRect(ctx, ix, iy, item.w, item.h, item.radii);
          }
          ctx.drawImage(img, ix, iy, item.w, item.h);
          ctx.restore();
        } catch { /* skip failed images */ }
      }
    }
  }
  return canvas.toDataURL("image/png");
}

async function generateSidePreviewPNG(
  side: "front" | "back",
  sidesData: Record<"front" | "back", { items: unknown[]; template: { baseImage: string } | null }>,
  bgColorsData: Record<"front" | "back", string>,
  bgSvgData: Record<"front" | "back", string>,
  dims: { CW: number; CH: number; PX: number; PY: number },
  scale = 1,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width  = dims.CW * scale;
  canvas.height = dims.CH * scale;
  const ctx = canvas.getContext("2d")!;
  if (scale !== 1) ctx.scale(scale, scale);
  fillCanvasBg(ctx, dims.CW, dims.CH, bgColorsData[side]);
  const sideData = sidesData[side];
  const baseImg = bgSvgData[side]
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bgSvgData[side])}`
    : sideData.template?.baseImage;
  if (baseImg) {
    try {
      const img = await loadImg(baseImg);
      ctx.drawImage(img, 0, 0, dims.CW, dims.CH);
    } catch { /* skip */ }
  }
  if ((sideData.items as unknown[]).length > 0) {
    try {
      const itemsPng = await generateItemsPNG(sideData.items as Parameters<typeof generateItemsPNG>[0], dims, undefined, scale);
      const img = await loadImg(itemsPng);
      ctx.drawImage(img, 0, 0, dims.CW, dims.CH);
    } catch { /* skip */ }
  }
  return canvas.toDataURL("image/png");
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TextItem = {
  id: string;
  kind: "text";
  text: string;
  x: number;
  y: number;
  w: number;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  effect: "none" | "shadow" | "highlight" | "glitch" | "echo";
  shape: "none" | "curve";
  rotation: number;
  color: string;
  align: "left" | "center" | "right";
};

type ImageItem = {
  id: string;
  kind: "image";
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  radii?: { tl: number; tr: number; br: number; bl: number };
  frameItem?: boolean;
  photoPlaceholder?: boolean;
};

type CanvasItem = TextItem | ImageItem;

type Template = {
  baseImage: string;
  overlayImage?: string;
  overlayColor: string;
};

type SideData = {
  items: CanvasItem[];
  template: Template | null;
};

type Side = "front" | "back";
type SidebarTool = "material-color" | "text" | "uploads" | "graphics" | "frames" | "template";

type Props = {
  shirt?: ShirtProduct;
  selectedColor?: ShirtColor;
  selectedTechnology?: string;
  templateId?: string | null;
  templateOverlayColor?: string | null;
  onClose: () => void;
  // non-shirt product slug (for template fetching in customer mode)
  productSlug?: string;
  // product type
  productType?: "business-card" | "flyer-express" | "flyer-prime" | "poster-small" | "poster-large" | "banner-vinyl" | "banner-outdoor" | "banner-rollup-std" | "banner-rollup-premium" | "sticker-label" | "yard-sign";
  // admin mode
  adminMode?: boolean;
  adminFrontImage?: string;
  adminBackImage?: string;
  initialFrontItems?: SerializableItem[];
  initialBackItems?: SerializableItem[];
  initialFrontBgColor?: string;
  initialBackBgColor?: string;
  // Colors configured on the gallery template's own Color spec (via the admin swatch
  // picker) — shown as the pickable "Background Color" swatches instead of the generic
  // BG_COLOR_PRESETS list, so the editor offers exactly the colors admin curated.
  materialColors?: string[];
  onSaveAdmin?: (
    frontItems: SerializableItem[],
    backItems: SerializableItem[],
    frontOverlay: string,
    backOverlay: string,
    frontBgColor?: string,
    backBgColor?: string,
    frontBgSvg?: string,
    backBgSvg?: string
  ) => void;
  onSaveAndContinue?: (quantity: number, frontPng: string, backPng: string) => void;
  productName?: string;
  pricePerUnit?: number;
  // Overrides the fixed category dims below with a custom physical size (used for
  // admin-created custom gallery templates that declared their own Width/Length).
  customDimsInches?: { width: number; height: number };
};

// ─── SidebarIcon ──────────────────────────────────────────────────────────────
function SidebarIcon({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "4px", padding: "10px 6px", border: "none",
        background: active ? "linear-gradient(135deg, #7c3aed, #db2777)" : "transparent",
        borderRadius: "12px", cursor: "pointer",
        color: active ? "#fff" : "#6b7280", width: "100%",
        boxShadow: active ? "0 4px 12px rgba(124,58,237,0.35)" : "none",
        transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
      }}
    >
      {icon}
      <span style={{ fontSize: "0.62rem", fontWeight: 600, textAlign: "center", lineHeight: 1.2, whiteSpace: "pre-line" }}>{label}</span>
    </button>
  );
}

// ─── TplCard — card used inside the Choose-a-design modal ────────────────────
function TplCard({ design, previewBase, previewOverlay, overlayColor, displayPrice, onSelect }: {
  design: DesignTemplateItem;
  previewBase: string;
  previewOverlay?: string;
  overlayColor?: string;
  displayPrice: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer", borderRadius: "16px",
        border: `2px solid ${hovered ? "#06b6d4" : "rgba(0,0,0,0.07)"}`,
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden", background: "#fff",
      }}
    >
      <div style={{ background: "#f4f4f6", padding: "0.85rem 0.75rem 0.75rem", position: "relative" }}>
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.2)" }}>
          <img src={previewBase} alt={design.name} style={{ width: "100%", height: "auto", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.03)" : "scale(1)" }} />
          {previewOverlay && (
            overlayColor ? (
              <div style={{ position: "absolute", inset: 0, background: overlayColor, WebkitMaskImage: `url(${previewOverlay})`, maskImage: `url(${previewOverlay})`, WebkitMaskSize: "fill", maskSize: "fill", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } as React.CSSProperties} />
            ) : (
              <img src={previewOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
            )
          )}
          {hovered && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)", color: "#fff", padding: "0.45rem 1.2rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>
                Select →
              </span>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "0.6rem 0.85rem 0.75rem" }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{design.name}</p>
        {displayPrice && <p style={{ margin: 0, fontSize: "0.8rem", color: "#0891b2", fontWeight: 700 }}>{displayPrice}</p>}
        {design.frontBgColor && design.frontBgColor !== "#ffffff" && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "3px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: design.frontBgColor, border: "1px solid #e5e7eb", display: "inline-block" }} />
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>Custom color</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TemplatePanelUI ──────────────────────────────────────────────────────────
function TemplatePanelUI({ templates, activeSide, onApply }: {
  templates: GalleryTemplate[];
  activeSide: Side;
  onApply: (frontBase: string, frontOverlay: string | undefined, backBase: string | undefined, backOverlay: string | undefined, color: string, design: DesignTemplateItem) => void;
}) {
  const [tplColors, setTplColors] = useState<Record<string, string>>({});

  const designs = templates.flatMap((t) => t.designs);

  if (designs.length === 0) {
    return (
      <div style={{ padding: "1.25rem", color: "#9ca3af", fontSize: "0.85rem", textAlign: "center" }}>
        No templates yet.
        <br />Add designs in the admin panel.
      </div>
    );
  }

  return (
    <div style={{ padding: "0.75rem" }}>
      <p style={{ margin: "0 0 0.75rem 0.25rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
        Design Templates
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {designs.map((d) => {
          const previewBase = activeSide === "back" && d.backImage ? d.backImage : d.frontImage;
          const previewOverlay = activeSide === "back" && d.backImage ? d.backOverlay : d.frontOverlay;
          return (
            <div key={d.id} style={{ border: "1.5px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ position: "relative", background: "#f9fafb", aspectRatio: "1/1" }}>
                <img src={previewBase} alt={d.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {previewOverlay && (
                  tplColors[d.id] ? (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: tplColors[d.id],
                      WebkitMaskImage: `url(${previewOverlay})`,
                      maskImage: `url(${previewOverlay})`,
                      WebkitMaskSize: "contain", maskSize: "contain",
                      WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center", maskPosition: "center",
                    } as React.CSSProperties} />
                  ) : (
                    <img src={previewOverlay} alt=""
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                  )
                )}
                <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3 }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: 3 }}>F</span>
                  {d.backImage && <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "#f3e8ff", color: "#7c3aed", padding: "1px 5px", borderRadius: 3 }}>B</span>}
                </div>
              </div>
              <div style={{ padding: "6px 8px" }}>
                <p style={{ margin: "0 0 5px", fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{d.name}</p>
                {(d.frontOverlay || d.backOverlay) && (
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginBottom: "5px" }}>
                    {OVERLAY_COLORS.map((c) => (
                      <button key={c.value}
                        onClick={() => setTplColors((p) => ({ ...p, [d.id]: c.value }))}
                        title={c.label}
                        style={{
                          width: "14px", height: "14px", borderRadius: "50%", background: c.value,
                          border: `2px solid ${tplColors[d.id] === c.value ? "#3b82f6" : "#d1d5db"}`,
                          cursor: "pointer", padding: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => onApply(d.frontImage, d.frontOverlay, d.backImage, d.backOverlay, tplColors[d.id] || "#000000", d)}
                  style={{
                    width: "100%", padding: "4px 0", background: "#06b6d4", color: "#fff",
                    border: "none", borderRadius: "6px", cursor: "pointer",
                    fontSize: "0.75rem", fontWeight: 600,
                  }}
                >
                  Apply Design
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DesignEditorShell({
  shirt,
  selectedColor: initialColor,
  templateId,
  templateOverlayColor,
  onClose,
  productSlug,
  productType,
  adminMode = false,
  adminFrontImage,
  adminBackImage,
  initialFrontItems,
  initialBackItems,
  initialFrontBgColor,
  initialBackBgColor,
  materialColors,
  onSaveAdmin,
  onSaveAndContinue,
  productName,
  pricePerUnit,
  customDimsInches,
}: Props) {
  type AuthCustomer = { id: string; firstName: string; lastName: string; email: string };
  const isBusinessCard  = productType === "business-card";
  const isFlyerExpress  = productType === "flyer-express";
  const isFlyerPrime    = productType === "flyer-prime";
  const isPosterSmall      = productType === "poster-small";
  const isPosterLarge      = productType === "poster-large";
  const isBannerVinyl      = productType === "banner-vinyl";
  const isBannerOutdoor    = productType === "banner-outdoor";
  const isBannerRollupStd  = productType === "banner-rollup-std";
  const isBannerRollupPrem = productType === "banner-rollup-premium";
  const isBannerRollup     = isBannerRollupStd || isBannerRollupPrem;
  const isBanner           = isBannerVinyl || isBannerOutdoor || isBannerRollup;
  const isFlyer            = isFlyerExpress || isFlyerPrime;
  const isLabel            = productType === "sticker-label";
  const isYardSign         = productType === "yard-sign";
  const isFlatArt          = isBusinessCard || isFlyer || isPosterSmall || isPosterLarge || isBanner || isLabel || isYardSign;
  const isSingleSide       = isPosterSmall || isPosterLarge || isBanner || isLabel || isYardSign;
  const colorPresets = materialColors && materialColors.length > 0
    ? materialColors.map((hex) => ({ label: hex, value: hex }))
    : BG_COLOR_PRESETS;
  // labelDims is set dynamically from the SVG viewBox once the template loads
  const [labelDims, setLabelDims] = useState(LABEL_DIMS_DEFAULT);
  const PX_PER_INCH = 130;
  const customDims = customDimsInches ? (() => {
    const CW = Math.round(customDimsInches.width * PX_PER_INCH);
    const CH = Math.round(customDimsInches.height * PX_PER_INCH);
    const PX = Math.round(CW * 0.065);
    const PY = Math.round(CH * 0.065);
    return { CW, CH, PX, PY, PW: CW - PX * 2, PH: CH - PY * 2 };
  })() : null;
  const dims = customDims       ? customDims
             : isBusinessCard  ? BC_DIMS
             : isFlyerExpress  ? FLYER_EXPRESS_DIMS
             : isFlyerPrime    ? FLYER_PRIME_DIMS
             : isPosterSmall   ? POSTER_SMALL_DIMS
             : isPosterLarge   ? POSTER_LARGE_DIMS
             : isBannerVinyl   ? BANNER_VINYL_DIMS
             : isBannerOutdoor ? BANNER_OUTDOOR_DIMS
             : isBannerRollup  ? BANNER_ROLLUP_DIMS
             : isLabel         ? labelDims
             : isYardSign      ? YARD_SIGN_DIMS
             : SHIRT_DIMS;
  const { CW: CANVAS_W, CH: CANVAS_H, PX: PRINT_X, PY: PRINT_Y, PW: PRINT_W, PH: PRINT_H } = dims;

  const [activeTool, setActiveTool] = useState<SidebarTool>("material-color");
  const [activeSide, setActiveSide] = useState<Side>("front");
  const [shirtColor, setShirtColor] = useState<ShirtColor>(initialColor ?? { hex: "#ffffff", name: "White" });
  const [bgColors, setBgColors] = useState<Record<Side, string>>({
    front: initialFrontBgColor ?? "#ffffff",
    back: initialBackBgColor ?? "#ffffff",
  });
  const [zoom, setZoom] = useState(
    isPosterLarge   ? 0.8
    : isPosterSmall ? 0.85
    : isFlyerExpress ? 1.9
    : isFlyerPrime  ? 0.5
    : isBannerVinyl || isBannerOutdoor ? 1.0
    : isBannerRollup ? 0.65
    : isLabel ? 1.2
    : isYardSign ? 0.85
    : 1.5
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [appliedDesign, setAppliedDesign] = useState<DesignTemplateItem | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [tplSearch, setTplSearch] = useState("");
  const [tplPage, setTplPage] = useState(1);
  const [backTemplateOpen, setBackTemplateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFrontPng, setPreviewFrontPng] = useState<string>("");
  const [previewBackPng, setPreviewBackPng] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRotY, setPreviewRotY] = useState(0);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewRotRef  = useRef(0);
  const pendingCartIdRef = useRef<string | null>(null);
  const [finalStepsOpen, setFinalStepsOpen] = useState(false);
  const [selectedQty, setSelectedQty] = useState(0);
  const [designApproved, setDesignApproved] = useState(false);
  const finalCardRef = useRef<HTMLDivElement>(null);
  const finalRotRef  = useRef(0);
  const [finalRotY, setFinalRotY] = useState(0);
  // Auth + checkout
  const [cartUser, setCartUser] = useState<AuthCustomer | null>(null);
  const [authForCartOpen, setAuthForCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  type SavedCartItem = { id: string; name: string; qty: number; pricePerUnit: number; total: number; thumb?: string; doubleSided?: boolean };
  const [existingCartItems, setExistingCartItems] = useState<SavedCartItem[]>([]);
  const [checkoutForm, setCheckoutForm] = useState({ houseNo: "", flat: "", city: "", state: "", phone: "" });
  const [checkoutError, setCheckoutError] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressEditOpen, setAddressEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ houseNo: "", flat: "", city: "", state: "", phone: "" });
  const [editFormError, setEditFormError] = useState("");
  const [radiusPanelOpen, setRadiusPanelOpen] = useState(false);
  const [draftRadii, setDraftRadii] = useState({ tl: 0, tr: 0, br: 0, bl: 0 });

  // Load saved user from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) setCartUser(JSON.parse(saved) as AuthCustomer);
    } catch { /* ignore */ }
  }, []);

  // Fetch saved address for a user and pre-fill checkout form
  async function fetchAndPrefillAddress(userId: string) {
    setAddressLoading(true);
    try {
      const res = await fetch(`/api/auth/profile?id=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { phone: string; address: { houseNo: string; flat: string; city: string; state: string } };
        setCheckoutForm({
          phone:   data.phone ?? "",
          houseNo: data.address?.houseNo ?? "",
          flat:    data.address?.flat ?? "",
          city:    data.address?.city ?? "",
          state:   data.address?.state ?? "",
        });
      }
    } catch { /* ignore */ } finally {
      setAddressLoading(false);
    }
  }
  const [tplColors, setTplColors] = useState<Record<string, string>>({});
  const [sides, setSides] = useState<Record<Side, SideData>>({
    front: { items: [], template: null },
    back: { items: [], template: null },
  });

  // Per-side inline SVG string (shapes only, text stripped) for click-to-edit
  const [bgSvg, setBgSvg] = useState<Record<Side, string>>({ front: "", back: "" });
  // Currently selected shape for color editing
  type ShapePick = { dataId: string; side: Side; fill: string; stroke: string; px: number; py: number };
  const [shapePick, setShapePick] = useState<ShapePick | null>(null);

  const dragRef = useRef<{
    id: string; side: Side; sx: number; sy: number; ox: number; oy: number;
  } | null>(null);
  const resizeRef = useRef<{
    id: string; side: Side; corner: "nw" | "ne" | "sw" | "se";
    sx: number; sy: number; ox: number; oy: number; ow: number; oh: number;
  } | null>(null);
  const textResizeRef = useRef<{
    id: string; side: Side; edge: "n" | "s" | "e" | "w";
    sx: number; sy: number; ox: number; oy: number; ow: number;
  } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replacePhotoRef = useRef<HTMLInputElement>(null);
  const frameUploadRef = useRef<HTMLInputElement>(null);
  const replacingItemIdRef = useRef<string | null>(null);
  const [brokenImgIds, setBrokenImgIds] = useState<Set<string>>(new Set());
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  // Mirror refs — kept in sync synchronously so history captures correct state
  const sidesRef    = useRef<Record<Side, SideData>>({ front: { items: [], template: null }, back: { items: [], template: null } });
  const bgColorsRef = useRef<Record<Side, string>>({ front: initialFrontBgColor ?? "#ffffff", back: initialBackBgColor ?? "#ffffff" });
  const bgSvgRef    = useRef<Record<Side, string>>({ front: "", back: "" });
  useLayoutEffect(() => { sidesRef.current    = sides;    }, [sides]);
  useLayoutEffect(() => { bgColorsRef.current = bgColors; }, [bgColors]);
  useLayoutEffect(() => { bgSvgRef.current    = bgSvg;    }, [bgSvg]);

  // Auto-fit zoom for large posters so the full canvas is visible without scrolling
  useLayoutEffect(() => {
    function fit() {
      const el = canvasAreaRef.current;
      if (!el) return;
      const availH = el.clientHeight - 120;
      const availW = el.clientWidth  - 120;
      if (availH <= 0 || availW <= 0) return;
      const maxZoom = isPosterLarge ? 1.0 : isLabel ? 2.0 : 1.5;
      const fitZ = Math.min(availH / CANVAS_H, availW / CANVAS_W, maxZoom);
      setZoom(parseFloat(Math.max(0.3, fitZ).toFixed(2)));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPosterLarge, isLabel, CANVAS_H, CANVAS_W]);

  // ─── Undo / Redo ──────────────────────────────────────────────────────────
  type HistoryEntry = { sides: Record<Side, SideData>; bgColors: Record<Side, string>; bgSvg: Record<Side, string> };
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef  = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  function pushHistory(sidesSnap: Record<Side, SideData>) {
    historyRef.current.push({ sides: sidesSnap, bgColors: { ...bgColorsRef.current }, bgSvg: { ...bgSvgRef.current } });
    if (historyRef.current.length > 100) historyRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function pushBgHistory() {
    historyRef.current.push({ sides: sidesRef.current, bgColors: { ...bgColorsRef.current }, bgSvg: { ...bgSvgRef.current } });
    if (historyRef.current.length > 100) historyRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ sides: sidesRef.current, bgColors: { ...bgColorsRef.current }, bgSvg: { ...bgSvgRef.current } });
    setCanRedo(true);
    setCanUndo(historyRef.current.length > 0);
    setSides(prev.sides);
    setBgColors(prev.bgColors);
    setBgSvg(prev.bgSvg);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ sides: sidesRef.current, bgColors: { ...bgColorsRef.current }, bgSvg: { ...bgSvgRef.current } });
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    setSides(next.sides);
    setBgColors(next.bgColors);
    setBgSvg(next.bgSvg);
  }

  // Helper: parse an SVG design, apply to state
  function applySVGDesign(
    frontImageUrl: string,
    backImageUrl: string | undefined,
    frontExisting: CanvasItem[],
    backExisting: CanvasItem[],
    frontBgCol: string,
    backBgCol: string,
    dimsOverride?: { CW: number; CH: number; PX: number; PY: number; PW: number; PH: number; coordScale?: number },
  ) {
    const effectivePX = dimsOverride?.PX ?? PRINT_X;
    const effectivePY = dimsOverride?.PY ?? PRINT_Y;
    const coordScale  = dimsOverride?.coordScale ?? 1;
    const targetH     = dimsOverride?.CH ?? CANVAS_H;
    if (dimsOverride) setLabelDims({ ...dimsOverride, coordScale: dimsOverride.coordScale ?? 1 });
    const pf = parseSVGForEditing(frontImageUrl, { extractGraphics: true, px: effectivePX, py: effectivePY });
    const pb = backImageUrl ? parseSVGForEditing(backImageUrl, { extractGraphics: true, px: effectivePX, py: effectivePY }) : null;

    // Compute x/y scale: if the SVG viewBox differs from the canvas, scale items to fill it.
    // E.g. Express Flyer designs (460×297) placed in a Prime Flyer canvas (756×595).
    const getSvgNativeDims = (url: string): { w: number; h: number } => {
      try {
        const enc = url.split(",").slice(1).join(",");
        const raw = url.includes(";base64,") ? atob(enc) : decodeURIComponent(enc);
        const m = raw.match(/viewBox\s*=\s*["']([^"']+)["']/);
        if (!m) return { w: targetW, h: targetH };
        const parts = m[1].trim().split(/[\s,]+/);
        return parts.length >= 4
          ? { w: parseFloat(parts[2]) || targetW, h: parseFloat(parts[3]) || targetH }
          : { w: targetW, h: targetH };
      } catch { return { w: targetW, h: targetH }; }
    };
    const targetW     = dimsOverride?.CW ?? CANVAS_W;
    // When coordScale is already set (label case), it maps SVG native coords → canvas coords.
    // xScale/yScale would duplicate that mapping, so keep them at 1.
    const { w: svgNativeW, h: svgNativeH } = frontImageUrl ? getSvgNativeDims(frontImageUrl) : { w: targetW, h: targetH };
    const xScale = coordScale !== 1 ? 1 : (svgNativeW > 0 && svgNativeW !== targetW ? targetW / svgNativeW : 1);
    const yScale = coordScale !== 1 ? 1 : (svgNativeH > 0 && svgNativeH !== targetH ? targetH / svgNativeH : 1);

    // Scale freshly extracted item coordinates to fit the scaled canvas.
    // Items are stored in print-area-local coords (bbox - printOffset) and rendered
    // inside the print-area div. When xScale/yScale differ from 1, the unscaled
    // printOffset causes drift — correct it with ox/oy so items match the SVG background.
    const scaleItem = (it: CanvasItem): CanvasItem => {
      const cs = coordScale;
      if (cs === 1 && xScale === 1 && yScale === 1) return it;
      const ox = effectivePX * (cs * xScale - 1);
      const oy = effectivePY * (cs * yScale - 1);
      if (it.kind === "text") {
        // Width must accommodate the scaled font size — use max(xScale,yScale) so text never
        // wraps when yScale > xScale (non-uniform stretch). Shift x to keep the text anchor
        // (center / right) at the same scaled SVG position.
        const bigScale = Math.max(xScale, yScale);
        const newW = it.w * cs * bigScale;
        const dx = it.align === "center" ? -it.w * cs * (bigScale - xScale) / 2
                 : it.align === "right"  ? -it.w * cs * (bigScale - xScale)
                 : 0;
        return { ...it, x: it.x * cs * xScale + ox + dx, y: it.y * cs * yScale + oy, w: newW, size: it.size * cs * yScale };
      }
      if (it.kind === "image") return { ...it, x: it.x * cs * xScale + ox, y: it.y * cs * yScale + oy, w: it.w * cs * xScale, h: it.h * cs * yScale };
      return it;
    };

    // Don't patch gradient SVG backgrounds (fill="url(...)") — the frontBgColor is only
    // the canvas fallback color, not a design intent to replace a gradient.
    const frontSvgBg = pf?.bgStr ? readSvgBackground(pf.bgStr) : null;
    const backSvgBg  = pb?.bgStr ? readSvgBackground(pb.bgStr)  : null;
    setBgSvg({
      front: pf?.bgStr ? (isNearWhite(frontBgCol) || frontSvgBg?.startsWith("url(") ? pf.bgStr : patchSvgBackground(pf.bgStr, frontBgCol)) : "",
      back:  pb?.bgStr ? (isNearWhite(backBgCol)  || backSvgBg?.startsWith("url(")  ? pb.bgStr : patchSvgBackground(pb.bgStr, backBgCol))  : "",
    });

    // Use existing items if admin has already edited this design; else extract graphics + text.
    // When seeding back from front, only copy text items (not template graphics).
    const frontPlaceholders = (pf?.graphicItems?.filter((it) => it.photoPlaceholder) ?? []).map((it) => scaleItem(it) as ImageItem);
    const backPlaceholders  = (pb?.graphicItems?.filter((it) => it.photoPlaceholder) ?? []).map((it) => scaleItem(it) as ImageItem);
    const reapplyPlaceholderFlag = (items: CanvasItem[], placeholders: ImageItem[]): CanvasItem[] =>
      items.map((it) => {
        if (it.kind !== "image" || (it as ImageItem).frameItem || (it as ImageItem).photoPlaceholder) return it;
        const matches = placeholders.some((ph) =>
          Math.abs(ph.x - (it as ImageItem).x) <= 15 &&
          Math.abs(ph.y - (it as ImageItem).y) <= 15 &&
          Math.abs(ph.w - (it as ImageItem).w) <= 20 &&
          Math.abs(ph.h - (it as ImageItem).h) <= 20
        );
        return matches ? ({ ...it, photoPlaceholder: true } as CanvasItem) : it;
      });
    const frontItems = frontExisting.length > 0
      ? reapplyPlaceholderFlag(frontExisting, frontPlaceholders)
      : [...(pf?.graphicItems ?? []), ...(pf?.textItems ?? [])].map(scaleItem);
    if (isFlatArt) {
      setBgColors({ front: frontBgCol, back: backImageUrl ? backBgCol : "#ffffff" });
    }

    setSides({
      front: {
        items: frontItems as CanvasItem[],
        template: {
          baseImage: frontImageUrl,
          overlayImage: undefined,
          overlayColor: "#000000",
        },
      },
      back: backImageUrl ? {
        items: (() => {
          const rawBackItems = backExisting.length > 0
            ? reapplyPlaceholderFlag(backExisting, backPlaceholders)
            : [...(pb?.graphicItems ?? []), ...(pb?.textItems ?? [])].map(scaleItem);
          return rawBackItems.length > 0
            ? rawBackItems as CanvasItem[]
            : frontItems.filter((it) => it.kind === "text").map((it) => ({ ...it, id: uid() })) as CanvasItem[];
        })(),
        template: {
          baseImage: backImageUrl,
          overlayImage: undefined,
          overlayColor: "#000000",
        },
      } : { items: [], template: null },
    });
  }

  // Pre-load admin-placed items when in admin mode
  useEffect(() => {
    if (!adminMode) return;
    const fi = adminFrontImage ?? "";
    const bi = adminBackImage ?? "";
    let dimsOverride: typeof LABEL_DIMS_DEFAULT | undefined;
    if (isLabel && fi) {
      const vb = parseSvgViewBox(fi);
      if (vb) dimsOverride = computeLabelDims(vb.vw, vb.vh);
    }
    applySVGDesign(
      fi, bi || undefined,
      (initialFrontItems ?? []) as CanvasItem[],
      (initialBackItems  ?? []) as CanvasItem[],
      initialFrontBgColor ?? "#ffffff",
      initialBackBgColor  ?? "#ffffff",
      dimsOverride,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch templates and auto-apply selected template (customer mode)
  useEffect(() => {
    if (adminMode) return;
    const slug = productSlug ?? shirt?.slug;
    if (!slug) return;
    fetch(`/api/products/${slug}/templates`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { templates?: GalleryTemplate[] }) => {
        const tpls = d.templates ?? [];
        setTemplates(tpls);

        if (templateId) {
          const match = tpls.flatMap((t) => t.designs).find((des) => des.id === templateId);
          if (match) {
            setAppliedDesign(match);
            setActiveVariantId(null);
            if (isFlatArt) {
              // All flat-art products (BC, label, banner, poster, flyer, yard-sign):
              // use applySVGDesign so the SVG is parsed inline, shapes are clickable,
              // and text elements are extracted as editable items when no admin items exist.
              let labelDimsOvr: typeof LABEL_DIMS_DEFAULT | undefined;
              if (isLabel && match.frontImage) {
                const vb = parseSvgViewBox(match.frontImage);
                if (vb) labelDimsOvr = computeLabelDims(vb.vw, vb.vh);
              }
              applySVGDesign(
                match.frontImage,
                (isBusinessCard || isFlyer) ? undefined : (match.backImage ?? undefined),
                (match.frontAdminItems ?? []) as CanvasItem[],
                (isBusinessCard || isFlyer) ? [] : (match.backAdminItems ?? []) as CanvasItem[],
                match.frontBgColor ?? "#ffffff",
                match.backBgColor  ?? "#ffffff",
                labelDimsOvr,
              );
            } else {
              // Shirts and other non-flat-art products
              const color = templateOverlayColor ?? "#000000";
              setBgColors({
                front: match.frontBgColor ?? "#ffffff",
                back:  match.backBgColor  ?? "#ffffff",
              });
              setSides((prev) => ({
                front: {
                  ...prev.front,
                  template: { baseImage: match.frontImage, overlayImage: match.frontAdminItems?.length ? undefined : match.frontOverlay, overlayColor: color },
                  items: (match.frontAdminItems ?? []) as CanvasItem[],
                },
                back: match.backImage
                  ? { ...prev.back, template: { baseImage: match.backImage, overlayImage: match.backAdminItems?.length ? undefined : match.backOverlay, overlayColor: color }, items: (match.backAdminItems ?? []) as CanvasItem[] }
                  : prev.back,
              }));
            }
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSlug ?? shirt?.slug]);

  // Close radius panel when selection changes
  useEffect(() => { setRadiusPanelOpen(false); }, [selectedItemId]);

  // Delete key removes selected item
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedItemId || editingItemId) return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteOrResetImageItem(selectedItemId);
        setSelectedItemId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, editingItemId]);

  // Keyboard undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Item helpers ─────────────────────────────────────────────────────────

  function addTextItem(text: string) {
    const item: TextItem = {
      id: uid(), kind: "text", text,
      x: Math.max(0, PRINT_W / 2 - 70),
      y: Math.max(0, PRINT_H / 2 - 15),
      w: 160, font: "Arial, sans-serif",
      size: 20, bold: false, italic: false, effect: "none", shape: "none", rotation: 0, color: "#000000", align: "center",
    };
    setSides((prev) => {
      pushHistory(prev);
      return { ...prev, [activeSide]: { ...prev[activeSide], items: [...prev[activeSide].items, item] } };
    });
    setSelectedItemId(item.id);
    setActiveTool("text");
  }

  function addImageItem(src: string, w: number, h: number) {
    const item: ImageItem = {
      id: uid(), kind: "image", src,
      x: Math.max(0, Math.min(PRINT_W - w, PRINT_W / 2 - w / 2)),
      y: Math.max(0, Math.min(PRINT_H - h, PRINT_H / 2 - h / 2)),
      w, h, rotation: 0,
    };
    setSides((prev) => {
      pushHistory(prev);
      const existing = prev[activeSide].items;
      // Insert before the first text item so graphic shapes render under text
      const firstTextIdx = existing.findIndex((i) => i.kind === "text");
      const insertAt = firstTextIdx >= 0 ? firstTextIdx : existing.length;
      const newItems = [...existing.slice(0, insertAt), item, ...existing.slice(insertAt)];
      return { ...prev, [activeSide]: { ...prev[activeSide], items: newItems } };
    });
    setSelectedItemId(item.id);
  }

  function updateItem(id: string, updates: Partial<CanvasItem>) {
    setSides((prev) => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        items: prev[activeSide].items.map((it) =>
          it.id === id ? ({ ...it, ...updates } as CanvasItem) : it
        ),
      },
    }));
  }

  function removeItem(id: string) {
    setSides((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        [activeSide]: {
          ...prev[activeSide],
          items: prev[activeSide].items.filter((it) => it.id !== id),
        },
      };
    });
  }

  // Use instead of removeItem for image items — resets photo-placeholder items to
  // empty src (so the Upload Photo box reappears) and fully removes non-placeholder images.
  function deleteOrResetImageItem(id: string) {
    const item = sides[activeSide].items.find((it) => it.id === id);
    if (!item || item.kind !== "image") { removeItem(id); return; }
    const img = item as ImageItem;

    // Fast path: flag already set
    let isPlaceholder = !!img.photoPlaceholder;

    // Fallback: parse the template SVG to find matching placeholder rects
    if (!isPlaceholder) {
      try {
        const baseImg = sides[activeSide].template?.baseImage ?? "";
        if (baseImg.startsWith("data:image/svg+xml")) {
          const enc = baseImg.split(",").slice(1).join(",");
          let raw = "";
          if (baseImg.includes(";base64,")) {
            const b = atob(enc);
            const bytes = new Uint8Array(b.length);
            for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
            raw = new TextDecoder().decode(bytes);
          } else {
            raw = decodeURIComponent(enc);
          }
          const doc2 = new DOMParser().parseFromString(raw, "image/svg+xml");
          isPlaceholder = Array.from(doc2.querySelectorAll("[data-placeholder='photo']")).some((ph) => {
            const px = parseFloat(ph.getAttribute("x") ?? "0") - PRINT_X;
            const py = parseFloat(ph.getAttribute("y") ?? "0") - PRINT_Y;
            const pw = parseFloat(ph.getAttribute("width") ?? "0");
            const ph2 = parseFloat(ph.getAttribute("height") ?? "0");
            return (
              Math.abs(px - img.x) <= 15 &&
              Math.abs(py - img.y) <= 15 &&
              Math.abs(pw - img.w) <= 20 &&
              Math.abs(ph2 - img.h) <= 20
            );
          });
        }
      } catch { /* ignore */ }
    }

    if (isPlaceholder) {
      // Reset to empty placeholder on both sides so Upload Photo box reappears
      setSides((prev) => {
        const next = { ...prev };
        for (const side of ["front", "back"] as const) {
          next[side] = {
            ...prev[side],
            items: prev[side].items.map((it) =>
              it.id === id && it.kind === "image"
                ? ({ ...it, src: "", radii: undefined } as ImageItem)
                : it
            ),
          };
        }
        return next;
      });
      setBrokenImgIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } else {
      removeItem(id);
    }
  }

  function handleShapeClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as Element).closest("[data-id]");
    if (!el) { setShapePick(null); return; }
    const dataId = el.getAttribute("data-id")!;
    const fill   = el.getAttribute("fill")   ?? "#ffffff";
    const stroke = el.getAttribute("stroke") ?? "none";
    const rect   = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setShapePick({
      dataId, side: activeSide, fill, stroke,
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
    });
    e.stopPropagation();
  }

  function updateShapeColor(fill: string, stroke: string) {
    if (!shapePick) return;
    pushBgHistory();
    const patched = patchShapeColor(bgSvg[shapePick.side], shapePick.dataId, fill, stroke);
    setBgSvg((prev) => ({ ...prev, [shapePick.side]: patched }));
    setShapePick((prev) => prev ? { ...prev, fill, stroke } : null);
  }

  function applyTemplate(frontBase: string, frontOverlay: string | undefined, backBase: string | undefined, backOverlay: string | undefined, overlayColor: string, design?: DesignTemplateItem) {
    setAppliedDesign(design ?? null);
    setActiveVariantId(null);
    setSides((prev) => ({
      front: {
        ...prev.front,
        template: {
          baseImage: frontBase,
          overlayImage: design?.frontAdminItems?.length ? undefined : frontOverlay,
          overlayColor,
        },
        items: (design?.frontAdminItems ?? []) as CanvasItem[],
      },
      back: backBase
        ? {
            ...prev.back,
            template: {
              baseImage: backBase,
              overlayImage: design?.backAdminItems?.length ? undefined : backOverlay,
              overlayColor,
            },
            items: (design?.backAdminItems ?? []) as CanvasItem[],
          }
        : { ...prev.back, items: [], template: null },
    }));
  }

  function selectVariant(v: DesignColorVariant | null) {
    setActiveVariantId(v?.id ?? null);
    if (!appliedDesign) return;
    if (v === null) {
      setSides((prev) => ({
        front: prev.front.template
          ? { ...prev.front, template: { ...prev.front.template, baseImage: appliedDesign.frontImage } }
          : prev.front,
        back: prev.back.template && appliedDesign.backImage
          ? { ...prev.back, template: { ...prev.back.template, baseImage: appliedDesign.backImage } }
          : prev.back,
      }));
    } else {
      setSides((prev) => ({
        front: prev.front.template
          ? { ...prev.front, template: { ...prev.front.template, baseImage: v.frontImage } }
          : prev.front,
        back: prev.back.template
          ? { ...prev.back, template: { ...prev.back.template, baseImage: v.backImage ?? prev.back.template.baseImage } }
          : prev.back,
      }));
    }
  }

  // ─── Drag ─────────────────────────────────────────────────────────────────

  function startDrag(e: React.PointerEvent, id: string, ox: number, oy: number, onTap?: () => void) {
    e.preventDefault();
    const capturedSide = activeSide;
    const capturedZoom = zoom;
    dragRef.current = { id, side: capturedSide, sx: e.clientX, sy: e.clientY, ox, oy };
    let snapshot: Record<Side, SideData> | null = null;
    let dragStarted = false;
    const DRAG_THRESHOLD = 4;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / capturedZoom;
      const dy = (ev.clientY - d.sy) / capturedZoom;
      if (!dragStarted) {
        if (Math.abs(ev.clientX - d.sx) < DRAG_THRESHOLD && Math.abs(ev.clientY - d.sy) < DRAG_THRESHOLD) return;
        dragStarted = true;
        didDragRef.current = true;
      }
      setSides((prev) => {
        if (!snapshot) snapshot = prev;
        return {
          ...prev,
          [d.side]: {
            ...prev[d.side],
            items: prev[d.side].items.map((it) => {
              if (it.id !== d.id) return it;
              // Compute rotation-aware AABB so rotated items can reach all corners
              let minX: number, minY: number, maxX: number, maxY: number;
              if (it.kind === "image") {
                const iw = (it as ImageItem).w;
                const ih = (it as ImageItem).h;
                const rad = ((it as ImageItem).rotation ?? 0) * Math.PI / 180;
                const cosR = Math.abs(Math.cos(rad));
                const sinR = Math.abs(Math.sin(rad));
                const effW = iw * cosR + ih * sinR;
                const effH = iw * sinR + ih * cosR;
                // bounds so the rotated AABB stays within the full canvas area
                minX = isFlatArt ? -PRINT_X + effW / 2 - iw / 2 : effW / 2 - iw / 2;
                minY = isFlatArt ? -PRINT_Y + effH / 2 - ih / 2 : effH / 2 - ih / 2;
                maxX = isFlatArt ? CANVAS_W - PRINT_X - iw / 2 - effW / 2 : PRINT_W - iw / 2 - effW / 2;
                maxY = isFlatArt ? CANVAS_H - PRINT_Y - ih / 2 - effH / 2 : PRINT_H - ih / 2 - effH / 2;
              } else {
                minX = isFlatArt ? -PRINT_X : 0;
                minY = isFlatArt ? -PRINT_Y : 0;
                maxX = isFlatArt ? CANVAS_W - PRINT_X : PRINT_W;
                maxY = isFlatArt ? CANVAS_H - PRINT_Y : PRINT_H;
              }
              return {
                ...it,
                x: Math.max(minX, Math.min(maxX, d.ox + dx)),
                y: Math.max(minY, Math.min(maxY, d.oy + dy)),
              };
            }),
          },
        };
      });
    };

    const onUp = () => {
      if (!dragStarted && onTap) onTap();
      if (snapshot) pushHistory(snapshot);
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // Reset after click event has had a chance to fire
      if (dragStarted) setTimeout(() => { didDragRef.current = false; }, 50);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ─── Resize (image corners) ───────────────────────────────────────────────

  function startResize(
    e: React.PointerEvent,
    id: string,
    corner: "nw" | "ne" | "sw" | "se",
    item: ImageItem
  ) {
    e.preventDefault();
    e.stopPropagation();
    const capturedSide = activeSide;
    const capturedZoom = zoom;
    resizeRef.current = {
      id, side: capturedSide, corner,
      sx: e.clientX, sy: e.clientY,
      ox: item.x, oy: item.y, ow: item.w, oh: item.h,
    };

    let snapshotR: Record<Side, SideData> | null = null;

    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = (ev.clientX - r.sx) / capturedZoom;
      const dy = (ev.clientY - r.sy) / capturedZoom;
      const MIN = 20;
      const diag = Math.sqrt(r.ow * r.ow + r.oh * r.oh);

      let delta: number;
      if (r.corner === "se")      delta = ( dx * r.ow + dy * r.oh) / diag;
      else if (r.corner === "nw") delta = (-dx * r.ow - dy * r.oh) / diag;
      else if (r.corner === "ne") delta = ( dx * r.ow - dy * r.oh) / diag;
      else                        delta = (-dx * r.ow + dy * r.oh) / diag;

      const scale = Math.max(MIN / Math.max(r.ow, r.oh), (diag + delta) / diag);
      const newW = r.ow * scale;
      const newH = r.oh * scale;
      let newX = r.ox, newY = r.oy;
      if (r.corner === "nw" || r.corner === "sw") newX = r.ox + r.ow - newW;
      if (r.corner === "nw" || r.corner === "ne") newY = r.oy + r.oh - newH;

      setSides((prev) => {
        if (!snapshotR) snapshotR = prev;
        return {
          ...prev,
          [r.side]: {
            ...prev[r.side],
            items: prev[r.side].items.map((it) =>
              it.id === r.id ? { ...it, x: newX, y: newY, w: newW, h: newH } : it
            ),
          },
        };
      });
    };

    const onUp = () => {
      if (snapshotR) pushHistory(snapshotR);
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ─── Resize (text edges) ─────────────────────────────────────────────────

  function startTextResize(
    e: React.PointerEvent,
    id: string,
    edge: "n" | "s" | "e" | "w",
    item: TextItem
  ) {
    e.preventDefault();
    e.stopPropagation();
    const capturedSide = activeSide;
    const capturedZoom = zoom;
    textResizeRef.current = {
      id, side: capturedSide, edge,
      sx: e.clientX, sy: e.clientY,
      ox: item.x, oy: item.y, ow: item.w,
    };

    let snapshotT: Record<Side, SideData> | null = null;

    const onMove = (ev: PointerEvent) => {
      const r = textResizeRef.current;
      if (!r) return;
      const dx = (ev.clientX - r.sx) / capturedZoom;
      const dy = (ev.clientY - r.sy) / capturedZoom;
      const MIN_W = 40;
      let newX = r.ox, newY = r.oy, newW = r.ow;
      if (r.edge === "e") {
        newW = Math.max(MIN_W, r.ow + dx);
      } else if (r.edge === "w") {
        newW = Math.max(MIN_W, r.ow - dx);
        newX = r.ox + r.ow - newW;
      } else if (r.edge === "n") {
        newY = r.oy + dy;
      }
      // "s" — no-op for auto-height text
      setSides((prev) => {
        if (!snapshotT) snapshotT = prev;
        return {
          ...prev,
          [r.side]: {
            ...prev[r.side],
            items: prev[r.side].items.map((it) =>
              it.id === r.id ? { ...it, x: newX, y: newY, w: newW } : it
            ),
          },
        };
      });
    };

    const onUp = () => {
      if (snapshotT) pushHistory(snapshotT);
      textResizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ─── Edge resize for image items (free W/H, non-proportional) ───────────

  function startEdgeResizeImg(
    e: React.PointerEvent,
    id: string,
    edge: "n" | "s" | "e" | "w",
    item: ImageItem
  ) {
    e.preventDefault();
    e.stopPropagation();
    const capturedSide = activeSide;
    const capturedZoom = zoom;
    const ref = { id, side: capturedSide, edge, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y, ow: item.w, oh: item.h };
    let snapshot: Record<Side, SideData> | null = null;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - ref.sx) / capturedZoom;
      const dy = (ev.clientY - ref.sy) / capturedZoom;
      let newX = ref.ox, newY = ref.oy, newW = ref.ow, newH = ref.oh;
      if (edge === "e") { newW = Math.max(0.1, ref.ow + dx); }
      else if (edge === "w") { newW = Math.max(0.1, ref.ow - dx); newX = ref.ox + ref.ow - newW; }
      else if (edge === "s") { newH = Math.max(0.1, ref.oh + dy); }
      else { newH = Math.max(0.1, ref.oh - dy); newY = ref.oy + ref.oh - newH; }
      setSides((prev) => {
        if (!snapshot) snapshot = prev;
        return { ...prev, [ref.side]: { ...prev[ref.side], items: prev[ref.side].items.map((it) => it.id === ref.id ? { ...it, x: newX, y: newY, w: newW, h: newH } : it) } };
      });
    };

    const onUp = () => {
      if (snapshot) pushHistory(snapshot);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ─── Image upload ─────────────────────────────────────────────────────────

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = PRINT_W - 20;
        const maxH = PRINT_H - 20;
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        addImageItem(src, Math.round(img.naturalWidth * ratio), Math.round(img.naturalHeight * ratio));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleReplacePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const itemId = replacingItemIdRef.current;
    if (!file || !itemId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setSides((prev) => {
        pushHistory(prev);
        const updated = { ...prev };
        for (const side of ["front", "back"] as const) {
          const items = prev[side].items.map((it) =>
            it.id === itemId && it.kind === "image" ? { ...it, src } : it
          );
          updated[side] = { ...prev[side], items };
        }
        return updated;
      });
      setBrokenImgIds((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    replacingItemIdRef.current = null;
  }

  function triggerReplacePhoto(itemId: string) {
    replacingItemIdRef.current = itemId;
    replacePhotoRef.current?.click();
  }

  function addFrame(svgStr: string) {
    const src = svgToDataUrl(svgStr);
    setSides((prev) => {
      pushHistory(prev);
      const item: ImageItem = { id: uid(), kind: "image", src, x: 0, y: 0, w: PRINT_W, h: PRINT_H, rotation: 0, frameItem: true };
      // Insert at index 0 so the frame renders behind all other items (DOM order = stacking order)
      return { ...prev, [activeSide]: { ...prev[activeSide], items: [item, ...prev[activeSide].items] } };
    });
    setActiveTool("material-color");
  }

  function handleFrameUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setSides((prev) => {
        pushHistory(prev);
        const item: ImageItem = { id: uid(), kind: "image", src, x: 0, y: 0, w: PRINT_W, h: PRINT_H, rotation: 0, frameItem: true };
        // Insert at index 0 so the frame renders behind all other items
        return { ...prev, [activeSide]: { ...prev[activeSide], items: [item, ...prev[activeSide].items] } };
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentSide = sides[activeSide];
  const selectedItem = currentSide.items.find((i) => i.id === selectedItemId);
  const selectedText = selectedItem?.kind === "text" ? selectedItem : null;
  const selectedImage = selectedItem?.kind === "image" ? (selectedItem as ImageItem) : null;

  const baseImageSrc = adminMode
    ? (activeSide === "front" ? adminFrontImage : adminBackImage) ?? ""
    : currentSide.template
      ? currentSide.template.baseImage
      : isBusinessCard
        ? BC_CARD_OUTLINE
        : activeSide === "front"
          ? (shirtColor.frontImage ?? shirt?.images[0] ?? "")
          : (shirtColor.backImage ?? shirt?.images[1] ?? shirt?.images[0] ?? "");

  // ─── Tools config ─────────────────────────────────────────────────────────

  const tools: { id: SidebarTool; label: string; icon: React.ReactNode }[] = [
    {
      id: "material-color",
      label: isFlatArt ? "Background" : "Material\ncolor",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      id: "text",
      label: "Text",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
    },
    {
      id: "uploads",
      label: "Uploads",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      id: "graphics",
      label: "Graphics",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      id: "frames",
      label: "Frames",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      ),
    },
    {
      id: "template",
      label: "Template",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
  ];

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#fff", display: "flex", flexDirection: "column" }}>

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div style={{
        height: "64px", borderBottom: "1px solid #e5e7eb", display: "flex",
        alignItems: "center", padding: "0 1.25rem", gap: "0.75rem",
        background: "#fff", flexShrink: 0,
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "0.45rem 1rem", border: "1.5px solid #e5e7eb",
          borderRadius: "999px", background: "#fff", cursor: "pointer",
          fontSize: "0.85rem", color: "#374151", fontWeight: 600, flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Contextual text controls OR product name */}
        {selectedImage ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", minWidth: 0 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", flexShrink: 0 }}>Graphic</span>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>W</span>
              <input
                type="number" min={0.1} step={0.1} max={800}
                value={parseFloat(selectedImage.w.toFixed(1))}
                onChange={(e) => {
                  const w = Math.max(0.1, Number(e.target.value));
                  setSides((prev) => ({ ...prev, [activeSide]: { ...prev[activeSide], items: prev[activeSide].items.map((it) => it.id === selectedImage.id ? { ...it, w } : it) } }));
                }}
                style={{ width: "60px", padding: "0.35rem 0.4rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.82rem", color: "#374151", background: "#fafafa" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>H</span>
              <input
                type="number" min={0.1} step={0.1} max={800}
                value={parseFloat(selectedImage.h.toFixed(1))}
                onChange={(e) => {
                  const h = Math.max(0.1, Number(e.target.value));
                  setSides((prev) => ({ ...prev, [activeSide]: { ...prev[activeSide], items: prev[activeSide].items.map((it) => it.id === selectedImage.id ? { ...it, h } : it) } }));
                }}
                style={{ width: "60px", padding: "0.35rem 0.4rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.82rem", color: "#374151", background: "#fafafa" }}
              />
            </div>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            {/* Color swatches */}
            {selectedImage.src.startsWith("data:image/svg+xml") && (() => {
              const currentColor = readGraphicColor(selectedImage.src);
              const applyColor = (color: string) => {
                const newSrc = patchGraphicColor(selectedImage.src, color);
                setSides((prev) => ({ ...prev, [activeSide]: { ...prev[activeSide], items: prev[activeSide].items.map((it) => it.id === selectedImage.id ? { ...it, src: newSrc } : it) } }));
              };
              return (
                <>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    {GRAPHIC_COLORS.map((c) => (
                      <button key={c} onClick={() => applyColor(c)} title={c}
                        style={{
                          width: 24, height: 24, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                          border: `2.5px solid ${currentColor === c ? "#7c3aed" : "#e5e7eb"}`,
                          boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #d1d5db" : "0 1px 4px rgba(0,0,0,0.15)",
                          outline: currentColor === c ? "2px solid rgba(124,58,237,0.25)" : "none",
                          outlineOffset: 2,
                          transform: currentColor === c ? "scale(1.15)" : "scale(1)",
                          transition: "transform 0.1s",
                        }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={currentColor.startsWith("#") && currentColor.length === 7 ? currentColor : "#374151"}
                    onChange={(e) => applyColor(e.target.value)}
                    title="Custom color"
                    style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", borderRadius: "8px", padding: "2px", background: "#fff", cursor: "pointer", flexShrink: 0 }}
                  />
                  <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
                </>
              );
            })()}
            {/* Rotation */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <input
                type="range" min={-180} max={180} step={1}
                value={selectedImage.rotation ?? 0}
                onChange={(e) => updateItem(selectedImage.id, { rotation: Number(e.target.value) })}
                style={{ width: "68px", accentColor: "#7c3aed", cursor: "pointer" }}
              />
              <button
                onClick={() => updateItem(selectedImage.id, { rotation: 0 })}
                title="Reset rotation"
                style={{
                  width: "28px", height: "28px", border: "1.5px solid #e5e7eb", borderRadius: "7px",
                  background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >↺</button>
              <input
                type="number" min={-180} max={180} step={1}
                value={Math.round(selectedImage.rotation ?? 0)}
                onChange={(e) => updateItem(selectedImage.id, { rotation: Number(e.target.value) })}
                style={{ width: "48px", padding: "0.3rem 0.35rem", border: "1.5px solid #e5e7eb", borderRadius: "7px", fontSize: "0.8rem", color: "#374151", background: "#fafafa" }}
              />
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", flexShrink: 0 }}>°</span>
            </div>
            {/* Layer order controls */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
              <button
                title="Bring forward"
                onClick={() => setSides((prev) => {
                  const items = [...prev[activeSide].items];
                  const idx = items.findIndex((i) => i.id === selectedImage.id);
                  if (idx < items.length - 1) { [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]; }
                  return { ...prev, [activeSide]: { ...prev[activeSide], items } };
                })}
                style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↑</button>
              <button
                title="Send backward"
                onClick={() => setSides((prev) => {
                  const items = [...prev[activeSide].items];
                  const idx = items.findIndex((i) => i.id === selectedImage.id);
                  if (idx > 0) { [items[idx], items[idx - 1]] = [items[idx - 1], items[idx]]; }
                  return { ...prev, [activeSide]: { ...prev[activeSide], items } };
                })}
                style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↓</button>
            </div>
            {!selectedImage.frameItem && <>
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            {/* Corner radius button */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                title="Corner Radius"
                onClick={() => {
                  const r = selectedImage.radii ?? { tl: 0, tr: 0, br: 0, bl: 0 };
                  setDraftRadii(r);
                  setRadiusPanelOpen((v) => !v);
                }}
                style={{
                  width: 32, height: 32, border: "1.5px solid #e5e7eb", borderRadius: "8px",
                  background: radiusPanelOpen ? "#ede9fe" : "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: radiusPanelOpen ? "#7c3aed" : "#6b7280",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6 V3 Q3 2 6 2 H10 Q13 2 14 3 V6" strokeLinecap="round" />
                  <rect x="2" y="6" width="12" height="8" rx="0" fill="none" stroke="none"/>
                  <path d="M2 10 V13 Q3 14 6 14 H10 Q13 14 14 13 V10" strokeLinecap="round" />
                  <line x1="2" y1="6" x2="2" y2="10" />
                  <line x1="14" y1="6" x2="14" y2="10" />
                </svg>
              </button>
              {radiusPanelOpen && (
                <div
                  style={{
                    position: "fixed", top: 60, right: 16, zIndex: 999,
                    background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.13)", padding: "14px 16px",
                    width: 220,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 10 }}>Corner Radius</div>
                  {(
                    [
                      { key: "tl", label: "Top Left" },
                      { key: "tr", label: "Top Right" },
                      { key: "br", label: "Bottom Right" },
                      { key: "bl", label: "Bottom Left" },
                    ] as { key: keyof typeof draftRadii; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280", width: 88 }}>{label}</span>
                      <input
                        type="number" min={0} max={200} step={1}
                        value={draftRadii[key]}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          const next = { ...draftRadii, [key]: val };
                          setDraftRadii(next);
                          setSides((prev) => ({
                            ...prev,
                            [activeSide]: {
                              ...prev[activeSide],
                              items: prev[activeSide].items.map((it) =>
                                it.id === selectedImage.id ? { ...it, radii: next } : it
                              ),
                            },
                          }));
                        }}
                        style={{
                          width: 70, padding: "0.3rem 0.4rem",
                          border: "1.5px solid #e5e7eb", borderRadius: "7px",
                          fontSize: "0.82rem", color: "#374151", background: "#fafafa",
                          textAlign: "right",
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setRadiusPanelOpen(false)}
                    style={{
                      width: "100%", marginTop: 4, padding: "0.45rem",
                      background: "#7c3aed", color: "#fff", border: "none",
                      borderRadius: "8px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
            </>}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <button
              onClick={() => { deleteOrResetImageItem(selectedImage.id); setSelectedItemId(null); }}
              style={{
                padding: "0.4rem 0.9rem", border: "1.5px solid #fca5a5",
                borderRadius: "8px", background: "#fef2f2", color: "#b91c1c",
                fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0,
              }}
            >
              Delete
            </button>
          </div>
        ) : selectedText ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", minWidth: 0 }}>
            {/* Font */}
            <FontPicker
              value={selectedText.font}
              onChange={(v) => updateItem(selectedText.id, { font: v })}
            />

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Size */}
            <select
              value={selectedText.size}
              onChange={(e) => updateItem(selectedText.id, { size: Number(e.target.value) })}
              style={{
                padding: "0.4rem 0.5rem", border: "1.5px solid #e5e7eb", borderRadius: "8px",
                fontSize: "0.82rem", color: "#374151", width: "72px", flexShrink: 0,
                background: "#fafafa", fontWeight: 600, cursor: "pointer",
              }}
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Bold */}
            <button
              onClick={() => updateItem(selectedText.id, { bold: !selectedText.bold })}
              style={{
                width: "36px", height: "36px", border: "1.5px solid #e5e7eb", borderRadius: "8px",
                background: selectedText.bold ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#fff",
                color: selectedText.bold ? "#fff" : "#374151",
                fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: selectedText.bold ? "0 2px 8px rgba(124,58,237,0.35)" : "none",
              }}
            >
              B
            </button>

            {/* Italic */}
            <button
              onClick={() => updateItem(selectedText.id, { italic: !selectedText.italic })}
              style={{
                width: "36px", height: "36px", border: "1.5px solid #e5e7eb", borderRadius: "8px",
                background: selectedText.italic ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#fff",
                color: selectedText.italic ? "#fff" : "#374151",
                fontStyle: "italic", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: selectedText.italic ? "0 2px 8px rgba(124,58,237,0.35)" : "none",
              }}
            >
              I
            </button>

            {/* Effects */}
            <button
              onClick={() => setShowEffects(true)}
              style={{
                width: "36px", height: "36px", border: "1.5px solid #e5e7eb", borderRadius: "8px",
                background: (selectedText.effect !== "none" || selectedText.shape !== "none")
                  ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#fff",
                color: (selectedText.effect !== "none" || selectedText.shape !== "none") ? "#fff" : "#374151",
                fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0,
                letterSpacing: "0.03em", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: (selectedText.effect !== "none" || selectedText.shape !== "none") ? "0 2px 8px rgba(124,58,237,0.35)" : "none",
              }}
            >
              Fx
            </button>

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Rotation slider + reset + number */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <input
                type="range" min={-180} max={180} step={1}
                value={selectedText.rotation ?? 0}
                onChange={(e) => updateItem(selectedText.id, { rotation: Number(e.target.value) })}
                style={{ width: "68px", accentColor: "#7c3aed", cursor: "pointer" }}
              />
              <button
                onClick={() => updateItem(selectedText.id, { rotation: 0 })}
                title="Reset rotation"
                style={{
                  width: "28px", height: "28px", border: "1.5px solid #e5e7eb", borderRadius: "7px",
                  background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >↺</button>
              <input
                type="number" min={-180} max={180} step={1}
                value={Math.round(selectedText.rotation ?? 0)}
                onChange={(e) => updateItem(selectedText.id, { rotation: Number(e.target.value) })}
                style={{
                  width: "48px", padding: "0.3rem 0.35rem", border: "1.5px solid #e5e7eb",
                  borderRadius: "7px", fontSize: "0.8rem", color: "#374151", background: "#fafafa",
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", flexShrink: 0 }}>°</span>
            </div>

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Alignment */}
            <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => updateItem(selectedText.id, { align: a })}
                  title={a}
                  style={{
                    width: "34px", height: "34px", border: "1.5px solid #e5e7eb", borderRadius: "8px",
                    background: selectedText.align === a ? "#f3f0ff" : "#fff",
                    color: selectedText.align === a ? "#7c3aed" : "#6b7280",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {a === "left" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                    </svg>
                  )}
                  {a === "center" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                  )}
                  {a === "right" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Color swatches */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateItem(selectedText.id, { color: c })}
                  title={c}
                  style={{
                    width: "24px", height: "24px", borderRadius: "50%", background: c,
                    border: `2.5px solid ${selectedText.color === c ? "#7c3aed" : "#e5e7eb"}`,
                    cursor: "pointer", padding: 0, flexShrink: 0,
                    boxShadow: c === "#ffffff" ? "inset 0 0 0 1px #d1d5db" : "0 1px 4px rgba(0,0,0,0.15)",
                    outline: selectedText.color === c ? "2px solid rgba(124,58,237,0.25)" : "none",
                    outlineOffset: "2px",
                    transform: selectedText.color === c ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.1s",
                  }}
                />
              ))}
            </div>

            {/* Layer order for text */}
            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
              <button
                title="Bring forward"
                onClick={() => setSides((prev) => {
                  const items = [...prev[activeSide].items];
                  const idx = items.findIndex((i) => i.id === selectedText.id);
                  if (idx < items.length - 1) { [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]; }
                  return { ...prev, [activeSide]: { ...prev[activeSide], items } };
                })}
                style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↑</button>
              <button
                title="Send backward"
                onClick={() => setSides((prev) => {
                  const items = [...prev[activeSide].items];
                  const idx = items.findIndex((i) => i.id === selectedText.id);
                  if (idx > 0) { [items[idx], items[idx - 1]] = [items[idx - 1], items[idx]]; }
                  return { ...prev, [activeSide]: { ...prev[activeSide], items } };
                })}
                style={{ width: 28, height: 28, border: "1.5px solid #e5e7eb", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
              >↓</button>
            </div>
            {/* Delete text item */}
            <button
              onClick={() => { removeItem(selectedText.id); setSelectedItemId(null); }}
              style={{
                padding: "0.4rem 0.9rem", border: "1.5px solid #fca5a5",
                borderRadius: "8px", background: "#fef2f2", color: "#b91c1c",
                fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", flexShrink: 0,
              }}
            >
              Delete
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", lineHeight: 1.2 }}>
              Design Editor
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "2px" }}>
              Customize your design
            </div>
          </div>
        )}

        {/* Right actions */}
        <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
          {!adminMode && (
            <button
              onClick={async () => {
                setPreviewLoading(true);
                setPreviewRotY(0);
                setPreviewOpen(true);
                try {
                  const pScale = Math.max(1, Math.min(3, Math.ceil(800 / Math.max(CANVAS_W, CANVAS_H))));
                  const [fp, bp] = await Promise.all([
                    generateSidePreviewPNG("front", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, pScale),
                    generateSidePreviewPNG("back",  sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, pScale),
                  ]);
                  setPreviewFrontPng(fp);
                  setPreviewBackPng(bp);
                } finally {
                  setPreviewLoading(false);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "0.45rem 1rem", border: "1.5px solid #e5e7eb",
                borderRadius: "999px", background: "#fff", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 600, color: "#374151",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Preview
            </button>
          )}
          <button
            onClick={adminMode && onSaveAdmin
              ? async () => {
                  // Generate complete previews (bgColor + SVG template + items) so the
                  // saved frontOverlay/backOverlay exactly matches the editor view.
                  const frontPNG = await generateSidePreviewPNG("front", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims);
                  const backPNG  = (sides.back.items.length > 0 || bgSvg.back || sides.back.template?.baseImage)
                    ? await generateSidePreviewPNG("back", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims)
                    : "";
                  const toSvgUrl = (s: string) =>
                    s ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}` : undefined;
                  onSaveAdmin(
                    sides.front.items as SerializableItem[],
                    sides.back.items as SerializableItem[],
                    frontPNG,
                    backPNG,
                    isFlatArt ? bgColors.front : undefined,
                    isFlatArt ? bgColors.back : undefined,
                    isFlatArt ? toSvgUrl(bgSvg.front) : undefined,
                    isFlatArt ? toSvgUrl(bgSvg.back) : undefined
                  );
                }
              : !adminMode
              ? async () => {
                  setPreviewLoading(true);
                  setFinalRotY(0);
                  finalRotRef.current = 0;
                  setDesignApproved(false);
                  setSelectedQty(0);
                  setFinalStepsOpen(true);
                  try {
                    const pScale = Math.max(1, Math.min(3, Math.ceil(800 / Math.max(CANVAS_W, CANVAS_H))));
                    const [fp, bp] = await Promise.all([
                      generateSidePreviewPNG("front", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, pScale),
                      generateSidePreviewPNG("back",  sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, pScale),
                    ]);
                    setPreviewFrontPng(fp);
                    setPreviewBackPng(bp);
                  } finally {
                    setPreviewLoading(false);
                  }
                }
              : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0.45rem 1.25rem",
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              color: "#fff", border: "none", borderRadius: "999px", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: 700,
              boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
            }}>
            {adminMode ? "Save Design" : "Save & Continue →"}
          </button>
        </div>
      </div>

      {/* ── Editor body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar icons */}
        <div style={{
          width: "92px", borderRight: "1px solid #e5e7eb", background: "#fff",
          display: "flex", flexDirection: "column", gap: "4px",
          padding: "10px 6px", flexShrink: 0,
        }}>
          {tools.map((tool) => (
            <SidebarIcon
              key={tool.id}
              active={activeTool === tool.id}
              onClick={() => tool.id === "template" ? setTemplateModalOpen(true) : setActiveTool(tool.id)}
              icon={tool.icon}
              label={tool.label}
            />
          ))}
        </div>

        {/* Expanded panel */}
        <div style={{
          width: "200px", borderRight: "1px solid #e5e7eb", background: "#fff",
          overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{
            padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid #f3f4f6",
          }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
              {activeTool === "material-color" && (isBusinessCard ? "Background" : "Material color")}
              {activeTool === "text" && "Text"}
              {activeTool === "uploads" && "Uploads"}
              {activeTool === "graphics" && "Graphics"}
              {activeTool === "frames" && "Frames"}
            </span>
          </div>

          {activeTool === "material-color" && (
            isFlatArt ? (
              /* ── Business card / flyer background color picker ── */
              <div style={{ padding: "1.25rem 1.25rem 0" }}>

                {/* ── Background Color section ── */}
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                  {materialColors && materialColors.length > 0 ? "Material color" : "Background Color"}
                </p>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#6b7280" }}>
                  Card Background
                  <br />
                  <span style={{ color: "#374151", fontWeight: 600 }}>
                    Selected: {colorPresets.find(p => p.value === bgColors[activeSide])?.label ?? bgColors[activeSide]}
                  </span>
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                  {colorPresets.map((p) => {
                    const isActive = bgColors[activeSide] === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => {
                          pushBgHistory();
                          setBgColors({ front: p.value, back: p.value });
                          setBgSvg((prev) => ({
                            front: patchSvgBackground(prev.front, p.value),
                            back:  patchSvgBackground(prev.back,  p.value),
                          }));
                        }}
                        title={p.label}
                        style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: p.value,
                          border: `2.5px solid ${isActive ? "#7c3aed" : "#e5e7eb"}`,
                          cursor: "pointer", padding: 0,
                          outline: isActive ? "3px solid rgba(124,58,237,0.25)" : "none",
                          outlineOffset: "2px",
                          boxShadow: p.value === "#ffffff" ? "inset 0 0 0 1px #e5e7eb" : "0 2px 6px rgba(0,0,0,0.15)",
                          transition: "transform 0.1s, border-color 0.1s",
                          transform: isActive ? "scale(1.12)" : "scale(1)",
                        }}
                        aria-label={p.label}
                      />
                    );
                  })}
                </div>


                {/* ── Custom Color section ── */}
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem", paddingBottom: "1.25rem" }}>
                  <p style={{ margin: "0 0 0.6rem", fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                    Custom Color
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={bgColors[activeSide].startsWith("#") && bgColors[activeSide].length === 7 ? bgColors[activeSide] : "#ffffff"}
                      onMouseDown={() => pushBgHistory()}
                      onChange={(e) => {
                        const c = e.target.value;
                        setBgColors({ front: c, back: c });
                        setBgSvg((prev) => ({
                          front: patchSvgBackground(prev.front, c),
                          back:  patchSvgBackground(prev.back,  c),
                        }));
                      }}
                      style={{
                        width: "44px", height: "44px", border: "2px solid #e5e7eb",
                        borderRadius: "10px", padding: "2px", background: "#fff",
                        cursor: "pointer", flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontFamily: "monospace", fontSize: "0.85rem", color: "#374151",
                      fontWeight: 600, letterSpacing: "0.05em",
                    }}>
                      {bgColors[activeSide].startsWith("#") ? bgColors[activeSide].toUpperCase() : "#FFFFFF"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (() => {
              const hasTemplateColors = appliedDesign && (appliedDesign.colorVariants?.length ?? 0) > 0;
              const activeVariant = appliedDesign?.colorVariants?.find((v) => v.id === activeVariantId) ?? null;
              const selectedName = hasTemplateColors
                ? (activeVariant ? activeVariant.colorName : (appliedDesign!.colorName || "Primary"))
                : shirtColor.name;

              return (
                <div style={{ padding: "1.25rem" }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Material color</p>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                    Selected: <strong style={{ color: "#111827" }}>{selectedName}</strong>
                  </p>

                  {hasTemplateColors ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => selectVariant(null)}
                        title={appliedDesign!.colorName || "Primary"}
                        aria-label={appliedDesign!.colorName || "Primary"}
                        style={{
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: appliedDesign!.colorHex || "#e5e7eb",
                          border: `2px solid ${activeVariantId === null ? "#3b82f6" : "#d1d5db"}`,
                          cursor: "pointer", padding: 0,
                          outline: activeVariantId === null ? "3px solid #bfdbfe" : "none",
                          outlineOffset: "2px",
                        }}
                      />
                      {appliedDesign!.colorVariants!.map((v) => (
                        <button key={v.id} onClick={() => selectVariant(v)} title={v.colorName}
                          aria-label={v.colorName}
                          style={{
                            width: "34px", height: "34px", borderRadius: "50%", background: v.colorHex,
                            border: `2px solid ${activeVariantId === v.id ? "#3b82f6" : "#d1d5db"}`,
                            cursor: "pointer", padding: 0,
                            outline: activeVariantId === v.id ? "3px solid #bfdbfe" : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(shirt?.colors ?? []).map((color) => (
                        <button key={color.name} onClick={() => setShirtColor(color)} title={color.name}
                          style={{
                            width: "34px", height: "34px", borderRadius: "50%", background: color.hex,
                            border: `2px solid ${shirtColor.name === color.name ? "#3b82f6" : "#d1d5db"}`,
                            cursor: "pointer", padding: 0,
                            outline: shirtColor.name === color.name ? "3px solid #bfdbfe" : "none",
                            outlineOffset: "2px",
                          }}
                          aria-label={color.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {activeTool === "text" && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ margin: "0 0 1rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Add Text</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(isBusinessCard
                  ? ["Company Name", "Your Name", "Title", "Phone", "Email", "Website"]
                  : ["Company Name", "Tagline", "Staff Name", "Department"]
                ).map((label) => (
                  <button key={label} onClick={() => addTextItem(label)}
                    style={{
                      padding: "0.65rem 0.75rem", border: "1px solid #e5e7eb",
                      borderRadius: "8px", background: "#fff", cursor: "pointer",
                      textAlign: "left", fontSize: "0.85rem", color: "#374151", fontWeight: 500,
                    }}
                  >
                    + {label}
                  </button>
                ))}
                <button onClick={() => addTextItem("Custom text")}
                  style={{
                    padding: "0.65rem 0.75rem", border: "2px dashed #06b6d4",
                    borderRadius: "8px", background: "#f0fdff", cursor: "pointer",
                    textAlign: "left", fontSize: "0.85rem", color: "#0891b2", fontWeight: 600,
                  }}
                >
                  + Add custom text
                </button>
              </div>
            </div>
          )}

          {activeTool === "uploads" && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ margin: "0 0 1rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Uploads</p>
              <input ref={uploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              <button
                onClick={() => uploadRef.current?.click()}
                style={{
                  width: "100%", padding: "1rem", border: "2px dashed #d1d5db",
                  borderRadius: "10px", background: "#fafafa", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  color: "#6b7280", fontSize: "0.8rem",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                <span style={{ fontWeight: 600 }}>Upload from computer</span>
                <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>JPG, PNG, SVG</span>
              </button>
            </div>
          )}

          {activeTool === "graphics" && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Graphics</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {GRAPHIC_SHAPES.map((shape) => (
                  <button
                    key={shape.label}
                    onClick={() => addImageItem(svgToDataUrl(shape.svg), shape.w, shape.h)}
                    title={shape.label}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: "5px", padding: "10px 6px",
                      border: "1px solid #e5e7eb", borderRadius: "10px",
                      background: "#fff", cursor: "pointer",
                    }}
                  >
                    <svg
                      viewBox={shape.vb}
                      style={{ width: "100%", maxWidth: 48, height: 40 }}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {shape.preview}
                    </svg>
                    <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#374151" }}>
                      {shape.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === "frames" && (
            <div style={{ padding: "1.25rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Frames</p>
              {/* Upload custom frame */}
              <input ref={frameUploadRef} type="file" accept="image/*,image/svg+xml" style={{ display: "none" }} onChange={handleFrameUpload} />
              <button
                onClick={() => frameUploadRef.current?.click()}
                style={{
                  width: "100%", padding: "0.6rem", marginBottom: "0.9rem",
                  border: "2px dashed #d1d5db", borderRadius: "8px",
                  background: "#fafafa", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  color: "#6b7280", fontSize: "0.78rem", fontWeight: 600,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                Upload your frame
              </button>
              {/* Built-in frames */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {BUILT_IN_FRAMES.map((frame) => (
                  <button
                    key={frame.label}
                    onClick={() => addFrame(frame.svg)}
                    title={frame.label}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                      padding: "8px 4px",
                      border: "1px solid #e5e7eb", borderRadius: "10px",
                      background: "#fff", cursor: "pointer",
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: frame.svg }}
                      style={{ width: 60, height: 60, overflow: "hidden", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "0.63rem", fontWeight: 600, color: "#374151", textAlign: "center" }}>
                      {frame.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Canvas area ─────────────────────────────────────────────── */}
        {/* Outer shell — holds scrollable canvas + zoom controls below */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f3f4f6" }}>

          {/* Scrollable inner area — centers canvas when small, scrolls when large */}
          <div
            ref={canvasAreaRef}
            style={{ flex: 1, overflow: "auto" }}
            onClick={() => { setSelectedItemId(null); setEditingItemId(null); setShapePick(null); }}
          >
            <div style={{ minWidth: "100%", minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", boxSizing: "border-box" }}>

              {/* Actual-layout-size wrapper — gives scroll container real dimensions matching the visual canvas */}
              <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom, position: "relative", flexShrink: 0 }}>

          {/* Canvas with zoom transform — wrapper includes dimension lines so they scale together */}
          <div style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0, left: 0,
            width: CANVAS_W,
            height: CANVAS_H,
          }}>

            {/* Safety area / Bleed legend — top right, above the card */}
            <div style={{
              position: "absolute", top: -60, right: 0,
              display: "flex", gap: 12, pointerEvents: "none", zIndex: 10,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "9px 24px",
                borderRadius: 999, border: "2.5px solid #22c55e", background: "#f0fdf4",
                color: "#15803d", fontSize: "1.3rem", fontWeight: 700, whiteSpace: "nowrap",
              }}>
                Safety Area
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "9px 24px",
                borderRadius: 999, border: "2.5px solid #3b82f6", background: "#eff6ff",
                color: "#1d4ed8", fontSize: "1.3rem", fontWeight: 700, whiteSpace: "nowrap",
              }}>
                Bleed
              </span>
            </div>

            {/* Vertical dimension line — left of card, outside */}
            <div style={{
              position: "absolute", right: "100%", top: 0,
              height: CANVAS_H, width: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginRight: 10, pointerEvents: "none",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: "100%", position: "relative" }}>
                {/* Top tick */}
                <div style={{ width: 16, height: "3px", background: "rgba(40,40,40,1)", flexShrink: 0 }} />
                {/* Top line */}
                <div style={{ flex: 1, width: "3px", background: "rgba(40,40,40,0.85)" }} />
                {/* Label */}
                <span style={{
                  fontSize: "1.15rem", color: "rgba(20,20,20,1)", fontWeight: 900,
                  writingMode: "vertical-rl", transform: "rotate(180deg)",
                  whiteSpace: "nowrap", margin: "6px 0", letterSpacing: "0.02em",
                }}>
                  {customDimsInches ? `${customDimsInches.height} inches` : isBusinessCard ? "2 inches" : isFlyerExpress ? "5.5 inches" : isFlyerPrime ? "11 inches" : isPosterSmall ? "17 inches" : isPosterLarge ? "24 inches" : isBannerVinyl ? "3 inches" : isBannerOutdoor ? "4 inches" : isBannerRollup ? "81 inches" : isLabel ? "4 inches" : isYardSign ? "24 inches" : "30.48cm"}
                </span>
                {/* Bottom line */}
                <div style={{ flex: 1, width: "3px", background: "rgba(40,40,40,0.85)" }} />
                {/* Bottom tick */}
                <div style={{ width: 16, height: "3px", background: "rgba(40,40,40,1)", flexShrink: 0 }} />
              </div>
            </div>

            {/* Horizontal dimension line — below card, outside */}
            <div style={{
              position: "absolute", top: "100%", left: 0,
              width: CANVAS_W, height: 24,
              display: "flex", alignItems: "center",
              marginTop: 10, pointerEvents: "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
                {/* Left tick */}
                <div style={{ width: "3px", height: 16, background: "rgba(40,40,40,1)", flexShrink: 0 }} />
                {/* Left line */}
                <div style={{ flex: 1, height: "3px", background: "rgba(40,40,40,0.85)" }} />
                {/* Label */}
                <span style={{
                  fontSize: "1.15rem", color: "rgba(20,20,20,1)", fontWeight: 900,
                  whiteSpace: "nowrap", margin: "0 8px", letterSpacing: "0.02em",
                }}>
                  {customDimsInches ? `${customDimsInches.width} inches` : isBusinessCard ? "3.5 inches" : isFlyer ? "8.5 inches" : isPosterSmall ? "11 inches" : isPosterLarge ? "18 inches" : isBannerVinyl ? "6 inches" : isBannerOutdoor ? "8 inches" : isBannerRollup ? "33 inches" : isLabel ? "4 inches" : isYardSign ? "18 inches" : "30.48cm"}
                </span>
                {/* Right line */}
                <div style={{ flex: 1, height: "3px", background: "rgba(40,40,40,0.85)" }} />
                {/* Right tick */}
                <div style={{ width: "3px", height: 16, background: "rgba(40,40,40,1)", flexShrink: 0 }} />
              </div>
            </div>

            {/* Inner canvas — has borderRadius + overflow clipping for BC */}
            <div style={{
              position: "absolute", inset: 0,
              boxShadow: "0 0 0 2.5px #3b82f6",
              ...(isFlatArt ? { borderRadius: "0px", overflow: "hidden" } : {}),
            }}>
            {/* Canvas background for business card — only shown when no SVG template (pure colour designs) */}
            {isFlatArt && !bgSvg[activeSide] && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "0px",
                background: bgColors[activeSide],
                zIndex: 0,
              }} />
            )}

            {/* Base image — inline SVG when bgSvg available (allows shape click-to-edit) */}
            <div
              style={{ position: "absolute", inset: 0, borderRadius: "0px", overflow: "hidden", zIndex: 1 }}
              onClick={bgSvg[activeSide] ? handleShapeClick : undefined}
            >
              {bgSvg[activeSide] ? (
                <div
                  dangerouslySetInnerHTML={{ __html: bgSvg[activeSide] }}
                  style={{ width: "100%", height: "100%", cursor: "pointer" }}
                />
              ) : baseImageSrc ? (
                <img
                  src={baseImageSrc}
                  alt={shirt?.name ?? "design"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : null}
            </div>

            {/* Raster-image notice — shown when the design is PNG/JPEG (can't extract editable elements) */}
            {isBusinessCard && !bgSvg[activeSide] && baseImageSrc && !baseImageSrc.startsWith("data:image/svg+xml") && baseImageSrc !== BC_CARD_OUTLINE && (
              <div style={{
                position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
                zIndex: 20, background: "rgba(17,24,39,0.82)", color: "#fff",
                borderRadius: "8px", padding: "5px 12px",
                fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap",
                pointerEvents: "none",
              }}>
                PNG design — use the Text tool to add editable elements on top
              </div>
            )}

            {/* Template overlay (colorized) — apparel only */}
            {!isBusinessCard && currentSide.template?.overlayImage && (
              <div
                style={{
                  position: "absolute", inset: 0, borderRadius: "12px", overflow: "hidden", zIndex: 2,
                  background: currentSide.template.overlayColor,
                  WebkitMaskImage: `url(${currentSide.template.overlayImage})`,
                  maskImage: `url(${currentSide.template.overlayImage})`,
                  WebkitMaskSize: "cover", maskSize: "cover",
                  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center", maskPosition: "center",
                } as React.CSSProperties}
              />
            )}

            {/* Print area */}
            <div
              style={{
                position: "absolute",
                left: PRINT_X, top: PRINT_Y,
                width: PRINT_W, height: PRINT_H,
                borderRadius: "4px",
                boxSizing: "border-box",
                overflow: "visible",
                zIndex: 3,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedItemId(null);
                  setEditingItemId(null);
                  // The bgSvg layer (zIndex 1) is behind this container (zIndex 3).
                  // Use elementsFromPoint to reach [data-id] shapes in the SVG below.
                  if (bgSvg[activeSide]) {
                    const under = document.elementsFromPoint(e.clientX, e.clientY);
                    const shapeEl = under.find(el => el !== e.currentTarget && el.hasAttribute("data-id"));
                    if (shapeEl) {
                      const fill   = shapeEl.getAttribute("fill")   ?? "#ffffff";
                      const stroke = shapeEl.getAttribute("stroke") ?? "none";
                      const canvasRect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect()
                                       ?? (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setShapePick({ dataId: shapeEl.getAttribute("data-id")!, side: activeSide, fill, stroke, px: e.clientX - canvasRect.left, py: e.clientY - canvasRect.top });
                      return;
                    }
                  }
                  setShapePick(null);
                }
              }}
            >
              {/* Safety area inner line — 5px from canvas edge */}
              <div style={{
                position: "absolute",
                top:    -(PRINT_Y - 5),
                bottom: -(CANVAS_H - PRINT_Y - PRINT_H - 5),
                left:   -(PRINT_X - 5),
                right:  -(CANVAS_W - PRINT_X - PRINT_W - 5),
                border: "1px dashed #22c55e",
                borderRadius: "0px", pointerEvents: "none",
              }} />

              {/* Design items */}
              {currentSide.items.map((item) => {
                const isSelected = selectedItemId === item.id;
                const isEditing = editingItemId === item.id;

                if (item.kind === "text") {
                  return (
                    <div
                      key={`${item.id}-${isEditing}`}
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus={isEditing}
                      style={{
                        position: "absolute",
                        left: item.x, top: item.y, width: item.w,
                        boxSizing: "border-box",
                        border: isSelected
                          ? "1.5px solid #1d4ed8"
                          : "1px dashed transparent",
                        cursor: isEditing ? "text" : "move",
                        userSelect: isEditing ? "text" : "none",
                        fontFamily: item.font,
                        fontSize: `${item.size}px`,
                        fontWeight: item.bold ? 700 : 400,
                        fontStyle: item.italic ? "italic" : "normal",
                        color: item.color,
                        textAlign: item.align,
                        outline: "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        textShadow:
                          item.effect === "shadow" ? "3px 3px 0 rgba(0,0,0,0.4)"
                          : item.effect === "echo"  ? "3px 3px 0 rgba(100,100,100,0.35), 6px 6px 0 rgba(100,100,100,0.2)"
                          : item.effect === "glitch" ? "-2px 0 #00bcd4, 2px 0 #e040fb"
                          : "none",
                        background: item.effect === "highlight" ? "#4FC3F7" : "transparent",
                        borderRadius: item.effect === "highlight" ? "3px" : undefined,
                        padding: item.effect === "highlight" ? "0 4px" : "2px 4px",
                        zIndex: isSelected ? 15 : 5,
                        transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(e) => {
                        if (isEditing) return;
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                        startDrag(e, item.id, item.x, item.y);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingItemId(item.id);
                      }}
                      onBlur={(e) => {
                        const newText = e.currentTarget.textContent ?? item.text;
                        if (newText !== item.text) {
                          setSides((prev) => { pushHistory(prev); return prev; });
                        }
                        updateItem(item.id, { text: newText });
                        setEditingItemId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(item.shape === "curve" && !isEditing) ? (() => {
                        const r = item.w * 0.7;
                        const h = r - Math.sqrt(r * r - (item.w / 2) * (item.w / 2));
                        const svgH = Math.max(h + item.size + 8, item.size + 12);
                        const pathId = `cp-${item.id}`;
                        return (
                          <svg width={item.w} height={svgH} style={{ display: "block", overflow: "visible" }}>
                            <defs>
                              <path id={pathId} d={`M 0 ${r} Q ${item.w / 2} 0 ${item.w} ${r}`} />
                            </defs>
                            <text fontFamily={item.font} fontSize={item.size} fontWeight={item.bold ? 700 : 400}
                              fontStyle={item.italic ? "italic" : "normal"} fill={item.color}
                              style={{ textShadow:
                                item.effect === "shadow" ? "3px 3px 0 rgba(0,0,0,0.4)"
                                : item.effect === "echo"  ? "3px 3px 0 rgba(100,100,100,0.35), 6px 6px 0 rgba(100,100,100,0.2)"
                                : item.effect === "glitch" ? "-2px 0 #00bcd4, 2px 0 #e040fb" : undefined }}>
                              <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">{item.text}</textPath>
                            </text>
                          </svg>
                        );
                      })() : item.text}
                      {/* Resize handles — 4 corner dots + 4 edge bars (plain, small) */}
                      {isSelected && !isEditing && (
                        <>
                          {(["nw","ne","sw","se"] as const).map((c) => (
                            <div key={c} style={{
                              position: "absolute", width: 6, height: 6,
                              background: "#1d4ed8", borderRadius: "50%",
                              zIndex: 20, pointerEvents: "none",
                              ...(c === "nw" ? { top: -3, left: -3 } :
                                  c === "ne" ? { top: -3, right: -3 } :
                                  c === "sw" ? { bottom: -3, left: -3 } :
                                              { bottom: -3, right: -3 }),
                            }} />
                          ))}
                          {(["e","w","n","s"] as const).map((edge) => (
                            <div
                              key={edge}
                              onPointerDown={(e) => { e.stopPropagation(); startTextResize(e, item.id, edge, item); }}
                              style={{
                                position: "absolute", background: "#1d4ed8",
                                borderRadius: 2, zIndex: 20,
                                ...(edge === "e" ? { right: -3, top: "50%", transform: "translateY(-50%)", width: 5, height: 12, cursor: "ew-resize" } :
                                    edge === "w" ? { left: -3, top: "50%", transform: "translateY(-50%)", width: 5, height: 12, cursor: "ew-resize" } :
                                    edge === "n" ? { top: -3, left: "50%", transform: "translateX(-50%)", width: 12, height: 5, cursor: "ns-resize" } :
                                                  { bottom: -3, left: "50%", transform: "translateX(-50%)", width: 12, height: 5, cursor: "ns-resize" }),
                              }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  );
                }

                if (item.kind === "image") {
                  const isBroken = brokenImgIds.has(item.id) || !item.src;
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: "absolute",
                        left: item.x, top: item.y,
                        width: item.w, height: item.h,
                        border: isSelected ? "2px solid #1d4ed8" : "1px solid transparent",
                        borderRadius: item.radii
                          ? `${item.radii.tl}px ${item.radii.tr}px ${item.radii.br}px ${item.radii.bl}px`
                          : undefined,
                        overflow: item.radii ? "hidden" : undefined,
                        cursor: "move", zIndex: 1,
                        transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                        transformOrigin: "center center",
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        let onTap: (() => void) | undefined;
                        if (selectedItemId === item.id) {
                          const printArea = (e.currentTarget as HTMLElement).parentElement;
                          if (printArea) {
                            const rect = printArea.getBoundingClientRect();
                            const cx = (e.clientX - rect.left) / zoom;
                            const cy = (e.clientY - rect.top) / zoom;
                            const hits = currentSide.items.filter(it => {
                              const iw = it.w ?? 0;
                              const ih = it.kind === "image" ? (it.h ?? 0) : ((it.size ?? 16) * 1.5);
                              return cx >= it.x && cx <= it.x + iw && cy >= it.y && cy <= it.y + ih;
                            });
                            if (hits.length > 1) {
                              const curIdx = hits.findIndex(it => it.id === item.id);
                              const nextId = hits[(curIdx + 1) % hits.length].id;
                              onTap = () => setSelectedItemId(nextId);
                            }
                          }
                        }
                        setSelectedItemId(item.id);
                        startDrag(e, item.id, item.x, item.y, onTap);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isBroken ? (
                        <div
                          onClick={(e) => { e.stopPropagation(); if (!didDragRef.current) triggerReplacePhoto(item.id); }}
                          style={{
                            width: "100%", height: "100%",
                            background: "#94a3b8",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: "8px", cursor: "pointer",
                          }}
                        >
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" style={{ flexShrink: 0 }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700, textAlign: "center", lineHeight: 1.3, pointerEvents: "none", padding: "0 6px" }}>
                            Upload Photo
                          </span>
                        </div>
                      ) : item.src.startsWith("data:image/svg+xml") ? (() => {
                        let svgHtml = "";
                        try {
                          const encoded = item.src.split(",").slice(1).join(",");
                          const raw = item.src.includes(";base64,") ? atob(encoded) : decodeURIComponent(encoded);
                          svgHtml = raw.replace(/<svg([^>]*)>/i, (_, attrs) => {
                            const cleaned = attrs
                              .replace(/\s*width="[^"]*"/gi, "")
                              .replace(/\s*height="[^"]*"/gi, "")
                              .replace(/\s*preserveAspectRatio="[^"]*"/gi, "");
                            return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="none"><style>path,rect,line,circle,ellipse,polygon,polyline{vector-effect:non-scaling-stroke}</style>`;
                          });
                        } catch { svgHtml = ""; }
                        return (
                          <div
                            dangerouslySetInnerHTML={{ __html: svgHtml }}
                            style={{ width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none" }}
                          />
                        );
                      })() : (
                        <img
                          src={item.src} alt="design" draggable={false}
                          onError={() => setBrokenImgIds((prev) => new Set(prev).add(item.id))}
                          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }}
                        />
                      )}
                      {isSelected && (
                        <>
                          {/* Corner handles — proportional scale */}
                          {(["nw","ne","sw","se"] as const).map((corner) => (
                            <div key={corner} onPointerDown={(e) => startResize(e, item.id, corner, item)}
                              style={{
                                position: "absolute", width: 8, height: 8,
                                background: "#1d4ed8", borderRadius: "50%",
                                cursor: `${corner}-resize`, zIndex: 20,
                                ...(corner === "nw" ? { top: -4, left: -4 } :
                                    corner === "ne" ? { top: -4, right: -4 } :
                                    corner === "sw" ? { bottom: -4, left: -4 } :
                                                      { bottom: -4, right: -4 }),
                              }}
                            />
                          ))}
                          {/* Edge handles — free W or H resize */}
                          {(["e","w","n","s"] as const).map((edge) => (
                            <div key={edge} onPointerDown={(e) => startEdgeResizeImg(e, item.id, edge, item)}
                              style={{
                                position: "absolute", background: "#1d4ed8", borderRadius: 2, zIndex: 21,
                                ...(edge === "e" ? { right: -4, top: "50%", transform: "translateY(-50%)", width: 6, height: 18, cursor: "ew-resize" } :
                                    edge === "w" ? { left: -4, top: "50%", transform: "translateY(-50%)", width: 6, height: 18, cursor: "ew-resize" } :
                                    edge === "n" ? { top: -4, left: "50%", transform: "translateX(-50%)", width: 18, height: 6, cursor: "ns-resize" } :
                                                  { bottom: -4, left: "50%", transform: "translateX(-50%)", width: 18, height: 6, cursor: "ns-resize" }),
                              }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>

            </div> {/* end inner canvas */}

          </div> {/* end zoom wrapper */}

              </div> {/* end size wrapper */}
            </div> {/* end centering wrapper */}
          </div> {/* end scroll area */}

          {/* Zoom + Undo/Redo controls */}
          <div style={{
            display: "flex", justifyContent: "center", padding: "8px 0", flexShrink: 0,
            background: "#f3f4f6", borderTop: "1px solid #e5e7eb",
          }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "4px",
            background: "rgba(255,255,255,0.96)",
            border: "1px solid #e5e7eb", borderRadius: "14px",
            padding: "6px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{ width: 38, height: 38, border: "none", background: "none", cursor: canUndo ? "pointer" : "default", fontSize: "1.15rem", fontWeight: 700, color: canUndo ? "#374151" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              style={{ width: 38, height: 38, border: "none", background: "none", cursor: canRedo ? "pointer" : "default", fontSize: "1.15rem", fontWeight: 700, color: canRedo ? "#374151" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ↪
            </button>
            <div style={{ width: "1px", height: "24px", background: "#e5e7eb", margin: "0 4px" }} />
            <button
              onClick={() => setZoom((z) => parseFloat(Math.max(0.5, z - 0.1).toFixed(1)))}
              style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer", fontSize: "1.4rem", fontWeight: 700, color: "#374151" }}
            >
              −
            </button>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#374151", minWidth: "52px", textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => parseFloat(Math.min(2, z + 0.1).toFixed(1)))}
              style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer", fontSize: "1.4rem", fontWeight: 700, color: "#374151" }}
            >
              +
            </button>
            <div style={{ width: "1px", height: "24px", background: "#e5e7eb", margin: "0 4px" }} />
            <button
              onClick={() => setZoom(1)}
              style={{ padding: "0 10px", height: 38, border: "none", background: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, color: "#6b7280" }}
            >
              Reset
            </button>
          </div>
          </div>
        </div>

        {/* ── Right panel: Pages ──────────────────────────────────────── */}
        <div style={{
          width: "110px", borderLeft: "1px solid #e5e7eb", background: "#fafafa",
          flexShrink: 0, display: "flex", flexDirection: "column",
          padding: "12px 10px 12px", gap: "10px",
        }}>
          <p style={{
            margin: 0, fontSize: "0.72rem", fontWeight: 800, color: "#374151",
            textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center",
          }}>
            Pages
          </p>
          {(["front", "back"] as Side[]).filter((side) => !(isSingleSide && side === "back")).map((side, idx) => {
            const isActive = activeSide === side;
            const sd = sides[side];
            const thumbBg = isFlatArt ? bgColors[side] : (shirtColor.hex === "#ffffff" ? "#f3f4f6" : shirtColor.hex);
            return (
              <div key={side} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                onClick={() => {
                  setActiveSide(side);
                  setSelectedItemId(null);
                  setEditingItemId(null);
                  if (side === "back" && (isBusinessCard || isFlyer) && !bgSvg["back"] && !sides["back"].template?.baseImage) {
                    setBackTemplateOpen(true);
                  }
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "6px", padding: "8px 6px 10px",
                  border: `2px solid ${isActive ? "#7c3aed" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  background: isActive ? "rgba(124,58,237,0.06)" : "#fff",
                  cursor: "pointer", width: "100%",
                  boxShadow: isActive ? "0 0 0 3px rgba(124,58,237,0.12)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  position: "relative",
                }}
              >
                {/* Numbered badge */}
                <div style={{
                  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                  width: 20, height: 20, borderRadius: "50%",
                  background: isActive ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#9ca3af",
                  color: "#fff", fontSize: "0.6rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isActive ? "0 2px 6px rgba(124,58,237,0.4)" : "none",
                }}>
                  {idx + 1}
                </div>

                {/* Mini canvas thumbnail */}
                {(() => {
                  const thumbW = customDimsInches ? 100 : isBusinessCard ? 100 : isFlyerExpress ? 100 : isFlyerPrime ? 90 : isLabel ? 70 : 70;
                  const thumbH = customDimsInches ? Math.round(100 * (customDimsInches.height / customDimsInches.width)) : isBusinessCard ? 58 : isFlyerExpress ? 65 : isFlyerPrime ? 71 : isLabel ? 70 : 88;
                  const thumbScale = thumbW / CANVAS_W;
                  return (
                <div style={{
                  width: `${thumbW}px`,
                  height: `${thumbH}px`,
                  background: thumbBg,
                  borderRadius: isLabel ? "50%" : "7px", overflow: "hidden",
                  position: "relative", border: "1px solid rgba(0,0,0,0.08)",
                  marginTop: "4px",
                }}>
                  {(isBusinessCard || isFlyer) && side === "back" && !bgSvg["back"] && !sides["back"].template?.baseImage ? (
                    <div style={{
                      position: "absolute", inset: 0, background: "#ffffff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                  ) : isFlatArt && side === "back" && !bgSvg["back"] && !sides["back"].template?.baseImage ? (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: "3px",
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      <span style={{ fontSize: "0.5rem", color: "#f97316", fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>Pick back</span>
                    </div>
                  ) : adminMode && (sides[side].template?.baseImage || (side === "front" ? adminFrontImage : adminBackImage)) ? (
                    <img
                      src={sides[side].template?.baseImage
                        ?? (side === "front" ? adminFrontImage : adminBackImage)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : sd.template?.baseImage ? (
                    /* Full original SVG — shows all design elements (bg, shapes, text) at correct scale */
                    <img src={sd.template.baseImage} alt="" style={{ width: "100%", height: "100%", objectFit: "fill" }} />
                  ) : bgSvg[side] ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: bgSvg[side] }}
                      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
                    />
                  ) : !isBusinessCard && shirt?.images[0] ? (
                    <img src={shirt.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, mixBlendMode: "multiply" }} />
                  ) : null}
                  {sd.items.length > 0 && !(isBusinessCard && side === "back" && !bgSvg["back"] && !sides["back"].template?.baseImage) && sd.items.map((item) => (
                    item.kind === "image" ? (
                      <img
                        key={item.id}
                        src={item.src}
                        alt=""
                        style={{
                          position: "absolute",
                          left: `${item.x * thumbScale}px`,
                          top: `${item.y * thumbScale}px`,
                          width: `${item.w * thumbScale}px`,
                          height: `${(item.h ?? item.w) * thumbScale}px`,
                          objectFit: "cover",
                          transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                          pointerEvents: "none",
                        }}
                      />
                    ) : (
                      <div
                        key={item.id}
                        style={{
                          position: "absolute",
                          left: `${item.x * thumbScale}px`,
                          top: `${item.y * thumbScale}px`,
                          width: `${item.w * thumbScale}px`,
                          fontSize: `${Math.max(2, (item.size ?? 16) * thumbScale)}px`,
                          fontFamily: item.font,
                          fontWeight: item.bold ? 700 : 400,
                          color: item.color ?? "#111827",
                          textAlign: item.align ?? "left",
                          lineHeight: 1.1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        {item.text}
                      </div>
                    )
                  ))}
                </div>
                  );
                })()}
                <span style={{
                  fontSize: "0.7rem", fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: isActive ? "#7c3aed" : "#6b7280",
                }}>
                  {side}
                </span>
              </button>
              {/* "Change Back" button — only under BACK thumbnail, BC + Flyers */}
              {side === "back" && (isBusinessCard || isFlyer) && (
                <button
                  onClick={() => setBackTemplateOpen(true)}
                  style={{
                    width: "100%", padding: "6px 4px",
                    border: "1.5px solid #e5e7eb", borderRadius: "8px",
                    background: "#fff", color: "#374151",
                    fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.02em", lineHeight: 1.4,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Change Back
                </button>
              )}
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Template Selection Modal ── */}
    {templateModalOpen && (() => {
      const allTplDesigns = templates.flatMap((t) => t.designs);
      const filteredTpl = allTplDesigns.filter((d) => d.name.toLowerCase().includes(tplSearch.toLowerCase()));
      const TPL_PER_PAGE = 20;
      const totalTplPages = Math.max(1, Math.ceil(filteredTpl.length / TPL_PER_PAGE));
      const pagedTpl = filteredTpl.slice((tplPage - 1) * TPL_PER_PAGE, tplPage * TPL_PER_PAGE);
      const galleryPrice = templates[0]?.price?.trim();
      const displayPrice = galleryPrice ? (/[$₹+]/.test(galleryPrice) ? galleryPrice : `$${galleryPrice}`) : "";

      return (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setTemplateModalOpen(false); setTplSearch(""); setTplPage(1); } }}
        >
          <div style={{ background: "#fff", borderRadius: "24px", width: "min(1080px,100%)", maxHeight: "92vh", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.75rem 1.25rem", flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: "0 0 3px", fontSize: "1.4rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Choose a design</h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
                  {filteredTpl.length} design{filteredTpl.length !== 1 ? "s" : ""} available{tplSearch ? ` for "${tplSearch}"` : ""}
                </p>
              </div>
              <button
                onClick={() => { setTemplateModalOpen(false); setTplSearch(""); setTplPage(1); }}
                style={{ width: 36, height: 36, border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}
              >✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: "0 1.75rem 1.25rem", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                  style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search designs..."
                  value={tplSearch}
                  onChange={(e) => { setTplSearch(e.target.value); setTplPage(1); }}
                  style={{ width: "100%", padding: "0.7rem 1rem 0.7rem 2.6rem", border: "1.5px solid #e5e7eb", borderRadius: "999px", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", color: "#111827", background: "#fafafa" }}
                />
              </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 1.75rem 1.5rem" }}>
              {pagedTpl.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", padding: "3rem" }}>
                  {tplSearch ? `No designs found for "${tplSearch}"` : "No templates available. Add designs in the admin panel."}
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1.25rem" }}>
                  {pagedTpl.map((d) => {
                    const previewBase = activeSide === "back" && d.backImage ? d.backImage : d.frontImage;
                    const previewOverlay = activeSide === "back" && d.backImage ? d.backOverlay : d.frontOverlay;
                    return (
                      <TplCard
                        key={d.id}
                        design={d}
                        previewBase={previewBase}
                        previewOverlay={previewOverlay ?? undefined}
                        overlayColor={tplColors[d.id]}
                        displayPrice={displayPrice}
                        onSelect={() => {
                          setAppliedDesign(d);
                          setActiveVariantId(null);
                          if (isFlatArt) {
                            let labelDimsOvr: typeof LABEL_DIMS_DEFAULT | undefined;
                            if (isLabel && d.frontImage) {
                              const vb = parseSvgViewBox(d.frontImage);
                              if (vb) labelDimsOvr = computeLabelDims(vb.vw, vb.vh);
                            }
                            applySVGDesign(
                              d.frontImage,
                              (isBusinessCard || isFlyer) ? undefined : (d.backImage ?? undefined),
                              (d.frontAdminItems ?? []) as CanvasItem[],
                              (isBusinessCard || isFlyer) ? [] : (d.backAdminItems ?? []) as CanvasItem[],
                              d.frontBgColor ?? "#ffffff",
                              d.backBgColor  ?? "#ffffff",
                              labelDimsOvr,
                            );
                          } else {
                            applyTemplate(d.frontImage, d.frontOverlay, d.backImage, d.backOverlay, tplColors[d.id] || "#000000", d);
                          }
                          setTemplateModalOpen(false); setTplSearch(""); setTplPage(1);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalTplPages > 1 && (
              <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.825rem", color: "#9ca3af", fontWeight: 500 }}>
                  Page {tplPage} of {totalTplPages} · {filteredTpl.length} design{filteredTpl.length !== 1 ? "s" : ""}
                </span>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                  <button disabled={tplPage <= 1} onClick={() => setTplPage((p) => p - 1)} style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", borderRadius: 8, background: tplPage <= 1 ? "#f9fafb" : "#fff", color: tplPage <= 1 ? "#d1d5db" : "#374151", cursor: tplPage <= 1 ? "default" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                  {Array.from({ length: totalTplPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setTplPage(n)} style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", borderRadius: 8, background: n === tplPage ? "#7c3aed" : "#fff", color: n === tplPage ? "#fff" : "#374151", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>{n}</button>
                  ))}
                  <button disabled={tplPage >= totalTplPages} onClick={() => setTplPage((p) => p + 1)} style={{ width: 32, height: 32, border: "1.5px solid #e5e7eb", borderRadius: 8, background: tplPage >= totalTplPages ? "#f9fafb" : "#fff", color: tplPage >= totalTplPages ? "#d1d5db" : "#374151", cursor: tplPage >= totalTplPages ? "default" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })()}
    {/* Shape color picker popup */}
    {shapePick && (
      <div
        style={{
          position: "fixed",
          left: Math.min(shapePick.px + 20, window.innerWidth - 240),
          top:  Math.min(shapePick.py + 20, window.innerHeight - 200),
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "14px 16px",
          width: 220,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Shape Color</span>
          <button
            onClick={() => setShapePick(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1rem", lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Preset swatches */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {["#ffffff","#000000","#1d4ed8","#dc2626","#16a34a","#d97706","#7c3aed","#0891b2","#db2777","#374151","#6b7280","#f59e0b","#10b981","#3b82f6","#ef4444","#f3f4f6"].map((c) => (
            <button
              key={c}
              onClick={() => updateShapeColor(c, shapePick.stroke === "none" ? "none" : c)}
              style={{
                width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                background: c,
                border: shapePick.fill === c ? "2px solid #1d4ed8" : "1px solid #d1d5db",
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>

        {/* Fill hex input */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: "0.72rem", color: "#6b7280", width: 36 }}>Fill</span>
          <input
            type="color"
            value={shapePick.fill.startsWith("#") ? shapePick.fill : "#ffffff"}
            onChange={(e) => updateShapeColor(e.target.value, shapePick.stroke === "none" ? "none" : e.target.value)}
            style={{ width: 32, height: 28, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", padding: 2 }}
          />
          <input
            type="text"
            value={shapePick.fill}
            onChange={(e) => updateShapeColor(e.target.value, shapePick.stroke)}
            style={{ flex: 1, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.75rem", color: "#374151" }}
          />
        </div>

        {/* Stroke hex input */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.72rem", color: "#6b7280", width: 36 }}>Stroke</span>
          <input
            type="color"
            value={shapePick.stroke && shapePick.stroke !== "none" && shapePick.stroke.startsWith("#") ? shapePick.stroke : "#000000"}
            onChange={(e) => updateShapeColor(shapePick.fill, e.target.value)}
            style={{ width: 32, height: 28, border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", padding: 2 }}
          />
          <input
            type="text"
            value={shapePick.stroke === "none" ? "" : shapePick.stroke}
            placeholder="none"
            onChange={(e) => updateShapeColor(shapePick.fill, e.target.value || "none")}
            style={{ flex: 1, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.75rem", color: "#374151" }}
          />
        </div>
      </div>
    )}
    {/* ── Change the Back modal ── */}
    {backTemplateOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={(e) => { if (e.target === e.currentTarget) setBackTemplateOpen(false); }}
      >
        <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "min(600px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.25)" }}>
          {/* Header */}
          <div style={{ padding: "20px 24px 12px", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#111827" }}>Change the Back</h2>
              {pricePerUnit !== undefined && pricePerUnit > 0 && (
                <span style={{
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  color: "#fff", fontSize: "0.78rem", fontWeight: 700,
                  padding: "3px 10px", borderRadius: "999px",
                  whiteSpace: "nowrap",
                }}>
                  +${(pricePerUnit * 0.7).toFixed(2)} for Back
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>Choose a template for the back of your card</p>
          </div>

          {/* Grid */}
          <div style={{ overflowY: "auto", padding: "8px 16px 24px", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {BACK_TEMPLATES.map((tpl) => {
                // Extract the template's actual accent/theme color from the SVG or CSS state
                const frontBg = getFrontThemeColor(bgSvg.front, bgColors.front);
                const coloredSvg = patchSvgBackground(tpl.svg, frontBg);
                const previewUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(coloredSvg);
                return (
                <button
                  key={tpl.label}
                  onClick={() => {
                    pushBgHistory();
                    setBgColors((prev) => ({ ...prev, back: frontBg }));
                    // Every back template is drawn on a fixed 460×270 (business-card-ratio)
                    // viewBox, so it must always be rescaled to the current product's actual
                    // canvas size (dims.CW/CH) — otherwise anything that isn't business-card
                    // shaped (a tall custom-size label, a poster, etc.) letterboxes into a
                    // small strip instead of filling the page. For business cards this scale
                    // factor is exactly 1 (BC_DIMS already is 460×270), so it's a no-op there.
                    const SVG_W = 460, SVG_H = 270;
                    const xScale = dims.CW / SVG_W;
                    const yScale = dims.CH / SVG_H;
                    const parsed = parseSVGForEditing(previewUrl, { extractGraphics: true, px: BC_DIMS.PX, py: BC_DIMS.PY });
                    const scaleItems = (items: CanvasItem[]): CanvasItem[] => items.map((it) => {
                      if (it.kind === "text") {
                        const s = Math.max(xScale, yScale);
                        return { ...it, x: (BC_DIMS.PX + it.x) * xScale - dims.PX, y: (BC_DIMS.PY + it.y) * yScale - dims.PY, w: it.w * xScale, size: it.size * s };
                      }
                      if (it.kind === "image") return { ...it, x: (BC_DIMS.PX + it.x) * xScale - dims.PX, y: (BC_DIMS.PY + it.y) * yScale - dims.PY, w: it.w * xScale, h: it.h * yScale };
                      return it;
                    });
                    const scaledSvg = coloredSvg.replace(/<svg([^>]*)>/i, (_m, attrs) => {
                      const cleaned = attrs
                        .replace(/\s*width="[^"]*"/g, "")
                        .replace(/\s*height="[^"]*"/g, "")
                        .replace(/\s*preserveAspectRatio="[^"]*"/g, "");
                      return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="none">`;
                    });
                    const patchFull = (svg: string) => svg.replace(/<svg([^>]*)>/i, (_m, a) => {
                      const c = a.replace(/\s*width="[^"]*"/g,"").replace(/\s*height="[^"]*"/g,"").replace(/\s*preserveAspectRatio="[^"]*"/g,"");
                      return `<svg${c} width="100%" height="100%" preserveAspectRatio="none">`;
                    });
                    const bgStr = parsed ? patchFull(patchSvgBackground(parsed.bgStr, frontBg)) : patchFull(scaledSvg);
                    setBgSvg((prev) => ({ ...prev, back: bgStr }));
                    setSides((prev) => ({
                      ...prev,
                      back: {
                        ...prev.back,
                        template: { baseImage: previewUrl, overlayImage: undefined, overlayColor: "#ffffff" },
                        items: parsed ? scaleItems([...parsed.graphicItems, ...parsed.textItems.map((t) => ({ ...t, kind: "text" as const }))]) : [],
                      },
                    }));
                    setActiveSide("back");
                    setBackTemplateOpen(false);
                  }}
                  style={{ padding: 0, border: "2px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", cursor: "pointer", background: "#fff", textAlign: "left" }}
                >
                  {/* Preview — uses front card background color */}
                  <div style={{ background: frontBg, padding: "10px 10px 6px" }}>
                    <div style={{ borderRadius: "6px", overflow: "hidden", aspectRatio: "16/9" }}>
                      <img
                        src={previewUrl}
                        alt={tpl.label}
                        style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
                      />
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{ padding: "6px 10px 8px", fontSize: "0.75rem", fontWeight: 700, color: "#374151" }}>
                    {tpl.label}
                  </div>
                </button>
                );
              })}
            </div>
          </div>

          {/* Cancel */}
          <div style={{ padding: "0 16px 24px", flexShrink: 0 }}>
            <button
              onClick={() => setBackTemplateOpen(false)}
              style={{ width: "100%", padding: "14px", border: "1.5px solid #e5e7eb", borderRadius: "12px", background: "#fff", fontSize: "1rem", fontWeight: 700, color: "#374151", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Final Steps Screen ───────────────────────────────────────────── */}
    {finalStepsOpen && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 700,
        display: "flex", flexDirection: "column",
        background: "#f0f2f5",
      }}>
        {/* Gradient header */}
        <div style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
          padding: "0 28px", height: 64, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>
              Finalize Your Order
            </span>
          </div>
          <button
            onClick={() => setFinalStepsOpen(false)}
            style={{
              background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
              borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
              color: "#fff", fontSize: "1rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Body — 50/50 split */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — 3D card preview */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 20, padding: "24px 16px",
            borderRight: "1px solid #e5e7eb",
            background: "#fff",
          }}>

            {/* 3D card */}
            <div
              style={{ perspective: "1400px" }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startRot = finalRotRef.current;
                const card = finalCardRef.current;
                if (card) card.style.transition = "none";
                const onMove = (me: MouseEvent) => {
                  const rot = startRot + (me.clientX - startX) * 0.5;
                  finalRotRef.current = rot;
                  if (card) card.style.transform = `rotateY(${rot}deg)`;
                };
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                  setFinalRotY(finalRotRef.current);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            >
              <div
                ref={finalCardRef}
                style={{
                  width: (() => {
                    const r  = CANVAS_W / CANVAS_H;
                    const mw = Math.min(window.innerWidth  * 0.42, 700);
                    const mh = Math.min(window.innerHeight - 280,  520);
                    return Math.round(mw / r <= mh ? mw : mh * r);
                  })(),
                  height: (() => {
                    const r  = CANVAS_W / CANVAS_H;
                    const mw = Math.min(window.innerWidth  * 0.42, 700);
                    const mh = Math.min(window.innerHeight - 280,  520);
                    const cw = mw / r <= mh ? mw : mh * r;
                    return Math.round(cw / r);
                  })(),
                  position: "relative", transformStyle: "preserve-3d",
                  transform: `rotateY(${finalRotY}deg)`,
                  transition: "transform 0.45s ease",
                  cursor: "grab", borderRadius: "14px",
                }}
              >
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  borderRadius: "14px", overflow: "hidden",
                  boxShadow: "0 8px 40px rgba(124,58,237,0.18), 0 2px 12px rgba(0,0,0,0.1)",
                  background: previewFrontPng ? "transparent" : bgColors.front,
                }}>
                  {previewLoading
                    ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#7c3aed", fontSize: "0.8rem", fontWeight: 600 }}>Loading…</div>
                    : previewFrontPng
                      ? <img src={previewFrontPng} alt="front" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      : null}
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "14px", overflow: "hidden",
                  boxShadow: "0 8px 40px rgba(219,39,119,0.15), 0 2px 12px rgba(0,0,0,0.1)",
                  background: previewBackPng ? "transparent" : (sides.back.template ? bgColors.back : "#ffffff"),
                }}>
                  {previewLoading
                    ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#db2777", fontSize: "0.8rem", fontWeight: 600 }}>Loading…</div>
                    : previewBackPng && sides.back.template
                      ? <img src={previewBackPng} alt="back" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                      : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/></svg>
                          <span style={{ color: "#9ca3af", fontSize: "0.72rem", fontWeight: 600 }}>No back design</span>
                        </div>}
                </div>
              </div>
            </div>

            {/* Front / Back mini toggle */}
            <div style={{ display: "flex", gap: 8 }}>
              {(["Front", "Back"] as const).map((label, i) => (
                <button key={label} onClick={() => {
                  const target = Math.round(finalRotRef.current / 360) * 360 + i * 180;
                  finalRotRef.current = target;
                  setFinalRotY(target);
                  if (finalCardRef.current) finalCardRef.current.style.transition = "transform 0.45s ease";
                }} style={{
                  padding: "8px 24px", borderRadius: "999px",
                  background: i === 0 ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#fff",
                  border: i === 0 ? "none" : "1.5px solid #e5e7eb",
                  color: i === 0 ? "#fff" : "#374151",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                  boxShadow: i === 0 ? "0 3px 10px rgba(124,58,237,0.3)" : "none",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* RIGHT — Final Steps form */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            padding: "40px 40px 32px",
            overflowY: "auto",
            background: "#f0f2f5",
          }}>
            {/* Title area */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg,#7c3aed,#db2777)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>Final Steps</h2>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#6b7280", lineHeight: 1.6 }}>
                Almost done! Make selections below to finalize your design.{" "}
                <span style={{ color: "#7c3aed", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Have questions?</span>
              </p>
            </div>

            {/* Quantity card */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "24px 24px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20,
              border: "1.5px solid #e5e7eb",
            }}>
              <label htmlFor="qty-input" style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Quantity
              </label>
              <input
                id="qty-input"
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={selectedQty === 0 ? "" : selectedQty}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setSelectedQty(isNaN(v) || v < 1 ? 0 : v);
                }}
                style={{
                  width: "100%", padding: "14px 16px",
                  border: "2px solid #e5e7eb", borderRadius: 12,
                  fontSize: "0.95rem", fontWeight: 700, color: "#111827",
                  background: "#fff", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />

              {/* Price calculation */}
              {pricePerUnit !== undefined && selectedQty >= 1 && (() => {
                const hasBack = (isBusinessCard || isFlyer) && !!(bgSvg.back || sides.back.template?.baseImage);
                const backPpu = hasBack ? pricePerUnit * 0.7 : 0;
                const totalPpu = pricePerUnit + backPpu;
                return (
                  <div style={{ marginTop: 14, padding: "12px 16px", background: "linear-gradient(135deg, #faf5ff, #fdf2f8)", borderRadius: 10, border: "1.5px solid #e9d5ff" }}>
                    {hasBack && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Front: ${pricePerUnit.toFixed(2)} + Back: ${backPpu.toFixed(2)}</span>
                        <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>${totalPpu.toFixed(2)}/unit</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "#6b7280", fontWeight: 600 }}>
                        ${totalPpu.toFixed(2)} × {selectedQty}
                      </span>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, background: "linear-gradient(90deg,#7c3aed,#db2777)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        ${(totalPpu * selectedQty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Terms & Conditions */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "18px 22px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: "1.5px solid #e5e7eb",
              marginBottom: 16,
            }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.76rem", fontWeight: 800, color: "#374151", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Terms &amp; Conditions
              </p>
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
                  <li key={point} style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Approval checkbox card */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "20px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: `1.5px solid ${designApproved ? "#7c3aed" : "#e5e7eb"}`,
              marginBottom: 28, transition: "border-color 0.2s",
            }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={designApproved}
                    onChange={(e) => setDesignApproved(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${designApproved ? "#7c3aed" : "#d1d5db"}`,
                    background: designApproved ? "linear-gradient(135deg,#7c3aed,#db2777)" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}>
                    {designApproved && (
                      <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: "0.88rem", color: "#374151", lineHeight: 1.6, fontWeight: 500 }}>
                  I have authorization to use the design, I have reviewed and approve it.
                </span>
              </label>
            </div>

            {/* Add to Cart button */}
            <button
              disabled={!designApproved || selectedQty < 1}
              onClick={() => {
                if (!designApproved || selectedQty < 1) return;
                const cartId = Date.now().toString();
                pendingCartIdRef.current = cartId;
                // Save base item immediately so checkout/auth can open without waiting
                try {
                  const existing = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<Record<string, unknown>>;
                  const hasBackCart = (isBusinessCard || isFlyer) && !!(bgSvg.back || sides.back.template?.baseImage);
                  const effectivePpu = (pricePerUnit ?? 0) + (hasBackCart ? (pricePerUnit ?? 0) * 0.7 : 0);
                  existing.push({
                    id: cartId,
                    name: productName ?? "Custom Print",
                    qty: selectedQty,
                    pricePerUnit: effectivePpu,
                    total: effectivePpu * selectedQty,
                    doubleSided: !!sides.back.template,
                  });
                  localStorage.setItem("wp_cart", JSON.stringify(existing));
                  localStorage.setItem("wp_cart_count", String(existing.length));
                } catch { /* ignore */ }
                // Async: generate thumb + admin previews then patch cart entry in localStorage
                void (async () => {
                  try {
                    // Resize maintaining aspect ratio, capped at maxW/maxH
                    function toJpeg(src: string, maxW: number, maxH: number, q: number): Promise<string> {
                      return new Promise<string>((resolve) => {
                        if (!src) { resolve(""); return; }
                        const img = new window.Image();
                        img.onload = () => {
                          try {
                            const ratio = img.naturalWidth / img.naturalHeight;
                            let w = img.naturalWidth, h = img.naturalHeight;
                            if (w > maxW) { w = maxW; h = Math.round(maxW / ratio); }
                            if (h > maxH) { h = maxH; w = Math.round(maxH * ratio); }
                            const c = document.createElement("canvas");
                            c.width = w; c.height = h;
                            c.getContext("2d")?.drawImage(img, 0, 0, w, h);
                            resolve(c.toDataURL("image/jpeg", q));
                          } catch { resolve(""); }
                        };
                        img.onerror = () => resolve("");
                        img.src = src;
                      });
                    }
                    let fp = previewFrontPng;
                    let bp = previewBackPng;
                    // scale=2 → crisp source; pScale used for preview button uses 3 so reuse if available
                    if (!fp) fp = await generateSidePreviewPNG("front", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, 2);
                    if (!bp && sides.back.template) bp = await generateSidePreviewPNG("back", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, 2);
                    const [thumb, frontPreview, backPreview] = await Promise.all([
                      toJpeg(fp, 160, 160, 0.82),    // thumb: small, for cart list
                      toJpeg(fp, 1200, 1200, 0.88),  // frontPreview: native-ish res, crisp in admin
                      toJpeg(bp, 1200, 1200, 0.88),
                    ]);
                    const cart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<{ id: string; thumb?: string; frontPreview?: string; backPreview?: string }>;
                    const entry = cart.find(i => i.id === cartId);
                    if (entry) {
                      if (thumb) entry.thumb = thumb;
                      if (frontPreview) entry.frontPreview = frontPreview;
                      if (backPreview) entry.backPreview = backPreview;
                      localStorage.setItem("wp_cart", JSON.stringify(cart));
                    }
                  } catch { /* ignore */ }
                })();
                if (!cartUser) {
                  setAuthForCartOpen(true);
                } else {
                  setCheckoutError("");
                  setOrderPlaced(false);
                  // Exclude the just-added item (cartId) so it doesn't double-count
                  // with currentItem built separately in the checkout handler
                  try {
                    const allCart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as SavedCartItem[];
                    setExistingCartItems(allCart.filter(i => i.id !== cartId));
                  } catch { /* ignore */ }
                  setCheckoutOpen(true);
                  fetchAndPrefillAddress(cartUser.id);
                }
              }}
              style={{
                width: "100%", padding: "16px",
                background: designApproved && selectedQty >= 1
                  ? "linear-gradient(135deg,#7c3aed,#db2777)"
                  : "#e5e7eb",
                border: "none", borderRadius: 14,
                cursor: designApproved && selectedQty >= 1 ? "pointer" : "not-allowed",
                color: designApproved && selectedQty >= 1 ? "#fff" : "#9ca3af",
                fontSize: "1rem", fontWeight: 800, letterSpacing: "0.02em",
                boxShadow: designApproved && selectedQty >= 1 ? "0 6px 20px rgba(124,58,237,0.4)" : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {designApproved && selectedQty >= 1
                ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Add to Cart</>
                : !designApproved
                  ? "Please approve your design to continue"
                  : "Enter a quantity to continue"}
            </button>

            {(!designApproved || selectedQty < 1) && (
              <p style={{ textAlign: "center", marginTop: 10, fontSize: "0.78rem", color: "#9ca3af" }}>
                {!designApproved
                  ? "Check the box above to enable the continue button"
                  : "Enter how many copies you need above"}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Auth gate for cart ───────────────────────────────────────────── */}
    <AuthModal
      open={authForCartOpen}
      onClose={() => setAuthForCartOpen(false)}
      onSignedIn={(customer) => {
        setCartUser(customer);
        try { localStorage.setItem("wp_user", JSON.stringify(customer)); } catch { /* ignore */ }
        setAuthForCartOpen(false);
        setCheckoutError("");
        setOrderPlaced(false);
        try {
          const allCart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as SavedCartItem[];
          setExistingCartItems(allCart.filter(i => i.id !== pendingCartIdRef.current));
        } catch { /* ignore */ }
        setCheckoutOpen(true);
        fetchAndPrefillAddress(customer.id);
      }}
    />

    {/* ── Checkout Screen ──────────────────────────────────────────────── */}
    {checkoutOpen && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 750,
        display: "flex", flexDirection: "column",
        background: "#f0f2f5",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
          padding: "0 28px", height: 64, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Back → home */}
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
                borderRadius: 10, height: 36, padding: "0 12px", cursor: "pointer",
                color: "#fff", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.88rem",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem" }}>Checkout</span>
            </div>
          </div>
          <button onClick={() => { setCheckoutOpen(false); setFinalStepsOpen(false); }} style={{
            background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
            borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
            color: "#fff", fontSize: "1rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {orderPlaced ? (
          /* ── Order success ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>Order Placed!</h2>
            <p style={{ margin: 0, color: "#6b7280", textAlign: "center", maxWidth: 340 }}>
              Thank you, <strong>{cartUser?.firstName}</strong>! Your order for{" "}
              <strong>{selectedQty} {productName ?? "cards"}</strong> has been received.
              We&apos;ll be in touch soon.
            </p>
            <button onClick={() => { setCheckoutOpen(false); setFinalStepsOpen(false); }} style={{
              marginTop: 8, padding: "12px 36px", borderRadius: 999,
              background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none",
              color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            }}>Back to Editor</button>
          </div>
        ) : (
          /* ── Main checkout layout ── */
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* LEFT — Your Items */}
            <div style={{
              flex: "0 0 50%", background: "#fff", padding: "28px 32px",
              overflowY: "auto", borderRight: "1px solid #eee",
            }}>
              {/* Section heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>Your Items</h2>
                <span style={{
                  background: "#f3f0ff", color: "#7c3aed", fontSize: "0.75rem",
                  fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                }}>{1 + existingCartItems.length} {1 + existingCartItems.length === 1 ? "Item" : "Items"}</span>
              </div>

              {/* Item card */}
              <div style={{
                border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 18, background: "#fff",
              }}>
                {/* Thumbnail */}
                <div style={{
                  width: 110, height: isBusinessCard ? 66 : 80, borderRadius: 8,
                  overflow: "hidden", background: previewFrontPng ? "transparent" : bgColors.front, flexShrink: 0,
                  border: "1px solid #e5e7eb",
                }}>
                  {previewFrontPng
                    ? <img src={previewFrontPng} alt="preview" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                    : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.72rem" }}>No preview</div>}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{productName ?? "Business Cards"}</p>
                  <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#6b7280" }}>
                    Custom Design{sides.back.template ? " · Double-sided" : ""}
                  </p>
                  {/* Quantity stepper */}
                  <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => setSelectedQty(q => Math.max(1, q - 1))}
                      style={{
                        width: 36, height: 36, border: "none", background: "#f9fafb",
                        cursor: "pointer", fontSize: "1.2rem", color: "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >−</button>
                    <span style={{
                      minWidth: 44, textAlign: "center", fontSize: "0.95rem",
                      fontWeight: 700, color: "#111827", padding: "0 8px",
                      borderLeft: "1.5px solid #e5e7eb", borderRight: "1.5px solid #e5e7eb",
                      lineHeight: "36px",
                    }}>{selectedQty}</span>
                    <button
                      onClick={() => setSelectedQty(q => q + 1)}
                      style={{
                        width: 36, height: 36, border: "none", background: "#f9fafb",
                        cursor: "pointer", fontSize: "1.2rem", color: "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >+</button>
                  </div>
                </div>

                {/* Delete current item — show confirmation, don't navigate back */}
                <button
                  onClick={() => setDeleteConfirmId("__current__")}
                  title="Remove"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#ef4444", padding: 8, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>

              {/* Previously saved cart items — same card UI as current item */}
              {existingCartItems.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {existingCartItems.map((item) => (
                    <div key={item.id} style={{
                      border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px",
                      display: "flex", alignItems: "center", gap: 18, background: "#fff",
                    }}>
                      {/* Thumbnail */}
                      <div style={{
                        width: 110, height: 66, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                        background: item.thumb ? "transparent" : "linear-gradient(135deg,#1e1b4b,#312e81)",
                        border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {item.thumb
                          ? <img src={item.thumb} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                        }
                      </div>

                      {/* Info + qty stepper */}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{item.name}</p>
                        <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#6b7280" }}>
                          Custom Design{item.doubleSided ? " · Double-sided" : ""}
                        </p>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                          <button
                            onClick={() => {
                              const updated = existingCartItems.map(i =>
                                i.id === item.id
                                  ? { ...i, qty: Math.max(1, i.qty - 1), total: i.pricePerUnit * Math.max(1, i.qty - 1) }
                                  : i
                              );
                              setExistingCartItems(updated);
                              try { localStorage.setItem("wp_cart", JSON.stringify(updated)); } catch { /* ignore */ }
                            }}
                            style={{ width: 36, height: 36, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: "1.2rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                          >−</button>
                          <span style={{ minWidth: 44, textAlign: "center", fontSize: "0.95rem", fontWeight: 700, color: "#111827", padding: "0 8px", borderLeft: "1.5px solid #e5e7eb", borderRight: "1.5px solid #e5e7eb", lineHeight: "36px" }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => {
                              const updated = existingCartItems.map(i =>
                                i.id === item.id
                                  ? { ...i, qty: i.qty + 1, total: i.pricePerUnit * (i.qty + 1) }
                                  : i
                              );
                              setExistingCartItems(updated);
                              try { localStorage.setItem("wp_cart", JSON.stringify(updated)); } catch { /* ignore */ }
                            }}
                            style={{ width: 36, height: 36, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: "1.2rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                          >+</button>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Remove"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — Order Summary */}
            {(() => {
              const hasAddress = !addressLoading &&
                checkoutForm.houseNo.trim() !== "" &&
                checkoutForm.flat.trim() !== "" &&
                checkoutForm.city.trim() !== "" &&
                checkoutForm.state.trim() !== "";
              const openAddressPopup = () => {
                setEditForm({ ...checkoutForm });
                setEditFormError("");
                setAddressEditOpen(true);
              };
              return (
                <div style={{
                  flex: "0 0 50%", background: "#fff",
                  padding: "28px 32px", overflowY: "auto",
                  borderLeft: "1px solid #eee", display: "flex", flexDirection: "column", gap: 0,
                }}>
                  <h2 style={{ margin: "0 0 20px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Order Summary</h2>

                  {/* Summary rows */}
                  {(() => {
                    const currentTotal = pricePerUnit !== undefined ? pricePerUnit * selectedQty : 0;
                    const existingTotal = existingCartItems.reduce((s, i) => s + i.total, 0);
                    const subtotal = currentTotal + existingTotal;
                    const totalItemCount = 1 + existingCartItems.length;
                    const delivery = 10;
                    const total = subtotal + delivery;
                    return (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? "Item" : "Items"})</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>
                              {subtotal > 0 ? `$${subtotal.toFixed(2)}` : "—"}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                            <span>Delivery Charges</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>USD ${delivery.toFixed(2)}</span>
                          </div>
                        </div>

                        <div style={{ borderTop: "1.5px solid #f0f2f5", paddingTop: 14, marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Total</span>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#7c3aed" }}>
                              {subtotal > 0 ? `$${total.toFixed(2)}` : "Contact for quote"}
                            </span>
                          </div>
                          <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                            Quantity: <strong style={{ color: "#111827" }}>{selectedQty} {selectedQty === 1 ? "copy" : "copies"}</strong>
                            {sides.back.template && <span style={{ color: "#7c3aed", marginLeft: 8 }}>· Double-sided included</span>}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Delivery Address */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,#7c3aed,#db2777)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#111827" }}>Delivery Address</p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>Add or select your delivery address</p>
                      </div>
                    </div>

                    {/* Address row */}
                    <div style={{
                      border: "1.5px solid #e5e7eb", borderRadius: 10,
                      padding: "11px 14px", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 10, background: "#fafafa",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {hasAddress ? (
                          <span style={{ fontSize: "0.85rem", color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {checkoutForm.houseNo}, {checkoutForm.flat}, {checkoutForm.city}, {checkoutForm.state}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Select delivery address</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={openAddressPopup}
                          style={{
                            padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                            border: "1.5px solid #7c3aed", background: "#fff",
                            color: "#7c3aed", fontWeight: 700, fontSize: "0.78rem",
                          }}
                        >{hasAddress ? "Edit" : "Add"}</button>
                        <button
                          onClick={openAddressPopup}
                          style={{
                            width: 28, height: 28, border: "1.5px solid #e5e7eb",
                            borderRadius: 7, background: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#374151",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Phone shown below address if saved */}
                    {hasAddress && checkoutForm.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingLeft: 2 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.85-.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
                        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{checkoutForm.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Fast delivery badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#f9f5ff", borderRadius: 10, padding: "12px 14px",
                    marginBottom: 20,
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>Fast &amp; Reliable Delivery</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>We deliver your products safely to your doorstep</p>
                    </div>
                    <span style={{ color: "#7c3aed", fontWeight: 600, fontSize: "0.75rem", flexShrink: 0 }}>Usually in 2–4 days</span>
                  </div>

                  <div style={{ borderTop: "1.5px solid #f0f2f5", paddingTop: 16, marginBottom: 16 }}>
                    {/* Promo Code */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>Promo Code</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        style={{
                          flex: 1, padding: "10px 13px", border: "1.5px solid #e5e7eb",
                          borderRadius: 9, fontSize: "0.88rem", color: "#111827",
                          outline: "none", background: "#fff",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                      <button style={{
                        padding: "10px 18px", border: "1.5px solid #7c3aed",
                        borderRadius: 9, cursor: "pointer", background: "#fff",
                        color: "#7c3aed", fontWeight: 700, fontSize: "0.85rem",
                      }}>Apply</button>
                    </div>
                  </div>

                  {checkoutError && (
                    <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>{checkoutError}</p>
                  )}

                  {/* Proceed to Checkout */}
                  <button
                    disabled={stripeLoading}
                    onClick={async () => {
                      const { houseNo, flat, city, state, phone } = checkoutForm;
                      if (!phone.trim()) { setCheckoutError("Phone number is required. Please add your delivery address."); return; }
                      if (!houseNo.trim() || !flat.trim() || !city.trim() || !state.trim()) {
                        setCheckoutError("Please add your delivery address first."); return;
                      }
                      setCheckoutError("");

                      // Save updated address/phone to profile
                      if (cartUser) {
                        fetch("/api/auth/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: cartUser.id, phone, houseNo, flat, city, state }),
                        }).catch(() => { /* ignore */ });
                      }

                      if (onSaveAndContinue) {
                        onSaveAndContinue(selectedQty, previewFrontPng, previewBackPng);
                        return;
                      }

                      // Generate preview images right now — guaranteed fresh, no race condition
                      setStripeLoading(true);
                      let currentThumb: string | undefined;
                      let currentFrontPreview: string | undefined;
                      let currentBackPreview: string | undefined;
                      try {
                        const toJpeg = (src: string, maxW: number, maxH: number, q: number): Promise<string> =>
                          new Promise<string>((resolve) => {
                            if (!src) { resolve(""); return; }
                            const img = new window.Image();
                            img.onload = () => {
                              try {
                                const ratio = img.naturalWidth / img.naturalHeight;
                                let w = img.naturalWidth, h = img.naturalHeight;
                                if (w > maxW) { w = maxW; h = Math.round(maxW / ratio); }
                                if (h > maxH) { h = maxH; w = Math.round(maxH * ratio); }
                                const c = document.createElement("canvas");
                                c.width = w; c.height = h;
                                c.getContext("2d")?.drawImage(img, 0, 0, w, h);
                                resolve(c.toDataURL("image/jpeg", q));
                              } catch { resolve(""); }
                            };
                            img.onerror = () => resolve("");
                            img.src = src;
                          });
                        const [fp, bp] = await Promise.all([
                          generateSidePreviewPNG("front", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, 2),
                          sides.back.template
                            ? generateSidePreviewPNG("back", sides as Parameters<typeof generateSidePreviewPNG>[1], bgColors, bgSvg, dims, 2)
                            : Promise.resolve(""),
                        ]);
                        [currentThumb, currentFrontPreview, currentBackPreview] = await Promise.all([
                          toJpeg(fp, 160, 160, 0.82),
                          toJpeg(fp, 1200, 1200, 0.88),
                          toJpeg(bp, 1200, 1200, 0.88),
                        ]);
                      } catch { /* ignore — proceed without images */ }

                      // Always include the current design as the first item, plus any previously saved cart items
                      const hasBackCart2 = (isBusinessCard || isFlyer) && !!(bgSvg.back || sides.back.template?.baseImage);
                      const effectivePpu2 = (pricePerUnit ?? 0) + (hasBackCart2 ? (pricePerUnit ?? 0) * 0.7 : 0);
                      const currentItem = pricePerUnit && pricePerUnit > 0 && selectedQty > 0
                        ? {
                            id: pendingCartIdRef.current ?? Date.now().toString(),
                            name: productName ?? "Custom Print",
                            qty: selectedQty,
                            pricePerUnit: effectivePpu2,
                            total: effectivePpu2 * selectedQty,
                            doubleSided: !!sides.back.template,
                            thumb: currentThumb,
                            frontPreview: currentFrontPreview,
                            backPreview: currentBackPreview,
                          }
                        : null;

                      const otherItems = existingCartItems
                        .map(({ id, name, qty, pricePerUnit: ppu, total, doubleSided, thumb }) => ({
                          id, name, qty, pricePerUnit: ppu ?? 0, total: total ?? 0, doubleSided: doubleSided ?? false, thumb,
                        }))
                        .filter((i) => i.pricePerUnit > 0 && i.qty > 0);

                      const cartItems = [...(currentItem ? [currentItem] : []), ...otherItems];

                      if (!cartItems.length) {
                        setStripeLoading(false);
                        setCheckoutError("No valid items to checkout. Please re-add your product.");
                        return;
                      }

                      try {
                        const res = await fetch("/api/checkout/create-session", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: cartItems,
                            customerName: cartUser ? `${cartUser.firstName} ${cartUser.lastName}` : "Guest",
                            customerEmail: cartUser?.email ?? "",
                            address: [houseNo, flat, city, state].filter(Boolean).join(", "),
                            customerId: cartUser?.id ?? "",
                          }),
                        });
                        const data = await res.json() as { url?: string; error?: string };
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          setCheckoutError(data.error ?? "Failed to start checkout. Please try again.");
                          setStripeLoading(false);
                        }
                      } catch {
                        setCheckoutError("Network error. Please try again.");
                        setStripeLoading(false);
                      }
                    }}
                    style={{
                      width: "100%", maxWidth: 320, padding: "15px",
                      background: stripeLoading ? "#9ca3af" : "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)",
                      border: "none", borderRadius: 12,
                      cursor: stripeLoading ? "not-allowed" : "pointer",
                      color: "#fff", fontSize: "1rem", fontWeight: 800,
                      boxShadow: stripeLoading ? "none" : "0 6px 20px rgba(124,58,237,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: stripeLoading ? 0.75 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {stripeLoading ? "Redirecting to payment…" : "Proceed to Checkout"}
                  </button>

                  <p style={{ margin: "10px 0 0", fontSize: "0.73rem", color: "#9ca3af" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Secure Checkout &nbsp;·&nbsp; 100% Safe &amp; Secure Payments
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#b0b7c3" }}>
                    Signed in as {cartUser?.firstName} {cartUser?.lastName} · {cartUser?.email}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Delete Confirm Dialog ── */}
        {deleteConfirmId && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 900,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden",
            }}>
              <div style={{ padding: "24px 24px 20px", textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </div>
                <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "1rem", color: "#111827" }}>Remove Item?</p>
                <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: "#6b7280" }}>Are you sure you want to delete this item from your cart?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e5e7eb", borderRadius: 12, background: "#fff", color: "#374151", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                  >No</button>
                  <button
                    onClick={() => {
                      if (deleteConfirmId === "__current__") {
                        // Remove the current item from localStorage and close checkout
                        try {
                          const cart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<{ id: string }>;
                          const updated = cart.filter(i => i.id !== pendingCartIdRef.current);
                          localStorage.setItem("wp_cart", JSON.stringify(updated));
                          localStorage.setItem("wp_cart_count", String(updated.length));
                        } catch { /* ignore */ }
                        setDeleteConfirmId(null);
                        setCheckoutOpen(false);
                      } else {
                        const updated = existingCartItems.filter(i => i.id !== deleteConfirmId);
                        setExistingCartItems(updated);
                        try {
                          localStorage.setItem("wp_cart", JSON.stringify(updated));
                          localStorage.setItem("wp_cart_count", String(updated.length));
                        } catch { /* ignore */ }
                        setDeleteConfirmId(null);
                      }
                    }}
                    style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 12, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                  >Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Address Popup ── */}
        {addressEditOpen && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 800,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden",
            }}>
              {/* Popup header */}
              <div style={{
                background: "linear-gradient(135deg,#7c3aed 0%,#db2777 60%,#f97316 100%)",
                padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>
                    {editForm.houseNo || editForm.city ? "Edit Address" : "Add Address"}
                  </span>
                </div>
                <button onClick={() => setAddressEditOpen(false)} style={{
                  background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
                  borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
                  color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>

              {/* Popup form */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
                {(
                  [
                    { key: "houseNo", label: "House / Unit No.", placeholder: "e.g. 12" },
                    { key: "flat",    label: "Street / Apartment", placeholder: "e.g. 123 Main St, Apt 4B" },
                    { key: "city",    label: "City", placeholder: "e.g. Halifax" },
                    { key: "state",   label: "Province", placeholder: "e.g. Nova Scotia" },
                  ] as { key: keyof typeof editForm; label: string; placeholder: string }[]
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={editForm[key]}
                      onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "11px 13px",
                        border: "1.5px solid #e5e7eb", borderRadius: 9,
                        fontSize: "0.92rem", color: "#111827", outline: "none",
                        boxSizing: "border-box", background: "#fff",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                ))}

                {/* Phone */}
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                    Phone Number <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 902 489 6081"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    style={{
                      width: "100%", padding: "11px 13px",
                      border: `1.5px solid ${editFormError && !editForm.phone ? "#dc2626" : "#e5e7eb"}`,
                      borderRadius: 9, fontSize: "0.92rem", color: "#111827",
                      outline: "none", boxSizing: "border-box", background: "#fff",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                    onBlur={(e) => (e.target.style.borderColor = editFormError && !editForm.phone ? "#dc2626" : "#e5e7eb")}
                  />
                </div>

                {editFormError && (
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>{editFormError}</p>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => setAddressEditOpen(false)}
                    style={{
                      flex: 1, padding: "12px", border: "1.5px solid #e5e7eb",
                      borderRadius: 10, cursor: "pointer", background: "#fff",
                      color: "#374151", fontWeight: 700, fontSize: "0.9rem",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const { houseNo, flat, city, state, phone } = editForm;
                      if (!phone.trim()) { setEditFormError("Phone number is required."); return; }
                      if (!houseNo.trim() || !flat.trim() || !city.trim() || !state.trim()) {
                        setEditFormError("Please fill in all address fields."); return;
                      }
                      setEditFormError("");
                      setCheckoutForm({ houseNo, flat, city, state, phone });
                      if (cartUser) {
                        fetch("/api/auth/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: cartUser.id, phone, houseNo, flat, city, state }),
                        }).catch(() => { /* ignore */ });
                      }
                      setAddressEditOpen(false);
                    }}
                    style={{
                      flex: 2, padding: "12px",
                      background: "linear-gradient(135deg,#7c3aed,#db2777)",
                      border: "none", borderRadius: 10, cursor: "pointer",
                      color: "#fff", fontWeight: 800, fontSize: "0.9rem",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Save Address
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* ── Preview Modal ────────────────────────────────────────────────── */}
    {previewOpen && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "#f0f2f5",
          display: "flex", flexDirection: "column",
          alignItems: "stretch", justifyContent: "flex-start",
          overflow: "hidden",
        }}
      >
        {/* ── Gradient header bar (matches site theme) ── */}
        <div style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
          padding: "0 24px",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>
              Design Preview
            </span>
          </div>
          <button
            onClick={() => setPreviewOpen(false)}
            style={{
              background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
              borderRadius: "50%", width: 36, height: 36,
              cursor: "pointer", color: "#fff", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700,
            }}
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 28, padding: "32px 24px 40px",
        }}>
          {/* 3-D card */}
          <div
            style={{ perspective: "1600px" }}
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startRot = previewRotRef.current;
              const card = previewCardRef.current;
              if (card) card.style.transition = "none";
              const onMove = (me: MouseEvent) => {
                const rot = startRot + (me.clientX - startX) * 0.5;
                previewRotRef.current = rot;
                if (card) card.style.transform = `rotateY(${rot}deg)`;
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                setPreviewRotY(previewRotRef.current);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          >
            <div
              ref={previewCardRef}
              style={{
                width: (() => {
                  const r  = CANVAS_W / CANVAS_H;
                  const mw = Math.min(window.innerWidth  * 0.82, 860);
                  const mh = Math.min(window.innerHeight - 420,  460);
                  return Math.round(mw / r <= mh ? mw : mh * r);
                })(),
                height: (() => {
                  const r  = CANVAS_W / CANVAS_H;
                  const mw = Math.min(window.innerWidth  * 0.82, 860);
                  const mh = Math.min(window.innerHeight - 420,  460);
                  const cw = mw / r <= mh ? mw : mh * r;
                  return Math.round(cw / r);
                })(),
                position: "relative",
                transformStyle: "preserve-3d",
                transform: `rotateY(${previewRotY}deg)`,
                transition: "transform 0.45s ease",
                cursor: "grab",
                borderRadius: "14px",
              }}
            >
              {/* Front face */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                borderRadius: "14px", overflow: "hidden",
                boxShadow: "0 8px 40px rgba(124,58,237,0.18), 0 2px 12px rgba(0,0,0,0.12)",
                background: previewFrontPng ? "transparent" : bgColors.front,
              }}>
                {previewLoading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ color: "#7c3aed", fontSize: "0.85rem", fontWeight: 600 }}>Loading preview…</span>
                  </div>
                ) : previewFrontPng ? (
                  <img src={previewFrontPng} alt="front" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                ) : null}
              </div>
              {/* Back face */}
              <div style={{
                position: "absolute", inset: 0,
                backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                borderRadius: "14px", overflow: "hidden",
                boxShadow: "0 8px 40px rgba(219,39,119,0.15), 0 2px 12px rgba(0,0,0,0.12)",
                background: previewBackPng ? "transparent" : (sides.back.template ? bgColors.back : "#ffffff"),
              }}>
                {previewLoading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ color: "#db2777", fontSize: "0.85rem", fontWeight: 600 }}>Loading preview…</span>
                  </div>
                ) : previewBackPng && sides.back.template ? (
                  <img src={previewBackPng} alt="back" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>
                    </svg>
                    <span style={{ color: "#9ca3af", fontSize: "0.78rem", fontWeight: 600 }}>No back design selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Front / Back toggle */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                const target = Math.round(previewRotRef.current / 360) * 360;
                previewRotRef.current = target;
                setPreviewRotY(target);
                if (previewCardRef.current) previewCardRef.current.style.transition = "transform 0.45s ease";
              }}
              style={{
                padding: "11px 36px", borderRadius: "999px",
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                border: "none", color: "#fff",
                fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                letterSpacing: "0.02em",
              }}
            >
              Front
            </button>
            <button
              onClick={() => {
                const target = Math.round(previewRotRef.current / 360) * 360 + 180;
                previewRotRef.current = target;
                setPreviewRotY(target);
                if (previewCardRef.current) previewCardRef.current.style.transition = "transform 0.45s ease";
              }}
              style={{
                padding: "11px 36px", borderRadius: "999px",
                background: "#fff", border: "2px solid #e5e7eb",
                color: "#374151",
                fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Effects Panel ─────────────────────────────────────────────────── */}
    {showEffects && selectedText && (() => {
      const EFFECTS: { id: TextItem["effect"]; label: string; preview: React.CSSProperties }[] = [
        { id: "none",      label: "Original",  preview: {} },
        { id: "shadow",    label: "Shadow",    preview: { textShadow: "3px 3px 0 rgba(0,0,0,0.35)" } },
        { id: "highlight", label: "Highlight", preview: { background: "#4FC3F7", borderRadius: "3px", padding: "0 4px" } },
        { id: "glitch",    label: "Glitch",    preview: { textShadow: "-2px 0 #00bcd4, 2px 0 #e040fb" } },
        { id: "echo",      label: "Echo",      preview: { textShadow: "3px 3px 0 rgba(100,100,100,0.35), 6px 6px 0 rgba(100,100,100,0.2)" } },
      ];
      const SHAPES: { id: TextItem["shape"]; label: string; icon: React.ReactNode }[] = [
        { id: "none",  label: "None",  icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <text x="24" y="34" textAnchor="middle" fontSize="28" fontWeight="700" fill="#222" fontFamily="serif">A</text>
            <polyline points="8,42 8,38" stroke="#222" strokeWidth="1.8"/><line x1="8" y1="40" x2="40" y2="40" stroke="#222" strokeWidth="1.8"/><polyline points="40,42 40,38" stroke="#222" strokeWidth="1.8"/>
          </svg>
        )},
        { id: "curve", label: "Curve", icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <defs><path id="arc-prev" d="M 4 38 Q 24 8 44 38"/></defs>
            <text fontSize="11" fontWeight="700" fill="#222" fontFamily="serif">
              <textPath href="#arc-prev" startOffset="50%" textAnchor="middle">ABCD</textPath>
            </text>
            <path d="M 4 40 Q 24 10 44 40" stroke="#222" strokeWidth="1.5" fill="none"/>
          </svg>
        )},
      ];
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowEffects(false)}>
          <div style={{ background: "#fff", borderRadius: "20px", width: "90%", maxWidth: "480px", padding: "24px 24px 32px", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#111" }}>Effects</span>
              <button onClick={() => setShowEffects(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", padding: "4px 8px" }}>✕</button>
            </div>

            {/* Shape */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111", marginBottom: "12px" }}>Shape</div>
              <div style={{ display: "flex", gap: "12px" }}>
                {SHAPES.map(s => {
                  const isSel = selectedText.shape === s.id;
                  return (
                    <button key={s.id} onClick={() => updateItem(selectedText.id, { shape: s.id })}
                      style={{ position: "relative", width: "110px", height: "100px", border: isSel ? "2px solid #1d4ed8" : "1.5px solid #e5e7eb", borderRadius: "12px", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      {s.icon}
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>{s.label}</span>
                      {isSel && <span style={{ position: "absolute", bottom: 6, right: 6, background: "#1d4ed8", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="11" height="11" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none"/></svg>
                      </span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style */}
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111", marginBottom: "12px" }}>Style</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {EFFECTS.map(ef => {
                  const isSel = selectedText.effect === ef.id;
                  return (
                    <button key={ef.id} onClick={() => updateItem(selectedText.id, { effect: ef.id })}
                      style={{ position: "relative", width: "110px", height: "100px", border: isSel ? "2px solid #1d4ed8" : "1.5px solid #e5e7eb", borderRadius: "12px", background: "#fafafa", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      <span style={{ fontSize: "2.4rem", fontWeight: 700, fontFamily: "serif", color: "#222", lineHeight: 1, ...ef.preview }}>A</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", fontFamily: "sans-serif" }}>{ef.label}</span>
                      {isSel && <span style={{ position: "absolute", bottom: 6, right: 6, background: "#1d4ed8", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="11" height="11" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none"/></svg>
                      </span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    })()}
    <input ref={replacePhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleReplacePhoto} />
    </>
  );
}
