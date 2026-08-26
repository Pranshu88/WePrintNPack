"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { getProductLink } from "@/lib/product-link";
import { subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";

// Runs `items` through `fn` with at most `limit` in flight at once. Firing 50+
// requests to the remote DB in one Promise.all burst exhausts local ephemeral
// ports (EADDRNOTAVAIL) — capping concurrency keeps the speed win without that.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

// Gallery templates that shouldn't appear as their own "Popular Products" cards, kept out by
// id (not deleted) — the products page, admin, and everything else that references these real
// DB rows is unaffected; this only trims what this carousel surfaces.
const CAROUSEL_EXCLUDED_TEMPLATE_IDS = new Set([
  "bn0001mpmc48n5", // Vinyl Banner
  "bn0032mpmc48n8", // Large Outdoor Banner
  "bn0063mpmc48n9", // Standard Roll-Up Banner
  "bn0084mpmc48nb", // Premium Roll-Up Banner
  "xi2twlqmppobesk", // Poll T shirt
]);

type CarouselItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  link: string;
  dielineSlug?: string;
  category?: string;
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

export default function PopularProductsCarousel({
  products,
  layout = "carousel",
  query = "",
  activeCategory = "All",
  onCategoryCounts,
  onVisibleCount,
}: {
  products: Product[];
  layout?: "carousel" | "grid";
  query?: string;
  activeCategory?: string;
  onCategoryCounts?: (counts: Record<string, number>) => void;
  onVisibleCount?: (n: number) => void;
}) {
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
      const handledSlugs = new Set<string>();

      // Every distinct slug we'll need templates for, gathered up front so they can
      // all be fetched in ONE request instead of one network round-trip per slug
      // (previously 20-50+ separate calls to the remote DB — the dominant cost of
      // this whole component).
      type SlugJob = { slug: string; image: string; startingPrice: string; linkBase: string; categoryLabel?: string; directLinkPrefix?: string };
      const jobs: SlugJob[] = [];
      function planSlug(slug: string, image: string, startingPrice: string, linkBase: string, categoryLabel?: string, directLinkPrefix?: string) {
        if (handledSlugs.has(slug)) return;
        handledSlugs.add(slug);
        jobs.push({ slug, image, startingPrice, linkBase, categoryLabel, directLinkPrefix });
      }

      for (const product of products) {
        if (product.category === "packaging-box") continue; // shown under Dieline Template Maker, not here
        if (product.category === "business-cards") {
          planSlug(product.slug, product.image, product.startingPrice, "/products/business-cards", "Business Cards");
        } else if (product.category === "flyers") {
          planSlug(product.slug, product.image, product.startingPrice, "/products/business-cards", "Flyers");
        } else if (product.category === "marketing-material") {
          for (const name of CATEGORY_SUBPRODUCT_OPTIONS["marketing-material"]) {
            planSlug(subProductSlug(name), product.image, product.startingPrice, "/products/marketing-material", name);
          }
        } else if (product.category === "promotional-products") {
          for (const name of CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"]) {
            planSlug(subProductSlug(name), product.image, product.startingPrice, "/products/promotional-products", name);
          }
        } else {
          // getProductLink already returns this product's full URL (format varies by
          // category — some append /templates, some don't) — use it verbatim rather
          // than trying to force it through the generic linkBase + "/" + slug pattern.
          planSlug(product.slug, product.image, product.startingPrice, "", undefined, getProductLink(product));
        }
      }
      const bcProduct = products.find((p) => p.category === "business-cards");
      if (bcProduct) {
        for (const name of CATEGORY_SUBPRODUCT_OPTIONS["business-cards"]) {
          planSlug(subProductSlug(name), bcProduct.image, bcProduct.startingPrice, "/products/business-cards", name);
        }
      }

      let templatesBySlug: Record<string, { id: string; name: string; previewImage: string; price?: string }[]> = {};
      try {
        const res = await fetch(`/api/products/templates-batch?slugs=${jobs.map((j) => encodeURIComponent(j.slug)).join(",")}`, { cache: "no-store" });
        const data = (await res.json()) as { templatesBySlug?: typeof templatesBySlug };
        templatesBySlug = data.templatesBySlug ?? {};
      } catch { /* leave empty — items just won't populate for this load */ }

      async function itemsForJob(job: SlugJob): Promise<CarouselItem[]> {
        let meta: Record<string, { price: string }> = {};
        const metaKey = META_KEYS[job.slug];
        if (metaKey) {
          try { const raw = localStorage.getItem(metaKey); if (raw) meta = JSON.parse(raw) as Record<string, { price: string }>; } catch { /* ignore */ }
        }
        const templates = templatesBySlug[job.slug] ?? [];
        const items: CarouselItem[] = [];
        for (const t of templates) {
          if (CAROUSEL_EXCLUDED_TEMPLATE_IDS.has(t.id)) continue;
          const idbImg = await loadBcImage(t.id);
          const rawPrice = meta[t.id]?.price ?? t.price?.trim();
          const price = rawPrice
            ? (/[$+]/.test(rawPrice) ? rawPrice : `$${rawPrice} + tax`)
            : (PRICE_FALLBACKS[t.name] ?? `Starting at ${job.startingPrice}`);
          items.push({
            id: t.id,
            name: t.name,
            price,
            image: idbImg || t.previewImage || job.image,
            // directLinkPrefix (set via getProductLink) already includes the full path
            // including the slug — appending job.slug again would duplicate it, so only
            // fall back to the generic linkBase + "/" + slug pattern when it's absent.
            link: job.directLinkPrefix
              ? `${job.directLinkPrefix}?gallery=${t.id}`
              : `${job.linkBase}/${job.slug}?gallery=${t.id}`,
            category: job.categoryLabel,
          });
        }
        return items;
      }

      const jobResults = await Promise.all(jobs.map(itemsForJob));
      const allItems: CarouselItem[] = [];
      for (const product of products) {
        if (product.category === "business-cards" || product.category === "flyers") {
          const jobIdx = jobs.findIndex((j) => j.slug === product.slug);
          const dbItems = jobIdx >= 0 ? jobResults[jobIdx] : [];
          allItems.push(...dbItems);
        }
      }
      // Remaining jobs (marketing-material/promotional-products/business-cards subproducts,
      // and "everything else" top-level products) don't need the legacy-package merge step.
      const bcAndFlyerSlugs = new Set(products.filter((p) => p.category === "business-cards" || p.category === "flyers").map((p) => p.slug));
      jobs.forEach((job, i) => {
        if (bcAndFlyerSlugs.has(job.slug)) return;
        allItems.push(...jobResults[i]);
      });

      _memCache = allItems;
      setItems(allItems);
    }
    void loadAll();
  }, [products]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 360 : -360, behavior: "smooth" });
  };

  useEffect(() => {
    if (!onCategoryCounts || items.length === 0) return;
    const counts: Record<string, number> = {};
    for (const item of items) {
      if (!item.category) continue;
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    onCategoryCounts(counts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategory !== "All" && item.category !== activeCategory) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, activeCategory]);

  useEffect(() => {
    onVisibleCount?.(visibleItems.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems.length]);

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

  if (layout === "grid" && visibleItems.length === 0) {
    return <p className="product-search-empty">No products match your search.</p>;
  }

  return (
    <div className="lp-pop-carousel">
      {layout === "carousel" && (
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
      )}

      <div className={`lp-pop-row${layout === "grid" ? " lp-pop-grid" : ""}`} ref={scrollRef}>
        {visibleItems.map((item, i) => {
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
                {layout === "grid" ? (
                  <>
                    {item.category && (
                      <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 999, background: "#f3f4f6", color: "#374151", fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.5rem", alignSelf: "flex-start" }}>
                        {item.category}
                      </span>
                    )}
                    <span className="lp-pop-name">{item.name}</span>
                    <Link
                      href={item.link}
                      onClick={saveScroll}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#dc2626", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", marginTop: "0.6rem" }}
                    >
                      Shop Now →
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="lp-pop-name">{item.name}</span>
                    <Link
                      href={item.link}
                      className="lp-pop-btn"
                      style={{ background: BTN_COLORS[i % BTN_COLORS.length] }}
                      onClick={saveScroll}
                    >
                      Shop Now
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {layout === "carousel" && (
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
      )}
    </div>
  );
}
