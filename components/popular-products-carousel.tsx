"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { getProductLink } from "@/lib/product-link";

const BTN_COLORS = [
  "#111827", "#ec4899", "#0d9488", "#f97316", "#16a34a",
  "#2563eb", "#7c3aed", "#dc2626", "#0891b2", "#b45309",
];

const BC_DEFAULTS = [
  { id: "bc-standard", title: "Business Cards",         price: "$79 + tax" },
  { id: "bc-premium", title: "Premium Business Cards",  price: "$119 + tax" },
  { id: "bc-luxury",  title: "Luxury Business Cards",   price: "From $179 + tax" },
];

const FLY_DEFAULTS = [
  { id: "fly-standard", title: "Express Flyers", price: "$159 + tax" },
  { id: "fly-premium",  title: "Prime Flyers",   price: "$329 + tax" },
];

const PRICE_FALLBACKS: Record<string, string> = {
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

const MARKETING_GALLERY_SLUGS = [
  { gallerySlug: "vinyl-banners",     metaKey: "banner-packages-meta" },
  { gallerySlug: "posters",           metaKey: "poster-packages-meta" },
  { gallerySlug: "yard-signs",        metaKey: "yardsign-packages-meta" },
];

const PROMO_GALLERY_SLUGS = [
  { gallerySlug: "stickers-and-labels", metaKey: "sticker-packages-meta" },
];

const PACKAGING_BOX_DEFAULTS = [
  { id: "pb-standard",  title: "Pizza Box",           price: "$150 + tax", metaKey: "pizzabox-packages-meta", subSlug: "pizza-boxes" },
  { id: "mb-standard",  title: "Mailer Box",          price: "$200 + tax", metaKey: "mb-packages-meta",       subSlug: "mailer-boxes" },
  { id: "sb-standard",  title: "Shipping Box",        price: "$220 + tax", metaKey: "sb-packages-meta",       subSlug: "shipping-boxes" },
  { id: "ssb-standard", title: "Square Shipping Box", price: "$230 + tax", metaKey: "ssb-packages-meta",      subSlug: "square-shipping-boxes" },
];

type CarouselItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  link: string;
};

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

    async function loadAll() {
      const allItems: CarouselItem[] = [];

      for (const product of products) {
        if (product.category === "business-cards") {
          // Fetch gallery templates so we can link directly to the right package
          let bcTemplates: Array<{ id: string; name: string }> = [];
          try {
            const res = await fetch(`/api/products/${product.slug}/templates`, { cache: "force-cache" });
            const data = (await res.json()) as { templates?: Array<{ id: string; name: string }> };
            bcTemplates = data.templates ?? [];
          } catch { /* skip */ }

          for (const bc of BC_DEFAULTS) {
            const img = await loadBcImage(bc.id);
            const tpl = bcTemplates.find((t) => t.name === bc.title);
            allItems.push({
              id: bc.id,
              name: bc.title,
              price: bc.price,
              image: img || product.image,
              link: tpl
                ? `/products/business-cards/${product.slug}?gallery=${tpl.id}`
                : `/products/business-cards/${product.slug}`,
            });
          }
        } else if (product.category === "flyers") {
          let flyTemplates: Array<{ id: string; name: string; previewImage: string }> = [];
          try {
            const res = await fetch(`/api/products/${product.slug}/templates`, { cache: "force-cache" });
            const data = (await res.json()) as { templates?: Array<{ id: string; name: string; previewImage: string }> };
            flyTemplates = data.templates ?? [];
          } catch { /* skip */ }

          for (const fly of FLY_DEFAULTS) {
            const idbImg = await loadBcImage(fly.id);
            const tpl = flyTemplates.find((t) => t.name === fly.title);
            allItems.push({
              id: fly.id,
              name: fly.title,
              price: fly.price,
              image: idbImg || tpl?.previewImage || product.image,
              link: tpl
                ? `/products/business-cards/${product.slug}?gallery=${tpl.id}`
                : `/products/business-cards/${product.slug}`,
            });
          }
        } else if (product.category === "marketing-material") {
          for (const { gallerySlug, metaKey } of MARKETING_GALLERY_SLUGS) {
            let meta: Record<string, { price: string }> = {};
            try { const raw = localStorage.getItem(metaKey); if (raw) meta = JSON.parse(raw) as Record<string, { price: string }>; } catch { /* ignore */ }
            try {
              const res = await fetch(`/api/products/${gallerySlug}/templates`, { cache: "force-cache" });
              const data = (await res.json()) as { templates?: { id: string; name: string; previewImage: string }[] };
              for (const t of (data.templates ?? [])) {
                const idbImg = await loadBcImage(t.id);
                const price = meta[t.id]?.price ?? PRICE_FALLBACKS[t.name] ?? `Starting at ${product.startingPrice}`;
                allItems.push({
                  id: t.id,
                  name: t.name,
                  price,
                  image: idbImg || t.previewImage || product.image,
                  link: `/products/marketing-material/${gallerySlug}?gallery=${t.id}`,
                });
              }
            } catch { /* skip on error */ }
          }
        } else if (product.category === "promotional-products") {
          for (const { gallerySlug, metaKey } of PROMO_GALLERY_SLUGS) {
            let meta: Record<string, { price: string }> = {};
            try { const raw = localStorage.getItem(metaKey); if (raw) meta = JSON.parse(raw) as Record<string, { price: string }>; } catch { /* ignore */ }
            try {
              const res = await fetch(`/api/products/${gallerySlug}/templates`, { cache: "force-cache" });
              const data = (await res.json()) as { templates?: { id: string; name: string; previewImage: string }[] };
              for (const t of (data.templates ?? [])) {
                const idbImg = await loadBcImage(t.id);
                const price = meta[t.id]?.price ?? PRICE_FALLBACKS[t.name] ?? `Starting at ${product.startingPrice}`;
                allItems.push({
                  id: t.id,
                  name: t.name,
                  price,
                  image: idbImg || t.previewImage || product.image,
                  link: `/products/promotional-products/${gallerySlug}?gallery=${t.id}`,
                });
              }
            } catch { /* skip on error */ }
          }
        } else if (product.category === "packaging-box") {
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
            });
          }
        } else {
          try {
            const res = await fetch(`/api/products/${product.slug}/templates`, { cache: "force-cache" });
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
      }

      _memCache = allItems;
      setItems(allItems);
    }
    void loadAll();
  }, [products]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 360 : -360, behavior: "smooth" });
  };

  if (items.length === 0) return null;

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
        {items.map((item, i) => (
          <div key={item.id} className="lp-pop-card">
            <div className="lp-pop-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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
        ))}
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
