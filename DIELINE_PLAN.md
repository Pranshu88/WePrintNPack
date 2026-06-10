# Dieline Generator — Complete Feature Plan

## Overview
A full dieline generator for packaging boxes, accessible from each box product card.
Inspired by Pacdora. Built entirely in-house — all features free (no paywall).

---

## Entry Point
Each box product card (`/products/packaging-box`) shows **two buttons on hover**:
- **Mockup** (left) → existing editor navigation (same as before)
- **Dieline** (right) → opens `/dieline/[boxType]`

### Box Type Routes
| Product | Route |
|---|---|
| Pizza Box | `/dieline/pizza-boxes` |
| Mailer Box | `/dieline/mailer-boxes` |
| Shipping Box | `/dieline/shipping-boxes` |
| Square Shipping Box | `/dieline/square-shipping-boxes` |

---

## Page Layout — 3 Columns

```
┌─────────────────┬──────────────────────────────┬───────────────────┐
│   Left Panel    │       Center Canvas           │   Right Panel     │
│   (settings)    │    (SVG Dieline View)         │  (3D + Downloads) │
│   ~320px        │       flex-1                  │   ~300px          │
└─────────────────┴──────────────────────────────┴───────────────────┘
```

---

## Left Panel — Tabs (3)

### Tab 1: Basic (default, blue hammer icon)
#### Custom Size
- **Length** input + unit label
- **Width** input + unit label
- **Height** input + unit label
- **mm / in** pill toggle (top right of "Custom size" heading)
- All inputs live-update the dieline on every keystroke

#### Choose Material
2-level dropdown — category on left, sub-options fly out on right.

**White Paperboard** ⚪ (white swatch circle)
| Sub-option | Thickness (in) |
|---|---|
| 210g white paperboard | 0.0106 in (0.27mm) |
| 250g white paperboard | 0.0138 in (0.35mm) |
| 300g white paperboard | 0.0165 in (0.42mm) |
| 350g white paperboard | 0.0197 in (0.50mm) |
| 400g white paperboard | 0.0217 in (0.55mm) |

**Kraft Paperboard** 🟤 (tan swatch circle)
| Sub-option | Thickness (in) |
|---|---|
| 190g kraft paperboard | 0.0102 in (0.26mm) |
| 250g kraft paperboard | 0.0130 in (0.33mm) |
| 350g kraft paperboard | 0.0181 in (0.46mm) |
| Custom kraft paperboard | user input (range shown) |

**Art Paper** ⚪ (white swatch circle)
| Sub-option | Thickness (in) |
|---|---|
| 200g art paper | 0.0079 in (0.20mm) |
| 350g art paper | 0.0126 in (0.32mm) |
| Custom art paper | user input (range shown) |

**Corrugated Board** 🟤 (tan swatch circle)
| Sub-option | Thickness (in) | Range |
|---|---|---|
| N-flute | 0.0157 in (1.0mm) | fixed |
| F-flute | ~0.0472 in (1.2mm) | 0.0394–0.0473 in (custom) |
| E-flute | 0.0630 in (1.6mm) | fixed |
| B-flute | 0.1181 in (3.0mm) | fixed |
| C-flute | 0.1575 in (4.0mm) | fixed |

#### Thickness field
- Auto-set from selected sub-material
- For corrugated flutes: shows range `(min–max in)` + `+` / `−` stepper buttons for custom input
- For paperboard: read-only display

#### Size Mode (2 pill buttons)
- `Manufacture dimensions` (default, blue outline when selected)
- `Inner dimensions`
- *(Outer dimensions shown in info bar only, not as a size-mode input)*

---

### Tab 2: Advanced (lock/key icon)
Fine-grained structural parameters — all free, no paywall:

| Param | Full Name | Description | Default formula |
|---|---|---|---|
| BL | Bleed | Outer margin around cut line | 0.1 × t |
| N | Neck / Flap depth | Top & bottom flap height | W / 2 |
| NX | Neck extension | Flap overhang past panel edge | 0.5 × t |
| R | Corner radius | Rounded corner radius on panels | 2 × t |
| K | K-factor | Bend allowance multiplier | 0.4 (paperboard), 0.5 (corrugated) |
| SW | Side width | Side dust-flap width | W / 2 |
| SP | Side panel depth | Height of side panels | H |
| NY | Neck Y offset | Vertical offset of flap crease | t |
| SWI | Side width inner | Inner dust-flap width | SW − t |
| CR | Crease relief | Notch size at crease intersections | 0.5 × t |

