/**
 * Seed script — yard-signs gallery templates
 * Run: node scripts/seed-yardsigns.mjs
 *
 * Gallery 1: Elite Yard Sign    (3 designs — unchanged)
 * Gallery 2: Business Yard Sign (13 designs — from screenshots)
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
function uid() { return `ys${String(++_c).padStart(4, "0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

/** Photo placeholder — editor renders the Upload Photo UI when src is empty */
function imgPH(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db" data-placeholder="photo"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ELITE YARD SIGN LAYOUTS  (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

function yardBoldSplit(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect width="220" height="450" fill="${p}"/>
<rect x="220" width="8" height="450" fill="${a}" opacity="0.7"/>
<text x="110" y="160" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="3">COMPANY</text>
<text x="110" y="182" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3" font-weight="bold">NAME</text>
<line x1="50" y1="202" x2="170" y2="202" stroke="${a}" stroke-width="1" opacity="0.4"/>
<text x="110" y="232" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)" letter-spacing="2">www.company.com</text>
<text x="110" y="252" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)">+1 234 567 8900</text>
<text x="415" y="168" text-anchor="middle" font-size="46" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">YOUR</text>
<text x="415" y="224" text-anchor="middle" font-size="34" font-family="Georgia,serif" font-weight="bold" fill="#111827">MESSAGE</text>
<line x1="248" y1="248" x2="572" y2="248" stroke="${a}" stroke-width="2.5"/>
<text x="415" y="286" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#6b7280">Supporting text or tagline here</text>
<text x="415" y="324" text-anchor="middle" font-size="11.5" font-family="Arial,sans-serif" fill="#9ca3af">www.example.com  ·  +1 234 567 8900</text>
<rect x="300" y="356" width="230" height="40" rx="6" fill="${p}"/>
<text x="415" y="381" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">CALL TO ACTION</text>
</svg>`);
}

function yardFullColor(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<polygon points="0,0 300,0 0,450" fill="rgba(255,255,255,0.04)"/>
<polygon points="600,450 300,450 600,0" fill="rgba(0,0,0,0.12)"/>
<line x1="0" y1="45" x2="600" y2="45" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<line x1="0" y1="405" x2="600" y2="405" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
<text x="300" y="30" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6">COMPANY NAME</text>
<text x="300" y="200" text-anchor="middle" font-size="56" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="2">YOUR</text>
<text x="300" y="258" text-anchor="middle" font-size="38" font-family="Georgia,serif" font-weight="bold" fill="${a}">MESSAGE</text>
<line x1="120" y1="282" x2="480" y2="282" stroke="${a}" stroke-width="2" opacity="0.55"/>
<text x="300" y="316" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="2">TAGLINE OR SUB-HEADING</text>
<text x="300" y="350" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">www.example.com  ·  +1 234 567 8900</text>
<text x="300" y="424" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" opacity="0.6">COMPANY NAME  ·  EST. 2010</text>
</svg>`);
}

