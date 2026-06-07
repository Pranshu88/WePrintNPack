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
function layoutLuxury(_p: string, a: string) {
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

// ─── Vinyl Banner designs (600×300 viewBox, 2:1 ratio) ───────────────────────

function imgPHVB(x: number, y: number, w: number, h: number) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db" data-placeholder="photo"/>`;
}
const VG = ``;

function vbArrowHeadline() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#ffffff"/><rect y="238" width="600" height="62" fill="#4a7fa5"/><polygon points="220,24 220,220 64,122" fill="#c0392b"/><polygon points="220,122 220,220 64,122" fill="#7b1e1e" opacity="0.28"/><text x="410" y="124" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#2b6cb0">HEADLINE</text><text x="410" y="210" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#c0392b">HEADLINE</text><text x="24" y="277" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text><text x="388" y="277" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>${VG}</svg>`); }
function vbPatriotic() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="120" fill="#dc2626"/><rect y="120" width="600" height="108" fill="#ffffff"/><rect y="228" width="600" height="72" fill="#1d4ed8"/><text x="300" y="204" text-anchor="middle" font-size="84" font-family="Georgia,serif" font-weight="bold" fill="none" stroke="#1d4ed8" stroke-width="3" stroke-linejoin="round">HEADLINE</text><text x="300" y="204" text-anchor="middle" font-size="84" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">HEADLINE</text><text x="150" y="271" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text><text x="450" y="271" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>${VG}</svg>`); }
function vbSaleOrange() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#e04e2c"/><ellipse cx="140" cy="150" rx="130" ry="130" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="28"/><ellipse cx="140" cy="150" rx="188" ry="188" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="26"/><ellipse cx="140" cy="150" rx="246" ry="246" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="24"/><ellipse cx="460" cy="150" rx="130" ry="130" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="28"/><ellipse cx="460" cy="150" rx="188" ry="188" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="26"/><ellipse cx="460" cy="150" rx="246" ry="246" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="24"/><rect y="228" width="600" height="72" fill="#111111"/><text x="300" y="178" text-anchor="middle" font-size="130" font-family="Georgia,serif" font-weight="bold" fill="white">SALE</text><text x="300" y="218" text-anchor="middle" font-size="24" font-family="Georgia,serif" fill="rgba(255,255,255,0.82)" font-style="italic">your text here</text><text x="300" y="276" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text>${VG}</svg>`); }
function vbDarkMonogram() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#0f0f0f"/><text x="300" y="165" text-anchor="middle" font-size="136" font-family="Georgia,serif" font-weight="bold" fill="white">H</text><text x="300" y="224" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="5">COMPANY NAME</text><text x="300" y="264" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Phone / Other</text>${VG}</svg>`); }
function vbSaleBlue() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#3aade0"/><text x="300" y="148" text-anchor="middle" font-size="122" font-family="Arial,sans-serif" font-weight="bold" fill="white">Sale</text><text x="300" y="188" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.88)">Date</text><line x1="80" y1="215" x2="520" y2="215" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="5,6"/><text x="300" y="243" text-anchor="middle" font-size="19" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.72)">Special Offer</text><text x="300" y="276" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text>${VG}</svg>`); }
function vbPhotoBanner() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#f0f4f8"/><polygon points="0,300 0,218 110,300" fill="#3b82f6" opacity="0.78"/><polygon points="600,300 600,218 490,300" fill="#3b82f6" opacity="0.78"/>${imgPHVB(206, 12, 188, 138)}<text x="300" y="182" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#2563eb">Company Name</text><text x="300" y="210" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#94a3b8">Company Message</text><text x="300" y="252" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#2563eb">Phone / Other</text><text x="300" y="281" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="#94a3b8">Web / Other</text>${VG}</svg>`); }
function vbKidsParty() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"><rect width="600" height="300" fill="#93c5fd"/><ellipse cx="72" cy="60" rx="60" ry="28" fill="white" opacity="0.8"/><ellipse cx="108" cy="48" rx="44" ry="22" fill="white" opacity="0.7"/><ellipse cx="46" cy="68" rx="36" ry="18" fill="white" opacity="0.65"/><ellipse cx="502" cy="68" rx="58" ry="28" fill="white" opacity="0.75"/><ellipse cx="538" cy="54" rx="42" ry="22" fill="white" opacity="0.65"/><ellipse cx="185" cy="262" rx="46" ry="18" fill="white" opacity="0.45"/><ellipse cx="400" cy="274" rx="42" ry="15" fill="white" opacity="0.38"/><ellipse cx="530" cy="132" rx="34" ry="44" fill="#fbbf24"/><ellipse cx="520" cy="116" rx="11" ry="14" fill="rgba(255,255,255,0.28)"/><line x1="530" y1="176" x2="522" y2="218" stroke="#b7860a" stroke-width="2"/><text x="268" y="150" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">YOUR TEXT</text><text x="268" y="218" text-anchor="middle" font-size="52" font-family="Georgia,serif" font-weight="bold" fill="#dc2626">YOUR TEXT</text><line x1="28" y1="258" x2="155" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-dasharray="4,4"/><text x="268" y="263" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.92)" letter-spacing="2">WEB / OTHER</text><line x1="382" y1="258" x2="510" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-dasharray="4,4"/>${VG}</svg>`); }

type VBEntry = { name: string; fn: () => string };
const VINYL_BANNER_DESIGNS: VBEntry[] = [
  { name: "Arrow Headline",  fn: vbArrowHeadline },
  { name: "Patriotic",       fn: vbPatriotic },
  { name: "Sale Orange",     fn: vbSaleOrange },
  { name: "Dark Monogram",   fn: vbDarkMonogram },
  { name: "Sale Blue",       fn: vbSaleBlue },
  { name: "Photo Banner",    fn: vbPhotoBanner },
  { name: "Kids Party",      fn: vbKidsParty },
];

// ─── Standard Roll-Up Banner designs (600×600 viewBox, square canvas) ─────────

function imgPHRU(x: number, y: number, w: number, h: number) {
  const cx = x + w / 2, cy = y + h / 2, fs = Math.max(14, h * 0.07);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#d1d5db"/>` +
    `<text x="${cx}" y="${cy - fs * 0.6}" text-anchor="middle" font-size="${fs}" font-family="Arial,sans-serif" fill="#9ca3af">Upload your photo</text>` +
    `<text x="${cx}" y="${cy + fs * 0.9}" text-anchor="middle" font-size="${fs * 0.85}" font-family="Arial,sans-serif" fill="#9ca3af">click to open from pc</text>`;
}
const RG = ``;

