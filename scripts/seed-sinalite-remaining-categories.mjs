/**
 * Imports every remaining Sinalite category (the ones not already wired into the admin
 * dropdown with dedicated tier/seed-design logic) as plain gallery templates — one new
 * product slug per category, no seed-design linking, matching the "Large Format Posters" /
 * "Pull Up Banners" / "X-Frame Banners" pattern used earlier in this project.
 *
 * Run: node --env-file=.env.local ./scripts/seed-sinalite-remaining-categories.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const AUTH_URL = process.env.SINALITE_AUTH_URL || "https://api.sinaliteuppy.com/auth/token";
const API_URL  = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";

// Categories already wired into the admin dropdown (with real content / tier logic) — skip these.
const ALREADY_HANDLED_CATEGORIES = new Set([
  "Business Cards", "Flyers", "Posters", "Large Format Posters",
  "Coroplast Signs & Yard Signs", "Coroplast Signs & Yard Signs-",
  "Vinyl Banners", "Pull Up Banners", "Pull Up Banners-", "X-Frame Banners",
  "Roll Labels / Stickers", "Square Cut Labels / Stickers",
  "Door Hangers", "Postcards",
]);

// Category name -> { slug, label } overrides where the raw Sinalite name needs cleanup
// (trailing dashes, duplicate "-" variants that should merge into one slug/label).
const CATEGORY_OVERRIDES = {
  "Covid-19-Decals-": { slug: "covid-19-decals", label: "Covid-19 Decals" },
  "Covid-19-Decals": { slug: "covid-19-decals", label: "Covid-19 Decals" },
};

function slugifyLabel(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}. Run with: node --env-file=.env.local ${process.argv[1]}`);
  return v;
}

async function getToken() {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requiredEnv("SINALITE_CLIENT_ID"),
      client_secret: requiredEnv("SINALITE_CLIENT_SECRET"),
      audience: process.env.SINALITE_AUDIENCE || "https://apiconnect.sinalite.com",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Sinalite auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function fetchProducts(token) {
  const res = await fetch(`${API_URL}/product`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Sinalite product fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function placeholderImage(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
    <rect width="460" height="270" fill="#eef0f3"/>
    <rect x="16" y="16" width="428" height="238" fill="none" stroke="#c7ccd4" stroke-width="2"/>
    <text x="230" y="145" font-family="Arial, sans-serif" font-size="20" fill="#5b6270" text-anchor="middle">${name.replace(/[<&>]/g, "")}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

let _c = 0;
function uid() { return `snrc${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }

async function main() {
  console.log("Fetching Sinalite access token...");
  const token = await getToken();

  console.log("Fetching Sinalite products...");
  const products = await fetchProducts(token);

  const byCategory = new Map();
  for (const p of products) {
    if (p.enabled !== 1) continue;
    if (ALREADY_HANDLED_CATEGORIES.has(p.category)) continue;
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  }

  console.log(`Found ${byCategory.size} remaining Sinalite categories to import.`);

  const db = new Database(path.join(DATA_DIR, "webprint.db"));
  db.pragma("journal_mode = WAL");
  for (const col of ["price TEXT", "specs_json TEXT", "visible INTEGER NOT NULL DEFAULT 1", "description TEXT", "sinalite_id TEXT", "sinalite_sku TEXT"]) {
    try { db.exec(`ALTER TABLE gallery_templates ADD COLUMN ${col}`); } catch { /* already exists */ }
  }

  const insert = db.prepare(`
    INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, visible, sinalite_id, sinalite_sku)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const dropdownLabels = [];
  const seenSlugs = new Set();

  for (const [category, items] of byCategory) {
    const override = CATEGORY_OVERRIDES[category];
    const slug = override?.slug ?? slugifyLabel(category);
    const label = override?.label ?? category;

    const existingIds = new Set(
      db.prepare("SELECT sinalite_id FROM gallery_templates WHERE product_slug = ? AND sinalite_id IS NOT NULL").all(slug).map((r) => r.sinalite_id)
    );

    const base = Date.now();
    let created = 0, skipped = 0;
    items.forEach((p, idx) => {
      const sinaliteId = String(p.id);
      if (existingIds.has(sinaliteId)) { skipped++; return; }
      const createdAt = new Date(base + (items.length - idx) * 1000).toISOString();
      insert.run(uid(), slug, p.name.trim(), placeholderImage(p.name.trim()), createdAt, sinaliteId, p.sku ?? null);
      created++;
    });
    console.log(`${category} -> slug "${slug}": created ${created}, skipped ${skipped}`);

    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      dropdownLabels.push(label);
    }
  }

  db.close();
  console.log("\nDropdown labels to add to CATEGORY_SUBPRODUCT_OPTIONS[\"business-cards\"]:");
  console.log(JSON.stringify(dropdownLabels, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
