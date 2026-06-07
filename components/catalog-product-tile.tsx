"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { getProductLink } from "@/lib/product-link";
import PackagingBoxEditor from "./packaging-box-editor";

const PACKAGING_CATEGORIES = new Set(["packaging-box"]);

function getPastelFrameBackground(seed: string) {
  const palettes = [
    ["#fff3ee", "#ffe5dd", "#f9d3c6"],
    ["#f3f8ff", "#e2efff", "#d4e7ff"],
    ["#f5fbf4", "#e3f5de", "#d3ebca"],
    ["#fff8ec", "#fff0cf", "#f8e6b8"],
    ["#f8f3ff", "#efe1ff", "#e0cdfa"],
    ["#f4fbfb", "#def2f2", "#cce8e8"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const palette = palettes[hash % palettes.length];
  return `radial-gradient(circle at 50% 44%, ${palette[0]} 0 48%, ${palette[1]} 70%, ${palette[2]} 100%)`;
}

type Props = {
  product: Product;
  tileNameClass: string;
  tilePriceClass: string;
  tileExploreClass: string;
  tileContentClass: string;
};

export default function CatalogProductTile({
  product,
  tileNameClass,
  tilePriceClass,
  tileExploreClass,
  tileContentClass,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const isPackaging = PACKAGING_CATEGORIES.has(product.category);

  return (
    <>
      <div
        className="category-tile"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image frame */}
        <div
          className="category-image-frame"
          style={{
            background: getPastelFrameBackground(product.slug),
            position: "relative",
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            className="category-image"
          />

          {/* Hover overlay with Custom + 3D buttons — packaging only */}
          {isPackaging && hovered && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.55)",
                borderRadius: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                zIndex: 10,
                backdropFilter: "blur(2px)",
              }}
            >
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setEditorOpen(true); }}
                style={{
                  width: 130,
                  padding: "9px 0",
                  background: "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                  transition: "background 0.15s",
                }}
              >
                ✏️ Custom
              </button>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setEditorOpen(true); }}
                style={{
                  width: 130,
                  padding: "9px 0",
                  background: "rgba(255,255,255,0.92)",
                  color: "#1a1a2e",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}
              >
                🎁 3D Preview
              </button>
            </div>
          )}
        </div>

        {/* Tile info */}
        <div className={tileContentClass}>
          <strong className={tileNameClass}>{product.name}</strong>
          <span className={tilePriceClass}>{product.startingPrice}</span>
          <Link href={getProductLink(product)} className={tileExploreClass}>
            Explore →
          </Link>
        </div>
      </div>

      {/* Packaging editor modal */}
      {editorOpen && (
        <PackagingBoxEditor product={product} onClose={() => setEditorOpen(false)} />
      )}
    </>
  );
}
