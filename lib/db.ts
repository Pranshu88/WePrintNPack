import { createClient, type Client } from "@libsql/client";
import crypto from "crypto";
import path from "path";
import fs from "fs";

let _client: Client | null = null;
let _initialized = false;
let _initPromise: Promise<void> | null = null;

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL
    ?? `file:${path.join(process.cwd(), "data", "webprint.db")}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  // Ensure local data dir exists for file-based SQLite
  if (url.startsWith("file:")) {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  return createClient({ url, authToken });
}

async function initializeDb(client: Client): Promise<void> {
  // Create tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS gallery_templates (
      id            TEXT PRIMARY KEY,
      product_slug  TEXT NOT NULL,
      name          TEXT NOT NULL,
      preview_image TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      price         TEXT,
      specs_json    TEXT,
      sinalite_id   TEXT,
      sinalite_sku  TEXT
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

    CREATE TABLE IF NOT EXISTS customers (
      id            TEXT PRIMARY KEY,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone         TEXT DEFAULT '',
      address       TEXT DEFAULT '',
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id            TEXT PRIMARY KEY,
      customer_id   TEXT NOT NULL,
      house_no      TEXT DEFAULT '',
      flat          TEXT DEFAULT '',
      city          TEXT DEFAULT '',
      state         TEXT DEFAULT '',
      postal_code   TEXT DEFAULT '',
      country       TEXT DEFAULT '',
      phone         TEXT DEFAULT '',
      created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ca_customer ON customer_addresses(customer_id);

    CREATE TABLE IF NOT EXISTS orders (
      id                TEXT PRIMARY KEY,
      stripe_session_id TEXT UNIQUE,
      customer_id       TEXT,
      customer_name     TEXT NOT NULL,
      customer_email    TEXT NOT NULL,
      address           TEXT NOT NULL,
      items_json        TEXT NOT NULL,
      amount_total      REAL NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending',
      production_status TEXT NOT NULL DEFAULT 'pending',
      created_at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id             TEXT PRIMARY KEY,
      order_id       TEXT NOT NULL,
      customer_id    TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_name  TEXT NOT NULL,
      product_name   TEXT NOT NULL,
      stars          INTEGER NOT NULL,
      comment        TEXT NOT NULL DEFAULT '',
      approved       INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_email ON reviews(customer_email);
    CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);

    CREATE TABLE IF NOT EXISTS password_resets (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      token      TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used       INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS applied_fixes (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS products (
      slug            TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      category        TEXT NOT NULL,
      category_name   TEXT NOT NULL,
      image           TEXT NOT NULL,
      description     TEXT NOT NULL,
      starting_price  TEXT NOT NULL,
      colors_json     TEXT,
      color_variants_json TEXT,
      sub_products_json   TEXT,
      specs_json      TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );
  `);

  // Migrations — add columns if missing
  try {
    await client.execute("ALTER TABLE orders ADD COLUMN production_status TEXT NOT NULL DEFAULT 'pending'");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN price TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN specs_json TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN visible INTEGER NOT NULL DEFAULT 1");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN description TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN sinalite_id TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN sinalite_sku TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN sinalite_options_json TEXT");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE orders ADD COLUMN shipping_json TEXT DEFAULT ''");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE orders ADD COLUMN sinalite_order_ref TEXT DEFAULT ''");
  } catch { /* already exists */ }
  try {
    await client.execute("ALTER TABLE gallery_templates ADD COLUMN images_json TEXT");
  } catch { /* already exists */ }

  // One-time data fixes — each runs at most once per database, tracked via applied_fixes.
  const hideStrayFixId = "hide-stray-seed-business-card-templates-2026-07";
  const hideStrayApplied = await client.execute({ sql: "SELECT 1 FROM applied_fixes WHERE id = ?", args: [hideStrayFixId] });
  if (hideStrayApplied.rows.length === 0) {
    await client.execute({
      sql: `UPDATE gallery_templates SET visible = 0 WHERE product_slug = 'premium-business-cards' AND name IN (
        'Corporate Business Cards','Restaurant & Food Business Cards','Healthcare & Medical Business Cards',
        'Real Estate Business Cards','Law & Legal Business Cards','Beauty & Salon Business Cards',
        'Technology & Startup Business Cards','Creative & Design Business Cards','Finance & Accounting Business Cards',
        'Fitness & Sports Business Cards','Education & Consulting Business Cards'
      )`,
      args: [],
    });
    await client.execute({ sql: "INSERT OR IGNORE INTO applied_fixes (id) VALUES (?)", args: [hideStrayFixId] });
  }

  const deleteStrayFixId = "delete-stray-seed-business-card-templates-2026-07";
  const deleteStrayApplied = await client.execute({ sql: "SELECT 1 FROM applied_fixes WHERE id = ?", args: [deleteStrayFixId] });
  if (deleteStrayApplied.rows.length === 0) {
    const strayNamesClause = `product_slug = 'premium-business-cards' AND name IN (
      'Corporate Business Cards','Restaurant & Food Business Cards','Healthcare & Medical Business Cards',
      'Real Estate Business Cards','Law & Legal Business Cards','Beauty & Salon Business Cards',
      'Technology & Startup Business Cards','Creative & Design Business Cards','Finance & Accounting Business Cards',
      'Fitness & Sports Business Cards','Education & Consulting Business Cards'
    )`;
    // SQLite foreign keys aren't enforced here, so ON DELETE CASCADE won't fire — delete
    // child rows (design_colors, designs) before the gallery_templates rows themselves.
    await client.execute({
      sql: `DELETE FROM design_colors WHERE design_id IN (
        SELECT id FROM designs WHERE gallery_id IN (
          SELECT id FROM gallery_templates WHERE ${strayNamesClause}
        )
      )`,
      args: [],
    });
    await client.execute({
      sql: `DELETE FROM designs WHERE gallery_id IN (
        SELECT id FROM gallery_templates WHERE ${strayNamesClause}
      )`,
      args: [],
    });
    await client.execute({ sql: `DELETE FROM gallery_templates WHERE ${strayNamesClause}`, args: [] });
    await client.execute({ sql: "INSERT OR IGNORE INTO applied_fixes (id) VALUES (?)", args: [deleteStrayFixId] });
  }

  // Seed default admin
  const adminHash = crypto.createHash("sha256").update("Admin@86301" + "webprint-salt-2024").digest("hex");
  await client.execute({
    sql: "INSERT OR IGNORE INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), "info@weprintnpack.ca", adminHash, new Date().toISOString()],
  });
}

export async function getDb(): Promise<Client> {
  if (!_client) _client = createDbClient();
  if (!_initialized) {
    if (!_initPromise) _initPromise = initializeDb(_client).then(() => { _initialized = true; });
    await _initPromise;
  }
  return _client;
}

export default getDb;