function ruRedSale() {
  const rays = Array.from({length:24},(_,i)=>{const a=(i*Math.PI*2)/24;return `<line x1="${(300+Math.cos(a)*40).toFixed(1)}" y1="${(300+Math.sin(a)*40).toFixed(1)}" x2="${(300+Math.cos(a)*460).toFixed(1)}" y2="${(300+Math.sin(a)*460).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="14"/>`;}).join("");
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#cc2222"/>${rays}<line x1="40" y1="110" x2="560" y2="110" stroke="white" stroke-width="2.5" opacity="0.7"/><text x="300" y="182" text-anchor="middle" font-size="58" font-family="Arial,sans-serif" font-weight="bold" fill="white">YOUR TEXT HERE</text><text x="300" y="252" text-anchor="middle" font-size="58" font-family="Arial,sans-serif" font-weight="bold" fill="white">YOUR TEXT HERE</text><line x1="40" y1="272" x2="560" y2="272" stroke="white" stroke-width="2.5" opacity="0.7"/><text x="300" y="358" text-anchor="middle" font-size="88" font-family="Arial,sans-serif" font-weight="bold" fill="white">XX% OFF</text><text x="300" y="400" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="4">SPECIAL OFFER</text><line x1="100" y1="428" x2="500" y2="428" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/><text x="300" y="472" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">COMPANY NAME</text><text x="300" y="514" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">WEB / OTHER</text><text x="300" y="552" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">PHONE / OTHER</text>${RG}</svg>`);
}
function ruOpenHouse() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="370" fill="#e07c55"/><rect y="370" width="600" height="230" fill="#1e3252"/><polygon points="300,90 420,180 420,300 180,300 180,180" fill="rgba(255,255,255,0.06)"/><polygon points="300,148 374,205 374,270 226,270 226,205" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/><rect x="265" y="228" width="36" height="42" fill="none" stroke="white" stroke-width="5" stroke-linejoin="round"/><text x="300" y="330" text-anchor="middle" font-size="76" font-family="Arial,sans-serif" font-weight="bold" fill="white">HEADLINE</text><text x="300" y="366" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="rgba(255,255,255,0.88)">TIME 2:00PM</text><line x1="60" y1="388" x2="540" y2="388" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/><text x="300" y="462" text-anchor="middle" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">COMPANY NAME</text><text x="300" y="512" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Web / Other</text><text x="300" y="550" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Phone / Other</text>${RG}</svg>`); }
function ruBBQParty() {
  const checks: string[] = [];
  for(let r=0;r<4;r++)for(let c=0;c<22;c++)if((r+c)%2===0)checks.push(`<rect x="${c*28}" y="${540+r*28}" width="28" height="28" fill="#c8453a" opacity="0.72"/>`);
  for(let r=0;r<16;r++)for(let c=0;c<3;c++)if((r+c)%2===0){checks.push(`<rect x="${c*28}" y="${r*28+80}" width="28" height="28" fill="#c8453a" opacity="0.72"/>`);checks.push(`<rect x="${600-(c+1)*28}" y="${r*28+80}" width="28" height="28" fill="#c8453a" opacity="0.72"/>`);}
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e8dfc8"/><line x1="0" y1="60" x2="600" y2="55" stroke="rgba(160,130,90,0.15)" stroke-width="18"/><line x1="0" y1="130" x2="600" y2="128" stroke="rgba(160,130,90,0.1)" stroke-width="22"/><line x1="0" y1="200" x2="600" y2="205" stroke="rgba(160,130,90,0.12)" stroke-width="16"/>${checks.join("")}<rect x="52" y="85" width="496" height="435" rx="4" fill="#f5f0e4" stroke="rgba(100,80,50,0.15)" stroke-width="1.5"/><line x1="232" y1="106" x2="232" y2="158" stroke="#4a3825" stroke-width="6"/><line x1="218" y1="106" x2="218" y2="130" stroke="#4a3825" stroke-width="4"/><line x1="246" y1="106" x2="246" y2="130" stroke="#4a3825" stroke-width="4"/><rect x="292" y="116" width="16" height="16" rx="2" fill="#4a3825" transform="rotate(45,300,124)"/><line x1="368" y1="106" x2="368" y2="158" stroke="#4a3825" stroke-width="6"/><line x1="354" y1="106" x2="354" y2="130" stroke="#4a3825" stroke-width="4"/><line x1="382" y1="106" x2="382" y2="130" stroke="#4a3825" stroke-width="4"/><line x1="218" y1="158" x2="382" y2="158" stroke="#4a3825" stroke-width="2" opacity="0.4"/><text x="300" y="250" text-anchor="middle" font-size="82" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">YOUR</text><text x="300" y="342" text-anchor="middle" font-size="82" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">MESSAGE</text><text x="300" y="434" text-anchor="middle" font-size="82" font-family="Georgia,serif" font-weight="bold" fill="#3a2d20">HERE</text><text x="300" y="492" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#5c4a35" letter-spacing="2">COUPLE'S NAMES</text>${RG}</svg>`);
}
function ruPool() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ffffff"/><path d="M0,510 Q75,480 150,510 Q225,540 300,510 Q375,480 450,510 Q525,540 600,510 L600,600 L0,600 Z" fill="#b3dff5"/><path d="M0,530 Q75,500 150,530 Q225,560 300,530 Q375,500 450,530 Q525,560 600,530 L600,600 L0,600 Z" fill="#85cff0" opacity="0.7"/><circle cx="300" cy="104" r="68" fill="#e0f4fd" stroke="#4ab8e8" stroke-width="4"/><path d="M258,104 Q300,90 342,104" fill="none" stroke="#4ab8e8" stroke-width="5" stroke-linecap="round"/><line x1="278" y1="82" x2="278" y2="130" stroke="#4ab8e8" stroke-width="6" stroke-linecap="round"/><line x1="322" y1="82" x2="322" y2="130" stroke="#4ab8e8" stroke-width="6" stroke-linecap="round"/><line x1="278" y1="96" x2="322" y2="96" stroke="#4ab8e8" stroke-width="4" stroke-linecap="round"/><line x1="278" y1="112" x2="322" y2="112" stroke="#4ab8e8" stroke-width="4" stroke-linecap="round"/><text x="300" y="238" text-anchor="middle" font-size="64" font-family="Georgia,serif" fill="#4ab8e8" font-weight="bold">Company</text><text x="300" y="310" text-anchor="middle" font-size="64" font-family="Georgia,serif" fill="#4ab8e8" font-weight="bold">Name</text><text x="300" y="410" text-anchor="middle" font-size="80" font-family="Georgia,serif" fill="#555555" font-weight="bold">Headline</text><text x="300" y="540" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="#4ab8e8">Web / Other</text><text x="300" y="572" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="#4ab8e8" font-weight="bold">Phone / Other</text>${RG}</svg>`); }
function ruBaptism() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#a8d8e8"/>${imgPHRU(0,0,600,252)}<polygon points="300,270 340,296 300,330 260,296" fill="white" opacity="0.92"/><line x1="300" y1="282" x2="300" y2="320" stroke="#a8d8e8" stroke-width="5" stroke-linecap="round"/><line x1="284" y1="296" x2="316" y2="296" stroke="#a8d8e8" stroke-width="5" stroke-linecap="round"/><polygon points="260,296 230,316 242,296 260,276" fill="rgba(255,255,255,0.7)"/><polygon points="340,296 370,316 358,296 340,276" fill="rgba(255,255,255,0.7)"/><text x="300" y="398" text-anchor="middle" font-size="62" font-family="Georgia,serif" fill="white" font-style="italic">Baby's Name</text><text x="300" y="456" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#2d6a7a" letter-spacing="1">YOUR MESSAGE</text><text x="300" y="496" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#2d6a7a" letter-spacing="1">HERE</text><text x="300" y="550" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">Web / Other  ·  Phone / Other</text>${RG}</svg>`); }
function ruSports() {
  const fc=["#e06030","#d4c030","#c44040","#60a030","#4060c0","#c05050","#a0a020","#3090a0","#c04060"];
  const flags=fc.map((c,i)=>{const x=54+i*56;return `<polygon points="${x},60 ${x+48},60 ${x+24},100" fill="${c}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/><line x1="${x}" y1="60" x2="${x-6}" y2="48" stroke="#555" stroke-width="1.5" opacity="0.5"/><line x1="${x+48}" y1="60" x2="${x+54}" y2="48" stroke="#555" stroke-width="1.5" opacity="0.5"/>`;}).join("");
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#d6c9a8"/><path d="M48,48 Q300,35 552,48" fill="none" stroke="#888" stroke-width="1.5"/>${flags}<text x="300" y="200" text-anchor="middle" font-size="78" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">Your</text><text x="300" y="285" text-anchor="middle" font-size="78" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">message</text><text x="300" y="370" text-anchor="middle" font-size="78" font-family="Georgia,serif" font-weight="bold" fill="#1a4a5c" font-style="italic">here</text><circle cx="230" cy="450" r="42" fill="#e07820"/><line x1="196" y1="435" x2="264" y2="465" stroke="rgba(0,0,0,0.25)" stroke-width="3"/><line x1="196" y1="465" x2="264" y2="435" stroke="rgba(0,0,0,0.25)" stroke-width="3"/><circle cx="308" cy="448" r="36" fill="white" stroke="#888" stroke-width="2"/><line x1="308" y1="412" x2="308" y2="484" stroke="#555" stroke-width="2"/><line x1="272" y1="448" x2="344" y2="448" stroke="#555" stroke-width="2"/><circle cx="370" cy="458" r="30" fill="#8b4513" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/><polygon points="30,532 570,532 570,576 30,576" fill="#b83a3a"/><polygon points="30,532 15,554 30,576" fill="#8b2b2b"/><polygon points="570,532 585,554 570,576" fill="#8b2b2b"/><text x="300" y="562" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" font-weight="bold" fill="white" letter-spacing="2">MOTHER'S NAME</text>${RG}</svg>`);
}
function ruGolf() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#1e4a20"/><path d="M480,0 Q600,120 540,300 Q500,420 580,600" fill="none" stroke="rgba(100,200,80,0.18)" stroke-width="60"/><path d="M520,0 Q640,140 560,320 Q510,440 600,600" fill="none" stroke="rgba(80,180,60,0.12)" stroke-width="40"/><path d="M-40,400 Q80,480 60,600" fill="none" stroke="rgba(100,200,80,0.15)" stroke-width="50"/><text x="300" y="168" text-anchor="middle" font-size="62" font-family="Arial,sans-serif" font-weight="bold" fill="white">Company Name</text><text x="300" y="236" text-anchor="middle" font-size="32" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Company Message</text><line x1="80" y1="266" x2="520" y2="266" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><text x="300" y="372" text-anchor="middle" font-size="72" font-family="Georgia,serif" fill="white" font-style="italic" font-weight="bold">Phone / Other</text><text x="300" y="428" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Web / Other</text>${RG}</svg>`); }
function ruLandscaping() { return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="330" fill="#2d6a1e"/><line x1="0" y1="40" x2="600" y2="38" stroke="rgba(255,255,255,0.06)" stroke-width="18"/><line x1="0" y1="90" x2="600" y2="92" stroke="rgba(60,120,20,0.3)" stroke-width="22"/><line x1="0" y1="140" x2="600" y2="138" stroke="rgba(255,255,255,0.05)" stroke-width="16"/><line x1="0" y1="200" x2="600" y2="202" stroke="rgba(60,120,20,0.25)" stroke-width="20"/><rect y="330" width="600" height="270" fill="#2e1a0a"/><line x1="0" y1="370" x2="600" y2="372" stroke="rgba(100,60,20,0.3)" stroke-width="18"/><line x1="0" y1="420" x2="600" y2="418" stroke="rgba(60,30,10,0.25)" stroke-width="22"/><line x1="0" y1="470" x2="600" y2="472" stroke="rgba(100,60,20,0.2)" stroke-width="16"/><line x1="188" y1="48" x2="188" y2="162" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/><ellipse cx="188" cy="178" rx="22" ry="20" fill="none" stroke="#d4900a" stroke-width="7"/><line x1="175" y1="158" x2="201" y2="158" stroke="#d4900a" stroke-width="7"/><line x1="300" y1="40" x2="300" y2="148" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/><ellipse cx="300" cy="40" rx="44" ry="20" fill="#d4900a"/><line x1="265" y1="40" x2="258" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/><line x1="280" y1="40" x2="276" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/><line x1="320" y1="40" x2="324" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/><line x1="335" y1="40" x2="342" y2="68" stroke="#d4900a" stroke-width="5" stroke-linecap="round"/><line x1="412" y1="48" x2="412" y2="162" stroke="#d4900a" stroke-width="8" stroke-linecap="round"/><line x1="390" y1="48" x2="390" y2="100" stroke="#d4900a" stroke-width="7" stroke-linecap="round"/><line x1="434" y1="48" x2="434" y2="100" stroke="#d4900a" stroke-width="7" stroke-linecap="round"/><line x1="385" y1="100" x2="439" y2="100" stroke="#d4900a" stroke-width="6"/><line x1="60" y1="198" x2="540" y2="198" stroke="#d4900a" stroke-width="2.5"/><text x="300" y="258" text-anchor="middle" font-size="52" font-family="Arial,sans-serif" font-weight="bold" fill="#d4900a" letter-spacing="2">COMPANY NAME</text><line x1="60" y1="282" x2="540" y2="282" stroke="#d4900a" stroke-width="2.5"/><text x="300" y="396" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" fill="#d4900a" font-weight="bold">Company Message</text><text x="300" y="490" text-anchor="middle" font-size="54" font-family="Arial,sans-serif" font-weight="bold" fill="white">Phone / Other</text><text x="300" y="548" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">Web / Other</text>${RG}</svg>`); }

type RUEntry = { name: string; fn: () => string };
const ROLLUP_STD_DESIGNS: RUEntry[] = [
  { name: "Red Sale",     fn: ruRedSale },
  { name: "Open House",   fn: ruOpenHouse },
  { name: "BBQ Party",    fn: ruBBQParty },
  { name: "Pool Aqua",    fn: ruPool },
  { name: "Baptism",      fn: ruBaptism },
  { name: "Sports",       fn: ruSports },
  { name: "Golf Green",   fn: ruGolf },
  { name: "Landscaping",  fn: ruLandscaping },
];

// ─── Flyer designs (600×420 landscape A5) ──────────────────────────────────────

function flyLogistics() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#0f2a4a"/>
<rect width="220" height="420" fill="#1a3d6b"/>
<rect x="220" width="4" height="420" fill="#f97316"/>
<polygon points="224,180 290,210 224,240" fill="#f97316"/>
<text x="110" y="90" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="3">COMPANY NAME</text>
<text x="110" y="168" text-anchor="middle" font-size="26" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">FAST &amp;</text>
<text x="110" y="200" text-anchor="middle" font-size="26" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#f97316">RELIABLE</text>
<text x="110" y="228" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">DELIVERY SOLUTIONS</text>
<line x1="40" y1="248" x2="180" y2="248" stroke="#f97316" stroke-width="1.5" opacity="0.5"/>
<circle cx="46" cy="276" r="3" fill="#f97316"/><text x="58" y="281" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Same-Day Local Delivery</text>
<circle cx="46" cy="298" r="3" fill="#f97316"/><text x="58" y="303" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Nationwide Freight Services</text>
<circle cx="46" cy="320" r="3" fill="#f97316"/><text x="58" y="325" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Warehousing &amp; Storage</text>
<text x="110" y="388" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">123 Business Blvd, City  ·  +1 (234) 567-8900</text>
<text x="412" y="68" text-anchor="middle" font-size="36" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">GET A QUOTE</text>
<rect x="248" y="88" width="320" height="3" fill="#f97316" opacity="0.5"/>
<text x="412" y="148" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">Trusted by 500+ businesses nationwide</text>
<rect x="260" y="178" width="140" height="80" rx="6" fill="rgba(255,255,255,0.06)"/><text x="330" y="224" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)">Upload Photo</text>
<rect x="420" y="178" width="140" height="80" rx="6" fill="rgba(255,255,255,0.06)"/><text x="490" y="224" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)">Upload Photo</text>
<text x="412" y="308" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#f97316">+1 (234) 567-8900</text>
<text x="412" y="330" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">info@company.com</text>
<text x="412" y="352" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">www.yourcompany.com</text>
<rect x="320" y="370" width="184" height="34" rx="6" fill="#f97316"/>
<text x="412" y="393" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">CONTACT US TODAY</text>
</svg>`);
}

function flyRealEstate() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#ffffff"/>
<rect x="0" y="0" width="600" height="6" fill="#c9a84c"/>
<rect x="0" y="414" width="600" height="6" fill="#c9a84c"/>
<rect x="0" y="0" width="6" height="420" fill="#c9a84c"/>
<rect x="594" y="0" width="6" height="420" fill="#c9a84c"/>
<text x="300" y="44" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9a8040" letter-spacing="5" font-weight="bold">PREMIER REAL ESTATE GROUP</text>
<line x1="60" y1="56" x2="540" y2="56" stroke="#c9a84c" stroke-width="1"/>
<rect x="24" y="70" width="258" height="172" rx="4" fill="#e5e7eb"/>
<text x="153" y="161" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">Upload Photo</text>
<rect x="296" y="70" width="280" height="172" rx="4" fill="#e5e7eb"/>
<text x="436" y="161" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">Upload Photo</text>
<text x="300" y="280" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#1a1a1a">YOUR DREAM HOME AWAITS</text>
<text x="300" y="304" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280">Specializing in luxury residential properties</text>
<text x="300" y="320" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b7280">throughout the city and surrounding areas</text>
<line x1="180" y1="336" x2="420" y2="336" stroke="#c9a84c" stroke-width="1"/>
<text x="150" y="360" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Agent Name</text>
<text x="150" y="376" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">+1 (234) 567-8900</text>
<text x="300" y="360" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9a8040">info@yourcompany.com</text>
<text x="450" y="360" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9a8040">www.youragency.com</text>
</svg>`);
}

