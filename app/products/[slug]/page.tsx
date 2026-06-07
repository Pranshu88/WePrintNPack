import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data";
import ShirtOrderClient from "@/components/shirt-order-client";
import type { ShirtProduct } from "@/lib/shirt-data";

export const dynamic = "force-dynamic";

function parsePrice(priceStr: string): number {
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
  return isNaN(num) || num < 1 ? 999 : Math.round(num);
}

const CATEGORY_COLORS: Record<string, Array<{ hex: string; name: string }>> = {
  "t-shirts": [
    { hex: "#ffffff", name: "White" },
    { hex: "#111827", name: "Black" },
    { hex: "#2563eb", name: "Blue" },
    { hex: "#9ca3af", name: "Grey" },
    { hex: "#ef4444", name: "Red" },
  ],
  hoodies: [
    { hex: "#111827", name: "Black" },
    { hex: "#374151", name: "Charcoal" },
    { hex: "#1e3a8a", name: "Navy" },
    { hex: "#6b7280", name: "Grey" },
  ],
  "business-cards": [
    { hex: "#ffffff", name: "White" },
    { hex: "#fef9c3", name: "Cream" },
    { hex: "#111827", name: "Black" },
  ],
  stickers: [
    { hex: "#ffffff", name: "White" },
    { hex: "#fef3c7", name: "Yellow" },
    { hex: "#dbeafe", name: "Blue" },
    { hex: "#d1fae5", name: "Green" },
  ],
  banners: [
    { hex: "#ffffff", name: "White" },
    { hex: "#111827", name: "Black" },
    { hex: "#1e3a8a", name: "Navy" },
  ],
};

const HEX_NAMES: Record<string, string> = {
  "#ffffff": "White", "#111827": "Black", "#2563eb": "Blue", "#9ca3af": "Grey",
  "#ef4444": "Red", "#93c5fd": "Light Blue", "#f9a8d4": "Pink", "#6b7280": "Slate",
  "#1e3a8a": "Navy", "#0d9488": "Teal", "#4b5563": "Charcoal", "#374151": "Dark Grey",
};

function colorName(hex: string, index: number): string {
  return HEX_NAMES[hex.toLowerCase()] ?? `Color ${index + 1}`;
}

const DEFAULT_COLORS = [
  { hex: "#ffffff", name: "White" },
  { hex: "#111827", name: "Black" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#9ca3af", name: "Grey" },
];

const CATEGORY_TECHNOLOGIES: Record<string, string[]> = {
  "t-shirts": ["Full Color Printing", "Embroidery", "Screen Print"],
  hoodies: ["Embroidery", "Screen Print"],
  "dress-shirts": ["Embroidery", "Full Color Printing"],
  "business-cards": ["Full Color Printing", "Foil Stamping"],
  stickers: ["Full Color Printing"],
  banners: ["Full Color Printing"],
};

const DEFAULT_TECHNOLOGIES = ["Full Color Printing", "Embroidery"];

function adaptProduct(product: NonNullable<ReturnType<typeof getProductBySlug>>): ShirtProduct {
  const price = parsePrice(product.startingPrice);
  const categoryColors = CATEGORY_COLORS[product.category] ?? DEFAULT_COLORS;
  const colors = product.colors?.length
    ? product.colors.map((hex, i) => ({ hex, name: colorName(hex, i) }))
    : categoryColors;
  const technologies = CATEGORY_TECHNOLOGIES[product.category] ?? DEFAULT_TECHNOLOGIES;

  return {
    slug: product.slug,
    name: product.name,
    tagline: product.description,
    priceRange: `${product.startingPrice} – starting price`,
    pricePerUnit: price,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "3-5 May",
    pincode: "110001",
    colors,
    images: [product.image],
    technologies,
    quantities: [
      { qty: 1,  pricePerUnit: price },
      { qty: 5,  pricePerUnit: Math.round(price * 0.97) },
      { qty: 10, pricePerUnit: Math.round(price * 0.95) },
      { qty: 25, pricePerUnit: Math.round(price * 0.92) },
      { qty: 50, pricePerUnit: Math.round(price * 0.90) },
    ],
  };
}

export default async function ProductDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ShirtOrderClient shirt={adaptProduct(product)} galleryId={gallery ?? null} />;
}
