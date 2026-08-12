// One-off: copy gallery_templates/designs/design_colors rows that exist only in the local
// SQLite dev DB (data/webprint.db) into the shared Turso DB, without touching rows that
// already exist there (INSERT OR IGNORE keyed on primary key).
import { createClient } from "@libsql/client";
import path from "path";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set in environment.");
  process.exit(1);
}

const local = createClient({ url: `file:${path.join(process.cwd(), "data", "webprint.db")}` });
const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const TABLES = [
  { name: "gallery_templates", cols: ["id","product_slug","name","preview_image","created_at","price","specs_json","sinalite_id","sinalite_sku","visible","description","sinalite_options_json","images_json"] },
  { name: "designs", cols: ["id","gallery_id","name","color_hex","color_name","front_image","front_overlay","back_image","back_overlay","front_admin_items","back_admin_items","front_bg_color","back_bg_color","created_at"] },
  { name: "design_colors", cols: ["id","design_id","color_hex","color_name","front_image","front_overlay","back_image","back_overlay","front_admin_items","back_admin_items","created_at"] },
];

async function tableColumns(client, table) {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return new Set(res.rows.map((r) => r.name));
}

async function migrateTable({ name, cols }) {
  const localCols = await tableColumns(local, name);
  const remoteCols = await tableColumns(remote, name);
  const usable = cols.filter((c) => localCols.has(c) && remoteCols.has(c));

  const { rows } = await local.execute(`SELECT ${usable.join(", ")} FROM ${name}`);
  let copied = 0;
  for (const row of rows) {
    const placeholders = usable.map(() => "?").join(", ");
    const args = usable.map((c) => row[c]);
    await remote.execute({
      sql: `INSERT OR IGNORE INTO ${name} (${usable.join(", ")}) VALUES (${placeholders})`,
      args,
    });
    copied++;
  }
  console.log(`${name}: scanned ${rows.length} local rows`);
}

for (const t of TABLES) {
  await migrateTable(t);
}
console.log("Done.");