function yardCleanBorder(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="8" y="8" width="584" height="434" fill="none" stroke="${p}" stroke-width="5"/>
<rect x="18" y="18" width="564" height="414" fill="none" stroke="${a}" stroke-width="1.5"/>
<text x="300" y="68" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<line x1="80" y1="84" x2="520" y2="84" stroke="${p}" stroke-width="2.5"/>
<text x="300" y="196" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="${p}">YOUR</text>
<text x="300" y="252" text-anchor="middle" font-size="36" font-family="Georgia,serif" fill="#111827" font-weight="bold">MESSAGE HERE</text>
<line x1="80" y1="276" x2="520" y2="276" stroke="${a}" stroke-width="2.5"/>
<text x="300" y="316" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#374151">Supporting message or tagline</text>
<text x="300" y="348" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="${p}" font-weight="bold">www.example.com  ·  +1 234 567 8900</text>
<line x1="80" y1="374" x2="520" y2="374" stroke="${p}" stroke-width="2.5"/>
<text x="300" y="412" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9ca3af">hello@example.com  ·  123 Street Address  ·  City</text>
</svg>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BUSINESS YARD SIGN LAYOUTS  (13 new designs from screenshots)
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Luxury Dark Pattern Banner
function ysLuxuryPattern(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 180">
<rect width="700" height="180" fill="${p}"/>
<circle cx="350" cy="90" r="180" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="30"/>
<circle cx="350" cy="90" r="130" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="20"/>
<circle cx="350" cy="90" r="80"  fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14"/>
<circle cx="350" cy="90" r="40"  fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="8"/>
<rect x="28" y="30" width="120" height="120" rx="4" fill="none" stroke="${a}" stroke-width="1.5"/>
<rect x="40" y="42" width="96" height="96" rx="2" fill="none" stroke="${a}" stroke-width="1"/>
<rect x="60" y="62" width="56" height="56" rx="2" fill="none" stroke="${a}" stroke-width="1"/>
<line x1="28" y1="90" x2="148" y2="90" stroke="${a}" stroke-width="0.8" opacity="0.5"/>
<line x1="88" y1="30" x2="88" y2="150" stroke="${a}" stroke-width="0.8" opacity="0.5"/>
<text x="192" y="82" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="3">COMPANY NAME</text>
<text x="192" y="118" font-size="18" font-family="Arial,sans-serif" fill="${a}" opacity="0.7" letter-spacing="1">COMPANY MESSAGE</text>
</svg>`);
}

// 2. Building / Real Estate
function ysBuilding(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<rect x="268" y="80" width="22" height="130" fill="#ffffff"/>
<rect x="296" y="100" width="64" height="110" fill="#ffffff"/>
<rect x="262" y="78" width="106" height="10" fill="#ffffff"/>
<line x1="274" y1="105" x2="262" y2="118" stroke="${p}" stroke-width="2.5"/>
<line x1="274" y1="122" x2="262" y2="135" stroke="${p}" stroke-width="2.5"/>
<line x1="274" y1="139" x2="262" y2="152" stroke="${p}" stroke-width="2.5"/>
<line x1="274" y1="156" x2="262" y2="169" stroke="${p}" stroke-width="2.5"/>
<text x="300" y="256" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">COMPANY NAME</text>
<text x="300" y="288" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">location</text>
<rect x="0" y="348" width="600" height="102" fill="#ffffff"/>
<text x="300" y="412" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" fill="${p}">phone / other</text>
</svg>`);
}

// 3. Arrow Sign (left-pointing)
function ysArrowLeft(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#f0ede8"/>
<polygon points="10,225 200,60 200,148 580,148 580,302 200,302 200,390" fill="${p}"/>
<text x="360" y="220" text-anchor="middle" font-size="50" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">Wedding</text>
<text x="370" y="272" text-anchor="middle" font-size="40" font-family="Georgia,serif" font-style="italic" fill="#ffffff">this way</text>
</svg>`);
}

// 4. Image + Headline Banner
function ysImageHeadline(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
${imgPH(0, 0, 220, 450)}
<text x="410" y="145" text-anchor="middle" font-size="34" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR HEADLINE</text>
<text x="410" y="194" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)">Company Name</text>
<text x="410" y="260" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">999-888-7777</text>
<text x="410" y="290" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">www.yourwebsite.com</text>
</svg>`);
}

// 5. Photo / Logo Company Portrait
function ysPhotoCompany(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="2"/>
${imgPH(185, 34, 230, 148, "Your Photo or Logo Here")}
<text x="300" y="228" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Company Name</text>
<text x="300" y="278" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#6b7280">Company Message</text>
<text x="300" y="378" text-anchor="middle" font-size="38" font-family="Arial,sans-serif" fill="#1a1a1a">Phone / Other</text>
</svg>`);
}

// 6. Blue Double Border
function ysBlueBorder(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="6" y="6" width="588" height="438" fill="none" stroke="${p}" stroke-width="14"/>
<rect x="26" y="26" width="548" height="398" fill="none" stroke="${p}" stroke-width="2.5"/>
<text x="300" y="150" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Phone / Other</text>
<text x="300" y="204" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="300" y="298" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-style="italic" fill="#6b7280">Company Message</text>
</svg>`);
}

