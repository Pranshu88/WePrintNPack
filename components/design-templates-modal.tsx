"use client";

import { useState, useRef, useEffect } from "react";
import { designTemplates, type DesignTemplate, type ShirtProduct } from "@/lib/shirt-data";
import type { GalleryTemplate } from "@/lib/template-data";

type Props = {
  shirt: ShirtProduct;
  galleryId: string | null;
  selectedColor?: { hex: string; name: string };
  onClose: () => void;
  onSelectTemplate: (id: string, overlayColor?: string) => void;
};

const ALL_CATEGORIES = ["All", "Corporate", "Monogram", "Name Tags", "Badges", "Teams", "Blank"];

const PRINT_COLORS = [
  { hex: "#ffffff", name: "White" },
  { hex: "#111827", name: "Black" },
  { hex: "#dc2626", name: "Red" },
  { hex: "#2563eb", name: "Royal Blue" },
  { hex: "#1e3a8a", name: "Navy" },
  { hex: "#059669", name: "Green" },
  { hex: "#d97706", name: "Gold" },
  { hex: "#7c3aed", name: "Purple" },
  { hex: "#f9a8d4", name: "Pink" },
  { hex: "#9ca3af", name: "Silver" },
];

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return null;

  const value = Number.parseInt(cleaned, 16);
  if (Number.isNaN(value)) return null;

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function getReadableInkColor(backgroundHex: string) {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) return "#ffffff";

  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b);

  return luminance > 0.55 ? "#111827" : "#ffffff";
}

