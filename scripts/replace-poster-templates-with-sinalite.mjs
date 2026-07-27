/**
 * Imports Sinalite's "Posters" category products as gallery templates under "posters",
 * then repurposes the first 2 (arr[0], arr[1]) to replace the hand-built "Large Posters" /
 * "Small Posters" templates — keeping their real Sinalite product name, but tagged with
 * sinalite_id so they keep using the same POSTER_SEED_DESIGNS set and the same $139/$109
 * pricing as before. All other imported posters get no seed-design option.
 *
 * Run: node --env-file=.env.local ./scripts/replace-poster-templates-with-sinalite.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PRODUCT_SLUG = "posters";
const OLD_NAMES = ["Large Posters", "Small Posters"];

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
function uid() { return `snps${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }

// The 2 tiers to keep seed-designs for, mapped to their original price/specs copy.
const TIER_DEFAULTS_BY_ORDER = [
  { price: "$139 + tax", specs: ['Size: 18" × 24"', "Full colour"] },
  { price: "$109 + tax", specs: ['Size: 11" × 17"', "Full colour", "Gloss stock"] },
];

async function main() {
  console.log("Fetching Sinalite access token...");
  const token = await getToken();

  console.log("Fetching Sinalite products...");
  const products = await fetchProducts(token);

  const posters = products.filter((p) => p.category === "Posters" && p.enabled === 1 && !OLD_NAMES.includes(p.name.trim()));
  console.log(`Found ${posters.length} Sinalite "Posters" category products.`);

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
  const newIds = [];
  for (const p of posters) {
    const sinaliteId = String(p.id);
    if (existingIds.has(sinaliteId)) { skipped++; continue; }
    const id = uid();
    insert.run(id, PRODUCT_SLUG, p.name.trim(), placeholderImage(p.name.trim()), new Date().toISOString(), sinaliteId, p.sku ?? null);
    newIds.push({ id, sinaliteId, name: p.name.trim() });
    created++;
  }
  console.log(`Created ${created} new gallery templates, skipped ${skipped} already-imported.`);

  // Replace the 2 hand-built tiers with the first 2 newly-imported Sinalite posters (arr[0], arr[1]).
  const oldRows = db.prepare(
    `SELECT id, name FROM gallery_templates WHERE product_slug = ? AND name IN (${OLD_NAMES.map(() => "?").join(",")}) AND sinalite_id IS NULL`
  ).all(PRODUCT_SLUG, ...OLD_NAMES);

  const deleteColors = db.prepare(`DELETE FROM design_colors WHERE design_id IN (SELECT id FROM designs WHERE gallery_id = ?)`);
  const deleteDesigns = db.prepare(`DELETE FROM designs WHERE gallery_id = ?`);
  const deleteGallery = db.prepare(`DELETE FROM gallery_templates WHERE id = ?`);
  const setTierMeta = db.prepare(`UPDATE gallery_templates SET price = ?, specs_json = ? WHERE id = ?`);

  const tx = db.transaction(() => {
    for (const row of oldRows) {
      deleteColors.run(row.id);
      deleteDesigns.run(row.id);
      deleteGallery.run(row.id);
      console.log(`Deleted old template "${row.name}" (${row.id})`);
    }
    const tiers = newIds.slice(0, 2);
    tiers.forEach((row, i) => {
      const meta = TIER_DEFAULTS_BY_ORDER[i];
      setTierMeta.run(meta.price, JSON.stringify(meta.specs), row.id);
      console.log(`Tier ${i}: "${row.name}" (sinalite id ${row.sinaliteId}) -> price ${meta.price}`);
    });
  });
  tx();

  db.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
