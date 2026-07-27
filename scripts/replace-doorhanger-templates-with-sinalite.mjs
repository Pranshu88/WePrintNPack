/**
 * Replaces the hand-made "Door Hanger" template under "door-hangers" with Sinalite's
 * "Door Hangers" category products — plain import, no seed-design tier logic.
 *
 * Run: node --env-file=.env.local ./scripts/replace-doorhanger-templates-with-sinalite.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");

const PRODUCT_SLUG = "door-hangers";

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
function uid() { return `sndh${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }

async function main() {
  console.log("Fetching Sinalite access token...");
  const token = await getToken();

  console.log("Fetching Sinalite products...");
  const products = await fetchProducts(token);

  const items = products.filter((p) => p.category === "Door Hangers" && p.enabled === 1);
  console.log(`Found ${items.length} Sinalite "Door Hangers" category products.`);

  const db = new Database(path.join(DATA_DIR, "webprint.db"));
  db.pragma("journal_mode = WAL");

  // Remove the old hand-made template(s) under this slug (and their designs/colors).
  const oldRows = db.prepare(
    `SELECT id, name FROM gallery_templates WHERE product_slug = ? AND sinalite_id IS NULL`
  ).all(PRODUCT_SLUG);
  const deleteColors = db.prepare(`DELETE FROM design_colors WHERE design_id IN (SELECT id FROM designs WHERE gallery_id = ?)`);
  const deleteDesigns = db.prepare(`DELETE FROM designs WHERE gallery_id = ?`);
  const deleteGallery = db.prepare(`DELETE FROM gallery_templates WHERE id = ?`);
  for (const row of oldRows) {
    deleteColors.run(row.id);
    deleteDesigns.run(row.id);
    deleteGallery.run(row.id);
    console.log(`Deleted old template "${row.name}" (${row.id})`);
  }

  const insert = db.prepare(`
    INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, visible, sinalite_id, sinalite_sku)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const base = Date.now();
  let created = 0;
  items.forEach((p, idx) => {
    const createdAt = new Date(base + (items.length - idx) * 1000).toISOString();
    insert.run(uid(), PRODUCT_SLUG, p.name.trim(), placeholderImage(p.name.trim()), createdAt, String(p.id), p.sku ?? null);
    created++;
  });

  console.log(`Created ${created} new gallery templates.`);
  db.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