/* ─── Fallback overlay ───────────────────────────────────────────────────── */
function FallbackZone({
  template,
  accentColor,
}: {
  template: DesignTemplate;
  accentColor: string;
}) {
  const zones: Record<string, React.ReactNode> = {
    "tpl-1": (
      <>
        <div style={{ padding: "3px 8px", background: "rgba(210,210,210,0.9)", borderRadius: 4, textAlign: "center", marginBottom: 3 }}>
          <div style={{ fontSize: "0.55rem", color: "#333", fontWeight: 700, lineHeight: 1.3 }}>Upload Your<br />Design</div>
        </div>
        <div style={{ fontSize: "0.55rem", color: accentColor, fontWeight: 700 }}>Company Name</div>
      </>
    ),
    "tpl-2": (
      <div style={{ fontSize: "0.6rem", color: accentColor, fontWeight: 700, letterSpacing: "0.06em" }}>Company Name</div>
    ),
    "tpl-3": (
      <>
        <div style={{ fontSize: "0.55rem", color: accentColor, fontWeight: 700, marginBottom: 3 }}>Your Text Here</div>
        <div style={{ padding: "3px 8px", background: "rgba(210,210,210,0.9)", borderRadius: 4, textAlign: "center" }}>
          <div style={{ fontSize: "0.55rem", color: "#333", fontWeight: 700, lineHeight: 1.3 }}>Upload Your<br />Design</div>
        </div>
      </>
    ),
    "tpl-4": (
      <div style={{ padding: "4px 10px", background: "rgba(210,210,210,0.9)", borderRadius: 4, textAlign: "center" }}>
        <div style={{ fontSize: "0.55rem", color: "#333", fontWeight: 700, lineHeight: 1.3 }}>Upload Your<br />Design</div>
      </div>
    ),
  };
  return (
    <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      {zones[template.id] ?? (
        <div style={{ padding: "3px 8px", background: "rgba(210,210,210,0.9)", borderRadius: 4 }}>
          <div style={{ fontSize: "0.55rem", color: accentColor, fontWeight: 700, lineHeight: 1.3 }}>Your Text Here</div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared card shell ─────────────────────────────────────────────────── */
function CardShell({
  children, hovered, onHover, onLeave, onClick, borderColor,
}: {
  children: React.ReactNode;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  borderColor?: string;
}) {
  return (
    <div
      style={{ cursor: "pointer" }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div style={{
        borderRadius: "12px", overflow: "hidden",
        border: `2px solid ${borderColor ?? (hovered ? "#06b6d4" : "#e5e7eb")}`,
        transition: "border-color 0.15s", position: "relative", aspectRatio: "4 / 5",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Main modal ────────────────────────────────────────────────────────── */
export default function DesignTemplatesModal({ shirt, galleryId, selectedColor, onClose, onSelectTemplate }: Props) {
  const [galleryList, setGalleryList] = useState<GalleryTemplate[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  const [view, setView] = useState<"gallery" | "designs">("gallery");
  const [activeGallery, setActiveGallery] = useState<GalleryTemplate | null>(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  /* per-card selected color for text/logo overlay */
  const [cardColors, setCardColors] = useState<Record<string, string>>({});
  /* per-design color for admin template text/logo tinting */
  const [designColors, setDesignColors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pricePerUnit = shirt.quantities[0]?.pricePerUnit ?? shirt.pricePerUnit;
  const shirtImage = shirt.images[0];

  function getCardAccent(id: string): string {
    return cardColors[id] ?? selectedColor?.hex ?? shirt.colors[0]?.hex ?? "#111827";
  }

  useEffect(() => {
    fetch(`/api/products/${shirt.slug}/templates`)
      .then((r) => r.json())
      .then((data: { templates?: GalleryTemplate[] }) => {
        const list = data.templates ?? [];
        setGalleryList(list);
        if (galleryId) {
          const found = list.find((g) => g.id === galleryId);
          if (found) {
            setActiveGallery(found);
            setView("designs");
          }
        }
      })
      .catch(() => { /* fall through to fallback */ })
      .finally(() => setLoadingGallery(false));
  }, [shirt.slug, galleryId]);

  function toggleWishlist(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setWishlist((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const hasAdminTemplates = !loadingGallery && galleryList.length > 0;

  const fallbackFiltered = designTemplates.filter((t) => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function PriceInfo() {
    return (
      <div style={{ padding: "6px 2px 0" }}>
        <p style={{ margin: "0 0 1px", fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>₹{pricePerUnit.toLocaleString("en-IN")}.00</p>
        <p style={{ margin: "0 0 1px", fontSize: "0.75rem", color: "#6b7280" }}>1 unit</p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>No setup fee</p>
      </div>
    );
  }

  /* ── Color swatches shown below each fallback template card ── */
  function ColorSwatches({ id }: { id: string }) {
    if (shirt.colors.length < 2) return null;
    const active = getCardAccent(id);
    return (
      <div style={{ display: "flex", gap: "5px", padding: "5px 0 2px", flexWrap: "wrap" }}>
        {shirt.colors.map((c) => (
          <button
            key={c.hex}
            title={c.name}
            onClick={(e) => {
              e.stopPropagation();
              setCardColors((prev) => ({ ...prev, [id]: c.hex }));
            }}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: c.hex,
              border: `2px solid ${active === c.hex ? "#06b6d4" : "#d1d5db"}`,
              boxShadow: active === c.hex ? "0 0 0 2px #cffafe" : "none",
              cursor: "pointer",
              padding: 0,
              outline: "none",
              flexShrink: 0,
              transition: "border-color 0.12s, box-shadow 0.12s",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.52)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: "20px", width: "min(980px, 100%)", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.22)" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {view === "designs" && (
              <button
                onClick={() => {
                  if (galleryId) { onClose(); return; }
                  setView("gallery");
                  setActiveGallery(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: "0.85rem", padding: "0.3rem 0.5rem", borderRadius: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                {galleryId ? "Close" : "Back"}
              </button>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>
                {view === "gallery" ? "Browse design templates" : `Designs — ${activeGallery?.name}`}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                {view === "gallery" ? "Pick a starting point or upload your own" : "Choose a design layout for this template"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: "32px", height: "32px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "#6b7280", flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Search + filters (only in fallback gallery view) ── */}
        {view === "gallery" && !hasAdminTemplates && (
          <div style={{ padding: "0.85rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <div style={{ position: "relative", flex: "1", minWidth: "160px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.7rem 0.5rem 2rem", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.825rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {ALL_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "0.28rem 0.75rem", borderRadius: "999px", border: `1px solid ${activeCategory === cat ? "#06b6d4" : "#e5e7eb"}`, background: activeCategory === cat ? "#ecfeff" : "#fff", color: activeCategory === cat ? "#0891b2" : "#6b7280", fontWeight: activeCategory === cat ? 700 : 500, fontSize: "0.75rem", cursor: "pointer" }}>{cat}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ overflowY: "auto", padding: "1.1rem 1.5rem", flex: 1 }}>
          {loadingGallery ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#9ca3af", fontSize: "0.9rem" }}>Loading templates…</div>
          ) : view === "designs" && activeGallery ? (
            /* ══ DESIGN TEMPLATES VIEW ══ */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
              {activeGallery.designs.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: "0.875rem", gridColumn: "1/-1" }}>No design templates added yet for this gallery template.</p>
              ) : activeGallery.designs.map((d) => {
                const activeDesignColor = designColors[d.id] ?? selectedColor?.hex ?? shirt.colors[0]?.hex ?? "#111827";

                return (
                  <div key={d.id}>
                    <CardShell
                      hovered={hoveredId === d.id}
                      onHover={() => setHoveredId(d.id)}
                      onLeave={() => setHoveredId(null)}
                      onClick={() => onSelectTemplate(d.id, activeDesignColor)}
                    >
                      {/* Layer 1 — base image (shirt/product), never modified */}
                      <img src={d.frontImage} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />

                      {d.frontOverlay && (
                        activeDesignColor ? (
                          /*
                           * Color selected: render a solid-color div whose visibility is
                           * masked by the overlay PNG's alpha channel.
                           * Result: only the non-transparent pixels (text / logo) take on
                           * the chosen color — the base image is never touched.
                           */
                          <div
                            style={{
                              position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                              background: activeDesignColor,
                              WebkitMaskImage: `url(${d.frontOverlay})`,
                              maskImage: `url(${d.frontOverlay})`,
                              WebkitMaskSize: "contain",
                              maskSize: "contain",
                              WebkitMaskRepeat: "no-repeat",
                              maskRepeat: "no-repeat",
                              WebkitMaskPosition: "center",
                              maskPosition: "center",
                            } as React.CSSProperties}
                          />
                        ) : (
                          /* No color yet: show overlay in its original colours */
                          <img src={d.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", pointerEvents: "none", zIndex: 1 }} />
                        )
                      )}

                      {hoveredId === d.id && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
                          <button onClick={(e) => { e.stopPropagation(); onSelectTemplate(d.id, activeDesignColor); }} style={{ padding: "0.4rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "999px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", position: "relative", zIndex: 4 }}>Select</button>
                        </div>
                      )}
                    </CardShell>
                    <div style={{ padding: "6px 2px 0" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600, color: "#111827" }}>{d.name}</p>
                      <div style={{ display: "flex", gap: "5px", padding: "5px 0 3px", flexWrap: "wrap" }}>
                        {PRINT_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            title={c.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDesignColors((prev) => ({ ...prev, [d.id]: c.hex }));
                            }}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: c.hex,
                              border: `2px solid ${activeDesignColor === c.hex ? "#06b6d4" : "#d1d5db"}`,
                              boxShadow: activeDesignColor === c.hex ? "0 0 0 2px #cffafe" : "none",
                              cursor: "pointer",
                              padding: 0,
                              outline: "none",
                              flexShrink: 0,
                              transition: "border-color 0.12s, box-shadow 0.12s",
                            }}
                          />
                        ))}
                      </div>
                      <PriceInfo />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasAdminTemplates ? (
            /* ══ ADMIN GALLERY TEMPLATES VIEW ══ */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
              {/* Upload card */}
              <div>
                <div onClick={() => fileInputRef.current?.click()} onMouseEnter={() => setHoveredId("upload")} onMouseLeave={() => setHoveredId(null)}
                  style={{ borderRadius: "12px", overflow: "hidden", border: `2px solid ${hoveredId === "upload" ? "#06b6d4" : "#e5e7eb"}`, transition: "border-color 0.15s", aspectRatio: "4 / 5", background: "#faf8f3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "1rem", cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.775rem", fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.4 }}>Upload your own design</p>
                </div>
                <PriceInfo />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.ai,.eps,.pdf,.svg" style={{ display: "none" }} onChange={() => onSelectTemplate("upload")} />

              {galleryList.map((g) => (
                <div key={g.id}>
                  <CardShell
                    hovered={hoveredId === g.id}
                    onHover={() => setHoveredId(g.id)}
                    onLeave={() => setHoveredId(null)}
                    onClick={() => { setActiveGallery(g); setView("designs"); }}
                  >
                    <img src={g.previewImage} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                    <button onClick={(e) => toggleWishlist(g.id, e)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.15)", zIndex: 2 }} aria-label="Wishlist">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={wishlist.has(g.id) ? "#ef4444" : "none"} stroke={wishlist.has(g.id) ? "#ef4444" : "#374151"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    </button>
                    {hoveredId === g.id && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <button style={{ padding: "0.4rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "999px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", position: "relative", zIndex: 2 }}>View Designs</button>
                      </div>
                    )}
                  </CardShell>
                  <div style={{ padding: "6px 2px 0" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600, color: "#111827" }}>{g.name}</p>
                    <p style={{ margin: "0 0 1px", fontSize: "0.75rem", color: "#6b7280" }}>{g.designs.length} design{g.designs.length !== 1 ? "s" : ""}</p>
                    <PriceInfo />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ══ FALLBACK — no admin templates yet ══ */
            <div>
              <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#9ca3af", fontStyle: "italic" }}>No templates uploaded yet — showing sample layouts. Add templates from Admin → Product Templates.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                {/* Upload card */}
                <div>
                  <div onClick={() => fileInputRef.current?.click()} onMouseEnter={() => setHoveredId("upload")} onMouseLeave={() => setHoveredId(null)}
                    style={{ borderRadius: "12px", border: `2px solid ${hoveredId === "upload" ? "#06b6d4" : "#e5e7eb"}`, transition: "border-color 0.15s", aspectRatio: "4 / 5", background: "#faf8f3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "1rem", cursor: "pointer" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.775rem", fontWeight: 700, color: "#374151", textAlign: "center", lineHeight: 1.4 }}>Upload your own design</p>
                  </div>
                  <PriceInfo />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,.ai,.eps,.pdf,.svg" style={{ display: "none" }} onChange={() => onSelectTemplate("upload")} />

                {fallbackFiltered.map((t) => (
                  <div key={t.id}>
                    <CardShell hovered={hoveredId === t.id} onHover={() => setHoveredId(t.id)} onLeave={() => setHoveredId(null)} onClick={() => onSelectTemplate(t.id)}>
                      <img src={shirtImage} alt={shirt.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                      <FallbackZone template={t} accentColor={getCardAccent(t.id)} />
                      <button onClick={(e) => toggleWishlist(t.id, e)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.15)", zIndex: 2 }} aria-label="Wishlist">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={wishlist.has(t.id) ? "#ef4444" : "none"} stroke={wishlist.has(t.id) ? "#ef4444" : "#374151"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      </button>
                      {hoveredId === t.id && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                          <button onClick={(e) => { e.stopPropagation(); onSelectTemplate(t.id); }} style={{ padding: "0.4rem 1rem", background: "#06b6d4", color: "#fff", border: "none", borderRadius: "999px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", position: "relative", zIndex: 2 }}>Edit Design</button>
                        </div>
                      )}
                    </CardShell>
                    <div style={{ padding: "6px 2px 0" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600, color: "#111827" }}>{t.name}</p>
                      <ColorSwatches id={t.id} />
                      <PriceInfo />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