function flyOpenHouse() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#1a4a2e"/>
<rect x="0" y="0" width="600" height="56" fill="#0d3020"/>
<text x="300" y="36" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="4">REALTY GROUP</text>
<text x="300" y="120" text-anchor="middle" font-size="52" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">OPEN HOUSE</text>
<text x="300" y="150" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="#86efac" letter-spacing="1">Saturday, June 14  ·  1:00 PM – 4:00 PM</text>
<rect x="160" y="170" width="280" height="140" rx="6" fill="rgba(0,0,0,0.25)"/>
<text x="300" y="246" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">Upload Photo</text>
<text x="300" y="336" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">123 Elmwood Drive, City</text>
<text x="300" y="356" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#86efac">3 Bed · 2 Bath · 1,850 sq ft · Listed at $549,000</text>
<line x1="80" y1="372" x2="520" y2="372" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
<text x="300" y="395" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">AGENT NAME  ·  +1 (234) 567-8900  ·  www.yourwebsite.com</text>
</svg>`);
}

function flyRestaurantMenu() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#1a0a04"/>
<rect x="0" y="0" width="220" height="420" fill="#0d0602"/>
<rect x="220" width="2" height="420" fill="#c9a84c" opacity="0.6"/>
<rect x="24" y="24" width="172" height="172" rx="4" fill="#1e0e06"/>
<text x="110" y="116" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.3)">Upload Photo</text>
<text x="110" y="226" text-anchor="middle" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="#c9a84c" letter-spacing="1">RESTAURANT</text>
<text x="110" y="248" text-anchor="middle" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">NAME</text>
<text x="110" y="272" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#c9a84c" letter-spacing="2">FINE DINING &amp; CATERING</text>
<line x1="30" y1="288" x2="190" y2="288" stroke="#c9a84c" stroke-width="0.8" opacity="0.5"/>
<text x="110" y="380" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">123 Dining St  ·  City</text>
<text x="410" y="44" text-anchor="middle" font-size="14" font-family="Georgia,serif" font-weight="bold" fill="#c9a84c" letter-spacing="3">FEATURED DISHES</text>
<line x1="240" y1="58" x2="580" y2="58" stroke="#c9a84c" stroke-width="0.8" opacity="0.4"/>
<text x="260" y="92" font-size="10" font-family="Georgia,serif" fill="#ffffff">Grilled Salmon Fillet</text><text x="575" y="92" text-anchor="end" font-size="10" font-family="Georgia,serif" fill="#c9a84c">$28</text><line x1="240" y1="102" x2="580" y2="102" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<text x="260" y="128" font-size="10" font-family="Georgia,serif" fill="#ffffff">Braised Short Rib</text><text x="575" y="128" text-anchor="end" font-size="10" font-family="Georgia,serif" fill="#c9a84c">$34</text><line x1="240" y1="138" x2="580" y2="138" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<text x="260" y="164" font-size="10" font-family="Georgia,serif" fill="#ffffff">Truffle Mushroom Risotto</text><text x="575" y="164" text-anchor="end" font-size="10" font-family="Georgia,serif" fill="#c9a84c">$26</text><line x1="240" y1="174" x2="580" y2="174" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
<text x="260" y="200" font-size="10" font-family="Georgia,serif" fill="#ffffff">Five Cheese Board</text><text x="575" y="200" text-anchor="end" font-size="10" font-family="Georgia,serif" fill="#c9a84c">$18</text>
<line x1="240" y1="218" x2="580" y2="218" stroke="#c9a84c" stroke-width="0.8" opacity="0.4"/>
<rect x="280" y="300" width="260" height="44" rx="6" fill="#c9a84c"/>
<text x="410" y="328" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="#1a0a04" letter-spacing="1">RESERVE A TABLE</text>
<text x="410" y="382" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">+1 (234) 567-8900  ·  www.restaurant.com</text>
</svg>`);
}

