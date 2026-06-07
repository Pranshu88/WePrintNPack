/**
 * Seed script — stickers-and-labels gallery templates
 * Run: node scripts/seed-stickers.mjs
 * Shapes: Circle Labels, Oval Labels, Rectangle Labels, Square Labels
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

let _c = 0;
function uid() { return `sk${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

/** Grey placeholder box with camera icon + "Upload your photo" */
function imgPlaceholder(x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cs = Math.min(w, h) * 0.2;
  const sw = Math.max(1.5, cs * 0.1);
  const fs = Math.max(8, h * 0.11);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db"/>` +
    `<rect x="${cx - cs}" y="${cy - cs * 0.58}" width="${cs * 2}" height="${cs * 1.38}" rx="${cs * 0.14}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<rect x="${cx - cs * 0.28}" y="${cy - cs}" width="${cs * 0.56}" height="${cs * 0.5}" rx="${cs * 0.1}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy + cs * 0.08}" r="${cs * 0.38}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<text x="${cx}" y="${cy + cs * 1.32}" text-anchor="middle" font-size="${fs}" font-family="Arial,sans-serif" fill="#9ca3af">Upload your photo</text>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUND BADGE / SHIELD / HEXAGON LABEL DESIGNS
// ═══════════════════════════════════════════════════════════════════════════════

function labelRoundBadge(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f8fafc"/>
<circle cx="200" cy="200" r="185" fill="${p}"/>
<circle cx="200" cy="200" r="175" fill="none" stroke="${a}" stroke-width="2" opacity="0.5"/>
<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
<text x="200" y="148" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="5" font-weight="bold">COMPANY NAME</text>
<line x1="90" y1="166" x2="310" y2="166" stroke="${a}" stroke-width="1" opacity="0.4"/>
<text x="200" y="226" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<line x1="90" y1="250" x2="310" y2="250" stroke="${a}" stroke-width="1" opacity="0.4"/>
<text x="200" y="278" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="3">YOUR TAGLINE</text>
<text x="200" y="310" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">www.example.com</text>
</svg>`);
}

function labelShieldShape(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420">
<rect width="400" height="420" fill="#f8fafc"/>
<path d="M200,20 L360,80 L360,240 Q360,360 200,400 Q40,360 40,240 L40,80 Z" fill="${p}"/>
<path d="M200,34 L346,88 L346,242 Q346,350 200,388 Q54,350 54,242 L54,88 Z" fill="none" stroke="${a}" stroke-width="2" opacity="0.45"/>
<text x="200" y="148" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">COMPANY</text>
<text x="200" y="168" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">NAME</text>
<text x="200" y="226" text-anchor="middle" font-size="50" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<line x1="100" y1="256" x2="300" y2="256" stroke="${a}" stroke-width="1.5" opacity="0.4"/>
<text x="200" y="290" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="2">YOUR TAGLINE</text>
<text x="200" y="332" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)">www.example.com</text>
</svg>`);
}

function labelHexagon(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440">
<rect width="400" height="440" fill="#f8fafc"/>
<polygon points="200,16 370,110 370,330 200,424 30,330 30,110" fill="${p}"/>
<polygon points="200,30 356,118 356,322 200,410 44,322 44,118" fill="none" stroke="${a}" stroke-width="2" opacity="0.4"/>
<text x="200" y="152" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<line x1="90" y1="168" x2="310" y2="168" stroke="${a}" stroke-width="1" opacity="0.35"/>
<text x="200" y="240" text-anchor="middle" font-size="54" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<line x1="90" y1="266" x2="310" y2="266" stroke="${a}" stroke-width="1" opacity="0.35"/>
<text x="200" y="298" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="3">YOUR TAGLINE</text>
<text x="200" y="336" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.38)">www.example.com</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CIRCLE LABEL DESIGNS  (viewBox 400×400)
// ═══════════════════════════════════════════════════════════════════════════════

function circleMonogram(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<text x="200" y="222" text-anchor="middle" font-size="130" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<text x="200" y="268" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="4">COMPANY NAME</text>
<text x="200" y="296" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)" letter-spacing="2">phone / other</text>
</svg>`);
}

