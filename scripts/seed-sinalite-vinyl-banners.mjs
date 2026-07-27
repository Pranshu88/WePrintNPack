/**
 * Imports Sinalite's "Vinyl Banners" category products as gallery templates under the
 * "sinalite-vinyl-banners" product/dropdown entry — kept separate from "Banners" (slug
 * "vinyl-banners"), which keeps its own hand-built templates (Premium/Standard Roll-Up
 * Banner, Large Outdoor Banner, Vinyl Banner) untouched.
 *
 * Run: node --env-file=.env.local ./scripts/seed-sinalite-vinyl-banners.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// "Vinyl Banners" (this Sinalite-backed import) is a distinct dropdown product/slug from
// "Banners" (the hand-built vinyl-banners product with Premium/Standard Roll-Up, Large Outdoor,
// Vinyl Banner templates) — see LEGACY_SUBPRODUCT_SLUGS in lib/data.ts.
const PRODUCT_SLUG = "sinalite-vinyl-banners";

const AUTH_URL = process.env.SINALITE_AUTH_URL || "https://api.sinaliteuppy.com/auth/token";
const API_URL  = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";

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
function uid() { return `snvb${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }

async function main() {
  console.log("Fetching Sinalite access token...");
  const token = await getToken();

  console.log("Fetching Sinalite products...");
  const products = await fetchProducts(token);

  const items = products.filter((p) => p.category === "Vinyl Banners" && p.enabled === 1);
  console.log(`Found ${items.length} Sinalite "Vinyl Banners" category products.`);

  const db = new Database(path.join(DATA_DIR, "webprint.db"));
  db.pragma("journal_mode = WAL");
  for (const col of ["price TEXT", "specs_json TEXT", "visible INTEGER NOT NULL DEFAULT 1", "description TEXT", "sinalite_id TEXT", "sinalite_sku TEXT"]) {
    try { db.exec(`ALTER TABLE gallery_templates ADD COLUMN ${col}`); } catch { /* already exists */ }
  }

  const existingIds = new Set(
    db.prepare("SELECT sinalite_id FROM gallery_templates WHERE product_slug = ? AND sinalite_id IS NOT NULL").all(PRODUCT_SLUG).map((r) => r.sinalite_id)
  );

  const insert = db.prepare(`
    INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, visible, sinalite_id, sinalite_sku)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  let created = 0, skipped = 0;
  for (const p of items) {
    const sinaliteId = String(p.id);
    if (existingIds.has(sinaliteId)) { skipped++; continue; }
    insert.run(uid(), PRODUCT_SLUG, p.name.trim(), placeholderImage(p.name.trim()), new Date().toISOString(), sinaliteId, p.sku ?? null);
    created++;
  }

  console.log(`Done. Created ${created} new gallery templates, skipped ${skipped} already-imported.`);
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
