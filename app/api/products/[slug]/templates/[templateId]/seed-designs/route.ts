import { NextResponse } from "next/server";
import { getGalleryTemplate, addDesign } from "@/lib/template-data";

export const dynamic = "force-dynamic";

function b64(svg: string) {
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

// ── 20 fully distinct layout functions ────────────────────────────────────────

// 1. HALF & HALF — left half solid color, right half white, name vertical on left
function layoutHalfSplit(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<rect width="200" height="270" fill="${p}"/>
<text x="100" y="105" text-anchor="middle" font-size="11" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="3">COMPANY</text>
<text x="100" y="124" text-anchor="middle" font-size="11" font-family="Georgia,serif" font-weight="bold" fill="${a}" letter-spacing="3">NAME</text>
<text x="100" y="150" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="2">Company Message</text>
<line x1="60" y1="170" x2="140" y2="170" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="100" y="205" text-anchor="middle" font-size="6" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">www.company.com</text>
<text x="228" y="80" font-size="17" font-family="Georgia,serif" font-weight="bold" fill="#111827">Full Name</text>
<rect x="228" y="92" width="35" height="2.5" fill="${a}"/>
<text x="228" y="112" font-size="9" font-family="Arial,sans-serif" fill="${p}" letter-spacing="1">JOB TITLE</text>
<line x1="228" y1="128" x2="440" y2="128" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="228" y="150" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1</text>
<text x="228" y="164" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 2</text>
<text x="228" y="185" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="228" y="199" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other</text>
<text x="228" y="213" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 2. GIANT NAME — name in huge type dominates entire card, tiny contact below
function layoutGiantName(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<rect width="460" height="5" fill="${p}"/>
<text x="30" y="90" font-size="48" font-family="Georgia,serif" font-weight="bold" fill="${p}" opacity="0.08">NAME</text>
<text x="30" y="88" font-size="46" font-family="Georgia,serif" font-weight="900" fill="${p}">Full</text>
<text x="30" y="148" font-size="46" font-family="Georgia,serif" font-weight="900" fill="${p}">Name</text>
<rect x="30" y="162" width="180" height="2" fill="${a}"/>
<text x="30" y="182" font-size="8.5" font-family="Arial,sans-serif" fill="#374151" letter-spacing="2">JOB TITLE</text>
<line x1="30" y1="200" x2="440" y2="200" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="30" y="218" font-size="7" font-family="Arial,sans-serif" fill="#9ca3af">COMPANY NAME  ·  Company Message</text>
<text x="30" y="235" font-size="7" font-family="Arial,sans-serif" fill="#9ca3af">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 3. DIAGONAL STRIPE — angled band cutting across the middle of the card
function layoutDiagStripe(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<polygon points="0,85 460,140 460,185 0,130" fill="${p}"/>
<polygon points="0,95 460,150 460,158 0,103" fill="${a}" opacity="0.5"/>
<text x="25" y="62" font-size="15" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">COMPANY NAME</text>
<text x="25" y="78" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<text x="25" y="158" font-size="16" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">Full Name</text>
<text x="25" y="174" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)" letter-spacing="1.5">JOB TITLE</text>
<text x="25" y="212" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="25" y="226" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 4. HEXAGON BADGE — large hexagon in center-left, contact stacked right
function layoutHexBadge(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#f8fafc"/>
<polygon points="110,28 160,28 185,70 160,112 110,112 85,70" fill="${p}"/>
<polygon points="112,32 158,32 181,70 158,108 112,108 89,70" fill="none" stroke="${a}" stroke-width="1.5"/>
<text x="135" y="66" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<text x="135" y="84" text-anchor="middle" font-size="6" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1.5">EST. 2010</text>
<text x="210" y="56" font-size="15" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="0.5">COMPANY NAME</text>
<text x="210" y="72" font-size="7.5" font-family="Arial,sans-serif" fill="#6b7280">Company Message</text>
<line x1="210" y1="84" x2="440" y2="84" stroke="${a}" stroke-width="1.5"/>
<text x="210" y="112" font-size="17" font-family="Georgia,serif" fill="#111827" font-weight="bold">Full Name</text>
<text x="210" y="130" font-size="9" font-family="Arial,sans-serif" fill="${p}">Job Title</text>
<text x="210" y="165" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="210" y="180" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="210" y="195" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 5. NEWSPAPER — strict ruled-line grid, bold masthead style
function layoutNewspaper(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<rect width="460" height="3" fill="${p}"/>
<rect y="45" width="460" height="1" fill="#111827"/>
<rect y="47" width="460" height="3" fill="#111827"/>
<text x="230" y="34" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="900" fill="#111827" letter-spacing="4">COMPANY NAME</text>
<text x="25" y="78" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="#111827">Full Name</text>
<rect x="25" y="84" width="260" height="1" fill="#e5e7eb"/>
<text x="25" y="102" font-size="10" font-family="Arial,sans-serif" fill="${p}" letter-spacing="2" font-weight="bold">JOB TITLE</text>
<rect x="290" y="50" width="1" fill="#e5e7eb" height="170"/>
<text x="305" y="75" font-size="7.5" font-family="Georgia,serif" fill="#374151" font-weight="bold">Company Message</text>
<line x1="305" y1="82" x2="440" y2="82" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="305" y="100" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1</text>
<text x="305" y="114" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 2</text>
<text x="305" y="135" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="305" y="149" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other</text>
<text x="305" y="163" font-size="7" font-family="Arial,sans-serif" fill="${a}" font-weight="bold">Web / Other</text>
<rect y="220" width="460" height="1" fill="#e5e7eb"/>
<text x="230" y="238" text-anchor="middle" font-size="7" font-family="Georgia,serif" fill="#9ca3af" letter-spacing="2">EST. 2010  ·  PRINT. DESIGN. PACK. DELIVER.</text>
</svg>`);
}

// 6. ARC ARCH — curved top arch shape framing company info
function layoutArch(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<path d="M20,270 L20,120 Q20,20 230,20 Q440,20 440,120 L440,270 Z" fill="${p}"/>
<path d="M40,270 L40,125 Q40,42 230,42 Q420,42 420,125 L420,270 Z" fill="rgba(255,255,255,0.07)"/>
<text x="230" y="100" text-anchor="middle" font-size="16" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="230" y="118" text-anchor="middle" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="2">Company Message</text>
<circle cx="230" cy="148" r="22" fill="rgba(255,255,255,0.15)"/>
<text x="230" y="155" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">H</text>
<text x="230" y="192" text-anchor="middle" font-size="15" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">Full Name</text>
<text x="230" y="209" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<text x="230" y="235" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Email  ·  Phone  ·  Web / Other</text>
</svg>`);
}

// 7. TICKET STUB — perforated tear line dividing upper and lower halves
function layoutTicket(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="${p}"/>
<rect y="148" width="460" height="122" fill="#ffffff"/>
<line x1="0" y1="148" x2="460" y2="148" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="8 5"/>
<circle cx="0" cy="148" r="10" fill="#f8fafc"/>
<circle cx="460" cy="148" r="10" fill="#f8fafc"/>
<text x="230" y="58" text-anchor="middle" font-size="19" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="230" y="76" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)" letter-spacing="2">Company Message / Tagline</text>
<line x1="100" y1="94" x2="360" y2="94" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<text x="230" y="120" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3">PREMIUM PRINTING SERVICES</text>
<text x="30" y="178" font-size="16" font-family="Georgia,serif" font-weight="bold" fill="#111827">Full Name</text>
<text x="30" y="195" font-size="8.5" font-family="Arial,sans-serif" fill="${p}">Job Title</text>
<text x="30" y="220" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="30" y="234" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 8. FLOATING CARD — white inset card on colored background with drop shadow feel
function layoutFloatingCard(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="${p}"/>
<rect x="24" y="20" width="412" height="230" rx="10" fill="rgba(0,0,0,0.18)"/>
<rect x="20" y="16" width="412" height="230" rx="10" fill="#ffffff"/>
<text x="50" y="62" font-size="16" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">COMPANY NAME</text>
<text x="50" y="78" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<rect x="50" y="90" width="50" height="3" fill="${a}"/>
<rect x="108" y="90" width="20" height="3" fill="${p}" opacity="0.3"/>
<text x="50" y="130" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#111827">Full Name</text>
<text x="50" y="150" font-size="9.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<line x1="50" y1="166" x2="400" y2="166" stroke="#f3f4f6" stroke-width="1.5"/>
<text x="50" y="186" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="50" y="201" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 9. OVERLAPPING CIRCLES — two overlapping circles as decorative background element
function layoutCircles(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<circle cx="370" cy="135" r="110" fill="${p}" opacity="0.08"/>
<circle cx="420" cy="80" r="70" fill="${a}" opacity="0.12"/>
<circle cx="380" cy="135" r="75" fill="none" stroke="${p}" stroke-width="1" opacity="0.2"/>
<text x="30" y="72" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">Full Name</text>
<text x="30" y="92" font-size="9.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<line x1="30" y1="108" x2="220" y2="108" stroke="#e5e7eb" stroke-width="1"/>
<text x="30" y="138" font-size="13" font-family="Georgia,serif" font-weight="bold" fill="${p}">COMPANY NAME</text>
<text x="30" y="155" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message / Tagline</text>
<line x1="30" y1="172" x2="220" y2="172" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="30" y="193" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="30" y="207" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="30" y="221" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 10. STAMP / VINTAGE SEAL — round stamp badge top-right, classic serif body
function layoutStamp(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#fffdf7"/>
<circle cx="380" cy="70" r="55" fill="none" stroke="${p}" stroke-width="2.5" stroke-dasharray="6 3"/>
<circle cx="380" cy="70" r="44" fill="${p}"/>
<circle cx="380" cy="70" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="380" y="60" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)" letter-spacing="3">EST. 2010</text>
<text x="380" y="76" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">H</text>
<text x="380" y="92" text-anchor="middle" font-size="6" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">VERIFIED</text>
<text x="30" y="62" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">COMPANY NAME</text>
<text x="30" y="80" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="1">Company Message / Tagline</text>
<line x1="30" y1="95" x2="300" y2="95" stroke="${a}" stroke-width="1.5"/>
<text x="30" y="130" font-size="17" font-family="Georgia,serif" fill="#111827" font-weight="bold">Full Name</text>
<text x="30" y="150" font-size="9" font-family="Arial,sans-serif" fill="${p}" letter-spacing="1">Job Title</text>
<text x="30" y="185" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="30" y="200" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="30" y="215" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 11. CORNER FLAG — solid triangle fills bottom-right, name top-left
function layoutCornerFlag(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<polygon points="460,270 460,50 180,270" fill="${p}"/>
<polygon points="460,270 460,80 210,270" fill="${a}" opacity="0.25"/>
<text x="30" y="62" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="${p}">Full Name</text>
<text x="30" y="82" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<line x1="30" y1="98" x2="180" y2="98" stroke="#e5e7eb" stroke-width="1"/>
<text x="30" y="128" font-size="13" font-family="Georgia,serif" font-weight="bold" fill="#374151">COMPANY NAME</text>
<text x="30" y="145" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<text x="30" y="185" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="30" y="199" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="30" y="213" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 12. BANDS VERTICAL — three vertical color bands on left edge, content flows right
function layoutVertBands(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<rect width="10" height="270" fill="${p}"/>
<rect x="14" width="5" height="270" fill="${a}"/>
<rect x="23" width="3" height="270" fill="${p}" opacity="0.3"/>
<text x="46" y="55" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="#111827">Full Name</text>
<text x="46" y="74" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<rect x="46" y="86" width="380" height="1" fill="${p}" opacity="0.15"/>
<text x="46" y="116" font-size="14" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">COMPANY NAME</text>
<text x="46" y="134" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message / Tagline</text>
<rect x="46" y="148" width="380" height="1" fill="#e5e7eb"/>
<text x="46" y="170" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="46" y="186" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="46" y="202" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
<text x="430" y="252" text-anchor="end" font-size="7" font-family="Arial,sans-serif" fill="${a}" font-weight="bold">www.company.com</text>
</svg>`);
}

// 13. DARK LUXURY — all dark background, gold/light accent, minimal info
function layoutLuxury(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#0f1117"/>
<rect width="460" height="2" fill="${a}"/>
<rect y="268" width="460" height="2" fill="${a}"/>
<line x1="30" y1="50" x2="430" y2="50" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<line x1="30" y1="220" x2="430" y2="220" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<text x="230" y="105" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="6" font-weight="bold">COMPANY NAME</text>
<text x="230" y="123" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.3)" letter-spacing="3">Company Message</text>
<line x1="170" y1="140" x2="290" y2="140" stroke="${a}" stroke-width="0.8" opacity="0.5"/>
<text x="230" y="168" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">Full Name</text>
<text x="230" y="186" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="${a}" letter-spacing="3">JOB TITLE</text>
<text x="230" y="210" text-anchor="middle" font-size="6.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 14. PHOTO PORTRAIT — photo upload box left, bold name & info stacked right
function layoutPhoto(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#f8fafc"/>
<rect x="20" y="20" width="155" height="230" rx="8" fill="${p}"/>
<text x="97" y="120" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Upload Your</text>
<text x="97" y="134" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Photo / Design</text>
<circle cx="97" cy="95" r="18" fill="rgba(255,255,255,0.1)"/>
<text x="97" y="101" text-anchor="middle" font-size="16" font-family="Georgia,serif" fill="rgba(255,255,255,0.4)">H</text>
<text x="97" y="210" text-anchor="middle" font-size="6" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1.5">EST. 2010</text>
<text x="196" y="60" font-size="13" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="0.5">COMPANY NAME</text>
<text x="196" y="76" font-size="7" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<line x1="196" y1="88" x2="440" y2="88" stroke="${a}" stroke-width="1.5"/>
<text x="196" y="118" font-size="17" font-family="Georgia,serif" fill="#111827" font-weight="bold">Full Name</text>
<text x="196" y="138" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1">Job Title</text>
<text x="196" y="172" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="196" y="187" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="196" y="202" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 15. SCALLOP BOTTOM — scalloped wave fills bottom third, dark name top
function layoutScallop(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<path d="M0,185 Q25,165 50,185 Q75,205 100,185 Q125,165 150,185 Q175,205 200,185 Q225,165 250,185 Q275,205 300,185 Q325,165 350,185 Q375,205 400,185 Q425,165 450,185 L460,185 L460,270 L0,270 Z" fill="${p}"/>
<text x="30" y="58" font-size="21" font-family="Georgia,serif" font-weight="bold" fill="${p}">Full Name</text>
<text x="30" y="78" font-size="9.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<line x1="30" y1="95" x2="280" y2="95" stroke="#e5e7eb" stroke-width="1"/>
<text x="30" y="125" font-size="13" font-family="Georgia,serif" font-weight="bold" fill="#374151">COMPANY NAME</text>
<text x="30" y="143" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<text x="30" y="168" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="230" y="216" text-anchor="middle" font-size="8" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">COMPANY NAME</text>
<text x="230" y="232" text-anchor="middle" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 16. RULED LINES — legal pad style with ruled lines, tab at top
function layoutRuled(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#fffef5"/>
<rect width="460" height="38" fill="${p}"/>
<rect x="0" y="38" width="460" height="3" fill="${a}"/>
<line x1="55" y1="38" x2="55" y2="270" stroke="${a}" stroke-width="1.5" opacity="0.4"/>
<line x1="0" y1="88" x2="460" y2="88" stroke="${a}" stroke-width="0.6" opacity="0.25"/>
<line x1="0" y1="118" x2="460" y2="118" stroke="${a}" stroke-width="0.6" opacity="0.25"/>
<line x1="0" y1="148" x2="460" y2="148" stroke="${a}" stroke-width="0.6" opacity="0.25"/>
<line x1="0" y1="178" x2="460" y2="178" stroke="${a}" stroke-width="0.6" opacity="0.25"/>
<line x1="0" y1="208" x2="460" y2="208" stroke="${a}" stroke-width="0.6" opacity="0.25"/>
<text x="230" y="25" text-anchor="middle" font-size="15" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="75" y="74" font-size="19" font-family="Georgia,serif" font-weight="bold" fill="${p}">Full Name</text>
<text x="75" y="108" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1">Job Title</text>
<text x="75" y="138" font-size="7.5" font-family="Arial,sans-serif" fill="#374151">Company Message / Tagline</text>
<text x="75" y="168" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="75" y="198" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other</text>
<text x="75" y="228" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 17. DIAMOND CENTER — large rotated diamond shape as main visual
function layoutDiamond(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#f8fafc"/>
<rect x="8" y="8" width="444" height="254" rx="6" fill="#ffffff"/>
<polygon points="230,30 310,135 230,240 150,135" fill="${p}" opacity="0.06"/>
<polygon points="230,42 298,135 230,228 162,135" fill="none" stroke="${p}" stroke-width="1.5" opacity="0.3"/>
<circle cx="230" cy="135" r="32" fill="${p}"/>
<text x="230" y="131" text-anchor="middle" font-size="11" font-family="Georgia,serif" fill="#ffffff" font-weight="bold">FULL</text>
<text x="230" y="147" text-anchor="middle" font-size="11" font-family="Georgia,serif" fill="${a}" font-weight="bold">NAME</text>
<text x="55" y="85" font-size="10" font-family="Georgia,serif" font-weight="bold" fill="${p}">COMPANY NAME</text>
<text x="55" y="100" font-size="6.5" font-family="Arial,sans-serif" fill="#9ca3af">Company Message</text>
<text x="55" y="190" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1</text>
<text x="55" y="204" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="310" y="85" font-size="8.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1">JOB TITLE</text>
<text x="310" y="190" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 2</text>
<text x="310" y="204" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other</text>
<text x="310" y="218" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Web / Other</text>
</svg>`);
}

// 18. GRID TECH — dot-grid background, tech/modern feel with corner accents
function layoutGridTech(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#0d1117"/>
<pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
  <circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.06)"/>
</pattern>
<rect width="460" height="270" fill="url(#dots)"/>
<rect width="460" height="50" fill="${p}" opacity="0.9"/>
<line x1="0" y1="50" x2="460" y2="50" stroke="${a}" stroke-width="1.5"/>
<rect x="30" y="60" width="200" height="1" fill="rgba(255,255,255,0.08)"/>
<text x="30" y="32" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="30" y="46" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="2">Company Message</text>
<text x="30" y="92" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Full Name</text>
<text x="30" y="112" font-size="9" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">JOB TITLE</text>
<line x1="30" y1="128" x2="200" y2="128" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
<text x="30" y="150" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">Address Line 1  ·  Address Line 2</text>
<text x="30" y="165" font-size="7" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)">Email / Other  ·  Phone / Other</text>
<text x="30" y="180" font-size="7" font-family="Arial,sans-serif" fill="${a}" opacity="0.8">Web / Other</text>
<polygon points="400,60 460,60 460,0" fill="${a}" opacity="0.15"/>
<text x="430" y="32" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="${a}" opacity="0.4" font-weight="bold">H</text>
</svg>`);
}

// 19. WAVE DIVIDER — S-curve wave splits upper and lower areas
function layoutWaveDivide(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="${p}"/>
<path d="M0,140 C80,100 160,180 230,140 C300,100 380,180 460,140 L460,270 L0,270 Z" fill="#ffffff"/>
<text x="30" y="60" font-size="17" font-family="Georgia,serif" font-weight="bold" fill="#ffffff" letter-spacing="1">COMPANY NAME</text>
<text x="30" y="78" font-size="7.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="1.5">Company Message</text>
<text x="30" y="112" font-size="14" font-family="Georgia,serif" font-weight="bold" fill="${a}">Full Name</text>
<text x="30" y="130" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)" letter-spacing="1.5">JOB TITLE</text>
<text x="30" y="178" font-size="14" font-family="Georgia,serif" font-weight="bold" fill="${p}">Full Name</text>
<text x="30" y="196" font-size="8.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="1">JOB TITLE</text>
<text x="30" y="222" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1  ·  Address Line 2</text>
<text x="30" y="236" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other  ·  Phone / Other  ·  Web / Other</text>
</svg>`);
}

// 20. MONOLINE IDENTITY — single thin rule separates logo area from contact, ultra clean
function layoutMonoline(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 270">
<rect width="460" height="270" fill="#ffffff"/>
<rect x="30" y="30" width="2" height="210" fill="${p}"/>
<text x="48" y="72" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${p}" letter-spacing="1">COMPANY</text>
<text x="48" y="96" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${a}" letter-spacing="1">NAME</text>
<text x="48" y="118" font-size="7.5" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="2">Company Message</text>
<line x1="48" y1="138" x2="220" y2="138" stroke="#e5e7eb" stroke-width="1"/>
<text x="48" y="165" font-size="15" font-family="Georgia,serif" fill="#111827" font-weight="bold">Full Name</text>
<text x="48" y="183" font-size="8.5" font-family="Arial,sans-serif" fill="${p}" letter-spacing="2">JOB TITLE</text>
<line x1="250" y1="30" x2="250" y2="240" stroke="#f3f4f6" stroke-width="1"/>
<text x="268" y="70" font-size="7" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="1">CONTACT</text>
<line x1="268" y1="78" x2="430" y2="78" stroke="#e5e7eb" stroke-width="0.8"/>
<text x="268" y="100" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 1</text>
<text x="268" y="115" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Address Line 2</text>
<text x="268" y="138" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Email / Other</text>
<text x="268" y="153" font-size="7" font-family="Arial,sans-serif" fill="#6b7280">Phone / Other</text>
<text x="268" y="168" font-size="7" font-family="Arial,sans-serif" fill="${a}" font-weight="bold">Web / Other</text>
</svg>`);
}

// ─── 20 designs — every entry a different structural layout ──────────────────

type SeedEntry = { name: string; fn: (p: string, a: string) => string; p: string; a: string; bg: string };

const SEED_DESIGNS: SeedEntry[] = [
  { name: "Half & Half",        fn: layoutHalfSplit,   p: "#1e3a5f", a: "#06b6d4", bg: "#ffffff" },
  { name: "Giant Name",         fn: layoutGiantName,   p: "#9f1239", a: "#fda4af", bg: "#ffffff" },
  { name: "Diagonal Stripe",    fn: layoutDiagStripe,  p: "#7c3aed", a: "#a78bfa", bg: "#ffffff" },
  { name: "Hex Badge",          fn: layoutHexBadge,    p: "#065f46", a: "#34d399", bg: "#f8fafc" },
  { name: "Newspaper",          fn: layoutNewspaper,   p: "#111827", a: "#f59e0b", bg: "#ffffff" },
  { name: "Arch Banner",        fn: layoutArch,        p: "#1d4ed8", a: "#60a5fa", bg: "#ffffff" },
  { name: "Ticket Stub",        fn: layoutTicket,      p: "#0d9488", a: "#99f6e4", bg: "#0d9488" },
  { name: "Floating Card",      fn: layoutFloatingCard,p: "#7c3aed", a: "#c4b5fd", bg: "#7c3aed" },
  { name: "Circles",            fn: layoutCircles,     p: "#9d174d", a: "#f9a8d4", bg: "#ffffff" },
  { name: "Vintage Stamp",      fn: layoutStamp,       p: "#92400e", a: "#fbbf24", bg: "#fffdf7" },
  { name: "Corner Flag",        fn: layoutCornerFlag,  p: "#1e3a5f", a: "#06b6d4", bg: "#ffffff" },
  { name: "Vert Bands",         fn: layoutVertBands,   p: "#9f1239", a: "#fda4af", bg: "#ffffff" },
  { name: "Dark Luxury",        fn: layoutLuxury,      p: "#111827", a: "#f59e0b", bg: "#0f1117" },
  { name: "Photo Portrait",     fn: layoutPhoto,       p: "#065f46", a: "#34d399", bg: "#f8fafc" },
  { name: "Scallop Wave",       fn: layoutScallop,     p: "#1d4ed8", a: "#93c5fd", bg: "#ffffff" },
  { name: "Ruled Lines",        fn: layoutRuled,       p: "#0d9488", a: "#5eead4", bg: "#fffef5" },
  { name: "Diamond Center",     fn: layoutDiamond,     p: "#9d174d", a: "#f9a8d4", bg: "#f8fafc" },
  { name: "Grid Tech",          fn: layoutGridTech,    p: "#1e3a5f", a: "#38bdf8", bg: "#0d1117" },
  { name: "Wave Divide",        fn: layoutWaveDivide,  p: "#7c3aed", a: "#c4b5fd", bg: "#ffffff" },
  { name: "Monoline Identity",  fn: layoutMonoline,    p: "#111827", a: "#f59e0b", bg: "#ffffff" },
];

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { slug, templateId } = await params;

  const gallery = getGalleryTemplate(templateId);
  if (!gallery || gallery.productSlug !== slug) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  const existingNames = new Set(gallery.designs.map((d) => d.name));
  let added = 0;

  for (const d of SEED_DESIGNS) {
    if (existingNames.has(d.name)) continue;
    const image = d.fn(d.p, d.a);
    addDesign(templateId, {
      name: d.name,
      frontImage: image,
      frontBgColor: d.bg,
      backBgColor: "#ffffff",
    });
    added++;
  }

  const updated = getGalleryTemplate(templateId);
  return NextResponse.json({ gallery: updated, added });
}