function circleThankYou(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<text x="200" y="182" text-anchor="middle" font-size="58" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">THANK</text>
<text x="200" y="244" text-anchor="middle" font-size="58" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOU</text>
<line x1="110" y1="258" x2="290" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
<text x="200" y="290" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="3">COMPANY NAME</text>
</svg>`);
}

function circleRetroRings(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="#3a1206"/>
<circle cx="200" cy="200" r="168" fill="${p}"/>
<circle cx="200" cy="200" r="140" fill="#e6b830"/>
<circle cx="200" cy="200" r="110" fill="#c0441e"/>
<circle cx="200" cy="200" r="78"  fill="#8b1a1a"/>
<rect x="12" y="174" width="376" height="52" fill="#3a1206"/>
<text x="200" y="207" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">Company Name</text>
</svg>`);
}

function circleLogoName(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
${imgPlaceholder(145, 108, 110, 88)}
<text x="200" y="248" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="200" y="275" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="${p}" opacity="0.75">Product Name</text>
</svg>`);
}

function circleGoldBorder(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
<circle cx="200" cy="200" r="180" fill="none" stroke="${p}" stroke-width="8"/>
<circle cx="200" cy="200" r="168" fill="none" stroke="${p}" stroke-width="2"/>
<text x="200" y="106" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a" letter-spacing="3">Product Name</text>
${imgPlaceholder(140, 122, 120, 96)}
<text x="200" y="268" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Company Name</text>
<text x="200" y="292" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#6b7280">Product / Service Description</text>
<text x="200" y="316" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9ca3af">Web / Other</text>
</svg>`);
}

function circleVintageEvent(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs>
  <pattern id="diag" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(0,0,0,0.07)" stroke-width="5"/>
  </pattern>
</defs>
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<circle cx="200" cy="200" r="188" fill="url(#diag)"/>
<text x="200" y="128" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#e6b830" letter-spacing="3">COMPANY NAME</text>
<line x1="92" y1="140" x2="308" y2="140" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="200" y="188" text-anchor="middle" font-size="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#e6b830">YOUR TEXT</text>
<text x="200" y="225" text-anchor="middle" font-size="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#e6b830">HERE</text>
<line x1="92" y1="242" x2="308" y2="242" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="200" y="270" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)" letter-spacing="2">LOCATION</text>
<text x="200" y="308" text-anchor="middle" font-size="22" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff" letter-spacing="2">DATE</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OVAL LABEL DESIGNS  (viewBox 500×340)
// ═══════════════════════════════════════════════════════════════════════════════

