"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import type { GalleryTemplate, DesignTemplateItem, SerializableItem } from "@/lib/template-data";
import DesignEditorShell from "./design-editor-shell";

const LENS_SIZE = 140;
const ZOOM_FACTOR = 2.5;

// Sinalite "size" option values look like "8.5 x 5.5" (width x height, inches) —
// parsed so the Design Editor's canvas/ruler labels can match whatever size the
// customer actually picked in Configure Your Order, instead of a fixed default.
function parseSinaliteSizeToInches(sizeName: string | undefined): { width: number; height: number } | undefined {
  if (!sizeName) return undefined;
  const m = sizeName.match(/^\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*$/i);
  if (!m) return undefined;
  return { width: parseFloat(m[1]), height: parseFloat(m[2]) };
}

// Price overrides for non-BC gallery templates (mirrors PRICE_FALLBACKS in popular-products-carousel)
const GALLERY_PRICE_MAP: Record<string, { price: string; priceNote: string }> = {
  "Vinyl Banner":            { price: "From $109", priceNote: "+ tax" },
  "Large Outdoor Banner":    { price: "$179",      priceNote: "+ tax" },
  "Standard Roll-Up Banner": { price: "$229",      priceNote: "+ tax" },
  "Premium Roll-Up Banner":  { price: "$279",      priceNote: "+ tax" },
  "Small Posters":           { price: "$109",      priceNote: "+ tax" },
  "Large Posters":           { price: "$139",      priceNote: "+ tax" },
  "Elite Yard Sign":         { price: "$189",      priceNote: "+ tax" },
  "Business Yard Sign":      { price: "$379",      priceNote: "+ tax" },
  "Die-Cut Stickers":        { price: "$89",       priceNote: "+ tax" },
  "Product Labels":          { price: "$139",      priceNote: "+ tax" },
};

// Business card package metadata keyed by gallery template name
const BC_PACKAGE_DATA: Record<string, { dbKey: string; title: string; price: string; priceNum: number; priceNote: string; specs: Array<{ label: string; value: string }> }> = {
  "Business Cards": {
    dbKey: "bc-standard",
    title: "Business Cards",
    price: "$79",
    priceNum: 79,
    priceNote: "+ tax · per set",
    specs: [
      { label: "Size", value: '3.5" × 2"' },
      { label: "Stock", value: "14pt Matte or Gloss" },
      { label: "Print", value: "Full colour" },
      { label: "Sides", value: "Double-sided included" },
    ],
  },
  "Premium Business Cards": {
    dbKey: "bc-premium",
    title: "Premium Business Cards",
    price: "$119",
    priceNum: 119,
    priceNote: "+ tax · per set",
    specs: [
      { label: "Stock", value: "16pt Matte / Silk" },
      { label: "Sides", value: "Double-sided" },
      { label: "Finish", value: "Premium finish" },
    ],
  },
  "Luxury Business Cards": {
    dbKey: "bc-luxury",
    title: "Luxury Business Cards",
    price: "From $179",
    priceNum: 179,
    priceNote: "+ tax · quote based on finish",
    specs: [
      { label: "Finish", value: "Soft Touch / Suede / Spot UV / Raised UV / Painted Edge" },
    ],
  },
  "Express Flyers": {
    dbKey: "fly-standard",
    title: "Express Flyers",
    price: "$159",
    priceNum: 159,
    priceNote: "+ tax · per set",
    specs: [
      { label: "Size", value: '8.5" × 5.5"' },
      { label: "Stock", value: "100lb Gloss Text" },
      { label: "Print", value: "Full colour" },
      { label: "Sides", value: "Double-sided" },
    ],
  },
  "Prime Flyers": {
    dbKey: "fly-premium",
    title: "Prime Flyers",
    price: "$329",
    priceNum: 329,
    priceNote: "+ tax · per set",
    specs: [
      { label: "Size", value: '8.5" × 11"' },
      { label: "Stock", value: "100lb Gloss Text" },
      { label: "Print", value: "Full colour" },
      { label: "Sides", value: "Double-sided" },
    ],
  },
};

