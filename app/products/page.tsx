"use client";

import { useEffect, useState } from "react";
import PopularProductsCarousel from "@/components/popular-products-carousel";
import { LISTING_EXCLUDED_SLUGS, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import type { Product } from "@/lib/types";

const SIDEBAR_CATEGORIES = CATEGORY_SUBPRODUCT_OPTIONS["business-cards"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products: Product[] }) => {
        setProducts(d.products.filter((p) => !LISTING_EXCLUDED_SLUGS.has(p.slug)));
      })
      .catch(() => { /* keep empty */ });
  }, []);

  const totalCount = Object.values(categoryCounts).reduce((sum, n) => sum + n, 0);

  return (
    <section className="section page-section">
      <div style={{ width: "100%", maxWidth: 1440, margin: "0 auto", padding: "0 20px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.25rem", fontWeight: 700, margin: "0 0 0.4rem", color: "#111827" }}>
          Our Products
        </h1>
        <p style={{ margin: "0 0 1.75rem", color: "#6b7280", fontSize: "1rem" }}>
          Explore our complete catalog of professional printing products.
        </p>

        <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
          <aside style={{ width: 260, flexShrink: 0, position: "sticky", top: "1rem" }}>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase" }}>
              Categories
            </p>
            <div style={{ maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                onClick={() => setActiveCategory("All")}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                  padding: "0.7rem 1rem", borderRadius: 8, border: "none", cursor: "pointer",
                  background: activeCategory === "All" ? "linear-gradient(135deg,#7c3aed,#db2777,#f97316)" : "transparent",
                  color: activeCategory === "All" ? "#fff" : "#111827",
                  fontWeight: 700, fontSize: "0.9rem", textAlign: "left",
                }}
              >
                All Products
              </button>
              {SIDEBAR_CATEGORIES.map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveCategory(name)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                    padding: "0.55rem 1rem", borderRadius: 8, border: "none", cursor: "pointer",
                    background: activeCategory === name ? "linear-gradient(135deg,#7c3aed,#db2777,#f97316)" : "transparent",
                    color: activeCategory === name ? "#fff" : "#374151",
                    fontWeight: activeCategory === name ? 700 : 500,
                    fontSize: "0.88rem", textAlign: "left",
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>{categoryCounts[name] ?? 0}</span>
                </button>
              ))}
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="product-search-bar" style={{ marginBottom: "0.75rem" }}>
              <svg viewBox="0 0 24 24" className="product-search-icon" aria-hidden="true">
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="product-search-input"
              />
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#6b7280" }}>
              Showing {visibleCount} of {totalCount} products
            </p>
            <PopularProductsCarousel
              products={products}
              layout="grid"
              query={query}
              activeCategory={activeCategory}
              onCategoryCounts={setCategoryCounts}
              onVisibleCount={setVisibleCount}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
