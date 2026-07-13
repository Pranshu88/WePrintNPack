// ─── Material options (Choose material dropdown) ───────────────────────────
// Deltas are subtracted from / added to the manufacture (L/W/H) dimensions to
// get the inner and outer dimensions for each board weight/thickness.
// Shared by pizza-box-editor.tsx and shipping-box-editor.tsx (Square mode).
export type MaterialOption = {
  id: string;
  label: string;
  thickness: number; // mm
  innerDelta: { l: number; w: number; h: number };
  outerDelta: { l: number; w: number; h: number };
};

export const WHITE_PAPERBOARD_OPTIONS: MaterialOption[] = [
  { id: "210g", label: "210g white paperboard(0.27mm)", thickness: 0.27, innerDelta: { l: 0.84, w: 1.04, h: 0.30 }, outerDelta: { l: 0.24, w: 0.24, h: 0.24 } },
  { id: "250g", label: "250g white paperboard(0.35mm)", thickness: 0.35, innerDelta: { l: 1.10, w: 1.70, h: 0.40 }, outerDelta: { l: 0.3,  w: 0.3,  h: 0.3  } },
  { id: "300g", label: "300g white paperboard(0.42mm)", thickness: 0.42, innerDelta: { l: 1.34, w: 1.84, h: 0.50 }, outerDelta: { l: 0.34, w: 0.34, h: 0.34 } },
  { id: "350g", label: "350g white paperboard(0.5mm)",  thickness: 0.50, innerDelta: { l: 1.60, w: 2.50, h: 0.60 }, outerDelta: { l: 0.4,  w: 0.4,  h: 0.4  } },
  { id: "400g", label: "400g white paperboard(0.55mm)", thickness: 0.55, innerDelta: { l: 1.80, w: 2.60, h: 0.70 }, outerDelta: { l: 0.4,  w: 0.4,  h: 0.4  } },
];

export const KRAFT_PAPERBOARD_OPTIONS: MaterialOption[] = [
  { id: "kraft-190g", label: "190g kraft paperboard(0.26mm)", thickness: 0.26, innerDelta: { l: 0.82, w: 1.02, h: 0.30 }, outerDelta: { l: 0.22, w: 0.22, h: 0.22 } },
  { id: "kraft-250g", label: "250g kraft paperboard(0.33mm)", thickness: 0.33, innerDelta: { l: 1.06, w: 1.66, h: 0.40 }, outerDelta: { l: 0.26, w: 0.26, h: 0.26 } },
  { id: "kraft-350g", label: "350g kraft paperboard(0.46mm)", thickness: 0.46, innerDelta: { l: 1.52, w: 1.92, h: 0.60 }, outerDelta: { l: 0.32, w: 0.32, h: 0.32 } },
  { id: "kraft-custom", label: "Custom kraft paperboard", thickness: 0.2, innerDelta: { l: 0.6, w: 0.9, h: 0.2 }, outerDelta: { l: 0.2, w: 0.2, h: 0.2 } },
];

export const ART_PAPER_OPTIONS: MaterialOption[] = [
  { id: "art-200g", label: "200g art paper(0.2mm)",  thickness: 0.2,  innerDelta: { l: 0.6,  w: 0.9,  h: 0.2 }, outerDelta: { l: 0.2,  w: 0.2,  h: 0.2  } },
  { id: "art-350g", label: "350g art paper(0.32mm)", thickness: 0.32, innerDelta: { l: 1.04, w: 1.64, h: 0.4 }, outerDelta: { l: 0.24, w: 0.24, h: 0.24 } },
  { id: "art-custom", label: "Custom art paper", thickness: 0.2, innerDelta: { l: 0.6, w: 0.9, h: 0.2 }, outerDelta: { l: 0.2, w: 0.2, h: 0.2 } },
];

// Every flute is itself a "Custom …"-style option — the whole item is a thickness range.
export const CORRUGATED_OPTIONS: MaterialOption[] = [
  { id: "flute-n", label: "N-flute", thickness: 0.8, innerDelta: { l: 2.6, w: 3.6, h: 1.0 }, outerDelta: { l: 0.6, w: 0.6, h: 0.6 } },
  { id: "flute-f", label: "F-flute", thickness: 1.0, innerDelta: { l: 3.0, w: 5.0, h: 1.0 }, outerDelta: { l: 1.0, w: 1.0, h: 1.0 } },
  { id: "flute-e", label: "E-flute", thickness: 1.1, innerDelta: { l: 3.2, w: 5.7, h: 1.0 }, outerDelta: { l: 1.2, w: 1.2, h: 1.2 } },
  { id: "flute-b", label: "B-flute", thickness: 2.5, innerDelta: { l: 8.0, w: 14.0, h: 3.0 }, outerDelta: { l: 2.0, w: 2.0, h: 2.0 } },
  { id: "flute-c", label: "C-flute", thickness: 3.5, innerDelta: { l: 11.0, w: 17.5, h: 4.0 }, outerDelta: { l: 3.0, w: 3.0, h: 3.0 } },
];

