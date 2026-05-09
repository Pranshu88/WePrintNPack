"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GalleryTemplate } from "@/lib/template-data";

const PAGE_SIZE = 20;

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
};

export default function GalleryTemplatePage({
  productSlug,
  productName,
  productBasePath = "/products/dress-shirts",
  categoryLabel = "Dress Shirts",
}: Props) {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const router = useRouter();

  const fetchPage = useCallback(
    (p: number, isInitial = false) => {
      if (!isInitial) setPageLoading(true);
      fetch(`/api/products/${productSlug}/templates?page=${p}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: PaginatedResponse) => {
          const list = data.templates ?? [];
          if (isInitial && list.length === 0) {
            router.replace(`${productBasePath}/${productSlug}`);
            return;
          }
          setTemplates(list);
          setTotal(data.total ?? 0);
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
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>

      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid #f3f4f6", padding: "0.75rem 0" }}>
        <div className="container container-wide" style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <Link href={productBasePath} style={{ color: "#6b7280", textDecoration: "none" }}>{categoryLabel}</Link>
          <span>/</span>
          <Link href={`${productBasePath}/${productSlug}`} style={{ color: "#6b7280", textDecoration: "none" }}>{productName}</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>Templates</span>
        </div>
      </div>

      <div className="container container-wide" style={{ paddingTop: "2rem" }}>

        {/* Heading */}
        <div style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
              Choose a template
            </h1>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "#6b7280" }}>
              Select a starting point for your <strong style={{ color: "#374151" }}>{productName}</strong>
            </p>
          </div>
          <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>
            {total} design{total !== 1 ? "s" : ""} available
          </span>
        </div>

        {/* Template grid */}
        <div
          style={{
            opacity: pageLoading ? 0.5 : 1,
            transition: "opacity 0.15s",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
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

        {/* Skip link */}
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link
            href={`${productBasePath}/${productSlug}`}
            style={{ fontSize: "0.875rem", color: "#6b7280", textDecoration: "underline" }}
          >
            Skip and go to order page →
          </Link>
        </div>
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
  onClick,
}: {
  template: GalleryTemplate;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Outer card — gray background, portrait container */}
      <div
        style={{
          borderRadius: "16px",
          background: "#f3f4f6",
          border: `2px solid ${hovered ? "#06b6d4" : "transparent"}`,
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.12)" : "none",
          position: "relative",
          padding: "2.75rem 1rem 1rem",
        }}
      >
        {/* Heart / wishlist button */}
        <button
          onClick={(e) => { e.stopPropagation(); setWishlisted((w) => !w); }}
          style={{
            position: "absolute", top: "0.65rem", right: "0.65rem",
            width: 34, height: 34, borderRadius: "50%",
            background: "#fff", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.13)", zIndex: 2,
          }}
          aria-label="Wishlist"
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={wishlisted ? "#ef4444" : "none"}
            stroke={wishlisted ? "#ef4444" : "#374151"}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Business card preview — landscape ratio matching actual card dimensions */}
        <div style={{ position: "relative", aspectRatio: "7 / 4", borderRadius: "6px", overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.18)" }}>
          <img
            src={template.previewImage}
            alt={template.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {hovered && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                background: "#06b6d4", color: "#fff",
                padding: "0.45rem 1.25rem", borderRadius: "999px",
                fontWeight: 700, fontSize: "0.825rem",
              }}>
                Select →
              </span>
            </div>
          )}
        </div>

        {/* Designs count inside the gray card, below the image */}
        <p style={{ margin: "0.55rem 0 0", fontSize: "0.75rem", color: "#6b7280", textAlign: "center" }}>
          {template.designs.length > 0
            ? `${template.designs.length} design option${template.designs.length !== 1 ? "s" : ""}`
            : "No designs yet"}
        </p>
      </div>

      {/* Name below the gray card */}
      <div style={{ padding: "0.6rem 0.25rem 0" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827", lineHeight: 1.3 }}>
          {template.name}
        </p>
      </div>
    </div>
  );
}
