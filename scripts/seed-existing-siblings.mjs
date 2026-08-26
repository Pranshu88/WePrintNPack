import { createClient } from "@libsql/client";

const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const jobs = [
  {
    slug: "bold-flyers",
    source: "snf0001mrxhirjn",
    targets: ["snf0005mrxhirjs","snf0004mrxhirjq","snf0003mrxhirjq","snf0002mrxhirjp","sn485987cf363b","sn4c522b1ad207","sne8c28acc4778","sn6e356403b826","snb34e106c0321"],
  },
  {
    slug: "large-format-posters",
    source: "snlfp0001mrxiutbq",
    targets: ["sne03d4a36ddc6"],
  },
  {
    slug: "premium-business-cards",
    source: "sn0001mrx575ni",
    targets: ["sn0014mrx575nn","sn0013mrx575nn","sn0012mrx575nm","sn0011mrx575nm","sn0010mrx575nm","sn0009mrx575nm","sn0008mrx575nl","sn0007mrx575nl","sn0006mrx575nl","sn0005mrx575nk","sn0004mrx575nk","sn0003mrx575nk","sn417207f876df","sn6724dfe271f2","sne586319cfa7c","snb969aa29a3d4","sn6a19a3737563","sndf6b621415bd","snfbde19daac71","snfa4bb3a4272c","sn6ff4fa9adabb","sn0923128c5a4f","snde297c1ebad5"],
  },
  {
    slug: "pull-up-banners",
    source: "snpub0001mrxk47sm",
    targets: ["snpub0006mrxk47sn","snpub0005mrxk47sn","snpub0004mrxk47sn","snpub0003mrxk47sn","snpub0002mrxk47sn","sn6e4ef44012bc","snd7860ebf149d","sn58ce02e2a1be","sn760c34d242ba","sn6703bd8b88c8","sn58451397a049"],
  },
  {
    slug: "square-cut-labels-stickers",
    source: "snscl0001mrxo7lld",
    targets: ["sn5d2941dd0a4a"],
  },
  {
    slug: "stickers-and-labels",
    source: "snrl0001mrxpdlxm",
    targets: ["snrl0003mrxpdlxo","snrl0002mrxpdlxn","snbf3683c52162","sn4123ee820cf6","sn6bf1dc1f686d"],
  },
];

async function getDesigns(galleryId) {
  const d = await c.execute({ sql: "SELECT * FROM designs WHERE gallery_id = ?", args: [galleryId] });
  return d.rows;
}

function uid() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

async function copyDesigns(sourceId, targetId) {
  const existing = await c.execute({ sql: "SELECT name FROM designs WHERE gallery_id = ?", args: [targetId] });
  const existingNames = new Set(existing.rows.map((r) => r.name));
  const sourceDesigns = await getDesigns(sourceId);
  let added = 0;
  for (const d of sourceDesigns) {
    if (existingNames.has(d.name)) continue;
    await c.execute({
      sql: `INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, front_overlay, back_image, back_overlay, front_admin_items, back_admin_items, front_bg_color, back_bg_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [uid(), targetId, d.name, d.color_hex, d.color_name, d.front_image, d.front_overlay, d.back_image, d.back_overlay, d.front_admin_items, d.back_admin_items, d.front_bg_color, d.back_bg_color, new Date().toISOString()],
    });
    added++;
  }
  return added;
}

for (const job of jobs) {
  console.log(`=== ${job.slug} (source ${job.source}) ===`);
  for (const t of job.targets) {
    const added = await copyDesigns(job.source, t);
    console.log(`  ${t}: +${added}`);
  }
}
console.log("Done.");
