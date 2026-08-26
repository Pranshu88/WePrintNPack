import { createClient } from "@libsql/client";

const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// Slugs already handled by scripts/seed-existing-siblings.mjs — skip them here.
const ALREADY_HANDLED_SLUGS = new Set([
  "bold-flyers", "large-format-posters", "premium-business-cards",
  "pull-up-banners", "square-cut-labels-stickers", "stickers-and-labels",
]);

const r = await c.execute(
  `SELECT g.id, g.product_slug FROM gallery_templates g
   WHERE visible = 1
     AND (SELECT COUNT(*) FROM designs WHERE gallery_id = g.id) = 0
     AND product_slug NOT IN ('mens-embroidered-dress-shirts','womens-embroidered-dress-shirts')
   ORDER BY product_slug, created_at ASC`
);

const targets = r.rows.filter((row) => !ALREADY_HANDLED_SLUGS.has(row.product_slug));
console.log(`Seeding ${targets.length} remaining zero-design galleries via the app's live seed-designs API...`);

let ok = 0, failed = 0;
for (const t of targets) {
  const url = `https://weprintnpack.ca/api/products/${t.product_slug}/templates/${t.id}/seed-designs`;
  try {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { console.log(`FAIL ${t.product_slug} ${t.id}: ${data.error}`); failed++; continue; }
    console.log(`${t.product_slug} ${t.id}: +${data.added}`);
    ok++;
  } catch (e) {
    console.log(`ERROR ${t.product_slug} ${t.id}: ${e.message}`);
    failed++;
  }
}
console.log(`Done. ok=${ok} failed=${failed}`);
