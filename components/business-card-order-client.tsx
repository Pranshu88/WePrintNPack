"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import type { GalleryTemplate, DesignTemplateItem, SerializableItem } from "@/lib/template-data";
import DesignEditorShell from "./design-editor-shell";

const LENS_SIZE = 140;
const ZOOM_FACTOR = 2.5;

const zoomBtnStyle: React.CSSProperties = {
  width: "36px", height: "36px", background: "rgba(255,255,255,0.95)",
  border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer",
  fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

type Props = {
  product: Product;
  galleryId: string | null;
};

const DESIGNS_PER_PAGE = 20;

export default function BusinessCardOrderClient({ product, galleryId }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [designsModalOpen, setDesignsModalOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryTemplate | null>(null);
  const [allDesigns, setAllDesigns] = useState<DesignTemplateItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // browse designs modal state
  const [designSearch, setDesignSearch] = useState("");
  const [designPage, setDesignPage] = useState(1);

  // selected design state for the editor
  const [frontItems, setFrontItems] = useState<SerializableItem[]>([]);
  const [backItems, setBackItems] = useState<SerializableItem[]>([]);
  const [frontBgColor, setFrontBgColor] = useState("#ffffff");
  const [backBgColor, setBackBgColor] = useState("#ffffff");
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // zoom / lens
  const [zoom, setZoom] = useState(1);
  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setLensPos({ x, y });
  }, []);

  useEffect(() => {
    fetch(`/api/products/${product.slug}/templates`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { templates?: GalleryTemplate[] }) => {
        const templates = data.templates ?? [];
        if (galleryId) {
          setGallery(templates.find((g) => g.id === galleryId) ?? null);
        }
        setAllDesigns(templates.flatMap((g) => g.designs));
      })
      .catch(() => {})
      .finally(() => setLoadingGallery(false));
  }, [galleryId, product.slug]);

  const hasDesigns = allDesigns.length > 0;

  // filtered + paginated designs for modal
  const filteredDesigns = allDesigns.filter((d) =>
    d.name.toLowerCase().includes(designSearch.toLowerCase())
  );
  const totalDesignPages = Math.max(1, Math.ceil(filteredDesigns.length / DESIGNS_PER_PAGE));
  const pagedDesigns = filteredDesigns.slice(
    (designPage - 1) * DESIGNS_PER_PAGE,
    designPage * DESIGNS_PER_PAGE
  );

  function openDesignsModal() {
    setDesignSearch("");
    setDesignPage(1);
    setDesignsModalOpen(true);
  }

  function selectDesign(d: DesignTemplateItem) {
    setFrontItems(d.frontAdminItems ?? []);
    setBackItems(d.backAdminItems ?? []);
    setFrontBgColor(d.frontBgColor ?? "#ffffff");
    setBackBgColor(d.backBgColor ?? "#ffffff");
    setSelectedDesignId(d.id);
    setDesignsModalOpen(false);
    setEditorOpen(true);
  }

  function openUploadDesign() {
    setFrontItems([]);
    setBackItems([]);
    setFrontBgColor("#ffffff");
    setBackBgColor("#ffffff");
    setSelectedDesignId(null);
    setEditorOpen(true);
  }

  if (editorOpen) {
    return (
      <DesignEditorShell
        productType="business-card"
        productSlug={product.slug}
        initialFrontItems={frontItems}
        initialBackItems={backItems}
        initialFrontBgColor={frontBgColor}
        initialBackBgColor={backBgColor}
        templateId={selectedDesignId}
        onClose={() => setEditorOpen(false)}
      />
    );
  }

  return (
    <>
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid #f3f4f6", padding: "0.75rem 0" }}>
        <div className="container container-wide" style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href="/products/business-cards" style={{ color: "#6b7280", textDecoration: "none" }}>Business Cards</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>{product.name}</span>
        </div>
      </div>

      <div className="container container-wide">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", paddingTop: "2rem", alignItems: "start" }}>

          {/* LEFT: Product / gallery image */}
          <div>
            {/* Gray card container with padding — shows the business card fully */}
            <div
              ref={imageContainerRef}
              style={{ position: "relative", background: "#f3f4f6", borderRadius: "16px", padding: "2rem", border: "1px solid #e5e7eb", cursor: lensPos ? "crosshair" : "default" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setLensPos(null)}
            >
              {/* Card image with shadow, natural landscape aspect ratio */}
              <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.22)" }}>
                <img
                  src={gallery?.previewImage ?? product.image}
                  alt={gallery?.name ?? product.name}
                  style={{ width: "100%", height: "auto", display: "block", transform: `scale(${zoom})`, transition: zoom === 1 ? "transform 0.2s ease" : "none", transformOrigin: lensPos ? `${lensPos.x * 100}% ${lensPos.y * 100}%` : "center center" }}
                />

                {/* Zoom lens */}
                {lensPos && (
                  <div style={{ position: "absolute", width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`, borderRadius: "50%", border: "2.5px solid #3b82f6", backgroundImage: `url(${gallery?.previewImage ?? product.image})`, backgroundRepeat: "no-repeat", backgroundSize: `${ZOOM_FACTOR * 100}% ${ZOOM_FACTOR * 100}%`, backgroundPosition: `${lensPos.x * 100}% ${lensPos.y * 100}%`, left: `${lensPos.x * 100}%`, top: `${lensPos.y * 100}%`, transform: "translate(-50%, -50%)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.4)", pointerEvents: "none", zIndex: 10 }} />
                )}
              </div>

              {/* Zoom controls */}
              <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} style={zoomBtnStyle} aria-label="Zoom in">+</button>
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 1))} style={zoomBtnStyle} aria-label="Zoom out">−</button>
              </div>
            </div>

            {gallery && (
              <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.825rem", color: "#0891b2", fontWeight: 600 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Template: {gallery.name}
              </div>
            )}
          </div>

          {/* RIGHT: Product info + CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div>
              <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.6rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {product.name}
              </h1>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#6b7280", lineHeight: 1.6 }}>{product.description}</p>
            </div>

            {/* Price */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
              <p style={{ margin: "0 0 4px", fontSize: "0.875rem", color: "#6b7280" }}>Starting from</p>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                {product.startingPrice}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>per set · No setup fee</div>
            </div>

            {/* Specs */}
            {product.specs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                {product.specs.map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "#6b7280" }}>{s.label}</span>
                    <span style={{ color: "#111827", fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>

              {/* Browse templates — shown when not on a gallery page */}
              {!galleryId && (
                <Link
                  href={`/products/business-cards/${product.slug}/templates`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "0.875rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "10px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", textDecoration: "none" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  Browse Templates
                </Link>
              )}

              {/* Browse designs — shown once templates are loaded */}
              {!loadingGallery && hasDesigns && (
                <button
                  onClick={openDesignsModal}
                  style={{ width: "100%", padding: "0.875rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "10px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  Browse Designs ({allDesigns.length})
                </button>
              )}

              {/* Upload design */}
              <button
                onClick={openUploadDesign}
                style={{ width: "100%", padding: "0.875rem", background: "#fff", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: "10px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                Upload design
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Designs Modal */}
    {designsModalOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget) setDesignsModalOpen(false); }}
      >
        <div style={{ background: "#fff", borderRadius: "20px", width: "min(1000px,100%)", maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Choose a design</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.825rem", color: "#6b7280" }}>
                {filteredDesigns.length} design{filteredDesigns.length !== 1 ? "s" : ""} available
                {designSearch ? ` for "${designSearch}"` : ""}
              </p>
            </div>
            <button
              onClick={() => setDesignsModalOpen(false)}
              style={{ width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          </div>

          {/* Search bar */}
          <div style={{ padding: "0.85rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search designs…"
                value={designSearch}
                onChange={(e) => { setDesignSearch(e.target.value); setDesignPage(1); }}
                style={{ width: "100%", padding: "0.55rem 0.75rem 0.55rem 2.25rem", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", color: "#111827" }}
              />
            </div>
          </div>

          {/* Design grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
            {pagedDesigns.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", padding: "2rem" }}>
                {designSearch ? `No designs found for "${designSearch}"` : "No designs available yet."}
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem" }}>
                {pagedDesigns.map((d) => (
                  <DesignCard key={d.id} design={d} price={product.startingPrice} onSelect={() => selectDesign(d)} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination footer */}
          <div style={{ padding: "0.9rem 1.5rem", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.825rem", color: "#6b7280" }}>
              Page {designPage} of {totalDesignPages} · {filteredDesigns.length} design{filteredDesigns.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <PageBtn label="←" disabled={designPage <= 1} onClick={() => setDesignPage((p) => p - 1)} />
              {buildPages(designPage, totalDesignPages).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} style={{ padding: "0 4px", color: "#9ca3af", fontSize: "0.825rem" }}>…</span>
                ) : (
                  <PageBtn key={n} label={String(n)} active={n === designPage} disabled={false} onClick={() => setDesignPage(n as number)} />
                )
              )}
              <PageBtn label="→" disabled={designPage >= totalDesignPages} onClick={() => setDesignPage((p) => p + 1)} />
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Pagination helpers ──────────────────────────────────────────────────────

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PageBtn({ label, active = false, disabled, onClick }: { label: string; active?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.35rem 0.75rem", borderRadius: "7px",
        border: active ? "2px solid #06b6d4" : "1px solid #e5e7eb",
        background: active ? "#06b6d4" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: "0.825rem", fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─── Design Card ─────────────────────────────────────────────────────────────

function DesignCard({ design, price, onSelect }: { design: DesignTemplateItem; price: string; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer", borderRadius: "14px", border: `2px solid ${hovered ? "#06b6d4" : "#e5e7eb"}`, transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "none", overflow: "hidden", background: "#fff" }}
    >
      {/* Gray padded area with landscape card + shadow */}
      <div style={{ background: "#f3f4f6", padding: "0.9rem 0.75rem 0.75rem" }}>
        <div style={{ position: "relative", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
          <img
            src={design.frontImage}
            alt={design.name}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          {design.frontOverlay && (
            <img src={design.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          )}
          {hovered && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "#06b6d4", color: "#fff", padding: "0.4rem 1rem", borderRadius: "999px", fontWeight: 700, fontSize: "0.8rem" }}>
                Select →
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "0.6rem 0.85rem 0.75rem" }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.875rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{design.name}</p>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#0891b2", fontWeight: 700 }}>{price}</p>
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
