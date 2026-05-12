"use client";

import { useState, useRef, useEffect } from "react";
import type { ShirtProduct, ShirtColor } from "@/lib/shirt-data";
import type { GalleryTemplate, DesignTemplateItem, DesignColorVariant, SerializableItem } from "@/lib/template-data";

// ─── Canvas config ────────────────────────────────────────────────────────────
const SHIRT_DIMS = { CW: 460, CH: 560, PX: 100, PY: 100, PW: 260, PH: 300 };
const BC_DIMS    = { CW: 460, CH: 270, PX: 30,  PY: 25,  PW: 400, PH: 220 };

// Business card outline SVG (transparent fill, just a border)
const BC_CARD_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">' +
    '<rect width="460" height="270" rx="10" fill="none" stroke="#d1d5db" stroke-width="1.5"/>' +
    "</svg>"
  );

const FONT_OPTIONS = [
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Impact", value: "Impact, fantasy" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

const TEXT_COLORS = [
  "#000000", "#ffffff", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#1d4ed8",
  "#7c3aed", "#db2777",
];

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
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#374151"/></svg>`,
    preview: <circle cx="50" cy="50" r="48" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Square",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="2" y="2" width="96" height="96" rx="4" fill="#374151"/></svg>`,
    preview: <rect x="2" y="2" width="96" height="96" rx="4" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Star",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151"/></svg>`,
    preview: <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Arrow",
    w: 120, h: 60,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><polygon points="0,15 80,15 80,0 120,30 80,60 80,45 0,45" fill="#374151"/></svg>`,
    preview: <polygon points="0,15 80,15 80,0 120,30 80,60 80,45 0,45" fill="#374151" />,
    vb: "0 0 120 60",
  },
  {
    label: "Line",
    w: 120, h: 20,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20"><rect x="0" y="7" width="120" height="6" rx="3" fill="#374151"/></svg>`,
    preview: <rect x="0" y="7" width="120" height="6" rx="3" fill="#374151" />,
    vb: "0 0 120 20",
  },
  {
    label: "Diamond",
    w: 100, h: 100,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,2 98,50 50,98 2,50" fill="#374151"/></svg>`,
    preview: <polygon points="50,2 98,50 50,98 2,50" fill="#374151" />,
    vb: "0 0 100 100",
  },
  {
    label: "Triangle",
    w: 100, h: 88,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 88"><polygon points="50,2 98,86 2,86" fill="#374151"/></svg>`,
    preview: <polygon points="50,2 98,86 2,86" fill="#374151" />,
    vb: "0 0 100 88",
  },
  {
    label: "Heart",
    w: 100, h: 90,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90"><path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151"/></svg>`,
    preview: <path d="M50 82 C50 82 5 52 5 25 C5 10 17 2 30 2 C40 2 48 8 50 14 C52 8 60 2 70 2 C83 2 95 10 95 25 C95 52 50 82 50 82Z" fill="#374151" />,
    vb: "0 0 100 90",
  },
];

function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ─── SVG parse / edit helpers ─────────────────────────────────────────────────

type ParsedSVG = {
  bgStr: string;       // SVG markup with text removed, data-id on shapes
  textItems: TextItem[];
};

const SHAPE_TAGS = ["rect", "circle", "polygon", "path", "line", "ellipse", "polyline"] as const;

function parseSVGForEditing(svgDataUrl: string): ParsedSVG | null {
  if (typeof window === "undefined") return null;
  if (!svgDataUrl.startsWith("data:image/svg+xml")) return null;
  let raw = "";
  try {
    if (svgDataUrl.includes(";base64,")) {
      raw = atob(svgDataUrl.split(";base64,")[1]);
    } else {
      raw = decodeURIComponent(svgDataUrl.split(",").slice(1).join(","));
    }
  } catch { return null; }

  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const svg = doc.documentElement;

  // Fix dimensions so the SVG fills the canvas exactly
  svg.setAttribute("width", "460");
  svg.setAttribute("height", "270");
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

    const estW = Math.max(60, Math.min(420, rawText.length * fs * 0.62 + 16));
    // Convert SVG absolute coords → print-area-local coords (PX=30, PY=25)
    let ix = svgX - 30;
    const iy = svgY - fs - 25;          // baseline → top; minus print-area Y offset
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
      color: isSolidColor ? fill : "#111827",
      align,
    });
    el.remove();
  });

  let bgStr = new XMLSerializer().serializeToString(doc);
  bgStr = bgStr.replace(/^<\?xml[^?]*\?>\s*/, "");
  return { bgStr, textItems };
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

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("load failed"));
    img.src = src;
  });
}

async function generateItemsPNG(
  items: CanvasItem[],
  dims: { CW: number; CH: number; PX: number; PY: number },
  bgColor?: string
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = dims.CW;
  canvas.height = dims.CH;
  const ctx = canvas.getContext("2d")!;
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, dims.CW, dims.CH);
  }
  for (const item of items) {
    if (item.kind === "text") {
      ctx.save();
      ctx.font = `${item.bold ? "bold " : ""}${item.size}px ${item.font}`;
      ctx.fillStyle = item.color;
      ctx.textAlign = item.align as CanvasTextAlign;
      const tx = item.align === "center" ? dims.PX + item.x + item.w / 2
               : item.align === "right"  ? dims.PX + item.x + item.w
               : dims.PX + item.x;
      ctx.fillText(item.text, tx, dims.PY + item.y + item.size);
      ctx.restore();
    } else if (item.kind === "image") {
      try {
        const img = await loadImg(item.src);
        ctx.drawImage(img, dims.PX + item.x, dims.PY + item.y, item.w, item.h);
      } catch { /* skip failed images */ }
    }
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
type SidebarTool = "material-color" | "text" | "uploads" | "graphics" | "template";

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
  productType?: "business-card";
  // admin mode
  adminMode?: boolean;
  adminFrontImage?: string;
  adminBackImage?: string;
  initialFrontItems?: SerializableItem[];
  initialBackItems?: SerializableItem[];
  initialFrontBgColor?: string;
  initialBackBgColor?: string;
  onSaveAdmin?: (
    frontItems: SerializableItem[],
    backItems: SerializableItem[],
    frontOverlay: string,
    backOverlay: string,
    frontBgColor?: string,
    backBgColor?: string
  ) => void;
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
        background: active ? "#e0f2fe" : "transparent",
        borderRadius: "10px", cursor: "pointer",
        color: active ? "#0891b2" : "#6b7280", width: "100%",
      }}
    >
      {icon}
      <span style={{ fontSize: "0.65rem", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </button>
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
  onSaveAdmin,
}: Props) {
  const isBusinessCard = productType === "business-card";
  const dims = isBusinessCard ? BC_DIMS : SHIRT_DIMS;
  const { CW: CANVAS_W, CH: CANVAS_H, PX: PRINT_X, PY: PRINT_Y, PW: PRINT_W, PH: PRINT_H } = dims;

  const [activeTool, setActiveTool] = useState<SidebarTool>("material-color");
  const [activeSide, setActiveSide] = useState<Side>("front");
  const [shirtColor, setShirtColor] = useState<ShirtColor>(initialColor ?? { hex: "#ffffff", name: "White" });
  const [bgColors, setBgColors] = useState<Record<Side, string>>({
    front: initialFrontBgColor ?? "#ffffff",
    back: initialBackBgColor ?? "#ffffff",
  });
  const [zoom, setZoom] = useState(1.5);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [appliedDesign, setAppliedDesign] = useState<DesignTemplateItem | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
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
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  // ─── Undo / Redo ──────────────────────────────────────────────────────────
  const historyRef = useRef<Record<Side, SideData>[]>([]);
  const futureRef  = useRef<Record<Side, SideData>[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function pushHistory(snapshot: Record<Side, SideData>) {
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 100) historyRef.current.shift();
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setSides((current) => {
      futureRef.current.push(current);
      setCanRedo(true);
      setCanUndo(historyRef.current.length > 0);
      return prev;
    });
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    setSides((current) => {
      historyRef.current.push(current);
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);
      return next;
    });
  }

  // Helper: parse an SVG design, apply to state
  function applySVGDesign(
    frontImageUrl: string,
    backImageUrl: string | undefined,
    frontExisting: CanvasItem[],
    backExisting: CanvasItem[],
    frontBgCol: string,
    backBgCol: string,
  ) {
    const pf = parseSVGForEditing(frontImageUrl);
    const pb = backImageUrl ? parseSVGForEditing(backImageUrl) : null;

    setBgSvg({
      front: pf?.bgStr ?? "",
      back:  pb?.bgStr ?? "",
    });

    // Use existing items if admin has already edited this design; else use extracted text.
    // If the back has no extracted text (e.g. blank back or BC outline), seed it with
    // fresh copies of the front items so users can immediately edit both sides.
    const frontItems = frontExisting.length > 0 ? frontExisting : (pf?.textItems ?? []);
    const rawBackItems = backExisting.length > 0 ? backExisting : (pb?.textItems ?? []);
    const backItems: typeof frontItems = rawBackItems.length > 0
      ? rawBackItems
      : frontItems.map((it) => ({ ...it, id: uid() }));

    if (isBusinessCard) {
      setBgColors({ front: frontBgCol, back: backBgCol });
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
      back: {
        items: backItems as CanvasItem[],
        template: {
          baseImage: backImageUrl ?? frontImageUrl,
          overlayImage: undefined,
          overlayColor: "#000000",
        },
      },
    });
  }

  // Pre-load admin-placed items when in admin mode
  useEffect(() => {
    if (!adminMode) return;
    const fi = adminFrontImage ?? "";
    const bi = adminBackImage ?? "";
    applySVGDesign(
      fi, bi || undefined,
      (initialFrontItems ?? []) as CanvasItem[],
      (initialBackItems  ?? []) as CanvasItem[],
      initialFrontBgColor ?? "#ffffff",
      initialBackBgColor  ?? "#ffffff",
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
            if (isBusinessCard) {
              applySVGDesign(
                match.frontImage,
                match.backImage ?? undefined,
                (match.frontAdminItems ?? []) as CanvasItem[],
                (match.backAdminItems  ?? []) as CanvasItem[],
                match.frontBgColor ?? "#ffffff",
                match.backBgColor  ?? "#ffffff",
              );
            } else {
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

  // Delete key removes selected item
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedItemId || editingItemId) return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeItem(selectedItemId);
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
      size: 20, bold: false, color: "#000000", align: "center",
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
      w, h,
    };
    setSides((prev) => {
      pushHistory(prev);
      return { ...prev, [activeSide]: { ...prev[activeSide], items: [...prev[activeSide].items, item] } };
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

  function startDrag(e: React.PointerEvent, id: string, ox: number, oy: number) {
    e.preventDefault();
    const capturedSide = activeSide;
    const capturedZoom = zoom;
    dragRef.current = { id, side: capturedSide, sx: e.clientX, sy: e.clientY, ox, oy };
    let snapshot: Record<Side, SideData> | null = null;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / capturedZoom;
      const dy = (ev.clientY - d.sy) / capturedZoom;
      setSides((prev) => {
        if (!snapshot) snapshot = prev;
        return {
          ...prev,
          [d.side]: {
            ...prev[d.side],
            items: prev[d.side].items.map((it) => {
              if (it.id !== d.id) return it;
              const maxX = it.kind === "image" ? PRINT_W - (it as ImageItem).w : PRINT_W;
              const maxY = it.kind === "image" ? PRINT_H - (it as ImageItem).h : PRINT_H;
              // For business cards allow items to sit anywhere on the full card (bleed area)
              const minX = isBusinessCard ? -PRINT_X : 0;
              const minY = isBusinessCard ? -PRINT_Y : 0;
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
      if (snapshot) pushHistory(snapshot);
      dragRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
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

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentSide = sides[activeSide];
  const selectedItem = currentSide.items.find((i) => i.id === selectedItemId);
  const selectedText = selectedItem?.kind === "text" ? selectedItem : null;

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
      label: isBusinessCard ? "Background\ncolor" : "Material\ncolor",
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
        height: "56px", borderBottom: "1px solid #e5e7eb", display: "flex",
        alignItems: "center", padding: "0 1rem", gap: "0.75rem",
        background: "#fff", flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "0.4rem 0.75rem", border: "1px solid #e5e7eb",
          borderRadius: "8px", background: "#fff", cursor: "pointer",
          fontSize: "0.875rem", color: "#374151", fontWeight: 600, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Contextual text controls OR product name */}
        {selectedText ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", minWidth: 0 }}>
            {/* Font */}
            <select
              value={selectedText.font}
              onChange={(e) => updateItem(selectedText.id, { font: e.target.value })}
              style={{ padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.8rem", color: "#374151", flexShrink: 0 }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Size */}
            <select
              value={selectedText.size}
              onChange={(e) => updateItem(selectedText.id, { size: Number(e.target.value) })}
              style={{ padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.8rem", color: "#374151", width: "64px", flexShrink: 0 }}
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>

            {/* Bold */}
            <button
              onClick={() => updateItem(selectedText.id, { bold: !selectedText.bold })}
              style={{
                padding: "0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "6px",
                background: selectedText.bold ? "#1d4ed8" : "#fff",
                color: selectedText.bold ? "#fff" : "#374151",
                fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", flexShrink: 0,
              }}
            >
              B
            </button>

            {/* Alignment */}
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => updateItem(selectedText.id, { align: a })}
                title={a}
                style={{
                  padding: "0.3rem 0.4rem", border: "1px solid #d1d5db", borderRadius: "6px",
                  background: selectedText.align === a ? "#e0f2fe" : "#fff",
                  color: selectedText.align === a ? "#0891b2" : "#6b7280",
                  cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0,
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

            {/* Color swatches */}
            <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateItem(selectedText.id, { color: c })}
                  title={c}
                  style={{
                    width: "20px", height: "20px", borderRadius: "50%", background: c,
                    border: `2px solid ${selectedText.color === c ? "#3b82f6" : "#d1d5db"}`,
                    cursor: "pointer", padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Delete text item */}
            <button
              onClick={() => { removeItem(selectedText.id); setSelectedItemId(null); }}
              style={{
                padding: "0.3rem 0.6rem", border: "1px solid #fca5a5",
                borderRadius: "6px", background: "#fef2f2", color: "#b91c1c",
                fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", flexShrink: 0,
              }}
            >
              Delete
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
              {adminMode ? (isBusinessCard ? "Business Card Editor" : "Design Editor") : (shirt?.name ?? "Design Editor")}
            </span>
          </div>
        )}

        {/* Right actions */}
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          {!adminMode && (
            <button style={{
              padding: "0.4rem 1rem", border: "1px solid #d1d5db",
              borderRadius: "8px", background: "#fff", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: 600, color: "#374151",
            }}>
              Preview
            </button>
          )}
          <button
            onClick={adminMode && onSaveAdmin
              ? async () => {
                  const frontPNG = sides.front.items.length
                    ? await generateItemsPNG(sides.front.items, dims, isBusinessCard ? bgColors.front : undefined)
                    : "";
                  const backPNG  = sides.back.items.length
                    ? await generateItemsPNG(sides.back.items, dims, isBusinessCard ? bgColors.back : undefined)
                    : "";
                  onSaveAdmin(
                    sides.front.items as SerializableItem[],
                    sides.back.items as SerializableItem[],
                    frontPNG,
                    backPNG,
                    isBusinessCard ? bgColors.front : undefined,
                    isBusinessCard ? bgColors.back : undefined
                  );
                }
              : undefined}
            style={{
              padding: "0.4rem 1.25rem", background: "#06b6d4", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: 700,
            }}>
            {adminMode ? "Save Design" : "Save & Continue →"}
          </button>
        </div>
      </div>

      {/* ── Editor body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left sidebar icons */}
        <div style={{
          width: "70px", borderRight: "1px solid #e5e7eb", background: "#fff",
          display: "flex", flexDirection: "column", gap: "4px",
          padding: "8px 6px", flexShrink: 0,
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
          width: "220px", borderRight: "1px solid #e5e7eb", background: "#fff",
          overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{
            padding: "0.75rem 1rem 0.5rem", borderBottom: "1px solid #f3f4f6",
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827" }}>
              {activeTool === "material-color" && (isBusinessCard ? "Background color" : "Material color")}
              {activeTool === "text" && "Text"}
              {activeTool === "uploads" && "Uploads"}
              {activeTool === "graphics" && "Graphics"}
            </span>
          </div>

          {activeTool === "material-color" && (
            isBusinessCard ? (
              /* ── Business card background color picker ── */
              <div style={{ padding: "1.25rem" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
                  {activeSide === "front" ? "Front" : "Back"} background
                </p>
                <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#6b7280" }}>
                  Selected: <strong style={{ color: "#111827" }}>
                    {BG_COLOR_PRESETS.find(p => p.value === bgColors[activeSide])?.label ?? bgColors[activeSide]}
                  </strong>
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {BG_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setBgColors((prev) => ({ ...prev, [activeSide]: p.value }))}
                      title={p.label}
                      style={{
                        width: "34px", height: "34px", borderRadius: "50%",
                        background: p.value,
                        border: `2px solid ${bgColors[activeSide] === p.value ? "#3b82f6" : "#d1d5db"}`,
                        cursor: "pointer", padding: 0,
                        outline: bgColors[activeSide] === p.value ? "3px solid #bfdbfe" : "none",
                        outlineOffset: "2px",
                        boxShadow: p.value === "#ffffff" ? "inset 0 0 0 1px #e5e7eb" : "none",
                      }}
                      aria-label={p.label}
                    />
                  ))}
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
                  Custom color
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={bgColors[activeSide]}
                      onChange={(e) => setBgColors((prev) => ({ ...prev, [activeSide]: e.target.value }))}
                      style={{ width: "40px", height: "36px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "2px", background: "#fff", cursor: "pointer" }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>{bgColors[activeSide]}</span>
                  </div>
                </label>
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

        </div>

        {/* ── Canvas area ─────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1, background: "#f3f4f6", display: "flex", alignItems: "center",
            justifyContent: "center", position: "relative", overflow: "hidden",
          }}
          onClick={() => { setSelectedItemId(null); setEditingItemId(null); setShapePick(null); }}
        >
          {/* Safety/Bleed badges */}
          <div style={{ position: "absolute", top: "16px", right: "126px", display: "flex", gap: "8px", zIndex: 10 }}>
            <span style={{
              padding: "4px 10px", borderRadius: "999px", border: "1.5px solid #3b82f6",
              fontSize: "0.75rem", fontWeight: 700, color: "#3b82f6", background: "rgba(255,255,255,0.9)",
            }}>Safety Area</span>
            <span style={{
              padding: "4px 10px", borderRadius: "999px", border: "1.5px solid #9ca3af",
              fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", background: "rgba(255,255,255,0.9)",
            }}>Bleed</span>
          </div>

          {/* Canvas with zoom transform — wrapper includes dimension lines so they scale together */}
          <div style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            position: "relative",
            width: CANVAS_W,
            height: CANVAS_H,
            flexShrink: 0,
          }}>

            {/* Vertical dimension line — left of card, outside */}
            <div style={{
              position: "absolute", right: "100%", top: 0,
              height: CANVAS_H, width: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginRight: 10, pointerEvents: "none",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: "100%", position: "relative" }}>
                {/* Top tick */}
                <div style={{ width: 10, height: "1.5px", background: "rgba(107,114,128,0.8)", flexShrink: 0 }} />
                {/* Top line */}
                <div style={{ flex: 1, width: "1.5px", background: "rgba(107,114,128,0.6)" }} />
                {/* Label */}
                <span style={{
                  fontSize: "0.6rem", color: "rgba(80,80,80,0.9)", fontWeight: 600,
                  writingMode: "vertical-rl", transform: "rotate(180deg)",
                  whiteSpace: "nowrap", margin: "5px 0", letterSpacing: "0.02em",
                }}>
                  {isBusinessCard ? "5.08cm" : "30.48cm"}
                </span>
                {/* Bottom line */}
                <div style={{ flex: 1, width: "1.5px", background: "rgba(107,114,128,0.6)" }} />
                {/* Bottom tick */}
                <div style={{ width: 10, height: "1.5px", background: "rgba(107,114,128,0.8)", flexShrink: 0 }} />
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
                <div style={{ width: "1.5px", height: 10, background: "rgba(107,114,128,0.8)", flexShrink: 0 }} />
                {/* Left line */}
                <div style={{ flex: 1, height: "1.5px", background: "rgba(107,114,128,0.6)" }} />
                {/* Label */}
                <span style={{
                  fontSize: "0.6rem", color: "rgba(80,80,80,0.9)", fontWeight: 600,
                  whiteSpace: "nowrap", margin: "0 6px", letterSpacing: "0.02em",
                }}>
                  {isBusinessCard ? "8.89cm" : "30.48cm"}
                </span>
                {/* Right line */}
                <div style={{ flex: 1, height: "1.5px", background: "rgba(107,114,128,0.6)" }} />
                {/* Right tick */}
                <div style={{ width: "1.5px", height: 10, background: "rgba(107,114,128,0.8)", flexShrink: 0 }} />
              </div>
            </div>

            {/* Inner canvas — has borderRadius + overflow clipping for BC */}
            <div style={{
              position: "absolute", inset: 0,
              ...(isBusinessCard ? { borderRadius: "10px", overflow: "hidden" } : {}),
            }}>
            {/* Canvas background for business card */}
            {isBusinessCard && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "10px",
                background: bgColors[activeSide],
                zIndex: 0,
              }} />
            )}

            {/* Base image — inline SVG when bgSvg available (allows shape click-to-edit) */}
            <div
              style={{ position: "absolute", inset: 0, borderRadius: "12px", overflow: "hidden", zIndex: 1 }}
              onClick={bgSvg[activeSide] ? handleShapeClick : undefined}
            >
              {bgSvg[activeSide] ? (
                <div
                  dangerouslySetInnerHTML={{ __html: bgSvg[activeSide] }}
                  style={{ width: "100%", height: "100%", cursor: "pointer" }}
                />
              ) : (
                <img
                  src={baseImageSrc}
                  alt={shirt?.name ?? "design"}
                  style={{ width: "100%", height: "100%", objectFit: isBusinessCard ? "contain" : "cover", display: "block" }}
                />
              )}
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
                }
              }}
            >
              {/* Safety area inner line */}
              <div style={{
                position: "absolute", inset: 12,
                border: "1px dashed rgba(148,163,184,0.45)",
                borderRadius: "2px", pointerEvents: "none",
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
                        padding: "2px 4px",
                        border: isSelected
                          ? "1.5px solid #3b82f6"
                          : "1.5px dashed transparent",
                        borderRadius: "2px",
                        cursor: isEditing ? "text" : "move",
                        userSelect: isEditing ? "text" : "none",
                        fontFamily: item.font,
                        fontSize: `${item.size}px`,
                        fontWeight: item.bold ? 700 : 400,
                        color: item.color,
                        textAlign: item.align,
                        outline: "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        zIndex: isSelected ? 10 : 1,
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
                      {item.text}
                      {/* Edge resize handles — visible when selected and not editing */}
                      {isSelected && !isEditing && (["e", "w", "n", "s"] as const).map((edge) => (
                        <div
                          key={edge}
                          onPointerDown={(e) => { e.stopPropagation(); startTextResize(e, item.id, edge, item); }}
                          style={{
                            position: "absolute",
                            background: "#3b82f6",
                            borderRadius: 3,
                            zIndex: 20,
                            ...(edge === "e" ? { right: -5, top: "50%", transform: "translateY(-50%)", width: 8, height: 28, cursor: "ew-resize" } :
                                edge === "w" ? { left: -5, top: "50%", transform: "translateY(-50%)", width: 8, height: 28, cursor: "ew-resize" } :
                                edge === "n" ? { top: -5, left: "50%", transform: "translateX(-50%)", width: 28, height: 8, cursor: "ns-resize" } :
                                              { bottom: -5, left: "50%", transform: "translateX(-50%)", width: 28, height: 8, cursor: "ns-resize" }),
                          }}
                        />
                      ))}
                    </div>
                  );
                }

                if (item.kind === "image") {
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: "absolute",
                        left: item.x, top: item.y,
                        width: item.w, height: item.h,
                        border: isSelected ? "1.5px solid #3b82f6" : "1.5px solid transparent",
                        borderRadius: "2px", cursor: "move", zIndex: isSelected ? 10 : 1,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                        startDrag(e, item.id, item.x, item.y);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={item.src} alt="design" draggable={false}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
                      />
                      {isSelected && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.id);
                              setSelectedItemId(null);
                            }}
                            style={{
                              position: "absolute", top: -8, right: -8,
                              width: 18, height: 18, borderRadius: "50%",
                              background: "#ef4444", color: "#fff", border: "none",
                              cursor: "pointer", fontSize: "0.65rem", fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              zIndex: 20,
                            }}
                          >
                            ✕
                          </button>
                          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                            <div
                              key={corner}
                              onPointerDown={(e) => startResize(e, item.id, corner, item)}
                              style={{
                                position: "absolute",
                                width: 10, height: 10,
                                background: "#fff",
                                border: "2px solid #3b82f6",
                                borderRadius: 2,
                                cursor: `${corner}-resize`,
                                zIndex: 20,
                                ...(corner === "nw" ? { top: -5, left: -5 } :
                                    corner === "ne" ? { top: -5, right: -5 } :
                                    corner === "sw" ? { bottom: -5, left: -5 } :
                                                      { bottom: -5, right: -5 }),
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

          {/* Zoom + Undo/Redo controls */}
          <div style={{
            position: "absolute", bottom: "16px", left: "50%",
            transform: "translateX(-50%)",
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

        {/* ── Right panel: Front / Back switcher ──────────────────────── */}
        <div style={{
          width: "110px", borderLeft: "1px solid #e5e7eb", background: "#fafafa",
          flexShrink: 0, display: "flex", flexDirection: "column",
          padding: "10px 8px", gap: "8px",
        }}>
          <p style={{
            margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#6b7280",
            textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center",
          }}>
            Sides
          </p>
          {(["front", "back"] as Side[]).map((side) => {
            const isActive = activeSide === side;
            const sd = sides[side];
            const thumbBg = isBusinessCard ? bgColors[side] : (shirtColor.hex === "#ffffff" ? "#f3f4f6" : shirtColor.hex);
            return (
              <button
                key={side}
                onClick={() => {
                  setActiveSide(side);
                  setSelectedItemId(null);
                  setEditingItemId(null);
                }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "5px", padding: "7px 4px",
                  border: `2px solid ${isActive ? "#3b82f6" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  background: isActive ? "#eff6ff" : "#fff",
                  cursor: "pointer", width: "100%",
                }}
              >
                {/* Mini canvas thumbnail */}
                <div style={{
                  width: isBusinessCard ? "80px" : "64px",
                  height: isBusinessCard ? "47px" : "78px",
                  background: thumbBg,
                  borderRadius: "6px", overflow: "hidden",
                  position: "relative", border: "1px solid rgba(0,0,0,0.08)",
                }}>
                  {sd.template?.baseImage ? (
                    <img src={sd.template.baseImage} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : adminMode ? (
                    <img
                      src={(side === "front" ? adminFrontImage : adminBackImage) ?? ""}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : !isBusinessCard ? (
                    <img src={shirt?.images[0] ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, mixBlendMode: "multiply" }} />
                  ) : null}
                  {sd.items.length > 0 && (
                    <div style={{
                      position: "absolute", inset: "22% 14%",
                      border: "1px dashed rgba(59,130,246,0.6)",
                      borderRadius: "2px",
                      background: "rgba(59,130,246,0.04)",
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  color: isActive ? "#2563eb" : "#6b7280",
                }}>
                  {side}
                </span>
                {sd.items.length > 0 && (
                  <span style={{ fontSize: "0.6rem", color: "#9ca3af", marginTop: "-3px" }}>
                    {sd.items.length} item{sd.items.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Template Selection Modal ── */}
    {templateModalOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
        onClick={(e) => { if (e.target === e.currentTarget) setTemplateModalOpen(false); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(960px,100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>Design Templates</h3>
            <button
              onClick={() => setTemplateModalOpen(false)}
              style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          </div>

          <div style={{ overflowY: "auto", padding: "1.25rem", flex: 1 }}>
            {templates.flatMap((t) => t.designs).length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                No templates available. Add designs in the admin panel.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem" }}>
                {templates.flatMap((t) => t.designs).map((d) => {
                  const previewBase = activeSide === "back" && d.backImage ? d.backImage : d.frontImage;
                  const previewOverlay = activeSide === "back" && d.backImage ? d.backOverlay : d.frontOverlay;
                  return (
                    <div key={d.id} style={{ border: "1.5px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ position: "relative", background: isBusinessCard ? (d.frontBgColor ?? "#ffffff") : "#f9fafb", aspectRatio: isBusinessCard ? "9/5" : "3/4", flexShrink: 0 }}>
                        <img src={previewBase} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
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
                            <img src={previewOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                          )
                        )}
                        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 3 }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: 3 }}>F</span>
                          {d.backImage && <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "#f3e8ff", color: "#7c3aed", padding: "1px 5px", borderRadius: 3 }}>B</span>}
                        </div>
                      </div>

                      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#111827" }}>{d.name}</p>
                        {!isBusinessCard && (d.frontOverlay || d.backOverlay) && (
                          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                            {OVERLAY_COLORS.map((c) => (
                              <button
                                key={c.value}
                                title={c.label}
                                onClick={() => setTplColors((p) => ({ ...p, [d.id]: c.value }))}
                                style={{
                                  width: 14, height: 14, borderRadius: "50%",
                                  background: c.value, padding: 0, cursor: "pointer",
                                  border: `2px solid ${tplColors[d.id] === c.value ? "#3b82f6" : "#d1d5db"}`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (isBusinessCard) {
                              setAppliedDesign(d);
                              applySVGDesign(
                                d.frontImage,
                                d.backImage ?? undefined,
                                (d.frontAdminItems ?? []) as CanvasItem[],
                                (d.backAdminItems  ?? []) as CanvasItem[],
                                d.frontBgColor ?? "#ffffff",
                                d.backBgColor  ?? "#ffffff",
                              );
                            } else {
                              applyTemplate(d.frontImage, d.frontOverlay, d.backImage, d.backOverlay, tplColors[d.id] || "#000000", d);
                            }
                            setTemplateModalOpen(false);
                          }}
                          style={{
                            marginTop: "auto", padding: "5px 0",
                            background: "#06b6d4", color: "#fff",
                            border: "none", borderRadius: "7px",
                            cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
                          }}
                        >
                          Apply Design
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
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
    </>
  );
}
