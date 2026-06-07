import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import path from "path";

const NEW_URL = "libsql://webprint-ca-piyanshuvashisth.aws-us-east-1.turso.io";
const NEW_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODAzMDMwNDIsImlkIjoiMDE5ZTgyNTQtN2EwMS03ODRlLWJhNjYtM2ZmYTU0ZTBmN2E3IiwicmlkIjoiZjZkMjY2MTgtMDczZS00MDU3LTliZTItMjQxZmMxNDRlZjExIn0.oI0jF1gaLzrrD0Q9-d_UKnGUeIAj-BcWG_cfMRsn7sA23UKZ4SKtr37Qjbze4fyDeqPRfn31h9KxE32V2qYCBQ";
const LOCAL_DB = "/Users/apple/Documents/WebPrint/data/webprint.db";

const turso = createClient({ url: NEW_URL, authToken: NEW_TOKEN });
const local = new Database(LOCAL_DB, { readonly: true });

async function migrate() {
  console.log("Migrating to US East (Canada-optimized)...\n");

  await turso.executeMultiple(`
    CREATE TABLE IF NOT EXISTS gallery_templates (id TEXT PRIMARY KEY, product_slug TEXT NOT NULL, name TEXT NOT NULL, preview_image TEXT NOT NULL, created_at TEXT NOT NULL, price TEXT, specs_json TEXT);
    CREATE INDEX IF NOT EXISTS idx_gt_slug_date ON gallery_templates(product_slug, created_at DESC);
    CREATE TABLE IF NOT EXISTS designs (id TEXT PRIMARY KEY, gallery_id TEXT NOT NULL REFERENCES gallery_templates(id) ON DELETE CASCADE, name TEXT NOT NULL, color_hex TEXT, color_name TEXT, front_image TEXT NOT NULL, front_overlay TEXT, back_image TEXT, back_overlay TEXT, front_admin_items TEXT, back_admin_items TEXT, front_bg_color TEXT, back_bg_color TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_designs_gid ON designs(gallery_id);
    CREATE TABLE IF NOT EXISTS design_colors (id TEXT PRIMARY KEY, design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE, color_hex TEXT NOT NULL, color_name TEXT NOT NULL, front_image TEXT NOT NULL, front_overlay TEXT, back_image TEXT, back_overlay TEXT, front_admin_items TEXT, back_admin_items TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_dc_did ON design_colors(design_id);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, phone TEXT DEFAULT '', address TEXT DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, stripe_session_id TEXT UNIQUE, customer_id TEXT, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, address TEXT NOT NULL, items_json TEXT NOT NULL, amount_total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', production_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS password_resets (id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  console.log("Tables created.");

  const tables = [
    { name: "gallery_templates", cols: ["id","product_slug","name","preview_image","created_at","price","specs_json"] },
    { name: "designs", cols: ["id","gallery_id","name","color_hex","color_name","front_image","front_overlay","back_image","back_overlay","front_admin_items","back_admin_items","front_bg_color","back_bg_color","created_at"] },
    { name: "design_colors", cols: ["id","design_id","color_hex","color_name","front_image","front_overlay","back_image","back_overlay","front_admin_items","back_admin_items","created_at"] },
    { name: "customers", cols: ["id","first_name","last_name","email","password_hash","phone","address","created_at"] },
    { name: "orders", cols: ["id","stripe_session_id","customer_id","customer_name","customer_email","address","items_json","amount_total","status","production_status","created_at"] },
    { name: "password_resets", cols: ["id","email","token","expires_at","used"] },
    { name: "admin_users", cols: ["id","email","password_hash","created_at"] },
  ];

  for (const { name, cols } of tables) {
    const rows = local.prepare(`SELECT * FROM ${name}`).all();
    if (!rows.length) { console.log(`${name}: 0 rows, skip.`); continue; }
    const sql = `INSERT OR IGNORE INTO ${name} (${cols.join(", ")}) VALUES (${cols.map(()=>"?").join(", ")})`;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      await turso.batch(chunk.map(r => ({ sql, args: cols.map(c => r[c] ?? null) })), "write");
    }
    console.log(`${name}: ${rows.length} rows migrated.`);
  }

  console.log("\nDone! US East DB ready.");
  turso.close(); local.close();
}

migrate().catch(e => { console.error(e); process.exit(1); });
