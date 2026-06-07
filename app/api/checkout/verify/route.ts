import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const db = await getDb();
    const meta = session.metadata ?? {};

    if (session.payment_status === "paid") {
      const orderId = meta.order_id;

      if (orderId) {
        await db.execute({
          sql: "UPDATE orders SET status = 'paid', stripe_session_id = ? WHERE id = ? AND status = 'pending_payment'",
          args: [sessionId, orderId],
        });
      } else {
        const existing = await db.execute({
          sql: "SELECT id FROM orders WHERE stripe_session_id = ?",
          args: [sessionId],
        });
        if (!existing.rows[0]) {
          await db.execute({
            sql: `INSERT INTO orders (id, stripe_session_id, customer_id, customer_name, customer_email, address, items_json, amount_total, status, production_status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'pending', ?)`,
            args: [
              randomUUID(),
              sessionId,
              meta.customer_id ?? "",
              meta.customer_name ?? session.customer_email ?? "Guest",
              session.customer_email ?? "",
              meta.address ?? "",
              meta.items_json ?? "[]",
              (session.amount_total ?? 0) / 100,
              new Date().toISOString(),
            ],
          });
        }
      }
    }

    const orderResult = await db.execute({
      sql: "SELECT * FROM orders WHERE stripe_session_id = ? OR id = ?",
      args: [sessionId, meta.order_id ?? ""],
    });
    const order = orderResult.rows[0];

    return NextResponse.json({
      status: session.payment_status,
      customerName: order?.customer_name ?? meta.customer_name ?? "",
      customerEmail: session.customer_email ?? "",
      amountTotal: order?.amount_total ?? (session.amount_total ?? 0) / 100,
      items: order?.items_json ? JSON.parse(order.items_json as string) : [],
    });
  } catch (err) {
    console.error("Verify error", err);
    return NextResponse.json({ error: "Failed to verify" }, { status: 500 });
  }
}