// The 3 BC tiers are now backed by Sinalite-imported gallery rows (ids 1/2/7) whose display
// `name` is the real Sinalite product name, not the fixed label — so BC_PACKAGE_DATA has to be
// looked up by sinaliteId first, falling back to a literal name match for any other gallery.
const SINALITE_ID_TO_BC_NAME: Record<string, string> = {
  "1": "Business Cards", "2": "Premium Business Cards", "7": "Luxury Business Cards",
  "37": "Express Flyers", "38": "Prime Flyers",
  "97": "Business Yard Sign", "98": "Elite Yard Sign",
  "65": "Large Posters", "66": "Small Posters",
};
function getBcPackageData(gallery: GalleryTemplate | null): (typeof BC_PACKAGE_DATA)[string] | null {
  if (!gallery) return null;
  const byId = gallery.sinaliteId ? SINALITE_ID_TO_BC_NAME[gallery.sinaliteId] : undefined;
  return BC_PACKAGE_DATA[byId ?? gallery.name] ?? null;
}

// Gallery template specs are stored as "Label: value" strings (set via the admin
// Add/Edit Gallery Template modal's Size/Color/Paper Type/Finishing/Quantities fields).
// These four are always shown on every product page — regardless of what the gallery
// template or the static product data has — so the spec block stays consistent
// across templates. Missing values show as "—" instead of being hidden.
const DISPLAY_SPEC_KEYS = ["Size", "Color", "Paper Type", "Finishing"];

function parseGallerySpecs(specs: string[] | undefined): { label: string; value: string }[] {
  const byLabel = new Map<string, string>();
  (specs ?? []).forEach((s) => {
    const idx = s.indexOf(":");
    if (idx === -1) return;
    byLabel.set(s.slice(0, idx).trim(), s.slice(idx + 1).trim());
  });

  return DISPLAY_SPEC_KEYS.map((label) => ({ label, value: byLabel.get(label) ?? "" }));
}

// Only the hex codes from the gallery's Color spec are usable as swatch values in the
// design editor — non-hex tokens like "All Color" are display-only labels, not colors.
function parseMaterialColors(specs: string[] | undefined): string[] {
  const colorSpec = (specs ?? []).find((s) => s.slice(0, s.indexOf(":")).trim() === "Color");
  if (!colorSpec) return [];
  return colorSpec
    .slice(colorSpec.indexOf(":") + 1)
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
}

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

