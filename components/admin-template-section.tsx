"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { GalleryTemplate } from "@/lib/template-data";
import { categories } from "@/lib/data";
import type { Product } from "@/lib/types";

async function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });
}

type Props = { products: Product[] };

export function AdminTemplateSection({ products }: Props) {
  const router = useRouter();
  const [productList] = useState<Product[]>(products);
  const apparelProducts = productList;

  const [selectedSlug, setSelectedSlug] = useState<string>(apparelProducts[0]?.slug ?? "");
  const [galleryList, setGalleryList] = useState<GalleryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  /* add modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [gName, setGName] = useState("");
  const [gImage, setGImage] = useState("");
  const [gImageName, setGImageName] = useState("");
  const gFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedSlug) return;
    void loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  async function loadTemplates() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/products/${selectedSlug}/templates`, { cache: "no-store" });
      const data = (await r.json()) as { templates?: GalleryTemplate[] };
      setGalleryList(data.templates ?? []);
    } catch {
      setErr("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }

  function flash(message: string, isError = false) {
    isError ? setErr(message) : setMsg(message);
    setTimeout(() => isError ? setErr("") : setMsg(""), 3000);
  }

  function openAddModal() {
    setEditingGalleryId(null);
    setGName(""); setGImage(""); setGImageName("");
    setModalOpen(true);
  }

  function openEditModal(g: GalleryTemplate) {
    setEditingGalleryId(g.id);
    setGName(g.name);
    setGImage(g.previewImage);
    setGImageName("Existing image");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingGalleryId(null);
    setGName(""); setGImage(""); setGImageName("");
  }

  async function handleGalleryImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setGImage(await readFile(file));
    setGImageName(file.name);
  }

  async function saveGallery() {
    if (!gName.trim() || !gImage) { flash("Name and image are required.", true); return; }
    setSaving(true);
    try {
      if (editingGalleryId) {
        await fetch(`/api/products/${selectedSlug}/templates/${editingGalleryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: gName, previewImage: gImage }),
        });
        flash("Gallery template updated.");
      } else {
        await fetch(`/api/products/${selectedSlug}/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: gName, previewImage: gImage }),
        });
        flash("Gallery template added.");
      }
      closeModal();
      await loadTemplates();
    } catch {
      flash("Save failed.", true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGallery(id: string) {
    if (!window.confirm("Delete this gallery template and all its designs?")) return;
    await fetch(`/api/products/${selectedSlug}/templates/${id}`, { method: "DELETE" });
    flash("Deleted.");
    await loadTemplates();
  }

  const selectedProduct = productList.find((p) => p.slug === selectedSlug);
  const selectedProductName = selectedProduct?.name ?? "";

  return (
    <>
    <div className="panel admin-list-panel" id="product-templates" style={{ marginTop: "2rem" }}>

      {/* Panel header */}
      <div className="panel-heading admin-list-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h2>Product Templates</h2>
          <span>Gallery templates per product</span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          style={{ padding: "0.55rem 1.1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", flexShrink: 0 }}
        >
          + Add Gallery Template
        </button>
      </div>

      {/* Product selector */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
        <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
          Select product
        </label>
        {apparelProducts.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No products found. Add products in the Product Listing.</p>
        ) : (
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
          >
            {apparelProducts.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name} ({categories.find(c => c.slug === p.category)?.name ?? p.category})</option>
            ))}
          </select>
        )}
      </div>

      {/* Feedback */}
      {(msg || err) && (
        <div style={{ margin: "1rem 1.5rem 0", padding: "0.75rem 1rem", borderRadius: "8px", background: err ? "#fef2f2" : "#f0fdf4", border: `1px solid ${err ? "#fca5a5" : "#86efac"}`, color: err ? "#b91c1c" : "#15803d", fontSize: "0.875rem", fontWeight: 600 }}>
          {err || msg}
        </div>
      )}

      {/* Gallery grid */}
      {apparelProducts.length > 0 && (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
          ) : galleryList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
              <p style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>No gallery templates yet for <strong style={{ color: "#374151" }}>{selectedProductName}</strong></p>
              <button
                type="button"
                onClick={openAddModal}
                style={{ padding: "0.6rem 1.25rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
              >
                + Add Gallery Template
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
              {galleryList.map((g) => (
                <GalleryCard
                  key={g.id}
                  gallery={g}
                  productSlug={selectedSlug}
                  onEdit={() => openEditModal(g)}
                  onDelete={() => void deleteGallery(g.id)}
                  onManage={() => router.push(`/admin/templates/${selectedSlug}/${g.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add/Edit Gallery Modal */}
    {modalOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(480px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>
                {editingGalleryId ? "Edit Gallery Template" : "Add Gallery Template"}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                {selectedProductName}
              </p>
            </div>
            <button onClick={closeModal} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Modal body */}
          <div style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>
              Template name
              <input
                value={gName}
                onChange={(e) => setGName(e.target.value)}
                placeholder="e.g. Black Polo – Chest Logo"
                style={{ padding: "0.6rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>
              Mockup image
              <input
                ref={gFileRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryImageChange}
                style={{ padding: "0.5rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.825rem" }}
              />
              {gImageName && <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{gImageName}</span>}
            </label>

            {gImage && (
              <img src={gImage} alt="preview" style={{ height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb" }} />
            )}

            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
              <button
                onClick={() => void saveGallery()}
                disabled={saving}
                style={{ flex: 1, padding: "0.65rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : editingGalleryId ? "Update" : "+ Add Gallery Template"}
              </button>
              <button
                onClick={closeModal}
                style={{ padding: "0.65rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}
              >
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

function GalleryCard({
  gallery,
  productSlug: _productSlug,
  onEdit,
  onDelete,
  onManage,
}: {
  gallery: GalleryTemplate;
  productSlug: string;
  onEdit: () => void;
  onDelete: () => void;
  onManage: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ borderRadius: "14px", overflow: "hidden", border: `2px solid ${hovered ? "#06b6d4" : "#e5e7eb"}`, transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "none", background: "#fff" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div style={{ position: "relative", padding: "0.6rem 0.6rem 0", background: "#f9fafb" }}>
        <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", borderRadius: "8px" }}>
        <img
          src={gallery.previewImage}
          alt={gallery.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Hover overlay */}
        {hovered && (
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "8px" }}
            onClick={onManage}
          >
            <span style={{ background: "#06b6d4", color: "#fff", padding: "0.45rem 1.1rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.825rem" }}>
              Manage Designs →
            </span>
          </div>
        )}
        {/* Design count badge */}
        <span style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
          {gallery.designs.length} design{gallery.designs.length !== 1 ? "s" : ""}
        </span>
        </div>
      </div>

      {/* Info + actions */}
      <div style={{ padding: "0.75rem 0.9rem" }}>
        <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gallery.name}</p>
        <p style={{ margin: "0 0 0.65rem", fontSize: "0.75rem", color: "#6b7280" }}>
          {gallery.designs.length > 0 ? `${gallery.designs.length} design option${gallery.designs.length !== 1 ? "s" : ""}` : "No designs yet"}
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={onManage}
            style={{ flex: 1, padding: "0.38rem 0", border: "1.5px solid #06b6d4", borderRadius: "6px", background: "#ecfeff", color: "#0891b2", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
          >
            Designs
          </button>
          <button
            onClick={onEdit}
            style={{ flex: 1, padding: "0.38rem 0", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", color: "#374151", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            style={{ flex: 1, padding: "0.38rem 0", border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
