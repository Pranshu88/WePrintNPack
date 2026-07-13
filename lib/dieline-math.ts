export type BoxType = "mailer-boxes" | "pizza-boxes" | "shipping-boxes" | "square-shipping-boxes";
export type SizeMode = "manufacture" | "inner";
export type Unit = "in" | "mm";

export interface DielineParams {
  innerL: number; // inches
  innerW: number;
  innerH: number;
  t: number; // material thickness in inches
  BL: number; // bleed
  N: number;  // flap depth
  NX: number; // neck extension
  R: number;  // corner radius
  K: number;  // k-factor
  SW: number; // side width
  SP: number; // side panel depth
  NY: number; // neck Y offset
  SWI: number; // side width inner
  CR: number;  // crease relief
}

export interface DimSet {
  manufacture: { L: number; W: number; H: number };
  inner:       { L: number; W: number; H: number };
  outer:       { L: number; W: number; H: number };
}

export interface MaterialOption {
  id: string;
  label: string;
  thickness: number; // inches
  thicknessMin?: number;
  thicknessMax?: number;
  customThickness?: boolean;
  swatch: "white" | "kraft";
  category: string;
  isCorrugated?: boolean;
}

export const MATERIAL_CATEGORIES: { label: string; swatch: "white" | "kraft"; options: MaterialOption[] }[] = [
  {
    label: "White Paperboard",
    swatch: "white",
    options: [
      { id: "wpb-210", label: "210g white paperboard (0.27mm)", thickness: 0.0106, swatch: "white", category: "White Paperboard" },
      { id: "wpb-250", label: "250g white paperboard (0.35mm)", thickness: 0.0138, swatch: "white", category: "White Paperboard" },
      { id: "wpb-300", label: "300g white paperboard (0.42mm)", thickness: 0.0165, swatch: "white", category: "White Paperboard" },
      { id: "wpb-350", label: "350g white paperboard (0.50mm)", thickness: 0.0197, swatch: "white", category: "White Paperboard" },
      { id: "wpb-400", label: "400g white paperboard (0.55mm)", thickness: 0.0217, swatch: "white", category: "White Paperboard" },
    ],
  },
  {
    label: "Kraft Paperboard",
    swatch: "kraft",
    options: [
      { id: "kpb-190", label: "190g kraft paperboard (0.26mm)", thickness: 0.0102, swatch: "kraft", category: "Kraft Paperboard" },
      { id: "kpb-250", label: "250g kraft paperboard (0.33mm)", thickness: 0.0130, swatch: "kraft", category: "Kraft Paperboard" },
      { id: "kpb-350", label: "350g kraft paperboard (0.46mm)", thickness: 0.0181, swatch: "kraft", category: "Kraft Paperboard" },
      { id: "kpb-custom", label: "Custom kraft paperboard", thickness: 0.0130, thicknessMin: 0.0059, thicknessMax: 0.0236, customThickness: true, swatch: "kraft", category: "Kraft Paperboard" },
    ],
  },
  {
    label: "Art Paper",
    swatch: "white",
    options: [
      { id: "ap-200", label: "200g art paper (0.20mm)", thickness: 0.0079, swatch: "white", category: "Art Paper" },
      { id: "ap-350", label: "350g art paper (0.32mm)", thickness: 0.0126, swatch: "white", category: "Art Paper" },
      { id: "ap-custom", label: "Custom art paper", thickness: 0.0100, thicknessMin: 0.0059, thicknessMax: 0.0177, customThickness: true, swatch: "white", category: "Art Paper" },
    ],
  },
  {
    label: "Corrugated Board",
    swatch: "kraft",
    options: [
      { id: "corr-n", label: "N-flute", thickness: 0.0157, swatch: "kraft", category: "Corrugated Board", isCorrugated: true },
      { id: "corr-f", label: "F-flute", thickness: 0.0472, thicknessMin: 0.0394, thicknessMax: 0.0473, customThickness: true, swatch: "kraft", category: "Corrugated Board", isCorrugated: true },
      { id: "corr-e", label: "E-flute", thickness: 0.0630, swatch: "kraft", category: "Corrugated Board", isCorrugated: true },
      { id: "corr-b", label: "B-flute", thickness: 0.1181, swatch: "kraft", category: "Corrugated Board", isCorrugated: true },
      { id: "corr-c", label: "C-flute", thickness: 0.1575, swatch: "kraft", category: "Corrugated Board", isCorrugated: true },
    ],
  },
];

export function defaultAdvanced(innerL: number, innerW: number, innerH: number, t: number, isCorrugated: boolean): Omit<DielineParams, "innerL" | "innerW" | "innerH" | "t"> {
  return {
    BL:  parseFloat((0.1 * t).toFixed(4)),
    N:   parseFloat((innerW / 2).toFixed(4)),
    NX:  parseFloat((0.5 * t).toFixed(4)),
    R:   parseFloat(Math.max(2 * t, 0.04).toFixed(4)),
    K:   isCorrugated ? 0.5 : 0.4,
    SW:  parseFloat((innerW / 2).toFixed(4)),
    SP:  parseFloat(innerH.toFixed(4)),
    NY:  parseFloat(t.toFixed(4)),
    SWI: parseFloat((innerW / 2 - t).toFixed(4)),
    CR:  parseFloat((0.5 * t).toFixed(4)),
  };
}

export function computeDims(params: DielineParams): DimSet {
  const { innerL, innerW, innerH, t, BL } = params;
  return {
    inner:       { L: innerL,            W: innerW,            H: innerH },
    manufacture: { L: innerL + 2 * t,    W: innerW + 2 * t,    H: innerH + 2 * t },
    outer:       { L: innerL + 2*t + 2*BL, W: innerW + 2*t + 2*BL, H: innerH + 2*t + 2*BL },
  };
}

export function convertToInner(L: number, W: number, H: number, mode: SizeMode, t: number): { L: number; W: number; H: number } {
  if (mode === "inner") return { L, W, H };
  return { L: L - 2 * t, W: W - 2 * t, H: H - 2 * t };
}

export function toUnit(val: number, unit: Unit): number {
  return unit === "mm" ? parseFloat((val * 25.4).toFixed(4)) : parseFloat(val.toFixed(4));
}

export function fromUnit(val: number, unit: Unit): number {
  return unit === "mm" ? parseFloat((val / 25.4).toFixed(6)) : val;
}

export function fmt(val: number, unit: Unit): string {
  const v = toUnit(val, unit);
  return `${v} ${unit}`;
}
