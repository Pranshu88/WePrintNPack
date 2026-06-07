import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const db = await getDb();
  const { rows } = await db.execute({
    sql: `SELECT id, customer_name, customer_email, items_json, amount_total, status, production_status, created_at
          FROM orders WHERE customer_email = ? ORDER BY created_at DESC`,
    args: [email],
  });

  // Also fetch which order_ids this customer has already reviewed
  const { rows: reviewRows } = await db.execute({
    sql: `SELECT order_id FROM reviews WHERE customer_email = ?`,
    args: [email],
  });
  const reviewedOrderIds = new Set(reviewRows.map((r) => r.order_id as string));

  const orders = rows.map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    items: JSON.parse(r.items_json as string),
    amountTotal: r.amount_total,
    status: r.status,
    productionStatus: r.production_status,
    createdAt: r.created_at,
    reviewed: reviewedOrderIds.has(r.id as string),
  }));

  return NextResponse.json({ orders });
}
