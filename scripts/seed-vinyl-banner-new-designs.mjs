/**
 * Seed script — Vinyl Banner gallery new designs (10 designs)
 * viewBox: 600×300 (2:1) to match BANNER_VINYL_DIMS canvas (950×475 = 2:1)
 * Run: node scripts/seed-vinyl-banner-new-designs.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const db = new Database(path.join(ROOT, "data", "webprint.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

let _c = 0;
function uid() { return `vb${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

const GALLERY_ID = "bn0001mpmc48n5"; // Vinyl Banner gallery

// Photo placeholder — data-placeholder="photo" makes the editor render its own
// interactive "Upload your photo / click to open from pc" UI (same as Prime Flyers)
function imgPH(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db" data-placeholder="photo"/>`;
}

const G = ``;

// ── 1. Arrow Headline ─────────────────────────────────────────────────────────
function designArrowHeadline() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#ffffff"/>
<rect y="238" width="600" height="62" fill="#4a7fa5"/>
<polygon points="220,24 220,220 64,122" fill="#c0392b"/>
<polygon points="220,122 220,220 64,122" fill="#7b1e1e" opacity="0.28"/>
<text x="410" y="124" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#2b6cb0">HEADLINE</text>
<text x="410" y="210" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#c0392b">HEADLINE</text>
<text x="24" y="277" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text>
<text x="388" y="277" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>
${G}
</svg>`);
}

// ── 2. Patriotic ─────────────────────────────────────────────────────────────
function designPatriotic() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="120" fill="#dc2626"/>
<rect y="120" width="600" height="108" fill="#ffffff"/>
<rect y="228" width="600" height="72" fill="#1d4ed8"/>
<text x="300" y="204" text-anchor="middle" font-size="84" font-family="Georgia,serif" font-weight="bold"
  fill="none" stroke="#1d4ed8" stroke-width="3" stroke-linejoin="round">HEADLINE</text>
<text x="300" y="204" text-anchor="middle" font-size="84" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">HEADLINE</text>
<text x="150" y="271" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text>
<text x="450" y="271" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>
${G}
</svg>`);
}

// ── 3. Sale Orange ────────────────────────────────────────────────────────────
function designSaleOrange() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#e04e2c"/>
<ellipse cx="140" cy="150" rx="130" ry="130" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="28"/>
<ellipse cx="140" cy="150" rx="188" ry="188" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="26"/>
<ellipse cx="140" cy="150" rx="246" ry="246" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="24"/>
<ellipse cx="460" cy="150" rx="130" ry="130" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="28"/>
<ellipse cx="460" cy="150" rx="188" ry="188" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="26"/>
<ellipse cx="460" cy="150" rx="246" ry="246" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="24"/>
<rect y="228" width="600" height="72" fill="#111111"/>
<text x="300" y="178" text-anchor="middle" font-size="130" font-family="Georgia,serif" font-weight="bold" fill="white">SALE</text>
<text x="300" y="218" text-anchor="middle" font-size="24" font-family="Georgia,serif" fill="rgba(255,255,255,0.82)" font-style="italic">your text here</text>
<text x="300" y="276" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>
${G}
</svg>`);
}

// ── 4. Dark Monogram ──────────────────────────────────────────────────────────
function designDarkMonogram() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#0f0f0f"/>
<text x="300" y="165" text-anchor="middle" font-size="136" font-family="Georgia,serif" font-weight="bold" fill="white">H</text>
<text x="300" y="224" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="5">COMPANY NAME</text>
<text x="300" y="264" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Phone / Other</text>
${G}
</svg>`);
}

// ── 5. Sale Blue ──────────────────────────────────────────────────────────────
function designSaleBlue() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#3aade0"/>
<text x="300" y="148" text-anchor="middle" font-size="122" font-family="Arial,sans-serif" font-weight="bold" fill="white">Sale</text>
<text x="300" y="188" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.88)">Date</text>
<line x1="80" y1="215" x2="520" y2="215" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="5,6"/>
<text x="300" y="243" text-anchor="middle" font-size="19" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">Special Offer</text>
<text x="300" y="276" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text>
${G}
</svg>`);
}

// ── 6. Logo Clean ─────────────────────────────────────────────────────────────
function designLogoClean() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#ffffff"/>
${imgPH(248, 16, 104, 130, "Your Logo Here", "click to open from pc")}
<text x="300" y="188" text-anchor="middle" font-size="28" font-family="Georgia,serif" fill="#2b6cb0" font-weight="bold">Company Name</text>
<text x="300" y="258" text-anchor="middle" font-size="50" font-family="Arial,sans-serif" fill="#111827" font-weight="bold">Phone / Other</text>
${G}
</svg>`);
}

// ── 7. Photo Banner (blue angular chevron corners) ────────────────────────────
function designPhotoBanner() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#f0f4f8"/>
<polygon points="0,300 0,218 110,300" fill="#3b82f6" opacity="0.78"/>
<polygon points="600,300 600,218 490,300" fill="#3b82f6" opacity="0.78"/>
${imgPH(206, 12, 188, 138, "Your Photo or Logo Here", "click to open from pc")}
<text x="300" y="182" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#2563eb">Company Name</text>
<text x="300" y="210" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#94a3b8">Company Message</text>
<text x="300" y="252" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#2563eb">Phone / Other</text>
<text x="300" y="281" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="#94a3b8">Web / Other</text>
${G}
</svg>`);
}

// ── 8. Event Microphone ───────────────────────────────────────────────────────
function designEventMicrophone() {
  const lines = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI * 2) / 16;
    const x1 = (185 + Math.cos(a) * 40).toFixed(1), y1 = (150 + Math.sin(a) * 40).toFixed(1);
    const x2 = (185 + Math.cos(a) * 290).toFixed(1), y2 = (150 + Math.sin(a) * 290).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.18)" stroke-width="10"/>`;
  }).join("\n");
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#f59e0b"/>
${lines}
<rect x="156" y="46" width="58" height="120" rx="29" fill="#3a3a3a"/>
<rect x="162" y="52" width="46" height="108" rx="23" fill="#555"/>
<line x1="163" y1="76" x2="207" y2="76" stroke="#2a2a2a" stroke-width="2"/>
<line x1="163" y1="92" x2="207" y2="92" stroke="#2a2a2a" stroke-width="2"/>
<line x1="163" y1="108" x2="207" y2="108" stroke="#2a2a2a" stroke-width="2"/>
<line x1="163" y1="124" x2="207" y2="124" stroke="#2a2a2a" stroke-width="2"/>
<line x1="164" y1="140" x2="206" y2="140" stroke="#2a2a2a" stroke-width="2"/>
<rect x="166" y="56" width="14" height="38" rx="7" fill="rgba(255,255,255,0.14)"/>
<line x1="185" y1="166" x2="185" y2="234" stroke="#c8a000" stroke-width="7"/>
<line x1="148" y1="234" x2="222" y2="234" stroke="#c8a000" stroke-width="7"/>
<rect x="314" y="68" width="258" height="166" rx="4" fill="#78350f"/>
<polygon points="314,68 314,84 302,76" fill="#4e2108"/>
<polygon points="314,234 314,218 302,226" fill="#4e2108"/>
<polygon points="572,68 572,84 584,76" fill="#4e2108"/>
<polygon points="572,234 572,218 584,226" fill="#4e2108"/>
<line x1="324" y1="106" x2="562" y2="106" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<line x1="324" y1="200" x2="562" y2="200" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<text x="443" y="100" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="2">COMPANY NAME</text>
<text x="443" y="163" text-anchor="middle" font-size="38" font-family="Georgia,serif" font-weight="bold" fill="#f59e0b" letter-spacing="1">EVENT NAME</text>
<text x="443" y="224" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="2">DATE</text>
${G}
</svg>`);
}

// ── 9. Autumn Leaves ─────────────────────────────────────────────────────────
function designAutumnLeaves() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#4a1c0a"/>
<radialGradient id="rg9" cx="50%" cy="50%" r="70%">
<stop offset="0%" stop-color="#6b2c12" stop-opacity="0.45"/>
<stop offset="100%" stop-color="#2a0c02" stop-opacity="0.5"/>
</radialGradient>
<rect width="600" height="300" fill="url(#rg9)"/>
<g transform="translate(70,75) rotate(-20)">
<path d="M0,-56 C-7,-38 -26,-32 -36,-23 C-28,-17 -30,-8 -30,0 C-21,-6 -14,-3 -10,4 C-26,10 -30,20 -26,28 C-17,20 -9,23 -6,32 C0,20 6,32 14,32 C11,23 17,20 26,28 C30,20 26,10 10,4 C14,-3 21,-6 30,0 C30,-8 28,-17 36,-23 C26,-32 7,-38 0,-56Z" fill="#d14b6a" transform="scale(1.5)"/>
</g>
<g transform="translate(138,124) rotate(18)">
<path d="M0,-56 C-7,-38 -26,-32 -36,-23 C-28,-17 -30,-8 -30,0 C-21,-6 -14,-3 -10,4 C-26,10 -30,20 -26,28 C-17,20 -9,23 -6,32 C0,20 6,32 14,32 C11,23 17,20 26,28 C30,20 26,10 10,4 C14,-3 21,-6 30,0 C30,-8 28,-17 36,-23 C26,-32 7,-38 0,-56Z" fill="#b83a27" transform="scale(1.05)"/>
</g>
<rect y="225" width="600" height="75" fill="#d4900a"/>
<text x="360" y="180" text-anchor="middle" font-size="38" font-family="Georgia,serif" font-weight="bold" fill="#d4900a" letter-spacing="3">COMPANY NAME</text>
<text x="300" y="276" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" font-weight="bold" fill="#4a1c0a">Phone / Other</text>
${G}
</svg>`);
}

// ── 10. Kids Party Sky ────────────────────────────────────────────────────────
function designKidsParty() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#93c5fd"/>
<ellipse cx="72" cy="60" rx="60" ry="28" fill="white" opacity="0.8"/>
<ellipse cx="108" cy="48" rx="44" ry="22" fill="white" opacity="0.7"/>
<ellipse cx="46" cy="68" rx="36" ry="18" fill="white" opacity="0.65"/>
<ellipse cx="502" cy="68" rx="58" ry="28" fill="white" opacity="0.75"/>
<ellipse cx="538" cy="54" rx="42" ry="22" fill="white" opacity="0.65"/>
<ellipse cx="185" cy="262" rx="46" ry="18" fill="white" opacity="0.45"/>
<ellipse cx="400" cy="274" rx="42" ry="15" fill="white" opacity="0.38"/>
<ellipse cx="530" cy="132" rx="34" ry="44" fill="#fbbf24"/>
<ellipse cx="520" cy="116" rx="11" ry="14" fill="rgba(255,255,255,0.28)"/>
<line x1="530" y1="176" x2="522" y2="218" stroke="#b7860a" stroke-width="2"/>
<text x="268" y="150" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">YOUR TEXT</text>
<text x="268" y="218" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">YOUR TEXT</text>
<line x1="28" y1="258" x2="155" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-dasharray="4,4"/>
<text x="268" y="263" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.92)" letter-spacing="2">WEB / OTHER</text>
<line x1="382" y1="258" x2="510" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-dasharray="4,4"/>
${G}
</svg>`);
}

const DESIGNS = [
  { name: "Arrow Headline",   fn: designArrowHeadline },
  { name: "Patriotic",        fn: designPatriotic },
  { name: "Sale Orange",      fn: designSaleOrange },
  { name: "Dark Monogram",    fn: designDarkMonogram },
  { name: "Sale Blue",        fn: designSaleBlue },
  { name: "Photo Banner",     fn: designPhotoBanner },
  { name: "Kids Party",       fn: designKidsParty },
];

const stmtInsertDesign = db.prepare(`
  INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, front_bg_color, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const run = db.transaction(() => {
  const deleted = db.prepare("DELETE FROM designs WHERE gallery_id = ?").run(GALLERY_ID).changes;
  console.log(`Cleared ${deleted} existing design(s)\n`);

  const now = new Date().toISOString();
  for (const d of DESIGNS) {
    const img = d.fn();
    stmtInsertDesign.run(uid(), GALLERY_ID, d.name, null, null, img, null, now);
    console.log(`  ✓  ${d.name}`);
  }

  const preview = DESIGNS[0].fn();
  db.prepare("UPDATE gallery_templates SET preview_image = ? WHERE id = ?").run(preview, GALLERY_ID);
  console.log(`\nGallery preview updated → "${DESIGNS[0].name}"`);
  return DESIGNS.length;
});

const total = run();
console.log(`\nDone — ${total} designs seeded into Vinyl Banner (viewBox 600×300, 2:1).`);
db.close();
