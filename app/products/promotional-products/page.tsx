"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";

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

const PRICE_FALLBACKS: Record<string, string> = {
  "Die-Cut Stickers": "$89 + tax",
  "Product Labels":   "$139 + tax",
};

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

type Tile = { id: string; name: string; price: string; image: string; link: string };

export default function PromotionalProductsPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    async function load() {
      const result: Tile[] = [];
      let startingPrice = "$28";

      try {
        const res = await fetch("/api/products?category=promotional-products", { cache: "no-store" });
        const data = (await res.json()) as { products?: { startingPrice: string }[] };
        const product = data.products?.[0];
        if (product) startingPrice = product.startingPrice || startingPrice;
      } catch { /* use default starting price */ }

      for (const name of CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"]) {
        const gallerySlug = subProductSlug(name);

        let meta: Record<string, { price: string }> = {};
        if (gallerySlug === "stickers-and-labels") {
          try {
            const raw = localStorage.getItem("sticker-packages-meta");
            if (raw) meta = JSON.parse(raw) as Record<string, { price: string }>;
          } catch { /* ignore */ }
        }

        try {
          const res = await fetch(`/api/products/${gallerySlug}/templates`, { cache: "no-store" });
          const data = (await res.json()) as { templates?: { id: string; name: string; previewImage: string; price?: string }[] };
          for (const t of (data.templates ?? [])) {
            const idbImg = await loadIDBImage(t.id);
            const price = meta[t.id]?.price || t.price || PRICE_FALLBACKS[t.name] || `Starting at ${startingPrice}`;
            result.push({
              id: t.id,
              name: t.name,
              price,
              image: idbImg || t.previewImage,
              link: `/products/promotional-products/${gallerySlug}?gallery=${t.id}`,
            });
          }
        } catch { /* skip this sub-product, keep the rest */ }
      }

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
          <span style={{ color: "#374151" }}>Promotional Products</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Promotional Products
        </h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>
          Custom stickers, labels, and promotional items for packaging, events, and giveaways.
        </p>

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
