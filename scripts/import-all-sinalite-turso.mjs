/**
 * Imports every Sinalite category (except Business Cards, handled separately) as plain
 * gallery templates directly into the REAL remote Turso database — the existing
 * seed-sinalite-*.mjs scripts all target the local better-sqlite3 file, which the deployed
 * app never reads, so none of their imports ever reached production.
 *
 * Run: node --env-file=.env.local ./scripts/import-all-sinalite-turso.mjs
 */
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@libsql/client";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const SINALITE_CLIENT_ID = process.env.SINALITE_CLIENT_ID;
const SINALITE_CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET;
const AUTH_URL = process.env.SINALITE_AUTH_URL || "https://api.sinaliteuppy.com/auth/token";
const API_URL = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
const AUDIENCE = process.env.SINALITE_AUDIENCE || "https://apiconnect.sinalite.com";

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN. Run with: node --env-file=.env.local ./scripts/import-all-sinalite-turso.mjs");
  process.exit(1);
}

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

// Mirrors lib/data.ts's LEGACY_SUBPRODUCT_SLUGS + seed-sinalite-remaining-categories.mjs's
// CATEGORY_OVERRIDES + the per-category script PRODUCT_SLUG constants — so every row we
// insert lands under the exact same product_slug the admin UI's subProductSlug() resolves
// to for that category label, and duplicate dash-variant category names merge correctly.
const SLUG_OVERRIDES = {
  "Flyers": "bold-flyers",
  "Postcards": "promotional-postcards",
  "Vinyl Banners": "sinalite-vinyl-banners",
  "Coroplast Signs & Yard Signs": "yard-signs",
  "Coroplast Signs & Yard Signs-": "yard-signs",
  "Roll Labels / Stickers": "stickers-and-labels",
  "Pull Up Banners-": "pull-up-banners",
  "Covid-19-Decals-": "covid-19-decals",
  "Covid-19-Decals": "covid-19-decals",
};

function slugifyLabel(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function placeholderImage(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
    <rect width="460" height="270" fill="#eef0f3"/>
    <rect x="16" y="16" width="428" height="238" fill="none" stroke="#c7ccd4" stroke-width="2"/>
    <text x="230" y="145" font-family="Arial, sans-serif" font-size="18" fill="#5b6270" text-anchor="middle">${name.replace(/[<&>]/g, "")}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function uid() { return "sn" + crypto.randomBytes(6).toString("hex"); }

async function getToken() {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SINALITE_CLIENT_ID, client_secret: SINALITE_CLIENT_SECRET, audience: AUDIENCE, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Sinalite auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function main() {
  console.log("Fetching Sinalite token...");
  const token = await getToken();
  console.log("Fetching Sinalite product catalog...");
  const res = await fetch(`${API_URL}/product`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Sinalite product fetch failed: ${res.status} ${await res.text()}`);
  const products = (await res.json()).filter((p) => p.enabled === 1);

  const byCategory = new Map();
  for (const p of products) {
    if (p.category === "Business Cards") continue; // handled by seed-sinalite-business-cards.mjs / already imported
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  }

  console.log(`Processing ${byCategory.size} categories...\n`);

  let totalCreated = 0, totalSkipped = 0;
  for (const [category, items] of byCategory) {
    const slug = SLUG_OVERRIDES[category] ?? slugifyLabel(category);

    const existing = await client.execute({
      sql: "SELECT sinalite_id FROM gallery_templates WHERE product_slug = ? AND sinalite_id IS NOT NULL",
      args: [slug],
    });
    const existingIds = new Set(existing.rows.map((r) => String(r.sinalite_id)));

    let created = 0, skipped = 0;
    const base = Date.now();
    for (let idx = 0; idx < items.length; idx++) {
      const p = items[idx];
      const sinaliteId = String(p.id);
      if (existingIds.has(sinaliteId)) { skipped++; continue; }
      const name = p.name.trim();
      const createdAt = new Date(base + (items.length - idx) * 1000).toISOString();
      await client.execute({
        sql: `INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, visible, sinalite_id, sinalite_sku)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [uid(), slug, name, placeholderImage(name), createdAt, sinaliteId, p.sku ?? null],
      });
      created++;
    }
    totalCreated += created; totalSkipped += skipped;
    console.log(`${category.padEnd(35)} -> slug "${slug}": created ${created}, skipped (already linked) ${skipped}`);
  }

  console.log(`\nDone. Total created: ${totalCreated}, total skipped: ${totalSkipped}`);
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
