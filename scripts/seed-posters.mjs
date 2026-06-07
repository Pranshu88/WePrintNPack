/**
 * Seed script — posters gallery templates
 * Run: node scripts/seed-posters.mjs
 *
 * Creates 2 gallery templates under the "posters" product:
 *   1. Small Posters  — $109 + tax  (11" × 17", portrait)
 *   2. Large Posters  — $139 + tax  (18" × 24", portrait)
 *
 * Re-running CLEARS and RE-INSERTS all templates.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const DATA_DIR  = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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

// ── Helpers ───────────────────────────────────────────────────────────────────
let _c = 0;
function uid() { return `ps${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

// ═══════════════════════════════════════════════════════════════════════════════
//  POSTER LAYOUTS  (viewBox 440 × 660  ≈ 2:3 portrait — matches 11"×17" & 18"×24")
// ═══════════════════════════════════════════════════════════════════════════════

function posterBoldHeader(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<rect width="440" height="200" fill="${p}"/>
<rect y="200" width="440" height="8" fill="${a}"/>
<text x="220" y="80" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="5">COMPANY NAME</text>
<text x="220" y="128" text-anchor="middle" font-size="36" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="1">YOUR</text>
<text x="220" y="172" text-anchor="middle" font-size="36" font-family="Georgia,serif" font-weight="bold" fill="${a}" letter-spacing="1">HEADLINE</text>
<text x="220" y="260" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="${p}" font-weight="bold">Sub-heading Here</text>
<line x1="60" y1="280" x2="380" y2="280" stroke="${a}" stroke-width="2"/>
<text x="220" y="320" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151">Your main message or description goes</text>
<text x="220" y="340" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151">here. Keep it brief and impactful for</text>
<text x="220" y="360" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151">best results with your audience.</text>
<line x1="60" y1="390" x2="380" y2="390" stroke="#e5e7eb" stroke-width="1"/>
<text x="220" y="430" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280">Key Point One  ·  Key Point Two</text>
<text x="220" y="452" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280">Key Point Three  ·  Key Point Four</text>
<rect x="120" y="490" width="200" height="44" rx="8" fill="${p}"/>
<text x="220" y="517" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">CALL TO ACTION</text>
<line x1="60" y1="570" x2="380" y2="570" stroke="#e5e7eb" stroke-width="1"/>
<text x="220" y="600" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">www.example.com  ·  +1 234 567 8900  ·  hello@example.com</text>
<text x="220" y="620" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#9ca3af">123 Street Address  ·  City, Province</text>
<rect y="640" width="440" height="20" fill="${p}"/>
</svg>`);
}

function posterFullColor(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="${p}"/>
<polygon points="0,0 280,0 0,320" fill="rgba(255,255,255,0.04)"/>
<polygon points="440,660 160,660 440,340" fill="rgba(0,0,0,0.12)"/>
<line x1="0" y1="50" x2="440" y2="50" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<line x1="0" y1="610" x2="440" y2="610" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<text x="220" y="36" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6">COMPANY NAME  ·  EST. 2010</text>
<text x="220" y="170" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="1">YOUR</text>
<text x="220" y="230" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="${a}">HEADLINE</text>
<line x1="100" y1="260" x2="340" y2="260" stroke="${a}" stroke-width="2" opacity="0.6"/>
<text x="220" y="300" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)" letter-spacing="2">TAGLINE OR SUB-HEADING</text>
<text x="220" y="360" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">Your message goes here. Add key</text>
<text x="220" y="380" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">details that attract your audience.</text>
<rect x="130" y="420" width="180" height="44" rx="8" fill="${a}"/>
<text x="220" y="447" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="${p}" letter-spacing="1">LEARN MORE</text>
<line x1="100" y1="502" x2="340" y2="502" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
<text x="220" y="534" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">www.example.com</text>
<text x="220" y="554" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">+1 234 567 8900  ·  hello@example.com</text>
<text x="220" y="630" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" opacity="0.65">COMPANY NAME</text>
</svg>`);
}

function posterClassicBorder(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<rect x="10" y="10" width="420" height="640" fill="none" stroke="${p}" stroke-width="4"/>
<rect x="18" y="18" width="404" height="624" fill="none" stroke="${a}" stroke-width="1.5"/>
<text x="220" y="62" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<line x1="80" y1="76" x2="360" y2="76" stroke="${p}" stroke-width="2"/>
<text x="220" y="170" text-anchor="middle" font-size="44" font-family="Georgia,serif" font-weight="bold" fill="${p}">YOUR</text>
<text x="220" y="222" text-anchor="middle" font-size="30" font-family="Georgia,serif" fill="#111827" font-weight="bold">HEADLINE HERE</text>
<line x1="80" y1="244" x2="360" y2="244" stroke="${a}" stroke-width="2"/>
<text x="220" y="288" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="#374151">Sub-heading or tagline</text>
<text x="220" y="330" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="#6b7280">Your message body goes here. Describe</text>
<text x="220" y="350" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="#6b7280">the event, offer, or key information</text>
<text x="220" y="370" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="#6b7280">that your audience needs to know.</text>
<line x1="80" y1="400" x2="360" y2="400" stroke="#e5e7eb" stroke-width="1"/>
<text x="220" y="436" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9ca3af">Key Detail 1  ·  Key Detail 2  ·  Key Detail 3</text>
<rect x="130" y="468" width="180" height="40" rx="6" fill="${p}"/>
<text x="220" y="493" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">GET IN TOUCH</text>
<line x1="80" y1="540" x2="360" y2="540" stroke="${p}" stroke-width="2"/>
<text x="220" y="568" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="${p}" font-weight="bold">www.example.com  ·  +1 234 567 8900</text>
<text x="220" y="588" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">hello@example.com  ·  123 Street, City</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LARGE POSTER FRAMES  (9 artistic designs — front only, no back)
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Dark Floral Table Card
function lpFloralTable() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#1e2420"/>
<ellipse cx="72" cy="58" rx="52" ry="13" fill="#2d6040" transform="rotate(-35,72,58)"/>
<ellipse cx="58" cy="42" rx="40" ry="11" fill="#38724e" transform="rotate(-55,58,42)"/>
<ellipse cx="102" cy="52" rx="46" ry="12" fill="#244d35" transform="rotate(-15,102,52)"/>
<ellipse cx="96" cy="78" rx="44" ry="12" fill="#2d6040" transform="rotate(-65,96,78)"/>
<ellipse cx="368" cy="58" rx="52" ry="13" fill="#2d6040" transform="rotate(35,368,58)"/>
<ellipse cx="382" cy="42" rx="40" ry="11" fill="#38724e" transform="rotate(55,382,42)"/>
<ellipse cx="338" cy="52" rx="46" ry="12" fill="#244d35" transform="rotate(15,338,52)"/>
<ellipse cx="344" cy="78" rx="44" ry="12" fill="#2d6040" transform="rotate(65,344,78)"/>
<circle cx="170" cy="116" r="44" fill="#cfc7b8"/><circle cx="170" cy="116" r="37" fill="#ddd6c8"/><circle cx="170" cy="116" r="29" fill="#eae3d6"/><circle cx="173" cy="113" r="20" fill="#e0d9cc"/><circle cx="172" cy="114" r="12" fill="#ccc4b4"/>
<circle cx="270" cy="116" r="44" fill="#cfc7b8"/><circle cx="270" cy="116" r="37" fill="#ddd6c8"/><circle cx="270" cy="116" r="29" fill="#eae3d6"/><circle cx="273" cy="113" r="20" fill="#e0d9cc"/><circle cx="272" cy="114" r="12" fill="#ccc4b4"/>
<circle cx="220" cy="82" r="50" fill="#c8c0b0"/><circle cx="220" cy="82" r="42" fill="#d6cfc0"/><circle cx="220" cy="82" r="33" fill="#e8e1d4"/><circle cx="224" cy="79" r="23" fill="#dcd5c6"/><circle cx="222" cy="81" r="14" fill="#c6bfb0"/>
<circle cx="56" cy="152" r="6" fill="#1a0f08"/><circle cx="68" cy="144" r="5" fill="#1a0f08"/><circle cx="63" cy="162" r="6" fill="#1a0f08"/><circle cx="76" cy="154" r="4" fill="#1a0f08"/>
<circle cx="384" cy="152" r="6" fill="#1a0f08"/><circle cx="372" cy="144" r="5" fill="#1a0f08"/><circle cx="377" cy="162" r="6" fill="#1a0f08"/><circle cx="364" cy="154" r="4" fill="#1a0f08"/>
<ellipse cx="28" cy="228" rx="36" ry="10" fill="#2d6040" transform="rotate(-10,28,228)"/>
<ellipse cx="24" cy="268" rx="30" ry="9" fill="#38724e" transform="rotate(12,24,268)"/>
<ellipse cx="36" cy="308" rx="34" ry="9" fill="#244d35" transform="rotate(-8,36,308)"/>
<ellipse cx="412" cy="228" rx="36" ry="10" fill="#2d6040" transform="rotate(10,412,228)"/>
<ellipse cx="416" cy="268" rx="30" ry="9" fill="#38724e" transform="rotate(-12,416,268)"/>
<ellipse cx="404" cy="308" rx="34" ry="9" fill="#244d35" transform="rotate(8,404,308)"/>
<circle cx="78" cy="568" r="38" fill="#cfc7b8"/><circle cx="78" cy="568" r="31" fill="#ddd6c8"/><circle cx="78" cy="568" r="24" fill="#eae3d6"/><circle cx="81" cy="565" r="16" fill="#e0d9cc"/>
<circle cx="128" cy="600" r="32" fill="#c8c0b0"/><circle cx="128" cy="600" r="26" fill="#d6cfc0"/><circle cx="128" cy="600" r="19" fill="#e8e1d4"/>
<circle cx="36" cy="606" r="26" fill="#cfc7b8"/><circle cx="36" cy="606" r="20" fill="#ddd6c8"/><circle cx="36" cy="606" r="14" fill="#eae3d6"/>
<circle cx="362" cy="568" r="38" fill="#cfc7b8"/><circle cx="362" cy="568" r="31" fill="#ddd6c8"/><circle cx="362" cy="568" r="24" fill="#eae3d6"/><circle cx="365" cy="565" r="16" fill="#e0d9cc"/>
<circle cx="312" cy="600" r="32" fill="#c8c0b0"/><circle cx="312" cy="600" r="26" fill="#d6cfc0"/><circle cx="312" cy="600" r="19" fill="#e8e1d4"/>
<circle cx="404" cy="606" r="26" fill="#cfc7b8"/><circle cx="404" cy="606" r="20" fill="#ddd6c8"/><circle cx="404" cy="606" r="14" fill="#eae3d6"/>
<ellipse cx="158" cy="648" rx="55" ry="14" fill="#2d6040" transform="rotate(-28,158,648)"/>
<ellipse cx="282" cy="648" rx="55" ry="14" fill="#2d6040" transform="rotate(28,282,648)"/>
<ellipse cx="220" cy="652" rx="44" ry="12" fill="#38724e"/>
<text x="220" y="308" text-anchor="middle" font-size="26" font-family="Georgia,serif" font-style="italic" fill="#c4aa8c">table no.</text>
<text x="220" y="418" text-anchor="middle" font-size="108" font-family="Georgia,serif" font-weight="bold" fill="#c08060">20</text>
<line x1="110" y1="445" x2="330" y2="445" stroke="#666" stroke-width="0.7" opacity="0.4"/>
<text x="220" y="490" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-style="italic" fill="#c4baa8">Victoria &amp; Roberto</text>
</svg>`);
}

// 2. Music Festival
function lpMusicFestival() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<defs>
  <linearGradient id="mfg" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#3d1ba8"/>
    <stop offset="45%" stop-color="#7b1ea2"/>
    <stop offset="72%" stop-color="#ad1457"/>
    <stop offset="100%" stop-color="#c62828"/>
  </linearGradient>
</defs>
<rect width="440" height="660" fill="url(#mfg)"/>
<rect x="50" y="102" width="60" height="60" fill="none" stroke="rgba(212,175,55,0.75)" stroke-width="1.5"/>
<rect x="60" y="112" width="40" height="40" fill="none" stroke="rgba(212,175,55,0.4)" stroke-width="1"/>
<rect x="295" y="88" width="75" height="75" fill="none" stroke="rgba(212,175,55,0.75)" stroke-width="1.5"/>
<rect x="305" y="98" width="55" height="55" fill="none" stroke="rgba(212,175,55,0.4)" stroke-width="1"/>
<rect x="24" y="285" width="92" height="92" fill="none" stroke="rgba(212,175,55,0.5)" stroke-width="1.5"/>
<rect x="316" y="408" width="82" height="82" fill="none" stroke="rgba(212,175,55,0.5)" stroke-width="1.5"/>
<circle cx="338" cy="318" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="350" cy="318" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="362" cy="318" r="2.5" fill="rgba(255,255,255,0.55)"/>
<circle cx="338" cy="330" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="350" cy="330" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="362" cy="330" r="2.5" fill="rgba(255,255,255,0.55)"/>
<circle cx="338" cy="342" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="350" cy="342" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="362" cy="342" r="2.5" fill="rgba(255,255,255,0.55)"/>
<circle cx="68" cy="408" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="80" cy="408" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="92" cy="408" r="2.5" fill="rgba(255,255,255,0.55)"/>
<circle cx="68" cy="420" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="80" cy="420" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="92" cy="420" r="2.5" fill="rgba(255,255,255,0.55)"/>
<circle cx="68" cy="432" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="80" cy="432" r="2.5" fill="rgba(255,255,255,0.55)"/><circle cx="92" cy="432" r="2.5" fill="rgba(255,255,255,0.55)"/>
<text x="220" y="58" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#ffffff" font-weight="bold" letter-spacing="3">YOUR CLUB NAME</text>
<text x="220" y="78" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">present</text>
<text x="50" y="148" font-size="32" font-family="Arial,sans-serif" fill="#ffffff" font-weight="bold">23</text>
<text x="50" y="168" font-size="11" font-family="Arial,sans-serif" fill="#ffffff" letter-spacing="2">AUG</text>
<text x="390" y="148" text-anchor="end" font-size="32" font-family="Arial,sans-serif" fill="#ffffff" font-weight="bold">$10</text>
<text x="390" y="168" text-anchor="end" font-size="11" font-family="Arial,sans-serif" fill="#ffffff" letter-spacing="2">ENTRY</text>
<text x="220" y="272" text-anchor="middle" font-size="76" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">MUSIC</text>
<text x="220" y="330" text-anchor="middle" font-size="38" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="9">FESTIVAL</text>
<line x1="100" y1="355" x2="340" y2="355" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<text x="220" y="384" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="4">SPECIAL GUEST</text>
<text x="220" y="420" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">DJ LOREM  |  DJ IPSUM</text>
<rect x="0" y="490" width="440" height="170" fill="#ffffff"/>
<text x="220" y="526" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed</text>
<text x="220" y="544" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">diam nonummy nibh euismod tincidunt ut laoreet dolore magna</text>
<line x1="60" y1="568" x2="380" y2="568" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="220" y="598" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" font-weight="bold" fill="#374151">WWW YOUR WEBSITE NAME</text>
</svg>`);
}

// 3. Enjoy Dream Holiday
function lpTravelHoliday() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<defs>
  <linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffa000"/>
    <stop offset="100%" stop-color="#e65100"/>
  </linearGradient>
</defs>
<rect width="440" height="660" fill="url(#og)"/>
<polygon points="0,180 80,0 110,0 30,180" fill="rgba(255,255,255,0.06)"/>
<polygon points="340,0 440,0 440,380 260,660 200,660" fill="rgba(0,0,0,0.06)"/>
<rect x="248" y="28" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="34" width="162" height="110" rx="12" fill="rgba(200,100,0,0.45)"/>
<text x="335" y="96" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">[ Photo ]</text>
<rect x="248" y="170" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="176" width="162" height="110" rx="12" fill="rgba(180,90,0,0.45)"/>
<text x="335" y="238" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">[ Photo ]</text>
<rect x="248" y="312" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="318" width="162" height="110" rx="12" fill="rgba(160,80,0,0.45)"/>
<text x="335" y="380" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">[ Photo ]</text>
<rect x="248" y="454" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="460" width="162" height="110" rx="12" fill="rgba(140,70,0,0.45)"/>
<text x="335" y="522" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">[ Photo ]</text>
<text x="28" y="56" font-size="30" font-family="Georgia,serif" font-style="italic" fill="#ffffff">Let's Go</text>
<text x="26" y="116" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">ENJOY</text>
<text x="26" y="168" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">DREAM</text>
<text x="26" y="220" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">HOLIDAY</text>
<text x="26" y="260" font-size="27" font-family="Georgia,serif" font-style="italic" fill="#ffffff">Travel with Us!</text>
<text x="26" y="295" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Lorem ipsum dolor amet usn sed</text>
<text x="26" y="311" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">eff dfa le xoswe consectetur</text>
<text x="26" y="327" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">adipisifd sef ing seds dfde amet</text>
<text x="26" y="368" font-size="10.5" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">PACKAGE INCLUDES:</text>
<circle cx="35" cy="392" r="3.5" fill="#ffffff"/><text x="46" y="397" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Luxury Rooms</text>
<circle cx="35" cy="414" r="3.5" fill="#ffffff"/><text x="46" y="419" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Natural View</text>
<circle cx="35" cy="436" r="3.5" fill="#ffffff"/><text x="46" y="441" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Intercity Travel</text>
<circle cx="35" cy="458" r="3.5" fill="#ffffff"/><text x="46" y="463" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Lunch &amp; Dinner</text>
<rect x="26" y="476" width="64" height="64" rx="4" fill="rgba(0,0,0,0.2)"/>
<text x="58" y="514" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">QR</text>
<text x="26" y="612" font-size="9.5" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">FOR MORE INFO</text>
<text x="26" y="630" font-size="8.5" font-family="Arial,sans-serif" fill="#ffffff">+1234567890</text>
<text x="152" y="612" font-size="9.5" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">VISIT OUR WEBSITE</text>
<text x="152" y="630" font-size="8" font-family="Arial,sans-serif" fill="#ffffff">WWW.YOURWEBSITE.COM</text>
</svg>`);
}

// 4. App Development
function lpAppDevelopment() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<circle cx="220" cy="178" r="134" fill="#dbeeff"/>
<circle cx="100" cy="90" r="12" fill="#f0a030" opacity="0.85"/>
<circle cx="340" cy="108" r="10" fill="#6ab87a" opacity="0.8"/>
<circle cx="326" cy="252" r="18" fill="#f0a030" opacity="0.7"/>
<circle cx="112" cy="268" r="14" fill="#6ab87a" opacity="0.65"/>
<circle cx="220" cy="108" r="22" fill="none" stroke="#2d6aa8" stroke-width="4"/>
<circle cx="220" cy="108" r="10" fill="none" stroke="#2d6aa8" stroke-width="3"/>
<rect x="217" y="80" width="6" height="12" rx="3" fill="#2d6aa8"/>
<rect x="217" y="124" width="6" height="12" rx="3" fill="#2d6aa8"/>
<rect x="191" y="105" width="12" height="6" rx="3" fill="#2d6aa8"/>
<rect x="237" y="105" width="12" height="6" rx="3" fill="#2d6aa8"/>
<line x1="124" y1="156" x2="150" y2="198" stroke="#e89030" stroke-width="5" stroke-linecap="round"/>
<line x1="116" y1="188" x2="158" y2="166" stroke="#2d6aa8" stroke-width="4" stroke-linecap="round"/>
<rect x="198" y="186" width="44" height="60" rx="8" fill="none" stroke="#2d6aa8" stroke-width="3"/>
<rect x="206" y="196" width="28" height="30" rx="3" fill="#dbeeff"/>
<path d="M192,226 C182,221 180,240 190,240 C193,240 196,237 196,233 L196,226Z" fill="#2d6aa8"/>
<path d="M248,226 C258,221 260,240 250,240 C247,240 244,237 244,233 L244,226Z" fill="#2d6aa8"/>
<path d="M298,183 C308,157 325,152 320,184 C318,195 306,206 298,200 Z" fill="#2d6aa8"/>
<circle cx="310" cy="183" r="6" fill="#dbeeff"/>
<path d="M295,198 L288,212 L304,206 Z" fill="#e89030"/>
<line x1="302" y1="202" x2="308" y2="218" stroke="#2d6aa8" stroke-width="2"/>
<line x1="308" y1="218" x2="316" y2="212" stroke="#2d6aa8" stroke-width="2"/>
<path d="M86,178 A134,134 0 0 1 354,178" fill="none" stroke="#e8a030" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.5"/>
<text x="220" y="362" text-anchor="middle" font-size="52" font-family="Arial,sans-serif" font-weight="bold" fill="#1a4a80">APP</text>
<text x="220" y="418" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#1a4a80">DEVELOPMENT</text>
<text x="220" y="455" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do</text>
<text x="220" y="470" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut</text>
<text x="220" y="485" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">enim ad minim veniam.</text>
<rect x="0" y="512" width="440" height="148" fill="#dbeeff"/>
<rect x="10" y="526" width="4" height="84" fill="#2d6aa8"/>
<text x="24" y="544" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">Lorem ipsum, Lorem ipsum</text>
<text x="24" y="559" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">lorem ipsum dolor sit dim 00/0</text>
<text x="24" y="574" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">lorem ipsum</text>
<text x="24" y="589" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">lorem ipsum</text>
<text x="24" y="604" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">+0 (000) 000-00-00</text>
<text x="24" y="619" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">+0 (000) 000-00-00</text>
<circle cx="390" cy="578" r="30" fill="#e89030" opacity="0.7"/>
<circle cx="368" cy="612" r="24" fill="#6ab87a" opacity="0.65"/>
</svg>`);
}

// 5. Wedding Invitation
function lpWeddingInvite() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<circle cx="388" cy="52" r="56" fill="#8b1a1a" opacity="0.88"/><circle cx="388" cy="52" r="47" fill="#9e2020" opacity="0.84"/><circle cx="388" cy="52" r="37" fill="#b02828" opacity="0.8"/><circle cx="391" cy="49" r="26" fill="#a01e1e" opacity="0.85"/><circle cx="390" cy="50" r="15" fill="#8b1a1a"/>
<circle cx="328" cy="26" r="42" fill="#e8a0a0" opacity="0.78"/><circle cx="328" cy="26" r="34" fill="#f0b0b0" opacity="0.75"/><circle cx="328" cy="26" r="25" fill="#f5c0c0" opacity="0.8"/><circle cx="330" cy="24" r="16" fill="#e8a0a0" opacity="0.82"/>
<circle cx="425" cy="118" r="30" fill="#e0a0c0" opacity="0.72"/><circle cx="425" cy="118" r="23" fill="#eab0cc" opacity="0.78"/><circle cx="425" cy="118" r="15" fill="#f0c0d8" opacity="0.72"/>
<circle cx="272" cy="90" r="14" fill="#e8a0a0" opacity="0.48"/>
<circle cx="285" cy="68" r="9" fill="#e0a0c0" opacity="0.42"/>
<ellipse cx="358" cy="12" rx="34" ry="10" fill="#4a8050" transform="rotate(-22,358,12)" opacity="0.68"/>
<ellipse cx="290" cy="52" rx="30" ry="8" fill="#5a9060" transform="rotate(14,290,52)" opacity="0.6"/>
<ellipse cx="432" cy="82" rx="28" ry="8" fill="#4a8050" transform="rotate(-38,432,82)" opacity="0.6"/>
<circle cx="52" cy="608" r="56" fill="#8b1a1a" opacity="0.88"/><circle cx="52" cy="608" r="47" fill="#9e2020" opacity="0.84"/><circle cx="52" cy="608" r="37" fill="#b02828" opacity="0.8"/><circle cx="55" cy="605" r="26" fill="#a01e1e" opacity="0.85"/><circle cx="54" cy="606" r="15" fill="#8b1a1a"/>
<circle cx="112" cy="634" r="42" fill="#e8a0a0" opacity="0.78"/><circle cx="112" cy="634" r="34" fill="#f0b0b0" opacity="0.75"/><circle cx="112" cy="634" r="25" fill="#f5c0c0" opacity="0.8"/><circle cx="114" cy="632" r="16" fill="#e8a0a0" opacity="0.82"/>
<circle cx="15" cy="542" r="30" fill="#e0a0c0" opacity="0.72"/><circle cx="15" cy="542" r="23" fill="#eab0cc" opacity="0.78"/><circle cx="15" cy="542" r="15" fill="#f0c0d8" opacity="0.72"/>
<circle cx="168" cy="568" r="14" fill="#e8a0a0" opacity="0.48"/>
<circle cx="155" cy="588" r="9" fill="#e0a0c0" opacity="0.42"/>
<ellipse cx="82" cy="650" rx="34" ry="10" fill="#4a8050" transform="rotate(22,82,650)" opacity="0.68"/>
<ellipse cx="150" cy="616" rx="30" ry="8" fill="#5a9060" transform="rotate(-14,150,616)" opacity="0.6"/>
<ellipse cx="8" cy="592" rx="28" ry="8" fill="#4a8050" transform="rotate(38,8,592)" opacity="0.6"/>
<text x="220" y="222" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b4040" letter-spacing="3">YOU ARE INVITED TO</text>
<text x="220" y="244" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b4040" letter-spacing="3">THE WEDDING OF</text>
<text x="220" y="315" text-anchor="middle" font-size="46" font-family="Georgia,serif" font-weight="bold" fill="#3d1515">DANY &amp; MEGA</text>
<line x1="130" y1="332" x2="196" y2="332" stroke="#5a2020" stroke-width="0.8"/>
<text x="178" y="350" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#5a2020">APRIL</text>
<text x="220" y="352" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="#5a2020">15</text>
<text x="262" y="350" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#5a2020">2009</text>
<line x1="244" y1="332" x2="310" y2="332" stroke="#5a2020" stroke-width="0.8"/>
<text x="220" y="380" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#7a4040" letter-spacing="2">ONE O'CLOCK IN THE MORNING</text>
<line x1="150" y1="396" x2="290" y2="396" stroke="#e8d0d0" stroke-width="0.8"/>
<text x="220" y="424" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#7a4040">LOREM IPSUM</text>
<text x="220" y="446" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#7a4040">LOREM IPSUM SIT DOLOR</text>
</svg>`);
}

// 6. Digital Marketing Agency
function lpDigitalMarketing() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<defs>
  <linearGradient id="dmg" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#1e88e5"/>
    <stop offset="100%" stop-color="#1565c0"/>
  </linearGradient>
</defs>
<rect width="440" height="660" fill="url(#dmg)"/>
<path d="M290,0 L440,0 L440,230 Q380,188 300,228 Q242,260 290,0Z" fill="rgba(255,255,255,0.1)"/>
<path d="M368,0 L440,0 L440,108 Z" fill="rgba(255,255,255,0.07)"/>
<rect x="320" y="222" width="10" height="10" transform="rotate(45,325,227)" fill="rgba(255,255,255,0.5)"/>
<rect x="340" y="222" width="10" height="10" transform="rotate(45,345,227)" fill="rgba(255,255,255,0.5)"/>
<rect x="360" y="222" width="10" height="10" transform="rotate(45,365,227)" fill="rgba(255,255,255,0.5)"/>
<rect x="380" y="222" width="10" height="10" transform="rotate(45,385,227)" fill="rgba(255,255,255,0.5)"/>
<circle cx="406" cy="262" r="6" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
<path d="M272,196 Q282,189 292,196 Q302,203 312,196" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
<path d="M272,212 Q282,205 292,212 Q302,219 312,212" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
<path d="M272,228 Q282,221 292,228 Q302,235 312,228" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
<text x="28" y="55" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">DIGITAL</text>
<text x="28" y="106" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">MARKETING</text>
<text x="28" y="157" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">AGENCY</text>
<text x="28" y="192" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">Lorem ipsum dolor sit amet</text>
<text x="28" y="209" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">consectetur adipiscing elit, sed do</text>
<text x="28" y="226" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">eiusmod tempor incididunt ut labore</text>
<text x="28" y="254" font-size="10.5" font-family="Arial,sans-serif" fill="#90caf9" font-weight="bold">www.yourwebsitehere.com</text>
<rect x="0" y="338" width="440" height="322" rx="44" fill="#ffffff"/>
<rect x="20" y="352" width="400" height="294" rx="30" fill="#e2e8f0" data-placeholder="photo"/>
<text x="220" y="476" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="#94a3b8" opacity="0.9">Your Photo</text>
<text x="220" y="512" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#94a3b8" opacity="0.9">or Logo Here</text>
</svg>`);
}

// 7. Luxury Real Estate
function lpRealEstate() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#3e1a08"/>
<path d="M0,318 C80,258 164,372 222,312 C280,252 362,358 440,300 L440,660 L0,660 Z" fill="#ffffff"/>
<rect x="328" y="32" width="82" height="62" rx="4" fill="#e89030" opacity="0.88"/>
<polygon points="369,18 410,50 328,50" fill="#e89030" opacity="0.88"/>
<rect x="350" y="58" width="22" height="28" rx="2" fill="#3e1a08"/>
<text x="369" y="28" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#3e1a08" font-weight="bold">REAL</text>
<text x="369" y="42" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#3e1a08" font-weight="bold">ESTATE</text>
<text x="28" y="78" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">LUXURY</text>
<text x="28" y="128" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">REAL ESTATE</text>
<text x="28" y="178" font-size="32" font-family="Georgia,serif" font-style="italic" fill="#e89030">For Sale</text>
<text x="28" y="378" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#3e1a08">PROPERTY FEATURES</text>
<circle cx="40" cy="408" r="4" fill="#3e1a08"/><text x="52" y="413" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Master Bedroom</text>
<circle cx="40" cy="430" r="4" fill="#3e1a08"/><text x="52" y="435" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Bedrooms</text>
<circle cx="40" cy="452" r="4" fill="#3e1a08"/><text x="52" y="457" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Master Bathrooms</text>
<circle cx="40" cy="474" r="4" fill="#3e1a08"/><text x="52" y="479" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Grandeur Living Room</text>
<circle cx="40" cy="496" r="4" fill="#3e1a08"/><text x="52" y="501" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Swimming Pool</text>
<circle cx="40" cy="518" r="4" fill="#3e1a08"/><text x="52" y="523" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Car Garage</text>
<text x="28" y="556" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="#3e1a08">START FROM</text>
<text x="28" y="590" font-size="34" font-family="Georgia,serif" font-weight="bold" fill="#3e1a08">$ 50.000</text>
<circle cx="338" cy="458" r="66" fill="#e89030"/>
<text x="338" y="448" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">20%</text>
<text x="338" y="476" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Discount</text>
<circle cx="340" cy="585" r="58" fill="#9a6835" stroke="#ffffff" stroke-width="3"/>
<text x="340" y="590" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">Photo</text>
<text x="28" y="624" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">123-456-7890</text>
<text x="28" y="641" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">hello@reallygreatsite.com</text>
</svg>`);
}

// ── Template collections ───────────────────────────────────────────────────────
const POSTER_TEMPLATES = [
  {
    galleryName: "Small Posters",
    designs: [
      { name: "Dark Floral Table",      fn: () => lpFloralTable(),       p: "#1e2420", a: "#c08060", bg: "#1e2420", colors: [{ name: "Default", p: "#1e2420" }] },
      { name: "Music Festival",         fn: () => lpMusicFestival(),     p: "#3d1ba8", a: "#ffffff", bg: "#3d1ba8", colors: [{ name: "Default", p: "#3d1ba8" }] },
      { name: "Enjoy Dream Holiday",    fn: () => lpTravelHoliday(),     p: "#ffa000", a: "#ffffff", bg: "#ffa000", colors: [{ name: "Default", p: "#ffa000" }] },
      { name: "App Development",        fn: () => lpAppDevelopment(),    p: "#1a4a80", a: "#dbeeff", bg: "#ffffff", colors: [{ name: "Default", p: "#1a4a80" }] },
      { name: "Wedding Invitation",     fn: () => lpWeddingInvite(),     p: "#8b1a1a", a: "#e8a0a0", bg: "#ffffff", colors: [{ name: "Default", p: "#8b1a1a" }] },
      { name: "Digital Marketing",      fn: () => lpDigitalMarketing(),  p: "#1565c0", a: "#90caf9", bg: "#1e88e5", colors: [{ name: "Default", p: "#1565c0" }] },
      { name: "Luxury Real Estate",     fn: () => lpRealEstate(),        p: "#3e1a08", a: "#e89030", bg: "#3e1a08", colors: [{ name: "Default", p: "#3e1a08" }] },
    ],
  },

  {
    galleryName: "Large Posters",
    designs: [
      { name: "Dark Floral Table",      fn: () => lpFloralTable(),       p: "#1e2420", a: "#c08060", bg: "#1e2420", colors: [{ name: "Default", p: "#1e2420" }] },
      { name: "Music Festival",         fn: () => lpMusicFestival(),     p: "#3d1ba8", a: "#ffffff", bg: "#3d1ba8", colors: [{ name: "Default", p: "#3d1ba8" }] },
      { name: "Enjoy Dream Holiday",    fn: () => lpTravelHoliday(),     p: "#ffa000", a: "#ffffff", bg: "#ffa000", colors: [{ name: "Default", p: "#ffa000" }] },
      { name: "App Development",        fn: () => lpAppDevelopment(),    p: "#1a4a80", a: "#dbeeff", bg: "#ffffff", colors: [{ name: "Default", p: "#1a4a80" }] },
      { name: "Wedding Invitation",     fn: () => lpWeddingInvite(),     p: "#8b1a1a", a: "#e8a0a0", bg: "#ffffff", colors: [{ name: "Default", p: "#8b1a1a" }] },
      { name: "Digital Marketing",      fn: () => lpDigitalMarketing(),  p: "#1565c0", a: "#90caf9", bg: "#1e88e5", colors: [{ name: "Default", p: "#1565c0" }] },
      { name: "Luxury Real Estate",     fn: () => lpRealEstate(),        p: "#3e1a08", a: "#e89030", bg: "#3e1a08", colors: [{ name: "Default", p: "#3e1a08" }] },
    ],
  },
];

// ── Prepared statements ───────────────────────────────────────────────────────
const stmtInsertGallery = db.prepare(
  "INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at) VALUES (?, ?, ?, ?, ?)"
);
const stmtInsertDesign = db.prepare(
  `INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, front_bg_color, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const stmtInsertColor = db.prepare(
  `INSERT INTO design_colors (id, design_id, color_hex, color_name, front_image, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const PRODUCT_SLUG = "posters";

const run = db.transaction(() => {
  const cleared = db.prepare("DELETE FROM gallery_templates WHERE product_slug = ?").run(PRODUCT_SLUG).changes;
  console.log(`Cleared ${cleared} existing gallery template(s) for "${PRODUCT_SLUG}"\n`);

  let galleries = 0, totalDesigns = 0, totalColors = 0;

  for (const col of POSTER_TEMPLATES) {
    const gid = uid();
    const now = new Date(Date.now() + galleries * 200).toISOString();

    const firstDesign = col.designs[0];
    const previewImg  = firstDesign.fn(firstDesign.p, firstDesign.a);

    stmtInsertGallery.run(gid, PRODUCT_SLUG, col.galleryName, previewImg, now);

    for (const d of col.designs) {
      const did        = uid();
      const baseImg    = d.fn(d.p, d.a);
      const firstColor = d.colors[0];

      stmtInsertDesign.run(
        did, gid,
        d.name,
        firstColor.p, firstColor.name,
        baseImg,
        d.bg,
        now
      );

      for (const c of d.colors) {
        const varImg = d.fn(c.p, c.a);
        stmtInsertColor.run(uid(), did, c.p, c.name, varImg, now);
        totalColors++;
      }

      totalDesigns++;
    }

    console.log(`  ✓  ${col.galleryName}  (${col.designs.length} designs)`);
    galleries++;
  }

  return { galleries, totalDesigns, totalColors };
});

const result = run();
console.log(`
Summary
───────────────────────────────
Gallery templates : ${result.galleries}
Designs           : ${result.totalDesigns}
Color variants    : ${result.totalColors}
Product slug      : ${PRODUCT_SLUG}
`);

db.close();