function ovalColorfulBorder() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340">
<rect width="500" height="340" fill="#f0ede8"/>
<path d="M250,12 A237,158 0 0,1 487,170" stroke="#f97316" stroke-width="46" fill="none"/>
<path d="M487,170 A237,158 0 0,1 250,328" stroke="#ec4899" stroke-width="46" fill="none"/>
<path d="M250,328 A237,158 0 0,1 13,170" stroke="#14b8a6" stroke-width="46" fill="none"/>
<path d="M13,170 A237,158 0 0,1 250,12" stroke="#a855f7" stroke-width="46" fill="none"/>
<circle cx="250" cy="12"  r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="418" cy="58"  r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="487" cy="170" r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="418" cy="282" r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="250" cy="328" r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="82"  cy="282" r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="13"  cy="170" r="5" fill="#1a1a1a" opacity="0.45"/>
<circle cx="82"  cy="58"  r="5" fill="#1a1a1a" opacity="0.45"/>
<ellipse cx="250" cy="170" rx="192" ry="112" fill="#ffffff"/>
<ellipse cx="250" cy="170" rx="186" ry="106" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
<text x="250" y="140" text-anchor="middle" font-size="34" font-family="Georgia,serif" font-weight="bold" fill="#1a1a1a" letter-spacing="1">ORDER ONLINE</text>
<text x="250" y="163" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280" letter-spacing="3">WEB / OTHER</text>
<line x1="140" y1="175" x2="360" y2="175" stroke="#1a1a1a" stroke-width="1"/>
<text x="250" y="204" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#1a1a1a">Company Name</text>
</svg>`);
}

function ovalSimpleClean(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340">
<rect width="500" height="340" fill="#f0ede8"/>
<ellipse cx="250" cy="170" rx="238" ry="158" fill="#ffffff" stroke="${p}" stroke-width="8"/>
<ellipse cx="250" cy="170" rx="218" ry="138" fill="none" stroke="${p}" stroke-width="2" opacity="0.4"/>
<text x="250" y="122" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="${p}" letter-spacing="4">COMPANY NAME</text>
<line x1="125" y1="136" x2="375" y2="136" stroke="${p}" stroke-width="1.5" opacity="0.4"/>
<text x="250" y="186" text-anchor="middle" font-size="28" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
<line x1="125" y1="202" x2="375" y2="202" stroke="${p}" stroke-width="1.5" opacity="0.4"/>
<text x="250" y="228" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280" letter-spacing="2">Web / Other</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RECTANGLE LABEL DESIGNS  (viewBox 560×340, landscape)
// ═══════════════════════════════════════════════════════════════════════════════

function rectProductLabel(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
${imgPlaceholder(210, 28, 140, 108)}
<text x="280" y="164" text-anchor="middle" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
<rect x="8" y="190" width="544" height="30" fill="${p}"/>
<rect x="8" y="190" width="544" height="142" fill="${p}"/>
<rect x="8" y="298" width="544" height="34" rx="16" fill="${p}"/>
<text x="280" y="244" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
<text x="280" y="282" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Web / Other</text>
</svg>`);
}

function rectDarkProfessional(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="${p}"/>
<rect x="256" y="42" width="48" height="13" rx="3" fill="#22d3ee"/>
<rect x="271" y="28" width="18" height="42" rx="3" fill="#22d3ee"/>
<text x="280" y="134" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="280" y="170" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="3">BUSINESS TYPE</text>
<text x="280" y="222" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)" letter-spacing="2">WEB / OTHER</text>
</svg>`);
}

function rectVintageBadge(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="14" fill="#f5f0e8"/>
<rect x="8" y="8" width="112" height="324" rx="14" fill="${p}"/>
<rect x="92" y="8" width="28" height="324" fill="${p}"/>
<polygon points="64,112 90,142 64,172 38,142" fill="#f5f0e8"/>
<circle cx="64" cy="142" r="14" fill="${p}"/>
<circle cx="64" cy="142" r="8" fill="none" stroke="#f5f0e8" stroke-width="1.5"/>
<rect x="120" y="80" width="432" height="60" fill="#9b2335"/>
<text x="336" y="120" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#ffffff" font-style="italic">Product Name</text>
<text x="336" y="178" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a" letter-spacing="2">COMPANY NAME</text>
<text x="336" y="212" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#9b2335">Web / Other</text>
</svg>`);
}

function rectTechDark(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<defs>
  <pattern id="dotpat" width="12" height="12" patternUnits="userSpaceOnUse">
    <circle cx="6" cy="6" r="1" fill="rgba(255,255,255,0.04)"/>
  </pattern>
</defs>
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="${p}"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="url(#dotpat)"/>
<polygon points="280,34 263,68 271,68 257,98 298,61 285,61" fill="#3b82f6"/>
<text x="280" y="126" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Product Name</text>
<text x="280" y="164" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Enter a brief description of the products or services</text>
<text x="280" y="180" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">that you offer and why customers should choose you.</text>
<text x="280" y="246" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-style="italic" fill="#3b82f6">Company Name</text>
<text x="280" y="280" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.38)">Web / Other</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SQUARE LABEL DESIGNS  (viewBox 400×400)
// ═══════════════════════════════════════════════════════════════════════════════

