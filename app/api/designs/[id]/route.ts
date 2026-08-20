import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { CUSTOMER_SESSION_COOKIE, verifyCustomerSessionToken } from "@/lib/customer-session";

function getCustomerId(req: NextRequest): string | null {
  return verifyCustomerSessionToken(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
}

function parseJson(v: unknown): unknown {
  try { return v ? JSON.parse(String(v)) : null; } catch { return null; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customerId = getCustomerId(req);
  if (!customerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM saved_designs WHERE id = ?", args: [id] });
  const row = res.rows[0];
  if (!row || String(row.customer_id) !== customerId) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    productSlug: row.product_slug,
    productName: row.product_name,
    productPath: row.product_path,
    sizeLabel: row.size_label,
    frontItems: parseJson(row.front_items) ?? [],
    backItems: parseJson(row.back_items) ?? [],
    frontTemplate: parseJson(row.front_template),
    backTemplate: parseJson(row.back_template),
    frontBgColor: row.front_bg_color,
    backBgColor: row.back_bg_color,
    frontBgSvg: row.front_bg_svg,
    backBgSvg: row.back_bg_svg,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customerId = getCustomerId(req);
  if (!customerId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const existing = await db.execute({ sql: "SELECT customer_id FROM saved_designs WHERE id = ?", args: [id] });
  const row = existing.rows[0];
  if (!row || String(row.customer_id) !== customerId) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  await db.execute({ sql: "DELETE FROM saved_designs WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
