/**
 * Replaces the 3 hand-built "Business Cards" / "Premium Business Cards" /
 * "Luxury Business Cards" gallery templates with the first 3 Sinalite
 * "Business Cards" category products (in Sinalite API array order), renamed
 * to those exact 3 names so they keep using the existing Seed Designs sets
 * (BUSINESS_CARDS_SEED / PREMIUM_BC_SEED / LUXURY_BC_SEED).
 *
 * Run: node ./scripts/replace-bc-templates-with-sinalite.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");

const PRODUCT_SLUG = "premium-business-cards";
// arr[0], arr[1], arr[2] — the first 3 Sinalite "Business Cards" category products, by Sinalite product id.
const TARGET_NAMES_BY_SINALITE_ID = { "1": "Business Cards", "2": "Premium Business Cards", "7": "Luxury Business Cards" };
const OLD_NAMES = ["Business Cards", "Premium Business Cards", "Luxury Business Cards"];

function placeholderImage(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
    <rect width="460" height="270" fill="#eef0f3"/>
    <rect x="16" y="16" width="428" height="238" fill="none" stroke="#c7ccd4" stroke-width="2"/>
    <text x="230" y="145" font-family="Arial, sans-serif" font-size="20" fill="#5b6270" text-anchor="middle">${name.replace(/[<&>]/g, "")}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const db = new Database(path.join(DATA_DIR, "webprint.db"));
db.pragma("journal_mode = WAL");

const oldRows = db.prepare(
  `SELECT id, name FROM gallery_templates WHERE product_slug = ? AND name IN (${OLD_NAMES.map(() => "?").join(",")}) AND sinalite_id IS NULL`
).all(PRODUCT_SLUG, ...OLD_NAMES);

const sinaliteRows = db.prepare(
  `SELECT id, name, sinalite_id FROM gallery_templates WHERE product_slug = ? AND sinalite_id IN (${Object.keys(TARGET_NAMES_BY_SINALITE_ID).map(() => "?").join(",")})`
).all(PRODUCT_SLUG, ...Object.keys(TARGET_NAMES_BY_SINALITE_ID));

if (sinaliteRows.length !== 3) {
  console.error(`Expected 3 Sinalite rows (ids ${Object.keys(TARGET_NAMES_BY_SINALITE_ID).join(", ")}), found ${sinaliteRows.length}. Aborting.`);
  process.exit(1);
}

const deleteColors = db.prepare(`DELETE FROM design_colors WHERE design_id IN (SELECT id FROM designs WHERE gallery_id = ?)`);
const deleteDesigns = db.prepare(`DELETE FROM designs WHERE gallery_id = ?`);
const deleteGallery = db.prepare(`DELETE FROM gallery_templates WHERE id = ?`);
const renameGallery = db.prepare(`UPDATE gallery_templates SET name = ?, preview_image = ? WHERE id = ?`);

const tx = db.transaction(() => {
  for (const row of oldRows) {
    deleteColors.run(row.id);
    deleteDesigns.run(row.id);
    deleteGallery.run(row.id);
    console.log(`Deleted old template "${row.name}" (${row.id})`);
  }
  for (const row of sinaliteRows) {
    const newName = TARGET_NAMES_BY_SINALITE_ID[row.sinalite_id];
    renameGallery.run(newName, placeholderImage(newName), row.id);
    console.log(`Renamed Sinalite product "${row.name}" (sinalite id ${row.sinalite_id}) -> "${newName}"`);
  }
});

tx();
db.close();
console.log("Done.");
