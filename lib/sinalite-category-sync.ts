import { randomUUID } from "crypto";
import getDb from "./db";
import { fetchSinaliteProducts } from "./sinalite";
import { invalidateGalleryTemplatesCache } from "./template-data";

// Reverse of the slug rules already established across the codebase (lib/data.ts's
// LEGACY_SUBPRODUCT_SLUGS, the per-category seed-sinalite-*.mjs scripts, and
// scripts/import-all-sinalite-turso.mjs) — maps each admin gallery product_slug back
// to the Sinalite category name(s) it's sourced from, so the admin page can check
// Sinalite's live catalog for that slug and pull in anything new automatically.
const SINALITE_SLUG_TO_CATEGORIES: Record<string, string[]> = {
  "premium-business-cards": ["Business Cards"],
  "bold-flyers": ["Flyers"],
  "promotional-postcards": ["Postcards"],
  "posters": ["Posters"],
  "sinalite-vinyl-banners": ["Vinyl Banners"],
  "yard-signs": ["Coroplast Signs & Yard Signs", "Coroplast Signs & Yard Signs-"],
  "stickers-and-labels": ["Roll Labels / Stickers"],
  "pull-up-banners": ["Pull Up Banners", "Pull Up Banners-"],
  "x-frame-banners": ["X-Frame Banners"],
  "large-format-posters": ["Large Format Posters"],
  "square-cut-labels-stickers": ["Square Cut Labels / Stickers"],
  "covid-19-decals": ["Covid-19-Decals", "Covid-19-Decals-"],
  "door-hangers": ["Door Hangers"],
  "specialty-business-cards": ["Specialty Business Cards"],
  "brochures": ["Brochures"],
  "greeting-cards": ["Greeting Cards"],
  "booklets": ["Booklets"],
  "presentation-folders": ["Presentation Folders"],
  "magnets": ["Magnets"],
  "wall-calendars": ["Wall Calendars"],
  "plastics": ["Plastics"],
  "clings": ["Clings"],
  "letterhead": ["Letterhead"],
  "envelopes": ["Envelopes"],
  "notepads": ["Notepads"],
  "foam-board": ["Foam Board"],
  "styrene-signs": ["Styrene Signs"],
  "display-board-pop": ["Display Board / POP"],
  "canvas": ["Canvas"],
  "sintra-rigid-board": ["Sintra/Rigid Board"],
  "a-frame-signs": ["A-Frame Signs"],
  "supply-boxes": ["Supply Boxes"],
  "h-stands-for-signs": ["H Stands for Signs"],
  "a-frame-stands": ["A Frame Stands"],
  "folded-business-cards": ["Folded Business Cards"],
  "tear-cards": ["Tear Cards"],
  "digital-sheets": ["Digital Sheets"],
  "adhesive-vinyl": ["Adhesive Vinyl"],
  "tent-cards": ["Tent Cards"],
  "bookmarks": ["Bookmarks"],
  "ncr-forms": ["NCR Forms"],
  "specialty-post-cards": ["Specialty Post Cards"],
  "specialty-greeting-cards": ["Specialty Greeting Cards"],
  "wall-decals": ["Wall Decals"],
  "floor-graphics": ["Floor Graphics"],
  "aluminum-signs": ["Aluminum Signs"],
  "table-covers": ["Table Covers"],
  "invitations": ["Invitations"],
  "car-magnets": ["Car Magnets"],
  "window-graphics": ["Window Graphics"],
};

function placeholderImage(name: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
    <rect width="460" height="270" fill="#eef0f3"/>
    <rect x="16" y="16" width="428" height="238" fill="none" stroke="#c7ccd4" stroke-width="2"/>
    <text x="230" y="145" font-family="Arial, sans-serif" font-size="18" fill="#5b6270" text-anchor="middle">${name.replace(/[<&>]/g, "")}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Called from the admin ("?admin=1") templates fetch only — checks Sinalite's live
// catalog for this slug's category and inserts any product not yet present as a
// gallery_templates row, so newly added/enabled Sinalite products show up on the
// next admin page load with no manual import step.
export async function syncSinaliteCategoryIntoGallery(productSlug: string): Promise<void> {
  const categories = SINALITE_SLUG_TO_CATEGORIES[productSlug];
  if (!categories?.length) return;

  let products;
  try {
    products = await fetchSinaliteProducts();
  } catch {
    return; // Sinalite unreachable — fall back to whatever's already in the DB
  }

  const matching = products.filter((p) => p.enabled === 1 && categories.includes(p.category));
  if (!matching.length) return;

  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT sinalite_id FROM gallery_templates WHERE product_slug = ? AND sinalite_id IS NOT NULL",
    args: [productSlug],
  });
  const existingIds = new Set(existing.rows.map((r) => String(r.sinalite_id)));

  const missing = matching.filter((p) => !existingIds.has(String(p.id)));
  if (!missing.length) return;

  const now = Date.now();
  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    const name = p.name.trim();
    const createdAt = new Date(now + (missing.length - i) * 1000).toISOString();
    await db.execute({
      sql: `INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, visible, sinalite_id, sinalite_sku)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [randomUUID(), productSlug, name, placeholderImage(name), createdAt, String(p.id), p.sku ?? null],
    });
  }
  invalidateGalleryTemplatesCache(productSlug);
}
