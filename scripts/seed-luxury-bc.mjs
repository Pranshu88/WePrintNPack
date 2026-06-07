/**
 * Seeds the "Luxury Business Cards" gallery template with 13 luxury designs.
 * Run: node scripts/seed-luxury-bc.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "webprint.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS gallery_templates (
    id TEXT PRIMARY KEY, product_slug TEXT NOT NULL,
    name TEXT NOT NULL, preview_image TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY, gallery_id TEXT NOT NULL REFERENCES gallery_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL, color_hex TEXT, color_name TEXT,
    front_image TEXT NOT NULL, front_overlay TEXT, back_image TEXT, back_overlay TEXT,
    front_admin_items TEXT, back_admin_items TEXT, front_bg_color TEXT, back_bg_color TEXT,
    created_at TEXT NOT NULL
  );
`);

let _c = 0;
function uid() { return `lx${String(++_c).padStart(4,"0")}${Date.now().toString(36)}`; }
function b64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

// ── Luxury SVG layouts ────────────────────────────────────────────────────────

const GOLD_GRAD = `<defs><linearGradient id="gld" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c8962a"/><stop offset="50%" stop-color="#f0cb6a"/><stop offset="100%" stop-color="#a87318"/></linearGradient></defs>`;

function lux2Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs>
  <linearGradient id="lp1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5c840"/><stop offset="100%" stop-color="#c8900a"/></linearGradient>
  <linearGradient id="lp2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8de80"/><stop offset="100%" stop-color="#b87820"/></linearGradient>
  <linearGradient id="lp3" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e0a828"/><stop offset="100%" stop-color="#f5dc70"/></linearGradient>
</defs>
<rect width="460" height="270" fill="#c8900a"/>
<polygon points="0,0 130,0 70,90 0,90" fill="url(#lp1)"/>
<polygon points="130,0 230,0 200,70 70,90" fill="url(#lp2)"/>
<polygon points="230,0 340,0 310,80 200,70" fill="url(#lp1)"/>
<polygon points="340,0 460,0 460,80 310,80" fill="url(#lp3)"/>
<polygon points="0,90 70,90 30,180 0,180" fill="url(#lp3)"/>
<polygon points="70,90 200,70 180,160 30,180" fill="url(#lp2)"/>
<polygon points="200,70 310,80 290,165 180,160" fill="url(#lp1)"/>
<polygon points="310,80 460,80 460,160 290,165" fill="url(#lp2)"/>
<polygon points="0,180 30,180 0,270" fill="url(#lp1)"/>
<polygon points="30,180 180,160 140,270 0,270" fill="url(#lp3)"/>
<polygon points="180,160 290,165 260,270 140,270" fill="url(#lp2)"/>
<polygon points="290,165 460,160 460,270 260,270" fill="url(#lp1)"/>
<text x="230" y="128" text-anchor="middle" font-size="12" font-family="Georgia,serif" fill="rgba(10,5,0,0.65)" font-weight="bold">Your Logo</text>
<text x="230" y="148" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(10,5,0,0.55)" letter-spacing="2">YOUR TAGLINE</text>
</svg>`);
}
function lux2Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lp4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5c840"/><stop offset="100%" stop-color="#c8900a"/></linearGradient></defs>
<rect width="460" height="270" fill="#1a2236"/>
<polygon points="0,0 200,0 140,100 0,100" fill="url(#lp4)" opacity="0.55"/>
<polygon points="0,100 140,100 90,200 0,200" fill="url(#lp4)" opacity="0.45"/>
<polygon points="0,200 90,200 0,270" fill="url(#lp4)" opacity="0.6"/>
<polygon points="200,0 270,0 220,80 140,100" fill="url(#lp4)" opacity="0.35"/>
<text x="210" y="82" font-size="18" font-family="Georgia,serif" fill="#f5c840" font-weight="bold">Your Name</text>
<text x="210" y="102" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="1">Your Position</text>
<line x1="210" y1="115" x2="440" y2="115" stroke="#d4af37" stroke-width="0.8" opacity="0.45"/>
<text x="220" y="136" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">(000) 0123 4567</text>
<text x="220" y="153" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">123 Street, City, State 4567</text>
<text x="220" y="170" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">yourInfo@example.com</text>
<text x="220" y="187" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">www.yourweb.com</text>
</svg>`);
}

function lux3Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lx3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#1c1f28"/>
<rect x="-60" y="-12" width="580" height="52" rx="26" fill="#252938" transform="rotate(-11 230 14)"/>
<rect x="-60" y="38" width="580" height="52" rx="26" fill="#262a39" transform="rotate(-11 230 64)"/>
<rect x="-60" y="88" width="580" height="52" rx="26" fill="#23273a" transform="rotate(-11 230 114)"/>
<rect x="-60" y="138" width="580" height="52" rx="26" fill="#252938" transform="rotate(-11 230 164)"/>
<rect x="-60" y="188" width="580" height="52" rx="26" fill="#222636" transform="rotate(-11 230 214)"/>
<rect x="-60" y="238" width="580" height="52" rx="26" fill="#252938" transform="rotate(-11 230 264)"/>
<rect x="-60" y="42" width="196" height="22" rx="11" fill="url(#lx3)" transform="rotate(-11 38 53)" opacity="0.9"/>
<rect x="-60" y="150" width="172" height="20" rx="10" fill="#c8962a" transform="rotate(-11 26 160)" opacity="0.8"/>
<circle cx="230" cy="135" r="38" fill="none" stroke="#d4af37" stroke-width="1.5" opacity="0.7"/>
<text x="230" y="128" text-anchor="middle" font-size="11" font-family="Georgia,serif" fill="#d4af37">Your Logo</text>
<text x="230" y="146" text-anchor="middle" font-size="6.5" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2">YOUR TAGLINE</text>
</svg>`);
}
function lux3Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lx3b" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#1c1f28"/>
<rect x="-60" y="-12" width="580" height="52" rx="26" fill="#252938" transform="rotate(-11 230 14)"/>
<rect x="-60" y="38" width="580" height="52" rx="26" fill="#262a39" transform="rotate(-11 230 64)"/>
<rect x="-60" y="88" width="580" height="52" rx="26" fill="#23273a" transform="rotate(-11 230 114)"/>
<rect x="-60" y="138" width="580" height="52" rx="26" fill="#252938" transform="rotate(-11 230 164)"/>
<rect x="-60" y="188" width="580" height="52" rx="26" fill="#222636" transform="rotate(-11 230 214)"/>
<rect x="300" y="140" width="200" height="22" rx="11" fill="url(#lx3b)" transform="rotate(-11 400 151)" opacity="0.85"/>
<text x="230" y="78" text-anchor="middle" font-size="17" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">Your Name</text>
<text x="230" y="97" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2">YOUR POSITION</text>
<line x1="100" y1="110" x2="360" y2="110" stroke="#d4af37" stroke-width="0.8" opacity="0.4"/>
<text x="230" y="140" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">(000) 0123 4567</text>
<text x="230" y="157" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">yourInfo@example.com</text>
<text x="230" y="174" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.yourweb.com</text>
</svg>`);
}

function lux4Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="cop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b05820"/><stop offset="50%" stop-color="#d87840"/><stop offset="100%" stop-color="#a04818"/></linearGradient></defs>
<rect width="460" height="270" rx="22" fill="#080808"/>
<path d="M0,52 C70,28 130,78 200,50 C270,22 340,76 410,50" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.65"/>
<path d="M0,80 C70,56 130,106 200,78 C270,50 340,104 410,78 L460,70" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.6"/>
<path d="M0,108 C70,84 130,134 200,106 C270,78 340,132 410,106 L460,98" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.55"/>
<path d="M0,136 C70,112 130,162 200,134 C270,106 340,160 410,134 L460,126" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.5"/>
<path d="M0,164 C70,140 130,190 200,162 C270,134 340,188 410,162 L460,154" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.45"/>
<path d="M0,192 C70,168 130,218 200,190 C270,162 340,216 410,190 L460,182" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.4"/>
<path d="M0,220 C70,196 130,246 200,218 C270,190 340,244 410,218 L460,210" fill="none" stroke="url(#cop)" stroke-width="1.3" opacity="0.35"/>
<circle cx="230" cy="120" r="36" fill="#b05820" opacity="0.8"/>
<circle cx="218" cy="110" r="12" fill="#080808" opacity="0.9"/>
<circle cx="242" cy="110" r="12" fill="#080808" opacity="0.9"/>
<circle cx="230" cy="128" r="8" fill="#080808" opacity="0.9"/>
<text x="230" y="172" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#c87040" font-weight="bold" letter-spacing="1">BRAND NAME</text>
<text x="230" y="188" text-anchor="middle" font-size="6.5" font-family="Arial,sans-serif" fill="#c87040" letter-spacing="2">SLOGAN GOES HERE</text>
</svg>`);
}
function lux4Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="copb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b05820"/><stop offset="50%" stop-color="#d87840"/><stop offset="100%" stop-color="#a04818"/></linearGradient></defs>
<rect width="460" height="270" rx="22" fill="#080808"/>
<path d="M0,52 C70,28 130,78 200,50 C270,22 340,76 410,50" fill="none" stroke="url(#copb)" stroke-width="1.3" opacity="0.55"/>
<path d="M0,80 C70,56 130,106 200,78 C270,50 340,104 410,78 L460,70" fill="none" stroke="url(#copb)" stroke-width="1.3" opacity="0.5"/>
<path d="M0,108 C70,84 130,134 200,106 C270,78 340,132 410,106 L460,98" fill="none" stroke="url(#copb)" stroke-width="1.3" opacity="0.45"/>
<path d="M0,136 C70,112 130,162 200,134 C270,106 340,160 410,134 L460,126" fill="none" stroke="url(#copb)" stroke-width="1.3" opacity="0.4"/>
<path d="M0,164 C70,140 130,190 200,162 C270,134 340,188 410,162 L460,154" fill="none" stroke="url(#copb)" stroke-width="1.3" opacity="0.35"/>
<text x="34" y="86" font-size="20" font-family="Arial,sans-serif" fill="#ffffff" font-weight="bold">YOUR NAME</text>
<text x="34" y="106" font-size="8.5" font-family="Arial,sans-serif" fill="#c87040">TAG LINE HERE</text>
<line x1="34" y1="116" x2="180" y2="116" stroke="#c87040" stroke-width="1"/>
<circle cx="40" cy="148" r="8" fill="#c87040" opacity="0.85"/>
<text x="56" y="153" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">+000 0000 0000</text>
<circle cx="40" cy="172" r="8" fill="#c87040" opacity="0.85"/>
<text x="56" y="177" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Web address here</text>
<circle cx="40" cy="196" r="8" fill="#c87040" opacity="0.85"/>
<text x="56" y="201" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Street address here, City Name-000</text>
</svg>`);
}

function lux5Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lx5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d4af37"/><stop offset="40%" stop-color="#f5d87a"/><stop offset="100%" stop-color="#b8860b"/></linearGradient></defs>
<rect width="460" height="270" fill="#0e0e0e"/>
<path d="M0,40 C60,20 100,80 180,50 C240,28 300,90 380,60 C420,46 450,70 460,60" fill="none" stroke="rgba(255,220,100,0.12)" stroke-width="8"/>
<path d="M0,110 C80,80 160,140 240,110 C320,80 380,130 460,100" fill="none" stroke="rgba(255,220,100,0.08)" stroke-width="12"/>
<path d="M20,0 C40,60 20,120 50,180 C70,220 40,260 60,270" fill="none" stroke="rgba(255,220,100,0.1)" stroke-width="6"/>
<path d="M300,0 C280,70 310,130 290,200 C278,240 300,260 310,270" fill="none" stroke="rgba(255,220,100,0.09)" stroke-width="10"/>
<path d="M0,180 C100,150 200,200 300,170 C380,148 430,180 460,165" fill="none" stroke="rgba(255,220,100,0.07)" stroke-width="7"/>
<rect x="66" y="56" width="328" height="158" fill="none" stroke="url(#lx5)" stroke-width="3"/>
<rect x="76" y="66" width="308" height="138" fill="#0e0e0e" opacity="0.4"/>
<text x="230" y="130" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="#d4af37" letter-spacing="6">LUXURY</text>
<text x="230" y="152" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="3">BUSINESS</text>
</svg>`);
}
function lux5Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#0a0a0a"/>
<path d="M0,40 C60,20 100,80 180,50 C240,28 300,90 380,60" fill="none" stroke="rgba(255,220,100,0.1)" stroke-width="8"/>
<path d="M0,110 C80,80 160,140 240,110 C320,80 380,130 460,100" fill="none" stroke="rgba(255,220,100,0.07)" stroke-width="12"/>
<path d="M20,0 C40,60 20,120 50,180 C70,220 40,260 60,270" fill="none" stroke="rgba(255,220,100,0.08)" stroke-width="6"/>
<text x="230" y="94" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">Name Surname</text>
<text x="230" y="116" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2">Job Position</text>
<circle cx="176" cy="152" r="11" fill="#d4af37" opacity="0.15" stroke="#d4af37" stroke-width="1"/>
<text x="196" y="157" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">123-456-7890</text>
<circle cx="176" cy="177" r="11" fill="#d4af37" opacity="0.15" stroke="#d4af37" stroke-width="1"/>
<text x="196" y="182" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">email@yourdomain.com</text>
<circle cx="176" cy="202" r="11" fill="#d4af37" opacity="0.15" stroke="#d4af37" stroke-width="1"/>
<text x="196" y="207" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">www.yourdomain.com</text>
<rect x="100" y="226" width="260" height="1.5" fill="#d4af37" opacity="0.35"/>
</svg>`);
}

function lux6Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lx6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d4af37"/><stop offset="50%" stop-color="#f5e070"/><stop offset="100%" stop-color="#a07010"/></linearGradient></defs>
<rect width="460" height="270" fill="#0c0c0c"/>
<path d="M0,50 C40,20 80,70 130,44 C180,18 220,65 280,42 C330,22 390,60 460,38" fill="none" stroke="rgba(60,55,50,0.9)" stroke-width="18"/>
<path d="M0,120 C50,90 110,150 170,120 C230,90 300,145 360,118 C410,96 450,130 460,118" fill="none" stroke="rgba(55,50,45,0.85)" stroke-width="22"/>
<path d="M0,200 C60,170 120,220 190,195 C260,170 330,215 400,190 C430,178 455,200 460,194" fill="none" stroke="rgba(60,55,50,0.8)" stroke-width="16"/>
<path d="M30,0 C50,60 30,110 60,160 C80,196 50,240 70,270" fill="none" stroke="url(#lx6)" stroke-width="4" opacity="0.8"/>
<path d="M120,0 C140,50 110,95 145,140 C165,168 150,220 170,270" fill="none" stroke="url(#lx6)" stroke-width="2.5" opacity="0.7"/>
<path d="M300,0 C280,55 310,100 290,155 C276,192 295,240 310,270" fill="none" stroke="url(#lx6)" stroke-width="3.5" opacity="0.75"/>
<path d="M400,0 C380,45 405,90 390,140 C378,178 395,225 405,270" fill="none" stroke="url(#lx6)" stroke-width="2.5" opacity="0.65"/>
<path d="M0,80 C80,60 160,100 240,80 C310,62 390,88 460,72" fill="none" stroke="url(#lx6)" stroke-width="1.5" opacity="0.55"/>
<rect x="148" y="100" width="164" height="70" fill="#0c0c0c" stroke="url(#lx6)" stroke-width="2.5"/>
<text x="230" y="130" text-anchor="middle" font-size="11" font-family="Georgia,serif" fill="#d4af37" letter-spacing="6">LUXURY</text>
<text x="230" y="152" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2">PREMIUM CARDS</text>
</svg>`);
}
function lux6Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="lx6b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d4af37"/><stop offset="50%" stop-color="#f5e070"/><stop offset="100%" stop-color="#a07010"/></linearGradient></defs>
<rect width="460" height="270" fill="#080808"/>
<path d="M30,0 C50,60 30,110 60,160 C80,196 50,240 70,270" fill="none" stroke="url(#lx6b)" stroke-width="4" opacity="0.6"/>
<path d="M300,0 C280,55 310,100 290,155 C276,192 295,240 310,270" fill="none" stroke="url(#lx6b)" stroke-width="3.5" opacity="0.55"/>
<path d="M0,80 C80,60 160,100 240,80 C310,62 390,88 460,72" fill="none" stroke="url(#lx6b)" stroke-width="1.5" opacity="0.4"/>
<rect x="358" y="24" width="72" height="72" fill="none" stroke="url(#lx6b)" stroke-width="2"/>
<text x="394" y="68" text-anchor="middle" font-size="20" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">AL</text>
<text x="34" y="62" font-size="16" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2" font-weight="bold">ALEXANDER</text>
<text x="34" y="84" font-size="16" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2" font-weight="bold">LUXOUR</text>
<line x1="34" y1="97" x2="320" y2="97" stroke="#d4af37" stroke-width="1"/>
<text x="34" y="120" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">PHONE: +123 (34) 56 78 91</text>
<text x="34" y="140" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">EMAIL: LUXURY@BUSINES.CARDS</text>
<text x="34" y="163" font-size="8.5" font-family="Arial,sans-serif" fill="#d4af37">WWW.BUSINES.CARDS</text>
</svg>`);
}

function lux7Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
${GOLD_GRAD}
<rect width="460" height="270" fill="#080808"/>
<path d="M0,0 C30,0 60,10 80,40 C100,70 80,100 100,130" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M0,0 C0,30 10,60 40,80 C70,100 100,80 130,100" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M460,0 C430,0 400,10 380,40 C360,70 380,100 360,130" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M460,0 C460,30 450,60 420,80 C390,100 360,80 330,100" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M0,270 C30,270 60,260 80,230 C100,200 80,170 100,140" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M0,270 C0,240 10,210 40,190 C70,170 100,190 130,170" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M460,270 C430,270 400,260 380,230 C360,200 380,170 360,140" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<path d="M460,270 C460,240 450,210 420,190 C390,170 360,190 330,170" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.7"/>
<circle cx="44" cy="44" r="22" fill="none" stroke="url(#gld)" stroke-width="1" opacity="0.5"/>
<circle cx="416" cy="44" r="22" fill="none" stroke="url(#gld)" stroke-width="1" opacity="0.5"/>
<circle cx="44" cy="226" r="22" fill="none" stroke="url(#gld)" stroke-width="1" opacity="0.5"/>
<circle cx="416" cy="226" r="22" fill="none" stroke="url(#gld)" stroke-width="1" opacity="0.5"/>
<circle cx="230" cy="120" r="44" fill="none" stroke="url(#gld)" stroke-width="1.5" opacity="0.6"/>
<circle cx="230" cy="120" r="34" fill="none" stroke="url(#gld)" stroke-width="1" opacity="0.5"/>
<circle cx="230" cy="120" r="22" fill="#c8962a" opacity="0.7"/>
<text x="230" y="116" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">BRAND</text>
<text x="230" y="130" text-anchor="middle" font-size="9" font-family="Georgia,serif" fill="#ffffff">NAME</text>
<text x="230" y="183" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2">TAGLINE SPACE</text>
</svg>`);
}
function lux7Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#c8962a"/>
<path d="M0,0 C30,0 60,10 80,40 C100,70 80,100 100,130" fill="none" stroke="#080808" stroke-width="1.5" opacity="0.5"/>
<path d="M0,0 C0,30 10,60 40,80 C70,100 100,80 130,100" fill="none" stroke="#080808" stroke-width="1.5" opacity="0.5"/>
<path d="M460,0 C430,0 400,10 380,40 C360,70 380,100 360,130" fill="none" stroke="#080808" stroke-width="1.5" opacity="0.5"/>
<path d="M460,270 C430,270 400,260 380,230 C360,200 380,170 360,140" fill="none" stroke="#080808" stroke-width="1.5" opacity="0.5"/>
<path d="M0,270 C30,270 60,260 80,230 C100,200 80,170 100,140" fill="none" stroke="#080808" stroke-width="1.5" opacity="0.5"/>
<circle cx="44" cy="44" r="22" fill="none" stroke="#080808" stroke-width="1" opacity="0.4"/>
<circle cx="416" cy="44" r="22" fill="none" stroke="#080808" stroke-width="1" opacity="0.4"/>
<circle cx="44" cy="226" r="22" fill="none" stroke="#080808" stroke-width="1" opacity="0.4"/>
<circle cx="416" cy="226" r="22" fill="none" stroke="#080808" stroke-width="1" opacity="0.4"/>
<text x="230" y="100" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#080808" font-weight="bold">YOUR NAME</text>
<text x="230" y="120" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#080808" letter-spacing="1">Graphic Designer</text>
<text x="230" y="152" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#080808">123 Dummy, Lorem Ipsum</text>
<text x="230" y="169" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#080808">+00 1234 5XXX 9012</text>
<text x="230" y="186" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#080808">your email space</text>
<text x="230" y="203" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#080808">website address here</text>
</svg>`);
}

function lux8Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs>
  <pattern id="qp" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#111111"/><path d="M0,22 L22,0 L44,22 L22,44 Z" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><circle cx="22" cy="22" r="3.5" fill="rgba(255,200,50,0.18)"/></pattern>
  <linearGradient id="qg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8962a"/><stop offset="50%" stop-color="#f5c840"/><stop offset="100%" stop-color="#b07810"/></linearGradient>
</defs>
<rect width="460" height="270" fill="#111111"/>
<rect width="460" height="270" fill="url(#qp)"/>
<rect x="0" y="100" width="460" height="70" fill="url(#qg)"/>
<rect x="14" y="112" width="44" height="44" fill="none" stroke="#111111" stroke-width="2" opacity="0.6"/>
<text x="76" y="129" font-size="16" font-family="Arial,sans-serif" fill="#111111" font-weight="bold">COMPANYNAME</text>
<text x="76" y="147" font-size="8" font-family="Arial,sans-serif" fill="#111111" letter-spacing="2">SLOGAN HERE</text>
<text x="230" y="210" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(212,175,55,0.5)">www.companyname.xx</text>
</svg>`);
}
function lux8Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs>
  <pattern id="qp2" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#111111"/><path d="M0,22 L22,0 L44,22 L22,44 Z" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><circle cx="22" cy="22" r="3.5" fill="rgba(255,200,50,0.18)"/></pattern>
  <linearGradient id="qg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8962a"/><stop offset="50%" stop-color="#f5c840"/><stop offset="100%" stop-color="#b07810"/></linearGradient>
</defs>
<rect width="460" height="270" fill="#111111"/>
<rect width="460" height="270" fill="url(#qp2)"/>
<rect x="234" y="20" width="208" height="230" fill="#111111" opacity="0.65"/>
<text x="16" y="50" font-size="7" font-family="Arial,sans-serif" fill="#f5c840" letter-spacing="2">COMPANYNAME</text>
<text x="248" y="68" font-size="16" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">NAME SURNAME</text>
<text x="248" y="86" font-size="8.5" font-family="Arial,sans-serif" fill="#f5c840" letter-spacing="1">JOB POSITION</text>
<line x1="248" y1="98" x2="430" y2="98" stroke="#f5c840" stroke-width="0.8" opacity="0.4"/>
<text x="248" y="120" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">(office) +0 123 456 789</text>
<text x="248" y="137" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">(mobile) +0 123 456 789</text>
<text x="248" y="154" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">name@companyname.xx</text>
<text x="248" y="171" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">city, state, zip</text>
<text x="248" y="188" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">www.companyname.xx</text>
</svg>`);
}

function lux10Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="gr" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5dc80"/><stop offset="40%" stop-color="#d4af37"/><stop offset="80%" stop-color="#b8860b"/><stop offset="100%" stop-color="#f0c850"/></linearGradient></defs>
<rect width="460" height="270" fill="#1a1a1a"/>
<rect x="4" y="4" width="452" height="262" rx="28" fill="url(#gr)"/>
<circle cx="230" cy="120" r="36" fill="none" stroke="#1a1a1a" stroke-width="2.5" opacity="0.5"/>
<path d="M212,120 L222,106 L230,118 L238,106 L248,120" fill="none" stroke="#1a1a1a" stroke-width="2" opacity="0.6"/>
<text x="230" y="148" text-anchor="middle" font-size="14" font-family="Georgia,serif" fill="#1a1a1a" font-weight="bold">BRAND NAME</text>
<text x="230" y="166" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#1a1a1a" letter-spacing="3" opacity="0.7">TAGLINE SPACE</text>
</svg>`);
}
function lux10Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="grb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5dc80"/><stop offset="40%" stop-color="#d4af37"/><stop offset="80%" stop-color="#b8860b"/><stop offset="100%" stop-color="#f0c850"/></linearGradient></defs>
<rect width="460" height="270" fill="#1a1a1a"/>
<rect x="4" y="4" width="452" height="262" rx="28" fill="none" stroke="url(#grb)" stroke-width="3"/>
<rect x="16" y="16" width="428" height="238" rx="20" fill="#111111"/>
<path d="M16,270 C16,230 60,190 120,175 C180,160 220,175 244,200 L244,254 L16,254 Z" fill="#1a1a1a"/>
<text x="34" y="90" font-size="20" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">YOUR NAME</text>
<text x="34" y="112" font-size="9" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="1">Graphic Designer</text>
<line x1="34" y1="128" x2="240" y2="128" stroke="#d4af37" stroke-width="0.8" opacity="0.4"/>
<circle cx="40" cy="152" r="8" fill="#d4af37" opacity="0.2" stroke="#d4af37" stroke-width="1"/>
<text x="56" y="157" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">123 Dummy, Lorem Ipsum</text>
<circle cx="40" cy="174" r="8" fill="#d4af37" opacity="0.2" stroke="#d4af37" stroke-width="1"/>
<text x="56" y="179" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">+00 1234 5XXX 9012</text>
<circle cx="40" cy="196" r="8" fill="#d4af37" opacity="0.2" stroke="#d4af37" stroke-width="1"/>
<text x="56" y="201" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">your email space</text>
<circle cx="40" cy="218" r="8" fill="#d4af37" opacity="0.2" stroke="#d4af37" stroke-width="1"/>
<text x="56" y="223" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">website address here</text>
</svg>`);
}

function lux11Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#111418"/>
<ellipse cx="100" cy="60" rx="110" ry="70" fill="#191d24" opacity="0.9"/>
<ellipse cx="380" cy="50" rx="90" ry="60" fill="#1e2230" opacity="0.85"/>
<ellipse cx="60" cy="200" rx="80" ry="55" fill="#181c26" opacity="0.8"/>
<ellipse cx="390" cy="210" rx="100" ry="65" fill="#1c2028" opacity="0.85"/>
<ellipse cx="230" cy="100" rx="70" ry="50" fill="#1a1e2a" opacity="0.7"/>
<circle cx="230" cy="118" r="28" fill="none" stroke="#d4af37" stroke-width="1.5" opacity="0.6"/>
<path d="M216,118 L222,106 L230,116 L238,106 L244,118" fill="none" stroke="#d4af37" stroke-width="1.8" opacity="0.8"/>
<text x="230" y="158" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#d4af37" font-weight="bold">Company Logo</text>
<text x="230" y="176" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2" opacity="0.8">YOUR TAGLINE</text>
</svg>`);
}
function lux11Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#111418"/>
<ellipse cx="100" cy="60" rx="110" ry="70" fill="#191d24" opacity="0.9"/>
<ellipse cx="410" cy="30" rx="90" ry="60" fill="#1e2230" opacity="0.85"/>
<ellipse cx="60" cy="210" rx="80" ry="55" fill="#181c26" opacity="0.8"/>
<ellipse cx="400" cy="220" rx="100" ry="65" fill="#1c2028" opacity="0.85"/>
<text x="34" y="96" font-size="22" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">John Abraham</text>
<text x="34" y="118" font-size="9" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="1">Business Consultant</text>
<line x1="34" y1="132" x2="300" y2="132" stroke="#d4af37" stroke-width="0.8" opacity="0.4"/>
<text x="50" y="158" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">(000) 0123 4567</text>
<text x="50" y="176" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Your Address, Your City, Postal Code</text>
<text x="50" y="194" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">info@yourmail.com</text>
<text x="50" y="212" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.yourweb.com</text>
</svg>`);
}

function lux12Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#0f1218"/>
<polygon points="0,0 200,0 160,90 0,90" fill="#161a22"/>
<polygon points="200,0 460,0 460,110 300,110 260,40" fill="#1a1e28"/>
<polygon points="160,90 300,110 240,190 100,190" fill="#141820"/>
<polygon points="300,110 460,110 460,200 320,200" fill="#181c26"/>
<polygon points="0,90 160,90 100,190 0,190" fill="#161a22"/>
<polygon points="0,190 100,190 60,270 0,270" fill="#1a1e26"/>
<polygon points="100,190 240,190 200,270 60,270" fill="#14181e"/>
<polygon points="240,190 320,200 290,270 200,270" fill="#181c24"/>
<polygon points="320,200 460,200 460,270 290,270" fill="#1c2030"/>
<line x1="198" y1="0" x2="302" y2="270" stroke="url(#ag)" stroke-width="1.5" opacity="0.7"/>
<line x1="228" y1="0" x2="332" y2="270" stroke="url(#ag)" stroke-width="0.8" opacity="0.4"/>
<circle cx="230" cy="128" r="28" fill="none" stroke="#d4af37" stroke-width="1.5" opacity="0.7"/>
<path d="M216,128 L222,116 L230,126 L238,116 L244,128" fill="none" stroke="#d4af37" stroke-width="1.8" opacity="0.85"/>
<text x="230" y="168" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#d4af37" font-weight="bold">Company Logo</text>
<text x="230" y="184" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2" opacity="0.75">YOUR TAGLINE</text>
</svg>`);
}
function lux12Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="agb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#0f1218"/>
<polygon points="0,0 200,0 160,90 0,90" fill="#161a22"/>
<polygon points="200,0 460,0 460,110 300,110 260,40" fill="#1a1e28"/>
<polygon points="160,90 300,110 240,190 100,190" fill="#141820"/>
<polygon points="300,110 460,110 460,200 320,200" fill="#181c26"/>
<polygon points="0,90 160,90 100,190 0,190" fill="#161a22"/>
<polygon points="0,190 100,190 60,270 0,270" fill="#1a1e26"/>
<polygon points="240,190 320,200 290,270 200,270" fill="#181c24"/>
<polygon points="320,200 460,200 460,270 290,270" fill="#1c2030"/>
<line x1="198" y1="0" x2="302" y2="270" stroke="url(#agb)" stroke-width="1.5" opacity="0.65"/>
<line x1="228" y1="0" x2="332" y2="270" stroke="url(#agb)" stroke-width="0.8" opacity="0.35"/>
<text x="34" y="96" font-size="20" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">John Abraham</text>
<text x="34" y="116" font-size="9" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="1">Business Consultant</text>
<line x1="34" y1="130" x2="280" y2="130" stroke="#d4af37" stroke-width="0.8" opacity="0.35"/>
<text x="50" y="154" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">(000) 0123 4567</text>
<text x="50" y="171" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Your Address, Your City, Postal Code</text>
<text x="50" y="188" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">info@yourmail.com</text>
<text x="50" y="205" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">www.yourweb.com</text>
</svg>`);
}

function lux13Front() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="arw" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5dc80"/><stop offset="30%" stop-color="#d4af37"/><stop offset="70%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#0a0a0a"/>
<polygon points="180,0 460,0 460,270 180,270 230,135" fill="url(#arw)"/>
<circle cx="340" cy="120" r="26" fill="none" stroke="#0a0a0a" stroke-width="2" opacity="0.6"/>
<circle cx="340" cy="120" r="18" fill="none" stroke="#0a0a0a" stroke-width="1.2" opacity="0.5"/>
<circle cx="340" cy="120" r="9" fill="none" stroke="#0a0a0a" stroke-width="1" opacity="0.4"/>
<text x="340" y="160" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="#0a0a0a" font-weight="bold">COMPANY</text>
<text x="340" y="178" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#0a0a0a" letter-spacing="2" opacity="0.8">SLOGAN HERE</text>
<text x="34" y="82" font-size="14" font-family="Georgia,serif" fill="#d4af37" font-weight="bold">YOUR NAME</text>
<text x="34" y="100" font-size="8" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="1">JOB POSITION</text>
<text x="34" y="130" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">Street, city name, state</text>
<text x="34" y="148" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">000-000-000</text>
<text x="34" y="166" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">@example.com</text>
<text x="34" y="184" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">websiteee.com</text>
</svg>`);
}
function lux13Back() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<defs><linearGradient id="arwb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f5dc80"/><stop offset="30%" stop-color="#d4af37"/><stop offset="70%" stop-color="#c8962a"/><stop offset="100%" stop-color="#f0cb6a"/></linearGradient></defs>
<rect width="460" height="270" fill="#0a0a0a"/>
<rect x="0" y="96" width="460" height="78" fill="url(#arwb)"/>
<circle cx="230" cy="135" r="26" fill="none" stroke="#0a0a0a" stroke-width="2" opacity="0.55"/>
<circle cx="230" cy="135" r="18" fill="none" stroke="#0a0a0a" stroke-width="1.2" opacity="0.4"/>
<circle cx="230" cy="135" r="9" fill="#0a0a0a" opacity="0.25"/>
<text x="230" y="192" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#d4af37" font-weight="bold" letter-spacing="2">COMPANY</text>
<text x="230" y="210" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="#d4af37" letter-spacing="2" opacity="0.75">SLOGAN HERE</text>
</svg>`);
}

// ── Seed ─────────────────────────────────────────────────────────────────────

const PRODUCT_SLUG = "premium-business-cards";
const GALLERY_NAME = "Luxury Business Cards";

const DESIGNS = [
  { name: "Gold Low-Poly Facets",      front: lux2Front,  back: lux2Back,  bg: "#c8900a", backBg: "#1a2236" },
  { name: "Dark Diagonal Pills",       front: lux3Front,  back: lux3Back,  bg: "#1c1f28", backBg: "#1c1f28" },
  { name: "Organic Wavy Lines",        front: lux4Front,  back: lux4Back,  bg: "#080808", backBg: "#080808" },
  { name: "Marble Gold Frame",         front: lux5Front,  back: lux5Back,  bg: "#0e0e0e", backBg: "#0a0a0a" },
  { name: "Marble Gold Splatter",      front: lux6Front,  back: lux6Back,  bg: "#0c0c0c", backBg: "#080808" },
  { name: "Ornate Floral Mandala",     front: lux7Front,  back: lux7Back,  bg: "#080808", backBg: "#c8962a" },
  { name: "Quilted Diamond Gold Bar",  front: lux8Front,  back: lux8Back,  bg: "#111111", backBg: "#111111" },
  { name: "Gold Gradient Rounded",     front: lux10Front, back: lux10Back, bg: "#d4af37", backBg: "#111111" },
  { name: "Dark Fluid Waves",          front: lux11Front, back: lux11Back, bg: "#111418", backBg: "#111418" },
  { name: "Dark Angular Geometric",    front: lux12Front, back: lux12Back, bg: "#0f1218", backBg: "#0f1218" },
  { name: "Gold Arrow Panel",          front: lux13Front, back: lux13Back, bg: "#0a0a0a", backBg: "#0a0a0a" },
];

const run = db.transaction(() => {
  // Remove existing "Luxury Business Cards" gallery if present
  const existing = db.prepare(
    "SELECT id FROM gallery_templates WHERE product_slug = ? AND name = ?"
  ).get(PRODUCT_SLUG, GALLERY_NAME);
  if (existing) {
    db.prepare("DELETE FROM gallery_templates WHERE id = ?").run(existing.id);
    console.log(`Removed existing "${GALLERY_NAME}" gallery.`);
  }

  const gid = uid();
  const now = new Date().toISOString();
  const previewImg = DESIGNS[0].front();

  db.prepare(
    "INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(gid, PRODUCT_SLUG, GALLERY_NAME, previewImg, now);

  const stmtDesign = db.prepare(
    `INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, back_image, front_bg_color, back_bg_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let added = 0;
  for (const d of DESIGNS) {
    stmtDesign.run(uid(), gid, d.name, "#d4af37", "Gold Black", d.front(), d.back(), d.bg, d.backBg, now);
    added++;
    console.log(`  ✓  ${d.name}`);
  }

  return { gid, added };
});

const result = run();
console.log(`\nLuxury Business Cards gallery created (id: ${result.gid})`);
console.log(`Designs added: ${result.added}`);

db.close();
