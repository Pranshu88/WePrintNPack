/**
 * Seed — Standard Roll-Up Banner (8 designs, viewBox 600×600)
 * TEXT WIDTH RULE: each <text> must satisfy  chars × fontSize × 0.78 + 24 ≤ 420
 * (the editor's parseSVGForEditing caps estW at 420 and renders as HTML → wraps beyond that)
 * Run: node scripts/seed-rollup-std-designs.mjs
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(path.resolve(__dirname, ".."), "data", "webprint.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

let _c = 0;
function uid() { return `ru${String(++_c).padStart(4,"0")}${Date.now().toString(36)}`; }
function svg64(svg) { return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`; }

const GALLERY_ID = "bn0063mpmc48n9";

// Photo placeholder (no <text> inside — rendered as graphicItem, not textItem)
function imgPH(x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2, fs = Math.max(14, h * 0.07);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#d1d5db" data-placeholder="photo"/>`;
}

// ── 1. Red Sale Sunburst ──────────────────────────────────────────────────────
// Text-width check: "YOUR TEXT" (9)×52×0.78+24=378✓  "XX% OFF" (7)×68×0.78+24=395✓
function designRedSale() {
  const rays = Array.from({length:24},(_,i)=>{
    const a=(i*Math.PI*2)/24;
    return `<line x1="${(300+Math.cos(a)*40).toFixed(1)}" y1="${(300+Math.sin(a)*40).toFixed(1)}" x2="${(300+Math.cos(a)*460).toFixed(1)}" y2="${(300+Math.sin(a)*460).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="14"/>`;
  }).join("");
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#cc2222"/>
${rays}
<line x1="40" y1="100" x2="560" y2="100" stroke="white" stroke-width="2.5" opacity="0.7"/>
<text x="300" y="172" text-anchor="middle" font-size="52" font-family="Arial,sans-serif" font-weight="bold" fill="white">YOUR TEXT</text>
<text x="300" y="238" text-anchor="middle" font-size="52" font-family="Arial,sans-serif" font-weight="bold" fill="white">YOUR TEXT</text>
<line x1="40" y1="260" x2="560" y2="260" stroke="white" stroke-width="2.5" opacity="0.7"/>
<text x="300" y="346" text-anchor="middle" font-size="68" font-family="Arial,sans-serif" font-weight="bold" fill="white">XX% OFF</text>
<text x="300" y="392" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="4">SPECIAL OFFER</text>
<line x1="100" y1="420" x2="500" y2="420" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
<text x="300" y="464" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">COMPANY NAME</text>
<text x="300" y="508" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">WEB / OTHER</text>
<text x="300" y="548" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">PHONE / OTHER</text>
</svg>`);
}

// ── 2. Open House ─────────────────────────────────────────────────────────────
// "HEADLINE"(8)×60×0.78+24=398✓  "TIME 2:00PM"(11)×26×0.78+24=247✓  "COMPANY NAME"(12)×34×0.78+24=342✓
function designOpenHouse() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="370" fill="#e07c55"/>
<rect y="370" width="600" height="230" fill="#1e3252"/>
<polygon points="300,90 420,180 420,300 180,300 180,180" fill="rgba(255,255,255,0.06)"/>
<polygon points="300,148 374,205 374,270 226,270 226,205" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/>
<rect x="265" y="228" width="36" height="42" fill="none" stroke="white" stroke-width="5" stroke-linejoin="round"/>
<text x="300" y="325" text-anchor="middle" font-size="60" font-family="Arial,sans-serif" font-weight="bold" fill="white">HEADLINE</text>
<text x="300" y="362" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="rgba(255,255,255,0.88)">TIME 2:00PM</text>
<line x1="60" y1="384" x2="540" y2="384" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
<text x="300" y="452" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">COMPANY NAME</text>
<text x="300" y="498" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Web / Other</text>
<text x="300" y="536" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Phone / Other</text>
</svg>`);
}

// ── 3. BBQ / Party ────────────────────────────────────────────────────────────
// "YOUR"(4)×80×0.78+24=274✓  "MESSAGE"(7)×64×0.78+24=374✓  "HERE"(4)×80✓  "COUPLE'S NAMES"(14)×28×0.78+24=329✓
function designBBQParty() {
  const checks = [];
  const sz = 28;
  for(let r=0;r<4;r++) for(let c=0;c<22;c++) if((r+c)%2===0) checks.push(`<rect x="${c*sz}" y="${540+r*sz}" width="${sz}" height="${sz}" fill="#c8453a" opacity="0.72"/>`);
  for(let r=0;r<16;r++) for(let c=0;c<3;c++) if((r+c)%2===0){checks.push(`<rect x="${c*sz}" y="${r*sz+80}" width="${sz}" height="${sz}" fill="#c8453a" opacity="0.72"/>`);checks.push(`<rect x="${600-(c+1)*sz}" y="${r*sz+80}" width="${sz}" height="${sz}" fill="#c8453a" opacity="0.72"/>`);}
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#e8dfc8"/>
<line x1="0" y1="60" x2="600" y2="55" stroke="rgba(160,130,90,0.15)" stroke-width="18"/>
<line x1="0" y1="130" x2="600" y2="128" stroke="rgba(160,130,90,0.1)" stroke-width="22"/>
${checks.join("")}
<rect x="52" y="85" width="496" height="445" rx="4" fill="#f5f0e4" stroke="rgba(100,80,50,0.15)" stroke-width="1.5"/>
<line x1="232" y1="106" x2="232" y2="158" stroke="#4a3825" stroke-width="6"/>
<line x1="218" y1="106" x2="218" y2="130" stroke="#4a3825" stroke-width="4"/>
<line x1="246" y1="106" x2="246" y2="130" stroke="#4a3825" stroke-width="4"/>
<rect x="292" y="116" width="16" height="16" rx="2" fill="#4a3825" transform="rotate(45,300,124)"/>
<line x1="368" y1="106" x2="368" y2="158" stroke="#4a3825" stroke-width="6"/>
<line x1="354" y1="106" x2="354" y2="130" stroke="#4a3825" stroke-width="4"/>
<line x1="382" y1="106" x2="382" y2="130" stroke="#4a3825" stroke-width="4"/>
<line x1="218" y1="158" x2="382" y2="158" stroke="#4a3825" stroke-width="2" opacity="0.4"/>
<text x="300" y="230" text-anchor="middle" font-size="80" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">YOUR</text>
<text x="300" y="318" text-anchor="middle" font-size="64" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">MESSAGE</text>
<text x="300" y="406" text-anchor="middle" font-size="80" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">HERE</text>
<text x="300" y="474" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="#5c4a35" letter-spacing="2">COUPLE'S NAMES</text>
</svg>`);
}

// ── 4. Pool / Aqua ────────────────────────────────────────────────────────────
// "Company"(7)×60×0.78+24=351✓  "Name"(4)×60✓  "Headline"(8)×60×0.78+24=398✓
function designPool() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#ffffff"/>
<path d="M0,510 Q75,480 150,510 Q225,540 300,510 Q375,480 450,510 Q525,540 600,510 L600,600 L0,600 Z" fill="#b3dff5"/>
<path d="M0,535 Q75,505 150,535 Q225,565 300,535 Q375,505 450,535 Q525,565 600,535 L600,600 L0,600 Z" fill="#85cff0" opacity="0.7"/>
<circle cx="300" cy="104" r="68" fill="#e0f4fd" stroke="#4ab8e8" stroke-width="4"/>
<path d="M258,104 Q300,90 342,104" fill="none" stroke="#4ab8e8" stroke-width="5" stroke-linecap="round"/>
<line x1="278" y1="82" x2="278" y2="130" stroke="#4ab8e8" stroke-width="6" stroke-linecap="round"/>
<line x1="322" y1="82" x2="322" y2="130" stroke="#4ab8e8" stroke-width="6" stroke-linecap="round"/>
<line x1="278" y1="96" x2="322" y2="96" stroke="#4ab8e8" stroke-width="4" stroke-linecap="round"/>
<line x1="278" y1="112" x2="322" y2="112" stroke="#4ab8e8" stroke-width="4" stroke-linecap="round"/>
<text x="300" y="234" text-anchor="middle" font-size="60" font-family="Georgia,serif" fill="#4ab8e8" font-weight="bold">Company</text>
<text x="300" y="302" text-anchor="middle" font-size="60" font-family="Georgia,serif" fill="#4ab8e8" font-weight="bold">Name</text>
<text x="300" y="404" text-anchor="middle" font-size="60" font-family="Georgia,serif" fill="#555555" font-weight="bold">Headline</text>
<text x="300" y="538" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="#4ab8e8">Web / Other</text>
<text x="300" y="568" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="#4ab8e8" font-weight="bold">Phone / Other</text>
</svg>`);
}

// ── 5. Baptism / Baby ────────────────────────────────────────────────────────
// "Baby's"(6)×60×0.78+24=305✓  "Name"(4)×60✓  "YOUR MESSAGE"(12)×32×0.78+24=323✓  "HERE"(4)×32✓
function designBaptism() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#a8d8e8"/>
${imgPH(0, 0, 600, 248)}
<polygon points="300,266 340,292 300,330 260,292" fill="white" opacity="0.92"/>
<line x1="300" y1="278" x2="300" y2="318" stroke="#a8d8e8" stroke-width="5" stroke-linecap="round"/>
<line x1="282" y1="294" x2="318" y2="294" stroke="#a8d8e8" stroke-width="5" stroke-linecap="round"/>
<polygon points="260,292 228,314 242,292 260,270" fill="rgba(255,255,255,0.7)"/>
<polygon points="340,292 372,314 358,292 340,270" fill="rgba(255,255,255,0.7)"/>
<text x="300" y="390" text-anchor="middle" font-size="60" font-family="Georgia,serif" fill="white" font-style="italic">Baby's</text>
<text x="300" y="454" text-anchor="middle" font-size="60" font-family="Georgia,serif" fill="white" font-style="italic">Name</text>
<text x="300" y="506" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" font-weight="bold" fill="#2d6a7a" letter-spacing="1">YOUR MESSAGE</text>
<text x="300" y="542" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" font-weight="bold" fill="#2d6a7a" letter-spacing="1">HERE</text>
</svg>`);
}

// ── 6. Sports / Mother's Day ──────────────────────────────────────────────────
// "Your"(4)×76×0.78+24=261✓  "message"(7)×62×0.78+24=362✓  "here"(4)×76✓  "MOTHER'S NAME"(13)×28×0.78+24=307✓
function designSports() {
  const fc=["#e06030","#d4c030","#c44040","#60a030","#4060c0","#c05050","#a0a020","#3090a0","#c04060"];
  const flags=fc.map((c,i)=>{const x=54+i*56;return `<polygon points="${x},60 ${x+48},60 ${x+24},100" fill="${c}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>`;}).join("");
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#d6c9a8"/>
<path d="M48,48 Q300,35 552,48" fill="none" stroke="#888" stroke-width="1.5"/>
${flags}
<text x="300" y="196" text-anchor="middle" font-size="76" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">Your</text>
<text x="300" y="280" text-anchor="middle" font-size="62" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">message</text>
<text x="300" y="364" text-anchor="middle" font-size="76" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">here</text>
<circle cx="230" cy="448" r="42" fill="#e07820"/>
<line x1="196" y1="432" x2="264" y2="464" stroke="rgba(0,0,0,0.25)" stroke-width="3"/>
<line x1="196" y1="464" x2="264" y2="432" stroke="rgba(0,0,0,0.25)" stroke-width="3"/>
<circle cx="308" cy="446" r="36" fill="white" stroke="#888" stroke-width="2"/>
<line x1="308" y1="410" x2="308" y2="482" stroke="#555" stroke-width="2"/>
<line x1="272" y1="446" x2="344" y2="446" stroke="#555" stroke-width="2"/>
<circle cx="370" cy="456" r="30" fill="#8b4513" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
<polygon points="30,530 570,530 570,574 30,574" fill="#b83a3a"/>
<polygon points="30,530 14,552 30,574" fill="#8b2b2b"/>
<polygon points="570,530 586,552 570,574" fill="#8b2b2b"/>
<text x="300" y="560" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">MOTHER'S NAME</text>
</svg>`);
}

// ── 7. Golf / Green ──────────────────────────────────────────────────────────
// "Company"(7)×58×0.78+24=340✓  "Name"(4)×58✓  "Phone /"(7)×56×0.78+24=330✓  "Other"(5)×56✓
function designGolf() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="600" fill="#1e4a20"/>
<path d="M480,0 Q600,120 540,300 Q500,420 580,600" fill="none" stroke="rgba(100,200,80,0.18)" stroke-width="60"/>
<path d="M520,0 Q640,140 560,320 Q510,440 600,600" fill="none" stroke="rgba(80,180,60,0.12)" stroke-width="40"/>
<path d="M-40,400 Q80,480 60,600" fill="none" stroke="rgba(100,200,80,0.15)" stroke-width="50"/>
<text x="300" y="168" text-anchor="middle" font-size="58" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company</text>
<text x="300" y="234" text-anchor="middle" font-size="58" font-family="Arial,sans-serif" font-weight="bold" fill="white">Name</text>
<text x="300" y="292" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Company Message</text>
<line x1="80" y1="318" x2="520" y2="318" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
<text x="300" y="404" text-anchor="middle" font-size="56" font-family="Georgia,serif" fill="white" font-style="italic" font-weight="bold">Phone /</text>
<text x="300" y="468" text-anchor="middle" font-size="56" font-family="Georgia,serif" fill="white" font-style="italic" font-weight="bold">Other</text>
<text x="300" y="516" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">Web / Other</text>
</svg>`);
}

// ── 8. Landscaping / Gardening ───────────────────────────────────────────────
// "COMPANY"(7)×56×0.78+24=330✓  "NAME"(4)×56✓  "Company"(7)×32×0.78+24=199✓  "Message"(7)×32✓
// "Phone /"(7)×48×0.78+24=286✓  "Other"(5)×48✓
function designLandscaping() {
  return svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<rect width="600" height="330" fill="#2d6a1e"/>
<line x1="0" y1="40" x2="600" y2="38" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
<line x1="0" y1="90" x2="600" y2="92" stroke="rgba(60,120,20,0.3)" stroke-width="22"/>
<line x1="0" y1="140" x2="600" y2="138" stroke="rgba(255,255,255,0.05)" stroke-width="16"/>
<line x1="0" y1="200" x2="600" y2="202" stroke="rgba(60,120,20,0.25)" stroke-width="20"/>
<rect y="330" width="600" height="270" fill="#2e1a0a"/>
<line x1="0" y1="370" x2="600" y2="372" stroke="rgba(100,60,20,0.3)" stroke-width="18"/>
<line x1="0" y1="420" x2="600" y2="418" stroke="rgba(60,30,10,0.25)" stroke-width="22"/>
<line x1="0" y1="470" x2="600" y2="472" stroke="rgba(100,60,20,0.2)" stroke-width="16"/>
<line x1="188" y1="48" x2="188" y2="162" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/>
<ellipse cx="188" cy="178" rx="22" ry="20" fill="none" stroke="#d4900a" stroke-width="7"/>
<line x1="175" y1="158" x2="201" y2="158" stroke="#d4900a" stroke-width="7"/>
<line x1="300" y1="40" x2="300" y2="148" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/>
<ellipse cx="300" cy="40" rx="44" ry="20" fill="#d4900a"/>
<line x1="265" y1="40" x2="258" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/>
<line x1="280" y1="40" x2="276" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/>
<line x1="320" y1="40" x2="324" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/>
<line x1="335" y1="40" x2="342" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/>
<line x1="412" y1="48" x2="412" y2="162" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/>
<line x1="390" y1="48" x2="390" y2="100" stroke="#d4900a" stroke-width="7" stroke-linecap="round"/>
<line x1="434" y1="48" x2="434" y2="100" stroke="#d4900a" stroke-width="7" stroke-linecap="round"/>
<line x1="385" y1="100" x2="439" y2="100" stroke="#d4900a" stroke-width="6"/>
<line x1="60" y1="198" x2="540" y2="198" stroke="#d4900a" stroke-width="2.5"/>
<text x="300" y="248" text-anchor="middle" font-size="56" font-family="Arial,sans-serif" font-weight="bold" fill="#d4900a" letter-spacing="2">COMPANY</text>
<text x="300" y="308" text-anchor="middle" font-size="56" font-family="Arial,sans-serif" font-weight="bold" fill="#d4900a" letter-spacing="2">NAME</text>
<text x="300" y="380" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" fill="#d4900a" font-weight="bold">Company</text>
<text x="300" y="420" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" fill="#d4900a" font-weight="bold">Message</text>
<text x="300" y="480" text-anchor="middle" font-size="48" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone /</text>
<text x="300" y="534" text-anchor="middle" font-size="48" font-family="Arial,sans-serif" font-weight="bold" fill="white">Other</text>
</svg>`);
}

const DESIGNS = [
  { name: "Red Sale",     fn: designRedSale },
  { name: "Open House",   fn: designOpenHouse },
  { name: "BBQ Party",    fn: designBBQParty },
  { name: "Pool Aqua",    fn: designPool },
  { name: "Baptism",      fn: designBaptism },
  { name: "Sports",       fn: designSports },
  { name: "Golf Green",   fn: designGolf },
  { name: "Landscaping",  fn: designLandscaping },
];

const stmt = db.prepare(`INSERT INTO designs (id,gallery_id,name,color_hex,color_name,front_image,front_bg_color,created_at) VALUES (?,?,?,?,?,?,?,?)`);
const run = db.transaction(() => {
  const del = db.prepare("DELETE FROM designs WHERE gallery_id=?").run(GALLERY_ID).changes;
  console.log(`Cleared ${del} existing design(s)\n`);
  const now = new Date().toISOString();
  for(const d of DESIGNS){ stmt.run(uid(),GALLERY_ID,d.name,null,null,d.fn(),null,now); console.log(`  ✓  ${d.name}`); }
  db.prepare("UPDATE gallery_templates SET preview_image=? WHERE id=?").run(DESIGNS[0].fn(),GALLERY_ID);
  console.log(`\nPreview → "${DESIGNS[0].name}"`);
  return DESIGNS.length;
});
console.log(`\nDone — ${run()} designs seeded.`);
db.close();
