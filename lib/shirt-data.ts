export type ShirtColor = {
  hex: string;
  name: string;
  frontImage?: string;
  backImage?: string;
};

export type ShirtProduct = {
  slug: string;
  name: string;
  tagline: string;
  rating?: number;
  reviewCount?: number;
  priceRange: string;
  pricePerUnit: number;
  priceNote: string;
  deliveryDate: string;
  pincode: string;
  colors: ShirtColor[];
  images: string[];
  isNew?: boolean;
  technologies: string[];
  quantities: Array<{ qty: number; pricePerUnit: number }>;
};

export type DesignTemplate = {
  id: string;
  name: string;
  category: string;
  bg: string;
  accent: string;
};

export const shirtProducts: ShirtProduct[] = [
  {
    slug: "mens-embroidered-dress-shirts",
    name: "Men's Embroidered Dress Shirts",
    tagline: "Showcase your unique professional identity.",
    rating: 4.4,
    reviewCount: 24,
    priceRange: "₹920.00 – ₹990.00 each",
    pricePerUnit: 990,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "2 May",
    pincode: "110001",
    isNew: true,
    colors: [
      { hex: "#ffffff", name: "White" },
      { hex: "#93c5fd", name: "Light Blue" },
      { hex: "#9ca3af", name: "Grey" },
      { hex: "#111827", name: "Black" },
      { hex: "#f9a8d4", name: "Pink" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Embroidery", "Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 990 },
      { qty: 5, pricePerUnit: 960 },
      { qty: 10, pricePerUnit: 940 },
      { qty: 25, pricePerUnit: 930 },
      { qty: 50, pricePerUnit: 920 },
    ],
  },
  {
    slug: "womens-embroidered-dress-shirts",
    name: "Women's Embroidered Dress Shirts",
    tagline: "Elegant professional attire with custom embroidery.",
    rating: 5,
    reviewCount: 2,
    priceRange: "₹920.00 – ₹990.00 each",
    pricePerUnit: 990,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "2 May",
    pincode: "110001",
    isNew: true,
    colors: [
      { hex: "#ffffff", name: "White" },
      { hex: "#93c5fd", name: "Light Blue" },
      { hex: "#f9a8d4", name: "Pink" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Embroidery", "Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 990 },
      { qty: 5, pricePerUnit: 960 },
      { qty: 10, pricePerUnit: 940 },
      { qty: 25, pricePerUnit: 930 },
      { qty: 50, pricePerUnit: 920 },
    ],
  },
  {
    slug: "cambridge-dress-shirts",
    name: "Cambridge® Dress Shirts",
    tagline: "Premium Cambridge quality for corporate identity.",
    priceRange: "₹1,070.00 – ₹1,125.00 each",
    pricePerUnit: 1125,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "3 May",
    pincode: "110001",
    colors: [
      { hex: "#ffffff", name: "White" },
      { hex: "#111827", name: "Black" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Embroidery", "Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 1125 },
      { qty: 5, pricePerUnit: 1100 },
      { qty: 10, pricePerUnit: 1090 },
      { qty: 25, pricePerUnit: 1080 },
      { qty: 50, pricePerUnit: 1070 },
    ],
  },
  {
    slug: "mens-dress-shirts-half-sleeves",
    name: "Men's Dress Shirts - Half Sleeves",
    tagline: "Comfortable and stylish for everyday professional wear.",
    rating: 4.8,
    reviewCount: 5,
    priceRange: "₹925.00 – ₹990.00 each",
    pricePerUnit: 990,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "2 May",
    pincode: "110001",
    colors: [
      { hex: "#ffffff", name: "White" },
      { hex: "#111827", name: "Black" },
      { hex: "#2563eb", name: "Blue" },
      { hex: "#93c5fd", name: "Light Blue" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Embroidery", "Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 990 },
      { qty: 5, pricePerUnit: 965 },
      { qty: 10, pricePerUnit: 950 },
      { qty: 25, pricePerUnit: 935 },
      { qty: 50, pricePerUnit: 925 },
    ],
  },
  {
    slug: "slim-fit-dress-shirts",
    name: "Slim Fit Dress Shirts",
    tagline: "Modern fit for a sharp, polished professional look.",
    rating: 4.2,
    reviewCount: 10,
    priceRange: "₹890.00 – ₹950.00 each",
    pricePerUnit: 950,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "2 May",
    pincode: "110001",
    isNew: true,
    colors: [
      { hex: "#9ca3af", name: "Grey" },
      { hex: "#2563eb", name: "Blue" },
      { hex: "#ffffff", name: "White" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Embroidery", "Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 950 },
      { qty: 5, pricePerUnit: 930 },
      { qty: 10, pricePerUnit: 910 },
      { qty: 50, pricePerUnit: 890 },
    ],
  },
  {
    slug: "performance-dress-shirts",
    name: "Performance Dress Shirts",
    tagline: "Moisture-wicking fabric for active professionals.",
    rating: 4.6,
    reviewCount: 8,
    priceRange: "₹950.00 – ₹1,020.00 each",
    pricePerUnit: 1020,
    priceNote: "Price below is MRP (inclusive of all taxes)",
    deliveryDate: "3 May",
    pincode: "110001",
    isNew: true,
    colors: [
      { hex: "#0d9488", name: "Teal" },
      { hex: "#4b5563", name: "Slate" },
      { hex: "#1e3a8a", name: "Navy" },
    ],
    images: ["/images/tshirt.jpg"],
    technologies: ["Full Color Printing"],
    quantities: [
      { qty: 1, pricePerUnit: 1020 },
      { qty: 5, pricePerUnit: 1000 },
      { qty: 10, pricePerUnit: 980 },
      { qty: 50, pricePerUnit: 950 },
    ],
  },
];

export function getShirtBySlug(slug: string): ShirtProduct | undefined {
  return shirtProducts.find((s) => s.slug === slug);
}

export const designTemplates: DesignTemplate[] = [
  { id: "tpl-1", name: "Company Name & Logo", category: "Corporate", bg: "#dbeafe", accent: "#1e3a8a" },
  { id: "tpl-2", name: "Minimal Brand", category: "Corporate", bg: "#f3f4f6", accent: "#111827" },
  { id: "tpl-3", name: "Bold Initials", category: "Monogram", bg: "#fee2e2", accent: "#dc2626" },
  { id: "tpl-4", name: "Logo Centered", category: "Corporate", bg: "#d1fae5", accent: "#059669" },
  { id: "tpl-5", name: "Staff Name Tag", category: "Name Tags", bg: "#ede9fe", accent: "#7c3aed" },
  { id: "tpl-6", name: "Circular Badge", category: "Badges", bg: "#fef3c7", accent: "#d97706" },
  { id: "tpl-7", name: "Team Logo Left", category: "Teams", bg: "#e0f2fe", accent: "#0891b2" },
  { id: "tpl-8", name: "Classic Monogram", category: "Monogram", bg: "#e5e7eb", accent: "#111827" },
  { id: "tpl-9", name: "Department Tag", category: "Name Tags", bg: "#fce7f3", accent: "#db2777" },
  { id: "tpl-10", name: "Vintage Crest", category: "Badges", bg: "#fef9c3", accent: "#78350f" },
  { id: "tpl-11", name: "Modern Script", category: "Corporate", bg: "#eff6ff", accent: "#1d4ed8" },
  { id: "tpl-12", name: "Blank Canvas", category: "Blank", bg: "#fafafa", accent: "#9ca3af" },
];
