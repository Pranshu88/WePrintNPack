import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/customer-session";

function getCustomerId(req: NextRequest): string | null {
  return verifyCustomerSessionToken(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const customerId = getCustomerId(req);
  if (!customerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT id, name, product_name, product_path, thumbnail, updated_at FROM saved_designs WHERE customer_id = ? ORDER BY updated_at DESC",
    args: [customerId],
  });

  return NextResponse.json({
    designs: res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      productName: r.product_name,
      productPath: r.product_path,
      thumbnail: r.thumbnail,
      updatedAt: r.updated_at,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const customerId = getCustomerId(req);
  if (!customerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json() as {
    id?: string;
    name?: string;
    productSlug?: string;
    productName?: string;
    productPath?: string;
    sizeLabel?: string;
    frontItems?: unknown[];
    backItems?: unknown[];
    frontTemplate?: unknown;
    backTemplate?: unknown;
    frontBgColor?: string;
    backBgColor?: string;
    frontBgSvg?: string;
    backBgSvg?: string;
    thumbnail?: string;
  };

  const {
    id, name, productSlug, productName, productPath, sizeLabel,
    frontItems, backItems, frontTemplate, backTemplate,
    frontBgColor, backBgColor, frontBgSvg, backBgSvg, thumbnail,
  } = body ?? {};

  if (!productSlug || !productName || !productPath) {
    return NextResponse.json({ error: "Missing product info" }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const safeName = (name ?? "").trim() || "Untitled Design";

  if (id) {
    const existing = await db.execute({ sql: "SELECT customer_id FROM saved_designs WHERE id = ?", args: [id] });
    const row = existing.rows[0];
    if (!row || String(row.customer_id) !== customerId) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }
    await db.execute({
      sql: `UPDATE saved_designs SET name=?, product_slug=?, product_name=?, product_path=?, size_label=?,
            front_items=?, back_items=?, front_template=?, back_template=?, front_bg_color=?, back_bg_color=?,
            front_bg_svg=?, back_bg_svg=?, thumbnail=?, updated_at=? WHERE id=?`,
      args: [
        safeName, productSlug, productName, productPath, sizeLabel ?? null,
        JSON.stringify(frontItems ?? []), JSON.stringify(backItems ?? []),
        frontTemplate ? JSON.stringify(frontTemplate) : null,
        backTemplate ? JSON.stringify(backTemplate) : null,
        frontBgColor ?? null, backBgColor ?? null, frontBgSvg ?? null, backBgSvg ?? null,
        thumbnail ?? null, now, id,
      ],
    });
    return NextResponse.json({ ok: true, id });
  }

  const newId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO saved_designs (id, customer_id, name, product_slug, product_name, product_path, size_label,
          front_items, back_items, front_template, back_template, front_bg_color, back_bg_color,
          front_bg_svg, back_bg_svg, thumbnail, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newId, customerId, safeName, productSlug, productName, productPath, sizeLabel ?? null,
      JSON.stringify(frontItems ?? []), JSON.stringify(backItems ?? []),
      frontTemplate ? JSON.stringify(frontTemplate) : null,
      backTemplate ? JSON.stringify(backTemplate) : null,
      frontBgColor ?? null, backBgColor ?? null, frontBgSvg ?? null, backBgSvg ?? null,
      thumbnail ?? null, now, now,
    ],
  });
  return NextResponse.json({ ok: true, id: newId });
}