// 7. Black Luxury Real Estate
function ysBlackRealEstate(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<polygon points="46,56 82,84 118,56 108,56 82,76 56,56" fill="${a}"/>
<polygon points="46,76 82,104 118,76 108,76 82,96 56,76" fill="${a}"/>
<text x="390" y="72" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="92" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="112" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="132" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="152" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="172" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="44" y="242" font-size="38" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="2">COMPANY NAME</text>
<text x="44" y="276" font-size="13" font-family="Arial,sans-serif" fill="${a}" opacity="0.55" letter-spacing="1">LOCATION</text>
<text x="44" y="378" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="2">PHONE / OTHER</text>
<text x="44" y="410" font-size="13" font-family="Arial,sans-serif" fill="${a}" opacity="0.5" letter-spacing="1">WEB / OTHER</text>
</svg>`);
}

// 8. Blue ID / Professional with Person Photo
function ysBlueID(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="0" y="0" width="600" height="96" fill="${p}"/>
<text x="300" y="58" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
${imgPH(28, 118, 170, 210, "Your Photo Here")}
<text x="400" y="230" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Full Name</text>
<rect x="0" y="354" width="600" height="96" fill="${p}"/>
<text x="300" y="412" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Phone / Other</text>
</svg>`);
}

// 9. Monogram Banner
function ysMonogramBanner(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<text x="105" y="185" text-anchor="middle" font-size="100" font-family="Georgia,serif" fill="rgba(255,255,255,0.9)">H</text>
<text x="105" y="260" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="3">COMPANY</text>
<text x="105" y="284" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="3">NAME</text>
<text x="105" y="314" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">999-888-7777</text>
<line x1="210" y1="30" x2="210" y2="420" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
<text x="405" y="208" text-anchor="middle" font-size="54" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">COMPANY</text>
<text x="405" y="278" text-anchor="middle" font-size="54" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">MESSAGE</text>
</svg>`);
}

// 10. Red Bottom Bar
function ysRedBottomBar(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="2"/>
${imgPH(185, 30, 230, 148, "Your Photo or Logo Here")}
<text x="300" y="232" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="300" y="278" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#6b7280">Company Message</text>
<rect x="0" y="342" width="600" height="108" fill="${p}"/>
<text x="300" y="408" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Phone / Other</text>
</svg>`);
}

// 11. Bold Headline Banner
function ysBoldHeadline(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
<text x="30" y="160" font-size="66" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="${p}">THIS IS YOUR</text>
<text x="30" y="258" font-size="66" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="${p}">HEADLINE</text>
<text x="570" y="346" text-anchor="end" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">COMPANY NAME</text>
<text x="570" y="372" text-anchor="end" font-size="14" font-family="Arial,sans-serif" fill="#6b7280">999-888-7777</text>
<text x="570" y="398" text-anchor="end" font-size="14" font-family="Arial,sans-serif" fill="#6b7280">COMPANYNAME.WEB</text>
</svg>`);
}

// 12. Text Sign (Black)
function ysTextSign(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<text x="300" y="210" text-anchor="middle" font-size="72" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR TEXT</text>
<text x="300" y="298" text-anchor="middle" font-size="72" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">HERE</text>
<rect x="80" y="328" width="440" height="50" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
<text x="300" y="359" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">your text here</text>
</svg>`);
}

