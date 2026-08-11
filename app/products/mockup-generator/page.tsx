"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackagingTileCard, type PackagingTile } from "@/components/packaging-tile-card";
import { loadIDBImage } from "@/lib/packaging-idb";

const MOCKUP_DEFAULTS = [
  { id: "mb-standard", title: "Pizza Box",    price: "$200 + tax", metaKey: "mb-packages-meta", subSlug: "mailer-boxes",   dielineSlug: "mailer-boxes" },
  { id: "sb-standard", title: "Shipping Box", price: "$220 + tax", metaKey: "sb-packages-meta", subSlug: "shipping-boxes", dielineSlug: "shipping-boxes" },
  { id: "ssb-standard", title: "Square Shipping Box", price: "$230 + tax", metaKey: "ssb-packages-meta", subSlug: "square-shipping-boxes", dielineSlug: "square-shipping-boxes" },
];

export default function MockupGeneratorPage() {
  const [tiles, setTiles] = useState<PackagingTile[]>([]);

  useEffect(() => {
    async function load() {
      const result: PackagingTile[] = [];

      for (const pkg of MOCKUP_DEFAULTS) {
        let meta: Record<string, { title?: string; price?: string }> = {};
        try {
          const raw = localStorage.getItem(pkg.metaKey);
          if (raw) meta = JSON.parse(raw) as Record<string, { title?: string; price?: string }>;
        } catch { /* ignore */ }

        const saved = meta[pkg.id];
        const img = await loadIDBImage(pkg.id);

        result.push({
          id: pkg.id,
          name: pkg.title,
          price: saved?.price ?? pkg.price,
          image: img || "/images/cardingprint.jpg",
          link: `/products/packaging-box/${pkg.subSlug}`,
          dielineSlug: pkg.dielineSlug,
          hideDieline: true,
          hidePrice: true,
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
          <span style={{ color: "#374151" }}>Mockup Generator</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
          Mockup Generator
        </h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>
          Design and preview your custom packaging before you print.
        </p>

        {tiles.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {tiles.map((tile) => (
              <PackagingTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
