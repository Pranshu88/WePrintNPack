"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function TileCard({ tile }: { tile: { id: string; name: string; price: string; image: string; link: string; dielineSlug: string } }) {
  const [hovered, setHovered] = useState(false);
  return (
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
        textDecoration: "none", color: "inherit",
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
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            background: "rgba(0,0,0,0.18)",
          }}>
            <Link
              href={tile.link}
              style={{
                padding: "0.45rem 1.2rem",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.82rem",
                letterSpacing: "0.02em",
                boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              Mockup
            </Link>
          </div>
        )}
      </div>
      <Link href={tile.link} style={{ textDecoration: "none", color: "inherit", display: "block", padding: "1rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{tile.name}</p>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{tile.price}</p>
      </Link>
    </div>
  );
}

const PACKAGING_DEFAULTS = [
  { id: "pb-standard",  title: "Pizza Box",            price: "$150 + tax", metaKey: "pizzabox-packages-meta",     subSlug: "pizza-boxes",           dielineSlug: "pizza-boxes" },
  { id: "mb-standard",  title: "Mailer Box",           price: "$200 + tax", metaKey: "mb-packages-meta",           subSlug: "mailer-boxes",           dielineSlug: "mailer-boxes" },
  { id: "sb-standard",  title: "Shipping Box",         price: "$220 + tax", metaKey: "sb-packages-meta",           subSlug: "shipping-boxes",         dielineSlug: "shipping-boxes" },
  { id: "ssb-standard", title: "Square Shipping Box",  price: "$230 + tax", metaKey: "ssb-packages-meta",          subSlug: "square-shipping-boxes",  dielineSlug: "square-shipping-boxes" },
];

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

type Tile = { id: string; name: string; price: string; image: string; link: string; dielineSlug: string };

export default function PackagingBoxPage() {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    async function load() {
      const result: Tile[] = [];

      for (const pkg of PACKAGING_DEFAULTS) {
        let meta: Record<string, { title?: string; price?: string }> = {};
        try {
          const raw = localStorage.getItem(pkg.metaKey);
          if (raw) meta = JSON.parse(raw) as Record<string, { title?: string; price?: string }>;
        } catch { /* ignore */ }

        const saved = meta[pkg.id];
        const img = await loadIDBImage(pkg.id);

        result.push({
          id: pkg.id,
          name: saved?.title ?? pkg.title,
          price: saved?.price ?? pkg.price,
          image: img || "/images/cardingprint.jpg",
          link: `/products/packaging-box/${pkg.subSlug}`,
          dielineSlug: pkg.dielineSlug,
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
          <span style={{ color: "#374151" }}>Packaging Boxes</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Packaging Boxes
        </h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>
          Custom printed packaging boxes for retail, e-commerce, and food delivery.
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
