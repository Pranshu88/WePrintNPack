"use client";

import { useState, useEffect, useRef, useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GalleryTemplate, DesignTemplateItem, SerializableItem } from "@/lib/template-data";
import type { ColorVariant, Product } from "@/lib/types";
import DesignEditorShell from "./design-editor-shell";

function openBcDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("bc-packages-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function loadBcImage(id: string): Promise<string> {
  try {
    const db = await openBcDB();
    return await new Promise<string>((res) => {
      const tx = db.transaction("images", "readonly");
      const req = tx.objectStore("images").get(id);
      req.onsuccess = () => res((req.result as string) ?? "");
      req.onerror = () => res("");
    });
  } catch {
    return "";
  }
}

const BC_CARD_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">' +
    '<rect width="460" height="270" rx="10" fill="none" stroke="#d1d5db" stroke-width="1.5"/>' +
    "</svg>"
  );

// Custom-sized card outline — sharp corners, viewBox matches the real aspect ratio so it
// never has to be non-uniformly stretched (which is what distorted BC_CARD_OUTLINE's
// baked-in rx=10 corner into a curve for non-3.5:2 custom sizes).
function buildCustomCardOutline(widthIn: number, heightIn: number): string {
  const w = Math.round(widthIn * 100), h = Math.round(heightIn * 100);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="none" stroke="#d1d5db" stroke-width="1.5"/>` +
    "</svg>"
  );
}

// Express Flyer: 8.5" × 5.5" (landscape) — matches FLYER_EXPRESS_DIMS (460×297)
const FLYER_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 297">' +
    '<rect width="460" height="297" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>' +
    "</svg>"
  );

// Prime Flyer: 14" × 11" (landscape) — matches FLYER_PRIME_DIMS (756×595)
const PRIME_FLYER_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1700 1098">' +
    '<rect width="1700" height="1098" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>' +
    "</svg>"
  );

const COLOR_PRESETS = [
  { hex: "#ffffff", name: "White" },
  { hex: "#111827", name: "Black" },
  { hex: "#9ca3af", name: "Grey" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#1e3a8a", name: "Navy" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#f9a8d4", name: "Pink" },
  { hex: "#93c5fd", name: "Light Blue" },
  { hex: "#0d9488", name: "Teal" },
  { hex: "#fef3c7", name: "Cream" },
];

type ColorVariantForm = ColorVariant & { frontImageName: string; backImageName: string };

async function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Cannot load image."));
    img.src = src;
  });
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

function detectShirtBounds(imgEl: HTMLImageElement) {
  const W = imgEl.naturalWidth, H = imgEl.naturalHeight;
  const cnv = document.createElement("canvas");
  cnv.width = W; cnv.height = H;
  const ctx = cnv.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0);
  const px = ctx.getImageData(0, 0, W, H).data;
  const pts: [number, number][] = [];
  for (let d = 0; d < 6; d++) pts.push([d, d], [W - 1 - d, d], [d, H - 1 - d], [W - 1 - d, H - 1 - d]);
  let bR = 0, bG = 0, bB = 0;
  for (const [x, y] of pts) { const i = (y * W + x) * 4; bR += px[i]; bG += px[i + 1]; bB += px[i + 2]; }
  bR /= pts.length; bG /= pts.length; bB /= pts.length;
  const T = 40; let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4;
    if (Math.abs(px[i] - bR) > T || Math.abs(px[i + 1] - bG) > T || Math.abs(px[i + 2] - bB) > T) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return { x: W * 0.2, y: H * 0.2, w: W * 0.6, h: H * 0.6 };
  const bw = maxX - minX, bh = maxY - minY, M = 0.12;
  return { x: minX + bw * M, y: minY + bh * M, w: bw * (1 - 2 * M), h: bh * (1 - 2 * M) };
}

async function scaleOverlayToBase(overlayDataUrl: string, baseDataUrl: string): Promise<string> {
  const [base, overlay] = await Promise.all([loadImage(baseDataUrl), loadImage(overlayDataUrl)]);
  const W = base.naturalWidth, H = base.naturalHeight;
  const bounds = detectShirtBounds(base);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.min(bounds.w / overlay.naturalWidth, bounds.h / overlay.naturalHeight);
  const dw = overlay.naturalWidth * scale, dh = overlay.naturalHeight * scale;
  const dx = bounds.x + (bounds.w - dw) / 2, dy = bounds.y + (bounds.h - dh) / 2;
  ctx.drawImage(overlay, dx, dy, dw, dh);
  return canvas.toDataURL("image/png");
}

const BC_PREVIEW_DIMS           = { CW: 460, CH: 270, PX: 30, PY: 25 };
const SHIRT_PREVIEW_DIMS        = { CW: 460, CH: 490, PX: 100, PY: 100 };
const YARD_SIGN_PREVIEW_DIMS    = { CW: 600, CH: 450, PX: 0,  PY: 0  };
const FLYER_EXPRESS_PREVIEW_DIMS = { CW: 460, CH: 297, PX: 20, PY: 15 };
const FLYER_PRIME_PREVIEW_DIMS   = { CW: 1700, CH: 1098, PX: 20, PY: 20 };
const POSTER_LARGE_PREVIEW_DIMS  = { CW: 440, CH: 660, PX: 20, PY: 20 };
const POSTER_SMALL_PREVIEW_DIMS  = { CW: 440, CH: 680, PX: 20, PY: 20 };
const BANNER_VINYL_PREVIEW_DIMS  = { CW: 540, CH: 240, PX: 12, PY: 10 };
const BANNER_OUTDOOR_PREVIEW_DIMS = { CW: 540, CH: 270, PX: 12, PY: 12 };
const BANNER_ROLLUP_PREVIEW_DIMS = { CW: 950, CH: 950, PX: 15, PY: 15 };

type PreviewDims = { CW: number; CH: number; PX: number; PY: number };

async function buildDesignPreview(
  items: SerializableItem[],
  bgColor: string,
  baseImage?: string,        // SVG template URL — drawn after bg fill, before items
  dims: PreviewDims = BC_PREVIEW_DIMS
): Promise<string> {
  const { CW, CH, PX, PY } = dims;
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CW, CH);

  // Render SVG template stretched to fill the full canvas
  if (baseImage) {
    try {
      const svgImg = await loadImage(baseImage);
      ctx.drawImage(svgImg, 0, 0, CW, CH);
    } catch { /* skip if SVG fails to load */ }
  }

  // Helper: draw camera icon + "Upload Photo" label at canvas coords (absolute, not print-area-local)
  async function drawPlaceholderBox(x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x, y, w, h);
    const iconPx = Math.min(w, h) * 0.28;
    const cx2 = x + w / 2, cy2 = y + h / 2 - iconPx * 0.2;
    const camSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconPx}" height="${iconPx}" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
    try {
      const camImg = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(camSvg));
      ctx.drawImage(camImg, cx2 - iconPx / 2, cy2 - iconPx / 2, iconPx, iconPx);
    } catch { /* skip icon */ }
    const fontSize = Math.max(8, Math.min(14, h * 0.1));
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.fillText("Upload Photo", cx2, cy2 + iconPx * 0.7 + fontSize);
    ctx.restore();
  }

  // If no admin items are saved yet, detect placeholder rects directly from the SVG
  const hasEmptySrcItem = items.some((it) => it.kind === "image" && !it.src);
  if (!hasEmptySrcItem && baseImage?.startsWith("data:image/svg+xml")) {
    try {
      let svgRaw = "";
      if (baseImage.includes(";base64,")) {
        const binary = atob(baseImage.split(";base64,")[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        svgRaw = new TextDecoder().decode(bytes);
      } else {
        svgRaw = decodeURIComponent(baseImage.split(",").slice(1).join(","));
      }
      const doc = new DOMParser().parseFromString(svgRaw, "image/svg+xml");
      // Scale SVG coords to match how the SVG is stretched to fill CW×CH
      let svgW = CW, svgH = CH;
      const vbParts = (doc.documentElement.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/);
      if (vbParts.length >= 4) { svgW = parseFloat(vbParts[2]) || CW; svgH = parseFloat(vbParts[3]) || CH; }
      const scX = CW / svgW, scY = CH / svgH;
      for (const el of Array.from(doc.querySelectorAll("[data-placeholder='photo']"))) {
        const px  = parseFloat(el.getAttribute("x")      ?? "0") * scX;
        const py2 = parseFloat(el.getAttribute("y")      ?? "0") * scY;
        const pw  = parseFloat(el.getAttribute("width")  ?? "0") * scX;
        const ph  = parseFloat(el.getAttribute("height") ?? "0") * scY;
        if (pw > 2 && ph > 2) await drawPlaceholderBox(px, py2, pw, ph);
      }
    } catch { /* skip */ }
  }

  for (const rawItem of items) {
    const item = rawItem as SerializableItem & { shape?: string; italic?: boolean; bold?: boolean; effect?: string; rotation?: number };
    if (item.kind === "text") {
      const text   = item.text ?? "";
      const font   = item.font ?? "Arial";
      const size   = item.size ?? 16;
      const color  = item.color ?? "#000000";
      const bold   = item.bold ?? false;
      const italic = item.italic ?? false;
      const align  = item.align ?? "left";
      const shape  = item.shape ?? "none";

      if (shape === "curve") {
        const w = item.w;
        const r = w * 0.7;
        const h = r - Math.sqrt(r * r - (w / 2) * (w / 2));
        const svgH = Math.max(h + size + 8, size + 12);
        const pathId = `cp-${item.id}`;
        const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${svgH}"><defs><path id="${pathId}" d="M 0 ${r} Q ${w / 2} 0 ${w} ${r}"/></defs><text font-family="${font}" font-size="${size}" font-weight="${bold ? 700 : 400}" font-style="${italic ? "italic" : "normal"}" fill="${color}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escaped}</textPath></text></svg>`;
        try {
          const svgImg = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`);
          ctx.drawImage(svgImg, PX + item.x, PY + item.y, w, svgH);
        } catch { /* skip */ }
        continue;
      }

      ctx.save();
      if (item.rotation) {
        const cx = PX + item.x + item.w / 2;
        const cy = PY + item.y + size / 2;
        ctx.translate(cx, cy);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px ${font}`;
      ctx.textAlign = align as CanvasTextAlign;
      const tx = align === "center" ? PX + item.x + item.w / 2
               : align === "right"  ? PX + item.x + item.w
               : PX + item.x;
      const ty0 = PY + item.y + size;
      const lineH = size * 1.3;
      // Word-wrap to match editor's CSS whiteSpace:pre-wrap behavior
      const wrappedLines: string[] = [];
      for (const para of text.split("\n")) {
        if (!para) { wrappedLines.push(""); continue; }
        const words = para.split(" ");
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(test).width > item.w) {
            wrappedLines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) wrappedLines.push(line);
      }
      if (!wrappedLines.length) wrappedLines.push("");
      ctx.fillStyle = color;
      wrappedLines.forEach((wl, li) => { ctx.fillText(wl, tx, ty0 + li * lineH); });
      ctx.restore();
    } else if (item.kind === "image") {
      const ix = PX + item.x, iy = PY + item.y;
      const iw = item.w, ih = item.h ?? item.w;
      if (!item.src) {
        await drawPlaceholderBox(ix, iy, iw, ih);
      } else {
        try {
          const img = await loadImage(item.src);
          ctx.save();
          if (item.rotation) {
            const cx = ix + iw / 2;
            const cy = iy + ih / 2;
            ctx.translate(cx, cy);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          if (item.radii) {
            clipRoundedRect(ctx, ix, iy, iw, ih, item.radii);
          }
          ctx.drawImage(img, ix, iy, iw, ih);
          ctx.restore();
        } catch { /* skip */ }
      }
    }
  }
  return canvas.toDataURL("image/png");
}