function flyInteriorDesign() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#f8f7f5"/>
<rect x="350" y="0" width="250" height="420" fill="#e8e4de"/>
<rect x="24" y="24" width="310" height="200" rx="4" fill="#d1d5db"/>
<text x="179" y="130" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">Upload Photo</text>
<text x="180" y="264" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af" letter-spacing="3">INTERIOR DESIGN STUDIO</text>
<text x="180" y="294" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#1a1a1a">Transform Your</text>
<text x="180" y="320" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="#1a1a1a">Living Space</text>
<line x1="100" y1="336" x2="260" y2="336" stroke="#9ca3af" stroke-width="1"/>
<text x="180" y="358" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">Studio Name  ·  www.budistudio.com</text>
<text x="390" y="68" font-size="10" font-family="Arial,sans-serif" font-weight="bold" fill="#4b5563" letter-spacing="2">OUR SERVICES</text>
<line x1="370" y1="80" x2="565" y2="80" stroke="#9ca3af" stroke-width="0.8"/>
<text x="378" y="106" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Interior Design Consultation</text>
<text x="378" y="128" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Space Planning &amp; Layout</text>
<text x="378" y="150" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Custom Furniture Sourcing</text>
<text x="378" y="172" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Full Project Management</text>
<line x1="370" y1="190" x2="565" y2="190" stroke="#9ca3af" stroke-width="0.8"/>
<text x="468" y="280" text-anchor="middle" font-size="11" font-family="Georgia,serif" font-weight="bold" fill="#374151">Studio Name</text>
<text x="468" y="302" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">www.budistudio.com</text>
<text x="468" y="322" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">+1 (234) 567-8900</text>
</svg>`);
}

function flyEventPromo() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<defs>
  <linearGradient id="evg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#7c3aed"/>
    <stop offset="100%" stop-color="#db2777"/>
  </linearGradient>
</defs>
<rect width="600" height="420" fill="url(#evg)"/>
<polygon points="0,0 260,0 0,420" fill="rgba(255,255,255,0.05)"/>
<polygon points="600,420 340,420 600,0" fill="rgba(0,0,0,0.1)"/>
<text x="300" y="56" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="5">YOUR COMPANY NAME</text>
<text x="300" y="138" text-anchor="middle" font-size="56" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">EVENT</text>
<text x="300" y="188" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="rgba(255,255,255,0.85)" letter-spacing="6">PROMOTION</text>
<line x1="120" y1="208" x2="480" y2="208" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
<text x="300" y="244" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">DATE  ·  TIME  ·  LOCATION</text>
<text x="300" y="278" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">Join us for an unforgettable experience. Tickets</text>
<text x="300" y="296" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)">available online and at the door.</text>
<rect x="180" y="322" width="240" height="44" rx="22" fill="#ffffff"/>
<text x="300" y="350" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#7c3aed" letter-spacing="1">GET TICKETS NOW</text>
<text x="300" y="400" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.4)">www.yourwebsite.com  ·  +1 (234) 567-8900</text>
</svg>`);
}

function flyGeneralBusiness() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
<rect width="600" height="420" fill="#ffffff"/>
<rect width="600" height="100" fill="#1e3a5f"/>
<rect y="100" width="600" height="4" fill="#06b6d4"/>
<text x="300" y="50" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="300" y="74" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="3">YOUR TAGLINE GOES HERE</text>
<rect x="24" y="122" width="168" height="130" rx="4" fill="#f3f4f6"/>
<text x="108" y="193" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#9ca3af">Upload Photo</text>
<text x="108" y="278" text-anchor="middle" font-size="11" font-family="Georgia,serif" font-weight="bold" fill="#1e3a5f">Your Name</text>
<text x="108" y="296" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">Job Title</text>
<text x="380" y="148" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#1e3a5f" letter-spacing="1">WHAT WE OFFER</text>
<line x1="230" y1="160" x2="530" y2="160" stroke="#e5e7eb" stroke-width="1"/>
<circle cx="246" cy="186" r="5" fill="#06b6d4"/><text x="260" y="191" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Service or Product One</text>
<circle cx="246" cy="210" r="5" fill="#06b6d4"/><text x="260" y="215" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Service or Product Two</text>
<circle cx="246" cy="234" r="5" fill="#06b6d4"/><text x="260" y="239" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Service or Product Three</text>
<circle cx="246" cy="258" r="5" fill="#06b6d4"/><text x="260" y="263" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Service or Product Four</text>
<rect x="0" y="328" width="600" height="92" fill="#f8fafc"/>
<line x1="0" y1="328" x2="600" y2="328" stroke="#e5e7eb" stroke-width="1"/>
<text x="150" y="360" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">+1 (234) 567-8900</text>
<text x="150" y="378" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">hello@company.com</text>
<text x="300" y="360" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">www.yourcompany.com</text>
<text x="450" y="360" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">123 Street, City, Province</text>
<rect x="210" y="386" width="180" height="28" rx="5" fill="#1e3a5f"/>
<text x="300" y="405" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">CONTACT US TODAY</text>
</svg>`);
}

type FlyerSeedEntry = { name: string; fn: () => string; bg: string };
const FLYER_SEED_DESIGNS: FlyerSeedEntry[] = [
  { name: "Logistics",         fn: flyLogistics,       bg: "#0f2a4a" },
  { name: "Real Estate",       fn: flyRealEstate,      bg: "#ffffff" },
  { name: "Open House",        fn: flyOpenHouse,       bg: "#1a4a2e" },
  { name: "Restaurant Menu",   fn: flyRestaurantMenu,  bg: "#1a0a04" },
  { name: "Interior Design",   fn: flyInteriorDesign,  bg: "#f8f7f5" },
  { name: "Event Promo",       fn: flyEventPromo,      bg: "#7c3aed" },
  { name: "General Business",  fn: flyGeneralBusiness, bg: "#ffffff" },
];

// ─── Poster designs (440×660 portrait) ─────────────────────────────────────────

function lpFloralTable() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
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

function lpMusicFestival() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
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

function lpTravelHoliday() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<defs>
  <linearGradient id="og" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ffa000"/>
    <stop offset="100%" stop-color="#e65100"/>
  </linearGradient>
</defs>
<rect width="440" height="660" fill="url(#og)"/>
<rect x="248" y="28" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="34" width="162" height="110" rx="12" fill="rgba(200,100,0,0.45)"/>
<rect x="248" y="170" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="176" width="162" height="110" rx="12" fill="rgba(180,90,0,0.45)"/>
<rect x="248" y="312" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="318" width="162" height="110" rx="12" fill="rgba(160,80,0,0.45)"/>
<rect x="248" y="454" width="174" height="122" rx="16" fill="rgba(255,255,255,0.18)" stroke="#ffffff" stroke-width="2.5"/>
<rect x="254" y="460" width="162" height="110" rx="12" fill="rgba(140,70,0,0.45)"/>
<text x="28" y="56" font-size="30" font-family="Georgia,serif" font-style="italic" fill="#ffffff">Let's Go</text>
<text x="26" y="116" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">ENJOY</text>
<text x="26" y="168" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">DREAM</text>
<text x="26" y="220" font-size="46" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">HOLIDAY</text>
<text x="26" y="260" font-size="27" font-family="Georgia,serif" font-style="italic" fill="#ffffff">Travel with Us!</text>
<circle cx="35" cy="392" r="3.5" fill="#ffffff"/><text x="46" y="397" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Luxury Rooms</text>
<circle cx="35" cy="414" r="3.5" fill="#ffffff"/><text x="46" y="419" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Natural View</text>
<circle cx="35" cy="436" r="3.5" fill="#ffffff"/><text x="46" y="441" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Intercity Travel</text>
<circle cx="35" cy="458" r="3.5" fill="#ffffff"/><text x="46" y="463" font-size="9.5" font-family="Arial,sans-serif" fill="#ffffff">Lunch &amp; Dinner</text>
<text x="26" y="612" font-size="9.5" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">FOR MORE INFO</text>
<text x="26" y="630" font-size="8.5" font-family="Arial,sans-serif" fill="#ffffff">+1234567890</text>
<text x="152" y="612" font-size="9.5" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">VISIT OUR WEBSITE</text>
<text x="152" y="630" font-size="8" font-family="Arial,sans-serif" fill="#ffffff">WWW.YOURWEBSITE.COM</text>
</svg>`);
}

