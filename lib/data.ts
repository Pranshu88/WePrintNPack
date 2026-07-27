import type { Category, Product } from "@/lib/types";

export const catalogGroups = [
  {
    slug: "print-essentials",
    title: "Print Essentials",
    description: "Business cards, flyers, brochures, and postcards."
  },
  {
    slug: "branding-labels",
    title: "Branding & Labels",
    description: "Stickers and labels for products, packaging, and promotions."
  },
  {
    slug: "apparel",
    title: "Apparel",
    description: "Branded T-shirts and hoodies for teams and events."
  },
  {
    slug: "signage",
    title: "Signage",
    description: "Banners and yard signs for indoor and outdoor visibility."
  },
  {
    slug: "packaging-boxes",
    title: "Packaging Boxes",
    description: "Pizza boxes, mailer boxes, and shipping boxes."
  }
] as const;

export const categories: Category[] = [
  {
    slug: "business-cards",
    name: "Business Printing",
    shortTitle: "Everyday branded essentials",
    description: "Professional cards ready for repeat orders.",
    groupSlug: "print-essentials"
  },
  {
    slug: "flyers",
    name: "Flyers",
    shortTitle: "Promotions and handouts",
    description: "Single- and double-sided flyers for events, launches, and campaigns.",
    groupSlug: "print-essentials"
  },
  {
    slug: "brochures",
    name: "Brochures",
    shortTitle: "Multi-panel print pieces",
    description: "Folded brochures for service menus, product guides, and marketing kits.",
    groupSlug: "print-essentials"
  },
  {
    slug: "postcards",
    name: "Postcards",
    shortTitle: "Mailers and promo cards",
    description: "Postcards for direct mail, handouts, and short campaigns.",
    groupSlug: "print-essentials"
  },
  {
    slug: "marketing-material",
    name: "Marketing Material",
    shortTitle: "Posters, banners & signs",
    description: "Posters, banners, and yard signs for events, storefronts, and promotions.",
    groupSlug: "signage"
  },
  {
    slug: "promotional-products",
    name: "Promotional Products",
    shortTitle: "Stickers, labels & promo items",
    description: "Custom stickers, labels, and promotional products for events and giveaways.",
    groupSlug: "branding-labels"
  },
  {
    slug: "dress-shirts",
    name: "Dress Shirts",
    shortTitle: "Custom embroidered shirts",
    description: "Embroidered and printed dress shirts for corporate branding.",
    groupSlug: "apparel"
  },
  {
    slug: "t-shirts",
    name: "T-Shirts",
    shortTitle: "Team and promo wear",
    description: "Branded T-shirts for events, staff uniforms, and promotions.",
    groupSlug: "apparel"
  },
  {
    slug: "hoodies",
    name: "Hoodies",
    shortTitle: "Warm branded apparel",
    description: "Custom hoodies for teams, merch drops, and seasonal branding.",
    groupSlug: "apparel"
  },
  {
    slug: "packaging-box",
    name: "Packaging Box",
    shortTitle: "Custom packaging boxes",
    description: "Custom printed packaging boxes for retail, e-commerce, and food delivery.",
    groupSlug: "packaging-boxes"
  }
];

// Preserves the fixed template-gallery slugs used by existing, purpose-built UI (business
// cards/flyers/posters/etc). Any newly added sub-product label falls back to a slugified
// version of its name, which routes to the generic gallery-grid UI.
export const LEGACY_SUBPRODUCT_SLUGS: Record<string, string> = {
  "Flyers": "bold-flyers",
  "Postcards": "promotional-postcards",
  "Posters": "posters",
  "Banners": "vinyl-banners",
  "Vinyl Banners": "sinalite-vinyl-banners",
  "Coroplast Signs & Yard Signs": "yard-signs",
  "Roll Labels / Stickers": "stickers-and-labels",
  "Round Collar T-Shirt": "round-neck-tshirt",
  "Full Sleeve T-Shirt": "collar-tshirt",
};

export function slugifyLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function subProductSlug(label: string) {
  return LEGACY_SUBPRODUCT_SLUGS[label] ?? slugifyLabel(label);
}

