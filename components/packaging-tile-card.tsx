"use client";

import { useState } from "react";
import Link from "next/link";

export type PackagingTile = { id: string; name: string; price: string; image: string; link: string; dielineSlug: string; hideMockup?: boolean; hideDieline?: boolean; hidePrice?: boolean };

export function PackagingTileCard({ tile }: { tile: PackagingTile }) {
  const [hovered, setHovered] = useState(false);
  const href = tile.hideMockup ? `/dieline-custom/${tile.dielineSlug}` : tile.link;
  return (
    <Link
      href={href}
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
        display: "block",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "#f9fafb" }}>
        <img
          src={tile.image}
          alt={tile.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: "1rem" }}>
        <p style={{ margin: tile.hidePrice ? 0 : "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{tile.name}</p>
        {!tile.hidePrice && <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{tile.price}</p>}
      </div>
    </Link>
  );
}
