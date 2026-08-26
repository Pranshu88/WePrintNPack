import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = req.nextUrl.searchParams.get("email");

  const db = await getDb();
  const { rows } = await db.execute({
    sql: `SELECT id, stripe_session_id, customer_name, customer_email, address, items_json,
                 amount_total, status, production_status, shipping_json, created_at
          FROM orders WHERE id = ?`,
    args: [id],
  });

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Non-admin lookups (email query param present) may only see their own order.
  if (email && (row.customer_email as string).toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let shipping: Record<string, unknown> | null = null;
  try {
    shipping = row.shipping_json ? JSON.parse(row.shipping_json as string) : null;
  } catch {
    shipping = null;
  }

  const order = {
    id: row.id,
    stripeSessionId: row.stripe_session_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    address: row.address,
    items: JSON.parse(row.items_json as string),
    amountTotal: row.amount_total,
    status: row.status,
    productionStatus: row.production_status,
    shipping,
    createdAt: row.created_at,
  };

  return NextResponse.json({ order });
}