All params auto-calculated on first render; fully overridable.
Changing any param live re-renders the dieline.

---

### Tab 3: Models (cube icon)
Box style variant selector — reserved for future (show "Coming soon" for now).

---

## Center — Dieline SVG Canvas

### Top Info Bar (3 lines, always shown)
```
Manufacture dimensions   L × W × H  in
Inner dimensions         L × W × H  in
Outer dimensions         L × W × H  in
```
All computed from current inputs + material thickness.

### Line Legend (top-left of canvas)
- **―― Bleed** (green `#22c55e`)
- **―― Trim** (blue `#2563eb`)
- **―― Crease** (red `#ef4444`)

### Dimension Annotations (blue)
- Double-headed arrows with measurement labels
- Width arrow (horizontal) below the dieline
- Height/length arrow (vertical) on the right side
- Depth annotation inside relevant panel

### Dieline Features
- Tiled "WePrintNPack" watermark — light gray, 45° diagonal, repeating
- Real-time re-render on every input change
- Smooth pan (drag) and pinch/scroll zoom
- "Fit to screen" on first load and on reset

### Bottom Toolbar (6 tools, floating pill)
| Position | Icon | Action |
|---|---|---|
| 1 | Arrow ↗ | Select tool |
| 2 | Hand ✋ | Pan / drag (default active) |
| — | divider | |
| 3 | + | Zoom in |
| 4 | − | Zoom out |
| — | divider | |
| 5 | Pen ✏ | Edit anchor points |
| 6 | Sliders ⊟ | Toggle line visibility (Bleed / Trim / Crease checkboxes) |

---

## Right Panel

### 3D Preview (top ~50% of panel)
- Gray gradient background
- CSS 3D transforms (no Three.js)
- Mouse drag → rotate X and Y axes
- `3D` badge button top-right corner
- **Open / Close slider** at bottom of preview
  - Slider left = Open (lid/flap fully open)
  - Slider right = Close (box fully closed)
  - Smooth CSS transition on slider move
- Real-time update when dimensions change

### File Formats section (bottom ~50%)
**Heading:** "File formats"

4 download buttons in 2×2 grid:
| Button | Icon color | Format | Implementation |
|---|---|---|---|
| AI dieline | Orange (Ai logo) | `.ai` | SVG renamed to .ai |
| PDF dieline | Red (PDF logo) | `.pdf` | jsPDF, SVG embedded |
| DXF dieline | Gray (DXF logo) | `.dxf` | SVG paths → DXF lines |
| 3D mockup | Green (JPG logo) | `.jpg` | html-to-canvas of 3D preview |

Selected format gets blue border highlight.

**"You will get" section** below buttons:
- Bullet: "All dieline files can be generated and downloaded"

---

## Box Type Dieline Geometry

### Mailer Box (Tuck-End Style)
**Reference dimensions:** L=4.7244 W=2.3622 H=6.2992 in, 350g white paperboard

**Layout:** Vertical cruciform
```
        [Top tuck flap — curved rounded top]
        [  Top dust flaps (left + right)   ]
        [          Front panel             ]
        [  Side dust flaps (left + right)  ]
        [          Back panel              ]
        [ Bottom dust flaps (left + right) ]
        [Bottom tuck flap — curved rounded ]
```
**Key geometry:**
- Front panel: W × H
- Back panel: W × H (below front, separated by a crease)
- Left/right side dust flaps: (W/2 − t) × H each
- Top tuck flap: W × (flap_depth) with rounded/curved top edge
- Bottom tuck flap: W × (flap_depth) with rounded/curved top edge
- All corners on tuck flaps: radius R
- Crease lines at every fold boundary (red)
- Trim lines offset inward by bleed on all outer edges (green outside, blue inside)

**3D shape:** Rectangular box, lid = tuck-in flap

---

### Pizza Box
**Reference dimensions:** L=10.2362 W=10.2362 H=1.1811 in, F-flute corrugated