// Ids of the "Custom …" (range-based) material options, and the thickness range each allows.
export const CUSTOM_MATERIAL_RANGES: Record<string, { min: number; max: number }> = {
  "kraft-custom": { min: 0.2, max: 0.8 },
  "art-custom": { min: 0.2, max: 0.5 },
  "flute-n": { min: 0.8, max: 1.0 },
  "flute-f": { min: 1.0, max: 1.2 },
  "flute-e": { min: 1.1, max: 2.0 },
  "flute-b": { min: 2.5, max: 3.0 },
  "flute-c": { min: 3.5, max: 4.0 },
};

export type DeltaEntry = { innerDelta: { l: number; w: number; h: number }; outerDelta: { l: number; w: number; h: number } };

// Keyed by thickness (1-decimal string). Shared by Kraft's and Art Paper's "Custom …"
// option (their tables coincide over the overlapping 0.2–0.5mm range).
const CUSTOM_PAPER_DELTAS: Record<string, DeltaEntry> = {
  "0.2": { innerDelta: { l: 0.6, w: 0.9, h: 0.2 }, outerDelta: { l: 0.2, w: 0.2, h: 0.2 } },
  "0.3": { innerDelta: { l: 0.9, w: 1.6, h: 0.3 }, outerDelta: { l: 0.3, w: 0.3, h: 0.3 } },
  "0.4": { innerDelta: { l: 1.3, w: 1.8, h: 0.5 }, outerDelta: { l: 0.3, w: 0.3, h: 0.3 } },
  "0.5": { innerDelta: { l: 1.6, w: 2.5, h: 0.6 }, outerDelta: { l: 0.4, w: 0.4, h: 0.4 } },
  "0.6": { innerDelta: { l: 1.9, w: 2.7, h: 0.7 }, outerDelta: { l: 0.5, w: 0.5, h: 0.5 } },
  "0.7": { innerDelta: { l: 2.3, w: 3.4, h: 0.9 }, outerDelta: { l: 0.5, w: 0.5, h: 0.5 } },
  "0.8": { innerDelta: { l: 2.6, w: 3.6, h: 1.0 }, outerDelta: { l: 0.6, w: 0.6, h: 0.6 } },
};

const FLUTE_N_DELTAS: Record<string, DeltaEntry> = {
  "0.8": { innerDelta: { l: 2.6, w: 3.6, h: 1.0 }, outerDelta: { l: 0.6, w: 0.6, h: 0.6 } },
  "0.9": { innerDelta: { l: 2.9, w: 4.8, h: 1.1 }, outerDelta: { l: 0.7, w: 0.7, h: 0.7 } },
  "1.0": { innerDelta: { l: 3.0, w: 5.0, h: 1.0 }, outerDelta: { l: 1.0, w: 1.0, h: 1.0 } },
};

const FLUTE_F_DELTAS: Record<string, DeltaEntry> = {
  "1.0": { innerDelta: { l: 3.0, w: 5.0, h: 1.0 }, outerDelta: { l: 1.0, w: 1.0, h: 1.0 } },
  "1.1": { innerDelta: { l: 3.2, w: 5.7, h: 1.0 }, outerDelta: { l: 1.2, w: 1.2, h: 1.2 } },
  "1.2": { innerDelta: { l: 3.4, w: 5.9, h: 1.0 }, outerDelta: { l: 1.4, w: 1.4, h: 1.4 } },
};

