import getDb from "./db";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type SerializableItem = {
  id: string;
  kind: "text" | "image";
  x: number;
  y: number;
  w: number;
  text?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  src?: string;
  h?: number;
};

export type DesignColorVariant = {
  id: string;
  colorHex: string;
  colorName: string;
  frontImage: string;
  frontOverlay?: string;
  backImage?: string;
  backOverlay?: string;
  frontAdminItems?: SerializableItem[];
  backAdminItems?: SerializableItem[];
  createdAt: string;
};

export type DesignTemplateItem = {
  id: string;
  name: string;
  colorHex?: string;
  colorName?: string;
  frontImage: string;
  frontOverlay?: string;
  backImage?: string;
  backOverlay?: string;
  frontAdminItems?: SerializableItem[];
  backAdminItems?: SerializableItem[];
  frontBgColor?: string;
  backBgColor?: string;
  colorVariants?: DesignColorVariant[];
  createdAt: string;
};

export type GalleryTemplate = {
  id: string;
  productSlug: string;
  name: string;
  previewImage: string;
  designs: DesignTemplateItem[];
  createdAt: string;
};

export type PaginatedTemplates = {
  templates: GalleryTemplate[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

// ─── Internal SQLite row shapes ───────────────────────────────────────────────

type GtRow = {
  id: string;
  product_slug: string;
  name: string;
  preview_image: string;
  created_at: string;
};

type DesignRow = {
  id: string;
  gallery_id: string;
  name: string;
  color_hex: string | null;
  color_name: string | null;
  front_image: string;
  front_overlay: string | null;
  back_image: string | null;
  back_overlay: string | null;
  front_admin_items: string | null;
  back_admin_items: string | null;
  front_bg_color: string | null;
  back_bg_color: string | null;
  created_at: string;
};

type ColorRow = {
  id: string;
  design_id: string;
  color_hex: string;
  color_name: string;
  front_image: string;
  front_overlay: string | null;
  back_image: string | null;
  back_overlay: string | null;
  front_admin_items: string | null;
  back_admin_items: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function parseItems(json: string | null | undefined): SerializableItem[] | undefined {
  if (!json) return undefined;
  try {
    const arr = JSON.parse(json) as unknown;
    return Array.isArray(arr) && arr.length > 0 ? (arr as SerializableItem[]) : undefined;
  } catch {
    return undefined;
  }
}

function inList(ids: string[]) {
  return ids.map(() => "?").join(",");
}

function rowToColor(c: ColorRow): DesignColorVariant {
  const v: DesignColorVariant = {
    id: c.id,
    colorHex: c.color_hex,
    colorName: c.color_name,
    frontImage: c.front_image,
    createdAt: c.created_at,
  };
  if (c.front_overlay) v.frontOverlay = c.front_overlay;
  if (c.back_image) v.backImage = c.back_image;
  if (c.back_overlay) v.backOverlay = c.back_overlay;
  const fai = parseItems(c.front_admin_items);
  if (fai) v.frontAdminItems = fai;
  const bai = parseItems(c.back_admin_items);
  if (bai) v.backAdminItems = bai;
  return v;
}

function rowToDesign(d: DesignRow, colors: ColorRow[]): DesignTemplateItem {
  const item: DesignTemplateItem = {
    id: d.id,
    name: d.name,
    frontImage: d.front_image,
    createdAt: d.created_at,
  };
  if (d.color_hex) item.colorHex = d.color_hex;
  if (d.color_name) item.colorName = d.color_name;
  if (d.front_overlay) item.frontOverlay = d.front_overlay;
  if (d.back_image) item.backImage = d.back_image;
  if (d.back_overlay) item.backOverlay = d.back_overlay;
  if (d.front_bg_color) item.frontBgColor = d.front_bg_color;
  if (d.back_bg_color) item.backBgColor = d.back_bg_color;
  const fai = parseItems(d.front_admin_items);
  if (fai) item.frontAdminItems = fai;
  const bai = parseItems(d.back_admin_items);
  if (bai) item.backAdminItems = bai;
  const variants = colors.map(rowToColor);
  if (variants.length > 0) item.colorVariants = variants;
  return item;
}

function assembleTemplates(rows: GtRow[], allDesigns: DesignRow[], allColors: ColorRow[]): GalleryTemplate[] {
  const colorsByDesign = new Map<string, ColorRow[]>();
  for (const c of allColors) {
    const arr = colorsByDesign.get(c.design_id) ?? [];
    arr.push(c);
    colorsByDesign.set(c.design_id, arr);
  }
  const designsByGallery = new Map<string, DesignRow[]>();
  for (const d of allDesigns) {
    const arr = designsByGallery.get(d.gallery_id) ?? [];
    arr.push(d);
    designsByGallery.set(d.gallery_id, arr);
  }
  return rows.map((r) => {
    const designs = (designsByGallery.get(r.id) ?? []).map((d) =>
      rowToDesign(d, colorsByDesign.get(d.id) ?? [])
    );
    return {
      id: r.id,
      productSlug: r.product_slug,
      name: r.name,
      previewImage: r.preview_image,
      createdAt: r.created_at,
      designs,
    };
  });
}

function fetchDesignsAndColors(db: ReturnType<typeof getDb>, galleryIds: string[]) {
  if (galleryIds.length === 0) return { designs: [] as DesignRow[], colors: [] as ColorRow[] };
  const designs = db
    .prepare(`SELECT * FROM designs WHERE gallery_id IN (${inList(galleryIds)}) ORDER BY created_at ASC`)
    .all(...galleryIds) as DesignRow[];
  const dIds = designs.map((d) => d.id);
  const colors =
    dIds.length > 0
      ? (db
          .prepare(`SELECT * FROM design_colors WHERE design_id IN (${inList(dIds)}) ORDER BY created_at ASC`)
          .all(...dIds) as ColorRow[])
      : [];
  return { designs, colors };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getGalleryTemplates(productSlug: string): GalleryTemplate[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM gallery_templates WHERE product_slug = ? ORDER BY created_at DESC")
    .all(productSlug) as GtRow[];
  if (rows.length === 0) return [];
  const { designs, colors } = fetchDesignsAndColors(db, rows.map((r) => r.id));
  return assembleTemplates(rows, designs, colors);
}

export function getGalleryTemplatesPaginated(
  productSlug: string,
  page: number,
  limit: number
): PaginatedTemplates {
  const db = getDb();
  const offset = (page - 1) * limit;
  const { cnt } = db
    .prepare("SELECT COUNT(*) as cnt FROM gallery_templates WHERE product_slug = ?")
    .get(productSlug) as { cnt: number };
  const rows = db
    .prepare(
      "SELECT * FROM gallery_templates WHERE product_slug = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(productSlug, limit, offset) as GtRow[];
  const totalPages = Math.max(1, Math.ceil(cnt / limit));
  if (rows.length === 0) return { templates: [], total: cnt, page, totalPages, limit };
  const { designs, colors } = fetchDesignsAndColors(db, rows.map((r) => r.id));
  return { templates: assembleTemplates(rows, designs, colors), total: cnt, page, totalPages, limit };
}

export function getGalleryTemplate(id: string): GalleryTemplate | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM gallery_templates WHERE id = ?").get(id) as GtRow | undefined;
  if (!row) return undefined;
  const { designs, colors } = fetchDesignsAndColors(db, [id]);
  return assembleTemplates([row], designs, colors)[0];
}

export function createGalleryTemplate(
  productSlug: string,
  name: string,
  previewImage: string
): GalleryTemplate {
  const db = getDb();
  const id = uid();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, productSlug, name.trim(), previewImage, createdAt);
  return { id, productSlug, name: name.trim(), previewImage, designs: [], createdAt };
}

export function updateGalleryTemplate(
  id: string,
  updates: { name?: string; previewImage?: string }
): GalleryTemplate | undefined {
  const db = getDb();
  if (updates.name !== undefined) {
    db.prepare("UPDATE gallery_templates SET name = ? WHERE id = ?").run(updates.name.trim(), id);
  }
  if (updates.previewImage !== undefined) {
    db.prepare("UPDATE gallery_templates SET preview_image = ? WHERE id = ?").run(updates.previewImage, id);
  }
  return getGalleryTemplate(id);
}

export function deleteGalleryTemplate(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM gallery_templates WHERE id = ?").run(id);
  return result.changes > 0;
}

export function addDesign(
  galleryId: string,
  input: {
    name: string;
    colorHex?: string;
    colorName?: string;
    frontImage: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
    frontBgColor?: string;
    backBgColor?: string;
  }
): GalleryTemplate | undefined {
  const db = getDb();
  const gallery = db.prepare("SELECT id FROM gallery_templates WHERE id = ?").get(galleryId);
  if (!gallery) return undefined;
  const id = uid();
  db.prepare(
    `INSERT INTO designs
      (id, gallery_id, name, color_hex, color_name, front_image, front_overlay,
       back_image, back_overlay, front_admin_items, back_admin_items,
       front_bg_color, back_bg_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    galleryId,
    input.name.trim(),
    input.colorHex ?? null,
    input.colorName ?? null,
    input.frontImage,
    input.frontOverlay ?? null,
    input.backImage ?? null,
    input.backOverlay ?? null,
    input.frontAdminItems ? JSON.stringify(input.frontAdminItems) : null,
    input.backAdminItems ? JSON.stringify(input.backAdminItems) : null,
    input.frontBgColor ?? null,
    input.backBgColor ?? null,
    new Date().toISOString()
  );
  return getGalleryTemplate(galleryId);
}

export function updateDesign(
  galleryId: string,
  designId: string,
  updates: {
    name?: string;
    colorHex?: string;
    colorName?: string;
    frontImage?: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
    frontBgColor?: string;
    backBgColor?: string;
  }
): GalleryTemplate | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM designs WHERE id = ? AND gallery_id = ?")
    .get(designId, galleryId);
  if (!row) return undefined;
  const setClauses: string[] = [];
  const vals: unknown[] = [];
  if (updates.name !== undefined) { setClauses.push("name = ?"); vals.push(updates.name.trim()); }
  if (updates.colorHex !== undefined) { setClauses.push("color_hex = ?"); vals.push(updates.colorHex); }
  if (updates.colorName !== undefined) { setClauses.push("color_name = ?"); vals.push(updates.colorName); }
  if (updates.frontImage !== undefined) { setClauses.push("front_image = ?"); vals.push(updates.frontImage); }
  if (updates.frontOverlay !== undefined) { setClauses.push("front_overlay = ?"); vals.push(updates.frontOverlay); }
  if (updates.backImage !== undefined) { setClauses.push("back_image = ?"); vals.push(updates.backImage); }
  if (updates.backOverlay !== undefined) { setClauses.push("back_overlay = ?"); vals.push(updates.backOverlay); }
  if (updates.frontAdminItems !== undefined) { setClauses.push("front_admin_items = ?"); vals.push(JSON.stringify(updates.frontAdminItems)); }
  if (updates.backAdminItems !== undefined) { setClauses.push("back_admin_items = ?"); vals.push(JSON.stringify(updates.backAdminItems)); }
  if (updates.frontBgColor !== undefined) { setClauses.push("front_bg_color = ?"); vals.push(updates.frontBgColor); }
  if (updates.backBgColor !== undefined) { setClauses.push("back_bg_color = ?"); vals.push(updates.backBgColor); }
  if (setClauses.length > 0) {
    db.prepare(`UPDATE designs SET ${setClauses.join(", ")} WHERE id = ?`).run(...vals, designId);
  }
  return getGalleryTemplate(galleryId);
}

export function deleteDesign(galleryId: string, designId: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM designs WHERE id = ? AND gallery_id = ?")
    .run(designId, galleryId);
  return result.changes > 0;
}

export function getDesign(galleryId: string, designId: string): DesignTemplateItem | undefined {
  const db = getDb();
  const d = db
    .prepare("SELECT * FROM designs WHERE id = ? AND gallery_id = ?")
    .get(designId, galleryId) as DesignRow | undefined;
  if (!d) return undefined;
  const colors = db
    .prepare("SELECT * FROM design_colors WHERE design_id = ? ORDER BY created_at ASC")
    .all(designId) as ColorRow[];
  return rowToDesign(d, colors);
}

export function addDesignColor(
  galleryId: string,
  designId: string,
  input: {
    colorHex: string;
    colorName: string;
    frontImage: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
  }
): DesignTemplateItem | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM designs WHERE id = ? AND gallery_id = ?")
    .get(designId, galleryId);
  if (!row) return undefined;
  const id = uid();
  db.prepare(
    `INSERT INTO design_colors
      (id, design_id, color_hex, color_name, front_image, front_overlay,
       back_image, back_overlay, front_admin_items, back_admin_items, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    designId,
    input.colorHex,
    input.colorName.trim(),
    input.frontImage,
    input.frontOverlay ?? null,
    input.backImage ?? null,
    input.backOverlay ?? null,
    input.frontAdminItems ? JSON.stringify(input.frontAdminItems) : null,
    input.backAdminItems ? JSON.stringify(input.backAdminItems) : null,
    new Date().toISOString()
  );
  return getDesign(galleryId, designId);
}

export function updateDesignColor(
  galleryId: string,
  designId: string,
  colorId: string,
  updates: {
    colorHex?: string;
    colorName?: string;
    frontImage?: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
  }
): DesignTemplateItem | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM design_colors WHERE id = ? AND design_id = ?")
    .get(colorId, designId);
  if (!row) return undefined;
  const setClauses: string[] = [];
  const vals: unknown[] = [];
  if (updates.colorHex !== undefined) { setClauses.push("color_hex = ?"); vals.push(updates.colorHex); }
  if (updates.colorName !== undefined) { setClauses.push("color_name = ?"); vals.push(updates.colorName); }
  if (updates.frontImage !== undefined) { setClauses.push("front_image = ?"); vals.push(updates.frontImage); }
  if (updates.frontOverlay !== undefined) { setClauses.push("front_overlay = ?"); vals.push(updates.frontOverlay); }
  if (updates.backImage !== undefined) { setClauses.push("back_image = ?"); vals.push(updates.backImage); }
  if (updates.backOverlay !== undefined) { setClauses.push("back_overlay = ?"); vals.push(updates.backOverlay); }
  if (updates.frontAdminItems !== undefined) { setClauses.push("front_admin_items = ?"); vals.push(JSON.stringify(updates.frontAdminItems)); }
  if (updates.backAdminItems !== undefined) { setClauses.push("back_admin_items = ?"); vals.push(JSON.stringify(updates.backAdminItems)); }
  if (setClauses.length > 0) {
    db.prepare(`UPDATE design_colors SET ${setClauses.join(", ")} WHERE id = ?`).run(...vals, colorId);
  }
  return getDesign(galleryId, designId);
}

export function deleteDesignColor(galleryId: string, designId: string, colorId: string): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM design_colors WHERE id = ? AND design_id = ?")
    .run(colorId, designId);
  return result.changes > 0;
}
