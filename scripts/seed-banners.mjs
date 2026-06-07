/**
 * Seed script — vinyl-banners gallery templates
 * Run: PATH=/usr/local/opt/node@22/bin:$PATH node scripts/seed-banners.mjs
 *
 * Creates 3 gallery templates under the "vinyl-banners" product:
 *   1. Vinyl Banner          — From $109 + tax  (3' × 6', landscape)
 *   2. Large Outdoor Banner  — $179 + tax        (4' × 8', landscape)
 *   3. Standard Roll-Up Banner — $229 + tax       (33" × 81", portrait)
 *
 * Re-running CLEARS and RE-INSERTS all three templates.
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
function uid() { return `bn${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

function imgPH(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db" data-placeholder="photo"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LANDSCAPE BANNER LAYOUTS  (viewBox 600 × 200  ≈ 3:1 for vinyl banners)
// ═══════════════════════════════════════════════════════════════════════════════

function bannerBoldStripe(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
<rect width="600" height="200" fill="#ffffff"/>
<rect width="600" height="12" fill="${p}"/>
<rect y="188" width="600" height="12" fill="${p}"/>
<rect width="160" height="200" fill="${p}"/>
<rect x="160" width="8" height="200" fill="${a}" opacity="0.6"/>
<text x="80" y="80" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="3">COMPANY</text>
<text x="80" y="100" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="3">NAME</text>
<text x="80" y="126" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="2">www.company.com</text>
<text x="80" y="142" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">+1 234 567 8900</text>
<text x="300" y="76" text-anchor="middle" font-size="32" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">YOUR HEADLINE</text>
<text x="300" y="104" text-anchor="middle" font-size="32" font-family="Georgia,serif" font-weight="bold" fill="#111827" letter-spacing="1">GOES HERE</text>
<line x1="195" y1="118" x2="565" y2="118" stroke="${a}" stroke-width="2"/>
<text x="300" y="144" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280">Supporting message or tagline can go in this area</text>
<text x="300" y="162" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#9ca3af">Call to action  ·  Additional detail  ·  www.example.com</text>
</svg>`);
}

function bannerFullColor(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
<rect width="600" height="200" fill="${p}"/>
<polygon points="0,0 220,0 0,200" fill="rgba(255,255,255,0.04)"/>
<polygon points="600,200 380,200 600,0" fill="rgba(255,255,255,0.04)"/>
<line x1="0" y1="30" x2="600" y2="30" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<line x1="0" y1="170" x2="600" y2="170" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<text x="300" y="22" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6">COMPANY NAME  ·  EST. 2010</text>
<text x="300" y="98" text-anchor="middle" font-size="38" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="2">YOUR HEADLINE</text>
<text x="300" y="126" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3">TAGLINE OR SUB-HEADING HERE</text>
<line x1="160" y1="146" x2="440" y2="146" stroke="${a}" stroke-width="1.5" opacity="0.6"/>
<text x="300" y="164" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">www.example.com  ·  +1 234 567 8900  ·  hello@example.com</text>
</svg>`);
}

function bannerEventSplit(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
<rect width="600" height="200" fill="#f8fafc"/>
<rect width="600" height="200" fill="#ffffff"/>
<rect width="260" height="200" fill="${p}"/>
<polygon points="260,0 310,0 260,200 210,200" fill="${a}" opacity="0.25"/>
<text x="130" y="68" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="4">COMPANY NAME</text>
<text x="130" y="96" text-anchor="middle" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">EVENT</text>
<text x="130" y="122" text-anchor="middle" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="${a}">NAME</text>
<text x="130" y="148" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Date  ·  Location</text>
<text x="430" y="70" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">Your Headline</text>
<text x="430" y="96" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#111827">Goes Here</text>
<line x1="330" y1="114" x2="570" y2="114" stroke="${a}" stroke-width="2"/>
<text x="430" y="136" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="#6b7280">Supporting sub-heading or description</text>
<text x="430" y="156" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#9ca3af">www.example.com  ·  +1 234 567 8900</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LARGE OUTDOOR BANNER LAYOUTS  (viewBox 600 × 300  ≈ 2:1 for 4'×8' banners)
// ═══════════════════════════════════════════════════════════════════════════════

function outdoorOrangeVintage() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#c84b1a"/>
<ellipse cx="85" cy="44" rx="52" ry="26" fill="rgba(255,255,255,0.12)"/>
<ellipse cx="130" cy="33" rx="42" ry="19" fill="rgba(255,255,255,0.08)"/>
<ellipse cx="510" cy="44" rx="54" ry="27" fill="rgba(255,255,255,0.12)"/>
<ellipse cx="466" cy="33" rx="44" ry="20" fill="rgba(255,255,255,0.08)"/>
<rect x="10" y="10" width="580" height="280" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="300" y="37" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="white" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<line x1="28" y1="52" x2="244" y2="52" stroke="rgba(255,255,255,0.42)" stroke-width="1.5"/>
<line x1="356" y1="52" x2="572" y2="52" stroke="rgba(255,255,255,0.42)" stroke-width="1.5"/>
<polygon points="30,148 62,130 62,148" fill="rgba(255,255,255,0.42)"/>
<polygon points="62,148 94,130 94,148" fill="rgba(255,255,255,0.28)"/>
<polygon points="570,148 538,130 538,148" fill="rgba(255,255,255,0.42)"/>
<polygon points="538,148 506,130 506,148" fill="rgba(255,255,255,0.28)"/>
<text x="300" y="148" text-anchor="middle" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="white">YOUR TEXT HERE</text>
<text x="300" y="184" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.88)" letter-spacing="5">DATE</text>
<line x1="90" y1="200" x2="510" y2="200" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="300" y="236" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)" letter-spacing="3">WEB / OTHER</text>
<text x="300" y="272" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">+1 234 567 8900</text>
</svg>`);
}

function outdoorGrandOpening() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#fbbf24"/>
<rect y="108" width="600" height="84" fill="#374151"/>
<text x="300" y="40" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<line x1="50" y1="56" x2="255" y2="56" stroke="#374151" stroke-width="1.5" opacity="0.4"/>
<line x1="345" y1="56" x2="550" y2="56" stroke="#374151" stroke-width="1.5" opacity="0.4"/>
<text x="300" y="78" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#78350f" letter-spacing="3">Your Tagline Here</text>
<text x="300" y="160" text-anchor="middle" font-size="36" font-family="Georgia,serif" font-weight="bold" fill="#fbbf24" letter-spacing="2">GRAND OPENING</text>
<text x="300" y="238" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="#374151" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="265" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#6b7280">www.yourcompany.com</text>
<text x="300" y="285" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="2">COMPANY NAME</text>
</svg>`);
}

function outdoorFootballEvent() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="180" fill="#1e3a8a"/>
<rect y="180" width="600" height="120" fill="#166534"/>
<line x1="0" y1="180" x2="600" y2="180" stroke="#bbf7d0" stroke-width="2.5"/>
<line x1="100" y1="180" x2="100" y2="300" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<line x1="200" y1="180" x2="200" y2="300" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<line x1="300" y1="180" x2="300" y2="300" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<line x1="400" y1="180" x2="400" y2="300" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<line x1="500" y1="180" x2="500" y2="300" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
<ellipse cx="140" cy="100" rx="42" ry="48" fill="#1e40af" opacity="0.9"/>
<ellipse cx="140" cy="100" rx="34" ry="40" fill="#2563eb"/>
<rect x="112" y="106" width="56" height="18" rx="5" fill="#1e3a8a"/>
<line x1="136" y1="66" x2="136" y2="146" stroke="#fbbf24" stroke-width="3.5" opacity="0.9"/>
<ellipse cx="460" cy="100" rx="42" ry="48" fill="#7f1d1d" opacity="0.9"/>
<ellipse cx="460" cy="100" rx="34" ry="40" fill="#991b1b"/>
<rect x="432" y="106" width="56" height="18" rx="5" fill="#7f1d1d"/>
<line x1="464" y1="66" x2="464" y2="146" stroke="#fbbf24" stroke-width="3.5" opacity="0.9"/>
<circle cx="300" cy="95" r="26" fill="rgba(255,255,255,0.08)"/>
<text x="300" y="103" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="#fbbf24">VS</text>
<text x="300" y="215" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)" letter-spacing="2">DATE  ·  LOCATION  ·  TIME</text>
<text x="300" y="243" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="white">EVENT NAME</text>
<text x="300" y="275" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.example.com  ·  +1 234 567 8900</text>
</svg>`);
}

function outdoorConcertEvent() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#1c1917"/>
<rect width="600" height="200" fill="#f59e0b"/>
<polygon points="300,0 600,0 600,200 0,200 0,80" fill="#fde68a" opacity="0.35"/>
<rect x="278" y="38" width="28" height="50" rx="13" fill="rgba(0,0,0,0.7)"/>
<path d="M 262 75 Q 262 106 300 106 Q 338 106 338 75" fill="none" stroke="rgba(0,0,0,0.7)" stroke-width="3.5"/>
<line x1="300" y1="106" x2="300" y2="124" stroke="rgba(0,0,0,0.7)" stroke-width="3.5"/>
<line x1="280" y1="124" x2="320" y2="124" stroke="rgba(0,0,0,0.7)" stroke-width="3.5"/>
<text x="300" y="165" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(0,0,0,0.6)" letter-spacing="5" font-weight="bold">COMPANY NAME</text>
<rect y="200" width="600" height="100" fill="#78350f"/>
<text x="300" y="232" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="#fbbf24">EVENT NAME</text>
<text x="300" y="262" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)" letter-spacing="4">DATE</text>
<text x="300" y="285" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">www.example.com  ·  +1 234 567 8900</text>
</svg>`);
}

function outdoorForLease() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#fdf6ed"/>
<rect x="8" y="8" width="584" height="284" fill="none" stroke="#ea6620" stroke-width="3"/>
<rect x="16" y="16" width="568" height="268" fill="none" stroke="#ea6620" stroke-width="0.8" opacity="0.4"/>
<rect x="266" y="58" width="68" height="52" fill="#ea6620" opacity="0.12"/>
<rect x="266" y="58" width="68" height="52" fill="none" stroke="#ea6620" stroke-width="2.5"/>
<polygon points="252,60 300,18 348,60" fill="#ea6620"/>
<rect x="284" y="82" width="20" height="28" rx="2" fill="#ea6620" opacity="0.55"/>
<text x="300" y="148" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280" letter-spacing="4">COMPANY NAME</text>
<text x="300" y="202" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#ea6620">For Lease</text>
<line x1="80" y1="216" x2="520" y2="216" stroke="#ea6620" stroke-width="1.5" opacity="0.35"/>
<text x="300" y="246" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="#374151" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="268" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="#6b7280">www.yourcompany.com</text>
<text x="300" y="286" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">123 Business Street · City, Province</text>
</svg>`);
}

function outdoorSaleBanner() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#0284c7"/>
<polygon points="0,0 240,0 0,240" fill="rgba(255,255,255,0.06)"/>
<polygon points="600,300 360,300 600,60" fill="rgba(255,255,255,0.06)"/>
<rect width="600" height="46" fill="rgba(0,0,0,0.22)"/>
<text x="300" y="28" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="white" letter-spacing="5" font-weight="bold">DATE</text>
<text x="300" y="210" text-anchor="middle" font-size="120" font-family="Georgia,serif" font-weight="bold" fill="white" opacity="0.95">Sale</text>
<rect y="228" width="600" height="72" fill="rgba(0,0,0,0.22)"/>
<text x="300" y="256" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.92)" letter-spacing="3">SPECIAL OFFER</text>
<text x="300" y="280" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Company Name  ·  +1 234 567 8900  ·  www.example.com</text>
</svg>`);
}

function outdoorRedCompany() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#dc2626"/>
<polygon points="180,0 260,0 100,300 20,300" fill="rgba(255,255,255,0.07)"/>
<polygon points="500,0 600,0 600,180 440,300 340,300" fill="rgba(255,255,255,0.07)"/>
<rect width="600" height="7" fill="rgba(0,0,0,0.18)"/>
<rect y="293" width="600" height="7" fill="rgba(0,0,0,0.18)"/>
<text x="300" y="115" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="white" letter-spacing="3">COMPANY</text>
<text x="300" y="175" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="rgba(255,255,255,0.8)" letter-spacing="3">NAME</text>
<line x1="80" y1="192" x2="520" y2="192" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
<text x="300" y="228" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.9)" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="256" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.yourcompany.com</text>
<text x="300" y="280" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">123 Business Street · City, Province</text>
</svg>`);
}

function outdoorPatriotic() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="100" fill="#b91c1c"/>
<rect y="100" width="600" height="100" fill="#ffffff"/>
<rect y="200" width="600" height="100" fill="#1d4ed8"/>
<rect width="600" height="2" fill="rgba(0,0,0,0.1)"/>
<rect y="100" width="600" height="2" fill="rgba(0,0,0,0.08)"/>
<rect y="200" width="600" height="2" fill="rgba(0,0,0,0.08)"/>
<rect y="298" width="600" height="2" fill="rgba(0,0,0,0.1)"/>
<text x="300" y="38" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.9)" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<text x="300" y="72" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="2">Tagline Goes Here</text>
<text x="300" y="162" text-anchor="middle" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="#1d4ed8" letter-spacing="2">HEADLINE</text>
<text x="300" y="238" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="white" letter-spacing="2" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="262" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">www.yourcompany.com</text>
<text x="300" y="283" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">City, Province</text>
</svg>`);
}

function outdoorArrowText() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#ffffff"/>
<rect x="6" y="6" width="588" height="288" fill="none" stroke="#991b1b" stroke-width="2.5"/>
<polygon points="22,150 110,95 110,124 215,124 215,176 110,176 110,205" fill="#991b1b"/>
<text x="400" y="122" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="#991b1b" letter-spacing="1">YOUR TEXT</text>
<text x="400" y="158" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="#1f2937">HERE</text>
<line x1="250" y1="56" x2="250" y2="244" stroke="#e5e7eb" stroke-width="1.5"/>
<line x1="30" y1="244" x2="570" y2="244" stroke="#e5e7eb" stroke-width="1"/>
<text x="300" y="272" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9ca3af">Company Name  ·  +1 234 567 8900  ·  www.example.com</text>
</svg>`);
}

function outdoorTealHouse() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#134e4a"/>
<rect width="600" height="6" fill="#d4af37"/>
<rect y="294" width="600" height="6" fill="#d4af37"/>
<rect x="55" y="100" width="90" height="72" fill="none" stroke="#d4af37" stroke-width="2.5"/>
<polyline points="42,102 100,58 158,102" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linejoin="round"/>
<rect x="84" y="130" width="24" height="42" rx="2" fill="none" stroke="#d4af37" stroke-width="2"/>
<text x="100" y="126" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="#d4af37">H</text>
<text x="370" y="118" text-anchor="middle" font-size="42" font-family="Georgia,serif" font-weight="bold" fill="white" letter-spacing="2">HEADLINE</text>
<text x="370" y="158" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="5" font-weight="bold">COMPANY NAME</text>
<line x1="195" y1="174" x2="575" y2="174" stroke="#d4af37" stroke-width="1.5" opacity="0.45"/>
<text x="370" y="210" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">www.yourcompany.com  ·  +1 234 567 8900</text>
<text x="370" y="236" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.38)">123 Business Street · City, Province</text>
</svg>`);
}

function outdoorYellowOffice() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#fbbf24"/>
<rect width="600" height="50" fill="#1c1917"/>
<text x="300" y="28" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="white" letter-spacing="4">COMPANY NAME</text>
<text x="300" y="43" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="3">123 STREET ADDRESS · CITY, PROVINCE</text>
<rect x="200" y="72" width="200" height="168" fill="rgba(120,53,15,0.18)"/>
<rect x="200" y="72" width="200" height="168" fill="none" stroke="#92400e" stroke-width="2" opacity="0.3"/>
<rect x="220" y="88" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="260" y="88" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="300" y="88" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="340" y="88" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="220" y="120" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="260" y="120" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="300" y="120" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="340" y="120" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="220" y="152" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="260" y="152" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="300" y="152" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="340" y="152" width="28" height="22" fill="rgba(0,0,0,0.12)"/>
<rect x="270" y="190" width="50" height="50" fill="rgba(0,0,0,0.15)"/>
<text x="300" y="67" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#78350f" letter-spacing="3" font-weight="bold">HEADLINE</text>
<text x="90" y="165" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#78350f" font-weight="bold">YOUR</text>
<text x="90" y="192" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#78350f" font-weight="bold">TEXT</text>
<text x="90" y="219" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#92400e" font-weight="bold">HERE</text>
<text x="490" y="168" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#78350f" font-weight="bold">+1 234 567 8900</text>
<text x="490" y="190" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#92400e">www.company.com</text>
<text x="300" y="278" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#78350f" font-weight="bold">+1 234 567 8900  ·  www.yourcompany.com</text>
</svg>`);
}

function outdoorMedicalEMS() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#ffffff"/>
<rect y="188" width="600" height="112" fill="#1d4ed8"/>
<rect y="180" width="600" height="8" fill="#dc2626"/>
<text x="300" y="35" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<text x="300" y="55" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280" letter-spacing="2">Medical &amp; Emergency Services</text>
<rect x="268" y="70" width="64" height="24" rx="3" fill="#ef4444"/>
<rect x="280" y="58" width="40" height="48" rx="3" fill="#ef4444"/>
<rect x="272" y="74" width="56" height="16" rx="2" fill="#dc2626"/>
<rect x="284" y="62" width="32" height="40" rx="2" fill="#dc2626"/>
<rect x="286" y="75" width="28" height="14" rx="1" fill="white" opacity="0.4"/>
<polyline points="30,152 118,152 138,128 156,176 170,128 186,152 570,152" fill="none" stroke="#dc2626" stroke-width="2.5"/>
<text x="300" y="218" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="white" letter-spacing="2" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="244" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">www.yourmedical.com</text>
<text x="300" y="268" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">123 Medical Drive · City, Province</text>
<text x="300" y="288" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">Open 24 Hours · 7 Days a Week</text>
</svg>`);
}

function outdoorHelloRed() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#dc2626"/>
<polygon points="0,0 180,0 0,180" fill="rgba(255,255,255,0.06)"/>
<polygon points="600,300 420,300 600,120" fill="rgba(255,255,255,0.06)"/>
<rect width="600" height="5" fill="rgba(0,0,0,0.12)"/>
<rect y="295" width="600" height="5" fill="rgba(0,0,0,0.12)"/>
<text x="200" y="148" text-anchor="middle" font-size="72" font-family="Georgia,serif" font-weight="bold" fill="white">Hello.</text>
<circle cx="380" cy="130" r="26" fill="rgba(255,255,255,0.15)"/>
<polygon points="368,130 392,118 392,142" fill="white" opacity="0.9"/>
<text x="460" y="158" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)" letter-spacing="2">COMPANY NAME</text>
<line x1="30" y1="196" x2="570" y2="196" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
<text x="300" y="228" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)" font-weight="bold">+1 234 567 8900</text>
<text x="300" y="252" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.yourcompany.com</text>
<text x="300" y="276" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">123 Business Street · City, Province</text>
</svg>`);
}

function outdoorPurplePhoto() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#ffffff"/>
<rect y="160" width="600" height="140" fill="#7c3aed"/>
<rect y="152" width="600" height="8" fill="#6d28d9"/>
${imgPH(30, 20, 130, 120)}
<text x="370" y="56" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<text x="370" y="78" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="2">Your tagline goes here</text>
<line x1="185" y1="98" x2="575" y2="98" stroke="#e5e7eb" stroke-width="1"/>
<text x="370" y="124" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280">+1 234 567 8900  ·  www.example.com</text>
<text x="300" y="204" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="white">HEADLINE GOES HERE</text>
<line x1="50" y1="220" x2="550" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<text x="300" y="248" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">Supporting message or tagline here</text>
<text x="300" y="272" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">www.example.com  ·  +1 234 567 8900</text>
</svg>`);
}

function outdoorClearanceSale() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300">
<rect width="600" height="300" fill="#fbbf24"/>
<rect y="160" width="600" height="140" fill="#dc2626"/>
<polygon points="0,120 600,80 600,160 0,200" fill="#dc2626"/>
<polygon points="0,80 600,40 600,80 0,120" fill="rgba(220,38,38,0.3)"/>
<text x="300" y="42" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<text x="300" y="64" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#78350f" letter-spacing="2">+1 234 567 8900  ·  www.example.com</text>
<text x="300" y="92" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#374151" letter-spacing="1">Up to 50% OFF — Limited Time Only</text>
<text x="300" y="228" text-anchor="middle" font-size="36" font-family="Georgia,serif" font-weight="bold" fill="white" letter-spacing="2">CLEARANCE SALE</text>
<text x="300" y="264" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.82)" letter-spacing="1">Shop Now — While Supplies Last</text>
<text x="300" y="285" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">www.example.com  ·  +1 234 567 8900</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROLL-UP BANNER LAYOUTS  (viewBox 600 × 600  square, fills 950×950 editor canvas)
// ═══════════════════════════════════════════════════════════════════════════════

function rollupExecutive(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#ffffff"/>
<rect width="600" height="160" fill="${p}"/>
<rect y="160" width="600" height="8" fill="${a}"/>
<circle cx="300" cy="86" r="38" fill="rgba(255,255,255,0.12)"/>
<text x="300" y="78" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)" letter-spacing="2">YOUR</text>
<text x="300" y="96" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">LOGO</text>
<text x="300" y="140" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<text x="300" y="210" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="${p}">YOUR</text>
<text x="300" y="240" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="${p}">HEADLINE</text>
<text x="300" y="268" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="#111827">HERE</text>
<line x1="100" y1="285" x2="500" y2="285" stroke="${a}" stroke-width="2"/>
<text x="300" y="316" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Supporting message or</text>
<text x="300" y="332" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">tagline goes here on</text>
<text x="300" y="348" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">this second line</text>
<line x1="100" y1="370" x2="500" y2="370" stroke="#e5e7eb" stroke-width="1"/>
<text x="300" y="400" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Feature One</text>
<text x="300" y="420" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Feature Two</text>
<text x="300" y="440" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Feature Three</text>
<line x1="100" y1="460" x2="500" y2="460" stroke="#e5e7eb" stroke-width="1"/>
<text x="300" y="488" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">www.example.com</text>
<text x="300" y="506" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">+1 234 567 8900</text>
<text x="300" y="524" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">hello@example.com</text>
<rect y="556" width="600" height="44" fill="${p}"/>
<text x="300" y="582" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3">COMPANY NAME</text>
</svg>`);
}

function rollupPromo(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="${p}"/>
<polygon points="0,0 600,0 600,200 0,260" fill="rgba(255,255,255,0.05)"/>
<polygon points="0,340 600,280 600,600 0,600" fill="rgba(0,0,0,0.15)"/>
<text x="300" y="50" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="5" font-weight="bold">COMPANY NAME</text>
<line x1="75" y1="62" x2="525" y2="62" stroke="${a}" stroke-width="1" opacity="0.45"/>
<text x="300" y="110" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)" letter-spacing="3">YOUR</text>
<text x="300" y="168" text-anchor="middle" font-size="48" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">BIG</text>
<text x="300" y="216" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${a}">MESSAGE</text>
<line x1="75" y1="240" x2="525" y2="240" stroke="${a}" stroke-width="1.5" opacity="0.5"/>
<text x="300" y="276" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Supporting text for your</text>
<text x="300" y="294" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">offer or promotion goes</text>
<text x="300" y="312" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">in these lines here</text>
<line x1="75" y1="336" x2="525" y2="336" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
<text x="300" y="370" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Feature One</text>
<text x="300" y="390" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Feature Two</text>
<text x="300" y="410" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Feature Three</text>
<line x1="75" y1="430" x2="525" y2="430" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
<text x="300" y="462" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">www.example.com</text>
<text x="300" y="480" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">+1 234 567 8900</text>
<rect x="100" y="512" width="400" height="36" rx="6" fill="${a}"/>
<text x="300" y="534" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">CALL TO ACTION</text>
<text x="300" y="578" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.25)" letter-spacing="2">COMPANY NAME</text>
</svg>`);
}

function rollupMinimal(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#ffffff"/>
<rect width="15" height="600" fill="${p}"/>
<rect x="25" width="8" height="600" fill="${a}" opacity="0.4"/>
<text x="330" y="58" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="5" font-weight="bold">COMPANY</text>
<text x="330" y="76" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="${p}" letter-spacing="5" font-weight="bold">NAME</text>
<line x1="60" y1="92" x2="550" y2="92" stroke="#e5e7eb" stroke-width="1"/>
<text x="330" y="148" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="${p}">YOUR</text>
<text x="330" y="182" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="${p}">HEADLINE</text>
<text x="330" y="214" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#111827" font-weight="bold">HERE</text>
<line x1="60" y1="234" x2="550" y2="234" stroke="${a}" stroke-width="2"/>
<text x="330" y="272" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#374151">Supporting message</text>
<text x="330" y="290" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#374151">or tagline here</text>
<line x1="60" y1="312" x2="550" y2="312" stroke="#e5e7eb" stroke-width="1"/>
<text x="330" y="350" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Benefit One</text>
<text x="330" y="370" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Benefit Two</text>
<text x="330" y="390" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">Key Benefit Three</text>
<line x1="60" y1="412" x2="550" y2="412" stroke="#e5e7eb" stroke-width="1"/>
<text x="330" y="448" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">www.example.com</text>
<text x="330" y="466" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">+1 234 567 8900</text>
<text x="330" y="484" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#9ca3af">hello@example.com</text>
<line x1="60" y1="506" x2="550" y2="506" stroke="#e5e7eb" stroke-width="1"/>
<rect y="530" width="600" height="70" fill="${p}"/>
<text x="330" y="566" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3">COMPANY NAME</text>
<text x="330" y="584" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">www.example.com</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STANDARD ROLL-UP BANNER DESIGNS  (viewBox 600 × 600)
// ═══════════════════════════════════════════════════════════════════════════════

function rollupBlackLuxury() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#0c0c0c"/>
<line x1="45" y1="0" x2="45" y2="600" stroke="#d4af37" stroke-width="1.8"/>
<line x1="555" y1="0" x2="555" y2="600" stroke="#d4af37" stroke-width="1.8"/>
<line x1="58" y1="0" x2="58" y2="600" stroke="#d4af37" stroke-width="0.6" opacity="0.5"/>
<line x1="542" y1="0" x2="542" y2="600" stroke="#d4af37" stroke-width="0.6" opacity="0.5"/>
<path d="M 45 15 C 125 14, 220 30, 205 68 C 190 100, 105 108, 75 105" fill="#d4af37" opacity="0.9"/>
<path d="M 50 18 C 115 18, 195 32, 185 66 C 175 92, 115 100, 88 98" fill="#1a1500" opacity="0.55"/>
<path d="M 145 14 C 180 5, 230 18, 210 34 C 190 48, 140 44, 138 32 Z" fill="#d4af37" opacity="0.88"/>
<path d="M 205 56 C 240 50, 265 65, 245 74 C 225 83, 195 76, 200 65 Z" fill="#d4af37" opacity="0.85"/>
<path d="M 75 105 C 60 118, 50 134, 55 148" fill="none" stroke="#d4af37" stroke-width="2.5"/>
<path d="M 45 140 C 35 156, 55 172, 95 170 C 80 160, 55 156, 63 145 Z" fill="#d4af37" opacity="0.78"/>
<circle cx="105" cy="22" r="3.5" fill="#d4af37"/>
<path d="M 555 585 C 475 586, 380 570, 395 532 C 410 500, 495 492, 525 495" fill="#d4af37" opacity="0.9"/>
<path d="M 550 582 C 485 582, 405 568, 415 534 C 425 508, 485 500, 513 502" fill="#1a1500" opacity="0.55"/>
<path d="M 455 586 C 420 595, 370 582, 390 566 C 410 552, 460 556, 463 568 Z" fill="#d4af37" opacity="0.88"/>
<path d="M 395 544 C 360 550, 335 535, 355 526 C 375 517, 405 524, 400 535 Z" fill="#d4af37" opacity="0.85"/>
<path d="M 525 495 C 540 482, 550 466, 545 452" fill="none" stroke="#d4af37" stroke-width="2.5"/>
<path d="M 555 460 C 565 444, 545 428, 505 430 C 520 440, 545 444, 538 455 Z" fill="#d4af37" opacity="0.78"/>
<circle cx="495" cy="578" r="3.5" fill="#d4af37"/>
<text x="300" y="218" text-anchor="middle" font-size="15" font-family="Georgia,serif" fill="#d4af37" letter-spacing="1">Company Name</text>
<text x="300" y="252" text-anchor="middle" font-size="10.5" font-family="Georgia,serif" fill="#b09020" letter-spacing="1">Company Message</text>
<text x="300" y="334" text-anchor="middle" font-size="23" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">Phone / Other</text>
<text x="300" y="370" text-anchor="middle" font-size="10.5" font-family="Georgia,serif" fill="#b09020">Web / Other</text>
</svg>`);
}

function rollupGreySalon() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#6b6b6b"/>
${imgPH(0, 0, 600, 205)}
<path d="M 488 230 C 545 236, 585 255, 555 274 C 530 290, 475 286, 465 270 C 455 255, 490 246, 525 258 C 545 266, 525 280, 490 278" fill="none" stroke="#d4af37" stroke-width="2.2" opacity="0.85"/>
<path d="M 475 282 C 520 292, 560 312, 540 334 C 520 352, 470 350, 460 336" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.75"/>
<path d="M 105 348 C 50 342, 15 360, 35 380 C 55 396, 110 392, 125 376 C 138 362, 100 353, 75 364 C 55 374, 75 388, 110 386" fill="none" stroke="#d4af37" stroke-width="2.2" opacity="0.85"/>
<text x="300" y="258" text-anchor="middle" font-size="14" font-family="Georgia,serif" fill="#d4af37" letter-spacing="1">Company Message</text>
<text x="300" y="308" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="white" font-weight="bold">Company Name</text>
<text x="300" y="408" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">Phone / Other</text>
<text x="300" y="442" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="rgba(255,255,255,0.65)">Web / Other</text>
</svg>`);
}

function rollupRealEstate() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
${imgPH(0, 0, 600, 212)}
<rect y="212" width="600" height="388" fill="#5b7fa6"/>
<text x="300" y="278" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="1">HEADLINE</text>
<polyline points="38,338 113,312 163,334 225,308 288,330 350,308 413,330 463,310 538,336" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="2"/>
<polyline points="225,308 288,284 350,308" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="2.5"/>
<rect x="243" y="308" width="115" height="30" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="2"/>
<text x="300" y="406" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="3">COMPANY NAME</text>
<text x="300" y="478" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="white">Phone / Other</text>
</svg>`);
}

function rollupCoralSandDollar() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#e87c65"/>
<circle cx="525" cy="60" r="56" fill="rgba(255,255,255,0.88)"/>
<circle cx="525" cy="60" r="46" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.4"/>
<ellipse cx="525" cy="26" rx="15" ry="16" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="525" cy="94" rx="15" ry="16" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="440" cy="60" rx="40" ry="6" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="610" cy="60" rx="40" ry="6" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<circle cx="525" cy="60" r="9" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.5"/>
<circle cx="435" cy="36" r="3" fill="rgba(255,255,255,0.7)"/>
<circle cx="465" cy="122" r="4" fill="rgba(255,255,255,0.5)"/>
<circle cx="380" cy="76" r="2.5" fill="rgba(255,255,255,0.6)"/>
<circle cx="-30" cy="540" r="82" fill="rgba(255,255,255,0.88)"/>
<circle cx="-30" cy="540" r="68" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.4"/>
<ellipse cx="-30" cy="506" rx="20" ry="22" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="-30" cy="574" rx="20" ry="22" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="-135" cy="540" rx="55" ry="8" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<ellipse cx="75" cy="540" rx="55" ry="8" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.55"/>
<circle cx="-30" cy="540" r="10" fill="none" stroke="#e87c65" stroke-width="1.5" opacity="0.5"/>
<circle cx="155" cy="500" r="3" fill="rgba(255,255,255,0.7)"/>
<circle cx="115" cy="468" r="2.5" fill="rgba(255,255,255,0.5)"/>
<circle cx="205" cy="562" r="2" fill="rgba(255,255,255,0.55)"/>
<text x="260" y="218" text-anchor="middle" font-size="34" font-family="Georgia,serif" fill="white">Your</text>
<text x="260" y="268" text-anchor="middle" font-size="34" font-family="Georgia,serif" fill="white">message</text>
<text x="260" y="318" text-anchor="middle" font-size="34" font-family="Georgia,serif" fill="white">here</text>
<text x="260" y="374" text-anchor="middle" font-size="13" font-family="Georgia,serif" font-style="italic" fill="white" font-weight="bold">Full Name</text>
</svg>`);
}

function rollupSunsetGradient() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#e8a020"/>
<rect width="600" height="100" fill="#cc2e0e"/>
<rect y="100" width="600" height="100" fill="#cc5010" opacity="0.82"/>
<rect y="200" width="600" height="100" fill="#cc7010" opacity="0.7"/>
<rect y="300" width="600" height="100" fill="#cc9520" opacity="0.6"/>
<rect y="400" width="600" height="100" fill="#c8b030" opacity="0.5"/>
<rect y="500" width="600" height="100" fill="#d4c040" opacity="0.4"/>
<ellipse cx="200" cy="220" rx="130" ry="90" fill="rgba(180,60,10,0.13)"/>
<ellipse cx="425" cy="380" rx="110" ry="110" fill="rgba(180,110,10,0.1)"/>
<text x="300" y="96" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="rgba(255,255,255,0.88)" letter-spacing="1">Company Message</text>
<text x="300" y="216" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="white">Company Name</text>
<text x="300" y="378" text-anchor="middle" font-size="28" font-family="Georgia,serif" fill="white" font-weight="bold">Phone / Other</text>
<text x="300" y="418" text-anchor="middle" font-size="12" font-family="Georgia,serif" fill="rgba(255,255,255,0.8)">Web / Other</text>
</svg>`);
}

function rollupPinkChevron() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#e05070"/>
<polygon points="0,0 50,0 75,20 100,0 150,0 175,20 200,0 250,0 275,20 300,0 350,0 375,20 400,0 450,0 475,20 500,0 550,0 575,20 600,0 600,30 575,20 550,30 500,30 475,20 450,30 400,30 375,20 350,30 300,30 275,20 250,30 200,30 175,20 150,30 100,30 75,20 50,30 0,30" fill="rgba(255,255,255,0.88)"/>
<polygon points="0,30 50,30 75,50 100,30 150,30 175,50 200,30 250,30 275,50 300,30 350,30 375,50 400,30 450,30 475,50 500,30 550,30 575,50 600,30 600,60 575,50 550,60 500,60 475,50 450,60 400,60 375,50 350,60 300,60 275,50 250,60 200,60 175,50 150,60 100,60 75,50 50,60 0,60" fill="rgba(255,175,188,0.82)"/>
<polygon points="0,60 50,60 75,80 100,60 150,60 175,80 200,60 250,60 275,80 300,60 350,60 375,80 400,60 450,60 475,80 500,60 550,60 575,80 600,60 600,90 575,80 550,90 500,90 475,80 450,90 400,90 375,80 350,90 300,90 275,80 250,90 200,90 175,80 150,90 100,90 75,80 50,90 0,90" fill="rgba(212,95,125,0.78)"/>
<polygon points="0,90 50,90 75,110 100,90 150,90 175,110 200,90 250,90 275,110 300,90 350,90 375,110 400,90 450,90 475,110 500,90 550,90 575,110 600,90 600,120 575,110 550,120 500,120 475,110 450,120 400,120 375,110 350,120 300,120 275,110 250,120 200,120 175,110 150,120 100,120 75,110 50,120 0,120" fill="rgba(188,55,90,0.72)"/>
<text x="80" y="196" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="white">Headline</text>
<text x="80" y="336" font-size="15" font-family="Arial,sans-serif" fill="rgba(50,15,25,0.6)">Company Name</text>
<text x="80" y="486" font-size="24" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>
</svg>`);
}

function rollupMintStripePhoto() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#ffffff"/>
<rect y="0" width="600" height="22" fill="#9dd4c5"/>
<rect y="44" width="600" height="22" fill="#9dd4c5"/>
${imgPH(0, 22, 600, 192)}
<rect y="214" width="600" height="22" fill="#9dd4c5"/>
<rect y="258" width="600" height="22" fill="#9dd4c5"/>
<rect y="302" width="600" height="22" fill="#9dd4c5"/>
<text x="300" y="384" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="#374151">your message</text>
<text x="300" y="416" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="#374151">here</text>
<rect y="458" width="600" height="38" fill="#9dd4c5"/>
<text x="300" y="482" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="#374151" letter-spacing="3">FULL NAME</text>
</svg>`);
}

function rollupSoftFloralCircle() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#f7f3f2"/>
<ellipse cx="200" cy="120" rx="213" ry="75" fill="#e4d0d8" opacity="0.5"/>
<ellipse cx="463" cy="78" rx="180" ry="62" fill="#c6d4e8" opacity="0.42"/>
<ellipse cx="313" cy="210" rx="263" ry="82" fill="#ddd0d4" opacity="0.38"/>
<ellipse cx="138" cy="185" rx="130" ry="44" fill="#d4c2cc" opacity="0.32"/>
<ellipse cx="475" cy="200" rx="150" ry="50" fill="#c8d8e0" opacity="0.28"/>
<rect x="13" y="0" width="5" height="600" fill="#c0aab4" opacity="0.28"/>
<rect x="583" y="0" width="5" height="600" fill="#c0aab4" opacity="0.28"/>
<circle cx="300" cy="178" r="82" fill="white" opacity="0.94"/>
<circle cx="300" cy="178" r="82" fill="none" stroke="#c0aab4" stroke-width="1.5" stroke-dasharray="4,4"/>
<text x="300" y="164" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#555" letter-spacing="1">headline</text>
<text x="300" y="196" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="#888">company</text>
<text x="300" y="316" text-anchor="middle" font-size="14" font-family="Georgia,serif" fill="#555">company name</text>
<text x="300" y="434" text-anchor="middle" font-size="16" font-family="Georgia,serif" fill="#777">phone / other</text>
</svg>`);
}

function rollupDarkWood() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#1a1a1a"/>
<line x1="0" y1="38" x2="600" y2="36" stroke="#242424" stroke-width="3"/>
<line x1="0" y1="82" x2="600" y2="84" stroke="#222" stroke-width="2"/>
<line x1="0" y1="126" x2="600" y2="130" stroke="#252525" stroke-width="4"/>
<line x1="0" y1="172" x2="600" y2="169" stroke="#1e1e1e" stroke-width="3"/>
<line x1="0" y1="218" x2="600" y2="222" stroke="#242424" stroke-width="2.5"/>
<line x1="0" y1="264" x2="600" y2="262" stroke="#222" stroke-width="3.5"/>
<line x1="0" y1="308" x2="600" y2="312" stroke="#1c1c1c" stroke-width="2"/>
<line x1="0" y1="352" x2="600" y2="348" stroke="#252525" stroke-width="4"/>
<line x1="0" y1="398" x2="600" y2="400" stroke="#222" stroke-width="2.5"/>
<line x1="0" y1="444" x2="600" y2="441" stroke="#1e1e1e" stroke-width="3"/>
<line x1="0" y1="488" x2="600" y2="490" stroke="#242424" stroke-width="2"/>
<line x1="0" y1="532" x2="600" y2="536" stroke="#222" stroke-width="3"/>
<line x1="0" y1="574" x2="600" y2="572" stroke="#252525" stroke-width="2.5"/>
<rect width="600" height="600" fill="rgba(80,50,20,0.12)"/>
<text x="300" y="188" text-anchor="middle" font-size="44" font-family="Georgia,serif" font-style="italic" fill="white">Your</text>
<text x="300" y="248" text-anchor="middle" font-size="44" font-family="Georgia,serif" font-style="italic" fill="white">message</text>
<text x="300" y="308" text-anchor="middle" font-size="44" font-family="Georgia,serif" font-style="italic" fill="white">here</text>
<line x1="25" y1="374" x2="575" y2="374" stroke="rgba(255,255,255,0.28)" stroke-width="1" stroke-dasharray="4,3"/>
<rect y="384" width="600" height="40" fill="rgba(255,255,255,0.1)"/>
<polygon points="0,384 45,404 0,424" fill="#1a1a1a"/>
<polygon points="600,384 555,404 600,424" fill="#1a1a1a"/>
<text x="300" y="409" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="white" letter-spacing="4" font-weight="bold">FULL NAME</text>
<line x1="25" y1="428" x2="575" y2="428" stroke="rgba(255,255,255,0.28)" stroke-width="1" stroke-dasharray="4,3"/>
</svg>`);
}

function rollupNavyConfettiPhoto() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
${imgPH(0, 0, 600, 190)}
<rect y="190" width="600" height="410" fill="#1e3a5f"/>
<rect x="30" y="202" width="540" height="386" fill="none" stroke="#c9a227" stroke-width="1.5"/>
<rect x="70" y="222" width="8" height="4" fill="white" opacity="0.35" transform="rotate(15 70 222)"/>
<rect x="170" y="242" width="6" height="3" fill="#c9a227" opacity="0.55" transform="rotate(-20 170 242)"/>
<rect x="280" y="218" width="7" height="3" fill="white" opacity="0.3" transform="rotate(35 280 218)"/>
<rect x="395" y="238" width="5" height="3" fill="#c9a227" opacity="0.5" transform="rotate(-10 395 238)"/>
<rect x="495" y="224" width="8" height="4" fill="white" opacity="0.3" transform="rotate(25 495 224)"/>
<rect x="95" y="545" width="7" height="3" fill="white" opacity="0.35" transform="rotate(-15 95 545)"/>
<rect x="205" y="562" width="6" height="3" fill="#c9a227" opacity="0.55" transform="rotate(20 205 562)"/>
<rect x="330" y="550" width="8" height="4" fill="white" opacity="0.3" transform="rotate(-35 330 550)"/>
<rect x="445" y="558" width="5" height="3" fill="#c9a227" opacity="0.45" transform="rotate(15 445 558)"/>
<rect x="530" y="544" width="7" height="3" fill="white" opacity="0.3" transform="rotate(-25 530 544)"/>
<rect x="138" y="382" width="6" height="3" fill="white" opacity="0.2" transform="rotate(30 138 382)"/>
<rect x="470" y="398" width="7" height="3" fill="#c9a227" opacity="0.35" transform="rotate(-18 470 398)"/>
<text x="300" y="314" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="1">YOUR</text>
<text x="300" y="354" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="1">MESSAGE</text>
<text x="300" y="394" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="1">HERE</text>
<text x="300" y="452" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)" letter-spacing="2">FULL NAME</text>
</svg>`);
}

// ── Template collections ───────────────────────────────────────────────────────
const BANNER_TEMPLATES = [
  {
    galleryName: "Vinyl Banner",
    designs: [
      { name: "Orange Vintage",  fn: outdoorOrangeVintage,  p: "#c84b1a", a: "#c84b1a", bg: "#c84b1a",  colors: [{ name: "Default", p: "#c84b1a", a: "#c84b1a" }] },
      { name: "Grand Opening",   fn: outdoorGrandOpening,   p: "#fbbf24", a: "#374151", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#374151" }] },
      { name: "Football Event",  fn: outdoorFootballEvent,  p: "#1e3a8a", a: "#fbbf24", bg: "#1e3a8a",  colors: [{ name: "Default", p: "#1e3a8a", a: "#fbbf24" }] },
      { name: "Concert Event",   fn: outdoorConcertEvent,   p: "#f59e0b", a: "#78350f", bg: "#f59e0b",  colors: [{ name: "Default", p: "#f59e0b", a: "#78350f" }] },
      { name: "For Lease",       fn: outdoorForLease,       p: "#ea6620", a: "#ea6620", bg: "#fdf6ed",  colors: [{ name: "Default", p: "#ea6620", a: "#ea6620" }] },
      { name: "Sale Banner",     fn: outdoorSaleBanner,     p: "#0284c7", a: "#0284c7", bg: "#0284c7",  colors: [{ name: "Default", p: "#0284c7", a: "#0284c7" }] },
      { name: "Red Company",     fn: outdoorRedCompany,     p: "#dc2626", a: "#dc2626", bg: "#dc2626",  colors: [{ name: "Default", p: "#dc2626", a: "#dc2626" }] },
      { name: "Patriotic",       fn: outdoorPatriotic,      p: "#b91c1c", a: "#1d4ed8", bg: "#ffffff",  colors: [{ name: "Default", p: "#b91c1c", a: "#1d4ed8" }] },
      { name: "Arrow Text",      fn: outdoorArrowText,      p: "#991b1b", a: "#991b1b", bg: "#ffffff",  colors: [{ name: "Default", p: "#991b1b", a: "#991b1b" }] },
      { name: "Teal House",      fn: outdoorTealHouse,      p: "#134e4a", a: "#d4af37", bg: "#134e4a",  colors: [{ name: "Default", p: "#134e4a", a: "#d4af37" }] },
      { name: "Yellow Office",   fn: outdoorYellowOffice,   p: "#fbbf24", a: "#78350f", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#78350f" }] },
      { name: "Medical EMS",     fn: outdoorMedicalEMS,     p: "#1d4ed8", a: "#dc2626", bg: "#ffffff",  colors: [{ name: "Default", p: "#1d4ed8", a: "#dc2626" }] },
      { name: "Hello Red",       fn: outdoorHelloRed,       p: "#dc2626", a: "#dc2626", bg: "#dc2626",  colors: [{ name: "Default", p: "#dc2626", a: "#dc2626" }] },
      { name: "Purple Photo",    fn: outdoorPurplePhoto,    p: "#7c3aed", a: "#7c3aed", bg: "#ffffff",  colors: [{ name: "Default", p: "#7c3aed", a: "#7c3aed" }] },
      { name: "Clearance Sale",  fn: outdoorClearanceSale,  p: "#fbbf24", a: "#dc2626", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#dc2626" }] },
    ],
  },

  {
    galleryName: "Large Outdoor Banner",
    designs: [
      { name: "Orange Vintage",  fn: outdoorOrangeVintage,  p: "#c84b1a", a: "#c84b1a", bg: "#c84b1a",  colors: [{ name: "Default", p: "#c84b1a", a: "#c84b1a" }] },
      { name: "Grand Opening",   fn: outdoorGrandOpening,   p: "#fbbf24", a: "#374151", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#374151" }] },
      { name: "Football Event",  fn: outdoorFootballEvent,  p: "#1e3a8a", a: "#fbbf24", bg: "#1e3a8a",  colors: [{ name: "Default", p: "#1e3a8a", a: "#fbbf24" }] },
      { name: "Concert Event",   fn: outdoorConcertEvent,   p: "#f59e0b", a: "#78350f", bg: "#f59e0b",  colors: [{ name: "Default", p: "#f59e0b", a: "#78350f" }] },
      { name: "For Lease",       fn: outdoorForLease,       p: "#ea6620", a: "#ea6620", bg: "#fdf6ed",  colors: [{ name: "Default", p: "#ea6620", a: "#ea6620" }] },
      { name: "Sale Banner",     fn: outdoorSaleBanner,     p: "#0284c7", a: "#0284c7", bg: "#0284c7",  colors: [{ name: "Default", p: "#0284c7", a: "#0284c7" }] },
      { name: "Red Company",     fn: outdoorRedCompany,     p: "#dc2626", a: "#dc2626", bg: "#dc2626",  colors: [{ name: "Default", p: "#dc2626", a: "#dc2626" }] },
      { name: "Patriotic",       fn: outdoorPatriotic,      p: "#b91c1c", a: "#1d4ed8", bg: "#ffffff",  colors: [{ name: "Default", p: "#b91c1c", a: "#1d4ed8" }] },
      { name: "Arrow Text",      fn: outdoorArrowText,      p: "#991b1b", a: "#991b1b", bg: "#ffffff",  colors: [{ name: "Default", p: "#991b1b", a: "#991b1b" }] },
      { name: "Teal House",      fn: outdoorTealHouse,      p: "#134e4a", a: "#d4af37", bg: "#134e4a",  colors: [{ name: "Default", p: "#134e4a", a: "#d4af37" }] },
      { name: "Yellow Office",   fn: outdoorYellowOffice,   p: "#fbbf24", a: "#78350f", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#78350f" }] },
      { name: "Medical EMS",     fn: outdoorMedicalEMS,     p: "#1d4ed8", a: "#dc2626", bg: "#ffffff",  colors: [{ name: "Default", p: "#1d4ed8", a: "#dc2626" }] },
      { name: "Hello Red",       fn: outdoorHelloRed,       p: "#dc2626", a: "#dc2626", bg: "#dc2626",  colors: [{ name: "Default", p: "#dc2626", a: "#dc2626" }] },
      { name: "Purple Photo",    fn: outdoorPurplePhoto,    p: "#7c3aed", a: "#7c3aed", bg: "#ffffff",  colors: [{ name: "Default", p: "#7c3aed", a: "#7c3aed" }] },
      { name: "Clearance Sale",  fn: outdoorClearanceSale,  p: "#fbbf24", a: "#dc2626", bg: "#fbbf24",  colors: [{ name: "Default", p: "#fbbf24", a: "#dc2626" }] },
    ],
  },

  {
    galleryName: "Standard Roll-Up Banner",
    designs: [
      { name: "Black Luxury",      fn: rollupBlackLuxury,      p: "#0c0c0c", a: "#d4af37", bg: "#0c0c0c",  colors: [{ name: "Default", p: "#0c0c0c", a: "#d4af37" }] },
      { name: "Grey Salon",        fn: rollupGreySalon,        p: "#6b6b6b", a: "#d4af37", bg: "#6b6b6b",  colors: [{ name: "Default", p: "#6b6b6b", a: "#d4af37" }] },
      { name: "Real Estate",       fn: rollupRealEstate,       p: "#5b7fa6", a: "#5b7fa6", bg: "#5b7fa6",  colors: [{ name: "Default", p: "#5b7fa6", a: "#5b7fa6" }] },
      { name: "Coral Sand Dollar", fn: rollupCoralSandDollar,  p: "#e87c65", a: "#e87c65", bg: "#e87c65",  colors: [{ name: "Default", p: "#e87c65", a: "#e87c65" }] },
      { name: "Sunset Gradient",   fn: rollupSunsetGradient,   p: "#cc2e0e", a: "#e8a020", bg: "#cc2e0e",  colors: [{ name: "Default", p: "#cc2e0e", a: "#e8a020" }] },
      { name: "Pink Chevron",      fn: rollupPinkChevron,      p: "#e05070", a: "#e05070", bg: "#e05070",  colors: [{ name: "Default", p: "#e05070", a: "#e05070" }] },
      { name: "Mint Stripe Photo", fn: rollupMintStripePhoto,  p: "#9dd4c5", a: "#374151", bg: "#ffffff",  colors: [{ name: "Default", p: "#9dd4c5", a: "#374151" }] },
      { name: "Soft Floral",       fn: rollupSoftFloralCircle, p: "#c0aab4", a: "#555555", bg: "#f7f3f2",  colors: [{ name: "Default", p: "#c0aab4", a: "#555555" }] },
      { name: "Dark Wood",         fn: rollupDarkWood,         p: "#1a1a1a", a: "#1a1a1a", bg: "#1a1a1a",  colors: [{ name: "Default", p: "#1a1a1a", a: "#1a1a1a" }] },
      { name: "Navy Confetti",     fn: rollupNavyConfettiPhoto, p: "#1e3a5f", a: "#c9a227", bg: "#1e3a5f", colors: [{ name: "Default", p: "#1e3a5f", a: "#c9a227" }] },
    ],
  },

  {
    galleryName: "Premium Roll-Up Banner",
    designs: [
      { name: "Black Luxury",      fn: rollupBlackLuxury,      p: "#0c0c0c", a: "#d4af37", bg: "#0c0c0c",  colors: [{ name: "Default", p: "#0c0c0c", a: "#d4af37" }] },
      { name: "Grey Salon",        fn: rollupGreySalon,        p: "#6b6b6b", a: "#d4af37", bg: "#6b6b6b",  colors: [{ name: "Default", p: "#6b6b6b", a: "#d4af37" }] },
      { name: "Real Estate",       fn: rollupRealEstate,       p: "#5b7fa6", a: "#5b7fa6", bg: "#5b7fa6",  colors: [{ name: "Default", p: "#5b7fa6", a: "#5b7fa6" }] },
      { name: "Coral Sand Dollar", fn: rollupCoralSandDollar,  p: "#e87c65", a: "#e87c65", bg: "#e87c65",  colors: [{ name: "Default", p: "#e87c65", a: "#e87c65" }] },
      { name: "Sunset Gradient",   fn: rollupSunsetGradient,   p: "#cc2e0e", a: "#e8a020", bg: "#cc2e0e",  colors: [{ name: "Default", p: "#cc2e0e", a: "#e8a020" }] },
      { name: "Pink Chevron",      fn: rollupPinkChevron,      p: "#e05070", a: "#e05070", bg: "#e05070",  colors: [{ name: "Default", p: "#e05070", a: "#e05070" }] },
      { name: "Mint Stripe Photo", fn: rollupMintStripePhoto,  p: "#9dd4c5", a: "#374151", bg: "#ffffff",  colors: [{ name: "Default", p: "#9dd4c5", a: "#374151" }] },
      { name: "Soft Floral",       fn: rollupSoftFloralCircle, p: "#c0aab4", a: "#555555", bg: "#f7f3f2",  colors: [{ name: "Default", p: "#c0aab4", a: "#555555" }] },
      { name: "Dark Wood",         fn: rollupDarkWood,         p: "#1a1a1a", a: "#1a1a1a", bg: "#1a1a1a",  colors: [{ name: "Default", p: "#1a1a1a", a: "#1a1a1a" }] },
      { name: "Navy Confetti",     fn: rollupNavyConfettiPhoto, p: "#1e3a5f", a: "#c9a227", bg: "#1e3a5f", colors: [{ name: "Default", p: "#1e3a5f", a: "#c9a227" }] },
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

const PRODUCT_SLUG = "vinyl-banners";

const run = db.transaction(() => {
  const cleared = db.prepare("DELETE FROM gallery_templates WHERE product_slug = ?").run(PRODUCT_SLUG).changes;
  console.log(`Cleared ${cleared} existing gallery template(s) for "${PRODUCT_SLUG}"\n`);

  let galleries = 0, totalDesigns = 0, totalColors = 0;

  for (const col of BANNER_TEMPLATES) {
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
