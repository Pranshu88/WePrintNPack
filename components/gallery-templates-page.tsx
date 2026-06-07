"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GalleryTemplate } from "@/lib/template-data";

const PAGE_SIZE = 20;

// Scale factor to zoom preview image just enough to hide the canvas padding margins.
// Formula: 1 + (2 * PX / CW) where PX = left/right canvas margin, CW = canvas width.
// Business cards: CW=460, PX=30 → 1 + 60/460 ≈ 1.130
// Flyers/Posters: CW≈460, PX=20 → 1 + 40/460 ≈ 1.087
// Banners:        CW≈540, PX=12 → 1 + 24/540 ≈ 1.044
function getPreviewScale(productSlug: string): number {
  const s = productSlug.toLowerCase();
  if (s.includes("business") || s.includes("-bc") || s.includes("card")) return 1.13;
  if (s.includes("flyer") || s.includes("poster")) return 1.09;
  if (s.includes("banner")) return 1.05;
  return 1.10;
}

// Template name → IndexedDB key (same keys used by admin & carousel)
const BC_NAME_TO_KEY: Record<string, string> = {
  "Business Cards": "bc-standard",
  "Premium Business Cards": "bc-premium",
  "Luxury Business Cards": "bc-luxury",
  "Express Flyers": "fly-standard",
  "Prime Flyers": "fly-premium",
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

type PaginatedResponse = {
  templates: GalleryTemplate[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

type Props = {
  productSlug: string;
  productName: string;
  productBasePath?: string;
  categoryLabel?: string;
  allowedNames?: string[];
};

export default function GalleryTemplatePage({
  productSlug,
  productName,
  productBasePath = "/products/dress-shirts",
  categoryLabel = "Dress Shirts",
  allowedNames,
}: Props) {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [bcImages, setBcImages] = useState<Record<string, string>>({});
  const router = useRouter();

  // Load business card package photos from IndexedDB (same source as admin)
  useEffect(() => {
    const bcNames = (allowedNames ?? []).filter((n) => BC_NAME_TO_KEY[n]);
    if (bcNames.length === 0) return;
    void (async () => {
      const loaded: Record<string, string> = {};
      for (const name of bcNames) {
        const img = await loadBcImage(BC_NAME_TO_KEY[name]);
        if (img) loaded[name] = img;
      }
      if (Object.keys(loaded).length > 0) setBcImages(loaded);
    })();
  }, [allowedNames]);

  const fetchPage = useCallback(
    (p: number, isInitial = false) => {
      if (!isInitial) setPageLoading(true);
      fetch(`/api/products/${productSlug}/templates?page=${p}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: PaginatedResponse) => {
          let list = data.templates ?? [];
          if (allowedNames && allowedNames.length > 0) {
            // Keep only the first (most-recent) template per allowed name
            const seen = new Set<string>();
            const deduped: typeof list = [];
            for (const name of allowedNames) {
              const match = list.find((t) => t.name.toLowerCase() === name.toLowerCase());
              if (match && !seen.has(match.id)) {
                seen.add(match.id);
                deduped.push(match);
              }
            }
            list = deduped;
          }
          if (isInitial && list.length === 0) {
            router.replace(`${productBasePath}/${productSlug}`);
            return;
          }
          setTemplates(list);
          setTotal(list.length);
          setPage(data.page ?? p);
          setTotalPages(data.totalPages ?? 1);
          setLoading(false);
          setPageLoading(false);
        })
        .catch(() => {
          if (isInitial) router.replace(`${productBasePath}/${productSlug}`);
          else { setPageLoading(false); }
        });
    },
    [productSlug, productBasePath, router]
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  function goTo(p: number) {
    if (p < 1 || p > totalPages || pageLoading) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPage(p);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Loading templates…</div>
      </div>
    );
  }

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", paddingBottom: "5rem", position: "relative", overflow: "hidden" }}>

      {/* Gradient orbs */}
      <div style={{ position: "fixed", top: "-120px", left: "-120px", width: "480px", height: "480px", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,146,144,0.22) 0%, rgba(249,168,212,0.12) 50%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-120px", right: "-120px", width: "480px", height: "480px", borderRadius: "50%", background: "radial-gradient(circle, rgba(147,197,253,0.22) 0%, rgba(196,181,253,0.12) 50%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid #f0f0f0", padding: "0.75rem 0", position: "relative", zIndex: 1, background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
        <div className="container container-wide" style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#9ca3af", alignItems: "center" }}>
          <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href={productBasePath} style={{ color: "#9ca3af", textDecoration: "none" }}>{categoryLabel}</Link>
          <span>/</span>
          <Link href={`${productBasePath}/${productSlug}`} style={{ color: "#9ca3af", textDecoration: "none" }}>{productName}</Link>
          <span>/</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Templates</span>
        </div>
      </div>

      <div className="container container-wide" style={{ paddingTop: "2.5rem", position: "relative", zIndex: 1 }}>

        {/* Heading */}
        <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "2rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
              Choose a template
            </h1>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "#6b7280" }}>
              Select a starting point for your{" "}
              <strong style={{ background: "linear-gradient(90deg, #7c3aed, #db2777, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {productName}
              </strong>
            </p>
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, background: "linear-gradient(90deg, #7c3aed, #db2777)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {total} design{total !== 1 ? "s" : ""} available
          </span>
        </div>

        {/* Template grid */}
        <div
          style={{
            opacity: pageLoading ? 0.5 : 1,
            transition: "opacity 0.15s",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "2rem",
          }}
        >
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              overrideImage={bcImages[template.name]}
              productSlug={productSlug}
              onClick={() =>
                router.push(`${productBasePath}/${productSlug}?gallery=${template.id}`)
              }
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
            <PaginationBtn onClick={() => goTo(page - 1)} disabled={page <= 1 || pageLoading} label="← Prev" />
            {pageNumbers.map((n, i) =>
              n === "…" ? (
                <span key={`ellipsis-${i}`} style={{ padding: "0 0.25rem", color: "#9ca3af", fontSize: "0.875rem" }}>…</span>
              ) : (
                <PaginationBtn
                  key={n}
                  onClick={() => goTo(n as number)}
                  disabled={pageLoading}
                  label={String(n)}
                  active={n === page}
                />
              )
            )}
            <PaginationBtn onClick={() => goTo(page + 1)} disabled={page >= totalPages || pageLoading} label="Next →" />
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function PaginationBtn({
  onClick,
  disabled,
  label,
  active = false,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.4rem 0.85rem",
        borderRadius: "8px",
        border: active ? "2px solid #06b6d4" : "1px solid #e5e7eb",
        background: active ? "#06b6d4" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: "0.875rem",
        fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  overrideImage,
  productSlug,
  onClick,
}: {
  template: GalleryTemplate;
  overrideImage?: string;
  productSlug: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const designCount = template.designs.length;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        background: "#fff",
        borderRadius: "24px",
        boxShadow: hovered
          ? "0 16px 48px rgba(0,0,0,0.14)"
          : "0 2px 16px rgba(0,0,0,0.07)",
        border: `1.5px solid ${hovered ? "rgba(249,115,22,0.3)" : "rgba(0,0,0,0.06)"}`,
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.2s",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      {/* Image area */}
      <div style={{ position: "relative", background: "linear-gradient(135deg, #fdf4ff 0%, #eff6ff 100%)", padding: "1.75rem 1.5rem 1.25rem" }}>

        {/* Heart button */}
        <button
          onClick={(e) => { e.stopPropagation(); setWishlisted((w) => !w); }}
          style={{
            position: "absolute", top: "0.75rem", right: "0.75rem",
            width: 34, height: 34, borderRadius: "50%",
            background: "#fff", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)", zIndex: 2,
            transition: "transform 0.15s",
          }}
          aria-label="Wishlist"
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={wishlisted ? "#ef4444" : "none"}
            stroke={wishlisted ? "#ef4444" : "#9ca3af"}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Card image */}
        <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 28px rgba(0,0,0,0.2)", aspectRatio: "7/4" }}>
          <img
            src={overrideImage || template.designs[0]?.frontImage || template.designs[0]?.frontOverlay || template.previewImage}
            alt={template.name}
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", transition: "transform 0.35s ease", transform: hovered ? `scale(${(getPreviewScale(productSlug) * 1.04).toFixed(3)})` : `scale(${getPreviewScale(productSlug)})` }}
          />
          {hovered && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                color: "#fff",
                padding: "0.5rem 1.5rem", borderRadius: "999px",
                fontWeight: 700, fontSize: "0.85rem",
                boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
              }}>
                Select →
              </span>
            </div>
          )}
        </div>

        {/* Design options badge */}
        {designCount > 0 && (
          <div style={{
            marginTop: "0.9rem", display: "flex", justifyContent: "center",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: "#fff", borderRadius: "999px",
              padding: "5px 14px",
              fontSize: "0.78rem", fontWeight: 700,
              color: "#ef4444",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              border: "1px solid rgba(249,115,22,0.15)",
            }}>
              🎨 {designCount} design option{designCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Name + underline */}
      <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
        <p style={{ margin: "0 0 0.6rem", fontWeight: 700, fontSize: "1rem", color: "#111827", lineHeight: 1.3 }}>
          {template.name}
        </p>
        <div style={{ height: "3px", width: "56px", borderRadius: "999px", background: "linear-gradient(90deg, #7c3aed, #db2777, #f97316, #fbbf24)" }} />
      </div>
    </div>
  );
}