function lpAppDevelopment() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<circle cx="220" cy="178" r="134" fill="#dbeeff"/>
<circle cx="100" cy="90" r="12" fill="#f0a030" opacity="0.85"/>
<circle cx="340" cy="108" r="10" fill="#6ab87a" opacity="0.8"/>
<circle cx="326" cy="252" r="18" fill="#f0a030" opacity="0.7"/>
<circle cx="112" cy="268" r="14" fill="#6ab87a" opacity="0.65"/>
<circle cx="220" cy="108" r="22" fill="none" stroke="#2d6aa8" stroke-width="4"/>
<circle cx="220" cy="108" r="10" fill="none" stroke="#2d6aa8" stroke-width="3"/>
<text x="220" y="362" text-anchor="middle" font-size="52" font-family="Arial,sans-serif" font-weight="bold" fill="#1a4a80">APP</text>
<text x="220" y="418" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#1a4a80">DEVELOPMENT</text>
<text x="220" y="455" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do</text>
<text x="220" y="470" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#6b7280">eiusmod tempor incididunt ut labore et dolore magna aliqua.</text>
<rect x="0" y="512" width="440" height="148" fill="#dbeeff"/>
<text x="24" y="544" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">Lorem ipsum, Lorem ipsum</text>
<text x="24" y="559" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">lorem ipsum dolor sit dim 00/0</text>
<text x="24" y="574" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">lorem ipsum</text>
<text x="24" y="604" font-size="8.5" font-family="Arial,sans-serif" fill="#374151">+0 (000) 000-00-00</text>
<circle cx="390" cy="578" r="30" fill="#e89030" opacity="0.7"/>
<circle cx="368" cy="612" r="24" fill="#6ab87a" opacity="0.65"/>
</svg>`);
}

function lpWeddingInvite() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#ffffff"/>
<circle cx="388" cy="52" r="56" fill="#8b1a1a" opacity="0.88"/><circle cx="388" cy="52" r="47" fill="#9e2020" opacity="0.84"/><circle cx="388" cy="52" r="37" fill="#b02828" opacity="0.8"/><circle cx="391" cy="49" r="26" fill="#a01e1e" opacity="0.85"/><circle cx="390" cy="50" r="15" fill="#8b1a1a"/>
<circle cx="328" cy="26" r="42" fill="#e8a0a0" opacity="0.78"/><circle cx="328" cy="26" r="34" fill="#f0b0b0" opacity="0.75"/><circle cx="328" cy="26" r="25" fill="#f5c0c0" opacity="0.8"/>
<circle cx="425" cy="118" r="30" fill="#e0a0c0" opacity="0.72"/><circle cx="425" cy="118" r="23" fill="#eab0cc" opacity="0.78"/><circle cx="425" cy="118" r="15" fill="#f0c0d8" opacity="0.72"/>
<ellipse cx="358" cy="12" rx="34" ry="10" fill="#4a8050" transform="rotate(-22,358,12)" opacity="0.68"/>
<ellipse cx="290" cy="52" rx="30" ry="8" fill="#5a9060" transform="rotate(14,290,52)" opacity="0.6"/>
<circle cx="52" cy="608" r="56" fill="#8b1a1a" opacity="0.88"/><circle cx="52" cy="608" r="47" fill="#9e2020" opacity="0.84"/><circle cx="52" cy="608" r="37" fill="#b02828" opacity="0.8"/>
<circle cx="112" cy="634" r="42" fill="#e8a0a0" opacity="0.78"/><circle cx="112" cy="634" r="34" fill="#f0b0b0" opacity="0.75"/>
<circle cx="15" cy="542" r="30" fill="#e0a0c0" opacity="0.72"/><circle cx="15" cy="542" r="23" fill="#eab0cc" opacity="0.78"/>
<ellipse cx="82" cy="650" rx="34" ry="10" fill="#4a8050" transform="rotate(22,82,650)" opacity="0.68"/>
<text x="220" y="222" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b4040" letter-spacing="3">YOU ARE INVITED TO</text>
<text x="220" y="244" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#6b4040" letter-spacing="3">THE WEDDING OF</text>
<text x="220" y="315" text-anchor="middle" font-size="46" font-family="Georgia,serif" font-weight="bold" fill="#3d1515">DANY &amp; MEGA</text>
<line x1="130" y1="332" x2="196" y2="332" stroke="#5a2020" stroke-width="0.8"/>
<text x="178" y="350" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#5a2020">APRIL</text>
<text x="220" y="352" text-anchor="middle" font-size="24" font-family="Georgia,serif" font-weight="bold" fill="#5a2020">15</text>
<text x="262" y="350" text-anchor="middle" font-size="9" font-family="Arial,sans-serif" fill="#5a2020">2009</text>
<line x1="244" y1="332" x2="310" y2="332" stroke="#5a2020" stroke-width="0.8"/>
<text x="220" y="380" text-anchor="middle" font-size="8.5" font-family="Arial,sans-serif" fill="#7a4040" letter-spacing="2">ONE O'CLOCK IN THE MORNING</text>
<text x="220" y="424" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#7a4040">LOREM IPSUM</text>
<text x="220" y="446" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#7a4040">LOREM IPSUM SIT DOLOR</text>
</svg>`);
}

function lpDigitalMarketing() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<defs>
  <linearGradient id="dmg" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#1e88e5"/>
    <stop offset="100%" stop-color="#1565c0"/>
  </linearGradient>