function squareSplitVertical(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="#ffffff"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
<text x="200" y="62" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
${imgPlaceholder(130, 78, 140, 112)}
<rect x="8" y="218" width="384" height="174" fill="${p}"/>
<rect x="8" y="374" width="384" height="18" rx="20" fill="${p}"/>
<text x="200" y="300" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
<text x="200" y="336" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Web / Other</text>
</svg>`);
}

function squareCompactLabel(p) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
<rect x="8" y="8" width="384" height="126" rx="20" fill="${p}"/>
<rect x="8" y="108" width="384" height="26" fill="${p}"/>
<text x="200" y="66" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="200" y="96" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Business Type</text>
${imgPlaceholder(150, 148, 100, 80)}
<text x="200" y="284" text-anchor="middle" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
<text x="200" y="316" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280">Product / Service Description</text>
<text x="200" y="346" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#9ca3af">Web / Other</text>
</svg>`);
}

// ── Template collections ───────────────────────────────────────────────────────
const STICKER_TEMPLATES = [
  {
    galleryName: "Circle Labels",
    designs: [
      {
        name: "Retro Rings",
        fn: (p) => circleRetroRings(p), p: "#c8832a", a: "#c8832a", bg: "#f0ede8",
        colors: [
          { name: "Warm Brown", p: "#c8832a" },
          { name: "Navy",       p: "#1e3a5f" },
          { name: "Teal",       p: "#0d9488" },
          { name: "Burgundy",   p: "#7f1d1d" },
        ],
      },
      {
        name: "Monogram Dark",
        fn: (p) => circleMonogram(p), p: "#09090b", a: "#09090b", bg: "#f0ede8",
        colors: [
          { name: "Black",     p: "#09090b" },
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Forest",    p: "#14532d" },
        ],
      },
      {
        name: "Thank You",
        fn: (p) => circleThankYou(p), p: "#e8736a", a: "#e8736a", bg: "#f0ede8",
        colors: [
          { name: "Coral",     p: "#e8736a" },
          { name: "Teal",      p: "#0d9488" },
          { name: "Purple",    p: "#7c3aed" },
          { name: "Navy",      p: "#1e3a5f" },
        ],
      },
      {
        name: "Logo & Name",
        fn: (p) => circleLogoName(p), p: "#1e40af", a: "#1e40af", bg: "#f0ede8",
        colors: [
          { name: "Blue",      p: "#1e40af" },
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Teal",      p: "#0d9488" },
          { name: "Purple",    p: "#7c3aed" },
        ],
      },
      {
        name: "Gold Border",
        fn: (p) => circleGoldBorder(p), p: "#d4af37", a: "#d4af37", bg: "#f0ede8",
        colors: [
          { name: "Gold",      p: "#d4af37" },
          { name: "Rose Gold", p: "#c09070" },
          { name: "Silver",    p: "#9ca3af" },
          { name: "Bronze",    p: "#8b6914" },
        ],
      },
      {
        name: "Vintage Event",
        fn: (p) => circleVintageEvent(p), p: "#4a6b60", a: "#4a6b60", bg: "#f0ede8",
        colors: [
          { name: "Sage",      p: "#4a6b60" },
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Charcoal",  p: "#374151" },
        ],
      },
    ],
  },

  {
    galleryName: "Oval Labels",
    designs: [
      {
        name: "Colorful Border",
        fn: () => ovalColorfulBorder(), p: "#ec4899", a: "#ec4899", bg: "#f0ede8",
        colors: [
          { name: "Multicolor", p: "#ec4899" },
        ],
      },
      {
        name: "Clean Oval",
        fn: (p) => ovalSimpleClean(p), p: "#1e3a5f", a: "#1e3a5f", bg: "#f0ede8",
        colors: [
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Forest",    p: "#14532d" },
          { name: "Purple",    p: "#7c3aed" },
        ],
      },
    ],
  },

  {
    galleryName: "Rectangle Labels",
    designs: [
      {
        name: "Product Label",
        fn: (p) => rectProductLabel(p), p: "#8b1a2a", a: "#8b1a2a", bg: "#f0ede8",
        colors: [
          { name: "Burgundy",  p: "#8b1a2a" },
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Forest",    p: "#14532d" },
          { name: "Charcoal",  p: "#374151" },
        ],
      },
      {
        name: "Dark Professional",
        fn: (p) => rectDarkProfessional(p), p: "#0f172a", a: "#0f172a", bg: "#f0ede8",
        colors: [
          { name: "Navy Dark",  p: "#0f172a" },
          { name: "Forest Dark",p: "#0a3622" },
          { name: "Charcoal",   p: "#1f2937" },
          { name: "Burgundy",   p: "#3b0b0b" },
        ],
      },
      {
        name: "Vintage Badge",
        fn: (p) => rectVintageBadge(p), p: "#1e3a5f", a: "#1e3a5f", bg: "#f0ede8",
        colors: [
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Forest",    p: "#14532d" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Charcoal",  p: "#374151" },
        ],
      },
      {
        name: "Tech Dark",
        fn: (p) => rectTechDark(p), p: "#1a1f2e", a: "#1a1f2e", bg: "#f0ede8",
        colors: [
          { name: "Dark Blue",  p: "#1a1f2e" },
          { name: "Charcoal",   p: "#1f2937" },
          { name: "Navy",       p: "#1e3a5f" },
          { name: "Forest",     p: "#0a3622" },
        ],
      },
    ],
  },

  {
    galleryName: "Square Labels",
    designs: [
      {
        name: "Split Vertical",
        fn: (p) => squareSplitVertical(p), p: "#3b2f8f", a: "#3b2f8f", bg: "#f0ede8",
        colors: [
          { name: "Purple",    p: "#3b2f8f" },
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Forest",    p: "#14532d" },
        ],
      },
      {
        name: "Compact Label",
        fn: (p) => squareCompactLabel(p), p: "#1e3a5f", a: "#1e3a5f", bg: "#f0ede8",
        colors: [
          { name: "Navy",      p: "#1e3a5f" },
          { name: "Teal",      p: "#0d9488" },
          { name: "Burgundy",  p: "#7f1d1d" },
          { name: "Charcoal",  p: "#374151" },
        ],
      },
    ],
  },

  {
    galleryName: "Round Badge Labels",
    designs: [
      {
        name: "Round Badge",
        fn: (p, a) => labelRoundBadge(p, a), p: "#1e3a5f", a: "#06b6d4", bg: "#f8fafc",
        colors: [
          { name: "Navy",     p: "#1e3a5f", a: "#06b6d4" },
          { name: "Forest",   p: "#14532d", a: "#86efac" },
          { name: "Burgundy", p: "#7f1d1d", a: "#fca5a5" },
          { name: "Purple",   p: "#6d28d9", a: "#ddd6fe" },
        ],
      },
    ],
  },

  {
    galleryName: "Shield Labels",
    designs: [
      {
        name: "Shield Shape",
        fn: (p, a) => labelShieldShape(p, a), p: "#1d4ed8", a: "#fbbf24", bg: "#f8fafc",
        colors: [
          { name: "Royal Blue", p: "#1d4ed8", a: "#fbbf24" },
          { name: "Black Gold", p: "#09090b", a: "#d97706" },
          { name: "Teal",       p: "#0d9488", a: "#fbbf24" },
          { name: "Crimson",    p: "#7f1d1d", a: "#fca5a5" },
        ],
      },
    ],
  },

  {
    galleryName: "Hexagon Labels",
    designs: [
      {
        name: "Hexagon",
        fn: (p, a) => labelHexagon(p, a), p: "#0d9488", a: "#fbbf24", bg: "#f8fafc",
        colors: [
          { name: "Teal Gold",  p: "#0d9488", a: "#fbbf24" },
          { name: "Navy",       p: "#1e3a5f", a: "#06b6d4" },
          { name: "Emerald",    p: "#059669", a: "#fbbf24" },
          { name: "Charcoal",   p: "#374151", a: "#9ca3af" },
        ],
      },
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

const PRODUCT_SLUG = "stickers-and-labels";

const run = db.transaction(() => {
  const cleared = db.prepare("DELETE FROM gallery_templates WHERE product_slug = ?").run(PRODUCT_SLUG).changes;
  console.log(`Cleared ${cleared} existing gallery template(s) for "${PRODUCT_SLUG}"\n`);

  let galleries = 0, totalDesigns = 0, totalColors = 0;

  for (const col of STICKER_TEMPLATES) {
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
        const varImg = d.fn(c.p, c.a ?? c.p);
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