export type SeedProductTemplate = {
  slug: string;
  name: string;
  category: string;
  image: string;
  description: string;
  startingPrice: string;
  colors?: string[];
  subProducts?: string[];
  specs: Array<{ label: string; value: string }>;
};

export const seedCatalog: Record<string, SeedProductTemplate[]> = {
  "print-essentials": [
    {
      slug: "premium-business-cards",
      name: "Business Printing",
      category: "business-cards",
      image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
      description: "Heavy stock business cards with a clean premium finish for everyday networking.",
      startingPrice: "$49",
      subProducts: ["Business Cards", "Flyers"],
      specs: [
        { label: "Stock", value: "16pt / 18pt" },
        { label: "Finish", value: "Matte / Velvet" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "250 units" }
      ]
    },
    {
      slug: "bold-flyers",
      name: "Flyers",
      category: "flyers",
      image: "/images/cardprint.jpg",
      description: "Single-sided flyers for launches, promotions, and event handouts.",
      startingPrice: "$35",
      specs: [
        { label: "Size", value: "A5 / A6" },
        { label: "Print", value: "Single / Double sided" },
        { label: "Turnaround", value: "2-4 business days" },
        { label: "Min quantity", value: "100 units" }
      ]
    },
    {
      slug: "tri-fold-brochures",
      name: "Tri-Fold Brochures",
      category: "brochures",
      image: "/images/cardingprint.jpg",
      description: "Folded brochures for service menus, product guides, and sales sheets.",
      startingPrice: "$78",
      specs: [
        { label: "Fold", value: "Tri-fold" },
        { label: "Paper", value: "100lb gloss" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "250 units" }
      ]
    },
    {
      slug: "promotional-postcards",
      name: "Promotional Postcards",
      category: "postcards",
      image: "/images/card2.jpg",
      description: "Direct mail postcards for campaigns, reminders, and quick offers.",
      startingPrice: "$42",
      specs: [
        { label: "Size", value: "4x6 / 5x7" },
        { label: "Finish", value: "Gloss / Matte" },
        { label: "Turnaround", value: "2-4 business days" },
        { label: "Min quantity", value: "100 units" }
      ]
    }
  ],
  "branding-labels": [
    {
      slug: "promotional-products",
      name: "Promotional Products",
      category: "promotional-products",
      image: "/images/cardprint.jpg",
      description: "Custom stickers, labels, and promotional items for packaging, events, and giveaways.",
      startingPrice: "$28",
      subProducts: ["Stickers & Labels", "Roll Labels", "Product Labels", "Die-Cut Stickers"],
      specs: [
        { label: "Material", value: "Paper gloss / BOPP / Vinyl" },
        { label: "Cut", value: "Die-cut / Roll" },
        { label: "Finish", value: "Matte / Gloss" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "50 units" }
      ]
    }
  ],
  apparel: [
    {
      slug: "mens-embroidered-dress-shirts",
      name: "Men's Embroidered Dress Shirts",
      category: "dress-shirts",
      image: "/images/tshirt.jpg",
      description: "Professional men's dress shirts with custom embroidery for corporate identity.",
      startingPrice: "₹920",
      colors: ["#ffffff", "#93c5fd", "#9ca3af", "#111827", "#f9a8d4"],
      specs: [
        { label: "Technology", value: "Embroidery / Full Color" },
        { label: "Sizes", value: "S to 3XL" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "1 unit" }
      ]
    },
    {
      slug: "womens-embroidered-dress-shirts",
      name: "Women's Embroidered Dress Shirts",
      category: "dress-shirts",
      image: "/images/tshirt.jpg",
      description: "Elegant women's dress shirts with custom embroidery for corporate identity.",
      startingPrice: "₹920",
      colors: ["#ffffff", "#93c5fd", "#f9a8d4"],
      specs: [
        { label: "Technology", value: "Embroidery / Full Color" },
        { label: "Sizes", value: "XS to 2XL" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "1 unit" }
      ]
    },
    {
      slug: "mens-dress-shirts-half-sleeves",
      name: "Men's Dress Shirts - Half Sleeves",
      category: "dress-shirts",
      image: "/images/tshirt.jpg",
      description: "Comfortable half-sleeve dress shirts for everyday professional wear.",
      startingPrice: "₹925",
      colors: ["#ffffff", "#111827", "#2563eb", "#93c5fd"],
      specs: [
        { label: "Technology", value: "Embroidery / Full Color" },
        { label: "Sizes", value: "S to 3XL" },
        { label: "Turnaround", value: "3-5 business days" },
        { label: "Min quantity", value: "1 unit" }
      ]
    },
    {
      slug: "round-neck-tshirt",
      name: "Round Neck T-Shirt",
      category: "t-shirts",
      image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      description: "Soft cotton round neck tees for events, staff, and everyday branded wear.",
      startingPrice: "$18",
      colors: ["#ffffff", "#111827", "#2563eb", "#9ca3af", "#ef4444"],
      subProducts: ["Round Collar T-Shirt", "Straight Collar T-Shirt"],
      specs: [
        { label: "Fabric", value: "100% cotton" },
        { label: "Neck", value: "Round neck" },
        { label: "Print", value: "DTF / Screen print" },
        { label: "Turnaround", value: "5-8 business days" },
        { label: "Min quantity", value: "20 units" }
      ]
    },
    {
      slug: "collar-tshirt",
      name: "Collar T-Shirt",
      category: "t-shirts",
      image: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&w=1200&q=80",
      description: "Polo-style collar tees for corporate branding and smart casual wear.",
      startingPrice: "$22",
      colors: ["#ffffff", "#111827", "#2563eb", "#9ca3af", "#ef4444"],
      specs: [
        { label: "Fabric", value: "100% cotton pique" },
        { label: "Neck", value: "Collar / Polo" },
        { label: "Print", value: "DTF / Embroidery" },
        { label: "Turnaround", value: "5-8 business days" },
        { label: "Min quantity", value: "20 units" }
      ]
    },
    {
      slug: "heavyweight-hoodie",
      name: "Heavyweight Hoodie",
      category: "hoodies",
      image: "/images/tshirt.jpg",
      description: "Warm hoodies with a premium feel for merch drops and winter kits.",
      startingPrice: "$36",
      specs: [
        { label: "Fabric", value: "Fleece" },
        { label: "Print", value: "Screen print" },
        { label: "Turnaround", value: "6-9 business days" },
        { label: "Min quantity", value: "15 units" }
      ]
    },
    {
      slug: "zip-hoodie",
      name: "Zip Hoodie",
      category: "hoodies",
      image: "/images/tshirt.jpg",
      description: "Zip-up hoodies for team uniforms, gifting, and retail merch.",
      startingPrice: "$39",
      specs: [
        { label: "Closure", value: "Full zip" },
        { label: "Fabric", value: "Cotton blend" },
        { label: "Turnaround", value: "6-9 business days" },
        { label: "Min quantity", value: "15 units" }
      ]
    }
  ],
  signage: [
    {
      slug: "marketing-material",
      name: "Marketing Material",
      category: "marketing-material",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      description: "Posters, banners, and yard signs for events, storefronts, and promotions.",
      startingPrice: "$24",
      subProducts: ["Posters", "Banners", "Yard Signs"],
      specs: [
        { label: "Types", value: "Posters / Banners / Yard Signs" },
        { label: "Finish", value: "Gloss / Matte / Vinyl" },
        { label: "Turnaround", value: "2-5 business days" },
        { label: "Min quantity", value: "1 unit" }
      ]
    },
    {
      slug: "vinyl-banners",
      name: "Vinyl Banners",
      category: "vinyl-banners",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
      description: "Heavy-duty vinyl banners with hem and grommets for indoor and outdoor use.",
      startingPrice: "From $109",
      specs: [
        { label: "Popular size", value: "3' × 6' / 4' × 8'" },
        { label: "Material", value: "Heavy-duty vinyl" },
        { label: "Finishing", value: "Hem & grommets included" },
        { label: "Use", value: "Indoor & outdoor" },
        { label: "Turnaround", value: "3-5 business days" }
      ]
    },
    {
      slug: "roll-up-banners",
      name: "Roll-Up Banners",
      category: "roll-up-banners",
      image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80",
      description: "Professional retractable banner stands for trade shows, events, and retail displays.",
      startingPrice: "From $229",
      specs: [
        { label: "Size", value: "33\" × 81\"" },
        { label: "Includes", value: "Stand + carrying bag" },
        { label: "Print", value: "Full colour" },
        { label: "Turnaround", value: "3-5 business days" }
      ]
    },
  ],
  "packaging-boxes": [
    {
      slug: "packaging-box",
      name: "Packaging Box",
      category: "packaging-box",
      image: "/images/cardingprint.jpg",
      description: "Custom printed packaging boxes for retail, e-commerce, and food delivery.",
      startingPrice: "$132",
      specs: [
        { label: "Board", value: "Corrugated" },
        { label: "Print", value: "Exterior CMYK" },
        { label: "Turnaround", value: "5-10 business days" },
        { label: "Min quantity", value: "25 units" }
      ]
    },
  ]
};