</defs>
<rect width="440" height="660" fill="url(#dmg)"/>
<path d="M290,0 L440,0 L440,230 Q380,188 300,228 Q242,260 290,0Z" fill="rgba(255,255,255,0.1)"/>
<text x="28" y="55" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">DIGITAL</text>
<text x="28" y="106" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">MARKETING</text>
<text x="28" y="157" font-size="40" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">AGENCY</text>
<text x="28" y="192" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">Lorem ipsum dolor sit amet</text>
<text x="28" y="209" font-size="9.5" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)">consectetur adipiscing elit, sed do</text>
<text x="28" y="254" font-size="10.5" font-family="Arial,sans-serif" fill="#90caf9" font-weight="bold">www.yourwebsitehere.com</text>
<rect x="0" y="338" width="440" height="322" rx="44" fill="#ffffff"/>
<rect x="20" y="352" width="400" height="294" rx="30" fill="#e2e8f0"/>
<text x="220" y="476" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="#94a3b8" opacity="0.9">Your Photo</text>
<text x="220" y="512" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#94a3b8" opacity="0.9">or Logo Here</text>
</svg>`);
}

function lpRealEstate() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 660">
<rect width="440" height="660" fill="#3e1a08"/>
<path d="M0,318 C80,258 164,372 222,312 C280,252 362,358 440,300 L440,660 L0,660 Z" fill="#ffffff"/>
<rect x="328" y="32" width="82" height="62" rx="4" fill="#e89030" opacity="0.88"/>
<polygon points="369,18 410,50 328,50" fill="#e89030" opacity="0.88"/>
<rect x="350" y="58" width="22" height="28" rx="2" fill="#3e1a08"/>
<text x="28" y="78" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">LUXURY</text>
<text x="28" y="128" font-size="40" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">REAL ESTATE</text>
<text x="28" y="178" font-size="32" font-family="Georgia,serif" font-style="italic" fill="#e89030">For Sale</text>
<text x="28" y="378" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#3e1a08">PROPERTY FEATURES</text>
<circle cx="40" cy="408" r="4" fill="#3e1a08"/><text x="52" y="413" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Master Bedroom</text>
<circle cx="40" cy="430" r="4" fill="#3e1a08"/><text x="52" y="435" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Bedrooms</text>
<circle cx="40" cy="452" r="4" fill="#3e1a08"/><text x="52" y="457" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Master Bathrooms</text>
<circle cx="40" cy="474" r="4" fill="#3e1a08"/><text x="52" y="479" font-size="9.5" font-family="Arial,sans-serif" fill="#374151">Swimming Pool</text>
<text x="28" y="556" font-size="11" font-family="Arial,sans-serif" font-weight="bold" fill="#3e1a08">START FROM</text>
<text x="28" y="590" font-size="34" font-family="Georgia,serif" font-weight="bold" fill="#3e1a08">$ 50.000</text>
<circle cx="338" cy="458" r="66" fill="#e89030"/>
<text x="338" y="448" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">20%</text>
<text x="338" y="476" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Discount</text>
<text x="28" y="624" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">123-456-7890</text>
<text x="28" y="641" font-size="8.5" font-family="Arial,sans-serif" fill="#6b7280">hello@reallygreatsite.com</text>
</svg>`);
}

type PosterSeedEntry = { name: string; fn: () => string; bg: string };
const POSTER_SEED_DESIGNS: PosterSeedEntry[] = [
  { name: "Dark Floral Table",   fn: lpFloralTable,      bg: "#1e2420" },
  { name: "Music Festival",      fn: lpMusicFestival,    bg: "#3d1ba8" },
  { name: "Enjoy Dream Holiday", fn: lpTravelHoliday,    bg: "#ffa000" },
  { name: "App Development",     fn: lpAppDevelopment,   bg: "#ffffff" },
  { name: "Wedding Invitation",  fn: lpWeddingInvite,    bg: "#ffffff" },
  { name: "Digital Marketing",   fn: lpDigitalMarketing, bg: "#1e88e5" },
  { name: "Luxury Real Estate",  fn: lpRealEstate,       bg: "#3e1a08" },
];

// ─── Yard Sign designs (600×450 landscape) ──────────────────────────────────────

function imgPHYS(x: number, y: number, w: number, h: number): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db" data-placeholder="photo"/>`;
}

function ysBuilding(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<rect x="268" y="80" width="22" height="130" fill="#ffffff"/>
<rect x="296" y="100" width="64" height="110" fill="#ffffff"/>
<rect x="262" y="78" width="106" height="10" fill="#ffffff"/>
<text x="300" y="256" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="1">COMPANY NAME</text>
<text x="300" y="288" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)">location</text>
<rect x="0" y="348" width="600" height="102" fill="#ffffff"/>
<text x="300" y="412" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" fill="${p}">phone / other</text>
</svg>`);
}

function ysArrowLeft(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#f0ede8"/>
<polygon points="10,225 200,60 200,148 580,148 580,302 200,302 200,390" fill="${p}"/>
<text x="360" y="220" text-anchor="middle" font-size="50" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">Wedding</text>
<text x="370" y="272" text-anchor="middle" font-size="40" font-family="Georgia,serif" font-style="italic" fill="#ffffff">this way</text>
</svg>`);
}

function ysImageHeadline(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
${imgPHYS(0, 0, 220, 450)}
<text x="410" y="145" text-anchor="middle" font-size="34" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR HEADLINE</text>
<text x="410" y="194" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.85)">Company Name</text>
<text x="410" y="260" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">999-888-7777</text>
<text x="410" y="290" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">www.yourwebsite.com</text>
</svg>`);
}

function ysPhotoCompany(_p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="2"/>
${imgPHYS(185, 34, 230, 148)}
<text x="300" y="228" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Company Name</text>
<text x="300" y="278" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#6b7280">Company Message</text>
<text x="300" y="378" text-anchor="middle" font-size="38" font-family="Arial,sans-serif" fill="#1a1a1a">Phone / Other</text>
</svg>`);
}

function ysBlueBorder(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="6" y="6" width="588" height="438" fill="none" stroke="${p}" stroke-width="14"/>
<rect x="26" y="26" width="548" height="398" fill="none" stroke="${p}" stroke-width="2.5"/>
<text x="300" y="150" text-anchor="middle" font-size="36" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Phone / Other</text>
<text x="300" y="204" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="300" y="298" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-style="italic" fill="#6b7280">Company Message</text>
</svg>`);
}

function ysBlackRealEstate(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<polygon points="46,56 82,84 118,56 108,56 82,76 56,56" fill="${a}"/>
<polygon points="46,76 82,104 118,76 108,76 82,96 56,76" fill="${a}"/>
<text x="390" y="72" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="92" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="390" y="112" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="${a}" letter-spacing="2">SERVICE LIST</text>
<text x="44" y="242" font-size="38" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="2">COMPANY NAME</text>
<text x="44" y="276" font-size="13" font-family="Arial,sans-serif" fill="${a}" opacity="0.55" letter-spacing="1">LOCATION</text>
<text x="44" y="378" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="${a}" letter-spacing="2">PHONE / OTHER</text>
<text x="44" y="410" font-size="13" font-family="Arial,sans-serif" fill="${a}" opacity="0.5" letter-spacing="1">WEB / OTHER</text>
</svg>`);
}

function ysBlueID(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="0" y="0" width="600" height="96" fill="${p}"/>
<text x="300" y="58" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
${imgPHYS(28, 118, 170, 210)}
<text x="400" y="230" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Full Name</text>
<rect x="0" y="354" width="600" height="96" fill="${p}"/>
<text x="300" y="412" text-anchor="middle" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Phone / Other</text>
</svg>`);
}

function ysMonogramBanner(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
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

function ysRedBottomBar(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="2"/>
${imgPHYS(185, 30, 230, 148)}
<text x="300" y="232" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="300" y="278" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" fill="#6b7280">Company Message</text>
<rect x="0" y="342" width="600" height="108" fill="${p}"/>
<text x="300" y="408" text-anchor="middle" font-size="34" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Phone / Other</text>
</svg>`);
}

function ysBoldHeadline(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#ffffff"/>
<rect x="1" y="1" width="598" height="448" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
<text x="30" y="160" font-size="66" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="${p}">THIS IS YOUR</text>
<text x="30" y="258" font-size="66" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="${p}">HEADLINE</text>
<text x="570" y="346" text-anchor="end" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">COMPANY NAME</text>
<text x="570" y="372" text-anchor="end" font-size="14" font-family="Arial,sans-serif" fill="#6b7280">999-888-7777</text>
<text x="570" y="398" text-anchor="end" font-size="14" font-family="Arial,sans-serif" fill="#6b7280">COMPANYNAME.WEB</text>
</svg>`);
}

function ysTextSign(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="${p}"/>
<text x="300" y="210" text-anchor="middle" font-size="72" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR TEXT</text>
<text x="300" y="298" text-anchor="middle" font-size="72" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">HERE</text>
<rect x="80" y="328" width="440" height="50" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
<text x="300" y="359" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">your text here</text>
</svg>`);
}