**Layout:** Plus/cross shape — hinged lid + base connected at back
```
              [    Lid panel (L × W)      ]
  [left flap] [    Base panel (L × W)    ] [right flap]
              [ Front tuck flap (L × H)  ]
```
**Key geometry:**
- Base panel: L × W (center)
- Lid panel: L × W (above base, connected at back crease)
- Left/right side flaps: H × W with diagonal corner lock cuts (45°)
- Front tuck flap: L × H
- Lid front flap: L × (H − t)
- Corner lock tabs: diagonal cut + small rectangular tab
- Finger holes (circles, r ≈ 8mm) on left and right side flaps
- All corners of lid: slight radius R
- Crease at base/lid boundary (back of box)

**3D shape:** Flat hinged box (pizza box), lid hinges open upward

---

### Shipping Box (RSC — Regular Slotted Container)
**Layout:** Horizontal cross/cruciform
```
[top-left flap] [  Top panel   ] [top-right flap]
[left panel   ] [ Front panel  ] [right panel   ] [back panel]
[bot-left flap] [Bottom panel  ] [bot-right flap]
```
**Key geometry:**
- Front panel: L × H
- Back panel: L × H (right of right panel)
- Left/right side panels: W × H
- Top flaps (4): L/2 × W and W/2 × L alternating (RSC standard)
- Bottom flaps (4): same as top
- Flap slots: small gap (t) between opposing flap pairs
- All outer corners: right angle (no radius)

**3D shape:** Standard open-top shipping box

---

### Square Shipping Box
- Identical geometry to Shipping Box (RSC)
- L = W enforced (Width input auto-syncs to Length)
- Only difference: square cross-section

---

## Dimension Math (lib/dieline-math.ts)

### Input → Output
Given: innerL, innerW, innerH, thickness `t`, bleed `BL`
```
manufactureL = innerL + 2*t
manufactureW = innerW + 2*t
manufactureH = innerH + 2*t

outerL = manufactureL + 2*BL
outerW = manufactureW + 2*BL
outerH = manufactureH + 2*BL
```

### Size mode conversions
- **Inner → Manufacture:** add 2t per axis
- **Manufacture → Inner:** subtract 2t per axis
- **Outer → Manufacture:** subtract 2*BL per axis

### Default Advanced params (auto from material)
```ts
BL  = 0.1 * t
N   = innerW / 2
NX  = 0.5 * t
R   = Math.max(2 * t, 1)   // min 1mm
K   = isCorreugated ? 0.5 : 0.4
SW  = innerW / 2
SP  = innerH
NY  = t
SWI = SW - t
CR  = 0.5 * t
```

---

## Files to Create
```
app/dieline/[boxType]/page.tsx          ← route entry, reads boxType param
components/dieline-generator.tsx        ← main 3-column layout + state
components/dieline-left-panel.tsx       ← Basic/Advanced/Models tabs
components/dieline-canvas.tsx           ← SVG render + pan/zoom/toolbar
components/dieline-3d-preview.tsx       ← CSS 3D box + open/close slider
lib/dieline-math.ts                     ← dimension calc + default advanced params
lib/dieline-export.ts                   ← SVG / PDF / AI / DXF blob download
```

## Files to Modify
```
app/products/packaging-box/page.tsx     ← TileCard hover 2 buttons (DONE)
```

## Dependencies to Add
```
jspdf          ← PDF export (npm install jspdf)
```

---

## Implementation Order
1. ~~TileCard hover buttons~~ ✅ DONE
2. Route page shell + `dieline-generator.tsx` layout skeleton
3. `lib/dieline-math.ts` — dimension calculations all 4 box types
4. `dieline-left-panel.tsx` — Basic tab: size inputs, material dropdown, thickness, size mode
5. `dieline-canvas.tsx` — Mailer Box SVG + watermark + annotations + toolbar
6. Pizza Box SVG geometry
7. Shipping Box + Square Shipping Box SVG geometry
8. Pan / zoom / fit-to-screen on canvas
9. `dieline-3d-preview.tsx` — CSS 3D box + open/close slider
10. `lib/dieline-export.ts` — SVG → PDF → AI → DXF downloads
11. Advanced tab — 10 parameters wired to live re-render