// 13. Arrow Direction Sign
function ysArrowDirection(p, a) {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#f0ede8"/>
<rect x="8" y="8" width="584" height="434" rx="8" fill="${p}"/>
<text x="42" y="186" font-size="52" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR TEXT</text>
<text x="42" y="252" font-size="52" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">HERE</text>
<rect x="42" y="316" width="400" height="64" fill="#ffffff"/>
<polygon points="442,284 558,348 442,412" fill="#ffffff"/>
</svg>`);
}

// ── Template collections ───────────────────────────────────────────────────────
const YARDSIGN_TEMPLATES = [
  {
    galleryName: "Elite Yard Sign",
    designs: [
      {
        name: "Building Sign",
        fn: ysBuilding, p: "#3d3d3d", a: "#ffffff", bg: "#3d3d3d",
        colors: [
          { name: "Charcoal",  p: "#3d3d3d", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Arrow Sign",
        fn: ysArrowLeft, p: "#09090b", a: "#ffffff", bg: "#f0ede8",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Image Headline",
        fn: ysImageHeadline, p: "#4b5563", a: "#ffffff", bg: "#4b5563",
        colors: [
          { name: "Charcoal",  p: "#4b5563", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Photo Company",
        fn: ysPhotoCompany, p: "#1a1a1a", a: "#1a1a1a", bg: "#ffffff",
        colors: [
          { name: "Black",     p: "#1a1a1a", a: "#1a1a1a" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
          { name: "Charcoal",  p: "#374151", a: "#374151" },
        ],
      },
      {
        name: "Blue Border",
        fn: ysBlueBorder, p: "#1d4ed8", a: "#1d4ed8", bg: "#ffffff",
        colors: [
          { name: "Blue",      p: "#1d4ed8", a: "#1d4ed8" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Teal",      p: "#0d9488", a: "#0d9488" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#7f1d1d" },
        ],
      },
      {
        name: "Black Real Estate",
        fn: ysBlackRealEstate, p: "#09090b", a: "#c9a84c", bg: "#09090b",
        colors: [
          { name: "Black Gold",  p: "#09090b", a: "#c9a84c" },
          { name: "Navy Gold",   p: "#0f172a", a: "#d4af37" },
          { name: "Forest Gold", p: "#0a3622", a: "#d4af37" },
          { name: "Charcoal",    p: "#1f2937", a: "#9ca3af" },
        ],
      },
      {
        name: "Blue ID",
        fn: ysBlueID, p: "#1d4ed8", a: "#ffffff", bg: "#ffffff",
        colors: [
          { name: "Blue",      p: "#1d4ed8", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Teal",      p: "#0d9488", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Monogram Banner",
        fn: ysMonogramBanner, p: "#09090b", a: "#ffffff", bg: "#09090b",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Charcoal",  p: "#374151", a: "#ffffff" },
        ],
      },
      {
        name: "Red Bottom Bar",
        fn: ysRedBottomBar, p: "#b91c1c", a: "#b91c1c", bg: "#ffffff",
        colors: [
          { name: "Red",       p: "#b91c1c", a: "#b91c1c" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
          { name: "Charcoal",  p: "#374151", a: "#374151" },
        ],
      },
      {
        name: "Bold Headline",
        fn: ysBoldHeadline, p: "#000000", a: "#000000", bg: "#ffffff",
        colors: [
          { name: "Black",     p: "#000000", a: "#000000" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#7f1d1d" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
        ],
      },
      {
        name: "Text Sign",
        fn: ysTextSign, p: "#09090b", a: "#ffffff", bg: "#09090b",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
        ],
      },
      {
        name: "Arrow Direction",
        fn: ysArrowDirection, p: "#8b1a1a", a: "#ffffff", bg: "#8b1a1a",
        colors: [
          { name: "Burgundy",  p: "#8b1a1a", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Black",     p: "#09090b", a: "#ffffff" },
        ],
      },
    ],
  },

  {
    galleryName: "Business Yard Sign",
    designs: [
      {
        name: "Building Sign",
        fn: ysBuilding, p: "#3d3d3d", a: "#ffffff", bg: "#3d3d3d",
        colors: [
          { name: "Charcoal",  p: "#3d3d3d", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Arrow Sign",
        fn: ysArrowLeft, p: "#09090b", a: "#ffffff", bg: "#f0ede8",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Image Headline",
        fn: ysImageHeadline, p: "#4b5563", a: "#ffffff", bg: "#4b5563",
        colors: [
          { name: "Charcoal",  p: "#4b5563", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Photo Company",
        fn: ysPhotoCompany, p: "#1a1a1a", a: "#1a1a1a", bg: "#ffffff",
        colors: [
          { name: "Black",     p: "#1a1a1a", a: "#1a1a1a" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
          { name: "Charcoal",  p: "#374151", a: "#374151" },
        ],
      },
      {
        name: "Blue Border",
        fn: ysBlueBorder, p: "#1d4ed8", a: "#1d4ed8", bg: "#ffffff",
        colors: [
          { name: "Blue",      p: "#1d4ed8", a: "#1d4ed8" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Teal",      p: "#0d9488", a: "#0d9488" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#7f1d1d" },
        ],
      },
      {
        name: "Black Real Estate",
        fn: ysBlackRealEstate, p: "#09090b", a: "#c9a84c", bg: "#09090b",
        colors: [
          { name: "Black Gold",  p: "#09090b", a: "#c9a84c" },
          { name: "Navy Gold",   p: "#0f172a", a: "#d4af37" },
          { name: "Forest Gold", p: "#0a3622", a: "#d4af37" },
          { name: "Charcoal",    p: "#1f2937", a: "#9ca3af" },
        ],
      },
      {
        name: "Blue ID",
        fn: ysBlueID, p: "#1d4ed8", a: "#ffffff", bg: "#ffffff",
        colors: [
          { name: "Blue",      p: "#1d4ed8", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Teal",      p: "#0d9488", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
        ],
      },
      {
        name: "Monogram Banner",
        fn: ysMonogramBanner, p: "#09090b", a: "#ffffff", bg: "#09090b",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Charcoal",  p: "#374151", a: "#ffffff" },
        ],
      },
      {
        name: "Red Bottom Bar",
        fn: ysRedBottomBar, p: "#b91c1c", a: "#b91c1c", bg: "#ffffff",
        colors: [
          { name: "Red",       p: "#b91c1c", a: "#b91c1c" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
          { name: "Charcoal",  p: "#374151", a: "#374151" },
        ],
      },
      {
        name: "Bold Headline",
        fn: ysBoldHeadline, p: "#000000", a: "#000000", bg: "#ffffff",
        colors: [
          { name: "Black",     p: "#000000", a: "#000000" },
          { name: "Navy",      p: "#1e3a5f", a: "#1e3a5f" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#7f1d1d" },
          { name: "Forest",    p: "#14532d", a: "#14532d" },
        ],
      },
      {
        name: "Text Sign",
        fn: ysTextSign, p: "#09090b", a: "#ffffff", bg: "#09090b",
        colors: [
          { name: "Black",     p: "#09090b", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Burgundy",  p: "#7f1d1d", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
        ],
      },
      {
        name: "Arrow Direction",
        fn: ysArrowDirection, p: "#8b1a1a", a: "#ffffff", bg: "#8b1a1a",
        colors: [
          { name: "Burgundy",  p: "#8b1a1a", a: "#ffffff" },
          { name: "Navy",      p: "#1e3a5f", a: "#ffffff" },
          { name: "Forest",    p: "#14532d", a: "#ffffff" },
          { name: "Black",     p: "#09090b", a: "#ffffff" },
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

const PRODUCT_SLUG = "yard-signs";

const run = db.transaction(() => {
  const cleared = db.prepare("DELETE FROM gallery_templates WHERE product_slug = ?").run(PRODUCT_SLUG).changes;
  console.log(`Cleared ${cleared} existing gallery template(s) for "${PRODUCT_SLUG}"\n`);

  let galleries = 0, totalDesigns = 0, totalColors = 0;

  for (const col of YARDSIGN_TEMPLATES) {
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
