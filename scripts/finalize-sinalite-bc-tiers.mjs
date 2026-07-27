/**
 * Finalizes the 3 Sinalite-backed BC tier rows (sinalite ids 1, 2, 7):
 * - restores their `name` to the real Sinalite product name (shown in admin)
 * - sets `price`/`specs` to match the original Business/Premium/Luxury copy,
 *   so pricing stays identical everywhere that reads gallery.price/specs directly.
 *
 * Run: node ./scripts/finalize-sinalite-bc-tiers.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");

const PRODUCT_SLUG = "premium-business-cards";

const TIERS = {
  "1": {
    name: "Business cards 14pt (Profit Maximizer)",
    price: "$79 + tax",
    specs: ['Size: 3.5" x 2"', 'Print-ready file size with bleed: 3.75" x 2.25"', "Stock: 14pt Matte or Gloss", "Full colour", "Double-sided included", "Free basic design included"],
  },
  "2": {
    name: "Business Cards 14pt + AQ",
    price: "$119 + tax",
    specs: ["16pt Matte/Silk", "Double-sided", "Premium finish"],
  },
  "7": {
    name: "Business Cards 14pt + UV (High Gloss)",
    price: "From $179 + tax",
    specs: ["Soft Touch / Suede / Spot UV / Raised UV / Painted Edge", "Quote required based on finish"],
  },
};

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

const update = db.prepare(`UPDATE gallery_templates SET name = ?, preview_image = ?, price = ?, specs_json = ? WHERE product_slug = ? AND sinalite_id = ?`);

for (const [sinaliteId, tier] of Object.entries(TIERS)) {
  const res = update.run(tier.name, placeholderImage(tier.name), tier.price, JSON.stringify(tier.specs), PRODUCT_SLUG, sinaliteId);
  console.log(`sinalite id ${sinaliteId}: ${res.changes > 0 ? "updated" : "NOT FOUND"} -> "${tier.name}" (${tier.price})`);
}

db.close();