export const initialProducts: Product[] = catalogGroups.flatMap((group) =>
  seedCatalog[group.slug].map((item, index) => ({
    slug: item.slug,
    name: item.name,
    category: item.category,
    categoryName:
      categories.find((category) => category.slug === item.category)?.name || item.category,
    image: item.image,
    description: item.description,
    startingPrice: item.startingPrice,
    colors: item.colors,
    subProducts: item.subProducts,
    specs: item.specs,
    createdAt: new Date(Date.UTC(2026, 3, 1 + index, 9, 0, 0)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 3, 1 + index, 9, 0, 0)).toISOString()
  }))
);

export function getCatalogGroupForCategory(category: string) {
  const categoryMatch = categories.find((item) => item.slug === category);
  if (!categoryMatch) return null;
  const groupMatch = catalogGroups.find((item) => item.slug === categoryMatch.groupSlug);
  if (!groupMatch) return null;
  return groupMatch;
}

export function groupProductsByCatalog(productsList: Product[]) {
  return catalogGroups
    .map((group) => ({
      ...group,
      products: productsList.filter((product) => getCatalogGroupForCategory(product.category)?.slug === group.slug)
    }))
    .filter((group) => group.products.length > 0);
}

const MARKETING_MATERIAL_SUBPRODUCTS = [
  "Posters", "Large Format Posters", "Coroplast Signs & Yard Signs", "Coroplast Signs", "PVC Signs", "Foam Board Signs",
  "Acrylic Signs", "Aluminum Signs", "Window Graphics", "Wall Decals", "Floor Graphics",
  "Car Magnets", "Banners", "Vinyl Banners", "Pull Up Banners", "X-Frame Banners", "X-Stand Banners", "Backdrops",
  "Trade Show Displays",
];

