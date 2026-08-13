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
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);

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
    // Parse admin price string (e.g. "$50 + tax") to a number for cart calculation
    const rawPrice = activeGallery?.price?.trim() ?? "";
    const parsedPrice = rawPrice ? parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || undefined : undefined;

    return (
      <DesignEditorShell
        shirt={shirt}
        selectedColor={selectedColor}
        selectedTechnology="Full Color Printing"
        templateId={selectedTemplate}
        templateOverlayColor={selectedTemplateColor}
        productName={activeGallery?.name ?? shirt.name}
        pricePerUnit={parsedPrice ?? (shirt.quantities[0]?.pricePerUnit)}
        onClose={() => setView("order")}
      />
    );
  }

  // A gallery only offers a size picker when its specs declare a comma-separated "Size:" list
  // (e.g. a shirt with several print sizes). Most galleries — one per fixed physical size, like
  // each Postcards variant — have no such spec, so there's nothing to pick and "Browse Designs"
  // must not require a selection that can never be made.
  const gallerySizeSpec = activeGallery?.specs?.find((s) => s.toLowerCase().startsWith("size:"));
  const gallerySizes = gallerySizeSpec
    ? gallerySizeSpec.replace(/^size:\s*/i, "").replace(/\(.*?\)/g, "").split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const sizeRequired = gallerySizes.length > 0;

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
            <Link href="/#lp-products" style={{ color: "#6b7280", textDecoration: "none" }}>{shirt.categoryName ?? "Products"}</Link>
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
                style={{ position: "relative", background: "#f9fafb", borderRadius: "16px", overflow: "hidden", aspectRatio: "4 / 3", border: "1px solid #e5e7eb", cursor: lensPos ? "crosshair" : "zoom-in" }}
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

              {/* Bold product title — show gallery name if available */}
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {activeGallery?.name ?? shirt.name}
              </h1>

              {/* Rating */}
              {shirt.rating !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StarRating rating={shirt.rating} />
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{shirt.rating}</span>
                  <a href="#reviews" style={{ fontSize: "0.875rem", color: "#374151", textDecoration: "underline" }}>({shirt.reviewCount})</a>
                </div>
              )}

              {/* Tagline */}
              <p style={{ margin: 0, fontSize: "1rem", color: "#374151" }}>
                {shirt.tagline}
              </p>

              {/* Price — from gallery or fallback to shirt data */}
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                {activeGallery?.price ? (
                  <>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                      {/[$+]/.test(activeGallery.price) ? activeGallery.price : `$${activeGallery.price} + tax`}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>per set · No setup fee</div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: "0 0 4px", fontSize: "0.875rem", color: "#6b7280" }}>{shirt.priceNote}</p>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                      {shirt.startingPrice ?? `₹${selectedQty.pricePerUnit.toLocaleString("en-IN")}.00`}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "2px" }}>per set · No setup fee</div>
                  </>
                )}
              </div>


              {/* Specs from gallery — size + fabric */}
              {activeGallery?.specs && activeGallery.specs.length > 0 && (() => {
                const sizes = gallerySizes;
                const otherSpecs = activeGallery.specs!.filter((s) => !s.toLowerCase().startsWith("size:"));
                return (
                  <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Size selector */}
                    {sizes.length > 0 && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>Size</p>
                          {selectedSize && <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600 }}>{selectedSize}</span>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => { setSelectedSize(s === selectedSize ? null : s); setSizeError(false); }}
                              style={{
                                minWidth: 44, padding: "6px 14px",
                                borderRadius: 8,
                                border: `2px solid ${selectedSize === s ? "#3b82f6" : "#e5e7eb"}`,
                                background: selectedSize === s ? "#eff6ff" : "#fff",
                                color: selectedSize === s ? "#1d4ed8" : "#374151",
                                fontWeight: selectedSize === s ? 700 : 500,
                                fontSize: "0.875rem", cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Other specs */}
                    {otherSpecs.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {otherSpecs.map((s, i) => (
                          <div key={i} style={{ fontSize: "0.85rem", color: "#6b7280", display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <span style={{ color: "#3b82f6", fontWeight: 700, flexShrink: 0 }}>✓</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}


              {/* CTA Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "0.5rem" }}>

                {/* Browse designs — only shown if this gallery has design templates */}
                {!checkingDesigns && hasDesigns && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <button
                      onClick={() => {
                        if (sizeRequired && !selectedSize) { setSizeError(true); return; }
                        setView("templates");
                      }}
                      style={{
                        width: "100%", padding: "0.875rem",
                        background: (!sizeRequired || selectedSize)
                          ? "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)"
                          : "#d1d5db",
                        color: (!sizeRequired || selectedSize) ? "#fff" : "#9ca3af",
                        border: "none", borderRadius: "999px",
                        fontSize: "1rem", fontWeight: 700,
                        cursor: (!sizeRequired || selectedSize) ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        boxShadow: (!sizeRequired || selectedSize) ? "0 4px 18px rgba(124,58,237,0.35)" : "none",
                        transition: "background 0.2s, box-shadow 0.2s",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                      Browse Designs ({activeGallery?.designs.length ?? 0})
                    </button>
                    {sizeError && (
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#ef4444", fontWeight: 600, textAlign: "center" }}>
                        Please select a size first
                      </p>
                    )}
                  </div>
                )}

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