const zoomBtnStyle: React.CSSProperties = {
  width: "36px", height: "36px", background: "rgba(255,255,255,0.95)",
  border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer",
  fontSize: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

type Props = {
  product: Product;
  galleryId: string | null;
  categoryLabel?: string;
  categoryHref?: string;
  productBasePath?: string;
  productNameOverride?: string;
};

const DESIGNS_PER_PAGE = 20;

export default function BusinessCardOrderClient({ product, galleryId, categoryLabel = "Business Cards", categoryHref = "/products/business-cards", productBasePath, productNameOverride }: Props) {
  const basePath = productBasePath ?? categoryHref;
  const [editorOpen, setEditorOpen] = useState(false);
  const [designsModalOpen, setDesignsModalOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryTemplate | null>(null);
  const [allDesigns, setAllDesigns] = useState<DesignTemplateItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [bcImage, setBcImage] = useState("");
  const [selectedSinaliteOptions, setSelectedSinaliteOptions] = useState<Record<string, string>>({});
  const [sinalitePrice, setSinalitePrice] = useState<{ price: number; productOptions: Record<string, string> } | null>(null);
  const [sinalitePriceLoading, setSinalitePriceLoading] = useState(false);
  // Fallback for Sinalite-linked galleries whose options were never saved to the DB
  // (gallery.sinaliteOptions empty) — fetched live from the same endpoint the admin
  // panel uses, so every Sinalite product works without a manual admin save step.
  const [liveSinaliteOptions, setLiveSinaliteOptions] = useState<{ id: number; group: string; name: string }[]>([]);
  const [liveSinaliteOptionsLoading, setLiveSinaliteOptionsLoading] = useState(false);

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
          const matched = templates.find((g) => g.id === galleryId) ?? null;
          setGallery(matched);
          // Scope designs to the selected template only
          setAllDesigns(matched?.designs ?? []);
        } else {
          setAllDesigns(templates.flatMap((g) => g.designs));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGallery(false));
  }, [galleryId, product.slug]);

  // Load the correct BC package photo from IndexedDB once gallery is known
  useEffect(() => {
    if (!gallery) return;
    const bcData = getBcPackageData(gallery);
    if (!bcData) return;
    void loadBcImage(bcData.dbKey).then((img) => { if (img) setBcImage(img); });
  }, [gallery]);

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

  // When a BC package gallery is selected, override static product data with package-specific data
  const bcData = getBcPackageData(gallery);
  const mappedGalleryName = gallery?.sinaliteId ? SINALITE_ID_TO_BC_NAME[gallery.sinaliteId] : undefined;
  const galleryPrice = gallery ? GALLERY_PRICE_MAP[mappedGalleryName ?? gallery.name] ?? null : null;
  const adminPrice = gallery?.price ? gallery.price.replace(/\s*\+\s*tax/i, "").trim() : null;
  const displayTitle = bcData?.title ?? mappedGalleryName ?? (gallery?.name && !bcData ? gallery.name : null) ?? productNameOverride ?? product.name;
  // The on-page heading always shows the real Sinalite template name (e.g. "Business cards
  // 14pt (Profit Maximizer)") once a Sinalite-linked gallery is selected — everywhere else
  // (breadcrumb, editor, price lookups) still uses the friendly branded displayTitle.
  const displayHeading = gallery?.sinaliteId ? gallery.name : displayTitle;
  const displayPrice = bcData?.price ?? galleryPrice?.price ?? adminPrice ?? product.startingPrice;
  const displayPriceNote = bcData?.priceNote ?? galleryPrice?.priceNote ?? (adminPrice ? "+ tax · per set" : "per set · No setup fee");
  const displayPriceNum = parseFloat(displayPrice.replace(/[^0-9.]/g, "")) || undefined;
  const displaySpecs = parseGallerySpecs(gallery?.specs);
  const displayDescription = gallery?.description || product.description;
  const displayImage = bcImage || gallery?.previewImage || product.image || gallery?.designs[0]?.frontImage;
  // Prefer options saved on the gallery (admin-curated); fall back to a live fetch
  // straight from Sinalite for galleries that were never edited/saved in admin.
  const effectiveSinaliteOptions = gallery?.sinaliteOptions?.length ? gallery.sinaliteOptions : liveSinaliteOptions;
  const sinaliteOptionGroups = ((): Record<string, { id: number; label: string; name: string }[]> => {
    const groups: Record<string, { id: number; label: string; name: string }[]> = {};
    for (const o of effectiveSinaliteOptions) {
      const key = o.group.toLowerCase();
      (groups[key] ??= []).push({ id: o.id, label: o.group, name: o.name });
    }
    return groups;
  })();
  useEffect(() => {
    setLiveSinaliteOptions([]);
    if (!gallery?.sinaliteId || gallery.sinaliteOptions?.length) return;
    let cancelled = false;
    setLiveSinaliteOptionsLoading(true);
    fetch(`/api/sinalite/products/${gallery.sinaliteId}/options`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { options?: { id: number; group: string; name: string; hidden: number }[]; error?: string }) => {
        if (cancelled || d.error) return;
        setLiveSinaliteOptions((d.options ?? []).filter((o) => o.hidden === 0));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLiveSinaliteOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [gallery?.id, gallery?.sinaliteId, gallery?.sinaliteOptions?.length]);
  useEffect(() => {
    if (!effectiveSinaliteOptions.length) return;
    setSelectedSinaliteOptions((prev) => {
      const next = { ...prev };
      for (const [key, opts] of Object.entries(sinaliteOptionGroups)) {
        if (!next[key] && opts[0]) next[key] = opts[0].name;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery?.id, effectiveSinaliteOptions.length]);

  // Recalculate live Sinalite pricing whenever the customer changes a configuration option.
  // Debounced — Sinalite's price endpoint is a heavy per-call cost calculation, so firing one
  // request per click (e.g. clicking through 4-5 options quickly) can overload it and time out.
  useEffect(() => {
    if (!gallery?.sinaliteId || Object.keys(sinaliteOptionGroups).length === 0) { setSinalitePrice(null); return; }
    const optionIds: number[] = [];
    for (const [key, opts] of Object.entries(sinaliteOptionGroups)) {
      const chosenName = selectedSinaliteOptions[key];
      const match = opts.find((o) => o.name === chosenName) ?? opts[0];
      if (match) optionIds.push(match.id);
    }
    if (optionIds.length === 0) { setSinalitePrice(null); return; }
    let cancelled = false;
    setSinalitePriceLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/sinalite/products/${gallery.sinaliteId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds }),
      })
        .then((r) => r.json())
        .then((d: { price?: number; productOptions?: Record<string, string>; error?: string }) => {
          if (cancelled || d.error || d.price == null) return;
          setSinalitePrice({ price: d.price, productOptions: d.productOptions ?? {} });
        })
        .catch(() => { if (!cancelled) setSinalitePrice(null); })
        .finally(() => { if (!cancelled) setSinalitePriceLoading(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery?.sinaliteId, selectedSinaliteOptions]);

  const materialColors = parseMaterialColors(gallery?.specs);

  const editorProductType = ((): React.ComponentProps<typeof DesignEditorShell>["productType"] => {
    // Prefer the sinaliteId-mapped tier name (e.g. "Express Flyers") over the raw display
    // name, since Sinalite-imported galleries carry their real product name in `gallery.name`.
    const gn = mappedGalleryName ?? gallery?.name ?? "";
    const s  = product.slug;

    // Check gallery name first — it's more specific than the product slug
    if (gn === "Premium Roll-Up Banner")             return "banner-rollup-premium";
    if (gn === "Standard Roll-Up Banner")            return "banner-rollup-std";
    if (gn.includes("Roll-Up Banner"))               return "banner-rollup-std";
    if (gn === "Large Outdoor Banner")               return "banner-outdoor";
    if (gn === "Vinyl Banner")                       return "banner-vinyl";
    if (gn === "Small Posters")                      return "poster-small";
    if (gn === "Large Posters")                      return "poster-large";
    if (gn === "Express Flyers")                     return "flyer-express";
    if (gn === "Prime Flyers")                       return "flyer-prime";
    if (gn.toLowerCase().includes("sticker") ||
        gn.toLowerCase().includes("label"))          return "sticker-label";

    // Fall back to product slug
    if (s === "yard-signs")                          return "yard-sign";
    if (s === "stickers-and-labels")                 return "sticker-label";
    if (s === "vinyl-banners")                       return "banner-vinyl";
    if (s === "posters" || s === "small-posters")    return "poster-small";
    if (s === "large-posters")                       return "poster-large";
    if (s === "express-flyers" || s === "flyers")    return "flyer-express";
    if (s === "prime-flyers")                        return "flyer-prime";
    return "business-card";
  })();

  if (editorOpen) {
    return (
      <DesignEditorShell
        productType={editorProductType}
        productSlug={product.slug}
        initialFrontItems={frontItems}
        initialBackItems={backItems}
        initialFrontBgColor={frontBgColor}
        initialBackBgColor={backBgColor}
        templateId={selectedDesignId}
        productName={displayTitle}
        pricePerUnit={displayPriceNum}
        materialColors={materialColors.length > 0 ? materialColors : undefined}
        sinaliteId={gallery?.sinaliteId}
        sinaliteOptions={effectiveSinaliteOptions}
        customDimsInches={parseSinaliteSizeToInches(selectedSinaliteOptions["size"])}
        onClose={() => setEditorOpen(false)}
      />
    );
  }

  return (
    <>
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid #f3f4f6", padding: "0.75rem 0" }}>
        <div className="container container-wide" style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#9ca3af", alignItems: "center" }}>
          <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href={categoryHref} style={{ color: "#9ca3af", textDecoration: "none" }}>{categoryLabel}</Link>
          <span>/</span>
          <span style={{ background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: 700 }}>{displayTitle}</span>
        </div>
      </div>

      <div className="container container-wide">
        <div className="bc-order-layout">

          {/* LEFT: Product image */}
          <div>
            <div
              ref={imageContainerRef}
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #fdf4ff 0%, #fce7f3 40%, #eff6ff 100%)",
                borderRadius: "20px",
                padding: "2.5rem 2rem",
                cursor: lensPos ? "crosshair" : "default",
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setLensPos(null)}
            >
              <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.22)", maxHeight: "420px" }}>
                <img
                  src={displayImage}
                  alt={displayTitle}
                  style={{ width: "100%", height: "auto", maxHeight: "420px", objectFit: "contain", display: "block", transform: `scale(${zoom})`, transition: zoom === 1 ? "transform 0.2s ease" : "none", transformOrigin: lensPos ? `${lensPos.x * 100}% ${lensPos.y * 100}%` : "center center" }}
                />
                {lensPos && (
                  <div style={{ position: "absolute", width: `${LENS_SIZE}px`, height: `${LENS_SIZE}px`, borderRadius: "50%", border: "2.5px solid rgba(124,58,237,0.6)", backgroundImage: `url(${displayImage})`, backgroundRepeat: "no-repeat", backgroundSize: `${ZOOM_FACTOR * 100}% ${ZOOM_FACTOR * 100}%`, backgroundPosition: `${lensPos.x * 100}% ${lensPos.y * 100}%`, left: `${lensPos.x * 100}%`, top: `${lensPos.y * 100}%`, transform: "translate(-50%, -50%)", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", pointerEvents: "none", zIndex: 10 }} />
                )}
              </div>

              {/* Zoom controls */}
              <div style={{ position: "absolute", bottom: "14px", right: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} style={zoomBtnStyle} aria-label="Zoom in">+</button>
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 1))} style={zoomBtnStyle} aria-label="Zoom out">−</button>
              </div>
            </div>

            {gallery && (
              <div style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.825rem", fontWeight: 600, background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Template: {gallery.name}
              </div>
            )}
          </div>

          {/* RIGHT: Product info + CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Title + description */}
            <div style={{ paddingBottom: "1.25rem" }}>
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {displayHeading}
              </h1>
              {displayDescription && (
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#6b7280", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{displayDescription}</p>
              )}
            </div>

            {/* Price — hidden for Sinalite-linked products; pricing will come from Sinalite's own API in a later phase */}
            {!gallery?.sinaliteId && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "1.25rem 0" }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Starting from</p>
                <div style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em", background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>
                  {displayPrice}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginTop: "5px" }}>{displayPriceNote}</div>
              </div>
            )}

            {/* Specs — dropped for Sinalite-linked products; replaced by Configure Your Order below */}
            {!gallery?.sinaliteId && displaySpecs.length > 0 && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "1.25rem 0", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {displaySpecs.map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.875rem" }}>
                    <span style={{ color: "#9ca3af" }}>{s.label}</span>
                    {s.label === "Color" && s.value ? (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {s.value.split(",").map((c) => c.trim()).filter(Boolean).map((color) => (
                          <span
                            key={color}
                            title={color}
                            style={{
                              width: "18px", height: "18px", borderRadius: "50%",
                              background: color.startsWith("#") ? color : undefined,
                              border: "1.5px solid #d1d5db", flexShrink: 0,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {!color.startsWith("#") && <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "#374151" }}>{color.slice(0, 2).toUpperCase()}</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: s.value ? "#111827" : "#d1d5db", fontWeight: 700 }}>{s.value || "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Configure your order — loading state while options are still being fetched
                (either the gallery itself, or the live Sinalite options fallback) */}
            {gallery?.sinaliteId && Object.keys(sinaliteOptionGroups).length === 0 && (loadingGallery || liveSinaliteOptionsLoading) && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "1.25rem 0", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid #e5e7eb", borderTopColor: "#7c3aed",
                  animation: "wp-spin 0.7s linear infinite", flexShrink: 0,
                }} />
                <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>Loading order options…</span>
              </div>
            )}

            {/* Configure your order — from admin-selected Sinalite options */}
            {gallery?.sinaliteId && Object.keys(sinaliteOptionGroups).length > 0 && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: "1.25rem 0", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                  Configure your order
                </p>
                {Object.entries(sinaliteOptionGroups).map(([key, opts]) => {
                  const groupLabel = key === "qty" ? "Quantity" : (opts[0]?.label ?? key).replace(/\b\w/g, (c) => c.toUpperCase());
                  if (key === "qty") {
                    return (
                      <div key={key}>
                        <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{groupLabel}</p>
                        <select
                          value={selectedSinaliteOptions[key] ?? ""}
                          onChange={(e) => setSelectedSinaliteOptions((prev) => ({ ...prev, [key]: e.target.value }))}
                          style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "0.9rem", color: "#111827", background: "#fff" }}
                        >
                          {opts.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={key}>
                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{groupLabel}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {opts.map((o) => {
                          const active = selectedSinaliteOptions[key] === o.name;
                          return (
                            <button
                              key={o.name}
                              type="button"
                              onClick={() => setSelectedSinaliteOptions((prev) => ({ ...prev, [key]: o.name }))}
                              style={{
                                padding: "0.5rem 0.9rem", borderRadius: "9px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                                border: active ? "1.5px solid transparent" : "1.5px solid #e5e7eb",
                                background: active ? "linear-gradient(135deg,#7c3aed,#db2777,#f97316)" : "#fff",
                                color: active ? "#fff" : "#374151",
                              }}
                            >
                              {o.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Sinalite price — recalculated whenever a configuration option changes */}
            {gallery?.sinaliteId && (sinalitePrice || sinalitePriceLoading) && (
              <div style={{ border: "1px solid #fecaca", background: "#fff7f7", borderRadius: "12px", padding: "1.25rem", margin: "1.25rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>Your Price</span>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
                    {sinalitePriceLoading ? "…" : `$${sinalitePrice?.price.toFixed(2)}`}
                  </span>
                </div>
                {sinalitePrice && Object.keys(sinalitePrice.productOptions).length > 0 && (
                  <>
                    <p style={{ margin: "1rem 0 0.6rem", fontSize: "0.75rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", borderTop: "1px solid #fde2e2", paddingTop: "0.9rem" }}>
                      Configuration Summary
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {Object.entries(sinalitePrice.productOptions).map(([label, value]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ color: "#9ca3af" }}>{label}</span>
                          <span style={{ fontWeight: 700, color: "#111827" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Browse templates */}
              {!galleryId && (
                <Link
                  href={`${basePath}/${product.slug}/templates`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "0.95rem", background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  Browse Templates
                </Link>
              )}

              {/* Browse designs */}
              {!loadingGallery && hasDesigns && (
                <button
                  onClick={openDesignsModal}
                  style={{ width: "100%", padding: "0.95rem", background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}
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
                style={{ width: "100%", padding: "0.95rem", background: "#fff", color: "#374151", border: "2px solid transparent", borderRadius: "12px", fontSize: "1rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundClip: "padding-box", boxShadow: "inset 0 0 0 2px #e5e7eb", position: "relative" }}
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
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,15,25,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setDesignsModalOpen(false); }}
      >
        <div style={{ background: "#fff", borderRadius: "24px", width: "min(1080px,100%)", maxHeight: "92vh", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>

          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.75rem 1.25rem", flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: "0 0 3px", fontSize: "1.4rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Choose a design</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#9ca3af" }}>
                {filteredDesigns.length} design{filteredDesigns.length !== 1 ? "s" : ""} available
                {designSearch ? ` for "${designSearch}"` : ""}
              </p>
            </div>
            <button
              onClick={() => setDesignsModalOpen(false)}
              style={{ width: 36, height: 36, border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}
            >✕</button>
          </div>

          {/* Search bar */}
          <div style={{ padding: "0 1.75rem 1.25rem", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search designs..."
                value={designSearch}
                onChange={(e) => { setDesignSearch(e.target.value); setDesignPage(1); }}
                style={{ width: "100%", padding: "0.7rem 1rem 0.7rem 2.6rem", border: "1.5px solid #e5e7eb", borderRadius: "999px", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", color: "#111827", background: "#fafafa" }}
              />
            </div>
          </div>

          {/* Design grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 1.75rem 1.5rem" }}>
            {pagedDesigns.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", padding: "3rem" }}>
                {designSearch ? `No designs found for "${designSearch}"` : "No designs available yet."}
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1.25rem" }}>
                {pagedDesigns.map((d) => (
                  <DesignCard key={d.id} design={d} price={displayPrice} galleryName={mappedGalleryName ?? gallery?.name} onSelect={() => selectDesign(d)} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination footer */}
          <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.825rem", color: "#9ca3af", fontWeight: 500 }}>
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
        width: 36, height: 36,
        borderRadius: "10px",
        border: active ? "none" : "1.5px solid #e5e7eb",
        background: active ? "linear-gradient(135deg,#7c3aed,#db2777,#f97316)" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: "0.85rem", fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ─── Design Card ─────────────────────────────────────────────────────────────

const BC_PREVIEW_DIMS             = { CW: 460,  CH: 270,  PX: 30, PY: 25 };
const FLYER_EXPRESS_PREVIEW_DIMS  = { CW: 460,  CH: 297,  PX: 20, PY: 15 };
const FLYER_PRIME_PREVIEW_DIMS    = { CW: 1700, CH: 1098, PX: 20, PY: 20 };
const PREVIEW_MAX_PX = 280;

function galleryToDims(galleryName: string | undefined): typeof BC_PREVIEW_DIMS {
  const gn = galleryName ?? "";
  if (gn === "Prime Flyers") return FLYER_PRIME_PREVIEW_DIMS;
  if (gn === "Express Flyers") return FLYER_EXPRESS_PREVIEW_DIMS;
  return BC_PREVIEW_DIMS;
}

function parseSvgViewBox(url: string): { vw: number; vh: number } | null {
  try {
    if (!url.startsWith("data:image/svg+xml")) return null;
    const comma = url.indexOf(",");
    if (comma === -1) return null;
    const meta = url.slice(0, comma);
    const enc  = url.slice(comma + 1);
    const raw  = meta.includes(";base64") ? atob(enc) : decodeURIComponent(enc);
    const m = raw.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (!m) return null;
    const parts = m[1].trim().split(/[\s,]+/);
    if (parts.length < 4) return null;
    const vw = parseFloat(parts[2]);
    const vh = parseFloat(parts[3]);
    return vw > 0 && vh > 0 ? { vw, vh } : null;
  } catch { return null; }
}

function getPreviewDims(baseImage?: string) {
  if (!baseImage) return BC_PREVIEW_DIMS;
  const vb = parseSvgViewBox(baseImage);
  if (!vb) return BC_PREVIEW_DIMS;
  // If it's clearly a BC landscape ratio (roughly 1.7:1), use BC dims
  const ratio = vb.vw / vb.vh;
  if (ratio > 1.5 && ratio < 2.0) return BC_PREVIEW_DIMS;
  // Otherwise it's a sticker/label — scale to PREVIEW_MAX_PX, no offset
  const scale = PREVIEW_MAX_PX / Math.max(vb.vw, vb.vh);
  return { CW: Math.round(vb.vw * scale), CH: Math.round(vb.vh * scale), PX: 0, PY: 0 };
}

function loadPreviewImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("img load failed"));
    img.src = src;
  });
}

// Draws gray placeholder rect + camera icon + "Upload Photo" — mirrors generateItemsPNG in the editor.
async function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  ix: number, iy: number, iw: number, ih: number,
) {
  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.fillRect(ix, iy, iw, ih);

  const iconPx = Math.min(iw, ih) * 0.28;
  const cx = ix + iw / 2;
  const cy = iy + ih / 2 - iconPx * 0.2;

  const camSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconPx}" height="${iconPx}" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  try {
    const camImg = await loadPreviewImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(camSvg));
    ctx.drawImage(camImg, cx - iconPx / 2, cy - iconPx / 2, iconPx, iconPx);
  } catch { /* skip icon */ }

  const fontSize = Math.max(8, Math.min(iw * 0.1, 14));
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Upload Photo", cx, cy + iconPx * 0.7 + fontSize);
}

// For designs with no frontAdminItems: parse SVG for data-placeholder="photo" rects and
// draw camera icons on top so the thumbnail matches the 2D editor view.
async function buildSvgWithPlaceholders(svgUrl: string): Promise<string> {
  if (!svgUrl.startsWith("data:image/svg+xml")) return "";
  const comma = svgUrl.indexOf(",");
  if (comma === -1) return "";
  const meta = svgUrl.slice(0, comma);
  const enc  = svgUrl.slice(comma + 1);
  const raw  = meta.includes(";base64") ? atob(enc) : decodeURIComponent(enc);

  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return "";

  const placeholderEls = Array.from(svg.querySelectorAll('rect[data-placeholder="photo"]'));
  if (placeholderEls.length === 0) return "";

  // Derive canvas size from SVG viewBox (capped at 460px wide for card display)
  const vbAttr = svg.getAttribute("viewBox");
  let vw = parseFloat(svg.getAttribute("width") ?? "460");
  let vh = parseFloat(svg.getAttribute("height") ?? "297");
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/);
    if (parts.length >= 4) { vw = parseFloat(parts[2]); vh = parseFloat(parts[3]); }
  }
  const scale = Math.min(1, 460 / vw);
  const CW = Math.round(vw * scale);
  const CH = Math.round(vh * scale);

  const canvas = document.createElement("canvas");
  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  // Draw the full SVG template
  try {
    const svgImg = await loadPreviewImg(svgUrl);
    ctx.drawImage(svgImg, 0, 0, CW, CH);
  } catch { return ""; }

  // Overlay camera icon on each placeholder rect
  for (const el of placeholderEls) {
    const x = parseFloat(el.getAttribute("x")      ?? "0") * scale;
    const y = parseFloat(el.getAttribute("y")      ?? "0") * scale;
    const w = parseFloat(el.getAttribute("width")  ?? "0") * scale;
    const h = parseFloat(el.getAttribute("height") ?? "0") * scale;
    if (w < 4 || h < 4) continue;
    await drawPhotoPlaceholder(ctx, x, y, w, h);
  }

  return canvas.toDataURL("image/png");
}

async function buildDesignPreview(
  items: SerializableItem[],
  bgColor: string,
  baseImage?: string,
  dims?: { CW: number; CH: number; PX: number; PY: number }
): Promise<string> {
  const { CW, CH, PX, PY } = dims ?? BC_PREVIEW_DIMS;
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CW, CH);
  if (baseImage) {
    try {
      const svgImg = await loadPreviewImg(baseImage);
      ctx.drawImage(svgImg, 0, 0, CW, CH);
    } catch { /* skip */ }
  }

  for (const rawItem of items) {
    const item = rawItem as SerializableItem & { shape?: string; italic?: boolean; bold?: boolean; effect?: string; rotation?: number };
    if (item.kind === "text") {
      const text  = item.text ?? "";
      const font  = item.font ?? "Arial";
      const size  = item.size ?? 16;
      const color = item.color ?? "#000000";
      const bold  = item.bold ?? false;
      const italic = item.italic ?? false;
      const align = item.align ?? "left";
      const shape = item.shape ?? "none";

      if (shape === "curve") {
        const w = item.w;
        const r = w * 0.7;
        const h = r - Math.sqrt(r * r - (w / 2) * (w / 2));
        const svgH = Math.max(h + size + 8, size + 12);
        const pathId = `cp-${item.id}`;
        const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${svgH}"><defs><path id="${pathId}" d="M 0 ${r} Q ${w / 2} 0 ${w} ${r}"/></defs><text font-family="${font}" font-size="${size}" font-weight="${bold ? 700 : 400}" font-style="${italic ? "italic" : "normal"}" fill="${color}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escaped}</textPath></text></svg>`;
        try {
          const svgImg = await loadPreviewImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`);
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
      const ty = PY + item.y + size;
      ctx.fillStyle = color;
      ctx.fillText(text, tx, ty);
      ctx.restore();
    } else if (item.kind === "image") {
      const ix = PX + item.x;
      const iy = PY + item.y;
      const iw = item.w;
      const ih = item.h ?? item.w;
      if (item.src) {
        try {
          const img = await loadPreviewImg(item.src);
          ctx.save();
          if (item.rotation) {
            const cx = ix + iw / 2;
            const cy = iy + ih / 2;
            ctx.translate(cx, cy);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          ctx.drawImage(img, ix, iy, iw, ih);
          ctx.restore();
        } catch { /* skip */ }
      } else {
        // Photo placeholder — same render as the 2D editor
        await drawPhotoPlaceholder(ctx, ix, iy, iw, ih);
      }
    }
  }
  return canvas.toDataURL("image/png");
}

function DesignCard({ design, price, galleryName, onSelect }: { design: DesignTemplateItem; price: string; galleryName?: string; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const dotColor = design.frontBgColor && design.frontBgColor !== "#ffffff" ? design.frontBgColor : "#111827";
  const previewDims = galleryToDims(galleryName);

  useEffect(() => {
    // If a pre-rendered overlay PNG exists, use frontImage + frontOverlay directly.
    if (design.frontOverlay) return;
    let cancelled = false;

    if (design.frontAdminItems?.length) {
      // Build canvas from stored admin items (includes photo placeholders with camera icon).
      const dims = galleryToDims(galleryName) ?? getPreviewDims(design.frontImage);
      buildDesignPreview(
        design.frontAdminItems,
        design.frontBgColor ?? "#ffffff",
        design.frontImage,
        dims,
      ).then((src) => { if (!cancelled) setPreviewSrc(src); }).catch(() => {});
    } else if (design.frontImage) {
      // No admin items: parse the SVG for data-placeholder="photo" rects and
      // overlay camera icons so the thumbnail matches the 2D editor view.
      buildSvgWithPlaceholders(design.frontImage)
        .then((src) => { if (!cancelled && src) setPreviewSrc(src); }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [design.frontAdminItems, design.frontBgColor, design.frontImage, design.frontOverlay, galleryName]);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        borderRadius: "16px",
        border: `2px solid ${hovered ? "#06b6d4" : "rgba(0,0,0,0.07)"}`,
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Image area */}
      <div style={{ background: "#f4f4f6", padding: "0.85rem 0.75rem 0.75rem", position: "relative" }}>
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.2)", aspectRatio: `${previewDims.CW} / ${previewDims.CH}` }}>
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={design.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.03)" : "scale(1)" }}
            />
          ) : (
            <>
              <img
                src={design.frontImage}
                alt={design.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.03)" : "scale(1)" }}
              />
              {design.frontOverlay && (
                <img src={design.frontOverlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </>
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
