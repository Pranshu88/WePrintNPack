/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║           BUSINESS CARD TEMPLATE SEED SCRIPT                        ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  HOW TO RUN:                                                         ║
 * ║    PATH=/usr/local/opt/node@22/bin:$PATH npm run seed                ║
 * ║                                                                      ║
 * ║  WHAT THIS SCRIPT DOES:                                              ║
 * ║  Creates GALLERY TEMPLATES (industry categories), each containing    ║
 * ║  multiple DESIGNS with color variants.                               ║
 * ║                                                                      ║
 * ║  STRUCTURE:                                                          ║
 * ║    Gallery Template  →  "Corporate Business Cards"                   ║
 * ║      Design          →    Corporate Minimal  (front_image = SVG)     ║
 * ║        Color variant →      Navy  #1e3a5f                            ║
 * ║        Color variant →      Slate #475569                            ║
 * ║      Design          →    Executive Premium                          ║
 * ║        Color variant →      Black Gold                               ║
 * ║                                                                      ║
 * ║  HOW ADMIN ADDS THEIR OWN:                                           ║
 * ║  1. Go to /admin/templates                                           ║
 * ║  2. Click "+ Add Gallery Template" → give it a name + preview image  ║
 * ║  3. Click "Designs" inside that gallery template                     ║
 * ║  4. Add designs and color variants as needed                         ║
 * ║                                                                      ║
 * ║  HOW TO ADD MORE SEEDED DESIGNS TO AN EXISTING GALLERY:             ║
 * ║  Find the matching GALLERY_COLLECTIONS entry below and add a new     ║
 * ║  object to its `designs` array. Then re-run the seed.               ║
 * ║                                                                      ║
 * ║  Re-running CLEARS and RE-INSERTS all seeded galleries.             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "webprint.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS gallery_templates (
    id            TEXT PRIMARY KEY,
    product_slug  TEXT NOT NULL,
    name          TEXT NOT NULL,
    preview_image TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_gt_slug_date
    ON gallery_templates(product_slug, created_at DESC);

  CREATE TABLE IF NOT EXISTS designs (
    id                TEXT PRIMARY KEY,
    gallery_id        TEXT NOT NULL REFERENCES gallery_templates(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    color_hex         TEXT,
    color_name        TEXT,
    front_image       TEXT NOT NULL,
    front_overlay     TEXT,
    back_image        TEXT,
    back_overlay      TEXT,
    front_admin_items TEXT,
    back_admin_items  TEXT,
    front_bg_color    TEXT,
    back_bg_color     TEXT,
    created_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_designs_gid ON designs(gallery_id);

  CREATE TABLE IF NOT EXISTS design_colors (
    id                TEXT PRIMARY KEY,
    design_id         TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    color_hex         TEXT NOT NULL,
    color_name        TEXT NOT NULL,
    front_image       TEXT NOT NULL,
    front_overlay     TEXT,
    back_image        TEXT,
    back_overlay      TEXT,
    front_admin_items TEXT,
    back_admin_items  TEXT,
    created_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dc_did ON design_colors(design_id);
`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _c = 0;
function uid() { return `s${String(++_c).padStart(4,"0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

// ═══════════════════════════════════════════════════════════════════════════════
//  SVG CARD LAYOUT GENERATORS
//  Each returns a base64 data URI that renders as a business card preview.
// ═══════════════════════════════════════════════════════════════════════════════

/** White card · centered logo circle · company name · divider · Full Name / Job Title · contact */
function layoutClassic(primary, accent) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240">
<rect width="420" height="240" fill="#fff"/>
<rect x="1" y="1" width="418" height="238" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
<circle cx="210" cy="68" r="28" fill="none" stroke="${primary}" stroke-width="1.5"/>
<text x="210" y="77" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="${primary}">H</text>
<text x="210" y="114" text-anchor="middle" font-family="Georgia,serif" font-size="10" letter-spacing="3" fill="#1f2937">COMPANY NAME</text>
<line x1="155" y1="122" x2="265" y2="122" stroke="${accent}" stroke-width="0.8"/>
<text x="210" y="141" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#111827">Full Name</text>
<text x="210" y="157" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="${primary}">Job Title</text>
<line x1="60" y1="190" x2="360" y2="190" stroke="#f3f4f6" stroke-width="1"/>
<text x="210" y="207" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.5" fill="#9ca3af">Phone Number  ·  email@company.com  ·  www.company.com</text>
</svg>`);
}

/** Logo placeholder box left · vertical divider · Name / Title / Address / Contact right */
function layoutTwoCol(primary, accent) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240">
<rect width="420" height="240" fill="#fff"/>
<rect x="1" y="1" width="418" height="238" fill="none" stroke="#d1d5db" stroke-width="1"/>
<rect x="22" y="60" width="105" height="68" fill="#f9fafb" stroke="${primary}" stroke-width="1" rx="4" stroke-dasharray="4 2"/>
<text x="74" y="91" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="${primary}">Your Logo</text>
<text x="74" y="104" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="${primary}">Here</text>
<text x="74" y="152" text-anchor="middle" font-family="Georgia,serif" font-size="8" letter-spacing="1.5" fill="#374151">COMPANY NAME</text>
<line x1="148" y1="35" x2="148" y2="205" stroke="#e5e7eb" stroke-width="1"/>
<text x="170" y="62" font-family="Georgia,serif" font-size="13" font-weight="bold" fill="#111827">Full Name</text>
<text x="170" y="78" font-family="Arial,sans-serif" font-size="9" fill="${accent}">Job Title</text>
<line x1="170" y1="87" x2="400" y2="87" stroke="${accent}" stroke-width="0.8"/>
<text x="170" y="108" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Address Line 1</text>
<text x="170" y="122" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Address Line 2</text>
<text x="170" y="142" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Email / Other</text>
<text x="170" y="156" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Phone / Other</text>
<text x="170" y="170" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Web / Other</text>
</svg>`);
}

/** Colored top band with Company Name · photo placeholder right · Name / Contact below */
function layoutHeader(primary) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240">
<rect width="420" height="82" fill="${primary}"/>
<rect y="82" width="420" height="158" fill="#fff"/>
<text x="28" y="38" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="#fff" letter-spacing="1">Company Name</text>
<text x="28" y="60" font-family="Arial,sans-serif" font-size="9" fill="#fff" opacity="0.75">Company Message / Tagline</text>
<rect x="302" y="52" width="88" height="76" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="3"/>
<text x="346" y="87" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">Upload Your</text>
<text x="346" y="100" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">Design</text>
<text x="28" y="120" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#111827">Full Name</text>
<text x="28" y="138" font-family="Arial,sans-serif" font-size="9" fill="${primary}">Job Title</text>
<line x1="28" y1="148" x2="280" y2="148" stroke="#f3f4f6" stroke-width="1"/>
<text x="28" y="165" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="28" y="180" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="28" y="195" font-family="Arial,sans-serif" font-size="8" fill="#6b7280">Web / Other</text>
</svg>`);
}

/** Full colored background · photo box top-right · white text throughout */
function layoutFull(bg, accent) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240">
<rect width="420" height="240" fill="${bg}"/>
<rect x="308" y="18" width="86" height="86" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.22)" stroke-width="1" rx="4"/>
<text x="351" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.55)">Upload Your</text>
<text x="351" y="71" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.55)">Design</text>
<text x="28" y="48" font-family="Georgia,serif" font-size="18" font-weight="bold" fill="#fff" letter-spacing="1">Company Name</text>
<text x="28" y="66" font-family="Arial,sans-serif" font-size="9" fill="${accent}">Company Message</text>
<line x1="28" y1="105" x2="175" y2="105" stroke="${accent}" stroke-width="1.5"/>
<text x="28" y="130" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#fff">Full Name</text>
<text x="28" y="148" font-family="Arial,sans-serif" font-size="9" fill="${accent}">Job Title</text>
<text x="28" y="173" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.7)">Address Line 1  ·  Address Line 2</text>
<text x="28" y="188" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.7)">Email / Other  ·  Phone / Other</text>
<text x="28" y="203" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.7)">Web / Other</text>
</svg>`);
}

/** Diagonal colored triangle top-left · photo placeholder top-right · contact info bottom */
function layoutDiagonal(primary) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240">
<rect width="420" height="240" fill="#fff"/>
<polygon points="0,0 220,0 0,170" fill="${primary}"/>
<rect x="298" y="14" width="90" height="90" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
<text x="343" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">Upload Your</text>
<text x="343" y="69" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">Design</text>
<text x="26" y="48" font-family="Georgia,serif" font-size="15" font-weight="bold" fill="#fff">Company Name</text>
<text x="26" y="66" font-family="Arial,sans-serif" font-size="9" fill="#fff" opacity="0.8">Company Message</text>
<text x="205" y="148" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#111827">Full Name</text>
<text x="205" y="165" font-family="Arial,sans-serif" font-size="9" fill="${primary}">Job Title</text>
<line x1="205" y1="173" x2="400" y2="173" stroke="#f3f4f6" stroke-width="1"/>
<text x="205" y="188" font-family="Arial,sans-serif" font-size="8" fill="#9ca3af">Email  ·  Phone  ·  Web / Other</text>
</svg>`);
}

function makeImg(layout, primary, accent) {
  if (layout === "classic")  return layoutClassic(primary, accent);
  if (layout === "twocol")   return layoutTwoCol(primary, accent);
  if (layout === "header")   return layoutHeader(primary);
  if (layout === "fullcolor") return layoutFull(primary, accent);
  if (layout === "diagonal") return layoutDiagonal(primary);
  return layoutClassic(primary, accent);
}

// ═══════════════════════════════════════════════════════════════════════════════
//
//  GALLERY COLLECTIONS
//  ═══════════════════
//  Each entry = ONE GALLERY TEMPLATE (shown as a card on customer gallery page)
//    galleryName  – name of the gallery template (admin-visible + customer-visible)
//    designs[]    – different card STYLES within this gallery
//      name       – design label shown in admin
//      layout     – classic | twocol | header | fullcolor | diagonal
//      primary    – default primary color of this design
//      accent     – default accent/highlight color
//      colors[]   – color variants customers can pick
//        name     – color variant label
//        hex      – background/primary hex for this variant
//        accent   – accent hex for this variant
//
// ═══════════════════════════════════════════════════════════════════════════════
const GALLERY_COLLECTIONS = [

  // ── 1. Corporate Business Cards ────────────────────────────────────────────
  {
    galleryName: "Corporate Business Cards",
    designs: [
      {
        name: "Corporate Minimal",
        layout: "classic",
        primary: "#1e3a5f", accent: "#06b6d4",
        colors: [
          { name: "Navy",     hex: "#1e3a5f", accent: "#06b6d4" },
          { name: "Slate",    hex: "#475569", accent: "#94a3b8" },
          { name: "Charcoal", hex: "#374151", accent: "#9ca3af" },
          { name: "Black",    hex: "#111827", accent: "#6b7280" },
        ],
      },
      {
        name: "Executive Premium",
        layout: "fullcolor",
        primary: "#09090b", accent: "#d97706",
        colors: [
          { name: "Black Gold",  hex: "#09090b", accent: "#d97706" },
          { name: "Navy Gold",   hex: "#1e3a5f", accent: "#d97706" },
          { name: "Dark Brown",  hex: "#1c1917", accent: "#fbbf24" },
        ],
      },
      {
        name: "Business Classic",
        layout: "classic",
        primary: "#1d4ed8", accent: "#93c5fd",
        colors: [
          { name: "Royal Blue", hex: "#1d4ed8", accent: "#93c5fd" },
          { name: "Navy",       hex: "#1e3a5f", accent: "#7dd3fc" },
          { name: "Dark Teal",  hex: "#0f766e", accent: "#5eead4" },
        ],
      },
      {
        name: "Professional Edge",
        layout: "twocol",
        primary: "#1f2937", accent: "#06b6d4",
        colors: [
          { name: "Graphite",   hex: "#1f2937", accent: "#06b6d4" },
          { name: "Slate Blue", hex: "#334155", accent: "#38bdf8" },
          { name: "Indigo",     hex: "#3730a3", accent: "#818cf8" },
        ],
      },
      {
        name: "Corporate Bold Header",
        layout: "header",
        primary: "#1e40af", accent: "#bfdbfe",
        colors: [
          { name: "Bold Blue",  hex: "#1e40af", accent: "#bfdbfe" },
          { name: "Bold Navy",  hex: "#1e3a5f", accent: "#bae6fd" },
          { name: "Bold Slate", hex: "#334155", accent: "#e2e8f0" },
        ],
      },
      {
        name: "Executive Diagonal",
        layout: "diagonal",
        primary: "#374151", accent: "#f9fafb",
        colors: [
          { name: "Charcoal",   hex: "#374151", accent: "#f9fafb" },
          { name: "Dark Teal",  hex: "#134e4a", accent: "#ccfbf1" },
          { name: "Deep Plum",  hex: "#3b0764", accent: "#ede9fe" },
        ],
      },
    ],
  },

  // ── 2. Restaurant & Food Business Cards ────────────────────────────────────
  {
    galleryName: "Restaurant & Food Business Cards",
    designs: [
      {
        name: "Restaurant Classic",
        layout: "header",
        primary: "#7f1d1d", accent: "#fef2f2",
        colors: [
          { name: "Burgundy",   hex: "#7f1d1d", accent: "#fef2f2" },
          { name: "Dark Brown", hex: "#78350f", accent: "#fffbeb" },
          { name: "Forest",     hex: "#14532d", accent: "#f0fdf4" },
        ],
      },
      {
        name: "Chef Signature",
        layout: "fullcolor",
        primary: "#09090b", accent: "#d97706",
        colors: [
          { name: "Black Gold", hex: "#09090b", accent: "#d97706" },
          { name: "Espresso",   hex: "#1c1917", accent: "#fbbf24" },
          { name: "Dark Red",   hex: "#450a0a", accent: "#fca5a5" },
        ],
      },
      {
        name: "Cafe & Bakery",
        layout: "twocol",
        primary: "#92400e", accent: "#fbbf24",
        colors: [
          { name: "Warm Brown", hex: "#92400e", accent: "#fbbf24" },
          { name: "Caramel",    hex: "#b45309", accent: "#fef08a" },
          { name: "Mocha",      hex: "#78350f", accent: "#fde68a" },
        ],
      },
      {
        name: "Fine Dining",
        layout: "fullcolor",
        primary: "#0a0a0a", accent: "#d97706",
        colors: [
          { name: "Black Gold",  hex: "#0a0a0a", accent: "#d97706" },
          { name: "Deep Wine",   hex: "#4a0011", accent: "#fda4af" },
          { name: "Forest Gold", hex: "#14532d", accent: "#fef08a" },
        ],
      },
      {
        name: "Bistro Modern",
        layout: "classic",
        primary: "#3f6212", accent: "#86efac",
        colors: [
          { name: "Olive",      hex: "#3f6212", accent: "#86efac" },
          { name: "Terracotta", hex: "#9a3412", accent: "#fdba74" },
          { name: "Teal",       hex: "#115e59", accent: "#5eead4" },
        ],
      },
    ],
  },

  // ── 3. Healthcare & Medical Business Cards ──────────────────────────────────
  {
    galleryName: "Healthcare & Medical Business Cards",
    designs: [
      {
        name: "Medical Professional",
        layout: "twocol",
        primary: "#0369a1", accent: "#06b6d4",
        colors: [
          { name: "Medical Blue", hex: "#0369a1", accent: "#06b6d4" },
          { name: "Teal",         hex: "#0d9488", accent: "#14b8a6" },
          { name: "Navy",         hex: "#1e3a5f", accent: "#38bdf8" },
        ],
      },
      {
        name: "Clinic Clean",
        layout: "classic",
        primary: "#0369a1", accent: "#bae6fd",
        colors: [
          { name: "Sky Blue",  hex: "#0369a1", accent: "#bae6fd" },
          { name: "Teal",      hex: "#0d9488", accent: "#99f6e4" },
          { name: "Pale Blue", hex: "#0284c7", accent: "#e0f2fe" },
        ],
      },
      {
        name: "Health & Wellness",
        layout: "header",
        primary: "#15803d", accent: "#f0fdf4",
        colors: [
          { name: "Fresh Green", hex: "#15803d", accent: "#f0fdf4" },
          { name: "Sage",        hex: "#4d7c0f", accent: "#f7fee7" },
          { name: "Ocean Blue",  hex: "#0284c7", accent: "#f0f9ff" },
        ],
      },
      {
        name: "Dental Premium",
        layout: "diagonal",
        primary: "#0ea5e9", accent: "#bae6fd",
        colors: [
          { name: "Sky Blue", hex: "#0ea5e9", accent: "#bae6fd" },
          { name: "Teal",     hex: "#0891b2", accent: "#cffafe" },
          { name: "Navy",     hex: "#0369a1", accent: "#e0f2fe" },
        ],
      },
      {
        name: "Mental Health Coach",
        layout: "fullcolor",
        primary: "#7c3aed", accent: "#ddd6fe",
        colors: [
          { name: "Lavender",    hex: "#7c3aed", accent: "#ddd6fe" },
          { name: "Soft Purple", hex: "#6d28d9", accent: "#ede9fe" },
          { name: "Teal",        hex: "#0d9488", accent: "#ccfbf1" },
        ],
      },
    ],
  },

  // ── 4. Real Estate Business Cards ──────────────────────────────────────────
  {
    galleryName: "Real Estate Business Cards",
    designs: [
      {
        name: "Realty Gold",
        layout: "fullcolor",
        primary: "#09090b", accent: "#d97706",
        colors: [
          { name: "Black Gold",  hex: "#09090b", accent: "#d97706" },
          { name: "Dark Gold",   hex: "#1c1917", accent: "#fbbf24" },
          { name: "Navy Gold",   hex: "#1e3a5f", accent: "#fbbf24" },
        ],
      },
      {
        name: "Property Pro",
        layout: "twocol",
        primary: "#1e3a5f", accent: "#06b6d4",
        colors: [
          { name: "Navy",     hex: "#1e3a5f", accent: "#06b6d4" },
          { name: "Charcoal", hex: "#374151", accent: "#94a3b8" },
          { name: "Forest",   hex: "#166534", accent: "#86efac" },
        ],
      },
      {
        name: "Luxury Properties",
        layout: "fullcolor",
        primary: "#09090b", accent: "#fbbf24",
        colors: [
          { name: "Black",       hex: "#09090b", accent: "#fbbf24" },
          { name: "Dark Maroon", hex: "#4c0519", accent: "#fda4af" },
          { name: "Dark Navy",   hex: "#0c1a2e", accent: "#93c5fd" },
        ],
      },
      {
        name: "Realty Modern",
        layout: "header",
        primary: "#0284c7", accent: "#e0f2fe",
        colors: [
          { name: "Sky Blue",  hex: "#0284c7", accent: "#e0f2fe" },
          { name: "Teal",      hex: "#0d9488", accent: "#ccfbf1" },
          { name: "Slate",     hex: "#334155", accent: "#f1f5f9" },
        ],
      },
      {
        name: "Property Elegant",
        layout: "diagonal",
        primary: "#78350f", accent: "#fef9c3",
        colors: [
          { name: "Champagne",    hex: "#78350f", accent: "#fef9c3" },
          { name: "Marble White", hex: "#374151", accent: "#f9fafb" },
          { name: "Deep Green",   hex: "#14532d", accent: "#fef9c3" },
        ],
      },
    ],
  },

  // ── 5. Law & Legal Business Cards ──────────────────────────────────────────
  {
    galleryName: "Law & Legal Business Cards",
    designs: [
      {
        name: "Law Firm Classic",
        layout: "fullcolor",
        primary: "#09090b", accent: "#9ca3af",
        colors: [
          { name: "Black",     hex: "#09090b", accent: "#9ca3af" },
          { name: "Dark Navy", hex: "#1e3a5f", accent: "#93c5fd" },
          { name: "Charcoal",  hex: "#1f2937", accent: "#94a3b8" },
        ],
      },
      {
        name: "Legal Gold",
        layout: "fullcolor",
        primary: "#1e3a5f", accent: "#d97706",
        colors: [
          { name: "Navy Gold",  hex: "#1e3a5f", accent: "#d97706" },
          { name: "Black Gold", hex: "#09090b", accent: "#fbbf24" },
          { name: "Dark Brown", hex: "#1c1917", accent: "#fbbf24" },
        ],
      },
      {
        name: "Attorney Modern",
        layout: "twocol",
        primary: "#334155", accent: "#06b6d4",
        colors: [
          { name: "Slate",    hex: "#334155", accent: "#06b6d4" },
          { name: "Graphite", hex: "#1f2937", accent: "#94a3b8" },
          { name: "Navy",     hex: "#1e40af", accent: "#93c5fd" },
        ],
      },
      {
        name: "Legal Minimal",
        layout: "classic",
        primary: "#374151", accent: "#9ca3af",
        colors: [
          { name: "White",      hex: "#374151", accent: "#9ca3af" },
          { name: "Ivory",      hex: "#1c1917", accent: "#d6d3d1" },
          { name: "Light Gray", hex: "#1f2937", accent: "#9ca3af" },
        ],
      },
    ],
  },

  // ── 6. Beauty & Salon Business Cards ───────────────────────────────────────
  {
    galleryName: "Beauty & Salon Business Cards",
    designs: [
      {
        name: "Beauty Salon",
        layout: "diagonal",
        primary: "#be185d", accent: "#fdf2f8",
        colors: [
          { name: "Rose Pink",  hex: "#be185d", accent: "#fdf2f8" },
          { name: "Deep Pink",  hex: "#9d174d", accent: "#fce7f3" },
          { name: "Coral",      hex: "#e11d48", accent: "#fff1f2" },
        ],
      },
      {
        name: "Hair Studio",
        layout: "header",
        primary: "#a16207", accent: "#fefce8",
        colors: [
          { name: "Gold",  hex: "#a16207", accent: "#fefce8" },
          { name: "Rose",  hex: "#e11d48", accent: "#fff1f2" },
          { name: "Plum",  hex: "#6b21a8", accent: "#f5f3ff" },
          { name: "Teal",  hex: "#0d9488", accent: "#ccfbf1" },
        ],
      },
      {
        name: "Spa & Wellness",
        layout: "classic",
        primary: "#4d7c0f", accent: "#86efac",
        colors: [
          { name: "Sage Green",  hex: "#4d7c0f", accent: "#86efac" },
          { name: "Soft Purple", hex: "#7c3aed", accent: "#ddd6fe" },
          { name: "Dusty Rose",  hex: "#be185d", accent: "#fce7f3" },
        ],
      },
      {
        name: "Salon Premium",
        layout: "fullcolor",
        primary: "#09090b", accent: "#f9a8d4",
        colors: [
          { name: "Black",       hex: "#09090b", accent: "#f9a8d4" },
          { name: "Dark Rose",   hex: "#881337", accent: "#fce7f3" },
          { name: "Dark Purple", hex: "#3b0764", accent: "#e9d5ff" },
        ],
      },
      {
        name: "Makeup Artist",
        layout: "fullcolor",
        primary: "#881337", accent: "#fda4af",
        colors: [
          { name: "Rose",  hex: "#881337", accent: "#fda4af" },
          { name: "Gold",  hex: "#b45309", accent: "#fefce8" },
          { name: "Black", hex: "#09090b", accent: "#fce7f3" },
        ],
      },
    ],
  },

  // ── 7. Technology & Startup Business Cards ──────────────────────────────────
  {
    galleryName: "Technology & Startup Business Cards",
    designs: [
      {
        name: "Tech Startup",
        layout: "fullcolor",
        primary: "#0f172a", accent: "#a5b4fc",
        colors: [
          { name: "Dark",      hex: "#0f172a", accent: "#a5b4fc" },
          { name: "Deep Blue", hex: "#1e3a5f", accent: "#93c5fd" },
          { name: "Indigo",    hex: "#3730a3", accent: "#c7d2fe" },
          { name: "Violet",    hex: "#5b21b6", accent: "#ddd6fe" },
        ],
      },
      {
        name: "Digital Agency",
        layout: "header",
        primary: "#164e63", accent: "#cffafe",
        colors: [
          { name: "Cyan Dark",   hex: "#164e63", accent: "#cffafe" },
          { name: "Teal Dark",   hex: "#134e4a", accent: "#ccfbf1" },
          { name: "Indigo Dark", hex: "#1e1b4b", accent: "#e0e7ff" },
        ],
      },
      {
        name: "Software Developer",
        layout: "fullcolor",
        primary: "#020617", accent: "#86efac",
        colors: [
          { name: "Dark",     hex: "#020617", accent: "#86efac" },
          { name: "Dracula",  hex: "#1e1b4b", accent: "#a5b4fc" },
          { name: "Terminal", hex: "#052e16", accent: "#86efac" },
        ],
      },
      {
        name: "SaaS Product",
        layout: "diagonal",
        primary: "#2563eb", accent: "#eff6ff",
        colors: [
          { name: "Blue",   hex: "#2563eb", accent: "#eff6ff" },
          { name: "Violet", hex: "#7c3aed", accent: "#f5f3ff" },
          { name: "Teal",   hex: "#0891b2", accent: "#ecfeff" },
        ],
      },
      {
        name: "Tech Minimal",
        layout: "classic",
        primary: "#1e3a5f", accent: "#bfdbfe",
        colors: [
          { name: "White",      hex: "#1e3a5f", accent: "#bfdbfe" },
          { name: "Light",      hex: "#0284c7", accent: "#e0f2fe" },
          { name: "Near White", hex: "#334155", accent: "#e2e8f0" },
        ],
      },
    ],
  },

  // ── 8. Creative & Design Business Cards ────────────────────────────────────
  {
    galleryName: "Creative & Design Business Cards",
    designs: [
      {
        name: "Creative Studio",
        layout: "diagonal",
        primary: "#ea580c", accent: "#fff7ed",
        colors: [
          { name: "Orange", hex: "#ea580c", accent: "#fff7ed" },
          { name: "Purple", hex: "#9333ea", accent: "#faf5ff" },
          { name: "Pink",   hex: "#db2777", accent: "#fdf2f8" },
          { name: "Teal",   hex: "#0891b2", accent: "#ecfeff" },
        ],
      },
      {
        name: "Design Agency",
        layout: "fullcolor",
        primary: "#09090b", accent: "#a5b4fc",
        colors: [
          { name: "Black",       hex: "#09090b", accent: "#a5b4fc" },
          { name: "Charcoal",    hex: "#1f2937", accent: "#94a3b8" },
          { name: "Dark Indigo", hex: "#1e1b4b", accent: "#c7d2fe" },
        ],
      },
      {
        name: "Photographer",
        layout: "fullcolor",
        primary: "#09090b", accent: "#f1f5f9",
        colors: [
          { name: "Black",      hex: "#09090b", accent: "#f1f5f9" },
          { name: "Warm Black", hex: "#1c1917", accent: "#fef3c7" },
          { name: "Cool Dark",  hex: "#0f172a", accent: "#e2e8f0" },
        ],
      },
      {
        name: "Illustrator",
        layout: "header",
        primary: "#f43f5e", accent: "#fff1f2",
        colors: [
          { name: "Coral",   hex: "#f43f5e", accent: "#fff1f2" },
          { name: "Violet",  hex: "#8b5cf6", accent: "#f5f3ff" },
          { name: "Amber",   hex: "#d97706", accent: "#fffbeb" },
          { name: "Emerald", hex: "#059669", accent: "#ecfdf5" },
        ],
      },
      {
        name: "Video & Motion",
        layout: "fullcolor",
        primary: "#7f1d1d", accent: "#fca5a5",
        colors: [
          { name: "Dark Red",    hex: "#7f1d1d", accent: "#fca5a5" },
          { name: "Midnight",    hex: "#0f172a", accent: "#e2e8f0" },
          { name: "Dark Violet", hex: "#2e1065", accent: "#e9d5ff" },
        ],
      },
    ],
  },

  // ── 9. Finance & Accounting Business Cards ──────────────────────────────────
  {
    galleryName: "Finance & Accounting Business Cards",
    designs: [
      {
        name: "Finance Professional",
        layout: "twocol",
        primary: "#1e3a5f", accent: "#06b6d4",
        colors: [
          { name: "Navy",       primary: "#1e3a5f", hex: "#1e3a5f", accent: "#06b6d4" },
          { name: "Dark Slate", hex: "#1e293b", accent: "#94a3b8" },
          { name: "Charcoal",   hex: "#374151", accent: "#9ca3af" },
        ],
      },
      {
        name: "Accounting Clean",
        layout: "classic",
        primary: "#0369a1", accent: "#bae6fd",
        colors: [
          { name: "White",      hex: "#0369a1", accent: "#bae6fd" },
          { name: "Off White",  hex: "#0f172a", accent: "#94a3b8" },
          { name: "Light Blue", hex: "#1d4ed8", accent: "#bfdbfe" },
        ],
      },
      {
        name: "Investment Elite",
        layout: "fullcolor",
        primary: "#09090b", accent: "#d97706",
        colors: [
          { name: "Black Gold",  hex: "#09090b", accent: "#d97706" },
          { name: "Navy Gold",   hex: "#1e3a5f", accent: "#fbbf24" },
          { name: "Forest Gold", hex: "#14532d", accent: "#fbbf24" },
        ],
      },
      {
        name: "Tax & CPA",
        layout: "header",
        primary: "#1d4ed8", accent: "#eff6ff",
        colors: [
          { name: "Blue",  hex: "#1d4ed8", accent: "#eff6ff" },
          { name: "Green", hex: "#15803d", accent: "#f0fdf4" },
          { name: "Navy",  hex: "#1e3a5f", accent: "#f0f9ff" },
        ],
      },
    ],
  },

  // ── 10. Fitness & Sports Business Cards ─────────────────────────────────────
  {
    galleryName: "Fitness & Sports Business Cards",
    designs: [
      {
        name: "Personal Trainer",
        layout: "fullcolor",
        primary: "#09090b", accent: "#fb923c",
        colors: [
          { name: "Black Orange", hex: "#09090b", accent: "#fb923c" },
          { name: "Dark Red",     hex: "#7f1d1d", accent: "#fca5a5" },
          { name: "Navy Blue",    hex: "#1e3a5f", accent: "#93c5fd" },
        ],
      },
      {
        name: "Gym & Fitness",
        layout: "header",
        primary: "#1d4ed8", accent: "#dbeafe",
        colors: [
          { name: "Electric Blue", hex: "#1d4ed8", accent: "#dbeafe" },
          { name: "Orange",        hex: "#ea580c", accent: "#fff7ed" },
          { name: "Black",         hex: "#111827", accent: "#f9fafb" },
          { name: "Red",           hex: "#dc2626", accent: "#fef2f2" },
        ],
      },
      {
        name: "Sports Coaching",
        layout: "diagonal",
        primary: "#15803d", accent: "#f0fdf4",
        colors: [
          { name: "Green", hex: "#15803d", accent: "#f0fdf4" },
          { name: "Blue",  hex: "#2563eb", accent: "#eff6ff" },
          { name: "Black", hex: "#111827", accent: "#f0fdf4" },
        ],
      },
      {
        name: "Yoga & Meditation",
        layout: "twocol",
        primary: "#4d7c0f", accent: "#86efac",
        colors: [
          { name: "Sage",     hex: "#4d7c0f", accent: "#86efac" },
          { name: "Lavender", hex: "#6d28d9", accent: "#ddd6fe" },
          { name: "Ocean",    hex: "#0284c7", accent: "#bae6fd" },
        ],
      },
    ],
  },

  // ── 11. Education & Consulting Business Cards ────────────────────────────────
  {
    galleryName: "Education & Consulting Business Cards",
    designs: [
      {
        name: "Education Professional",
        layout: "header",
        primary: "#1d4ed8", accent: "#eff6ff",
        colors: [
          { name: "Royal Blue", hex: "#1d4ed8", accent: "#eff6ff" },
          { name: "Forest",     hex: "#166534", accent: "#f0fdf4" },
          { name: "Maroon",     hex: "#7f1d1d", accent: "#fef2f2" },
        ],
      },
      {
        name: "Life Coach",
        layout: "diagonal",
        primary: "#7c3aed", accent: "#f5f3ff",
        colors: [
          { name: "Purple", hex: "#7c3aed", accent: "#f5f3ff" },
          { name: "Teal",   hex: "#0d9488", accent: "#ccfbf1" },
          { name: "Orange", hex: "#ea580c", accent: "#fff7ed" },
        ],
      },
      {
        name: "HR & Recruitment",
        layout: "twocol",
        primary: "#0d9488", accent: "#99f6e4",
        colors: [
          { name: "Navy", hex: "#1e3a5f", accent: "#bae6fd" },
          { name: "Teal", hex: "#0d9488", accent: "#99f6e4" },
          { name: "Slate",hex: "#475569", accent: "#e2e8f0" },
        ],
      },
    ],
  },
];

// ─── Target product ───────────────────────────────────────────────────────────
const PRODUCT_SLUG = "premium-business-cards";

// ─── Prepared statements ──────────────────────────────────────────────────────
const stmtInsertGallery = db.prepare(
  "INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at) VALUES (?, ?, ?, ?, ?)"
);
const stmtInsertDesign = db.prepare(
  `INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, front_bg_color, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtInsertColor = db.prepare(
  `INSERT INTO design_colors (id, design_id, color_hex, color_name, front_image, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// ─── Seed transaction ─────────────────────────────────────────────────────────
const run = db.transaction(() => {
  const cleared = db.prepare("DELETE FROM gallery_templates WHERE product_slug = ?").run(PRODUCT_SLUG).changes;
  console.log(`Cleared ${cleared} existing gallery template(s) for "${PRODUCT_SLUG}"\n`);

  let galleries = 0, totalDesigns = 0, totalColors = 0;

  for (const col of GALLERY_COLLECTIONS) {
    const gid  = uid();
    const now  = new Date(Date.now() + galleries * 200).toISOString();

    // Use first design's image as gallery preview
    const firstDesign = col.designs[0];
    const previewImg  = makeImg(firstDesign.layout, firstDesign.primary, firstDesign.accent);

    stmtInsertGallery.run(gid, PRODUCT_SLUG, col.galleryName, previewImg, now);

    for (const d of col.designs) {
      const did      = uid();
      const baseImg  = makeImg(d.layout, d.primary, d.accent);
      const firstColor = d.colors[0];

      stmtInsertDesign.run(
        did, gid,
        d.name,
        firstColor.hex, firstColor.name,
        baseImg,
        firstColor.hex,
        now
      );

      // Color variants
      for (const c of d.colors) {
        const varImg = makeImg(d.layout, c.hex, c.accent);
        stmtInsertColor.run(uid(), did, c.hex, c.name, varImg, now);
        totalColors++;
      }

      totalDesigns++;
    }

    console.log(`  ✓  ${col.galleryName}  (${col.designs.length} designs)`);
    galleries++;
  }

  return { galleries, totalDesigns, totalColors };
});

const result = run();
console.log(`
Summary
───────────────────────────────
Gallery templates : ${result.galleries}
Designs           : ${result.totalDesigns}
Color variants    : ${result.totalColors}
Product slug      : ${PRODUCT_SLUG}
`);

db.close();
