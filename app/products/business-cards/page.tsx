"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { categories, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";

const PRINT_ESSENTIALS_CATEGORIES = new Set(
  categories.filter((c) => c.groupSlug === "print-essentials").map((c) => c.slug)
);

function TileCard({ tile }: { tile: { id: string; name: string; price: string; image: string; link: string } }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={tile.link} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: "14px", overflow: "hidden",
          border: "1.5px solid #e5e7eb",
          background: "#fff", cursor: "pointer",
          boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "none",
          transition: "box-shadow 0.2s, transform 0.2s",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "#f9fafb" }}>
          <img
            src={tile.image}
            alt={tile.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {hovered && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span style={{
                padding: "0.45rem 1.3rem",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.02em",
                boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
              }}>
                Continue →
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: "1rem" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{tile.name}</p>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{tile.price}</p>
        </div>
      </div>
    </Link>
  );
}

// Fixed prices for the original hand-seeded packages (they don't carry a `price` field
// on their own template row). Anything else — any new gallery template an admin adds —
// uses its own stored price, falling back to the product's starting price.
const LEGACY_PRICE: Record<string, string> = {
  "Business Cards": "$79 + tax",
  "Premium Business Cards": "$119 + tax",
  "Luxury Business Cards": "From $179 + tax",
  "Express Flyers": "$159 + tax",
  "Prime Flyers": "$329 + tax",
};

type Tile = { id: string; name: string; price: string; image: string; link: string };

function openIDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("bc-packages-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("images");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function loadIDBImage(id: string): Promise<string> {
  try {
    const db = await openIDB();
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

export default function BusinessCardsPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    async function load() {
      type TplRow = { id: string; name: string; previewImage: string; price?: string };
      type ProductRow = { slug: string; category: string; image: string; startingPrice: string };

      const result: Tile[] = [];
      const handledSlugs = new Set<string>();

      async function fetchInto(slug: string, image: string, startingPrice: string) {
        if (handledSlugs.has(slug)) return;
        handledSlugs.add(slug);
        try {
          const tRes = await fetch(`/api/products/${slug}/templates`, { cache: "no-store" });
          const tData = (await tRes.json()) as { templates?: TplRow[] };
          for (const tpl of (tData.templates ?? [])) {
            const idbImg = await loadIDBImage(tpl.id);
            result.push({
              id: tpl.id,
              name: tpl.name,
              price: tpl.price || LEGACY_PRICE[tpl.name] || (startingPrice ? `Starting at ${startingPrice}` : ""),
              image: idbImg || tpl.previewImage || image,
              link: `/products/business-cards/${slug}?gallery=${tpl.id}`,
            });
          }
        } catch { /* skip this product, keep the rest */ }
      }

      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = (await res.json()) as { products?: ProductRow[] };
        const products = data.products ?? [];
        const groupProducts = products.filter((p) => PRINT_ESSENTIALS_CATEGORIES.has(p.category));

        // Real, standalone products (Business Cards, Flyers, Brochures, Postcards…)
        for (const product of groupProducts) {
          await fetchInto(product.slug, product.image, product.startingPrice);
        }

        // Ad-hoc sub-products (Door Hangers, Rack Cards, Letterheads…) that have no
        // Product record of their own — the canonical list lives in CATEGORY_SUBPRODUCT_OPTIONS.
        const bcProduct = products.find((p) => p.slug === "premium-business-cards");
        for (const name of CATEGORY_SUBPRODUCT_OPTIONS["business-cards"]) {
          const slug = subProductSlug(name);
          await fetchInto(slug, bcProduct?.image ?? "", bcProduct?.startingPrice ?? "");
        }
      } catch { /* leave tiles empty */ }

      setTiles(result);
    }
    void load();
  }, []);

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="container container-wide" style={{ paddingTop: "2rem" }}>
        <nav style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>Business Printing</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Business Printing</h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>Premium business cards and flyers for professionals</p>

        {tiles.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {tiles.map((tile) => (
              <TileCard key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