const PROMOTIONAL_PRODUCTS_SUBPRODUCTS = [
  "Roll Labels / Stickers", "Roll Labels", "Product Labels", "Food Labels", "Bottle Labels",
  "Jar Labels", "Square Cut Labels", "Square Cut Labels / Stickers", "Die-Cut Stickers", "Vinyl Stickers", "Clear Stickers",
  "BOPP Labels", "Waterproof Labels",
];

// Only the categories that actually have Sinalite-imported (or otherwise real) gallery
// templates built — the rest of MARKETING_MATERIAL_SUBPRODUCTS / PROMOTIONAL_PRODUCTS_SUBPRODUCTS
// were placeholder labels with zero templates behind them, so they're left out of the merged
// Business Printing picker (they still exist as-is for the Marketing Material / Promotional
// Products storefront pages, untouched).
const MARKETING_MATERIAL_WITH_TEMPLATES = [
  "Posters", "Large Format Posters", "Coroplast Signs & Yard Signs", "Vinyl Banners", "Pull Up Banners", "X-Frame Banners",
  "Window Graphics", "Wall Decals", "Aluminum Signs", "Floor Graphics", "Car Magnets",
];
const PROMOTIONAL_PRODUCTS_WITH_TEMPLATES = [
  "Roll Labels / Stickers", "Square Cut Labels / Stickers",
];

