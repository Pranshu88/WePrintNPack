"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const BC_TIERS = [
  { id: "bc-standard", name: "Business Cards",         price: "$79 + tax",        galleryName: "Business Cards" },
  { id: "bc-premium",  name: "Premium Business Cards", price: "$119 + tax",       galleryName: "Premium Business Cards" },
  { id: "bc-luxury",   name: "Luxury Business Cards",  price: "From $179 + tax",  galleryName: "Luxury Business Cards" },
];

const FLY_TIERS = [
  { id: "fly-standard", name: "Express Flyers", price: "$159 + tax", galleryName: "Express Flyers" },
  { id: "fly-premium",  name: "Prime Flyers",   price: "$329 + tax", galleryName: "Prime Flyers" },
];

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
      type TplRow = { id: string; name: string; previewImage: string };

      let bcTemplates: TplRow[] = [];
      let flyTemplates: TplRow[] = [];
      let bcSlug = "";
      let flySlug = "";
      let bcFallback = "";
      let flyFallback = "";

      try {
        const res = await fetch("/api/products?category=business-cards", { cache: "no-store" });
        const data = (await res.json()) as { products?: { slug: string; image: string }[] };
        const bcProduct = data.products?.[0];
        if (bcProduct) {
          bcSlug = bcProduct.slug;
          bcFallback = bcProduct.image;
          const tRes = await fetch(`/api/products/${bcProduct.slug}/templates`, { cache: "no-store" });
          const tData = (await tRes.json()) as { templates?: TplRow[] };
          bcTemplates = tData.templates ?? [];
        }
      } catch { /* skip */ }

      try {
        const res = await fetch("/api/products?category=flyers", { cache: "no-store" });
        const data = (await res.json()) as { products?: { slug: string; image: string }[] };
        const flyProduct = data.products?.[0];
        if (flyProduct) {
          flySlug = flyProduct.slug;
          flyFallback = flyProduct.image;
          const tRes = await fetch(`/api/products/${flyProduct.slug}/templates`, { cache: "no-store" });
          const tData = (await tRes.json()) as { templates?: TplRow[] };
          flyTemplates = tData.templates ?? [];
        }
      } catch { /* skip */ }

      const result: Tile[] = [];

      for (const tier of BC_TIERS) {
        const idbImg = await loadIDBImage(tier.id);
        const tpl = bcTemplates.find((t) => t.name === tier.galleryName);
        result.push({
          id: tier.id,
          name: tier.name,
          price: tier.price,
          image: idbImg || tpl?.previewImage || bcFallback,
          link: tpl && bcSlug
            ? `/products/business-cards/${bcSlug}?gallery=${tpl.id}`
            : `/products/business-cards${bcSlug ? `/${bcSlug}` : ""}`,
        });
      }

      for (const tier of FLY_TIERS) {
        const idbImg = await loadIDBImage(tier.id);
        const tpl = flyTemplates.find((t) => t.name === tier.galleryName);
        result.push({
          id: tier.id,
          name: tier.name,
          price: tier.price,
          image: idbImg || tpl?.previewImage || flyFallback,
          link: tpl && flySlug
            ? `/products/business-cards/${flySlug}?gallery=${tpl.id}`
            : `/products/business-cards${flySlug ? `/${flySlug}` : ""}`,
        });
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
