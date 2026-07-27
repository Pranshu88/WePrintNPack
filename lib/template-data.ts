import getDb from "./db";
import type { Client, Row, InValue } from "@libsql/client";

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
  rotation?: number;
  radii?: { tl: number; tr: number; br: number; bl: number };
  frameItem?: boolean;
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

export type SinaliteSelectedOption = { id: number; group: string; name: string };

export type GalleryTemplate = {
  id: string;
  productSlug: string;
  name: string;
  previewImage: string;
  designs: DesignTemplateItem[];
  createdAt: string;
  price?: string;
  specs?: string[];
  description?: string;
  visible: boolean;
  sinaliteId?: string;
  sinaliteSku?: string;
  sinaliteOptions?: SinaliteSelectedOption[];
};

export type PaginatedTemplates = {
  templates: GalleryTemplate[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

// ─── Internal row shapes ──────────────────────────────────────────────────────

type GtRow    = { id: string; product_slug: string; name: string; preview_image: string; created_at: string; price?: string | null; specs_json?: string | null; visible?: number | null; description?: string | null; sinalite_id?: string | null; sinalite_sku?: string | null; sinalite_options_json?: string | null };
type DesignRow = { id: string; gallery_id: string; name: string; color_hex: string | null; color_name: string | null; front_image: string; front_overlay: string | null; back_image: string | null; back_overlay: string | null; front_admin_items: string | null; back_admin_items: string | null; front_bg_color: string | null; back_bg_color: string | null; created_at: string };
type ColorRow  = { id: string; design_id: string; color_hex: string; color_name: string; front_image: string; front_overlay: string | null; back_image: string | null; back_overlay: string | null; front_admin_items: string | null; back_admin_items: string | null; created_at: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }

function s(v: unknown): string | null { return v == null ? null : String(v); }
function n(v: unknown): number { return Number(v) || 0; }

function toGtRow(r: Row): GtRow {
  return { id: s(r.id)!, product_slug: s(r.product_slug)!, name: s(r.name)!, preview_image: s(r.preview_image)!, created_at: s(r.created_at)!, price: s(r.price), specs_json: s(r.specs_json), visible: r.visible == null ? 1 : n(r.visible), description: s(r.description), sinalite_id: s(r.sinalite_id), sinalite_sku: s(r.sinalite_sku), sinalite_options_json: s(r.sinalite_options_json) };
}

function toDesignRow(r: Row): DesignRow {
  return { id: s(r.id)!, gallery_id: s(r.gallery_id)!, name: s(r.name)!, color_hex: s(r.color_hex), color_name: s(r.color_name), front_image: s(r.front_image)!, front_overlay: s(r.front_overlay), back_image: s(r.back_image), back_overlay: s(r.back_overlay), front_admin_items: s(r.front_admin_items), back_admin_items: s(r.back_admin_items), front_bg_color: s(r.front_bg_color), back_bg_color: s(r.back_bg_color), created_at: s(r.created_at)! };
}

function toColorRow(r: Row): ColorRow {
  return { id: s(r.id)!, design_id: s(r.design_id)!, color_hex: s(r.color_hex)!, color_name: s(r.color_name)!, front_image: s(r.front_image)!, front_overlay: s(r.front_overlay), back_image: s(r.back_image), back_overlay: s(r.back_overlay), front_admin_items: s(r.front_admin_items), back_admin_items: s(r.back_admin_items), created_at: s(r.created_at)! };
}

function inList(ids: string[]) { return ids.map(() => "?").join(","); }

function parseItems(json: string | null | undefined): SerializableItem[] | undefined {
  if (!json) return undefined;
  try { const a = JSON.parse(json) as unknown; return Array.isArray(a) && a.length > 0 ? (a as SerializableItem[]) : undefined; } catch { return undefined; }
}

function rowToColor(c: ColorRow): DesignColorVariant {
  const v: DesignColorVariant = { id: c.id, colorHex: c.color_hex, colorName: c.color_name, frontImage: c.front_image, createdAt: c.created_at };
  if (c.front_overlay) v.frontOverlay = c.front_overlay;
  if (c.back_image) v.backImage = c.back_image;
  if (c.back_overlay) v.backOverlay = c.back_overlay;
  const fai = parseItems(c.front_admin_items); if (fai) v.frontAdminItems = fai;
  const bai = parseItems(c.back_admin_items);  if (bai) v.backAdminItems = bai;
  return v;
}

function rowToDesign(d: DesignRow, colors: ColorRow[]): DesignTemplateItem {
  const item: DesignTemplateItem = { id: d.id, name: d.name, frontImage: d.front_image, createdAt: d.created_at };
  if (d.color_hex) item.colorHex = d.color_hex;
  if (d.color_name) item.colorName = d.color_name;
  if (d.front_overlay) item.frontOverlay = d.front_overlay;
  if (d.back_image) item.backImage = d.back_image;
  if (d.back_overlay) item.backOverlay = d.back_overlay;
  if (d.front_bg_color) item.frontBgColor = d.front_bg_color;
  if (d.back_bg_color) item.backBgColor = d.back_bg_color;
  const fai = parseItems(d.front_admin_items); if (fai) item.frontAdminItems = fai;
  const bai = parseItems(d.back_admin_items);  if (bai) item.backAdminItems = bai;
  const variants = colors.map(rowToColor); if (variants.length > 0) item.colorVariants = variants;
  return item;
}

function assembleTemplates(rows: GtRow[], allDesigns: DesignRow[], allColors: ColorRow[]): GalleryTemplate[] {
  const colorsByDesign = new Map<string, ColorRow[]>();
  for (const c of allColors) { const arr = colorsByDesign.get(c.design_id) ?? []; arr.push(c); colorsByDesign.set(c.design_id, arr); }
  const designsByGallery = new Map<string, DesignRow[]>();
  for (const d of allDesigns) { const arr = designsByGallery.get(d.gallery_id) ?? []; arr.push(d); designsByGallery.set(d.gallery_id, arr); }
  return rows.map((r) => {
    const designs = (designsByGallery.get(r.id) ?? []).map((d) => rowToDesign(d, colorsByDesign.get(d.id) ?? []));
    const t: GalleryTemplate = { id: r.id, productSlug: r.product_slug, name: r.name, previewImage: r.preview_image, createdAt: r.created_at, designs, visible: r.visible !== 0 };
    if (r.price) t.price = r.price;
    if (r.specs_json) { try { t.specs = JSON.parse(r.specs_json) as string[]; } catch { /* ignore */ } }
    if (r.description) t.description = r.description;
    if (r.sinalite_id) t.sinaliteId = r.sinalite_id;
    if (r.sinalite_sku) t.sinaliteSku = r.sinalite_sku;
    if (r.sinalite_options_json) { try { t.sinaliteOptions = JSON.parse(r.sinalite_options_json) as SinaliteSelectedOption[]; } catch { /* ignore */ } }
    return t;
  });
}

async function fetchDesignsAndColors(client: Client, galleryIds: string[]): Promise<{ designs: DesignRow[]; colors: ColorRow[] }> {
  if (galleryIds.length === 0) return { designs: [], colors: [] };
  const dRes = await client.execute({ sql: `SELECT * FROM designs WHERE gallery_id IN (${inList(galleryIds)}) ORDER BY created_at ASC`, args: galleryIds });
  const designs = dRes.rows.map(toDesignRow);
  const dIds = designs.map((d) => d.id);
  const colors = dIds.length > 0
    ? (await client.execute({ sql: `SELECT * FROM design_colors WHERE design_id IN (${inList(dIds)}) ORDER BY created_at ASC`, args: dIds })).rows.map(toColorRow)
    : [];
  return { designs, colors };
}

// ─── Public API (all async) ───────────────────────────────────────────────────

// Short-lived cache — each call does 3 round-trips to the remote Turso DB
// (gallery_templates, designs, design_colors), and the homepage/product-listing
// pages fire this once per product (20+ calls). A brief TTL turns repeated page
// views into cache hits instead of re-paying that latency every time.
const GALLERY_TEMPLATES_CACHE_TTL_MS = 20_000;
const galleryTemplatesCache = new Map<string, { at: number; templates: GalleryTemplate[] }>();

// Exposed so callers that write directly to gallery_templates outside the normal
// create/update/delete functions here (e.g. the Sinalite live-sync) can invalidate
// the cache for a slug instead of waiting out the TTL.
export function invalidateGalleryTemplatesCache(productSlug: string): void {
  galleryTemplatesCache.delete(`${productSlug}::true`);
  galleryTemplatesCache.delete(`${productSlug}::false`);
}

// Fetches visible templates for MANY product slugs in exactly 3 round-trips total
// (gallery_templates, designs, design_colors — each with a single IN (...) clause),
// instead of 3 round-trips PER slug. Built for the homepage/listing carousels that
// need templates across ~20-50 slugs at once; a single slow remote-DB round-trip
// beats dozens of them even under concurrency limits.
export async function getGalleryTemplatesForSlugs(productSlugs: string[]): Promise<Record<string, GalleryTemplate[]>> {
  const uniqueSlugs = Array.from(new Set(productSlugs));
  const uncached: string[] = [];
  const result: Record<string, GalleryTemplate[]> = {};
  for (const slug of uniqueSlugs) {
    const cached = galleryTemplatesCache.get(`${slug}::false`);
    if (cached && Date.now() - cached.at < GALLERY_TEMPLATES_CACHE_TTL_MS) {
      result[slug] = cached.templates;
    } else {
      uncached.push(slug);
    }
  }
  if (uncached.length === 0) return result;

  const db = await getDb();
  const rows = (await db.execute({
    sql: `SELECT * FROM gallery_templates WHERE product_slug IN (${inList(uncached)}) AND visible != 0 ORDER BY created_at DESC`,
    args: uncached,
  })).rows.map(toGtRow);

  const bySlug = new Map<string, GtRow[]>();
  for (const r of rows) { const arr = bySlug.get(r.product_slug) ?? []; arr.push(r); bySlug.set(r.product_slug, arr); }

  const { designs, colors } = await fetchDesignsAndColors(db, rows.map((r) => r.id));

  for (const slug of uncached) {
    const slugRows = bySlug.get(slug) ?? [];
    const templates = assembleTemplates(slugRows, designs, colors);
    galleryTemplatesCache.set(`${slug}::false`, { at: Date.now(), templates });
    result[slug] = templates;
  }
  return result;
}

export async function getGalleryTemplates(productSlug: string, includeHidden = false): Promise<GalleryTemplate[]> {
  const cacheKey = `${productSlug}::${includeHidden}`;
  const cached = galleryTemplatesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < GALLERY_TEMPLATES_CACHE_TTL_MS) {
    return cached.templates;
  }

  const db = await getDb();
  const sql = includeHidden
    ? "SELECT * FROM gallery_templates WHERE product_slug = ? ORDER BY created_at DESC"
    : "SELECT * FROM gallery_templates WHERE product_slug = ? AND visible != 0 ORDER BY created_at DESC";
  const rows = (await db.execute({ sql, args: [productSlug] })).rows.map(toGtRow);
  if (rows.length === 0) {
    galleryTemplatesCache.set(cacheKey, { at: Date.now(), templates: [] });
    return [];
  }
  const { designs, colors } = await fetchDesignsAndColors(db, rows.map((r) => r.id));
  const templates = assembleTemplates(rows, designs, colors);
  galleryTemplatesCache.set(cacheKey, { at: Date.now(), templates });
  return templates;
}

export async function getGalleryTemplatesPaginated(productSlug: string, page: number, limit: number, includeHidden = false): Promise<PaginatedTemplates> {
  const db = await getDb();
  const offset = (page - 1) * limit;
  const visibleClause = includeHidden ? "" : " AND visible != 0";
  const cntRes = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM gallery_templates WHERE product_slug = ?${visibleClause}`, args: [productSlug] });
  const cnt = n(cntRes.rows[0]?.cnt);
  const rows = (await db.execute({ sql: `SELECT * FROM gallery_templates WHERE product_slug = ?${visibleClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, args: [productSlug, limit, offset] })).rows.map(toGtRow);
  const totalPages = Math.max(1, Math.ceil(cnt / limit));
  if (rows.length === 0) return { templates: [], total: cnt, page, totalPages, limit };
  const { designs, colors } = await fetchDesignsAndColors(db, rows.map((r) => r.id));
  return { templates: assembleTemplates(rows, designs, colors), total: cnt, page, totalPages, limit };
}