function ysArrowDirection(p: string, _a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
<rect width="600" height="450" fill="#f0ede8"/>
<rect x="8" y="8" width="584" height="434" rx="8" fill="${p}"/>
<text x="42" y="186" font-size="52" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOUR TEXT</text>
<text x="42" y="252" font-size="52" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">HERE</text>
<rect x="42" y="316" width="400" height="64" fill="#ffffff"/>
<polygon points="442,284 558,348 442,412" fill="#ffffff"/>
</svg>`);
}

type YSSeedEntry = { name: string; fn: (p: string, a: string) => string; p: string; a: string; bg: string };
const YARDSIGN_SEED_DESIGNS: YSSeedEntry[] = [
  { name: "Building Sign",     fn: ysBuilding,          p: "#3d3d3d", a: "#ffffff", bg: "#3d3d3d" },
  { name: "Arrow Sign",        fn: ysArrowLeft,         p: "#09090b", a: "#ffffff", bg: "#f0ede8" },
  { name: "Image Headline",    fn: ysImageHeadline,     p: "#4b5563", a: "#ffffff", bg: "#4b5563" },
  { name: "Photo Company",     fn: ysPhotoCompany,      p: "#1a1a1a", a: "#1a1a1a", bg: "#ffffff" },
  { name: "Blue Border",       fn: ysBlueBorder,        p: "#1d4ed8", a: "#1d4ed8", bg: "#ffffff" },
  { name: "Black Real Estate", fn: ysBlackRealEstate,   p: "#09090b", a: "#c9a84c", bg: "#09090b" },
  { name: "Blue ID",           fn: ysBlueID,            p: "#1d4ed8", a: "#ffffff", bg: "#ffffff" },
  { name: "Monogram Banner",   fn: ysMonogramBanner,    p: "#09090b", a: "#ffffff", bg: "#09090b" },
  { name: "Red Bottom Bar",    fn: ysRedBottomBar,      p: "#b91c1c", a: "#b91c1c", bg: "#ffffff" },
  { name: "Bold Headline",     fn: ysBoldHeadline,      p: "#000000", a: "#000000", bg: "#ffffff" },
  { name: "Text Sign",         fn: ysTextSign,          p: "#09090b", a: "#ffffff", bg: "#09090b" },
  { name: "Arrow Direction",   fn: ysArrowDirection,    p: "#8b1a1a", a: "#ffffff", bg: "#8b1a1a" },
];

// ─── Sticker / Label designs ────────────────────────────────────────────────────

function imgLblPH(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2, cy = y + h / 2;
  const cs = Math.min(w, h) * 0.2;
  const sw = Math.max(1.5, cs * 0.1);
  const fs = Math.max(8, h * 0.11);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#d1d5db"/>` +
    `<rect x="${cx - cs}" y="${cy - cs * 0.58}" width="${cs * 2}" height="${cs * 1.38}" rx="${cs * 0.14}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<rect x="${cx - cs * 0.28}" y="${cy - cs}" width="${cs * 0.56}" height="${cs * 0.5}" rx="${cs * 0.1}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<circle cx="${cx}" cy="${cy + cs * 0.08}" r="${cs * 0.38}" fill="none" stroke="#9ca3af" stroke-width="${sw}"/>` +
    `<text x="${cx}" y="${cy + cs * 1.32}" text-anchor="middle" font-size="${fs}" font-family="Arial,sans-serif" fill="#9ca3af">Upload your photo</text>`;
}

function stickerRoundBadge(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
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

function stickerShieldShape(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420">
<rect width="400" height="420" fill="#f8fafc"/>
<path d="M200,20 L360,80 L360,240 Q360,360 200,400 Q40,360 40,240 L40,80 Z" fill="${p}"/>
<path d="M200,34 L346,88 L346,242 Q346,350 200,388 Q54,350 54,242 L54,88 Z" fill="none" stroke="${a}" stroke-width="2" opacity="0.45"/>
<text x="200" y="148" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">COMPANY</text>
<text x="200" y="168" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">NAME</text>
<text x="200" y="226" text-anchor="middle" font-size="50" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<line x1="100" y1="256" x2="300" y2="256" stroke="${a}" stroke-width="1.5" opacity="0.4"/>
<text x="200" y="290" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="2">YOUR TAGLINE</text>
</svg>`);
}

function stickerHexagon(p: string, a: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 440">
<rect width="400" height="440" fill="#f8fafc"/>
<polygon points="200,16 370,110 370,330 200,424 30,330 30,110" fill="${p}"/>
<polygon points="200,30 356,118 356,322 200,410 44,322 44,118" fill="none" stroke="${a}" stroke-width="2" opacity="0.4"/>
<text x="200" y="152" text-anchor="middle" font-size="10.5" font-family="Arial,sans-serif" fill="${a}" letter-spacing="4" font-weight="bold">COMPANY NAME</text>
<line x1="90" y1="168" x2="310" y2="168" stroke="${a}" stroke-width="1" opacity="0.35"/>
<text x="200" y="240" text-anchor="middle" font-size="54" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<line x1="90" y1="266" x2="310" y2="266" stroke="${a}" stroke-width="1" opacity="0.35"/>
<text x="200" y="298" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.6)" letter-spacing="3">YOUR TAGLINE</text>
</svg>`);
}

function circleRetroRings(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
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

function circleMonogram(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<text x="200" y="222" text-anchor="middle" font-size="130" font-family="Georgia,serif" font-weight="bold" fill="#ffffff">H</text>
<text x="200" y="268" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="4">COMPANY NAME</text>
<text x="200" y="296" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.45)" letter-spacing="2">phone / other</text>
</svg>`);
}

function circleThankYou(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<text x="200" y="182" text-anchor="middle" font-size="58" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">THANK</text>
<text x="200" y="244" text-anchor="middle" font-size="58" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff">YOU</text>
<line x1="110" y1="258" x2="290" y2="258" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
<text x="200" y="290" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="3">COMPANY NAME</text>
</svg>`);
}

function circleLogoName(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
${imgLblPH(145, 108, 110, 88)}
<text x="200" y="248" text-anchor="middle" font-size="22" font-family="Georgia,serif" font-weight="bold" fill="${p}">Company Name</text>
<text x="200" y="275" text-anchor="middle" font-size="15" font-family="Arial,sans-serif" fill="${p}" opacity="0.75">Product Name</text>
</svg>`);
}

function circleGoldBorder(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
<circle cx="200" cy="200" r="180" fill="none" stroke="${p}" stroke-width="8"/>
<circle cx="200" cy="200" r="168" fill="none" stroke="${p}" stroke-width="2"/>
<text x="200" y="106" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a" letter-spacing="3">Product Name</text>
${imgLblPH(140, 122, 120, 96)}
<text x="200" y="268" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-weight="bold" fill="#1a1a1a">Company Name</text>
<text x="200" y="292" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#6b7280">Product / Service Description</text>
<text x="200" y="316" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="#9ca3af">Web / Other</text>
</svg>`);
}

function circleVintageEvent(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs>
  <pattern id="diaglbl" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(0,0,0,0.07)" stroke-width="5"/>
  </pattern>
</defs>
<rect width="400" height="400" fill="#f0ede8"/>
<circle cx="200" cy="200" r="188" fill="${p}"/>
<circle cx="200" cy="200" r="188" fill="url(#diaglbl)"/>
<text x="200" y="128" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" font-weight="bold" fill="#e6b830" letter-spacing="3">COMPANY NAME</text>
<line x1="92" y1="140" x2="308" y2="140" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="200" y="188" text-anchor="middle" font-size="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#e6b830">YOUR TEXT</text>
<text x="200" y="225" text-anchor="middle" font-size="30" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#e6b830">HERE</text>
<line x1="92" y1="242" x2="308" y2="242" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
<text x="200" y="270" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)" letter-spacing="2">LOCATION</text>
<text x="200" y="308" text-anchor="middle" font-size="22" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="#ffffff" letter-spacing="2">DATE</text>
</svg>`);
}

function ovalColorfulBorder() {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340">
<rect width="500" height="340" fill="#f0ede8"/>
<path d="M250,12 A237,158 0 0,1 487,170" stroke="#f97316" stroke-width="46" fill="none"/>
<path d="M487,170 A237,158 0 0,1 250,328" stroke="#ec4899" stroke-width="46" fill="none"/>
<path d="M250,328 A237,158 0 0,1 13,170" stroke="#14b8a6" stroke-width="46" fill="none"/>
<path d="M13,170 A237,158 0 0,1 250,12" stroke="#a855f7" stroke-width="46" fill="none"/>
<ellipse cx="250" cy="170" rx="192" ry="112" fill="#ffffff"/>
<ellipse cx="250" cy="170" rx="186" ry="106" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
<text x="250" y="140" text-anchor="middle" font-size="34" font-family="Georgia,serif" font-weight="bold" fill="#1a1a1a" letter-spacing="1">ORDER ONLINE</text>
<text x="250" y="163" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280" letter-spacing="3">WEB / OTHER</text>
<line x1="140" y1="175" x2="360" y2="175" stroke="#1a1a1a" stroke-width="1"/>
<text x="250" y="204" text-anchor="middle" font-size="18" font-family="Georgia,serif" fill="#1a1a1a">Company Name</text>
</svg>`);
}

