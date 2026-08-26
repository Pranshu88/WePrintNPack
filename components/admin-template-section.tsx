"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { GalleryTemplate, SinaliteSelectedOption } from "@/lib/template-data";
import { categories, LISTING_ALLOWED_CATEGORIES, LEGACY_SUBPRODUCT_SLUGS, slugifyLabel, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import type { Product } from "@/lib/types";

// Reads an admin-uploaded image and, when it's large (e.g. a raw phone photo),
// downsizes it via canvas before returning a data URL. These data URLs get
// embedded directly in a JSON PATCH body, and Vercel's serverless functions
// reject request bodies over ~4.5MB — an unresized photo silently failed the
// entire save (including unrelated fields like the description) in production.
async function readFile(file: File): Promise<string> {
  const raw: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });

  const MAX_BYTES = 1_500_000; // ~1.5MB, safely under the platform's request-body limit
  if (raw.length <= MAX_BYTES) return raw;

  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Cannot decode image."));
      el.src = raw;
    });
    let maxDim = 1600;
    for (let attempt = 0; attempt < 5; attempt++) {
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxDim) { w = maxDim; h = Math.round(maxDim / ratio); }
      if (h > maxDim) { h = maxDim; w = Math.round(maxDim * ratio); }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return raw;
      ctx.drawImage(img, 0, 0, w, h);
      const resized = canvas.toDataURL("image/jpeg", 0.85);
      if (resized.length <= MAX_BYTES || maxDim <= 400) return resized;
      maxDim = Math.round(maxDim * 0.7);
    }
    return raw;
  } catch {
    return raw;
  }
}

function openBcDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("bc-packages-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function saveBcImage(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openBcDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction("images", "readwrite");
      tx.objectStore("images").put(dataUrl, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* silently ignore */ }
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

async function saveBcImages(id: string, images: string[]): Promise<void> {
  return saveBcImage(`${id}::gallery`, JSON.stringify(images));
}

async function loadBcImages(id: string): Promise<string[]> {
  const raw = await loadBcImage(`${id}::gallery`);
  if (!raw) return [];
  try { const arr = JSON.parse(raw) as unknown; return Array.isArray(arr) ? (arr as string[]) : []; } catch { return []; }
}

const SPEC_KEYS = ["Size", "Color", "Paper Type", "Finishing", "Corners", "Quantities"];
const CORNER_OPTIONS = ["Standard", "Rounded"];

function buildFixedSpecEntries(existing: string[]): { key: string; value: string }[] {
  const byKey: Record<string, string> = {};
  for (const raw of existing) {
    const separator = raw.indexOf(":");
    if (separator === -1) continue;
    const key = raw.slice(0, separator).trim();
    if (SPEC_KEYS.includes(key)) byKey[key] = raw.slice(separator + 1).trim();
  }
  return SPEC_KEYS.map((key) => ({ key, value: byKey[key] ?? "" }));
}

function formatSpecEntry(entry: { key: string; value: string }) {
  return `${entry.key}: ${entry.value}`;
}

function parseSizeValue(value: string): { width: string; length: string } {
  const parts = value.split(/x|×/i).map((p) => p.trim());
  return { width: parts[0] ?? "", length: parts[1] ?? "" };
}

function formatSizeValue(width: string, length: string) {
  // Always keep both sides + the "x" separator, even if one is still empty —
  // otherwise editing one field loses the other on the next keystroke, since
  // parseSizeValue can no longer tell where the split should be.
  return `${width} x ${length}`;
}

function formatPriceValue(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /[$+]/.test(trimmed) ? trimmed : `$${trimmed} + tax`;
}

type Props = {
  products: Product[];
  openAddRef?: React.RefObject<(() => void) | null>;
  /** When set, locks this section to a single category (used by the standalone Apparel/Packaging pages, and by the Templates page itself for Business Printing). */
  onlyCategory?: "t-shirts" | "packaging-box" | "business-cards";
  /** When true, hides that category from the picker (used by the Templates page once the
   * category has its own dedicated page — e.g. T-Shirts moved to /admin/apparel). */
  excludeTshirts?: boolean;
  /** When true, hides Packaging Box from the picker (moved to /admin/packaging). */
  excludePackaging?: boolean;
  /** When set, restricts the Packaging Box "Select Product" dropdown to just these sub-products. */
  packagingBoxOptions?: Array<"pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes">;
};

const PACKAGING_BOX_OPTION_LABELS: Record<"pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes", string> = {
  "pizza-boxes": "Pizza Box",
  "shipping-boxes": "Shipping Box",
  "mailer-boxes": "Pizza Box",
  "square-shipping-boxes": "Square Shipping Box",
};

export function AdminTemplateSection({ products, openAddRef, onlyCategory, excludeTshirts, excludePackaging, packagingBoxOptions }: Props) {
  const router = useRouter();
  const apparelProducts = products.filter((p) =>
    LISTING_ALLOWED_CATEGORIES.has(p.category) &&
    (onlyCategory
      ? p.category === onlyCategory
      : !(excludeTshirts && p.category === "t-shirts") && !(excludePackaging && p.category === "packaging-box"))
  );

  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (onlyCategory === "t-shirts") return "t-shirts";
    if (onlyCategory === "packaging-box") return products.find((p) => p.category === "packaging-box")?.slug ?? "";
    if (onlyCategory === "business-cards") return products.find((p) => p.category === "business-cards")?.slug ?? "";
    try {
      const v = localStorage.getItem("tmpl-selectedSlug");
      const stalePackaging = excludePackaging && products.find((p) => p.slug === v)?.category === "packaging-box";
      if (v && v !== "t-shirts" && !stalePackaging) return v;
    } catch { /* ignore */ }
    const first = apparelProducts[0];
    if (!first) return "";
    return first.category === "t-shirts" ? "t-shirts" : first.slug;
  });
  const [subProduct, setSubProduct] = useState<string>(() => {
    try { const v = localStorage.getItem("tmpl-subProduct"); if (v) return v; } catch { /* ignore */ }
    return "Business Cards";
  });
  const [marketingSubProduct, setMarketingSubProduct] = useState<string>(() => {
    try { const v = localStorage.getItem("tmpl-marketingSubProduct"); if (v) return v; } catch { /* ignore */ }
    return "Posters";
  });
  const [promotionalSubProduct, setPromotionalSubProduct] = useState<string>(() => {
    try { const v = localStorage.getItem("tmpl-promotionalSubProduct"); if (v) return v; } catch { /* ignore */ }
    return "Roll Labels / Stickers";
  });
  const [packagingSubProduct, setPackagingSubProduct] = useState<"pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes">(() => {
    try { const v = localStorage.getItem("tmpl-packagingSubProduct"); if (v === "pizza-boxes" || v === "shipping-boxes" || v === "mailer-boxes" || v === "square-shipping-boxes") return v; } catch { /* ignore */ }
    return "pizza-boxes";
  });
  const [tshirtSubProduct, setTshirtSubProduct] = useState<string>(() => {
    try { const v = localStorage.getItem("tmpl-tshirtSubProduct"); if (v) return v; } catch { /* ignore */ }
    return "Round Collar T-Shirt";
  });

  useEffect(() => { try { localStorage.setItem("tmpl-selectedSlug", selectedSlug); } catch { /* ignore */ } }, [selectedSlug]);
  useEffect(() => { try { localStorage.setItem("tmpl-subProduct", subProduct); } catch { /* ignore */ } }, [subProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-marketingSubProduct", marketingSubProduct); } catch { /* ignore */ } }, [marketingSubProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-promotionalSubProduct", promotionalSubProduct); } catch { /* ignore */ } }, [promotionalSubProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-packagingSubProduct", packagingSubProduct); } catch { /* ignore */ } }, [packagingSubProduct]);
  useEffect(() => {
    if (packagingBoxOptions && !packagingBoxOptions.includes(packagingSubProduct)) {
      setPackagingSubProduct(packagingBoxOptions[0]);
    }
  }, [packagingBoxOptions, packagingSubProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-tshirtSubProduct", tshirtSubProduct); } catch { /* ignore */ } }, [tshirtSubProduct]);

  const isTshirts = selectedSlug === "t-shirts";
  const selectedProduct = products.find((p) => p.slug === selectedSlug);
  const tshirtProduct = products.find((p) => p.category === "t-shirts");
  const isBusinessPrinting = selectedProduct?.category === "business-cards";
  const isMarketingMaterial = selectedProduct?.category === "marketing-material";
  const isPackagingBox = selectedProduct?.category === "packaging-box";
  const isPromotionalProducts = selectedProduct?.category === "promotional-products";

  const businessPrintingOptions = CATEGORY_SUBPRODUCT_OPTIONS["business-cards"];
  const marketingOptions = CATEGORY_SUBPRODUCT_OPTIONS["marketing-material"];
  const promotionalOptions = CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"];
  const tshirtOptions = CATEGORY_SUBPRODUCT_OPTIONS["t-shirts"];

  // `products` arrives asynchronously from the parent page's own /api/products fetch —
  // if this component first rendered before that resolved, selectedSlug's initializer
  // ran against an empty array and locked onto "". Recover once real data shows up.
  useEffect(() => {
    if (selectedSlug || products.length === 0) return;
    if (onlyCategory === "t-shirts") { setSelectedSlug("t-shirts"); return; }
    if (onlyCategory === "packaging-box" || onlyCategory === "business-cards") {
      setSelectedSlug(products.find((p) => p.category === onlyCategory)?.slug ?? "");
      return;
    }
    const first = apparelProducts[0];
    setSelectedSlug(first ? (first.category === "t-shirts" ? "t-shirts" : first.slug) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    if (isBusinessPrinting && !businessPrintingOptions.includes(subProduct)) setSubProduct(businessPrintingOptions[0]);
    if (isMarketingMaterial && !marketingOptions.includes(marketingSubProduct)) setMarketingSubProduct(marketingOptions[0]);
    if (isPromotionalProducts && !promotionalOptions.includes(promotionalSubProduct)) setPromotionalSubProduct(promotionalOptions[0]);
    if (isTshirts && !tshirtOptions.includes(tshirtSubProduct)) setTshirtSubProduct(tshirtOptions[0]);
    // T-Shirts moved to its own page (/admin/apparel) — if a stale "t-shirts" selection was
    // persisted from before the move, fall back to the first still-available category here.
    if (excludeTshirts && selectedSlug === "t-shirts") setSelectedSlug(apparelProducts[0]?.slug ?? "");
    // Packaging Box moved to its own page (/admin/packaging) — same fallback.
    if (excludePackaging && isPackagingBox) setSelectedSlug(apparelProducts[0]?.slug ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const packagingSlugMap: Record<string, string> = { "pizza-boxes": "pizza-boxes", "shipping-boxes": "shipping-boxes", "mailer-boxes": "mailer-boxes", "square-shipping-boxes": "square-shipping-boxes" };
  const effectiveSlug = isBusinessPrinting
    ? (LEGACY_SUBPRODUCT_SLUGS[subProduct] ?? (subProduct === "Business Cards" ? selectedProduct?.slug ?? selectedSlug : slugifyLabel(subProduct)))
    : isMarketingMaterial
      ? (LEGACY_SUBPRODUCT_SLUGS[marketingSubProduct] ?? slugifyLabel(marketingSubProduct))
      : isPackagingBox
        ? packagingSlugMap[packagingSubProduct]
        : isPromotionalProducts
          ? (LEGACY_SUBPRODUCT_SLUGS[promotionalSubProduct] ?? slugifyLabel(promotionalSubProduct))
          : isTshirts
            ? (LEGACY_SUBPRODUCT_SLUGS[tshirtSubProduct] ?? slugifyLabel(tshirtSubProduct))
            : selectedSlug;
  const isBusinessCards = isBusinessPrinting && subProduct === "Business Cards";
  const selectedProductName = isBusinessPrinting
    ? subProduct
    : isMarketingMaterial
      ? marketingSubProduct
      : isPackagingBox
        ? ({ "pizza-boxes": "Pizza Box", "shipping-boxes": "Shipping Box", "mailer-boxes": "Pizza Box", "square-shipping-boxes": "Square Shipping Box" }[packagingSubProduct] ?? "Packaging Box")
        : isPromotionalProducts
          ? promotionalSubProduct
          : isTshirts
            ? tshirtSubProduct
            : (selectedProduct?.name ?? "");

  const [galleryList, setGalleryList] = useState<GalleryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [gName, setGName] = useState("");
  const [gImage, setGImage] = useState("");
  const [gImageName, setGImageName] = useState("");
  const [gSpecs, setGSpecs] = useState<{ key: string; value: string }[]>([]);
  const [gPrice, setGPrice] = useState("");
  const gFileRef = useRef<HTMLInputElement>(null);

  // Per-gallery specs/price for T-shirt templates
  const [tshirtMeta, setTshirtMeta] = useState<Record<string, { price: string; specs: string[] }>>(() => {
    try { const s = localStorage.getItem("tmpl-tshirtMeta"); return s ? (JSON.parse(s) as Record<string, { price: string; specs: string[] }>) : {}; } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("tmpl-tshirtMeta", JSON.stringify(tshirtMeta)); } catch { /* ignore */ } }, [tshirtMeta]);

  const TSHIRT_DEFAULT_SPECS = ["Size: S, M, L, XL, XXL (Available Sizes)", "Texture/Fabric: 100% Cotton, Bio-Washed, Soft & Comfortable"];

  useEffect(() => {
    if (openAddRef) openAddRef.current = openAddModal;
  });

  useEffect(() => {
    if (!effectiveSlug) return;
    void loadTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSlug]);

  async function loadTemplates() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/products/${effectiveSlug}/templates?admin=1`, { cache: "no-store" });
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
    const meta = tshirtMeta[g.id];
    setGPrice(meta?.price ?? "");
    setGSpecs(buildFixedSpecEntries(meta?.specs?.length ? meta.specs : TSHIRT_DEFAULT_SPECS));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingGalleryId(null);
    setGName(""); setGImage(""); setGImageName(""); setGSpecs([]); setGPrice("");
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
      const gSpecsText = gSpecs.filter((s) => s.value.trim()).map(formatSpecEntry);
      if (editingGalleryId) {
        await fetch(`/api/products/${effectiveSlug}/templates/${editingGalleryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gName,
            previewImage: gImage,
            ...(isTshirts && { price: gPrice.trim(), specs: gSpecsText }),
          }),
        });
        // Also cache in localStorage for instant display
        if (isTshirts) {
          setTshirtMeta((prev) => ({ ...prev, [editingGalleryId]: { price: gPrice.trim(), specs: gSpecsText } }));
        }
        flash("Gallery template updated.");
      } else {
        await fetch(`/api/products/${effectiveSlug}/templates`, {
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
    await fetch(`/api/products/${effectiveSlug}/templates/${id}`, { method: "DELETE" });
    flash("Deleted.");
    await loadTemplates();
  }

  const BC_DEFAULTS = [
    { id: "bc-standard", title: "Business Cards", price: "$79 + tax", specs: ['Size: 3.5" x 2"', 'Print-ready file size with bleed: 3.75" x 2.25"', "Stock: 14pt Matte or Gloss", "Full colour", "Double-sided included", "Free basic design included"], image: "" },
    { id: "bc-premium", title: "Premium Business Cards", price: "$119 + tax", specs: ["16pt Matte/Silk", "Double-sided", "Premium finish"], image: "" },
    { id: "bc-luxury", title: "Luxury Business Cards", price: "From $179 + tax", specs: ["Soft Touch / Suede / Spot UV / Raised UV / Painted Edge", "Quote required based on finish"], image: "" },
  ];

  const FLY_DEFAULTS = [
    { id: "fly-standard", title: "Express Flyers", price: "$159 + tax", specs: ['Size: 8.5" × 5.5"', "100lb Gloss Text", "Full colour", "Double-sided"], image: "" },
    { id: "fly-premium", title: "Prime Flyers", price: "$329 + tax", specs: ['Size: 8.5" × 11"', "100lb Gloss Text", "Full colour", "Double-sided"], image: "" },
  ];

  const isFlyers = isBusinessPrinting && subProduct === "Flyers";
  const isBanners      = isMarketingMaterial && marketingSubProduct === "Banners";
  const isPosters      = isMarketingMaterial && marketingSubProduct === "Posters";
  const isYardSigns    = isMarketingMaterial && marketingSubProduct === "Coroplast Signs & Yard Signs";
  const isStickers     = isPromotionalProducts && promotionalSubProduct === "Roll Labels / Stickers";
  const isMailerBoxes         = isPackagingBox && packagingSubProduct === "mailer-boxes";
  const isShippingBoxes       = isPackagingBox && packagingSubProduct === "shipping-boxes";
  const isPizzaBoxes          = isPackagingBox && packagingSubProduct === "pizza-boxes";
  const isSquareShippingBoxes = isPackagingBox && packagingSubProduct === "square-shipping-boxes";

  const BANNER_PRICE_SPECS: Record<string, { price: string; specs: string[] }> = {
    "Vinyl Banner":            { price: "From $109 + tax", specs: ["Popular size: 3' × 6'", "Hem & grommets included", "Indoor/outdoor use"] },
    "Large Outdoor Banner":    { price: "$179 + tax",      specs: ["Size: 4' × 8'", "Heavy-duty vinyl", "Hem & grommets included"] },
    "Standard Roll-Up Banner": { price: "$229 + tax",      specs: ['Size: 33" × 81"', "Stand included", "Carrying bag included", "Full colour print"] },
    "Premium Roll-Up Banner":  { price: "$279 + tax",      specs: ["Premium material", "Stand + bag included"] },
  };

  const POSTER_PRICE_SPECS: Record<string, { price: string; specs: string[] }> = {
    "Small Posters": { price: "$109 + tax", specs: ['Size: 11" × 17"', "Full colour", "Gloss stock"] },
    "Large Posters": { price: "$139 + tax", specs: ['Size: 18" × 24"', "Full colour"] },
  };

  const YARDSIGN_PRICE_SPECS: Record<string, { price: string; specs: string[] }> = {
    "Elite Yard Sign":    { price: "$189 + tax", specs: ['Size: 18" × 24"', "4mm coroplast", "Full colour", "H-stakes included"] },
    "Business Yard Sign": { price: "$379 + tax", specs: ['Size: 18" × 24"', "4mm coroplast", "H-stakes included"] },
  };

  const STICKER_PRICE_SPECS: Record<string, { price: string; specs: string[] }> = {
    "Die-Cut Stickers": { price: "$89 + tax",  specs: ["Custom shape", "Weatherproof material", "Full colour"] },
    "Product Labels":   { price: "$139 + tax", specs: ["Custom label size", "Full colour", "Quote may vary by size/material"] },
  };

  const MAILER_BOX_DEFAULTS: PricingPackage[] = [
    { id: "mb-standard", title: "Pizza Box", price: "$200 + tax", specs: ["Material: Corrugated Board (3 Ply / 5 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 20", "Full colour print"], image: "", images: [] },
  ];

  const SHIPPING_BOX_DEFAULTS: PricingPackage[] = [
    { id: "sb-standard", title: "Shipping Box", price: "$220 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 40", "Full colour print"], image: "", images: [] },
  ];

  const PIZZA_BOX_DEFAULTS: PricingPackage[] = [
    { id: "pb-standard", title: "Pizza Box", price: "$150 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 40", "Full colour print"], image: "", images: [] },
  ];

  const SQUARE_SHIPPING_BOX_DEFAULTS: PricingPackage[] = [
    { id: "ssb-standard", title: "Square Shipping Box", price: "$230 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Square dimensions customizable (L × W × H)", "Quantity: 40", "Full colour print"], image: "", images: [] },
  ];

  type PricingPackage = { id: string; title: string; price: string; specs: string[]; image: string; images?: string[] };

  const [bcPackages, setBcPackages] = useState<PricingPackage[]>(() => {
    try {
      const saved = localStorage.getItem("bc-packages-list");
      if (saved) return JSON.parse(saved) as PricingPackage[];
    } catch { /* ignore */ }
    return BC_DEFAULTS;
  });

  // Load images from IndexedDB after mount
  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        bcPackages.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setBcPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          return found?.image ? { ...pkg, image: found.image } : pkg;
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save package list (minus images, which live in IndexedDB) to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("bc-packages-list", JSON.stringify(bcPackages.map(({ id, title, price, specs }) => ({ id, title, price, specs, image: "" }))));
    } catch { /* ignore */ }
  }, [bcPackages]);

  const [flyPackages, setFlyPackages] = useState<PricingPackage[]>(() => {
    try {
      const saved = localStorage.getItem("fly-packages-list");
      if (saved) return JSON.parse(saved) as PricingPackage[];
    } catch { /* ignore */ }
    return FLY_DEFAULTS;
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        flyPackages.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setFlyPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          return found?.image ? { ...pkg, image: found.image } : pkg;
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("fly-packages-list", JSON.stringify(flyPackages.map(({ id, title, price, specs }) => ({ id, title, price, specs, image: "" }))));
    } catch { /* ignore */ }
  }, [flyPackages]);

  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [addPkgTarget, setAddPkgTarget] = useState<"bc" | "fly" | "generic" | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addImage, setAddImage] = useState("");
  const [addImageName, setAddImageName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addSpecs, setAddSpecs] = useState(buildFixedSpecEntries([]));
  const [addErrors, setAddErrors] = useState<Record<string, boolean>>({});
  const addImageRef = useRef<HTMLInputElement>(null);

  function openAddPackageModal(target: "bc" | "fly" | "generic") {
    setAddPkgTarget(target);
    setAddTitle(""); setAddPrice(""); setAddImage(""); setAddImageName(""); setAddDescription("");
    setAddSpecs(buildFixedSpecEntries([]));
    setAddErrors({});
    setAddPkgOpen(true);
  }

  async function handleAddImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setAddImage(await readFile(file));
    setAddImageName(file.name);
  }

  async function saveAddPackage() {
    const sizeEntry = addSpecs.find((s) => s.key === "Size");
    const sizeValue = sizeEntry ? parseSizeValue(sizeEntry.value) : { width: "", length: "" };
    const colorEntry = addSpecs.find((s) => s.key === "Color");
    const errors: Record<string, boolean> = {
      title: !addTitle.trim(),
      price: !addPrice.trim(),
      image: !addImage,
      size: !sizeValue.width.trim() || !sizeValue.length.trim(),
      color: !colorEntry?.value.trim(),
    };
    if (Object.values(errors).some(Boolean)) { setAddErrors(errors); return; }
    setAddErrors({});
    const title = addTitle.trim();
    const price = formatPriceValue(addPrice);
    const specs = addSpecs.filter((s) => s.value.trim()).map(formatSpecEntry);

    if (addPkgTarget === "generic") {
      // Any product without its own bespoke pricing-card UI — create a real
      // gallery template, then store price/specs directly on that same
      // template (the API already supports it) so Edit reads back the same data.
      try {
        const res = await fetch(`/api/products/${effectiveSlug}/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: title, previewImage: addImage }),
        });
        const data = (await res.json()) as { template?: { id: string }; error?: string };
        if (!res.ok || !data.template) throw new Error(data.error ?? "Failed to create.");
        await fetch(`/api/products/${effectiveSlug}/templates/${data.template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price, specs, description: addDescription.trim() }),
        });
        setAddPkgOpen(false);
        flash("Gallery template added.");
        await loadTemplates();
      } catch {
        flash("Save failed.", true);
      }
      return;
    }

    const id = `${addPkgTarget}-custom-${Date.now()}`;
    const newPkg: PricingPackage = { id, title, price, specs, image: addImage };
    void saveBcImage(id, addImage);
    if (addPkgTarget === "bc") setBcPackages((prev) => [...prev, newPkg]);
    else setFlyPackages((prev) => [...prev, newPkg]);
    setAddPkgOpen(false);
    flash("Gallery template added.");
  }

  const [mailerBoxPackages, setMailerBoxPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("mb-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return MAILER_BOX_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return MAILER_BOX_DEFAULTS;
    }
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        MAILER_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id), images: await loadBcImages(d.id) }))
      );
      setMailerBoxPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          if (!found) return pkg;
          return { ...pkg, ...(found.image ? { image: found.image } : {}), ...(found.images.length ? { images: found.images } : {}) };
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of mailerBoxPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("mb-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [mailerBoxPackages]);

  const [shippingBoxPackages, setShippingBoxPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("sb-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return SHIPPING_BOX_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return SHIPPING_BOX_DEFAULTS;
    }
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        SHIPPING_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id), images: await loadBcImages(d.id) }))
      );
      setShippingBoxPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          if (!found) return pkg;
          return { ...pkg, ...(found.image ? { image: found.image } : {}), ...(found.images.length ? { images: found.images } : {}) };
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of shippingBoxPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("sb-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [shippingBoxPackages]);

  const [pizzaBoxPackages, setPizzaBoxPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("pizzabox-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return PIZZA_BOX_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return PIZZA_BOX_DEFAULTS;
    }
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        PIZZA_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id), images: await loadBcImages(d.id) }))
      );
      setPizzaBoxPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          if (!found) return pkg;
          return { ...pkg, ...(found.image ? { image: found.image } : {}), ...(found.images.length ? { images: found.images } : {}) };
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of pizzaBoxPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("pizzabox-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [pizzaBoxPackages]);

  const [squareShippingBoxPackages, setSquareShippingBoxPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("ssb-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return SQUARE_SHIPPING_BOX_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return SQUARE_SHIPPING_BOX_DEFAULTS;
    }
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        SQUARE_SHIPPING_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id), images: await loadBcImages(d.id) }))
      );
      setSquareShippingBoxPackages((prev) =>
        prev.map((pkg) => {
          const found = entries.find((e) => e.id === pkg.id);
          if (!found) return pkg;
          return { ...pkg, ...(found.image ? { image: found.image } : {}), ...(found.images.length ? { images: found.images } : {}) };
        })
      );
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of squareShippingBoxPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("ssb-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [squareShippingBoxPackages]);

  const [bannerMeta, setBannerMeta] = useState<Record<string, { price: string; specs: string[] }>>(() => {
    try {
      const saved = localStorage.getItem("banner-packages-meta");
      if (!saved) return {};
      const parsed = JSON.parse(saved) as Record<string, { price: string; specs: string[] }>;
      // Always use canonical specs from BANNER_PRICE_SPECS so stale sizes don't persist
      for (const id of Object.keys(parsed)) {
        parsed[id] = { price: parsed[id].price, specs: [] };
      }
      return parsed;
    } catch { return {}; }
  });

  const [bannerImages, setBannerImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try { localStorage.setItem("banner-packages-meta", JSON.stringify(bannerMeta)); }
    catch { /* ignore */ }
  }, [bannerMeta]);

  useEffect(() => {
    if (!isBanners || galleryList.length === 0) return;
    void (async () => {
      const entries = await Promise.all(galleryList.map(async (g) => ({ id: g.id, image: await loadBcImage(g.id) })));
      setBannerImages((prev) => {
        const next = { ...prev };
        for (const e of entries) if (e.image) next[e.id] = e.image;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBanners, galleryList]);

  const [posterMeta, setPosterMeta] = useState<Record<string, { price: string; specs: string[] }>>(() => {
    try {
      const saved = localStorage.getItem("poster-packages-meta");
      if (!saved) return {};
      const parsed = JSON.parse(saved) as Record<string, { price: string; specs: string[] }>;
      // Always use canonical specs from POSTER_PRICE_SPECS (wipe saved specs so stale sizes like 12"×24" don't persist)
      for (const id of Object.keys(parsed)) {
        parsed[id] = { price: parsed[id].price, specs: [] };
      }
      return parsed;
    } catch { return {}; }
  });

  const [posterImages, setPosterImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try { localStorage.setItem("poster-packages-meta", JSON.stringify(posterMeta)); }
    catch { /* ignore */ }
  }, [posterMeta]);

  useEffect(() => {
    if (!isPosters || galleryList.length === 0) return;
    void (async () => {
      const entries = await Promise.all(galleryList.map(async (g) => ({ id: g.id, image: await loadBcImage(g.id) })));
      setPosterImages((prev) => {
        const next = { ...prev };
        for (const e of entries) if (e.image) next[e.id] = e.image;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPosters, galleryList]);

  const [yardSignMeta, setYardSignMeta] = useState<Record<string, { price: string; specs: string[] }>>(() => {
    try {
      const saved = localStorage.getItem("yardsign-packages-meta");
      return saved ? (JSON.parse(saved) as Record<string, { price: string; specs: string[] }>) : {};
    } catch { return {}; }
  });

  const [yardSignImages, setYardSignImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try { localStorage.setItem("yardsign-packages-meta", JSON.stringify(yardSignMeta)); }
    catch { /* ignore */ }
  }, [yardSignMeta]);

  useEffect(() => {
    if (!isYardSigns || galleryList.length === 0) return;
    void (async () => {
      const entries = await Promise.all(galleryList.map(async (g) => ({ id: g.id, image: await loadBcImage(g.id) })));
      setYardSignImages((prev) => {
        const next = { ...prev };
        for (const e of entries) if (e.image) next[e.id] = e.image;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYardSigns, galleryList]);

  const [stickerMeta, setStickerMeta] = useState<Record<string, { price: string; specs: string[] }>>(() => {
    try {
      const saved = localStorage.getItem("sticker-packages-meta");
      return saved ? (JSON.parse(saved) as Record<string, { price: string; specs: string[] }>) : {};
    } catch { return {}; }
  });

  const [stickerImages, setStickerImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try { localStorage.setItem("sticker-packages-meta", JSON.stringify(stickerMeta)); }
    catch { /* ignore */ }
  }, [stickerMeta]);

  useEffect(() => {
    if (!isStickers || galleryList.length === 0) return;
    void (async () => {
      const entries = await Promise.all(galleryList.map(async (g) => ({ id: g.id, image: await loadBcImage(g.id) })));
      setStickerImages((prev) => {
        const next = { ...prev };
        for (const e of entries) if (e.image) next[e.id] = e.image;
        return next;
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStickers, galleryList]);

  return (
    <>
    <div className="panel admin-list-panel" id="product-templates" style={{ marginTop: "2rem" }}>

      {/* Panel header */}
      <div className="panel-heading admin-list-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h2>Product Templates</h2>
          <span>Gallery templates per product</span>
        </div>
      </div>

      {/* Product selector */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
        {!onlyCategory && (
          <>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select category
            </label>
            {apparelProducts.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No products found. Add products in the Product Listing.</p>
            ) : (
              <select
                value={selectedSlug}
                onChange={(e) => { setSelectedSlug(e.target.value); setPackagingSubProduct("pizza-boxes"); }}
                style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
              >
                {(() => {
                  const opts: { value: string; label: string }[] = [];
                  let tshirtsAdded = false;
                  for (const p of apparelProducts) {
                    if (p.category === "t-shirts") {
                      if (!tshirtsAdded) { opts.push({ value: "t-shirts", label: "T-Shirts" }); tshirtsAdded = true; }
                    } else if (p.category === "flyers" || p.slug === "bold-flyers") {
                      // Flyers managed via Business Printing → Flyers sub-tab
                    } else {
                      opts.push({ value: p.slug, label: `${p.name} (${categories.find(c => c.slug === p.category)?.name ?? p.category})` });
                    }
                  }
                  return opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>);
                })()}
              </select>
            )}
          </>
        )}
        {isBusinessPrinting && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Category
            </label>
            <select
              value={subProduct}
              onChange={(e) => setSubProduct(e.target.value)}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              {businessPrintingOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        {isMarketingMaterial && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              value={marketingSubProduct}
              onChange={(e) => setMarketingSubProduct(e.target.value)}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              {marketingOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        {isPackagingBox && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              value={packagingSubProduct}
              onChange={(e) => setPackagingSubProduct(e.target.value as "pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes")}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              {(packagingBoxOptions ?? ["pizza-boxes", "shipping-boxes", "mailer-boxes", "square-shipping-boxes"]).map((opt) => (
                <option key={opt} value={opt}>{PACKAGING_BOX_OPTION_LABELS[opt]}</option>
              ))}
            </select>
          </div>
        )}
        {isPromotionalProducts && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              value={promotionalSubProduct}
              onChange={(e) => setPromotionalSubProduct(e.target.value)}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              {promotionalOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
        {isTshirts && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              value={tshirtSubProduct}
              onChange={(e) => setTshirtSubProduct(e.target.value)}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              {tshirtOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Feedback */}
      {(msg || err) && (
        <div style={{ margin: "1rem 1.5rem 0", padding: "0.75rem 1rem", borderRadius: "8px", background: err ? "#fef2f2" : "#f0fdf4", border: `1px solid ${err ? "#fca5a5" : "#86efac"}`, color: err ? "#b91c1c" : "#15803d", fontSize: "0.875rem", fontWeight: 600 }}>
          {err || msg}
        </div>
      )}

      {/* Business Cards pricing cards */}
      {isBusinessCards ? (() => {
        // Legacy non-imported tiers ("Business Cards" / "Premium Business Cards" /
        // "Luxury Business Cards") — kept in the DB (their designs are still linked
        // elsewhere) but hidden from this admin grid since they no longer come from
        // the live Sinalite catalog sync.
        const HIDDEN_LEGACY_BC_IDS = new Set(["c1rpi76mpgy241j", "dz5k2qpmpgxytkp", "lx0001mpgy31cn"]);
        const visibleGalleryList = galleryList.filter((g) => !HIDDEN_LEGACY_BC_IDS.has(g.id));
        // Every Sinalite-imported gallery row (any sinaliteId) is shown with its real
        // name/price/specs from the DB — the old localStorage-only virtual placeholders
        // for the original 3 tiers are skipped in favor of the full imported catalogue.
        const sinaliteBcRows = visibleGalleryList
          .filter((g): g is GalleryTemplate => !!g.sinaliteId)
          .sort((a, b) => Number(a.sinaliteId) - Number(b.sinaliteId));
        const sinaliteBcRowIds = new Set(sinaliteBcRows.map((g) => g.id));
        const extraPackages = bcPackages.filter((pkg) => !["bc-standard", "bc-premium", "bc-luxury"].includes(pkg.id));

        return (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {sinaliteBcRows.map((g) => (
              <BusinessCardPricingCard
                key={g.id}
                title={g.name}
                price={g.price || "$0 + tax"}
                specs={g.specs ?? []}
                image={g.previewImage}
                images={g.images}
                description={g.description ?? ""}
                sinaliteId={g.sinaliteId}
                sinaliteOptions={g.sinaliteOptions}
                onBrowseDesigns={() => router.push(`/admin/templates/premium-business-cards/${g.id}`)}
                onAddGuideline={() => router.push(`/admin/guidelines?slug=premium-business-cards&sinaliteId=${g.sinaliteId ?? ""}`)}
                onEdit={(updated) => {
                  return fetch(`/api/products/premium-business-cards/templates/${g.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: updated.title, previewImage: updated.image, images: updated.images, price: updated.price, specs: updated.specs, description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                  }).then(() => loadTemplates()).catch(() => {});
                }}
                onDelete={() => void deleteGallery(g.id)}
              />
            ))}
            {extraPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                description={visibleGalleryList.find((g) => g.name === pkg.title)?.description ?? ""}
                onBrowseDesigns={() => router.push(`/admin/templates/premium-business-cards/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=premium-business-cards")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setBcPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                  const realId = visibleGalleryList.find((g) => g.name === updated.title)?.id ?? pkg.id;
                  await fetch(`/api/products/premium-business-cards/templates/${realId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ price: updated.price, specs: updated.specs, previewImage: updated.image, images: updated.images, description: updated.description }),
                  }).then(() => loadTemplates()).catch(() => {});
                }}
                onDelete={() => setBcPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
            {visibleGalleryList
              .filter((g) => !sinaliteBcRowIds.has(g.id) && !bcPackages.some((p) => p.title === g.name))
              .map((g) => (
                <BusinessCardPricingCard
                  key={g.id}
                  title={g.name}
                  price={g.price || "$0 + tax"}
                  specs={g.specs ?? []}
                  image={g.previewImage}
                  images={g.images}
                  description={g.description ?? ""}
                  sinaliteId={g.sinaliteId}
                  sinaliteOptions={g.sinaliteOptions}
                  onBrowseDesigns={() => router.push(`/admin/templates/premium-business-cards/${g.id}`)}
                  onAddGuideline={() => router.push(`/admin/guidelines?slug=premium-business-cards&sinaliteId=${g.sinaliteId ?? ""}`)}
                  onEdit={(updated) => {
                    return fetch(`/api/products/premium-business-cards/templates/${g.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: updated.title, previewImage: updated.image, images: updated.images, price: updated.price, specs: updated.specs, description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                    }).then(() => loadTemplates()).catch(() => {});
                  }}
                  onDelete={() => void deleteGallery(g.id)}
                />
              ))}
          </div>
        </div>
        );
      })() : isFlyers ? (() => {
        // The 2 default tiers (Express/Prime Flyers) are now backed by real Sinalite-imported
        // gallery rows (sinalite ids 37, 38) — always shown with their real name/price/specs from
        // the DB, so the old localStorage-only virtual placeholders for these 2 are skipped.
        const SINALITE_FLYER_TIER_IDS = ["37", "38"];
        const sinaliteFlyerRows = SINALITE_FLYER_TIER_IDS
          .map((id) => galleryList.find((g) => g.sinaliteId === id))
          .filter((g): g is GalleryTemplate => !!g);
        const sinaliteFlyerRowIds = new Set(sinaliteFlyerRows.map((g) => g.id));
        const extraPackages = flyPackages.filter((pkg) => !["fly-standard", "fly-premium"].includes(pkg.id));

        return (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {sinaliteFlyerRows.map((g) => (
              <BusinessCardPricingCard
                key={g.id}
                title={g.name}
                price={g.price || "$0 + tax"}
                specs={g.specs ?? []}
                image={g.previewImage}
                images={g.images}
                description={g.description ?? ""}
                sinaliteId={g.sinaliteId}
                sinaliteOptions={g.sinaliteOptions}
                onBrowseDesigns={() => router.push(`/admin/templates/bold-flyers/${g.id}`)}
                onAddGuideline={() => router.push(`/admin/guidelines?slug=bold-flyers&sinaliteId=${g.sinaliteId ?? ""}`)}
                onEdit={(updated) => {
                  return fetch(`/api/products/bold-flyers/templates/${g.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: updated.title, previewImage: updated.image, images: updated.images, price: updated.price, specs: updated.specs, description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                  }).then(() => loadTemplates()).catch(() => {});
                }}
                onDelete={() => void deleteGallery(g.id)}
              />
            ))}
            {extraPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                description={galleryList.find((g) => g.name === pkg.title)?.description ?? ""}
                onBrowseDesigns={() => router.push(`/admin/templates/bold-flyers/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=bold-flyers")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setFlyPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                  const realId = galleryList.find((g) => g.name === updated.title)?.id ?? pkg.id;
                  await fetch(`/api/products/bold-flyers/templates/${realId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ price: updated.price, specs: updated.specs, previewImage: updated.image, images: updated.images, description: updated.description }),
                  }).then(() => loadTemplates()).catch(() => {});
                }}
                onDelete={() => setFlyPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
            {galleryList
              .filter((g) => !sinaliteFlyerRowIds.has(g.id) && !flyPackages.some((p) => p.title === g.name))
              .map((g) => (
                <BusinessCardPricingCard
                  key={g.id}
                  title={g.name}
                  price={g.price || "$0 + tax"}
                  specs={g.specs ?? []}
                  image={g.previewImage}
                  images={g.images}
                  description={g.description ?? ""}
                  sinaliteId={g.sinaliteId}
                  sinaliteOptions={g.sinaliteOptions}
                  onBrowseDesigns={() => router.push(`/admin/templates/bold-flyers/${g.id}`)}
                  onAddGuideline={() => router.push(`/admin/guidelines?slug=bold-flyers&sinaliteId=${g.sinaliteId ?? ""}`)}
                  onEdit={(updated) => {
                    return fetch(`/api/products/bold-flyers/templates/${g.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: updated.title, previewImage: updated.image, images: updated.images, price: updated.price, specs: updated.specs, description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                    }).then(() => loadTemplates()).catch(() => {});
                  }}
                  onDelete={() => void deleteGallery(g.id)}
                />
              ))}
          </div>
        </div>
        );
      })() : isStickers ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {galleryList.map((g) => {
                const defaults = STICKER_PRICE_SPECS[g.name] ?? { price: "", specs: [] };
                const meta = stickerMeta[g.id];
                const price = meta?.price || defaults.price;
                const specs = (meta?.specs ?? []).length > 0 ? (meta?.specs ?? []) : defaults.specs;
                const image = stickerImages[g.id] || g.previewImage;
                return (
                  <BusinessCardPricingCard
                    key={g.id}
                    title={g.name}
                    price={price}
                    specs={specs}
                    image={image}
                    description={g.description ?? ""}
                    sinaliteId={g.sinaliteId}
                    sinaliteOptions={g.sinaliteOptions}
                    onBrowseDesigns={() => router.push(`/admin/templates/stickers-and-labels/${g.id}`)}
                    onAddGuideline={() => router.push(`/admin/guidelines?slug=stickers-and-labels&sinaliteId=${g.sinaliteId ?? ""}`)}
                    onEdit={async (updated) => {
                      await saveBcImage(g.id, updated.image);
                      setStickerImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setStickerMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                      await fetch(`/api/products/stickers-and-labels/templates/${g.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                      }).then(() => loadTemplates()).catch(() => {});
                    }}
                    onDelete={() => void deleteGallery(g.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : isYardSigns ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {galleryList.map((g) => {
                const defaults = YARDSIGN_PRICE_SPECS[g.name] ?? { price: "", specs: [] };
                const meta = yardSignMeta[g.id];
                const price = meta?.price || defaults.price;
                const specs = (meta?.specs ?? []).length > 0 ? (meta?.specs ?? []) : defaults.specs;
                const image = yardSignImages[g.id] || g.previewImage;
                return (
                  <BusinessCardPricingCard
                    key={g.id}
                    title={g.name}
                    price={price}
                    specs={specs}
                    image={image}
                    description={g.description ?? ""}
                    sinaliteId={g.sinaliteId}
                    sinaliteOptions={g.sinaliteOptions}
                    onBrowseDesigns={() => router.push(`/admin/templates/yard-signs/${g.id}`)}
                    onAddGuideline={() => router.push(`/admin/guidelines?slug=yard-signs&sinaliteId=${g.sinaliteId ?? ""}`)}
                    onEdit={async (updated) => {
                      await saveBcImage(g.id, updated.image);
                      setYardSignImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setYardSignMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                      await fetch(`/api/products/yard-signs/templates/${g.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                      }).then(() => loadTemplates()).catch(() => {});
                    }}
                    onDelete={() => void deleteGallery(g.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : isPosters ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {galleryList.map((g) => {
                const defaults = POSTER_PRICE_SPECS[g.name] ?? { price: "", specs: [] };
                const meta = posterMeta[g.id];
                const price = meta?.price || defaults.price;
                const specs = (meta?.specs ?? []).length > 0 ? (meta?.specs ?? []) : defaults.specs;
                const image = posterImages[g.id] || g.previewImage;
                return (
                  <BusinessCardPricingCard
                    key={g.id}
                    title={g.name}
                    price={price}
                    specs={specs}
                    image={image}
                    description={g.description ?? ""}
                    sinaliteId={g.sinaliteId}
                    sinaliteOptions={g.sinaliteOptions}
                    onBrowseDesigns={() => router.push(`/admin/templates/posters/${g.id}`)}
                    onAddGuideline={() => router.push(`/admin/guidelines?slug=posters&sinaliteId=${g.sinaliteId ?? ""}`)}
                    onEdit={async (updated) => {
                      await saveBcImage(g.id, updated.image);
                      setPosterImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setPosterMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                      await fetch(`/api/products/posters/templates/${g.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                      }).then(() => loadTemplates()).catch(() => {});
                    }}
                    onDelete={() => void deleteGallery(g.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : isPizzaBoxes ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {pizzaBoxPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                onBrowseDesigns={() => router.push(`/admin/templates/pizza-boxes/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=pizza-boxes")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setPizzaBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
                onDelete={() => setPizzaBoxPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
          </div>
        </div>
      ) : isShippingBoxes ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {shippingBoxPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                onBrowseDesigns={() => router.push(`/admin/templates/shipping-boxes/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=shipping-boxes")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setShippingBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
                onDelete={() => setShippingBoxPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
          </div>
        </div>
      ) : isMailerBoxes ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {mailerBoxPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                onBrowseDesigns={() => router.push(`/admin/templates/mailer-boxes/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=mailer-boxes")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setMailerBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
                onDelete={() => setMailerBoxPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
          </div>
        </div>
      ) : isSquareShippingBoxes ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {squareShippingBoxPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                images={pkg.images ?? []}
                onBrowseDesigns={() => router.push(`/admin/templates/square-shipping-boxes/${pkg.id}`)}
                onAddGuideline={() => router.push("/admin/guidelines?slug=square-shipping-boxes")}
                onEdit={async (updated) => {
                  await saveBcImage(pkg.id, updated.image);
                  await saveBcImages(pkg.id, updated.images);
                  setSquareShippingBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
                onDelete={() => setSquareShippingBoxPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
              />
            ))}
          </div>
        </div>
      ) : isBanners ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {galleryList.map((g) => {
                const defaults = BANNER_PRICE_SPECS[g.name] ?? { price: "", specs: [] };
                const meta = bannerMeta[g.id];
                const price = meta?.price || defaults.price;
                const specs = (meta?.specs ?? []).length > 0 ? (meta?.specs ?? []) : defaults.specs;
                const image = bannerImages[g.id] || g.previewImage;
                return (
                  <BusinessCardPricingCard
                    key={g.id}
                    title={g.name}
                    price={price}
                    specs={specs}
                    image={image}
                    description={g.description ?? ""}
                    sinaliteId={g.sinaliteId}
                    sinaliteOptions={g.sinaliteOptions}
                    onBrowseDesigns={() => router.push(`/admin/templates/vinyl-banners/${g.id}`)}
                    onAddGuideline={() => router.push(`/admin/guidelines?slug=vinyl-banners&sinaliteId=${g.sinaliteId ?? ""}`)}
                    onEdit={async (updated) => {
                      await saveBcImage(g.id, updated.image);
                      setBannerImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setBannerMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                      await fetch(`/api/products/${effectiveSlug}/templates/${g.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                      }).then(() => loadTemplates()).catch(() => {});
                    }}
                    onDelete={() => void deleteGallery(g.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Gallery grid */
        apparelProducts.length > 0 && (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            {loading ? (
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Loading…</p>
            ) : galleryList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
                <p style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>No gallery templates yet for <strong style={{ color: "#374151" }}>{selectedProductName}</strong></p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
                {galleryList.map((g) => {
                  if (!isTshirts) {
                    return (
                      <BusinessCardPricingCard
                        key={g.id}
                        title={g.name}
                        price={g.price || "$0 + tax"}
                        specs={g.specs ?? []}
                        image={g.previewImage}
                        images={g.images}
                        description={g.description ?? ""}
                        sinaliteId={g.sinaliteId}
                        sinaliteOptions={g.sinaliteOptions}
                        onBrowseDesigns={() => router.push(`/admin/templates/${effectiveSlug}/${g.id}`)}
                        onAddGuideline={() => router.push(`/admin/guidelines?slug=${effectiveSlug}&sinaliteId=${g.sinaliteId ?? ""}`)}
                        onEdit={async (updated) => {
                          await fetch(`/api/products/${effectiveSlug}/templates/${g.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: updated.title, previewImage: updated.image, images: updated.images, price: updated.price, specs: updated.specs, description: updated.description, sinaliteOptions: updated.sinaliteOptions }),
                          }).then(() => loadTemplates());
                        }}
                        onDelete={() => void deleteGallery(g.id)}
                      />
                    );
                  }
                  const tMeta = tshirtMeta[g.id];
                  const tSpecs = tMeta?.specs?.length ? tMeta.specs : TSHIRT_DEFAULT_SPECS;
                  const tPrice = tMeta?.price || "$18 + tax";
                  return (
                    <GalleryCard
                      key={g.id}
                      gallery={g}
                      productSlug={effectiveSlug}
                      specs={tSpecs}
                      price={tPrice}
                      onEdit={() => openEditModal(g)}
                      onDelete={() => void deleteGallery(g.id)}
                      onManage={() => router.push(`/admin/templates/${effectiveSlug}/${g.id}`)}
                      onAddGuideline={() => router.push(`/admin/guidelines?slug=${effectiveSlug}&sinaliteId=${g.sinaliteId ?? ""}`)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )
      )}
    </div>

    {/* Add/Edit Gallery Modal */}
    {modalOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div style={{ background: "#fff", borderRadius: "16px", width: "min(480px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
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
            {/* Specs — only shown when editing T-shirt templates */}
            {isTshirts && editingGalleryId && (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>
                  Price / unit
                  <input
                    value={gPrice}
                    onChange={(e) => setGPrice(e.target.value)}
                    placeholder="e.g. $18 + tax"
                    style={{ padding: "0.6rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827" }}
                  />
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>Specs</span>
                  {gSpecs.map((s, i) => (
                    <div key={s.key} style={{ display: "flex", gap: 6 }}>
                      <span style={{ width: 120, flexShrink: 0, padding: "0.5rem 0.5rem", fontSize: "0.825rem", fontWeight: 600, color: "#374151" }}>{s.key}</span>
                      {s.key === "Size" ? (
                        <>
                          <input
                            value={parseSizeValue(s.value).width}
                            onChange={(e) => setGSpecs((prev) => prev.map((v, idx) => idx === i ? { ...v, value: formatSizeValue(e.target.value, parseSizeValue(v.value).length) } : v))}
                            placeholder="Width"
                            style={{ flex: 1, maxWidth: 150, padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.825rem", color: "#111827" }}
                          />
                          <input
                            value={parseSizeValue(s.value).length}
                            onChange={(e) => setGSpecs((prev) => prev.map((v, idx) => idx === i ? { ...v, value: formatSizeValue(parseSizeValue(v.value).width, e.target.value) } : v))}
                            placeholder="Length"
                            style={{ flex: 1, maxWidth: 150, padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.825rem", color: "#111827" }}
                          />
                        </>
                      ) : (
                        <input
                          value={s.value}
                          onChange={(e) => setGSpecs((prev) => prev.map((v, idx) => idx === i ? { ...v, value: e.target.value } : v))}
                          style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.825rem", color: "#111827" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
              <button
                onClick={() => void saveGallery()}
                disabled={saving}
                style={{ flex: 1, padding: "0.65rem 1rem", background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
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

    {/* Add Package Modal (Business Cards / Flyers) */}
    {addPkgOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={() => setAddPkgOpen(false)}
      >
        <div style={{ background: "#fff", borderRadius: 18, width: "min(480px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)" }} />
          <div style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Add Gallery Template</h3>
              <button onClick={() => setAddPkgOpen(false)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
              Title
              <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ padding: "0.55rem 0.85rem", border: `1.5px solid ${addErrors.title ? "#ef4444" : "#d1d5db"}`, borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
              {addErrors.title && <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 500 }}>Title is required.</span>}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
              Price
              <input value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="e.g. $79 + tax" style={{ padding: "0.55rem 0.85rem", border: `1.5px solid ${addErrors.price ? "#ef4444" : "#d1d5db"}`, borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
              {addErrors.price && <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 500 }}>Price is required.</span>}
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
              Description
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                rows={6}
                style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none", minHeight: 140, resize: "vertical", fontFamily: "inherit" }}
              />
            </label>
            <div style={{ marginBottom: 18 }}>
              <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>Image</span>
              {addImage && (
                <img src={addImage} alt="preview" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input ref={addImageRef} type="file" accept="image/*" onChange={(e) => void handleAddImageChange(e)} style={{ display: "none" }} />
                <button
                  type="button"
                  onClick={() => addImageRef.current?.click()}
                  style={{ padding: "0.5rem 1rem", border: `1.5px solid ${addErrors.image ? "#ef4444" : "#d1d5db"}`, background: "#f9fafb", color: "#374151", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {addImage ? "Change image" : "Upload image"}
                </button>
                {addImageName && <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addImageName}</span>}
              </div>
              {addErrors.image && <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 500, display: "block", marginTop: 6 }}>Image is required.</span>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>Specs</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {addSpecs.map((spec, i) => {
                  const hasError = spec.key === "Size" ? addErrors.size : spec.key === "Color" ? addErrors.color : false;
                  return (
                    <div key={spec.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>✓</span>
                        <span style={{ width: 110, flexShrink: 0, fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
                          {spec.key}
                        </span>
                        {spec.key === "Size" ? (
                          <>
                            <input
                              value={parseSizeValue(spec.value).width}
                              onChange={(e) => setAddSpecs((s) => s.map((v, j) => j === i ? { ...v, value: formatSizeValue(e.target.value, parseSizeValue(v.value).length) } : v))}
                              placeholder="Width"
                              style={{ flex: 1, maxWidth: 150, padding: "0.45rem 0.75rem", border: `1.5px solid ${hasError ? "#ef4444" : "#d1d5db"}`, borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                            />
                            <input
                              value={parseSizeValue(spec.value).length}
                              onChange={(e) => setAddSpecs((s) => s.map((v, j) => j === i ? { ...v, value: formatSizeValue(parseSizeValue(v.value).width, e.target.value) } : v))}
                              placeholder="Length"
                              style={{ flex: 1, maxWidth: 150, padding: "0.45rem 0.75rem", border: `1.5px solid ${hasError ? "#ef4444" : "#d1d5db"}`, borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                            />
                          </>
                        ) : spec.key === "Corners" ? (
                          <select
                            value={spec.value}
                            onChange={(e) => setAddSpecs((s) => s.map((v, j) => j === i ? { ...v, value: e.target.value } : v))}
                            style={{ flex: 1, padding: "0.45rem 0.75rem", border: `1.5px solid ${hasError ? "#ef4444" : "#d1d5db"}`, borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none", background: "#fff" }}
                          >
                            <option value="">Select...</option>
                            {CORNER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            value={spec.value}
                            onChange={(e) => setAddSpecs((s) => s.map((v, j) => j === i ? { ...v, value: e.target.value } : v))}
                            style={{ flex: 1, padding: "0.45rem 0.75rem", border: `1.5px solid ${hasError ? "#ef4444" : "#d1d5db"}`, borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                          />
                        )}
                      </div>
                      {spec.key === "Color" && (
                        <div style={{ marginLeft: 116 }}>
                          <ColorSwatchPicker
                            value={spec.value}
                            onChange={(next) => setAddSpecs((s) => s.map((v, j) => j === i ? { ...v, value: next } : v))}
                          />
                        </div>
                      )}
                      {hasError && <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 500, marginLeft: 116 }}>{spec.key} is required.</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => void saveAddPackage()}
                style={{ flex: 1, padding: "0.65rem 1rem", background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
              >
                Save
              </button>
              <button
                onClick={() => setAddPkgOpen(false)}
                style={{ padding: "0.65rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}
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

function DeleteConfirmPopup({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onCancel}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: "min(340px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)" }} />
        <div style={{ padding: "22px 22px 18px", textAlign: "center" }}>
          <p style={{ margin: "0 0 20px", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>Do you want to delete?</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onConfirm}
              style={{ flex: 1, padding: "0.6rem 1rem", background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
            >
              Yes
            </button>
            <button
              onClick={onCancel}
              style={{ flex: 1, padding: "0.6rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryCard({
  gallery,
  productSlug: _productSlug,
  specs = [],
  price = "",
  onEdit,
  onDelete,
  onManage,
  onAddGuideline,
}: {
  gallery: GalleryTemplate;
  productSlug: string;
  specs?: string[];
  price?: string;
  onEdit: () => void;
  onDelete: () => void;
  onManage: () => void;
  onAddGuideline: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [popup, setPopup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
    <div
      style={{
        borderRadius: 18, overflow: "hidden", background: "#fff",
        border: `2px solid ${hovered ? "#f97316" : "#f0f0f0"}`,
        boxShadow: hovered ? "0 12px 32px rgba(249,115,22,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease", cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ background: "#f3f4f6", padding: "16px 14px", position: "relative" }}>
        {/* Delete icon — top left */}
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          style={{ position: "absolute", top: 10, left: 10, zIndex: 2, width: 26, height: 26, borderRadius: "50%", border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Delete"
        >🗑</button>
        {/* Info icon — top right */}
        {specs.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setPopup(true); }}
            style={{ position: "absolute", top: 10, right: 10, zIndex: 2, width: 26, height: 26, borderRadius: "50%", border: "1.5px solid #6366f1", background: "#eef2ff", color: "#6366f1", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >i</button>
        )}
        <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
          <img
            src={gallery.previewImage}
            alt={gallery.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.04)" : "scale(1)" }}
          />
          <div
            onClick={onManage}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.38)", opacity: hovered ? 1 : 0, transition: "opacity 0.2s ease" }}
          >
            <span style={{ background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", padding: "0.5rem 1.2rem", borderRadius: 999, fontWeight: 700, fontSize: "0.82rem" }}>
              Manage Designs →
            </span>
          </div>
          <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
            {gallery.designs.length} design{gallery.designs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.95rem", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gallery.name}</p>
        <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "#9ca3af", fontWeight: 500 }}>
          {gallery.designs.length > 0 ? `${gallery.designs.length} design option${gallery.designs.length !== 1 ? "s" : ""}` : "No designs yet"}
        </p>
        <button onClick={onAddGuideline} style={{ width: "100%", marginBottom: 8, padding: "7px 0", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>+ Add Guideline</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onManage} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #06b6d4", background: "#ecfeff", color: "#0891b2", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Designs</button>
          <button onClick={onEdit} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Edit</button>
          <button onClick={() => setConfirmDelete(true)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </div>

    {/* Specs popup */}
    {popup && (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        onClick={() => setPopup(false)}>
        <div style={{ background: "#fff", borderRadius: 20, width: "min(420px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden" }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", height: 6 }} />
          <div style={{ padding: "20px 24px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#111827" }}>{gallery.name}</h3>
                {price && (
                <p style={{ margin: "2px 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#f97316" }}>
                  {/[$+]/.test(price) ? price : `$${price} + tax`}
                </p>
              )}
              </div>
              <button onClick={() => setPopup(false)} style={{ width: 28, height: 28, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {specs.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                  <span style={{ color: "#f97316", fontWeight: 700, fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {confirmDelete && (
      <DeleteConfirmPopup onConfirm={() => { setConfirmDelete(false); onDelete(); }} onCancel={() => setConfirmDelete(false)} />
    )}
    </>
  );
}

// Lets admin build up a Color spec value ("Red, #2563eb, Navy…") by picking colors
// one at a time from the native color picker, shown as a row of round swatches.
function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const colors = value.split(",").map((c) => c.trim()).filter(Boolean);
  const pickerRef = useRef<HTMLInputElement>(null);

  function addColor(hex: string) {
    if (colors.includes(hex)) return;
    onChange([...colors, hex].join(", "));
  }

  function removeColor(color: string) {
    onChange(colors.filter((c) => c !== color).join(", "));
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          title={`Remove ${color}`}
          onClick={() => removeColor(color)}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: color.startsWith("#") ? color : undefined,
            border: "2px solid #d1d5db", cursor: "pointer", padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.6rem", color: "#fff", position: "relative",
          }}
        >
          {!color.startsWith("#") && <span style={{ fontSize: "0.55rem", color: "#374151", fontWeight: 700 }}>{color.slice(0, 2).toUpperCase()}</span>}
        </button>
      ))}
      <input
        ref={pickerRef}
        type="color"
        onChange={(e) => addColor(e.target.value)}
        style={{ opacity: 0, position: "absolute", width: 0, height: 0 }}
      />
      <button
        type="button"
        title="Add a color"
        onClick={() => pickerRef.current?.click()}
        style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "2px dashed #9ca3af", background: "#fff", color: "#6b7280",
          cursor: "pointer", padding: 0, flexShrink: 0, fontSize: "0.95rem", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}
      >
        +
      </button>
    </div>
  );
}

type BcEditPayload = { title: string; price: string; specs: string[]; image: string; images: string[]; description: string; sinaliteOptions?: SinaliteSelectedOption[] };

type SinaliteOptionFetched = { id: number; group: string; name: string; hidden: number };

function BusinessCardPricingCard({
  title, price, specs, image, images, description, sinaliteId, sinaliteOptions, onBrowseDesigns, onEdit, onDelete, onAddGuideline,
}: {
  title: string; price: string; specs: string[]; image: string; images?: string[]; description?: string;
  sinaliteId?: string; sinaliteOptions?: SinaliteSelectedOption[];
  onBrowseDesigns: () => void;
  onEdit: (updated: BcEditPayload) => void | Promise<unknown>;
  onDelete: () => void;
  onAddGuideline: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [popup, setPopup] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eSpecs, setESpecs] = useState<{ key: string; value: string }[]>([]);
  const [eImage, setEImage] = useState("");
  const [eImageName, setEImageName] = useState("");
  const [eImages, setEImages] = useState<string[]>([]);
  const [eDescription, setEDescription] = useState("");
  const eImageRef = useRef<HTMLInputElement>(null);
  const eGalleryRef = useRef<HTMLInputElement>(null);
  const [optGroups, setOptGroups] = useState<Record<string, SinaliteOptionFetched[]>>({});
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [optLoaded, setOptLoaded] = useState(false);

  function loadSinaliteOptions() {
    if (!sinaliteId || optLoaded) return;
    setOptLoading(true);
    setOptError(null);
    fetch(`/api/sinalite/products/${sinaliteId}/options`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { options?: SinaliteOptionFetched[]; error?: string }) => {
        if (d.error) { setOptError(d.error); return; }
        const groups: Record<string, SinaliteOptionFetched[]> = {};
        for (const o of (d.options ?? []).filter((o) => o.hidden === 0)) {
          const key = o.group.toLowerCase();
          (groups[key] ??= []).push(o);
        }
        setOptGroups(groups);
        setOptLoaded(true);
      })
      .catch(() => setOptError("Failed to load options"))
      .finally(() => setOptLoading(false));
  }

  function openEdit() {
    setETitle(title);
    setEPrice(price);
    setESpecs(buildFixedSpecEntries(specs));
    setEImage(image);
    setEImageName("");
    setEImages(images ?? []);
    setEDescription(description ?? "");
    setEditOpen(true);
    loadSinaliteOptions();
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setEImage(await readFile(file));
    setEImageName(file.name);
  }

  async function handleGalleryImagesChange(e: ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;
    const files = Array.from(inputEl.files ?? []);
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(readFile));
    setEImages((prev) => [...prev, ...dataUrls]);
    inputEl.value = "";
  }

  function removeGalleryImage(i: number) {
    setEImages((prev) => prev.filter((_, j) => j !== i));
  }

  async function saveEdit() {
    // No admin selection step — every fetched (non-hidden) Sinalite option is offered as-is.
    const chosenOptions: SinaliteSelectedOption[] = Object.values(optGroups)
      .flat()
      .map((o) => ({ id: o.id, group: o.group, name: o.name }));
    setSavingEdit(true);
    try {
      await onEdit({
        title: eTitle.trim() || title,
        price: formatPriceValue(ePrice) || price,
        images: eImages,
        specs: eSpecs.filter((s) => s.value.trim()).map(formatSpecEntry),
        image: eImage,
        description: eDescription.trim(),
        ...(sinaliteId ? { sinaliteOptions: chosenOptions } : {}),
      });
    } finally {
      setSavingEdit(false);
      setEditOpen(false);
    }
  }

  return (
    <>
      <div
        style={{
          borderRadius: 18, overflow: "hidden", background: "#f3f4f6",
          border: `2px solid ${hovered ? "#f97316" : "#e5e7eb"}`,
          boxShadow: hovered ? "0 12px 32px rgba(249,115,22,0.13)" : "0 2px 8px rgba(0,0,0,0.06)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ padding: "28px 18px 16px", position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setPopup(true); loadSinaliteOptions(); }}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 2, width: 26, height: 26, borderRadius: "50%", border: "1.5px solid #6366f1", background: "#eef2ff", color: "#6366f1", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            i
          </button>
          <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.14)" }}>
            <img src={image} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease", transform: hovered ? "scale(1.04)" : "scale(1)" }} />
            <div
              onClick={onBrowseDesigns}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.38)", opacity: hovered ? 1 : 0, transition: "opacity 0.2s ease", cursor: "pointer" }}
            >
              <span style={{ background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", padding: "0.5rem 1.2rem", borderRadius: 999, fontWeight: 700, fontSize: "0.82rem" }}>
                Browse Designs →
              </span>
            </div>
          </div>
        </div>
        <div style={{ padding: "4px 18px 20px" }}>
          <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{title}</p>
          <button onClick={onAddGuideline} style={{ width: "100%", marginBottom: 8, padding: "7px 0", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>+ Add Guideline</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onBrowseDesigns} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #06b6d4", background: "#ecfeff", color: "#0891b2", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Designs</button>
            <button onClick={openEdit} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Edit</button>
          </div>
        </div>
      </div>

      {/* Specs popup */}
      {popup && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setPopup(false)}
        >
          <div style={{ background: "#fff", borderRadius: 18, width: "min(400px,100%)", maxHeight: "85vh", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", flexShrink: 0 }} />
            <div style={{ padding: "20px 22px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>{title}</h3>
                <button onClick={() => setPopup(false)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
              </div>
            </div>
            <ul style={{ margin: 0, padding: "0 22px 20px", listStyle: "none", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
              {sinaliteId ? (
                optLoading ? (
                  <li style={{ fontSize: "0.85rem", color: "#9ca3af", padding: "4px 12px" }}>Loading Sinalite options…</li>
                ) : (
                  Object.values(optGroups).flat().map((o) => (
                    <li key={`${o.group}-${o.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: "#374151", padding: "8px 12px", borderRadius: 10, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                      <span style={{ color: "#f97316", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {o.group}: {o.name}
                    </li>
                  ))
                )
              ) : (
                specs.map((spec) => (
                  <li key={spec} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: "#374151", padding: "8px 12px", borderRadius: 10, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                    <span style={{ color: "#f97316", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {spec}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Edit popup */}
      {editOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => { if (!savingEdit) setEditOpen(false); }}
        >
          <style>{`@keyframes bc-edit-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ background: "#fff", borderRadius: 18, width: "min(480px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)" }} />
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Edit Card</h3>
                <button onClick={() => { if (!savingEdit) setEditOpen(false); }} disabled={savingEdit} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: savingEdit ? "not-allowed" : "pointer", fontSize: "1rem", color: "#6b7280", opacity: savingEdit ? 0.5 : 1 }}>✕</button>
              </div>
              {!sinaliteId && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                    Title
                    <input value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                    Price
                    <input value={ePrice} onChange={(e) => setEPrice(e.target.value)} style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
                  </label>
                </>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                Description
                <textarea
                  value={eDescription}
                  onChange={(e) => setEDescription(e.target.value)}
                  rows={6}
                  style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none", minHeight: 140, resize: "vertical", fontFamily: "inherit" }}
                />
              </label>
              <div style={{ marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>Image</span>
                {eImage && (
                  <img src={eImage} alt="preview" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input ref={eImageRef} type="file" accept="image/*" onChange={(e) => void handleImageChange(e)} style={{ display: "none" }} />
                  <button
                    type="button"
                    onClick={() => eImageRef.current?.click()}
                    style={{ padding: "0.5rem 1rem", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#f9fafb", color: "#374151", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    {eImage ? "Change image" : "Upload image"}
                  </button>
                  {eImageName && <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eImageName}</span>}
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>Additional Images</span>
                {eImages.length > 0 && (
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
                    {eImages.map((src, i) => (
                      <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={src} alt={`Gallery ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i)}
                          aria-label="Remove image"
                          style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.7rem", lineHeight: "18px", cursor: "pointer", padding: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={eGalleryRef} type="file" accept="image/*" multiple onChange={(e) => void handleGalleryImagesChange(e)} style={{ display: "none" }} />
                <button
                  type="button"
                  onClick={() => eGalleryRef.current?.click()}
                  style={{ padding: "0.5rem 1rem", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#f9fafb", color: "#374151", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Upload images
                </button>
              </div>
              {!sinaliteId && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Specs</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {eSpecs.map((spec, i) => (
                    <div key={spec.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>✓</span>
                      <span style={{ width: 110, flexShrink: 0, fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{spec.key}</span>
                      {spec.key === "Size" ? (
                        <>
                          <input
                            value={parseSizeValue(spec.value).width}
                            onChange={(e) => setESpecs((s) => s.map((v, j) => j === i ? { ...v, value: formatSizeValue(e.target.value, parseSizeValue(v.value).length) } : v))}
                            placeholder="Width"
                            style={{ flex: 1, maxWidth: 150, padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                          />
                          <input
                            value={parseSizeValue(spec.value).length}
                            onChange={(e) => setESpecs((s) => s.map((v, j) => j === i ? { ...v, value: formatSizeValue(parseSizeValue(v.value).width, e.target.value) } : v))}
                            placeholder="Length"
                            style={{ flex: 1, maxWidth: 150, padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                          />
                        </>
                      ) : spec.key === "Corners" ? (
                        <select
                          value={spec.value}
                          onChange={(e) => setESpecs((s) => s.map((v, j) => j === i ? { ...v, value: e.target.value } : v))}
                          style={{ flex: 1, padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none", background: "#fff" }}
                        >
                          <option value="">Select...</option>
                          {CORNER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          value={spec.value}
                          onChange={(e) => setESpecs((s) => s.map((v, j) => j === i ? { ...v, value: e.target.value } : v))}
                          style={{ flex: 1, padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                        />
                      )}
                    </div>
                    {spec.key === "Color" && (
                      <div style={{ marginLeft: 116 }}>
                        <ColorSwatchPicker
                          value={spec.value}
                          onChange={(next) => setESpecs((s) => s.map((v, j) => j === i ? { ...v, value: next } : v))}
                        />
                      </div>
                    )}
                    </div>
                  ))}
                </div>
              </div>
              )}
              {sinaliteId && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                    Sinalite Options
                  </span>
                  {optLoading ? (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>Loading options…</p>
                  ) : optError ? (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#dc2626" }}>{optError}</p>
                  ) : Object.keys(optGroups).length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>No options found.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {Object.entries(optGroups).map(([groupKey, opts]) => (
                        <div key={groupKey}>
                          <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#6b7280", textTransform: "capitalize", marginBottom: 6 }}>
                            {groupKey}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 0.6rem" }}>
                            {opts.map((o) => (
                              <span key={o.id} style={{ fontSize: "0.8rem", color: "#374151", background: "#f3f4f6", borderRadius: 6, padding: "0.2rem 0.55rem" }}>
                                {o.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => void saveEdit()}
                  disabled={savingEdit}
                  style={{
                    flex: 1, padding: "0.65rem 1rem",
                    background: savingEdit ? "#d1d5db" : "linear-gradient(135deg,#f97316,#ef4444,#6366f1)",
                    color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.875rem",
                    cursor: savingEdit ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {savingEdit && (
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "#fff",
                      animation: "bc-edit-spin 0.7s linear infinite",
                    }} />
                  )}
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditOpen(false)}
                  disabled={savingEdit}
                  style={{ padding: "0.65rem 1rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", cursor: savingEdit ? "not-allowed" : "pointer", color: "#374151", opacity: savingEdit ? 0.6 : 1 }}
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
