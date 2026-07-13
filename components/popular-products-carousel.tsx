"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { getProductLink } from "@/lib/product-link";
import { subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";

const BTN_COLORS = [
  "#111827", "#ec4899", "#0d9488", "#f97316", "#16a34a",
  "#2563eb", "#7c3aed", "#dc2626", "#0891b2", "#b45309",
];

const PRICE_FALLBACKS: Record<string, string> = {
  "Business Cards":          "$79 + tax",
  "Premium Business Cards":  "$119 + tax",
  "Luxury Business Cards":   "From $179 + tax",
  "Express Flyers":          "$159 + tax",
  "Prime Flyers":            "$329 + tax",
  "Vinyl Banner":            "From $109 + tax",
  "Large Outdoor Banner":    "$179 + tax",
  "Standard Roll-Up Banner": "$229 + tax",
  "Premium Roll-Up Banner":  "$279 + tax",
  "Small Posters":           "$109 + tax",
  "Large Posters":           "$139 + tax",
  "Elite Yard Sign":         "$189 + tax",
  "Business Yard Sign":      "$379 + tax",
  "Die-Cut Stickers":        "$89 + tax",
  "Product Labels":          "$139 + tax",
};

const PACKAGING_BOX_DEFAULTS = [
  { id: "pb-standard",  title: "Pizza Box",           price: "$150 + tax", metaKey: "pizzabox-packages-meta", subSlug: "pizza-boxes",           dielineSlug: "pizza-boxes" },
  { id: "mb-standard",  title: "Mailer Box",          price: "$200 + tax", metaKey: "mb-packages-meta",       subSlug: "mailer-boxes",           dielineSlug: "mailer-boxes" },
  { id: "sb-standard",  title: "Shipping Box",        price: "$220 + tax", metaKey: "sb-packages-meta",       subSlug: "shipping-boxes",         dielineSlug: "shipping-boxes" },
  { id: "ssb-standard", title: "Square Shipping Box", price: "$230 + tax", metaKey: "ssb-packages-meta",      subSlug: "square-shipping-boxes",  dielineSlug: "square-shipping-boxes" },
];

type CarouselItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  link: string;
  dielineSlug?: string;
};

function openBcDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("bc-packages-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

type StoredPackage = { id: string; title: string; price: string };

function loadPackagesList(key: string, fallback: StoredPackage[]): StoredPackage[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredPackage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return fallback;
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

const SCROLL_KEY = "wp_landing_scroll_y";

// Module-level cache — lives in JS memory for the whole tab session.
// No size limits, no serialization, instant reads. Survives React unmount/remount.
let _memCache: CarouselItem[] = [];

function saveScroll() {
  try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* ignore */ }
}

function restoreScroll() {
  try {
    const y = sessionStorage.getItem(SCROLL_KEY);
    if (y) { window.scrollTo({ top: parseInt(y, 10), behavior: "instant" }); sessionStorage.removeItem(SCROLL_KEY); }
  } catch { /* ignore */ }
}

export default function PopularProductsCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  // Initialise from module-level memory cache — instant, no size limits
  const [items, setItems] = useState<CarouselItem[]>(() => _memCache);

  // Restore scroll position when coming back from a product page
  useEffect(() => { restoreScroll(); }, []);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [sync, items.length]);

  useEffect(() => {
    // Skip API calls if module cache already has data (back navigation, tab still open)
    if (_memCache.length > 0) return;

    const META_KEYS: Record<string, string> = {
      "vinyl-banners":        "banner-packages-meta",
      "posters":              "poster-packages-meta",
      "yard-signs":           "yardsign-packages-meta",
      "stickers-and-labels":  "sticker-packages-meta",
    };

    async function loadAll() {
      const allItems: CarouselItem[] = [];
      const handledSlugs = new Set<string>();

      // Every gallery template that actually exists for a given product slug, whether or
      // not that slug has its own Product record (ad-hoc sub-products like Door Hangers
      // only exist as a template-table entry, not a Product).
      async function fetchInto(slug: string, image: string, startingPrice: string, linkBase: string) {
        if (handledSlugs.has(slug)) return;
        handledSlugs.add(slug);

        let meta: Record<string, { price: string }> = {};
        const metaKey = META_KEYS[slug];
        if (metaKey) {
          try { const raw = localStorage.getItem(metaKey); if (raw) meta = JSON.parse(raw) as Record<string, { price: string }>; } catch { /* ignore */ }
        }

        try {
          const res = await fetch(`/api/products/${slug}/templates`, { cache: "no-store" });
          const data = (await res.json()) as { templates?: { id: string; name: string; previewImage: string; price?: string }[] };
          for (const t of (data.templates ?? [])) {
            const idbImg = await loadBcImage(t.id);
            const rawPrice = meta[t.id]?.price ?? t.price?.trim();
            const price = rawPrice
              ? (/[$+]/.test(rawPrice) ? rawPrice : `$${rawPrice} + tax`)
              : (PRICE_FALLBACKS[t.name] ?? `Starting at ${startingPrice}`);
            allItems.push({
              id: t.id,
              name: t.name,
              price,
              image: idbImg || t.previewImage || image,
              link: `${linkBase}/${slug}?gallery=${t.id}`,
            });
          }
        } catch { /* skip on error */ }
      }

      for (const product of products) {
        if (product.category === "packaging-box") {
          for (const pkg of PACKAGING_BOX_DEFAULTS) {
            let meta: Record<string, { title?: string; price?: string }> = {};
            try { const raw = localStorage.getItem(pkg.metaKey); if (raw) meta = JSON.parse(raw) as Record<string, { title?: string; price?: string }>; } catch { /* ignore */ }
            const saved = meta[pkg.id];
            const img = await loadBcImage(pkg.id);
            allItems.push({
              id: pkg.id,
              name: saved?.title ?? pkg.title,
              price: saved?.price ?? pkg.price,
              image: img || product.image,
              link: `/products/packaging-box/${pkg.subSlug}`,
              dielineSlug: pkg.dielineSlug,
            });
          }
          continue;
        }

        if (product.category === "business-cards" || product.category === "flyers") {
          await fetchInto(product.slug, product.image, product.startingPrice, "/products/business-cards");

          // Legacy browser-only packages added before this product had real DB templates —
          // only shown if a same-named DB template doesn't already cover them.
          const dbNames = new Set(allItems.filter((i) => i.link.startsWith(`/products/business-cards/${product.slug}`)).map((i) => i.name));
          const legacyKey = product.category === "business-cards" ? "bc-packages-list" : "fly-packages-list";
          for (const pkg of loadPackagesList(legacyKey, [])) {
            if (dbNames.has(pkg.title)) continue;
            const img = await loadBcImage(pkg.id);
            allItems.push({ id: pkg.id, name: pkg.title, price: pkg.price, image: img || product.image, link: `/products/business-cards/${product.slug}` });
          }
          continue;
        }

        if (product.category === "marketing-material") {
          for (const name of CATEGORY_SUBPRODUCT_OPTIONS["marketing-material"]) {
            await fetchInto(subProductSlug(name), product.image, product.startingPrice, "/products/marketing-material");
          }
          continue;
        }

        if (product.category === "promotional-products") {
          for (const name of CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"]) {
            await fetchInto(subProductSlug(name), product.image, product.startingPrice, "/products/promotional-products");
          }
          continue;
        }

        // Everything else (T-Shirts, Dress Shirts, Hoodies, Brochures, Postcards, Banners…) —
        // fetch its own gallery templates directly.
        if (handledSlugs.has(product.slug)) continue;
        handledSlugs.add(product.slug);
        try {
          const res = await fetch(`/api/products/${product.slug}/templates`, { cache: "no-store" });
          const data = (await res.json()) as { templates?: { id: string; name: string; previewImage: string; price?: string }[] };
          for (const t of (data.templates ?? [])) {
            const rawPrice = t.price?.trim();
            const price = rawPrice
              ? (/[$+]/.test(rawPrice) ? rawPrice : `$${rawPrice} + tax`)
              : `Starting at ${product.startingPrice}`;
            allItems.push({
              id: t.id,
              name: t.name,
              price,
              image: t.previewImage || product.image,
              link: `${getProductLink(product)}?gallery=${t.id}`,
            });
          }
        } catch { /* skip on error */ }
      }

      // Ad-hoc Business Printing sub-products (Door Hangers, Rack Cards, Letterheads…) that
      // have no Product record of their own — canonical list in CATEGORY_SUBPRODUCT_OPTIONS.
      const bcProduct = products.find((p) => p.category === "business-cards");
      if (bcProduct) {
        for (const name of CATEGORY_SUBPRODUCT_OPTIONS["business-cards"]) {
          await fetchInto(subProductSlug(name), bcProduct.image, bcProduct.startingPrice, "/products/business-cards");
        }
      }

      _memCache = allItems;
      setItems(allItems);
    }
    void loadAll();
  }, [products]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 360 : -360, behavior: "smooth" });
  };

  if (items.length === 0) return (
    <div className="lp-pop-carousel">
      <div className="lp-pop-row" style={{ overflow: "hidden" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="lp-pop-card" style={{ pointerEvents: "none" }}>
            <div className="lp-pop-img lp-shimmer" />
            <div className="lp-pop-info" style={{ gap: 8 }}>
              <div className="lp-shimmer" style={{ height: 14, borderRadius: 6, width: "70%" }} />
              <div className="lp-shimmer" style={{ height: 12, borderRadius: 6, width: "45%" }} />
              <div className="lp-shimmer" style={{ height: 38, borderRadius: 8, marginTop: "auto" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="lp-pop-carousel">
      <button
        className={`lp-pop-arrow lp-pop-arrow-left${canLeft ? " lp-pop-arrow-visible" : ""}`}
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        aria-hidden={!canLeft}
        tabIndex={canLeft ? 0 : -1}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="lp-pop-row" ref={scrollRef}>
        {items.map((item, i) => {
          const isPizzaBox = item.id === "pb-standard";
          const isSquareShipping = item.id === "ssb-standard";
          const hasHoverMenu = isPizzaBox || isSquareShipping;
          const isHovered = hoveredId === item.id;
          return (
            <div
              key={item.id}
              className="lp-pop-card"
              onMouseEnter={hasHoverMenu ? () => setHoveredId(item.id) : undefined}
              onMouseLeave={hasHoverMenu ? () => setHoveredId(null) : undefined}
            >
              <div className="lp-pop-img" style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {isPizzaBox && isHovered && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    background: "rgba(0,0,0,0.22)",
                  }}>
                    <Link
                      href={item.link}
                      style={{
                        padding: "0.42rem 1.1rem",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                      }}
                      onClick={(e) => { e.stopPropagation(); saveScroll(); }}
                    >
                      Mockup
                    </Link>
                  </div>
                )}
                {isSquareShipping && isHovered && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    background: "rgba(0,0,0,0.22)",
                  }}>
                    <Link
                      href={item.link}
                      className="lp-pop-hover-mockup"
                      style={{
                        padding: "0.42rem 1.1rem",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                      }}
                      onClick={(e) => { e.stopPropagation(); saveScroll(); }}
                    >
                      Mockup
                    </Link>
                    <Link
                      href={item.link}
                      className="lp-pop-hover-editor"
                      style={{
                        padding: "0.42rem 1.1rem",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                      }}
                      onClick={(e) => { e.stopPropagation(); saveScroll(); }}
                    >
                      Editor
                    </Link>
                  </div>
                )}
              </div>
              <div className="lp-pop-info">
                <span className="lp-pop-name">{item.name}</span>
                <span className="lp-pop-price">{item.price}</span>
                <Link
                  href={item.link}
                  className="lp-pop-btn"
                  style={{ background: BTN_COLORS[i % BTN_COLORS.length] }}
                  onClick={saveScroll}
                >
                  Shop Now
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={`lp-pop-arrow lp-pop-arrow-right${canRight ? " lp-pop-arrow-visible" : ""}`}
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        aria-hidden={!canRight}
        tabIndex={canRight ? 0 : -1}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