export async function getGalleryTemplate(id: string): Promise<GalleryTemplate | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM gallery_templates WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return undefined;
  const row = toGtRow(res.rows[0]);
  const { designs, colors } = await fetchDesignsAndColors(db, [id]);
  return assembleTemplates([row], designs, colors)[0];
}

export async function createGalleryTemplate(productSlug: string, name: string, previewImage: string, description?: string, sinalite?: { id: string; sku?: string }): Promise<GalleryTemplate> {
  const db = await getDb();
  const id = uid(), createdAt = new Date().toISOString();
  await db.execute({ sql: "INSERT INTO gallery_templates (id, product_slug, name, preview_image, created_at, description, sinalite_id, sinalite_sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: [id, productSlug, name.trim(), previewImage, createdAt, description?.trim() || null, sinalite?.id ?? null, sinalite?.sku ?? null] });
  const t: GalleryTemplate = { id, productSlug, name: name.trim(), previewImage, designs: [], createdAt, visible: true };
  if (description?.trim()) t.description = description.trim();
  if (sinalite?.id) t.sinaliteId = sinalite.id;
  if (sinalite?.sku) t.sinaliteSku = sinalite.sku;
  return t;
}

export async function updateGalleryTemplate(id: string, updates: { name?: string; previewImage?: string; price?: string; specs?: string[]; description?: string; visible?: boolean; sinaliteOptions?: SinaliteSelectedOption[] }): Promise<GalleryTemplate | undefined> {
  const db = await getDb();
  if (updates.name !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET name = ? WHERE id = ?", args: [updates.name.trim(), id] });
  if (updates.previewImage !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET preview_image = ? WHERE id = ?", args: [updates.previewImage, id] });
  if (updates.price !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET price = ? WHERE id = ?", args: [updates.price, id] });
  if (updates.specs !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET specs_json = ? WHERE id = ?", args: [JSON.stringify(updates.specs), id] });
  if (updates.description !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET description = ? WHERE id = ?", args: [updates.description.trim() || null, id] });
  if (updates.visible !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET visible = ? WHERE id = ?", args: [updates.visible ? 1 : 0, id] });
  if (updates.sinaliteOptions !== undefined) await db.execute({ sql: "UPDATE gallery_templates SET sinalite_options_json = ? WHERE id = ?", args: [JSON.stringify(updates.sinaliteOptions), id] });
  return getGalleryTemplate(id);
}

export async function deleteGalleryTemplate(id: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM gallery_templates WHERE id = ?", args: [id] });
  return res.rowsAffected > 0;
}

export async function addDesign(galleryId: string, input: { name: string; colorHex?: string; colorName?: string; frontImage: string; frontOverlay?: string; backImage?: string; backOverlay?: string; frontAdminItems?: SerializableItem[]; backAdminItems?: SerializableItem[]; frontBgColor?: string; backBgColor?: string }): Promise<GalleryTemplate | undefined> {
  const db = await getDb();
  const check = await db.execute({ sql: "SELECT id FROM gallery_templates WHERE id = ?", args: [galleryId] });
  if (check.rows.length === 0) return undefined;
  const id = uid();
  await db.execute({ sql: `INSERT INTO designs (id, gallery_id, name, color_hex, color_name, front_image, front_overlay, back_image, back_overlay, front_admin_items, back_admin_items, front_bg_color, back_bg_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, galleryId, input.name.trim(), input.colorHex ?? null, input.colorName ?? null, input.frontImage, input.frontOverlay ?? null, input.backImage ?? null, input.backOverlay ?? null, input.frontAdminItems ? JSON.stringify(input.frontAdminItems) : null, input.backAdminItems ? JSON.stringify(input.backAdminItems) : null, input.frontBgColor ?? null, input.backBgColor ?? null, new Date().toISOString()] });
  return getGalleryTemplate(galleryId);
}

export async function updateDesign(galleryId: string, designId: string, updates: { name?: string; colorHex?: string; colorName?: string; frontImage?: string; frontOverlay?: string; backImage?: string; backOverlay?: string; frontAdminItems?: SerializableItem[]; backAdminItems?: SerializableItem[]; frontBgColor?: string; backBgColor?: string }): Promise<GalleryTemplate | undefined> {
  const db = await getDb();
  const check = await db.execute({ sql: "SELECT id FROM designs WHERE id = ? AND gallery_id = ?", args: [designId, galleryId] });
  if (check.rows.length === 0) return undefined;
  const setClauses: string[] = [], vals: InValue[] = [];
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
  if (setClauses.length > 0) await db.execute({ sql: `UPDATE designs SET ${setClauses.join(", ")} WHERE id = ?`, args: [...vals, designId] });
  return getGalleryTemplate(galleryId);
}

export async function deleteDesign(galleryId: string, designId: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM designs WHERE id = ? AND gallery_id = ?", args: [designId, galleryId] });
  return res.rowsAffected > 0;
}

export async function getDesign(galleryId: string, designId: string): Promise<DesignTemplateItem | undefined> {
  const db = await getDb();
  const dRes = await db.execute({ sql: "SELECT * FROM designs WHERE id = ? AND gallery_id = ?", args: [designId, galleryId] });
  if (dRes.rows.length === 0) return undefined;
  const d = toDesignRow(dRes.rows[0]);
  const cRes = await db.execute({ sql: "SELECT * FROM design_colors WHERE design_id = ? ORDER BY created_at ASC", args: [designId] });
  return rowToDesign(d, cRes.rows.map(toColorRow));
}

export async function addDesignColor(galleryId: string, designId: string, input: { colorHex: string; colorName: string; frontImage: string; frontOverlay?: string; backImage?: string; backOverlay?: string; frontAdminItems?: SerializableItem[]; backAdminItems?: SerializableItem[] }): Promise<DesignTemplateItem | undefined> {
  const db = await getDb();
  const check = await db.execute({ sql: "SELECT id FROM designs WHERE id = ? AND gallery_id = ?", args: [designId, galleryId] });
  if (check.rows.length === 0) return undefined;
  const id = uid();
  await db.execute({ sql: `INSERT INTO design_colors (id, design_id, color_hex, color_name, front_image, front_overlay, back_image, back_overlay, front_admin_items, back_admin_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, designId, input.colorHex, input.colorName.trim(), input.frontImage, input.frontOverlay ?? null, input.backImage ?? null, input.backOverlay ?? null, input.frontAdminItems ? JSON.stringify(input.frontAdminItems) : null, input.backAdminItems ? JSON.stringify(input.backAdminItems) : null, new Date().toISOString()] });
  return getDesign(galleryId, designId);
}

export async function updateDesignColor(galleryId: string, designId: string, colorId: string, updates: { colorHex?: string; colorName?: string; frontImage?: string; frontOverlay?: string; backImage?: string; backOverlay?: string; frontAdminItems?: SerializableItem[]; backAdminItems?: SerializableItem[] }): Promise<DesignTemplateItem | undefined> {
  const db = await getDb();
  const check = await db.execute({ sql: "SELECT id FROM design_colors WHERE id = ? AND design_id = ?", args: [colorId, designId] });
  if (check.rows.length === 0) return undefined;
  const setClauses: string[] = [], vals: InValue[] = [];
  if (updates.colorHex !== undefined) { setClauses.push("color_hex = ?"); vals.push(updates.colorHex); }
  if (updates.colorName !== undefined) { setClauses.push("color_name = ?"); vals.push(updates.colorName); }
  if (updates.frontImage !== undefined) { setClauses.push("front_image = ?"); vals.push(updates.frontImage); }
  if (updates.frontOverlay !== undefined) { setClauses.push("front_overlay = ?"); vals.push(updates.frontOverlay); }
  if (updates.backImage !== undefined) { setClauses.push("back_image = ?"); vals.push(updates.backImage); }
  if (updates.backOverlay !== undefined) { setClauses.push("back_overlay = ?"); vals.push(updates.backOverlay); }
  if (updates.frontAdminItems !== undefined) { setClauses.push("front_admin_items = ?"); vals.push(JSON.stringify(updates.frontAdminItems)); }
  if (updates.backAdminItems !== undefined) { setClauses.push("back_admin_items = ?"); vals.push(JSON.stringify(updates.backAdminItems)); }
  if (setClauses.length > 0) await db.execute({ sql: `UPDATE design_colors SET ${setClauses.join(", ")} WHERE id = ?`, args: [...vals, colorId] });
  return getDesign(galleryId, designId);
}

export async function deleteDesignColor(galleryId: string, designId: string, colorId: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM design_colors WHERE id = ? AND design_id = ?", args: [colorId, designId] });
  return res.rowsAffected > 0;
}