// The remaining Sinalite categories — imported as plain gallery templates with no seed-design
// tier logic (see scripts/seed-sinalite-remaining-categories.mjs).
const REMAINING_SINALITE_CATEGORIES = [
  "Specialty Business Cards", "Brochures", "Greeting Cards", "Booklets", "Presentation Folders",
  "Magnets", "Wall Calendars", "Plastics", "Clings", "Letterhead", "Envelopes", "Notepads",
  "Foam Board", "Styrene Signs", "Display Board / POP", "Canvas", "Sintra/Rigid Board",
  "A-Frame Signs", "Supply Boxes", "H Stands for Signs", "A Frame Stands", "Folded Business Cards",
  "Tear Cards", "Digital Sheets", "Adhesive Vinyl", "Tent Cards", "Bookmarks", "NCR Forms",
  "Specialty Post Cards", "Specialty Greeting Cards", "Covid-19 Decals", "Table Covers", "Invitations",
];

export const CATEGORY_SUBPRODUCT_OPTIONS: Record<string, string[]> = {
  "business-cards": [
    "Business Cards", "Postcards", "Flyers", "Door Hangers",
    ...MARKETING_MATERIAL_WITH_TEMPLATES,
    ...PROMOTIONAL_PRODUCTS_WITH_TEMPLATES,
    ...REMAINING_SINALITE_CATEGORIES,
  ],
  "marketing-material": MARKETING_MATERIAL_SUBPRODUCTS,
  "promotional-products": PROMOTIONAL_PRODUCTS_SUBPRODUCTS,
  "t-shirts": ["Round Collar T-Shirt", "Full Sleeve T-Shirt"],
};

export const LISTING_ALLOWED_CATEGORIES = new Set([
  "business-cards", "flyers", "marketing-material", "promotional-products",
  "packaging-box",
  "t-shirts",
]);

export const LISTING_EXCLUDED_SLUGS = new Set([
  "retractable-banner", "gloss-stickers", "waterproof-labels",
  "die-cut-stickers", "product-label-rolls",
]);

export const testimonials = [
  {
    quote: "The order flow made it easy to send files and get our packaging job moving quickly.",
    author: "Amelia Patel",
    role: "Retail brand owner"
  },
  {
    quote: "A strong local storefront with clear options is exactly what custom print customers need.",
    author: "Jordan McNeil",
    role: "Halifax marketing consultant"
  },
  {
    quote: "This kind of Phase 1 foundation is the right step before adding a full design editor.",
    author: "Daniel Brooks",
    role: "Operations advisor"
  }
];

export const cartItems = [
  {
    name: "Custom Mailer Box",
    details: "100 units, E-flute corrugated, exterior print",
    price: 180
  },
  {
    name: "Round Product Labels",
    details: "500 labels, matte finish",
    price: 65
  }
];

export const accountOrders = [
  { id: "WPN-1045", product: "Custom Mailer Box", status: "Artwork review", total: "$180.00" },
  { id: "WPN-1042", product: "Premium Business Cards", status: "In production", total: "$49.00" },
  { id: "WPN-1039", product: "Vinyl Event Banner", status: "Shipped", total: "$95.00" }
];

export const adminMetrics = [
  { label: "Open orders", value: "18" },
  { label: "Artwork uploads", value: "26" },
  { label: "Pending review", value: "7" },
  { label: "Catalog products", value: "42" }
];

export const adminJobs = [
  { id: "JOB-442", customer: "North Shore Soap Co.", stage: "Artwork review", files: "3 uploads" },
  { id: "JOB-441", customer: "Anchor Events", stage: "Awaiting payment", files: "1 upload" },
  { id: "JOB-438", customer: "Harbor Apparel", stage: "Production queued", files: "5 uploads" }
];

// Product CRUD (getProducts, getProductBySlug, createProduct, updateProduct, deleteProduct,
// getListingProducts, featuredProducts, getAdminProductStats) lives in @/lib/products — that
// module touches the database (via @/lib/db, which uses Node's `fs`) and must never be
// imported from a client component. This file stays import-safe for both server and client.
