"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { ShirtProduct } from "@/lib/shirt-data";
import type { GalleryTemplate } from "@/lib/template-data";
import DesignTemplatesModal from "./design-templates-modal";
import DesignEditorShell from "./design-editor-shell";

type View = "order" | "templates" | "editor";

const LENS_SIZE = 140;
const ZOOM_FACTOR = 2.5;

type Props = {
  shirt: ShirtProduct;
  galleryId: string | null;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: "flex", gap: "2px" }}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i + 0.5 <= rating;
        return (
          <span key={i} style={{ color: filled || half ? "#f59e0b" : "#d1d5db", fontSize: "1rem", opacity: half ? 0.7 : 1 }}>★</span>
        );
      })}
    </span>
  );
}

export default function ShirtOrderClient({ shirt, galleryId }: Props) {
  const [view, setView] = useState<View>("order");
  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedColor, setSelectedColor] = useState(shirt.colors[0]);
  const [selectedQty, setSelectedQty] = useState(shirt.quantities[0]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplateColor, setSelectedTemplateColor] = useState<string | null>(null);
  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Fetch the selected gallery to know if it has designs
  const [activeGallery, setActiveGallery] = useState<GalleryTemplate | null>(null);
  const [checkingDesigns, setCheckingDesigns] = useState(!!galleryId);

  useEffect(() => {
    if (!galleryId) { setCheckingDesigns(false); return; }
    fetch(`/api/products/${shirt.slug}/templates`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { templates?: GalleryTemplate[] }) => {
        const found = (data.templates ?? []).find((g) => g.id === galleryId);
        setActiveGallery(found ?? null);
      })
      .catch(() => {})
      .finally(() => setCheckingDesigns(false));
  }, [galleryId, shirt.slug]);

  const hasDesigns = (activeGallery?.designs.length ?? 0) > 0;

  // When a gallery template is chosen, show its image first, then the product's other images
  const displayImages = activeGallery
    ? [activeGallery.previewImage, ...shirt.images]
    : shirt.images;
  const currentImage = displayImages[activeImage] ?? displayImages[0];

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setLensPos({ x, y });
  }, []);

  if (view === "editor") {
    return (
      <DesignEditorShell
        shirt={shirt}
        selectedColor={selectedColor}
        selectedTechnology="Full Color Printing"
        templateId={selectedTemplate}
        templateOverlayColor={selectedTemplateColor}
        onClose={() => setView("order")}
      />
    );
  }

  return (
    <>
      {view === "templates" && (
        <DesignTemplatesModal
          shirt={shirt}
          galleryId={galleryId}
          selectedColor={selectedColor}
          onClose={() => setView("order")}
          onSelectTemplate={(id, overlayColor) => {
            setSelectedTemplate(id);
            setSelectedTemplateColor(overlayColor ?? null);
            setView("editor");
          }}
        />
      )}

      <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>
        {/* Breadcrumb */}
        <div style={{ borderBottom: "1px solid #f3f4f6", padding: "0.75rem 0" }}>
          <div className="container container-wide" style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center" }}>
            <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/products/dress-shirts" style={{ color: "#6b7280", textDecoration: "none" }}>Dress Shirts</Link>
            <span>/</span>
            <span style={{ color: "#374151" }}>{shirt.name}</span>
          </div>
        </div>

        {/* Main layout */}
        <div className="container container-wide">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", paddingTop: "2rem", alignItems: "start" }}>

            {/* LEFT: Image gallery */}
            <div>
              <div
                ref={imageContainerRef}
                style={{ position: "relative", background: "#f9fafb", borderRadius: "16px", overflow: "hidden", aspectRatio: "1 / 1", border: "1px solid #e5e7eb", cursor: lensPos ? "crosshair" : "zoom-in" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setLensPos(null)}
              >
                <img
                  src={currentImage}
                  alt={shirt.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: `scale(${zoom})`, transition: zoom === 1 ? "transform 0.2s ease" : "none", transformOrigin: lensPos ? `${lensPos.x * 100}% ${lensPos.y * 100}%` : "center center" }}
                />

                {/* Zoom lens */}
                {lensPos && (
                  <div style={{ position: "absolute", width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`, borderRadius: "50%", border: "2.5px solid #3b82f6", backgroundImage: `url(${currentImage})`, backgroundRepeat: "no-repeat", backgroundSize: `${ZOOM_FACTOR * 100}% ${ZOOM_FACTOR * 100}%`, backgroundPosition: `${lensPos.x * 100}% ${lensPos.y * 100}%`, left: `${lensPos.x * 100}%`, top: `${lensPos.y * 100}%`, transform: "translate(-50%, -50%)", boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.4)", pointerEvents: "none", zIndex: 10 }} />
                )}

                {/* Zoom controls */}
                <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} style={zoomBtnStyle} aria-label="Zoom in">+</button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.25, 1))} style={zoomBtnStyle} aria-label="Zoom out">−</button>
                </div>

                {shirt.images.length > 1 && (
                  <button onClick={() => { setActiveImage(i => (i + 1) % shirt.images.length); setZoom(1); }} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontSize: "1.1rem" }}>›</button>
                )}
              </div>

              {/* Thumbnails */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto" }}>
                {shirt.images.map((img, i) => (
                  <button key={i} onClick={() => { setActiveImage(i); setZoom(1); }} style={{ width: "72px", height: "72px", borderRadius: "10px", overflow: "hidden", border: `2px solid ${activeImage === i ? "#3b82f6" : "#e5e7eb"}`, padding: 0, cursor: "pointer", background: "#f9fafb", flexShrink: 0 }}>
                    <img src={img} alt={`View ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: Product info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Bold product title */}
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {shirt.name}
              </h1>

              {/* Selected template label */}
              {activeGallery && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.825rem", color: "#0891b2", fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  Template: {activeGallery.name}
                </div>
              )}

              {/* Rating */}
              {shirt.rating !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StarRating rating={shirt.rating} />
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{shirt.rating}</span>
                  <a href="#reviews" style={{ fontSize: "0.875rem", color: "#374151", textDecoration: "underline" }}>({shirt.reviewCount})</a>
                </div>
              )}

              {/* Tagline */}
              <p style={{ margin: 0, fontSize: "1rem", color: "#374151", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}>
                {shirt.tagline}
              </p>

              {/* Price */}
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.875rem", color: "#6b7280" }}>{shirt.priceNote}</p>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                  ₹{selectedQty.pricePerUnit.toLocaleString("en-IN")}.00
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>1 unit · No setup fee</div>
              </div>

              {/* Delivery */}
              <div style={{ fontSize: "0.875rem", color: "#374151", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Delivery to {shirt.pincode}</span>
                  <a href="#delivery" style={{ color: "#374151", textDecoration: "underline" }}>More information</a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                  <span>🚚</span><span>{shirt.deliveryDate}</span>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>FREE</span>
                </div>
              </div>

              {/* Substrate Color */}
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Substrate Color</p>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{selectedColor.name}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {shirt.colors.map((color) => (
                    <button key={color.name} onClick={() => setSelectedColor(color)} title={color.name}
                      style={{ width: "30px", height: "30px", borderRadius: "50%", background: color.hex, border: `2px solid ${selectedColor.name === color.name ? "#3b82f6" : "#d1d5db"}`, cursor: "pointer", outline: selectedColor.name === color.name ? "2px solid #bfdbfe" : "none", outlineOffset: "2px", padding: 0, transition: "all 0.15s ease" }}
                      aria-label={color.name} />
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <p style={{ margin: "0 0 0.6rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Quantity</p>
                <div style={{ position: "relative" }}>
                  <select value={selectedQty.qty}
                    onChange={(e) => { const found = shirt.quantities.find(q => q.qty === Number(e.target.value)); if (found) setSelectedQty(found); }}
                    style={{ width: "100%", padding: "0.75rem 2.5rem 0.75rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "10px", background: "#fff", fontSize: "0.9rem", fontWeight: 500, color: "#111827", cursor: "pointer", appearance: "none" }}>
                    {shirt.quantities.map(q => (
                      <option key={q.qty} value={q.qty}>{q.qty} (₹{q.pricePerUnit.toLocaleString("en-IN")}.00 / unit)</option>
                    ))}
                  </select>
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7280" }}>▾</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "0.5rem" }}>

                {/* Browse designs — only shown if this gallery has design templates */}
                {!checkingDesigns && hasDesigns && (
                  <button
                    onClick={() => setView("templates")}
                    style={{ width: "100%", padding: "0.875rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "10px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                    Browse designs
                  </button>
                )}

                {/* Upload design — always shown */}
                <button style={{ width: "100%", padding: "0.875rem", background: "#fff", color: "#374151", border: "1.5px solid #d1d5db", borderRadius: "10px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
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
    </>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  width: "36px", height: "36px", background: "rgba(255,255,255,0.95)", border: "1px solid #e5e7eb",
  borderRadius: "8px", cursor: "pointer", fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};
