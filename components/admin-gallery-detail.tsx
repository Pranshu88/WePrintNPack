"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GalleryTemplate, DesignTemplateItem, SerializableItem } from "@/lib/template-data";
import type { ColorVariant, Product } from "@/lib/types";
import DesignEditorShell from "./design-editor-shell";

const BC_CARD_OUTLINE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">' +
    '<rect width="460" height="270" rx="10" fill="none" stroke="#d1d5db" stroke-width="1.5"/>' +
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


type Props = { productSlug: string; galleryId: string };

export default function AdminGalleryDetail({ productSlug, galleryId }: Props) {
  const router = useRouter();
  const [gallery, setGallery] = useState<GalleryTemplate | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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

  /* seed designs */
  const [seeding, setSeeding] = useState(false);

  /* bulk import */
  const [bulkOpen, setBulkOpen]       = useState(false);
  const [bulkItems, setBulkItems]     = useState<{ file: File; dataUrl: string; name: string }[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement>(null);

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
    try {
      const [tplRes, prodRes] = await Promise.all([
        fetch(`/api/products/${productSlug}/templates/${galleryId}`, { cache: "no-store" }),
        fetch(`/api/products/${productSlug}`, { cache: "no-store" }),
      ]);
      const tplData = (await tplRes.json()) as { template?: GalleryTemplate };
      const prodData = (await prodRes.json()) as { product?: Product };
      setGallery(tplData.template ?? null);
      const prod = prodData.product ?? null;
      setProduct(prod);
      setColorVariants((prod?.colorVariants ?? []).map((v) => ({
        ...v, frontImageName: v.frontImage ? "Uploaded" : "", backImageName: v.backImage ? "Uploaded" : "",
      })));
    } catch { setErr("Failed to load."); } finally { setLoading(false); }
  }

  function flash(message: string, isError = false) {
    isError ? setErr(message) : setMsg(message);
    setTimeout(() => isError ? setErr("") : setMsg(""), 3000);
  }

  async function seedDesigns() {
    setSeeding(true);
    try {
      const res = await fetch(
        `/api/products/${productSlug}/templates/${galleryId}/seed-designs`,
        { method: "POST" }
      );
      const data = (await res.json()) as { added?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Seed failed.");
      flash(data.added === 0 ? "All seed designs already present." : `${data.added} design${data.added !== 1 ? "s" : ""} added.`);
      await loadData();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Seed failed.", true);
    } finally {
      setSeeding(false);
    }
  }

  async function handleBulkFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const loaded = await Promise.all(
      files.map(async (file) => ({
        file,
        dataUrl: await readFile(file),
        name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      }))
    );
    setBulkItems((prev) => [...prev, ...loaded]);
    e.target.value = "";
  }

  function updateBulkName(idx: number, name: string) {
    setBulkItems((prev) => prev.map((it, i) => (i === idx ? { ...it, name } : it)));
  }

  function removeBulkItem(idx: number) {
    setBulkItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitBulkImport() {
    if (!bulkItems.length) return;
    setBulkUploading(true);
    try {
      const res = await fetch(
        `/api/products/${productSlug}/templates/${galleryId}/bulk-import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            designs: bulkItems.map((it) => ({ name: it.name, frontImage: it.dataUrl })),
          }),
        }
      );
      const data = (await res.json()) as { added?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bulk import failed.");
      flash(`${data.added} design${(data.added ?? 0) !== 1 ? "s" : ""} imported${data.failed ? `, ${data.failed} failed` : ""}.`);
      setBulkItems([]);
      setBulkOpen(false);
      await loadData();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Bulk import failed.", true);
    } finally {
      setBulkUploading(false);
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
      setDFrontImage(BC_CARD_OUTLINE); setDFrontImageName("Business Card (Front)");
      setDBackImage(BC_CARD_OUTLINE);  setDBackImageName("Business Card (Back)");
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
    // For BC, go straight to the 2D editor; for apparel open the field form.
    if (isBusinessCard) setAdminEditorOpen(true);
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
    if (!dName.trim() || (!isBusinessCard && !dFrontImage)) { flash("Design name and front base image are required.", true); return; }
    setSaving(true);
    // For BC, keep the actual uploaded image when present (bulk-imported designs);
    // fall back to BC_CARD_OUTLINE only when no real image was set.
    const frontImg = dFrontImage || (isBusinessCard ? BC_CARD_OUTLINE : "");
    const backImg  = dBackImage  || (isBusinessCard ? BC_CARD_OUTLINE : "");
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
      ...(isBusinessCard ? { frontBgColor: dFrontBgColor, backBgColor: dBackBgColor } : {}),
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
  const designs = gallery?.designs ?? [];
  const hasDesigns = designs.length > 0;

  const editorBase = editorDesign ? (editorSide === "front" ? editorDesign.frontImage : editorDesign.backImage) : undefined;
  const editorOverlay = editorDesign ? (editorSide === "front" ? editorDesign.frontOverlay : editorDesign.backOverlay) : undefined;

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/templates" style={{ fontSize: "0.8rem", color: "#06b6d4", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
            ← Back to Templates
          </Link>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>{gallery?.name ?? "Gallery"}</h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#6b7280" }}>Design templates for this gallery</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => void seedDesigns()}
            disabled={seeding}
            title="Auto-generate 8 visually distinct design templates"
            style={{ padding: "0.6rem 1.1rem", background: seeding ? "#e5e7eb" : "#f0fdf4", color: seeding ? "#9ca3af" : "#15803d", border: "1.5px solid #86efac", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: seeding ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {seeding ? "Seeding…" : "Seed Designs"}
          </button>
          <button
            type="button"
            onClick={() => { setBulkItems([]); setBulkOpen(true); }}
            style={{ padding: "0.6rem 1.1rem", background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Bulk Import
          </button>
          <button type="button" onClick={openAddDesign}
            style={{ padding: "0.6rem 1.15rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            + Add Design Template
          </button>
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
            style={{ padding: "0.55rem 1.1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            + Add Design Template
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              isBusinessCard={isBusinessCard}
              onPreview={() => setPreviewDesign(d)}
              onAddColor={() => router.push(`/admin/templates/${productSlug}/${galleryId}/${d.id}`)}
              onEdit={() => startEditDesign(d)}
              onDelete={() => void deleteDesign(d.id)}
              onEditFrontOverlay={d.frontOverlay ? () => openEditor(d, "front") : undefined}
              onEditBackOverlay={(d.backOverlay && d.backImage) ? () => openEditor(d, "back") : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Color Variants ── */}
      <div style={{ background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Color Variants</h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              {hasDesigns
                ? "Upload front/back images per color. The original text overlay stays intact."
                : "Add at least one design above to unlock color variants."}
            </p>
          </div>
          {hasDesigns && (
            <button type="button" onClick={() => { clearColorForm(); setColorFormOpen(true); }}
              style={{ padding: "0.5rem 1rem", background: colorFormOpen ? "#ecfeff" : "#fff", color: colorFormOpen ? "#0891b2" : "#374151", border: "1px solid #d1d5db", borderRadius: "7px", fontWeight: 700, fontSize: "0.825rem", cursor: "pointer", flexShrink: 0 }}>
              + Add Color
            </button>
          )}
        </div>

        {colorFormOpen && hasDesigns && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "end", marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
                Color name
                <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Royal Blue"
                  style={{ padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "0.825rem" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>
                Color
                <input type="color" value={cHex} onChange={(e) => setCHex(e.target.value)}
                  style={{ width: "64px", height: "40px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "2px", background: "#fff", cursor: "pointer" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "0.9rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Quick pick:</span>
              {COLOR_PRESETS.map(({ hex, name }) => (
                <button key={hex} type="button" title={name} onClick={() => { setCHex(hex); setCName((c) => c || name); }}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: hex, border: `1.5px solid ${cHex === hex ? "#3b82f6" : "#d1d5db"}`, cursor: "pointer", padding: 0 }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ border: "1.5px solid #d1d5db", borderRadius: "8px", padding: "0.65rem", background: "#f9fafb" }}>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 700, color: "#374151" }}>Front image <span style={{ color: "#dc2626" }}>*</span></p>
                <input type="file" accept="image/*" onChange={(e) => void handleColorFront(e)}
                  style={{ width: "100%", fontSize: "0.75rem", padding: "0.3rem", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fff", boxSizing: "border-box" }} />
                {cFrontName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>{cFrontName}</p>}
                {cFront && <img src={cFront} alt="" style={{ width: "100%", maxHeight: "90px", objectFit: "cover", borderRadius: "6px", marginTop: "0.5rem", border: "1px solid #e5e7eb" }} />}
              </div>
              <div style={{ border: "1.5px dashed #06b6d4", borderRadius: "8px", padding: "0.65rem", background: "#ecfeff" }}>
                <p style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 700, color: "#0891b2" }}>Back image <span style={{ fontSize: "0.68rem", fontWeight: 500, color: "#6b7280" }}>(optional)</span></p>
                <input type="file" accept="image/*" onChange={(e) => void handleColorBack(e)}
                  style={{ width: "100%", fontSize: "0.75rem", padding: "0.3rem", border: "1px solid #a5f3fc", borderRadius: "6px", background: "#fff", boxSizing: "border-box" }} />
                {cBackName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.7rem", color: "#0891b2", fontWeight: 600 }}>{cBackName}</p>}
                {cBack && <img src={cBack} alt="" style={{ width: "100%", maxHeight: "90px", objectFit: "cover", borderRadius: "6px", marginTop: "0.5rem", border: "1px solid #e5e7eb" }} />}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => void saveColorVariant()} disabled={saving}
                style={{ padding: "0.5rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "0.8rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editingColorIdx === null ? "Add Color" : "Update Color"}
              </button>
              <button type="button" onClick={() => { clearColorForm(); setColorFormOpen(false); }}
                style={{ padding: "0.5rem 0.85rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "7px", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", color: "#374151" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {colorVariants.length === 0 ? (
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.875rem" }}>No color variants added yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {colorVariants.map((v, i) => (
              <div key={`${v.hex}-${i}`} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "0.75rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <span style={{ width: "30px", height: "30px", borderRadius: "50%", background: v.hex, border: "1px solid #d1d5db", flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name || "Untitled"}</p>
                    <p style={{ margin: 0, fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7280" }}>{v.hex}</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", padding: "0.75rem" }}>
                  <div>
                    <p style={{ margin: "0 0 0.3rem", fontSize: "0.7rem", fontWeight: 700, color: "#374151" }}>Front</p>
                    <img src={v.frontImage} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
                  </div>
                  <div>
                    <p style={{ margin: "0 0 0.3rem", fontSize: "0.7rem", fontWeight: 700, color: "#374151" }}>Back</p>
                    {v.backImage ? (
                      <img src={v.backImage} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
                    ) : (
                      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "6px", border: "1px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.7rem", background: "#fafafa" }}>None</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", padding: "0 0.75rem 0.75rem" }}>
                  <button type="button" onClick={() => startEditColor(v, i)}
                    style={{ flex: 1, padding: "0.38rem 0", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", color: "#374151", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  <button type="button" onClick={() => void deleteColorVariant(i)}
                    style={{ flex: 1, padding: "0.38rem 0", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

                {!isBusinessCard && (
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
                    {isBusinessCard
                      ? "Open the 2D editor to add text, logos and set background color."
                      : "Open the 2D editor to place text, logos and graphics on the front."}
                  </p>
                  <button
                    type="button"
                    disabled={!isBusinessCard && !dFrontImage}
                    onClick={() => setAdminEditorOpen(true)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: (isBusinessCard || dFrontImage) ? "#06b6d4" : "#e5e7eb",
                      color: (isBusinessCard || dFrontImage) ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: "7px",
                      fontWeight: 700, fontSize: "0.8rem",
                      cursor: (isBusinessCard || dFrontImage) ? "pointer" : "not-allowed",
                    }}
                  >
                    {dFrontAdminItems.length > 0
                      ? `✎ Edit Design (${dFrontAdminItems.length} element${dFrontAdminItems.length !== 1 ? "s" : ""})`
                      : "Open 2D Editor"}
                  </button>
                  {!isBusinessCard && !dFrontImage && <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#9ca3af" }}>Upload base image first</p>}
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

                {!isBusinessCard && (
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
                    {isBusinessCard
                      ? "Back side of the card — set background and add elements in the 2D editor."
                      : "Open the 2D editor to place text, logos and graphics on the back."}
                  </p>
                  <button
                    type="button"
                    disabled={!isBusinessCard && !dBackImage}
                    onClick={() => setAdminEditorOpen(true)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      background: (isBusinessCard || dBackImage) ? "#7c3aed" : "#e5e7eb",
                      color: (isBusinessCard || dBackImage) ? "#fff" : "#9ca3af",
                      border: "none", borderRadius: "7px",
                      fontWeight: 700, fontSize: "0.8rem",
                      cursor: (isBusinessCard || dBackImage) ? "pointer" : "not-allowed",
                    }}
                  >
                    {dBackAdminItems.length > 0
                      ? `✎ Edit Design (${dBackAdminItems.length} element${dBackAdminItems.length !== 1 ? "s" : ""})`
                      : "Open 2D Editor"}
                  </button>
                  {!isBusinessCard && !dBackImage && <p style={{ margin: "0.35rem 0 0", fontSize: "0.7rem", color: "#9ca3af" }}>Upload back image first</p>}
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
        adminFrontImage={dFrontImage || (isBusinessCard ? BC_CARD_OUTLINE : undefined)}
        adminBackImage={dBackImage || (isBusinessCard ? BC_CARD_OUTLINE : undefined)}
        initialFrontItems={dFrontAdminItems}
        initialBackItems={dBackAdminItems}
        {...(isBusinessCard ? {
          productType: "business-card" as const,
          initialFrontBgColor: dFrontBgColor,
          initialBackBgColor: dBackBgColor,
        } : {})}
        onClose={() => setAdminEditorOpen(false)}
        onSaveAdmin={(frontItems, backItems, frontPNG, backPNG, frontBg, backBg) => {
          // Update local state first, then immediately persist to DB so
          // bulk-imported designs (and any BC design) are saved in one step.
          const nextFrontItems = frontItems;
          const nextBackItems  = backItems;
          const nextFrontOverlay = frontPNG || dFrontOverlay;
          const nextBackOverlay  = backPNG  || dBackOverlay;
          const nextFrontBg = frontBg ?? dFrontBgColor;
          const nextBackBg  = backBg  ?? dBackBgColor;

          setDFrontAdminItems(nextFrontItems);
          setDBackAdminItems(nextBackItems);
          if (frontPNG) setDFrontOverlay(nextFrontOverlay);
          if (backPNG)  setDBackOverlay(nextBackOverlay);
          if (frontBg !== undefined) setDFrontBgColor(nextFrontBg);
          if (backBg  !== undefined) setDBackBgColor(nextBackBg);
          setAdminEditorOpen(false);

          // Auto-save so admin doesn't have to click "Save" in the form
          if (!editingDesignId) return;
          const frontImg = dFrontImage || (isBusinessCard ? BC_CARD_OUTLINE : "");
          const backImg  = dBackImage  || (isBusinessCard ? BC_CARD_OUTLINE : "");
          const payload = {
            name: dName,
            frontImage: frontImg,
            ...(backImg ? { backImage: backImg } : {}),
            ...(nextFrontOverlay ? { frontOverlay: nextFrontOverlay } : {}),
            ...(nextBackOverlay  ? { backOverlay:  nextBackOverlay  } : {}),
            ...(nextFrontItems.length ? { frontAdminItems: nextFrontItems } : {}),
            ...(nextBackItems.length  ? { backAdminItems:  nextBackItems  } : {}),
            ...(isBusinessCard ? { frontBgColor: nextFrontBg, backBgColor: nextBackBg } : {}),
          };
          fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${editingDesignId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(() => loadData())
            .catch(() => flash("Auto-save failed — click Save in the form.", true));
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
          <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: previewDesign.backImage ? "1fr 1fr" : "1fr", gap: "1rem" }}>
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Front</p>
              <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: previewDesign.frontBgColor ?? "#fff", position: "relative" }}>
                <img src={previewDesign.frontImage} alt="Front" style={{ width: "100%", display: "block" }} />
                {previewDesign.frontOverlay && (
                  <img src={previewDesign.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                )}
              </div>
            </div>
            {previewDesign.backImage && (
              <div>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>Back</p>
                <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", background: previewDesign.backBgColor ?? "#fff", position: "relative" }}>
                  <img src={previewDesign.backImage} alt="Back" style={{ width: "100%", display: "block" }} />
                  {previewDesign.backOverlay && (
                    <img src={previewDesign.backOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                  )}
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

    {/* ── Bulk Import Modal ─────────────────────────────────────────────── */}
    {bulkOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget && !bulkUploading) setBulkOpen(false); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(900px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>Bulk Import Designs</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>Upload multiple PNG / JPG / SVG images at once</p>
            </div>
            <button onClick={() => { if (!bulkUploading) setBulkOpen(false); }} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Drop zone / file picker */}
          <div style={{ padding: "1rem 1.4rem 0", flexShrink: 0 }}>
            <div
              style={{ border: "2px dashed #fdba74", borderRadius: "10px", padding: "1.5rem", textAlign: "center", background: "#fff7ed", cursor: "pointer" }}
              onClick={() => bulkFileRef.current?.click()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" style={{ margin: "0 auto 0.5rem", display: "block" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#c2410c" }}>Click to select images</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>PNG, JPG, SVG — you can select multiple files at once</p>
            </div>
            <input
              ref={bulkFileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={(e) => void handleBulkFileChange(e)}
            />
          </div>

          {/* Preview grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.4rem" }}>
            {bulkItems.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", margin: "1rem 0" }}>No images selected yet.</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>{bulkItems.length} image{bulkItems.length !== 1 ? "s" : ""} ready to import</span>
                  <button onClick={() => setBulkItems([])} style={{ fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear all</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
                  {bulkItems.map((item, idx) => (
                    <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "#f9fafb", position: "relative" }}>
                      <button
                        onClick={() => removeBulkItem(idx)}
                        style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, zIndex: 1 }}
                      >✕</button>
                      <div style={{ background: "#fff", height: 100, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <img src={item.dataUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      </div>
                      <div style={{ padding: "0.4rem 0.5rem" }}>
                        <input
                          value={item.name}
                          onChange={(e) => updateBulkName(idx, e.target.value)}
                          style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "5px", padding: "4px 6px", fontSize: "0.75rem", fontWeight: 600, color: "#111827", boxSizing: "border-box" }}
                          placeholder="Design name"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ padding: "1rem 1.4rem", borderTop: "1px solid #f3f4f6", display: "flex", gap: "0.75rem", justifyContent: "flex-end", flexShrink: 0 }}>
            <button
              onClick={() => { if (!bulkUploading) setBulkOpen(false); }}
              disabled={bulkUploading}
              style={{ padding: "0.6rem 1.2rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}
            >Cancel</button>
            <button
              onClick={() => void submitBulkImport()}
              disabled={bulkUploading || bulkItems.length === 0}
              style={{ padding: "0.6rem 1.4rem", background: bulkUploading || bulkItems.length === 0 ? "#e5e7eb" : "#f97316", color: bulkUploading || bulkItems.length === 0 ? "#9ca3af" : "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: bulkUploading || bulkItems.length === 0 ? "not-allowed" : "pointer" }}
            >
              {bulkUploading ? "Importing…" : `Import ${bulkItems.length} Design${bulkItems.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Design Card ────────────────────────────────────────────────────────────

function DesignCard({
  design,
  isBusinessCard,
  onPreview,
  onAddColor,
  onEdit,
  onDelete,
  onEditFrontOverlay,
  onEditBackOverlay,
}: {
  design: DesignTemplateItem;
  isBusinessCard: boolean;
  onPreview: () => void;
  onAddColor: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditFrontOverlay?: () => void;
  onEditBackOverlay?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ background: "#fff", border: `2px solid ${hovered ? "#06b6d4" : "#e5e7eb"}`, borderRadius: "14px", overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview image — click to view full */}
      <div
        style={{ position: "relative", background: design.frontBgColor ?? "#f9fafb", cursor: "pointer", aspectRatio: isBusinessCard ? "16/9" : "4/3", overflow: "hidden" }}
        onClick={onPreview}
      >
        <img
          src={design.frontImage}
          alt={design.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        {design.frontOverlay && (
          <img src={design.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
        )}
        {hovered && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ background: "#fff", color: "#111827", padding: "0.35rem 0.9rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.75rem" }}>
              Preview →
            </span>
          </div>
        )}
        {/* Color count badge */}
        {(design.colorVariants?.length ?? 0) > 0 && (
          <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(6,182,212,0.9)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "999px" }}>
            {design.colorVariants!.length} color{design.colorVariants!.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "0.6rem 0.75rem 0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {design.colorHex && (
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: design.colorHex, border: "1px solid #d1d5db", flexShrink: 0, display: "inline-block" }} />
          )}
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.825rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{design.name}</p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <button onClick={onAddColor}
            style={{ flex: "1 1 auto", padding: "0.32rem 0.5rem", border: "1px solid #86efac", borderRadius: "5px", background: "#f0fdf4", color: "#15803d", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Color
          </button>
          {onEditFrontOverlay && (
            <button onClick={onEditFrontOverlay}
              style={{ flex: "1 1 auto", padding: "0.32rem 0.5rem", border: "1px solid #bfdbfe", borderRadius: "5px", background: "#eff6ff", color: "#1d4ed8", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              ✎ Front
            </button>
          )}
          {onEditBackOverlay && (
            <button onClick={onEditBackOverlay}
              style={{ flex: "1 1 auto", padding: "0.32rem 0.5rem", border: "1px solid #ddd6fe", borderRadius: "5px", background: "#faf5ff", color: "#7c3aed", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              ✎ Back
            </button>
          )}
          <button onClick={onEdit}
            style={{ flex: "1 1 auto", padding: "0.32rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", color: "#374151", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}>
            Edit
          </button>
          <button onClick={onDelete}
            style={{ flex: "1 1 auto", padding: "0.32rem 0.5rem", border: "1px solid #fca5a5", borderRadius: "5px", background: "#fef2f2", color: "#b91c1c", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
