"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { GalleryTemplate } from "@/lib/template-data";
import { categories, LISTING_ALLOWED_CATEGORIES } from "@/lib/data";
import type { Product } from "@/lib/types";

async function readFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Cannot read file."));
    r.readAsDataURL(file);
  });
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

type Props = { products: Product[]; openAddRef?: React.RefObject<(() => void) | null> };

export function AdminTemplateSection({ products, openAddRef }: Props) {
  const router = useRouter();
  const [productList] = useState<Product[]>(products);
  const apparelProducts = productList.filter((p) => LISTING_ALLOWED_CATEGORIES.has(p.category));

  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    try { const v = localStorage.getItem("tmpl-selectedSlug"); if (v) return v; } catch { /* ignore */ }
    const first = apparelProducts[0];
    if (!first) return "";
    return first.category === "t-shirts" ? "t-shirts" : first.slug;
  });
  const [subProduct, setSubProduct] = useState<"business-cards" | "flyers">(() => {
    try { const v = localStorage.getItem("tmpl-subProduct"); if (v === "business-cards" || v === "flyers") return v; } catch { /* ignore */ }
    return "business-cards";
  });
  const [marketingSubProduct, setMarketingSubProduct] = useState<"posters" | "banners" | "yard-signs">(() => {
    try { const v = localStorage.getItem("tmpl-marketingSubProduct"); if (v === "posters" || v === "banners" || v === "yard-signs") return v; } catch { /* ignore */ }
    return "posters";
  });
  const [packagingSubProduct, setPackagingSubProduct] = useState<"pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes">(() => {
    try { const v = localStorage.getItem("tmpl-packagingSubProduct"); if (v === "pizza-boxes" || v === "shipping-boxes" || v === "mailer-boxes" || v === "square-shipping-boxes") return v; } catch { /* ignore */ }
    return "pizza-boxes";
  });
  const [tshirtSubProduct, setTshirtSubProduct] = useState<"round-neck-tshirt" | "collar-tshirt">(() => {
    try { const v = localStorage.getItem("tmpl-tshirtSubProduct"); if (v === "round-neck-tshirt" || v === "collar-tshirt") return v; } catch { /* ignore */ }
    return "round-neck-tshirt";
  });

  useEffect(() => { try { localStorage.setItem("tmpl-selectedSlug", selectedSlug); } catch { /* ignore */ } }, [selectedSlug]);
  useEffect(() => { try { localStorage.setItem("tmpl-subProduct", subProduct); } catch { /* ignore */ } }, [subProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-marketingSubProduct", marketingSubProduct); } catch { /* ignore */ } }, [marketingSubProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-packagingSubProduct", packagingSubProduct); } catch { /* ignore */ } }, [packagingSubProduct]);
  useEffect(() => { try { localStorage.setItem("tmpl-tshirtSubProduct", tshirtSubProduct); } catch { /* ignore */ } }, [tshirtSubProduct]);

  const isTshirts = selectedSlug === "t-shirts";
  const selectedProduct = productList.find((p) => p.slug === selectedSlug);
  const isBusinessPrinting = selectedProduct?.category === "business-cards";
  const isMarketingMaterial = selectedProduct?.category === "marketing-material";
  const isPackagingBox = selectedProduct?.category === "packaging-box";
  const isPromotionalProducts = selectedProduct?.category === "promotional-products";
  const marketingSlugMap: Record<string, string> = { posters: "posters", banners: "vinyl-banners", "yard-signs": "yard-signs" };
  const packagingSlugMap: Record<string, string> = { "pizza-boxes": "pizza-boxes", "shipping-boxes": "shipping-boxes", "mailer-boxes": "mailer-boxes", "square-shipping-boxes": "square-shipping-boxes" };
  const effectiveSlug = isBusinessPrinting && subProduct === "flyers"
    ? "bold-flyers"
    : isMarketingMaterial
      ? marketingSlugMap[marketingSubProduct]
      : isPackagingBox
        ? packagingSlugMap[packagingSubProduct]
        : isPromotionalProducts
          ? "stickers-and-labels"
          : isTshirts
            ? tshirtSubProduct
            : selectedSlug;
  const isBusinessCards = isBusinessPrinting && subProduct === "business-cards";
  const selectedProductName = isBusinessPrinting
    ? (subProduct === "flyers" ? "Flyers" : "Business Cards")
    : isMarketingMaterial
      ? ({ posters: "Posters", banners: "Banners", "yard-signs": "Yard Signs" }[marketingSubProduct] ?? "Marketing Material")
      : isPackagingBox
        ? ({ "pizza-boxes": "Pizza Box", "shipping-boxes": "Shipping Box", "mailer-boxes": "Mailer Box", "square-shipping-boxes": "Square Shipping Box" }[packagingSubProduct] ?? "Packaging Box")
        : isPromotionalProducts
          ? "Stickers & Labels"
          : isTshirts
            ? ({ "round-neck-tshirt": "Round Collar T-Shirt", "collar-tshirt": "Straight Collar T-Shirt" }[tshirtSubProduct] ?? "T-Shirt")
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
  const [gSpecs, setGSpecs] = useState<string[]>([]);
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
      const r = await fetch(`/api/products/${effectiveSlug}/templates`, { cache: "no-store" });
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
    setGSpecs(meta?.specs?.length ? meta.specs : [...TSHIRT_DEFAULT_SPECS]);
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
      if (editingGalleryId) {
        await fetch(`/api/products/${effectiveSlug}/templates/${editingGalleryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gName,
            previewImage: gImage,
            ...(isTshirts && { price: gPrice.trim(), specs: gSpecs.filter((s) => s.trim()) }),
          }),
        });
        // Also cache in localStorage for instant display
        if (isTshirts) {
          setTshirtMeta((prev) => ({ ...prev, [editingGalleryId]: { price: gPrice.trim(), specs: gSpecs.filter((s) => s.trim()) } }));
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
    if (!window.confirm("Delete this gallery template and all its designs?")) return;
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

  const isFlyers = isBusinessPrinting && subProduct === "flyers";
  const isBanners      = isMarketingMaterial && marketingSubProduct === "banners";
  const isPosters      = isMarketingMaterial && marketingSubProduct === "posters";
  const isYardSigns    = isMarketingMaterial && marketingSubProduct === "yard-signs";
  const isStickers     = isPromotionalProducts;
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

  const MAILER_BOX_DEFAULTS = [
    { id: "mb-standard", title: "Mailer Box", price: "$200 + tax", specs: ["Material: Corrugated Board (3 Ply / 5 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 20", "Full colour print"], image: "" },
  ];

  const SHIPPING_BOX_DEFAULTS = [
    { id: "sb-standard", title: "Shipping Box", price: "$220 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 40", "Full colour print"], image: "" },
  ];

  const PIZZA_BOX_DEFAULTS = [
    { id: "pb-standard", title: "Pizza Box", price: "$150 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Customizable as per product dimensions (L × W × H)", "Quantity: 40", "Full colour print"], image: "" },
  ];

  const SQUARE_SHIPPING_BOX_DEFAULTS = [
    { id: "ssb-standard", title: "Square Shipping Box", price: "$230 + tax", specs: ["Material: Heavy-Duty Corrugated Board (3 Ply, 5 Ply, or 7 Ply)", "Size: Square dimensions customizable (L × W × H)", "Quantity: 40", "Full colour print"], image: "" },
  ];

  const [bcPackages, setBcPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("bc-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return BC_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return BC_DEFAULTS;
    }
  });

  // Load images from IndexedDB after mount
  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        BC_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
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

  // Save text metadata to localStorage whenever it changes
  useEffect(() => {
    try {
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of bcPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("bc-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [bcPackages]);

  const [flyPackages, setFlyPackages] = useState(() => {
    try {
      const savedMeta = localStorage.getItem("fly-packages-meta");
      const meta: Record<string, { title: string; price: string; specs: string[] }> = savedMeta ? JSON.parse(savedMeta) : {};
      return FLY_DEFAULTS.map((d) => ({ ...d, ...(meta[d.id] ?? {}) }));
    } catch {
      return FLY_DEFAULTS;
    }
  });

  useEffect(() => {
    void (async () => {
      const entries = await Promise.all(
        FLY_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
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
      const meta: Record<string, { title: string; price: string; specs: string[] }> = {};
      for (const pkg of flyPackages) meta[pkg.id] = { title: pkg.title, price: pkg.price, specs: pkg.specs };
      localStorage.setItem("fly-packages-meta", JSON.stringify(meta));
    } catch { /* ignore */ }
  }, [flyPackages]);

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
        MAILER_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setMailerBoxPackages((prev) =>
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
        SHIPPING_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setShippingBoxPackages((prev) =>
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
        PIZZA_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setPizzaBoxPackages((prev) =>
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
        SQUARE_SHIPPING_BOX_DEFAULTS.map(async (d) => ({ id: d.id, image: await loadBcImage(d.id) }))
      );
      setSquareShippingBoxPackages((prev) =>
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
        <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
          Select category
        </label>
        {apparelProducts.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>No products found. Add products in the Product Listing.</p>
        ) : (
          <select
            value={selectedSlug}
            onChange={(e) => { setSelectedSlug(e.target.value); setSubProduct("business-cards"); setMarketingSubProduct("posters"); setPackagingSubProduct("pizza-boxes" as "pizza-boxes" | "shipping-boxes" | "mailer-boxes" | "square-shipping-boxes"); setTshirtSubProduct("round-neck-tshirt"); }}
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
        {isBusinessPrinting && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              value={subProduct}
              onChange={(e) => setSubProduct(e.target.value as "business-cards" | "flyers")}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              <option value="business-cards">Business Cards</option>
              <option value="flyers">Flyers</option>
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
              onChange={(e) => setMarketingSubProduct(e.target.value as "posters" | "banners" | "yard-signs")}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              <option value="posters">Posters</option>
              <option value="banners">Banners</option>
              <option value="yard-signs">Yard Signs</option>
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
              <option value="pizza-boxes">Pizza Box</option>
              <option value="shipping-boxes">Shipping Box</option>
              <option value="mailer-boxes">Mailer Box</option>
              <option value="square-shipping-boxes">Square Shipping Box</option>
            </select>
          </div>
        )}
        {isPromotionalProducts && (
          <div style={{ marginTop: "1rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.5rem" }}>
              Select Product
            </label>
            <select
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
              defaultValue="stickers-and-labels"
            >
              <option value="stickers-and-labels">Stickers &amp; Labels</option>
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
              onChange={(e) => setTshirtSubProduct(e.target.value as "round-neck-tshirt" | "collar-tshirt")}
              style={{ padding: "0.6rem 1rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#fff", minWidth: "280px", cursor: "pointer" }}
            >
              <option value="round-neck-tshirt">Round Collar T-Shirt</option>
              <option value="collar-tshirt">Straight Collar T-Shirt</option>
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
      {isBusinessCards ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {bcPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                onBrowseDesigns={() => router.push(`/admin/templates/premium-business-cards/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setBcPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
              />
            ))}
          </div>
        </div>
      ) : isFlyers ? (
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {flyPackages.map((pkg) => (
              <BusinessCardPricingCard
                key={pkg.id}
                title={pkg.title}
                price={pkg.price}
                specs={pkg.specs}
                image={pkg.image || (selectedProduct?.image ?? "")}
                onBrowseDesigns={() => router.push(`/admin/templates/bold-flyers/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setFlyPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
              />
            ))}
          </div>
        </div>
      ) : isStickers ? (
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
                    onBrowseDesigns={() => router.push(`/admin/templates/stickers-and-labels/${g.id}`)}
                    onEdit={(updated) => {
                      void saveBcImage(g.id, updated.image);
                      setStickerImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setStickerMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                    }}
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
                    onBrowseDesigns={() => router.push(`/admin/templates/yard-signs/${g.id}`)}
                    onEdit={(updated) => {
                      void saveBcImage(g.id, updated.image);
                      setYardSignImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setYardSignMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                    }}
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
                    onBrowseDesigns={() => router.push(`/admin/templates/posters/${g.id}`)}
                    onEdit={(updated) => {
                      void saveBcImage(g.id, updated.image);
                      setPosterImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setPosterMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                    }}
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
                onBrowseDesigns={() => router.push(`/admin/templates/pizza-boxes/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setPizzaBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
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
                onBrowseDesigns={() => router.push(`/admin/templates/shipping-boxes/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setShippingBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
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
                onBrowseDesigns={() => router.push(`/admin/templates/mailer-boxes/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setMailerBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
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
                onBrowseDesigns={() => router.push(`/admin/templates/square-shipping-boxes/${pkg.id}`)}
                onEdit={(updated) => {
                  void saveBcImage(pkg.id, updated.image);
                  setSquareShippingBoxPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...updated } : p));
                }}
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
                    onBrowseDesigns={() => router.push(`/admin/templates/vinyl-banners/${g.id}`)}
                    onEdit={(updated) => {
                      void saveBcImage(g.id, updated.image);
                      setBannerImages((prev) => ({ ...prev, [g.id]: updated.image }));
                      setBannerMeta((prev) => ({ ...prev, [g.id]: { price: updated.price, specs: updated.specs } }));
                    }}
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
                    <div key={i} style={{ display: "flex", gap: 6 }}>
                      <input
                        value={s}
                        onChange={(e) => setGSpecs((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                        style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: "8px", fontSize: "0.825rem", color: "#111827" }}
                      />
                      <button onClick={() => setGSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{ padding: "0 10px", border: "1.5px solid #fca5a5", borderRadius: 8, background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setGSpecs((prev) => [...prev, ""])}
                    style={{ alignSelf: "flex-start", padding: "5px 14px", border: "1.5px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#374151", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>+ Add spec</button>
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
    </>
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
}: {
  gallery: GalleryTemplate;
  productSlug: string;
  specs?: string[];
  price?: string;
  onEdit: () => void;
  onDelete: () => void;
  onManage: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [popup, setPopup] = useState(false);

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
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onManage} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #06b6d4", background: "#ecfeff", color: "#0891b2", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>Designs</button>
          <button onClick={onEdit} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Edit</button>
          <button onClick={onDelete} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Delete</button>
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
    </>
  );
}

type BcEditPayload = { title: string; price: string; specs: string[]; image: string };

function BusinessCardPricingCard({
  title, price, specs, image, onBrowseDesigns, onEdit,
}: {
  title: string; price: string; specs: string[]; image: string;
  onBrowseDesigns: () => void;
  onEdit: (updated: BcEditPayload) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [popup, setPopup] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eSpecs, setESpecs] = useState<string[]>([]);
  const [eImage, setEImage] = useState("");
  const [eImageName, setEImageName] = useState("");
  const eImageRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    setETitle(title);
    setEPrice(price);
    setESpecs([...specs]);
    setEImage(image);
    setEImageName("");
    setEditOpen(true);
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setEImage(await readFile(file));
    setEImageName(file.name);
  }

  function saveEdit() {
    onEdit({ title: eTitle.trim() || title, price: ePrice.trim() || price, specs: eSpecs.filter((s) => s.trim()), image: eImage });
    setEditOpen(false);
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
            onClick={(e) => { e.stopPropagation(); setPopup(true); }}
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
          <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{title}</p>
          <p style={{ margin: "0 0 14px", fontSize: "0.88rem", fontWeight: 700, color: "#f97316" }}>{price}</p>
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
          <div style={{ background: "#fff", borderRadius: 18, width: "min(400px,100%)", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)" }} />
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>{title}</h3>
                  <p style={{ margin: "3px 0 0", fontSize: "0.95rem", fontWeight: 700, color: "#f97316" }}>{price}</p>
                </div>
                <button onClick={() => setPopup(false)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {specs.map((spec) => (
                  <li key={spec} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: "#374151", padding: "8px 12px", borderRadius: 10, background: "#fafafa", border: "1px solid #f0f0f0" }}>
                    <span style={{ color: "#f97316", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Edit popup */}
      {editOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setEditOpen(false)}
        >
          <div style={{ background: "#fff", borderRadius: 18, width: "min(480px,100%)", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 5, background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)" }} />
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Edit Card</h3>
                <button onClick={() => setEditOpen(false)} style={{ width: 30, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                Title
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                Price
                <input value={ePrice} onChange={(e) => setEPrice(e.target.value)} style={{ padding: "0.55rem 0.85rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", color: "#111827", outline: "none" }} />
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
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Specs</span>
                  <button
                    onClick={() => setESpecs((s) => [...s, ""])}
                    style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f97316", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    + Add spec
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {eSpecs.map((spec, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0 }}>✓</span>
                      <input
                        value={spec}
                        onChange={(e) => setESpecs((s) => s.map((v, j) => j === i ? e.target.value : v))}
                        style={{ flex: 1, padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 7, fontSize: "0.82rem", color: "#111827", outline: "none" }}
                      />
                      <button
                        onClick={() => setESpecs((s) => s.filter((_, j) => j !== i))}
                        style={{ width: 26, height: 26, border: "1px solid #fca5a5", borderRadius: 6, background: "#fef2f2", color: "#dc2626", fontSize: "0.85rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEdit}
                  style={{ flex: 1, padding: "0.65rem 1rem", background: "linear-gradient(135deg,#f97316,#ef4444,#6366f1)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditOpen(false)}
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
