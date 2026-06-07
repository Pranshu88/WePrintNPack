"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const VINYL_TIERS = [
  { id: "vinyl-standard", name: "Vinyl Banner",         price: "From $109 + tax", galleryName: "Vinyl Banner" },
  { id: "vinyl-large",    name: "Large Outdoor Banner",  price: "$179 + tax",      galleryName: "Large Outdoor Banner" },
];

const ROLLUP_TIERS = [
  { id: "rollup-standard", name: "Standard Roll-Up Banner", price: "$229 + tax", galleryName: "Standard Roll-Up Banner" },
  { id: "rollup-premium",  name: "Premium Roll-Up Banner",  price: "$279 + tax", galleryName: "Premium Roll-Up Banner" },
];

type Tile = { id: string; name: string; price: string; image: string; link: string };

function openIDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open("banners-packages-db", 1);
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

export default function BannersPage() {
  const [vinylTiles, setVinylTiles]   = useState<Tile[]>([]);
  const [rollupTiles, setRollupTiles] = useState<Tile[]>([]);

  useEffect(() => {
    async function load() {
      type TplRow = { id: string; name: string; previewImage: string };

      let vinylTemplates: TplRow[]  = [];
      let rollupTemplates: TplRow[] = [];
      let vinylSlug  = "";
      let rollupSlug = "";
      let vinylFallback  = "";
      let rollupFallback = "";

      try {
        const res  = await fetch("/api/products?category=vinyl-banners", { cache: "no-store" });
        const data = (await res.json()) as { products?: { slug: string; image: string }[] };
        const p = data.products?.[0];
        if (p) {
          vinylSlug     = p.slug;
          vinylFallback = p.image;
          const tRes  = await fetch(`/api/products/${p.slug}/templates`, { cache: "no-store" });
          const tData = (await tRes.json()) as { templates?: TplRow[] };
          vinylTemplates = tData.templates ?? [];
        }
      } catch { /* skip */ }

      try {
        const res  = await fetch("/api/products?category=roll-up-banners", { cache: "no-store" });
        const data = (await res.json()) as { products?: { slug: string; image: string }[] };
        const p = data.products?.[0];
        if (p) {
          rollupSlug     = p.slug;
          rollupFallback = p.image;
          const tRes  = await fetch(`/api/products/${p.slug}/templates`, { cache: "no-store" });
          const tData = (await tRes.json()) as { templates?: TplRow[] };
          rollupTemplates = tData.templates ?? [];
        }
      } catch { /* skip */ }

      const vTiles: Tile[] = [];
      for (const tier of VINYL_TIERS) {
        const idbImg = await loadIDBImage(tier.id);
        const tpl    = vinylTemplates.find((t) => t.name === tier.galleryName);
        vTiles.push({
          id:    tier.id,
          name:  tier.name,
          price: tier.price,
          image: idbImg || tpl?.previewImage || vinylFallback,
          link:  tpl && vinylSlug
            ? `/products/banners/${vinylSlug}?gallery=${tpl.id}`
            : `/products/banners${vinylSlug ? `/${vinylSlug}` : ""}`,
        });
      }

      const rTiles: Tile[] = [];
      for (const tier of ROLLUP_TIERS) {
        const idbImg = await loadIDBImage(tier.id);
        const tpl    = rollupTemplates.find((t) => t.name === tier.galleryName);
        rTiles.push({
          id:    tier.id,
          name:  tier.name,
          price: tier.price,
          image: idbImg || tpl?.previewImage || rollupFallback,
          link:  tpl && rollupSlug
            ? `/products/banners/${rollupSlug}?gallery=${tpl.id}`
            : `/products/banners${rollupSlug ? `/${rollupSlug}` : ""}`,
        });
      }

      setVinylTiles(vTiles);
      setRollupTiles(rTiles);
    }
    void load();
  }, []);

  const loading = vinylTiles.length === 0 && rollupTiles.length === 0;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="container container-wide" style={{ paddingTop: "2rem" }}>

        <nav style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>Banners</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Banners</h1>
        <p style={{ margin: "0 0 2.5rem", fontSize: "0.95rem", color: "#6b7280" }}>Vinyl banners and retractable roll-up stands for every occasion</p>

        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>Loading...</p>
        ) : (
          <>
            {/* ── Vinyl Banners ── */}
            <div style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>Vinyl Banners</h2>
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#6b7280" }}>Hem & grommets included · Indoor & outdoor use</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
                {vinylTiles.map((tile) => (
                  <TileCard key={tile.id} tile={tile} />
                ))}
              </div>
            </div>

            {/* ── Roll-Up / Retractable Banners ── */}
            <div>
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>Roll-Up / Retractable Banners</h2>
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#6b7280" }}>Stand & carrying bag included · Full colour print</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
                {rollupTiles.map((tile) => (
                  <TileCard key={tile.id} tile={tile} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  return (
    <Link href={tile.link} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ borderRadius: "14px", overflow: "hidden", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
        <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#f9fafb" }}>
          <img src={tile.image} alt={tile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ padding: "1rem" }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{tile.name}</p>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{tile.price}</p>
        </div>
      </div>
    </Link>
  );
}
