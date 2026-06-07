import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    orderId: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    productName: string;
    stars: number;
    comment: string;
  };

  const { orderId, customerId, customerEmail, customerName, productName, stars, comment } = body;

  if (!orderId || !customerEmail || !productName || !stars) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Stars must be 1-5" }, { status: 400 });
  }

  const db = await getDb();

  // Verify order belongs to this customer
  const { rows } = await db.execute({
    sql: `SELECT id FROM orders WHERE id = ? AND customer_email = ?`,
    args: [orderId, customerEmail],
  });
  if (rows.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Prevent duplicate review for same order
  const { rows: existing } = await db.execute({
    sql: `SELECT id FROM reviews WHERE order_id = ? AND customer_email = ?`,
    args: [orderId, customerEmail],
  });
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  await db.execute({
    sql: `INSERT INTO reviews (id, order_id, customer_id, customer_email, customer_name, product_name, stars, comment, approved, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      crypto.randomUUID(),
      orderId,
      customerId ?? "",
      customerEmail,
      customerName,
      productName,
      stars,
      comment ?? "",
      new Date().toISOString(),
    ],
  });

  return NextResponse.json({ ok: true });
}
