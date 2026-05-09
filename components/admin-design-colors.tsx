"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import type { DesignTemplateItem, DesignColorVariant } from "@/lib/template-data";

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

async function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });
}

function DesignThumb({ base, overlay, label }: { base?: string; overlay?: string; label: string }) {
  if (!base) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: 72, height: 56, borderRadius: 6, border: "1px dashed #d1d5db", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db", fontSize: "0.65rem" }}>None</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: 72, height: 56, borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb", position: "relative" }}>
        <img src={base} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        {overlay && <img src={overlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />}
      </div>
    </div>
  );
}

type Props = { productSlug: string; galleryId: string; designId: string };

export default function AdminDesignColors({ productSlug, galleryId, designId }: Props) {
  const [design, setDesign] = useState<DesignTemplateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  /* color form */
  const [formOpen, setFormOpen] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [cHex, setCHex] = useState("#111827");
  const [cName, setCName] = useState("");
  /* front */
  const [cFrontImage, setCFrontImage] = useState("");
  const [cFrontImageName, setCFrontImageName] = useState("");
  /* back */
  const [cBackImage, setCBackImage] = useState("");
  const [cBackImageName, setCBackImageName] = useState("");

  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadData(); }, [productSlug, galleryId, designId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${designId}`, { cache: "no-store" });
      const data = (await res.json()) as { design?: DesignTemplateItem };
      setDesign(data.design ?? null);
    } catch { setErr("Failed to load."); } finally { setLoading(false); }
  }

  function flash(message: string, isError = false) {
    isError ? setErr(message) : setMsg(message);
    setTimeout(() => isError ? setErr("") : setMsg(""), 3000);
  }

  async function handleFrontImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    setCFrontImage(await readFile(file)); setCFrontImageName(file.name);
  }

  async function handleBackImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0]; if (!file) return;
    setCBackImage(await readFile(file)); setCBackImageName(file.name);
  }

  function openAddColor() {
    setEditingColorId(null);
    setCHex("#111827"); setCName("");
    setCFrontImage(""); setCFrontImageName("");
    setCBackImage(""); setCBackImageName("");
    [frontFileRef, backFileRef].forEach((r) => { if (r.current) r.current.value = ""; });
    setFormOpen(true);
  }

  function startEditColor(v: DesignColorVariant) {
    setEditingColorId(v.id);
    setCHex(v.colorHex); setCName(v.colorName);
    setCFrontImage(v.frontImage); setCFrontImageName("Existing");
    setCBackImage(v.backImage ?? ""); setCBackImageName(v.backImage ? "Existing" : "");
    setFormOpen(true);
  }

  function clearForm() {
    setFormOpen(false); setEditingColorId(null); setCHex("#111827"); setCName("");
    setCFrontImage(""); setCFrontImageName("");
    setCBackImage(""); setCBackImageName("");
  }

  async function saveColor() {
    if (!cHex || !cName.trim() || !cFrontImage) { flash("Color, color name and front image are required.", true); return; }
    setSaving(true);
    const payload = {
      colorHex: cHex,
      colorName: cName,
      frontImage: cFrontImage,
      ...(cBackImage ? { backImage: cBackImage } : {}),
    };
    try {
      if (editingColorId) {
        await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${designId}/colors/${editingColorId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        flash("Color variant updated.");
      } else {
        await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${designId}/colors`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        flash("Color variant added.");
      }
      clearForm(); await loadData();
    } catch { flash("Save failed.", true); } finally { setSaving(false); }
  }

  async function deleteColor(colorId: string) {
    if (!window.confirm("Delete this color variant?")) return;
    await fetch(`/api/products/${productSlug}/templates/${galleryId}/designs/${designId}/colors/${colorId}`, { method: "DELETE" });
    flash("Deleted."); await loadData();
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "#9ca3af", fontSize: "0.9rem" }}>Loading…</div>
  );

  const colors = design?.colorVariants ?? [];

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href={`/admin/templates/${productSlug}/${galleryId}`}
            style={{ fontSize: "0.8rem", color: "#06b6d4", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
            ← Back to Gallery
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            {design?.colorHex && (
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: design.colorHex, border: "1.5px solid #d1d5db", flexShrink: 0, display: "inline-block" }} />
            )}
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>{design?.name ?? "Design"}</h2>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>Color variants for this design</p>
        </div>
        <button type="button" onClick={openAddColor}
          style={{ padding: "0.6rem 1.15rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", flexShrink: 0 }}>
          + Add Color Variant
        </button>
      </div>

      {/* Primary design preview */}
      {design && (
        <div style={{ background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "1rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" }}>Primary Design</p>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <DesignThumb base={design.frontImage} overlay={design.frontOverlay} label="Front" />
            <DesignThumb base={design.backImage} overlay={design.backOverlay} label="Back" />
          </div>
        </div>
      )}

      {/* Feedback */}
      {(msg || err) && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", background: err ? "#fef2f2" : "#f0fdf4", border: `1px solid ${err ? "#fca5a5" : "#86efac"}`, color: err ? "#b91c1c" : "#15803d", fontSize: "0.875rem", fontWeight: 600 }}>
          {err || msg}
        </div>
      )}

      {/* Color variant list */}
      {colors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: "12px" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>No color variants yet.</p>
          <button onClick={openAddColor}
            style={{ padding: "0.55rem 1.1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            + Add Color Variant
          </button>
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", padding: "0.6rem 1rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span>Color</span>
            <span style={{ color: "#1d4ed8" }}>Front</span>
            <span style={{ color: "#7c3aed" }}>Back</span>
            <span>Actions</span>
          </div>

          {colors.map((v, i) => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", padding: "0.85rem 1rem", alignItems: "center", borderBottom: i < colors.length - 1 ? "1px solid #f3f4f6" : "none", background: "#fff" }}>

              {/* Color info */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: v.colorHex, border: "1.5px solid #d1d5db", flexShrink: 0, display: "inline-block" }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.colorName}</p>
                  <p style={{ margin: 0, fontFamily: "monospace", fontSize: "0.7rem", color: "#6b7280" }}>{v.colorHex}</p>
                </div>
              </div>

              {/* Front — color's base image + design template overlay */}
              <DesignThumb base={v.frontImage} overlay={design?.frontOverlay} label="Front" />

              {/* Back — color's base image + design template overlay */}
              <DesignThumb base={v.backImage} overlay={design?.backOverlay} label="Back" />

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flexShrink: 0 }}>
                <button onClick={() => startEditColor(v)}
                  style={{ padding: "0.3rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "5px", background: "#fff", color: "#374151", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer" }}>
                  Edit
                </button>
                <button onClick={() => void deleteColor(v.id)}
                  style={{ padding: "0.3rem 0.6rem", border: "1px solid #fca5a5", borderRadius: "5px", background: "#fef2f2", color: "#b91c1c", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ── Add / Edit Color Variant Modal ── */}
    {formOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget && !saving) clearForm(); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(820px,100%)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#111827" }}>
              {editingColorId ? "Edit color variant" : "Add color variant"}
            </h3>
            <button onClick={clearForm} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Modal body */}
          <div style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {/* Color selection */}
            <div style={{ background: "#f9fafb", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1rem" }}>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Color <span style={{ color: "#dc2626" }}>*</span></p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#6b7280", flexShrink: 0 }}>Quick pick:</span>
                {COLOR_PRESETS.map(({ hex, name }) => (
                  <button key={hex} type="button" title={name} onClick={() => { setCHex(hex); setCName((c) => c || name); }}
                    style={{ width: "26px", height: "26px", borderRadius: "50%", background: hex, padding: 0, cursor: "pointer", flexShrink: 0, border: cHex === hex ? "3px solid #3b82f6" : "1.5px solid #d1d5db", boxShadow: cHex === hex ? "0 0 0 1px #fff inset" : "none" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="color" value={cHex} onChange={(e) => setCHex(e.target.value)}
                    style={{ width: "40px", height: "36px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "2px", background: "#fff", cursor: "pointer" }} />
                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>{cHex}</span>
                </div>
                <input type="text" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Color name (e.g. Navy Blue)"
                  style={{ flex: 1, minWidth: "160px", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "7px", fontSize: "0.825rem", color: "#111827" }} />
              </div>
            </div>

            {/* Front + Back columns — base images only */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

              {/* FRONT */}
              <div style={{ border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "1rem", background: "#f8faff" }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Front</p>
                <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #e5e7eb" }}>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Base Image <span style={{ color: "#dc2626" }}>*</span></p>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>The shirt / product mockup for this color.</p>
                  <input ref={frontFileRef} type="file" accept="image/*" onChange={(e) => void handleFrontImage(e)}
                    style={{ width: "100%", fontSize: "0.78rem", padding: "0.3rem", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#f9fafb", boxSizing: "border-box" }} />
                  {cFrontImageName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>{cFrontImageName}</p>}
                  {cFrontImage && <img src={cFrontImage} alt="" style={{ width: "100%", marginTop: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", maxHeight: "100px", objectFit: "cover" }} />}
                </div>
              </div>

              {/* BACK */}
              <div style={{ border: "1.5px solid #ddd6fe", borderRadius: "10px", padding: "1rem", background: "#fdf8ff" }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Back <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "#9ca3af", textTransform: "none" }}>(optional)</span>
                </p>
                <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #e5e7eb" }}>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Base Image</p>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280" }}>The shirt mockup back view for this color.</p>
                  <input ref={backFileRef} type="file" accept="image/*" onChange={(e) => void handleBackImage(e)}
                    style={{ width: "100%", fontSize: "0.78rem", padding: "0.3rem", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#f9fafb", boxSizing: "border-box" }} />
                  {cBackImageName && <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>{cBackImageName}</p>}
                  {cBackImage && <img src={cBackImage} alt="" style={{ width: "100%", marginTop: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", maxHeight: "100px", objectFit: "cover" }} />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
              <button onClick={() => void saveColor()} disabled={saving}
                style={{ padding: "0.65rem 1.4rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editingColorId ? "Update Color" : "+ Add Color"}
              </button>
              <button onClick={clearForm}
                style={{ padding: "0.65rem 1.1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