function ovalSimpleClean(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340">
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

function rectProductLabel(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
${imgLblPH(210, 28, 140, 108)}
<text x="280" y="164" text-anchor="middle" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
<rect x="8" y="190" width="544" height="142" fill="${p}"/>
<rect x="8" y="298" width="544" height="34" rx="16" fill="${p}"/>
<text x="280" y="244" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
<text x="280" y="282" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.75)">Web / Other</text>
</svg>`);
}

function rectDarkProfessional(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="${p}"/>
<rect x="256" y="42" width="48" height="13" rx="3" fill="#22d3ee"/>
<rect x="271" y="28" width="18" height="42" rx="3" fill="#22d3ee"/>
<text x="280" y="134" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="280" y="170" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.55)" letter-spacing="3">BUSINESS TYPE</text>
<text x="280" y="222" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.35)" letter-spacing="2">WEB / OTHER</text>
</svg>`);
}

function rectVintageBadge(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
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

function rectTechDark(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
<defs>
  <pattern id="dotpatlbl" width="12" height="12" patternUnits="userSpaceOnUse">
    <circle cx="6" cy="6" r="1" fill="rgba(255,255,255,0.04)"/>
  </pattern>
</defs>
<rect width="560" height="340" fill="#f0ede8"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="${p}"/>
<rect x="8" y="8" width="544" height="324" rx="16" fill="url(#dotpatlbl)"/>
<polygon points="280,34 263,68 271,68 257,98 298,61 285,61" fill="#3b82f6"/>
<text x="280" y="126" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Product Name</text>
<text x="280" y="164" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.5)">Enter a brief description of the products or services</text>
<text x="280" y="246" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-style="italic" fill="#3b82f6">Company Name</text>
<text x="280" y="280" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.38)">Web / Other</text>
</svg>`);
}

function squareSplitVertical(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="#ffffff"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
<text x="200" y="62" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
${imgLblPH(130, 78, 140, 112)}
<rect x="8" y="218" width="384" height="174" fill="${p}"/>
<rect x="8" y="374" width="384" height="18" rx="20" fill="${p}"/>
<text x="200" y="300" text-anchor="middle" font-size="20" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff">Company Name</text>
<text x="200" y="336" text-anchor="middle" font-size="13" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.7)">Web / Other</text>
</svg>`);
}

function squareCompactLabel(p: string) {
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<rect width="400" height="400" fill="#f0ede8"/>
<rect x="8" y="8" width="384" height="384" rx="20" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/>
<rect x="8" y="8" width="384" height="126" rx="20" fill="${p}"/>
<rect x="8" y="108" width="384" height="26" fill="${p}"/>
<text x="200" y="66" text-anchor="middle" font-size="18" font-family="Arial,sans-serif" font-weight="bold" fill="#ffffff" letter-spacing="2">COMPANY NAME</text>
<text x="200" y="96" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.65)">Business Type</text>
${imgLblPH(150, 148, 100, 80)}
<text x="200" y="284" text-anchor="middle" font-size="18" font-family="Georgia,serif" font-weight="bold" fill="${p}">Product Name</text>
<text x="200" y="316" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#6b7280">Product / Service Description</text>
<text x="200" y="346" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#9ca3af">Web / Other</text>
</svg>`);
}

type LblSeedEntry = { name: string; fn: (p: string, a: string) => string; p: string; bg: string };

const DIE_CUT_STICKER_DESIGNS: LblSeedEntry[] = [
  { name: "Round Badge",  fn: stickerRoundBadge,  p: "#1e3a5f", bg: "#f8fafc" },
  { name: "Shield Shape", fn: stickerShieldShape,  p: "#1d4ed8", bg: "#f8fafc" },
  { name: "Hexagon",      fn: stickerHexagon,      p: "#0d9488", bg: "#f8fafc" },
];

const PRODUCT_LABEL_DESIGNS: LblSeedEntry[] = [
  { name: "Retro Rings",       fn: (p) => circleRetroRings(p),    p: "#c8832a", bg: "#f0ede8" },
  { name: "Monogram Dark",     fn: (p) => circleMonogram(p),      p: "#09090b", bg: "#f0ede8" },
  { name: "Thank You",         fn: (p) => circleThankYou(p),      p: "#e8736a", bg: "#f0ede8" },
  { name: "Logo & Name",       fn: (p) => circleLogoName(p),      p: "#1e40af", bg: "#f0ede8" },
  { name: "Gold Border",       fn: (p) => circleGoldBorder(p),    p: "#d4af37", bg: "#f0ede8" },
  { name: "Vintage Event",     fn: (p) => circleVintageEvent(p),  p: "#4a6b60", bg: "#f0ede8" },
  { name: "Colorful Border",   fn: () => ovalColorfulBorder(),    p: "#ec4899", bg: "#f0ede8" },
  { name: "Clean Oval",        fn: (p) => ovalSimpleClean(p),     p: "#1e3a5f", bg: "#f0ede8" },
  { name: "Product Label",     fn: (p) => rectProductLabel(p),    p: "#8b1a2a", bg: "#f0ede8" },
  { name: "Dark Professional", fn: (p) => rectDarkProfessional(p),p: "#0f172a", bg: "#f0ede8" },
  { name: "Vintage Badge",     fn: (p) => rectVintageBadge(p),    p: "#1e3a5f", bg: "#f0ede8" },
  { name: "Tech Dark",         fn: (p) => rectTechDark(p),        p: "#1a1f2e", bg: "#f0ede8" },
  { name: "Split Vertical",    fn: (p) => squareSplitVertical(p), p: "#3b2f8f", bg: "#f0ede8" },
  { name: "Compact Label",     fn: (p) => squareCompactLabel(p),  p: "#1e3a5f", bg: "#f0ede8" },
  { name: "Round Badge",       fn: stickerRoundBadge,             p: "#1e3a5f", bg: "#f8fafc" },
  { name: "Shield Shape",      fn: stickerShieldShape,            p: "#1d4ed8", bg: "#f8fafc" },
  { name: "Hexagon",           fn: stickerHexagon,                p: "#0d9488", bg: "#f8fafc" },
];

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { slug, templateId } = await params;

  const gallery = await getGalleryTemplate(templateId);
  if (!gallery || gallery.productSlug !== slug) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  const existingNames = new Set(gallery.designs.map((d) => d.name));
  let added = 0;

  const galleryNameLower = gallery.name.toLowerCase();
  const isRollUp = galleryNameLower.includes("roll-up") || galleryNameLower.includes("rollup");
  const isBannerProduct = slug === "vinyl-banners" || slug === "roll-up-banners" || slug === "large-outdoor-banner";

  if (isBannerProduct && isRollUp) {
    for (const d of ROLLUP_STD_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(), frontBgColor: "#ffffff", backBgColor: "#ffffff" });
      added++;
    }
  } else if (isBannerProduct) {
    for (const d of VINYL_BANNER_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(), frontBgColor: "#ffffff", backBgColor: "#ffffff" });
      added++;
    }
  } else if (slug === "bold-flyers") {
    for (const d of FLYER_SEED_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(), frontBgColor: d.bg, backBgColor: "#ffffff" });
      added++;
    }
  } else if (slug === "posters") {
    for (const d of POSTER_SEED_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(), frontBgColor: d.bg, backBgColor: "#ffffff" });
      added++;
    }
  } else if (slug === "yard-signs") {
    for (const d of YARDSIGN_SEED_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(d.p, d.a), frontBgColor: d.bg, backBgColor: "#ffffff" });
      added++;
    }
  } else if (slug === "stickers-and-labels") {
    const designs = galleryNameLower.includes("sticker") ? DIE_CUT_STICKER_DESIGNS : PRODUCT_LABEL_DESIGNS;
    for (const d of designs) {
      if (existingNames.has(d.name)) continue;
      await addDesign(templateId, { name: d.name, frontImage: d.fn(d.p, d.p), frontBgColor: d.bg, backBgColor: "#ffffff" });
      added++;
    }
  } else {
    for (const d of SEED_DESIGNS) {
      if (existingNames.has(d.name)) continue;
      const image = d.fn(d.p, d.a);
      await addDesign(templateId, { name: d.name, frontImage: image, frontBgColor: d.bg, backBgColor: "#ffffff" });
      added++;
    }
  }

  const updated = await getGalleryTemplate(templateId);
  return NextResponse.json({ gallery: updated, added });
}
