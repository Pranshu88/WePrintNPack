import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __wpDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (globalThis.__wpDb) return globalThis.__wpDb;

  const db = new Database(path.join(DATA_DIR, "webprint.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_templates (
      id            TEXT PRIMARY KEY,
      product_slug  TEXT NOT NULL,
      name          TEXT NOT NULL,
      preview_image TEXT NOT NULL,
      created_at    TEXT NOT NULL
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
  `);

  globalThis.__wpDb = db;
  return db;
}

export default getDb;