const FLUTE_E_DELTAS: Record<string, DeltaEntry> = {
  "1.1": { innerDelta: { l: 3.2, w: 5.7,  h: 1.0  }, outerDelta: { l: 1.2, w: 1.2, h: 1.2 } },
  "1.2": { innerDelta: { l: 3.4, w: 5.96, h: 1.22 }, outerDelta: { l: 1.4, w: 1.4, h: 1.4 } },
  "1.3": { innerDelta: { l: 3.6, w: 6.21, h: 1.44 }, outerDelta: { l: 1.6, w: 1.6, h: 1.6 } },
  "1.4": { innerDelta: { l: 3.8, w: 6.47, h: 1.67 }, outerDelta: { l: 1.8, w: 1.8, h: 1.8 } },
  "1.5": { innerDelta: { l: 4.0, w: 6.72, h: 1.89 }, outerDelta: { l: 2.0, w: 2.0, h: 2.0 } },
  "1.6": { innerDelta: { l: 4.2, w: 6.98, h: 2.11 }, outerDelta: { l: 2.2, w: 2.2, h: 2.2 } },
  "1.7": { innerDelta: { l: 4.4, w: 7.23, h: 2.33 }, outerDelta: { l: 2.4, w: 2.4, h: 2.4 } },
  "1.8": { innerDelta: { l: 4.6, w: 7.49, h: 2.56 }, outerDelta: { l: 2.6, w: 2.6, h: 2.6 } },
  "1.9": { innerDelta: { l: 4.8, w: 7.74, h: 2.78 }, outerDelta: { l: 2.8, w: 2.8, h: 2.8 } },
  "2.0": { innerDelta: { l: 5.0, w: 8.0,  h: 3.0  }, outerDelta: { l: 3.0, w: 3.0, h: 3.0 } },
};

const FLUTE_B_DELTAS: Record<string, DeltaEntry> = {
  "2.5": { innerDelta: { l: 8.0,  w: 14.0, h: 3.0 }, outerDelta: { l: 2.0, w: 2.0, h: 2.0 } },
  "2.6": { innerDelta: { l: 8.4,  w: 14.2, h: 3.2 }, outerDelta: { l: 2.2, w: 2.2, h: 2.2 } },
  "2.7": { innerDelta: { l: 8.8,  w: 14.4, h: 3.4 }, outerDelta: { l: 2.4, w: 2.4, h: 2.4 } },
  "2.8": { innerDelta: { l: 9.2,  w: 14.6, h: 3.6 }, outerDelta: { l: 2.6, w: 2.6, h: 2.6 } },
  "2.9": { innerDelta: { l: 9.6,  w: 14.8, h: 3.8 }, outerDelta: { l: 2.8, w: 2.8, h: 2.8 } },
  "3.0": { innerDelta: { l: 10.0, w: 15.0, h: 4.0 }, outerDelta: { l: 3.0, w: 3.0, h: 3.0 } },
};

const FLUTE_C_DELTAS: Record<string, DeltaEntry> = {
  "3.5": { innerDelta: { l: 11.0, w: 17.5, h: 4.0 }, outerDelta: { l: 3.0, w: 3.0, h: 3.0 } },
  "3.6": { innerDelta: { l: 11.4, w: 18.0, h: 4.2 }, outerDelta: { l: 3.2, w: 3.2, h: 3.2 } },
  "3.7": { innerDelta: { l: 11.8, w: 18.5, h: 4.4 }, outerDelta: { l: 3.4, w: 3.4, h: 3.4 } },
  "3.8": { innerDelta: { l: 12.2, w: 19.0, h: 4.6 }, outerDelta: { l: 3.6, w: 3.6, h: 3.6 } },
  "3.9": { innerDelta: { l: 12.6, w: 19.5, h: 4.8 }, outerDelta: { l: 3.8, w: 3.8, h: 3.8 } },
  "4.0": { innerDelta: { l: 13.0, w: 20.0, h: 5.0 }, outerDelta: { l: 4.0, w: 4.0, h: 4.0 } },
};

// Delta lookup table per "Custom …" material id, keyed by thickness (1-decimal string).
export const CUSTOM_DELTA_TABLES: Record<string, Record<string, DeltaEntry>> = {
  "kraft-custom": CUSTOM_PAPER_DELTAS,
  "art-custom": CUSTOM_PAPER_DELTAS,
  "flute-n": FLUTE_N_DELTAS,
  "flute-f": FLUTE_F_DELTAS,
  "flute-e": FLUTE_E_DELTAS,
  "flute-b": FLUTE_B_DELTAS,
  "flute-c": FLUTE_C_DELTAS,
};

export const MATERIAL_CATEGORIES: { label: string; options: MaterialOption[] }[] = [
  { label: "White Paperboard", options: WHITE_PAPERBOARD_OPTIONS },
  { label: "Kraft Paperboard", options: KRAFT_PAPERBOARD_OPTIONS },
  { label: "Art Paper", options: ART_PAPER_OPTIONS },
  { label: "Corrugated Board", options: CORRUGATED_OPTIONS },
];