const BC_PACKAGE_NAMES: Record<string, string> = {
  "bc-standard": "Business Cards",
  "bc-premium": "Premium Business Cards",
  "bc-luxury": "Luxury Business Cards",
  "fly-standard": "Express Flyers",
  "fly-premium": "Prime Flyers",
};

// Custom packages added via "+ Add Gallery Template" declare their own title/Width/
// Length (stored in localStorage). Once the first design/seed creates the real
// gallery_templates row, the page navigates to a new real id — matched by id first
// (works once ensureRealGalleryId's remap has run), falling back to a name match
// (covers galleries created before that remap existed, so they self-heal here too).
function findCustomPackage(galleryId: string, galleryName: string | undefined): { title: string; price: string; specs: string[] } | null {
  for (const key of ["bc-packages-list", "fly-packages-list"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw) as { id: string; title: string; price: string; specs: string[] }[];
      const match = list.find((p) => p.id === galleryId) ?? (galleryName ? list.find((p) => p.title === galleryName) : undefined);
      if (match) return match;
    } catch { /* ignore */ }
  }
  return null;
}

function parseSizeFromSpecs(specs: string[] | undefined | null): { width: number; height: number } | null {
  const sizeSpec = specs?.find((s) => s.startsWith("Size:"));
  if (!sizeSpec) return null;
  const [width, height] = sizeSpec.slice(sizeSpec.indexOf(":") + 1).split(/x|×/i).map((p) => parseFloat(p.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { width, height };
}

function parseColorsFromSpecs(specs: string[] | undefined | null): string[] {
  const colorSpec = specs?.find((s) => s.startsWith("Color:"));
  if (!colorSpec) return [];
  return colorSpec.slice(colorSpec.indexOf(":") + 1).split(",").map((c) => c.trim()).filter(Boolean);
}

function getCustomPackageSizeInches(galleryId: string, galleryName?: string): { width: number; height: number } | null {
  return parseSizeFromSpecs(findCustomPackage(galleryId, galleryName)?.specs);
}

function getCustomPackageTitle(galleryId: string, galleryName?: string): string | null {
  return findCustomPackage(galleryId, galleryName)?.title ?? null;
}

type Props = { productSlug: string; galleryId: string };

export default function AdminGalleryDetail({ productSlug, galleryId }: Props) {
  const router = useRouter();
  const [gallery, setGallery] = useState<GalleryTemplate | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  /* bulk select */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* design form */
  const [formOpen, setFormOpen] = useState(false);
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [dName, setDName] = useState("");
  const [dColorHex, setDColorHex] = useState("");
  const [dColorName, setDColorName] = useState("");
  /* front */
  const [dFrontImage, setDFrontImage] = useState("");
  const [dFrontImageName, setDFrontImageName] = useState("");
  const [dFrontOverlay, setDFrontOverlay] = useState("");
  const [dFrontOverlayName, setDFrontOverlayName] = useState("");
  /* back */
  const [dBackImage, setDBackImage] = useState("");
  const [dBackImageName, setDBackImageName] = useState("");
  const [dBackOverlay, setDBackOverlay] = useState("");
  const [dBackOverlayName, setDBackOverlayName] = useState("");
  /* admin 2D editor */
  const [adminEditorOpen, setAdminEditorOpen] = useState(false);
  const [dFrontAdminItems, setDFrontAdminItems] = useState<SerializableItem[]>([]);
  const [dBackAdminItems, setDBackAdminItems] = useState<SerializableItem[]>([]);
  const [dFrontBgColor, setDFrontBgColor] = useState("#ffffff");
  const [dBackBgColor, setDBackBgColor] = useState("#ffffff");

  const frontFileRef = useRef<HTMLInputElement>(null);
  const frontOverlayRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const backOverlayRef = useRef<HTMLInputElement>(null);

  /* color variants */
  const [colorVariants, setColorVariants] = useState<ColorVariantForm[]>([]);
  const [colorFormOpen, setColorFormOpen] = useState(false);
  const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
  const [cHex, setCHex] = useState("#000000");
  const [cName, setCName] = useState("");
  const [cFront, setCFront] = useState("");
  const [cFrontName, setCFrontName] = useState("");
  const [cBack, setCBack] = useState("");
  const [cBackName, setCBackName] = useState("");

  /* design preview modal */
  const [previewDesign, setPreviewDesign] = useState<DesignTemplateItem | null>(null);
  const [previewFrontSrc, setPreviewFrontSrc] = useState<string | null>(null);
  const [previewBackSrc, setPreviewBackSrc] = useState<string | null>(null);

  useEffect(() => {
    setPreviewFrontSrc(null);
    setPreviewBackSrc(null);
    if (!previewDesign) return;
    const gn = gallery?.name?.toLowerCase() ?? "";
    const isLabelGallery = gn.includes("label") || gn.includes("sticker");
    const modalDims: PreviewDims =
      customDimsInches                     ? {
        CW: Math.round(customDimsInches.width * 130),
        CH: Math.round(customDimsInches.height * 130),
        PX: Math.round(customDimsInches.width * 130 * 0.065),
        PY: Math.round(customDimsInches.height * 130 * 0.065),
      } :
      isTShirt                             ? SHIRT_PREVIEW_DIMS         :
      isYardSign                           ? YARD_SIGN_PREVIEW_DIMS     :
      gn.includes("large poster")          ? POSTER_LARGE_PREVIEW_DIMS  :
      gn.includes("small poster")          ? POSTER_SMALL_PREVIEW_DIMS  :
      gn === "vinyl banner"                ? BANNER_VINYL_PREVIEW_DIMS  :
      gn === "large outdoor banner"        ? BANNER_OUTDOOR_PREVIEW_DIMS :
      gn.includes("roll-up")              ? BANNER_ROLLUP_PREVIEW_DIMS :
      gn.includes("prime") || gn.includes("prime flyer") ? FLYER_PRIME_PREVIEW_DIMS :
      gn.includes("flyer") || gn.includes("express")     ? FLYER_EXPRESS_PREVIEW_DIMS :
                                             BC_PREVIEW_DIMS;
    let cancelled = false;
    // Compute correct canvas dims for labels from the actual SVG viewBox.
    // This ensures oval/rect labels use the right aspect ratio (not always square).
    const getLabelDims = (svgSrc?: string | null): PreviewDims => {
      if (!svgSrc?.startsWith("data:image/svg+xml")) return LABEL_ITEM_DIMS;
      try {
        const enc = svgSrc.split(",").slice(1).join(",");
        const raw = svgSrc.includes(";base64,") ? atob(enc) : decodeURIComponent(enc);
        const m = raw.match(/viewBox=["'][\d.]+ [\d.]+ ([\d.]+) ([\d.]+)["']/);
        if (!m) return LABEL_ITEM_DIMS;
        const vw = parseFloat(m[1]), vh = parseFloat(m[2]);
        const scale = 260 / Math.max(vw, vh);
        return { CW: Math.round(vw * scale), CH: Math.round(vh * scale), PX: 0, PY: 0 };
      } catch { return LABEL_ITEM_DIMS; }
    };
    // Always pass frontImage as base so path-based backgrounds (arcs, rings) render correctly.
    // Skip canvas render for labels without admin items — static img fallback is correct.
    if (!isLabelGallery || (previewDesign.frontAdminItems?.length ?? 0) > 0) {
      const frontDims = isLabelGallery ? getLabelDims(previewDesign.frontImage) : modalDims;
      void buildDesignPreview(
        previewDesign.frontAdminItems ?? [],
        previewDesign.frontBgColor ?? "#ffffff",
        previewDesign.frontImage,
        frontDims,
      ).then((src) => { if (!cancelled) setPreviewFrontSrc(src); }).catch(() => {});
    }
    if (previewDesign.backImage) {
      const backDims = isLabelGallery ? getLabelDims(previewDesign.backImage) : modalDims;
      if (!isLabelGallery || (previewDesign.backAdminItems?.length ?? 0) > 0) {
        void buildDesignPreview(
          previewDesign.backAdminItems ?? [],
          previewDesign.backBgColor ?? "#ffffff",
          previewDesign.backImage,
          backDims,
        ).then((src) => { if (!cancelled) setPreviewBackSrc(src); }).catch(() => {});
      }
    }
    return () => { cancelled = true; };
  }, [previewDesign, gallery]);

  /* seed designs */
  const [seeding, setSeeding] = useState(false);

  /* overlay editor */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDesign, setEditorDesign] = useState<DesignTemplateItem | null>(null);
  const [editorSide, setEditorSide] = useState<"front" | "back">("front");
  const [editorX, setEditorX] = useState(0);
  const [editorY, setEditorY] = useState(0);
  const [editorScale, setEditorScale] = useState(1);
  const [editorDragging, setEditorDragging] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef({ clientX: 0, clientY: 0, ox: 0, oy: 0 });
  const pinchRef = useRef<number | null>(null);
  const touchOriginRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => { void loadData(); }, [productSlug, galleryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editorDragging) return;
    const { clientX, clientY, ox, oy } = dragOriginRef.current;
    const onMove = (e: MouseEvent) => { setEditorX(ox + e.clientX - clientX); setEditorY(oy + e.clientY - clientY); };
    const onUp = () => setEditorDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [editorDragging]);

  useEffect(() => {
    const el = editorRef.current;
    if (!editorOpen || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setEditorScale((s) => parseFloat(Math.max(0.1, Math.min(5, s * (e.deltaY < 0 ? 1.08 : 0.93))).toFixed(3)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [editorOpen]);

  async function loadData() {
    setLoading(true);
    setErr("");
    try {
      const isBcPackage = galleryId.startsWith("bc-") || galleryId.startsWith("fly-");
      const prodRes = await fetch(`/api/products/${productSlug}`, { cache: "no-store" });
      const prodData = (await prodRes.json()) as { product?: Product };
      const prod = prodData.product ?? null;
      setProduct(prod);
      setColorVariants((prod?.colorVariants ?? []).map((v) => ({
        ...v, frontImageName: v.frontImage ? "Uploaded" : "", backImageName: v.backImage ? "Uploaded" : "",
      })));

      if (isBcPackage) {
        // Look for a real template already created for this BC package (e.g. after seeding)
        const bcName = BC_PACKAGE_NAMES[galleryId] ?? getCustomPackageTitle(galleryId) ?? galleryId;
        const tplsRes = await fetch(`/api/products/${productSlug}/templates`, { cache: "no-store" });
        const tplsData = (await tplsRes.json()) as { templates?: GalleryTemplate[] };
        const existing = tplsData.templates?.find((t) => t.name === bcName) ?? null;
        if (existing) {
          // Silently redirect to the real template URL — designs will load there
          router.replace(`/admin/templates/${productSlug}/${existing.id}`);
          return;
        }
        setGallery(null);
      } else {
        const tplRes = await fetch(`/api/products/${productSlug}/templates/${galleryId}`, { cache: "no-store" });
        const tplData = (await tplRes.json()) as { template?: GalleryTemplate; error?: string };
        if (!tplRes.ok) { setErr(tplData.error ?? "Gallery not found."); return; }
        setGallery(tplData.template ?? null);
      }
    } catch { setErr("Failed to load."); } finally { setLoading(false); }
  }

  function flash(message: string, isError = false) {
    isError ? setErr(message) : setMsg(message);
    setTimeout(() => isError ? setErr("") : setMsg(""), 3000);
  }

  // bc-/fly- package IDs (custom or legacy) are virtual until their first design/seed
  // creates the real gallery_templates row. Resolves (creating it if needed) to a real id.
  async function ensureRealGalleryId(): Promise<string> {
    if (gallery) return galleryId;
    if (!(galleryId.startsWith("bc-") || galleryId.startsWith("fly-"))) return galleryId;
    const bcName = BC_PACKAGE_NAMES[galleryId] ?? getCustomPackageTitle(galleryId) ?? galleryId;
    // The pricing-card image the admin uploaded for this package only ever lived in
    // this browser's IndexedDB (bc-packages-db, keyed by the virtual id) — use it here
    // if present, instead of a generic placeholder, so the real row starts out right.
    const savedImage = await loadBcImage(galleryId);
    const placeholder = savedImage || product?.image ||
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="#f3f4f6"/></svg>');
    const createRes = await fetch(`/api/products/${productSlug}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: bcName, previewImage: placeholder }),
    });
    const createData = (await createRes.json()) as { template?: { id: string }; error?: string };
    if (!createRes.ok) throw new Error(createData.error ?? "Failed to create template.");
    const realId = createData.template!.id;

    // The price/specs the admin set for this package only ever lived in localStorage
    // (bc-/fly- packages have their own pricing-card UI that never PATCHes the DB
    // row). Sync them onto the real row now so the storefront — which reads only
    // from the DB — actually shows them.
    const pkg = findCustomPackage(galleryId, bcName);
    if (pkg && (pkg.price || pkg.specs?.length)) {
      await fetch(`/api/products/${productSlug}/templates/${realId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: pkg.price, specs: pkg.specs }),
      });
    }

    // Custom packages (title, price, specs incl. size) live in localStorage keyed by
    // the old virtual id — remap to the new real id so future lookups (size, title
    // for this gallery) still resolve once we've navigated to the real URL.
    if (galleryId.startsWith("bc-custom-") || galleryId.startsWith("fly-custom-")) {
      const key = galleryId.startsWith("bc-") ? "bc-packages-list" : "fly-packages-list";
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw) as { id: string }[];
          const next = list.map((p) => p.id === galleryId ? { ...p, id: realId } : p);
          localStorage.setItem(key, JSON.stringify(next));
        }
      } catch { /* ignore */ }
    }

    return realId;
  }

  async function seedDesigns() {
    setSeeding(true);
    try {
      const effectiveId = await ensureRealGalleryId();

      const res = await fetch(
        `/api/products/${productSlug}/templates/${effectiveId}/seed-designs`,
        { method: "POST" }
      );
      const data = (await res.json()) as { added?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Seed failed.");

      if (effectiveId !== galleryId) {
        // Navigate to the real template URL so designs are visible
        router.replace(`/admin/templates/${productSlug}/${effectiveId}`);
      } else {
        flash(data.added === 0 ? "All seed designs already present." : `${data.added} design${data.added !== 1 ? "s" : ""} added.`);
        await loadData();
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Seed failed.", true);
    } finally {
      setSeeding(false);
    }
  }

  async function seedFromSource(sourceGalleryId: string) {
    setSeeding(true);
    try {
      const effectiveId = await ensureRealGalleryId();
      const res = await fetch(
        `/api/products/${productSlug}/templates/${effectiveId}/copy-designs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromGalleryId: sourceGalleryId }),
        }
      );
      const data = (await res.json()) as { added?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Seed failed.");

      if (effectiveId !== galleryId) {
        router.replace(`/admin/templates/${productSlug}/${effectiveId}`);
      } else {
        flash(data.added === 0 ? "All seed designs already present." : `${data.added} design${data.added !== 1 ? "s" : ""} added.`);
        await loadData();
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Seed failed.", true);
    } finally {
      setSeeding(false);
    }
  }

  /* ── Design form helpers ── */
  async function handleFrontImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    const raw = await readFile(file);
    setDFrontImage(raw); setDFrontImageName(file.name);
    if (dFrontOverlay) setDFrontOverlay(await scaleOverlayToBase(dFrontOverlay, raw));
  }
  async function handleFrontOverlay(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    const raw = await readFile(file);
    setDFrontOverlay(dFrontImage ? await scaleOverlayToBase(raw, dFrontImage) : raw);
    setDFrontOverlayName(file.name);
  }
  async function handleBackImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    const raw = await readFile(file);
    setDBackImage(raw); setDBackImageName(file.name);
    if (dBackOverlay) setDBackOverlay(await scaleOverlayToBase(dBackOverlay, raw));
  }
  async function handleBackOverlay(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    const raw = await readFile(file);
    setDBackOverlay(dBackImage ? await scaleOverlayToBase(raw, dBackImage) : raw);
    setDBackOverlayName(file.name);
  }

  function openAddDesign() {
    setEditingDesignId(null);
    setDName(""); setDColorHex(""); setDColorName("");
    setDFrontOverlay(""); setDFrontOverlayName("");
    setDBackOverlay(""); setDBackOverlayName("");
    setDFrontAdminItems([]); setDBackAdminItems([]);
    setDFrontBgColor("#ffffff"); setDBackBgColor("#ffffff");
    if (isBusinessCard) {
      setDFrontImage(bcCardOutline); setDFrontImageName("Business Card (Front)");
      setDBackImage(bcCardOutline);  setDBackImageName("Business Card (Back)");
      setAdminEditorOpen(true);
      return;
    } else if (isFlyer) {
      setDFrontImage(flyerOutline); setDFrontImageName("Flyer (Front)");
      setDBackImage(flyerOutline);  setDBackImageName("Flyer (Back)");
      setAdminEditorOpen(true);
      return;
    } else if (!isTShirt) {
      // Every non-apparel category goes straight to the 2D editor (like BC/flyers) —
      // only T-Shirts (which need per-color front/back mockup uploads) use the field form.
      setDFrontImage(""); setDFrontImageName("");
      setDBackImage("");  setDBackImageName("");
      setAdminEditorOpen(true);
      return;
    } else {
      setDFrontImage(""); setDFrontImageName("");
      setDBackImage("");  setDBackImageName("");
      [frontFileRef, frontOverlayRef, backFileRef, backOverlayRef].forEach((r) => { if (r.current) r.current.value = ""; });
    }
    setFormOpen(true);
  }

  function startEditDesign(d: DesignTemplateItem) {
    setEditingDesignId(d.id);
    setDName(d.name);
    setDColorHex(d.colorHex ?? ""); setDColorName(d.colorName ?? "");
    setDFrontImage(d.frontImage); setDFrontImageName("Existing");
    setDFrontOverlay(d.frontOverlay ?? ""); setDFrontOverlayName(d.frontOverlay ? "Existing" : "");
    setDBackImage(d.backImage ?? ""); setDBackImageName(d.backImage ? "Existing" : "");
    setDBackOverlay(d.backOverlay ?? ""); setDBackOverlayName(d.backOverlay ? "Existing" : "");
    setDFrontAdminItems(d.frontAdminItems ?? []);
    setDBackAdminItems(d.backAdminItems ?? []);
    setDFrontBgColor(d.frontBgColor ?? "#ffffff");
    setDBackBgColor(d.backBgColor ?? "#ffffff");
    // Every non-apparel category goes straight to the 2D editor; T-Shirts use the field form.
    if (!isTShirt) setAdminEditorOpen(true);
    else setFormOpen(true);
  }

  function clearDesignForm() {
    setFormOpen(false); setEditingDesignId(null); setDName(""); setDColorHex(""); setDColorName("");
    setDFrontImage(""); setDFrontImageName(""); setDFrontOverlay(""); setDFrontOverlayName("");
    setDBackImage(""); setDBackImageName(""); setDBackOverlay(""); setDBackOverlayName("");
    setDFrontAdminItems([]); setDBackAdminItems([]);
    setDFrontBgColor("#ffffff"); setDBackBgColor("#ffffff");
  }

  async function saveDesign() {
    if (!dName.trim() || (!isBusinessCard && !isFlyer && !isStickerLabel && !dFrontImage)) { flash("Design name and front base image are required.", true); return; }
    setSaving(true);
    const frontImg = dFrontImage || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : "");
    const backImg  = dBackImage  || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : "");
    const payload = {
      name: dName,
      ...(dColorHex ? { colorHex: dColorHex } : {}),
      ...(dColorName ? { colorName: dColorName } : {}),
      frontImage: frontImg,
      ...(dFrontOverlay ? { frontOverlay: dFrontOverlay } : {}),
      ...(backImg ? { backImage: backImg } : {}),
      ...(dBackOverlay ? { backOverlay: dBackOverlay } : {}),
      ...(dFrontAdminItems.length ? { frontAdminItems: dFrontAdminItems } : {}),
      ...(dBackAdminItems.length ? { backAdminItems: dBackAdminItems } : {}),
      ...((isBusinessCard || isStickerLabel) ? { frontBgColor: dFrontBgColor, backBgColor: dBackBgColor } : {}),
    };
    try {
      if (editingDesignId) {
        await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${editingDesignId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        flash("Design updated.");
      } else {
        await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        flash("Design added.");
      }
      clearDesignForm(); await loadData();
    } catch { flash("Save failed.", true); } finally { setSaving(false); }
  }

  async function deleteDesign(designId: string) {
    if (!window.confirm("Delete this design?")) return;
    await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${designId}`, { method: "DELETE" });
    flash("Deleted."); await loadData();
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set((gallery?.designs ?? []).map((d) => d.id)));
  }

  async function bulkDeleteSelected() {
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${id}`, { method: "DELETE" })
        )
      );
      flash("Deleted.");
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadData();
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  /* ── Overlay editor ── */
  function openEditor(d: DesignTemplateItem, side: "front" | "back") {
    setEditorDesign(d); setEditorSide(side);
    setEditorX(0); setEditorY(0); setEditorScale(1); setEditorOpen(true);
  }

  async function saveEditorAdjustments() {
    if (!editorDesign) return;
    const baseImg = editorSide === "front" ? editorDesign.frontImage : editorDesign.backImage;
    const overlayImg = editorSide === "front" ? editorDesign.frontOverlay : editorDesign.backOverlay;
    if (!overlayImg || !baseImg) return;
    setEditorSaving(true);
    try {
      const displayW = editorRef.current?.offsetWidth ?? 400;
      const overlay = await loadImage(overlayImg);
      const W = overlay.naturalWidth, H = overlay.naturalHeight;
      const ratio = W / displayW;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.translate(W / 2 + editorX * ratio, H / 2 + editorY * ratio);
      ctx.scale(editorScale, editorScale);
      ctx.drawImage(overlay, -W / 2, -H / 2, W, H);
      ctx.restore();
      const field = editorSide === "front" ? "frontOverlay" : "backOverlay";
      await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${editorDesign.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: canvas.toDataURL("image/png") }),
      });
      flash("Overlay saved.");
      setEditorOpen(false); await loadData();
    } catch { flash("Save failed.", true); } finally { setEditorSaving(false); }
  }

  /* ── Color variant handlers ── */
  async function handleColorFront(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    setCFront(await readFile(file)); setCFrontName(file.name);
  }
  async function handleColorBack(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    setCBack(await readFile(file)); setCBackName(file.name);
  }

  function clearColorForm() {
    setEditingColorIdx(null); setCHex("#000000"); setCName("");
    setCFront(""); setCFrontName(""); setCBack(""); setCBackName("");
  }

  function startEditColor(v: ColorVariantForm, idx: number) {
    setEditingColorIdx(idx); setCHex(v.hex); setCName(v.name);
    setCFront(v.frontImage); setCFrontName(v.frontImageName || "Existing");
    setCBack(v.backImage ?? ""); setCBackName(v.backImageName || (v.backImage ? "Existing" : ""));
    setColorFormOpen(true);
  }

  async function saveColorVariant() {
    if (!product) return;
    if (!cName.trim() || !cFront) { flash("Color name and front image are required.", true); return; }
    const next: ColorVariantForm = {
      hex: cHex, name: cName.trim(), frontImage: cFront, frontImageName: cFrontName || "Uploaded",
      ...(cBack ? { backImage: cBack } : {}), backImageName: cBackName,
    };
    const nextVariants = [...colorVariants];
    if (editingColorIdx === null) nextVariants.push(next);
    else nextVariants[editingColorIdx] = next;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productSlug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug, name: product.name, category: product.category,
          image: product.image, description: product.description,
          startingPrice: product.startingPrice, specs: product.specs,
          colorVariants: nextVariants.map(({ frontImageName: _f, backImageName: _b, ...v }) => v),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setColorVariants(nextVariants);
      flash(editingColorIdx === null ? "Color added." : "Color updated.");
      clearColorForm(); setColorFormOpen(false);
    } catch { flash("Save failed.", true); } finally { setSaving(false); }
  }

  async function deleteColorVariant(idx: number) {
    if (!product) return;
    const nextVariants = colorVariants.filter((_, i) => i !== idx);
    setSaving(true);
    try {
      await fetch(`/api/products/${productSlug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug, name: product.name, category: product.category,
          image: product.image, description: product.description,
          startingPrice: product.startingPrice, specs: product.specs,
          colorVariants: nextVariants.map(({ frontImageName: _f, backImageName: _b, ...v }) => v),
        }),
      });
      setColorVariants(nextVariants); flash("Color removed.");
    } catch { flash("Save failed.", true); } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "#9ca3af", fontSize: "0.9rem" }}>Loading…</div>
  );

  const isBusinessCard = product?.category === "business-cards";
  // Universal path: any gallery template created via the rich "+ Add Gallery Template"
  // modal (any category except T-Shirts) has its declared Size stored directly on the
  // template's own specs. Falls back to the legacy localStorage lookup for older
  // bc-/fly- custom packages (e.g. "Blossom Card") created before that existed.
  const specsSizeInches = product?.category !== "t-shirts" ? parseSizeFromSpecs(gallery?.specs) : null;
  const customDimsInches = specsSizeInches ?? ((isBusinessCard || product?.category === "flyers")
    ? getCustomPackageSizeInches(galleryId, gallery?.name)
    : null);
  const templateMaterialColors = parseColorsFromSpecs(gallery?.specs);
  const bcCardOutline = customDimsInches ? buildCustomCardOutline(customDimsInches.width, customDimsInches.height) : BC_CARD_OUTLINE;
  // Custom galleries created via "+ Add Gallery Template" (e.g. "bc-custom-…") declare
  // their own size, so the generic business-card-shaped Seed Designs don't apply to them.
  const isCustomPackage = galleryId.includes("-custom-");
  const isTShirt = product?.category === "t-shirts";
  const FLAT_ART_SLUGS = ["posters", "vinyl-banners", "roll-up-banners", "yard-signs", "stickers-and-labels"];
  const isStickerLabel = productSlug === "stickers-and-labels";
  const isYardSign     = productSlug === "yard-signs";
  const isFlyer = !isStickerLabel && (galleryId.startsWith("fly-") || productSlug.toLowerCase().includes("flyer") || FLAT_ART_SLUGS.includes(productSlug));
  const isPrimeFlyer = galleryId === "fly-premium" || (gallery?.name?.toLowerCase().includes("prime") ?? false);
  const flyerOutline = isPrimeFlyer ? PRIME_FLYER_OUTLINE : FLYER_OUTLINE;
  const isLargePoster     = gallery?.name?.toLowerCase().includes("large poster") ?? false;
  const isSmallPoster     = gallery?.name?.toLowerCase().includes("small poster") ?? false;
  const galleryNameLower  = gallery?.name?.toLowerCase() ?? "";
  const isBannerVinyl     = galleryNameLower === "vinyl banner";
  const isBannerOutdoor   = galleryNameLower === "large outdoor banner";
  const isBannerRollupStd = galleryNameLower === "standard roll-up banner";
  const isBannerRollupPrem= galleryNameLower === "premium roll-up banner";
  const flyerProductType =
    isYardSign        ? "yard-sign"            as const :
    isLargePoster     ? "poster-large"          as const :
    isSmallPoster     ? "poster-small"          as const :
    isBannerVinyl     ? "banner-vinyl"          as const :
    isBannerOutdoor   ? "banner-outdoor"        as const :
    isBannerRollupStd ? "banner-rollup-std"     as const :
    isBannerRollupPrem? "banner-rollup-premium" as const :
    isPrimeFlyer      ? "flyer-prime"           as const :
                        "flyer-express"         as const;
  const isBcPackage = galleryId.startsWith("bc-") || galleryId.startsWith("fly-");
  const designs = gallery?.designs ?? [];
  const hasDesigns = designs.length > 0;

  // Mirrors the exact set of galleries the seed-designs API route (app/api/products/[slug]/
  // templates/[templateId]/seed-designs/route.ts) knows how to generate art for. Any gallery
  // outside this set would fall into that route's generic business-card-shaped fallback,
  // which doesn't fit e.g. a label or sign — so the button simply doesn't show for those.
  const isBannerProductSlug = productSlug === "vinyl-banners" || productSlug === "roll-up-banners" || productSlug === "large-outdoor-banner";
  // sinaliteId "1"/"2"/"7" are the first 3 Sinalite "Business Cards" category products, repurposed to
  // carry the hand-built Business/Premium/Luxury seed-design sets regardless of their display name.
  const isNamedBcGallery = gallery?.sinaliteId === "1" || gallery?.sinaliteId === "2" || gallery?.sinaliteId === "7"
    || gallery?.name === "Business Cards" || gallery?.name === "Premium Business Cards" || gallery?.name === "Luxury Business Cards";
  // sinaliteId "37"/"38" are the first 2 Sinalite "Flyers" category products, repurposed to carry
  // the Express/Prime Flyers seed-design set regardless of their display name. Other imported
  // flyers under "bold-flyers" get no seed-design option.
  const isNamedFlyerGallery = productSlug === "bold-flyers" && (
    gallery?.sinaliteId === "37" || gallery?.sinaliteId === "38" || gallery?.name === "Express Flyers" || gallery?.name === "Prime Flyers"
  );
  // sinaliteId "97"/"98" are the first 2 Sinalite "Coroplast Signs & Yard Signs" category
  // products, repurposed to carry the Business/Elite Yard Sign seed-design set regardless of
  // their display name. Other imported yard signs get no seed-design option.
  const isNamedYardSignGallery = isYardSign && (
    gallery?.sinaliteId === "97" || gallery?.sinaliteId === "98" || gallery?.name === "Business Yard Sign" || gallery?.name === "Elite Yard Sign"
  );
  // sinaliteId "65"/"66" are the first 2 Sinalite "Posters" category products, repurposed to
  // carry the Large/Small Posters seed-design set regardless of their display name. Other
  // imported posters get no seed-design option.
  const isNamedPosterGallery = productSlug === "posters" && (
    gallery?.sinaliteId === "65" || gallery?.sinaliteId === "66" || gallery?.name === "Large Posters" || gallery?.name === "Small Posters"
  );
  // The single Sinalite "Large Format Posters" product reuses the Posters arr[0] ("Large
  // Posters") seed-design set.
  const isLargeFormatPosterGallery = productSlug === "large-format-posters" && gallery?.sinaliteId === "105";
  // The first Sinalite "Vinyl Banners" category product (sinaliteId "101") reuses the seed-design
  // set from "Vinyl Banner" under Banners (slug "vinyl-banners"). Other imported vinyl banners
  // get no seed-design option.
  const isSinaliteVinylBannerGallery = productSlug === "sinalite-vinyl-banners" && gallery?.sinaliteId === "101";
  // The first Sinalite "Pull Up Banners" category product (sinaliteId "103") reuses the
  // seed-design set from "Premium Roll-Up Banner" under Banners (slug "vinyl-banners"). Other
  // imported pull up banners get no seed-design option.
  const isPullUpBannerGallery = productSlug === "pull-up-banners" && gallery?.sinaliteId === "103";
  // The single Sinalite "Square Cut Labels / Stickers" product reuses the "Die-Cut Stickers"
  // seed-design set from Roll Labels / Stickers (slug "stickers-and-labels").
  const isSquareCutLabelGallery = productSlug === "square-cut-labels-stickers" && gallery?.sinaliteId === "96";
  // sinaliteId "7028" is the first Sinalite "Roll Labels / Stickers" category product,
  // repurposed to carry the Product Labels seed-design set regardless of display name. Other
  // imported roll labels/stickers get no seed-design option; the 2 original hand-built
  // templates (matched by name) still work as before.
  const isNamedStickerLabelGallery = isStickerLabel && (
    gallery?.sinaliteId === "7028" || gallery?.name === "Product Labels" || gallery?.name === "Die-Cut Stickers"
  );
  // Postcards has no hand-built tiers of its own — every imported row falls through to the
  // seed-designs route's generic (deterministic) design set, so the button is just enabled
  // outright for the whole product.
  const isPostcardGallery = productSlug === "promotional-postcards";
  const canSeedDesigns = !isCustomPackage && !isTShirt && (
    isBannerProductSlug || isSinaliteVinylBannerGallery || isPullUpBannerGallery || isNamedPosterGallery || isLargeFormatPosterGallery || isNamedFlyerGallery || isNamedStickerLabelGallery || isSquareCutLabelGallery || isNamedYardSignGallery || isNamedBcGallery || isPostcardGallery
  );
  // Raw Sinalite-imported business card rows outside the 3 hand-built tiers (isNamedBcGallery)
  // come in with zero designs — this clones the design set from "Business cards 14pt (Profit
  // Maximizer)" (the first, fully-designed BC row) onto them.
  const BC_SEED_SOURCE_ID = "sn0001mrx575ni";
  const canSeedFromFirstBc = isBusinessCard && !isCustomPackage && !isNamedBcGallery && !hasDesigns && galleryId !== BC_SEED_SOURCE_ID;
  // "Flyers 100lb Gloss Text" (sinaliteId 37) — the first, fully-designed flyer row — is the
  // source design set the "Seed Design" button copies onto any raw Sinalite-imported flyer row
  // (outside the 2 hand-built Express/Prime tiers) that has no designs of its own.
  const FLYER_SEED_SOURCE_ID = "snf0001mrxhirjn";
  const canSeedFromFirstFlyer = productSlug === "bold-flyers" && !isCustomPackage && !isNamedFlyerGallery && !hasDesigns && galleryId !== FLYER_SEED_SOURCE_ID;

  const editorBase = editorDesign ? (editorSide === "front" ? editorDesign.frontImage : editorDesign.backImage) : undefined;
  const editorOverlay = editorDesign ? (editorSide === "front" ? editorDesign.frontOverlay : editorDesign.backOverlay) : undefined;

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href={
            ["t-shirts", "round-neck-tshirt", "collar-tshirt"].includes(productSlug) ? "/admin/apparel"
              : ["packaging-box", "pizza-boxes", "shipping-boxes", "mailer-boxes", "square-shipping-boxes"].includes(productSlug) ? "/admin/packaging"
              : "/admin/templates"
          } style={{ fontSize: "0.8rem", color: "#7c3aed", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
            ← Back to {
              ["t-shirts", "round-neck-tshirt", "collar-tshirt"].includes(productSlug) ? "Apparel"
                : ["packaging-box", "pizza-boxes", "shipping-boxes", "mailer-boxes", "square-shipping-boxes"].includes(productSlug) ? "Packaging"
                : "Printing"
            }
          </Link>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>{gallery?.name ?? BC_PACKAGE_NAMES[galleryId] ?? getCustomPackageTitle(galleryId) ?? product?.name ?? "Gallery"}</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>Design templates for this gallery</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, alignItems: "center" }}>
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={selectAll}
                style={{ padding: "0.6rem 1.1rem", background: "#fff", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
              >
                Select All
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => setConfirmBulkDelete(true)}
                style={{ padding: "0.6rem 1.1rem", background: selectedIds.size === 0 ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: selectedIds.size === 0 ? "not-allowed" : "pointer" }}
              >
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </button>
              <button
                type="button"
                onClick={toggleSelectMode}
                style={{ padding: "0.6rem 1.1rem", background: "#fff", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {hasDesigns && (
                <button
                  type="button"
                  onClick={toggleSelectMode}
                  style={{ padding: "0.6rem 1.1rem", background: "#fff", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Select
                </button>
              )}
              {canSeedDesigns && (
              <button
                type="button"
                onClick={() => void seedDesigns()}
                disabled={seeding}
                title="Auto-generate 8 visually distinct design templates"
                style={{ padding: "0.6rem 1.1rem", background: "#fff", color: seeding ? "#9ca3af" : "#f97316", border: `1.5px solid ${seeding ? "#d1d5db" : "#f97316"}`, borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: seeding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem", opacity: seeding ? 0.6 : 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                {seeding ? "Seeding…" : "Seed Designs"}
              </button>
              )}
              {canSeedFromFirstBc && (
              <button
                type="button"
                onClick={() => void seedFromSource(BC_SEED_SOURCE_ID)}
                disabled={seeding}
                title="Copy the design set from Business cards 14pt (Profit Maximizer)"
                style={{ padding: "0.6rem 1.1rem", background: "#fff", color: seeding ? "#9ca3af" : "#7c3aed", border: `1.5px solid ${seeding ? "#d1d5db" : "#7c3aed"}`, borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: seeding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem", opacity: seeding ? 0.6 : 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                {seeding ? "Seeding…" : "Seed Design"}
              </button>
              )}
              {canSeedFromFirstFlyer && (
              <button
                type="button"
                onClick={() => void seedFromSource(FLYER_SEED_SOURCE_ID)}
                disabled={seeding}
                title="Copy the design set from Flyers 100lb Gloss Text"
                style={{ padding: "0.6rem 1.1rem", background: "#fff", color: seeding ? "#9ca3af" : "#7c3aed", border: `1.5px solid ${seeding ? "#d1d5db" : "#7c3aed"}`, borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: seeding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem", opacity: seeding ? 0.6 : 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                {seeding ? "Seeding…" : "Seed Design"}
              </button>
              )}
              <button type="button" onClick={openAddDesign}
                style={{ padding: "0.6rem 1.15rem", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
                + Add Design Template
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feedback */}
      {(msg || err) && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: err ? "#fef2f2" : "#f0fdf4", border: `1px solid ${err ? "#fca5a5" : "#86efac"}`, color: err ? "#b91c1c" : "#15803d", fontSize: "0.875rem", fontWeight: 600 }}>
          {err || msg}
        </div>
      )}

      {/* Design cards grid */}
      {!hasDesigns ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: "12px" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>No designs yet for this gallery.</p>
          <button onClick={openAddDesign}
            style={{ padding: "0.55rem 1.1rem", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            + Add Design Template
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isTShirt ? "260px" : (isBannerVinyl || isBannerOutdoor) ? "320px" : (isBannerRollupStd || isBannerRollupPrem) ? "290px" : "190px"}, 1fr))`, gap: "1.25rem" }}>
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              isBusinessCard={isBusinessCard}
              isLabel={isStickerLabel}
              isTShirt={isTShirt}
              imageAspect={customDimsInches ? `${customDimsInches.width}/${customDimsInches.height}` : isBusinessCard ? "16/9" : isLargePoster ? "2/3" : isSmallPoster ? "3/4" : isStickerLabel ? "1/1" : (isBannerVinyl || isBannerOutdoor) ? "9/4" : (isBannerRollupStd || isBannerRollupPrem) ? "1/1" : "4/3"}
              previewDims={
                customDimsInches   ? {
                  CW: Math.round(customDimsInches.width * 130),
                  CH: Math.round(customDimsInches.height * 130),
                  PX: Math.round(customDimsInches.width * 130 * 0.065),
                  PY: Math.round(customDimsInches.height * 130 * 0.065),
                } :
                isTShirt           ? SHIRT_PREVIEW_DIMS         :
                isYardSign         ? YARD_SIGN_PREVIEW_DIMS     :
                isLargePoster      ? POSTER_LARGE_PREVIEW_DIMS  :
                isSmallPoster      ? POSTER_SMALL_PREVIEW_DIMS  :
                isBannerVinyl      ? BANNER_VINYL_PREVIEW_DIMS  :
                isBannerOutdoor    ? BANNER_OUTDOOR_PREVIEW_DIMS :
                isBannerRollupStd || isBannerRollupPrem ? BANNER_ROLLUP_PREVIEW_DIMS :
                isPrimeFlyer       ? FLYER_PRIME_PREVIEW_DIMS   :
                isFlyer            ? FLYER_EXPRESS_PREVIEW_DIMS :
                                     BC_PREVIEW_DIMS
              }
              editorDims={
                (isBannerVinyl || isBannerOutdoor) ? { CW: 950, CH: 475, PX: 15, PY: 15 } :
                undefined
              }
              onPreview={() => setPreviewDesign(d)}
              onAddColor={() => router.push(`/admin/templates/${productSlug}/${galleryId}/${d.id}`)}
              onEdit={() => startEditDesign(d)}
              onDelete={() => void deleteDesign(d.id)}
              onEditFrontOverlay={d.frontOverlay ? () => openEditor(d, "front") : undefined}
              onEditBackOverlay={(d.backOverlay && d.backImage) ? () => openEditor(d, "back") : undefined}
              selectMode={selectMode}
              selected={selectedIds.has(d.id)}
              onToggleSelect={() => toggleSelected(d.id)}
              hasCustomDims={!!customDimsInches}
            />
          ))}
        </div>
      )}

    </div>

    {/* ── Add / Edit Design Template Modal ── */}
    {formOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget && !saving) clearDesignForm(); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(820px,100%)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#111827" }}>
              {editingDesignId ? "Edit design template" : "Add design template"}
            </h3>
            <button onClick={clearDesignForm} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Modal body */}
          <div style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {/* Design name */}
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
              Design name
              <input
                value={dName}
                onChange={(e) => setDName(e.target.value)}
                placeholder="e.g. Company Name + Logo"
                style={{ padding: "0.6rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827" }}
              />
            </label>

            {/* Color selection */}
            <div style={{ background: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1rem" }}>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                Color <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#6b7280" }}>(optional — tag this design with a color)</span>
              </p>
              {/* Preset swatches */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#6b7280", flexShrink: 0 }}>Quick pick:</span>
                {COLOR_PRESETS.map(({ hex, name }) => (
                  <button
                    key={hex}
                    type="button"
                    title={name}
                    onClick={() => { setDColorHex(hex); setDColorName((c) => c || name); }}
                    style={{
                      width: "26px", height: "26px", borderRadius: "50%", background: hex, padding: 0, cursor: "pointer", flexShrink: 0,
                      border: dColorHex === hex ? "3px solid #3b82f6" : "1.5px solid #d1d5db",
                      boxShadow: dColorHex === hex ? "0 0 0 1px #fff inset" : "none",
                    }}
                  />
                ))}
                {dColorHex && (
                  <button
                    type="button"
                    onClick={() => { setDColorHex(""); setDColorName(""); }}
                    style={{ fontSize: "0.72rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Custom picker + name */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="color"
                    value={dColorHex || "#ffffff"}
                    onChange={(e) => setDColorHex(e.target.value)}
                    style={{ width: "40px", height: "36px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "2px", background: "#fff", cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>{dColorHex || "—"}</span>
                </div>
                <input
                  type="text"
                  value={dColorName}
                  onChange={(e) => setDColorName(e.target.value)}
                  placeholder="Color name (e.g. Navy Blue)"
                  style={{ flex: 1, minWidth: "160px", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "0.825rem", color: "#111827" }}
                />
              </div>
            </div>

            {/* Front + Back columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

              {/* FRONT */}
              <div style={{ border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "1rem", background: "#f8faff" }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Front</p>

                {!isBusinessCard && !isFlyer && (
                  <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.6rem", border: "1px solid #e5e7eb" }}>
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Base Image <span style={{ color: "#dc2626" }}>*</span></p>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>The shirt / product mockup. Stays fixed.</p>
                    <input ref={frontFileRef} type="file" accept="image/*" onChange={(e) => void handleFrontImage(e)}
                      style={{ width: "100%", fontSize: "0.78rem", padding: "0.3rem", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#f9fafb", boxSizing: "border-box" }} />
                    {dFrontImageName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>{dFrontImageName}</p>}
                    {dFrontImage && <img src={dFrontImage} alt="" style={{ width: "100%", marginTop: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", maxHeight: "100px", objectFit: "cover" }} />}
                  </div>
                )}

                <div style={{ background: "#ecfeff", borderRadius: "8px", padding: "0.75rem", border: "1.5px dashed #06b6d4" }}>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#0891b2" }}>Design Overlay <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#6b7280" }}>(optional)</span></p>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", color: "#6b7280" }}>
                    {isBusinessCard || isFlyer
                      ? "Open the 2D editor to add text, logos and set background color."
                      : "Open the 2D editor to place text, logos and graphics on the front."}
                  </p>
                  <button
                    type="button"
                    disabled={!isBusinessCard && !isFlyer && !dFrontImage}
                    onClick={() => setAdminEditorOpen(true)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: (isBusinessCard || isFlyer || dFrontImage) ? "#06b6d4" : "#e5e7eb",
                      color: (isBusinessCard || isFlyer || dFrontImage) ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: "7px",
                      fontWeight: 700, fontSize: "0.8rem",
                      cursor: (isBusinessCard || isFlyer || dFrontImage) ? "pointer" : "not-allowed",
                    }}
                  >
                    {dFrontAdminItems.length > 0
                      ? `✎ Edit Design (${dFrontAdminItems.length} element${dFrontAdminItems.length !== 1 ? "s" : ""})`
                      : "Open 2D Editor"}
                  </button>
                  {!isBusinessCard && !isFlyer && !dFrontImage && <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#9ca3af" }}>Upload base image first</p>}
                  {dFrontAdminItems.length > 0 && (
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>
                      ✓ {dFrontAdminItems.length} element{dFrontAdminItems.length !== 1 ? "s" : ""} saved
                    </p>
                  )}
                </div>
              </div>

              {/* BACK */}
              <div style={{ border: "1.5px solid #ddd6fe", borderRadius: "10px", padding: "1rem", background: "#fdf8ff" }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Back <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "#9ca3af", textTransform: "none" }}>(optional)</span>
                </p>

                {!isBusinessCard && !isFlyer && (
                  <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.6rem", border: "1px solid #e5e7eb" }}>
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Base Image</p>
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>The shirt mockup back view.</p>
                    <input ref={backFileRef} type="file" accept="image/*" onChange={(e) => void handleBackImage(e)}
                      style={{ width: "100%", fontSize: "0.78rem", padding: "0.3rem", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#f9fafb", boxSizing: "border-box" }} />
                    {dBackImageName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>{dBackImageName}</p>}
                    {dBackImage && !isBusinessCard && <img src={dBackImage} alt="" style={{ width: "100%", marginTop: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", maxHeight: "100px", objectFit: "cover" }} />}
                  </div>
                )}

                <div style={{ background: "#faf5ff", borderRadius: "8px", padding: "0.75rem", border: "1.5px dashed #a78bfa" }}>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed" }}>Design Overlay <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#6b7280" }}>(optional)</span></p>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", color: "#6b7280" }}>
                    {isBusinessCard || isFlyer
                      ? "Back side — set background and add elements in the 2D editor."
                      : "Open the 2D editor to place text, logos and graphics on the back."}
                  </p>
                  <button
                    type="button"
                    disabled={!isBusinessCard && !isFlyer && !dBackImage}
                    onClick={() => setAdminEditorOpen(true)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: (isBusinessCard || isFlyer || dBackImage) ? "#7c3aed" : "#e5e7eb",
                      color: (isBusinessCard || isFlyer || dBackImage) ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: "7px",
                      fontWeight: 700, fontSize: "0.8rem",
                      cursor: (isBusinessCard || isFlyer || dBackImage) ? "pointer" : "not-allowed",
                    }}
                  >
                    {dBackAdminItems.length > 0
                      ? `✎ Edit Design (${dBackAdminItems.length} element${dBackAdminItems.length !== 1 ? "s" : ""})`
                      : "Open 2D Editor"}
                  </button>
                  {!isBusinessCard && !isFlyer && !dBackImage && <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#9ca3af" }}>Upload back image first</p>}
                  {dBackAdminItems.length > 0 && (
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>
                      ✓ {dBackAdminItems.length} element{dBackAdminItems.length !== 1 ? "s" : ""} saved
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
              <button onClick={() => void saveDesign()} disabled={saving}
                style={{ padding: "0.65rem 1.4rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editingDesignId ? "Update Design" : "+ Add Design"}
              </button>
              <button onClick={clearDesignForm}
                style={{ padding: "0.65rem 1.1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Overlay editor modal */}
    {editorOpen && editorBase && editorOverlay && (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget && !editorSaving) setEditorOpen(false); }}>
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(520px,100%)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Edit {editorSide === "front" ? "Front" : "Back"} Overlay</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>{editorDesign?.name}</p>
            </div>
            <button onClick={() => setEditorOpen(false)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p style={{ margin: 0, fontSize: "0.775rem", color: "#6b7280", background: "#f9fafb", padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #f3f4f6", lineHeight: 1.5 }}>
              <strong>Drag</strong> overlay to reposition · <strong>Scroll / pinch</strong> to zoom
            </p>
            <div ref={editorRef} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "2px solid #e5e7eb", userSelect: "none", touchAction: "none", cursor: editorDragging ? "grabbing" : "default" }}>
              <img src={editorBase} alt="base" style={{ width: "100%", display: "block", pointerEvents: "none" }} draggable={false} />
              <div
                style={{ position: "absolute", inset: 0, transform: `translate(${editorX}px,${editorY}px) scale(${editorScale})`, transformOrigin: "center", cursor: editorDragging ? "grabbing" : "grab" }}
                onMouseDown={(e) => { e.preventDefault(); dragOriginRef.current = { clientX: e.clientX, clientY: e.clientY, ox: editorX, oy: editorY }; setEditorDragging(true); }}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) { touchOriginRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: editorX, oy: editorY }; pinchRef.current = null; }
                  else if (e.touches.length === 2) { pinchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 1 && pinchRef.current === null) { const { x, y, ox, oy } = touchOriginRef.current; setEditorX(ox + e.touches[0].clientX - x); setEditorY(oy + e.touches[0].clientY - y); }
                  else if (e.touches.length === 2 && pinchRef.current !== null) { const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); setEditorScale((s) => parseFloat(Math.max(0.1, Math.min(5, s * dist / pinchRef.current!)).toFixed(3))); pinchRef.current = dist; }
                }}
                onTouchEnd={() => { pinchRef.current = null; }}
              >
                <img src={editorOverlay} alt="overlay" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }} draggable={false} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", minWidth: 72 }}>Scale: {Math.round(editorScale * 100)}%</span>
              <input type="range" min={10} max={300} step={1} value={Math.round(editorScale * 100)} onChange={(e) => setEditorScale(Number(e.target.value) / 100)} style={{ flex: 1, cursor: "pointer" }} />
              <button onClick={() => setEditorScale((s) => parseFloat(Math.max(0.1, s - 0.05).toFixed(3)))} style={{ width: 28, height: 28, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem" }}>−</button>
              <button onClick={() => setEditorScale((s) => parseFloat(Math.min(5, s + 0.05).toFixed(3)))} style={{ width: 28, height: 28, border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem" }}>+</button>
            </div>
            <button onClick={() => { setEditorX(0); setEditorY(0); setEditorScale(1); }} style={{ alignSelf: "flex-start", padding: "0.28rem 0.7rem", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.775rem", fontWeight: 600, color: "#374151" }}>Reset</button>
            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", paddingTop: "0.6rem", borderTop: "1px solid #f3f4f6" }}>
              <button onClick={() => setEditorOpen(false)} disabled={editorSaving} style={{ padding: "0.55rem 1.1rem", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#374151", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => void saveEditorAdjustments()} disabled={editorSaving} style={{ padding: "0.55rem 1.25rem", border: "none", borderRadius: 8, background: "#06b6d4", color: "#fff", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", opacity: editorSaving ? 0.7 : 1 }}>{editorSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Admin 2D editor — full-screen overlay */}
    {adminEditorOpen && (
      <DesignEditorShell
        adminMode
        adminFrontImage={dFrontImage || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : undefined)}
        adminBackImage={dBackImage || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : undefined)}
        initialFrontItems={dFrontAdminItems}
        initialBackItems={dBackAdminItems}
        {...(!isTShirt ? {
          // Any category without its own dedicated product type (e.g. a new ad-hoc
          // sub-product like "Roll Label") falls back to the generic flat-art background
          // color picker rather than the apparel color list, which would have nothing to show.
          productType: isBusinessCard ? "business-card" as const
            : isStickerLabel ? "sticker-label" as const
            : isFlyer ? flyerProductType
            : "business-card" as const,
          initialFrontBgColor: dFrontBgColor,
          initialBackBgColor: dBackBgColor,
          materialColors: templateMaterialColors,
        } : {})}
        customDimsInches={customDimsInches ?? undefined}
        onClose={() => setAdminEditorOpen(false)}
        onSaveAdmin={(frontItems, backItems, frontPNG, backPNG, frontBg, backBg, frontBgSvg, backBgSvg) => {
          // Update local state first, then immediately persist to DB so
          // bulk-imported designs (and any BC design) are saved in one step.
          const nextFrontItems = frontItems;
          const nextBackItems  = backItems;
          const nextFrontOverlay = frontPNG || dFrontOverlay;
          const nextBackOverlay  = backPNG  || dBackOverlay;
          const nextFrontBg = frontBg ?? dFrontBgColor;
          const nextBackBg  = backBg  ?? dBackBgColor;
          // bgSvg data URLs represent the updated SVG template (with patched shape colors).
          // For labels the circle/oval is an extracted graphicItem (not in bgSvg), so always
          // preserve the original full label SVG as frontImage.
          const nextFrontImg = isStickerLabel
            ? (dFrontImage || "")
            : (frontBgSvg || dFrontImage || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : ""));
          const nextBackImg  = isStickerLabel
            ? (dBackImage || "")
            : (backBgSvg  || dBackImage  || (isBusinessCard ? bcCardOutline : isFlyer ? flyerOutline : ""));

          setDFrontAdminItems(nextFrontItems);
          setDBackAdminItems(nextBackItems);
          if (frontPNG) setDFrontOverlay(nextFrontOverlay);
          if (backPNG)  setDBackOverlay(nextBackOverlay);
          if (frontBg !== undefined) setDFrontBgColor(nextFrontBg);
          if (backBg  !== undefined) setDBackBgColor(nextBackBg);
          if (frontBgSvg) setDFrontImage(nextFrontImg);
          if (backBgSvg)  setDBackImage(nextBackImg);
          setAdminEditorOpen(false);

          // For new designs on any category that goes through the 2D editor (everything
          // except T-Shirts, which use the field form instead), auto-save directly.
          if (!editingDesignId && !isTShirt) {
            const autoName = `Design ${(gallery?.designs?.length ?? 0) + 1}`;
            const newPayload = {
              name: autoName,
              frontImage: nextFrontImg,
              ...(nextBackImg ? { backImage: nextBackImg } : {}),
              ...(nextFrontOverlay ? { frontOverlay: nextFrontOverlay } : {}),
              ...(nextBackOverlay  ? { backOverlay:  nextBackOverlay  } : {}),
              ...(nextFrontItems.length ? { frontAdminItems: nextFrontItems } : {}),
              ...(nextBackItems.length  ? { backAdminItems:  nextBackItems  } : {}),
              frontBgColor: nextFrontBg,
              backBgColor: nextBackBg,
            };
            void (async () => {
              try {
                const effectiveId = await ensureRealGalleryId();
                const res = await fetch(`/api/products/${productSlug}/templates/${effectiveId}/designs`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newPayload),
                });
                if (!res.ok) throw new Error("Save failed.");
                if (effectiveId !== galleryId) {
                  // Virtual bc-/fly- id resolved to a freshly created real template —
                  // navigate there so the new design (and future ones) show up.
                  router.replace(`/admin/templates/${productSlug}/${effectiveId}`);
                } else {
                  await loadData();
                }
              } catch {
                flash("Save failed.", true);
              }
            })();
            return;
          }

          // Auto-save so admin doesn't have to click "Save" in the form
          if (!editingDesignId) return;
          const payload = {
            name: dName,
            frontImage: nextFrontImg,
            ...(nextBackImg ? { backImage: nextBackImg } : {}),
            ...(nextFrontOverlay ? { frontOverlay: nextFrontOverlay } : {}),
            ...(nextBackOverlay  ? { backOverlay:  nextBackOverlay  } : {}),
            ...(nextFrontItems.length ? { frontAdminItems: nextFrontItems } : {}),
            ...(nextBackItems.length  ? { backAdminItems:  nextBackItems  } : {}),
            ...(!isTShirt ? { frontBgColor: nextFrontBg, backBgColor: nextBackBg } : {}),
          };
          fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${editingDesignId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({})) as { error?: string };
                flash(`Auto-save failed: ${errData.error ?? res.status}`, true);
              } else {
                loadData();
              }
            })
            .catch((err: unknown) => flash(`Auto-save failed: ${err instanceof Error ? err.message : "network error"}`, true));
        }}
      />
    )}

    {/* Design preview modal */}
    {previewDesign && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget) setPreviewDesign(null); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(700px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>{previewDesign.name}</h3>
              {previewDesign.colorName && <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>{previewDesign.colorName}</p>}
            </div>
            <button onClick={() => setPreviewDesign(null)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: (!isLargePoster && previewDesign.backImage) ? "1fr 1fr" : "1fr", gap: "1rem" }}>
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Front</p>
              <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: "transparent" }}>
                {/* frontOverlay = complete preview PNG saved by the admin editor — use it directly.
                    Fall back to canvas-built previewFrontSrc, then bare frontImage. */}
                <img
                  src={previewFrontSrc ?? previewDesign.frontOverlay ?? previewDesign.frontImage}
                  alt="Front"
                  style={{ width: "100%", display: "block" }}
                />
              </div>
            </div>
            {!isLargePoster && previewDesign.backImage && (
              <div>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>Back</p>
                <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: "transparent" }}>
                  <img
                    src={previewBackSrc ?? previewDesign.backOverlay ?? previewDesign.backImage}
                    alt="Back"
                    style={{ width: "100%", display: "block" }}
                  />
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "0 1.25rem 1.25rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={() => { setPreviewDesign(null); startEditDesign(previewDesign); }}
              style={{ padding: "0.5rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "0.825rem", cursor: "pointer" }}>
              Edit Design
            </button>
            <button onClick={() => setPreviewDesign(null)}
              style={{ padding: "0.5rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "7px", fontWeight: 600, fontSize: "0.825rem", cursor: "pointer", color: "#374151" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Bulk delete confirm */}
    {confirmBulkDelete && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={() => !bulkDeleting && setConfirmBulkDelete(false)}
      >
        <div style={{ background: "#fff", borderRadius: 18, width: "min(340px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ height: 5, background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)" }} />
          <div style={{ padding: "22px 22px 18px", textAlign: "center" }}>
            <p style={{ margin: "0 0 20px", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
              Do you want to delete {selectedIds.size} design{selectedIds.size !== 1 ? "s" : ""}?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => void bulkDeleteSelected()}
                disabled={bulkDeleting}
                style={{ flex: 1, padding: "0.6rem 1rem", background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.875rem", cursor: bulkDeleting ? "not-allowed" : "pointer", opacity: bulkDeleting ? 0.7 : 1 }}
              >
                {bulkDeleting ? "Deleting…" : "Yes"}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                style={{ flex: 1, padding: "0.6rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Design Card ────────────────────────────────────────────────────────────

const LABEL_ITEM_DIMS: PreviewDims = { CW: 260, CH: 260, PX: 0, PY: 0 };

function DesignCard({
  design,
  isBusinessCard,
  isLabel = false,
  isTShirt = false,
  imageAspect = "4/3",
  previewDims = BC_PREVIEW_DIMS,
  editorDims,
  onPreview,
  onAddColor,
  onEdit,
  onDelete,
  onEditFrontOverlay,
  onEditBackOverlay,
  selectMode = false,
  selected = false,
  onToggleSelect,
  hasCustomDims = false,
}: {
  design: DesignTemplateItem;
  isBusinessCard: boolean;
  isLabel?: boolean;
  isTShirt?: boolean;
  imageAspect?: string;
  previewDims?: PreviewDims;
  editorDims?: PreviewDims;
  onPreview: () => void;
  onAddColor: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditFrontOverlay?: () => void;
  onEditBackOverlay?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  hasCustomDims?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Detect actual SVG viewBox so rect/oval labels aren't shown with a circular frame
  const labelSvgDims = useMemo(() => {
    if (!isLabel || !design.frontImage) return null;
    try {
      const src = design.frontImage;
      if (!src.startsWith("data:image/svg+xml")) return null;
      const enc = src.split(",").slice(1).join(",");
      const raw = src.includes(";base64,") ? atob(enc) : decodeURIComponent(enc);
      const m = raw.match(/viewBox=["'][\d.]+ [\d.]+ ([\d.]+) ([\d.]+)["']/);
      if (!m) return null;
      return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
    } catch { return null; }
  }, [isLabel, design.frontImage]);
  const labelIsCircle = !labelSvgDims || Math.abs(labelSvgDims.w / labelSvgDims.h - 1) < 0.05;
  const labelAspect   = labelSvgDims ? `${labelSvgDims.w}/${labelSvgDims.h}` : "1/1";

  // Compute preview canvas dims matching the actual label SVG aspect ratio
  const labelPreviewDims = useMemo(() => {
    if (!isLabel || !labelSvgDims) return LABEL_ITEM_DIMS;
    const scale = 260 / Math.max(labelSvgDims.w, labelSvgDims.h);
    return { CW: Math.round(labelSvgDims.w * scale), CH: Math.round(labelSvgDims.h * scale), PX: 0, PY: 0 };
  }, [isLabel, labelSvgDims]);

  useEffect(() => {
    // Labels with no admin items yet are pure SVG templates — the static
    // <img src={design.frontImage}> fallback shows the full design correctly.
    if (isLabel && !(design.frontAdminItems?.length)) return;
    let cancelled = false;
    // Always pass frontImage as base so path-based backgrounds (e.g. colorful arc ring)
    // are included in the preview even after admin items are saved on top.
    // When admin items exist and editorDims provided, render at editor scale so item
    // coordinates (stored at editor canvas scale) map correctly onto the preview.
    const hasItems = (design.frontAdminItems?.length ?? 0) > 0;
    const itemDims = isLabel ? labelPreviewDims
      : (hasItems && editorDims) ? editorDims
      : previewDims;
    void buildDesignPreview(
      design.frontAdminItems ?? [],
      design.frontBgColor ?? "#ffffff",
      design.frontImage,
      itemDims,
    ).then((src) => { if (!cancelled) setPreviewSrc(src); }).catch(() => {});
    return () => { cancelled = true; };
  }, [design.frontAdminItems, design.frontBgColor, design.frontImage, previewDims, editorDims, isLabel, labelPreviewDims]);

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${selected ? "#7c3aed" : hovered ? "#7c3aed" : "#e5e7eb"}`, borderRadius: "12px", overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: selected || hovered ? "0 4px 18px rgba(124,58,237,0.13)" : "0 1px 4px rgba(0,0,0,0.07)", position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {selectMode && (
        <label
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: 10, left: 10, zIndex: 3, width: 24, height: 24, borderRadius: 6, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#7c3aed" }}
          />
        </label>
      )}
      {/* Preview / Color Variants click */}
      <div style={{ padding: "8px 8px 0", cursor: "pointer" }} onClick={selectMode ? onToggleSelect : (isTShirt ? onAddColor : onPreview)}>
        <div style={{ position: "relative", background: previewSrc || design.frontOverlay ? "transparent" : (design.frontBgColor ?? "#ffffff"), borderRadius: isLabel ? (labelIsCircle ? "50%" : "8px") : "6px", overflow: "hidden", aspectRatio: isLabel ? (labelIsCircle ? "1/1" : labelAspect) : `${previewDims.CW}/${previewDims.CH}`, boxShadow: "0 2px 8px rgba(0,0,0,0.14)" }}>
          {/* Crop the outer background band (~16px on all sides in canvas coords) from BC
              thumbnails. clip-path inset percentages are relative to the element's own
              dimensions, so 5.93% top/bottom (=16/270) and 3.48% left/right (=16/460)
              removes exactly 16 canvas pixels from every edge, regardless of display size. */}
          <div style={{ width: "100%", height: "100%", clipPath: (!isLabel && isBusinessCard && !hasCustomDims) ? "inset(5.93% 3.48%)" : undefined }}>
            {previewSrc ? (
              <img src={previewSrc} alt={design.name} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
            ) : (
              <>
                <img
                  src={design.frontImage}
                  alt={design.name}
                  style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
                />
                {design.frontOverlay && (
                  <img src={design.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }} />
                )}
              </>
            )}
          </div>
          {hovered && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "#fff", color: "#111827", padding: "0.3rem 0.85rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.72rem", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
                {isTShirt ? "Color Variants →" : "Preview →"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "8px 8px 8px" }}>
        <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "0.82rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{design.name}</p>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button onClick={onEdit}
            style={{ flex: 1, padding: "0.35rem 0", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#f9fafb", color: "#374151", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button onClick={onDelete}
            style={{ flex: 1, padding: "0.35rem 0", border: "1px solid #fecaca", borderRadius: "6px", background: "#fff5f5", color: "#dc2626", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
