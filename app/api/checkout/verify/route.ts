import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { createSinaliteOrder, type SinaliteOrderItem } from "@/lib/sinalite";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

type OrderCartItem = {
  name: string; sinaliteId?: string; sinaliteOptions?: Record<string, string>;
  doubleSided?: boolean; thumb?: string; frontPreview?: string; backPreview?: string;
  frontFileUrl?: string; backFileUrl?: string;
};
type ShippingDetails = {
  firstName: string; lastName: string; email: string;
  addr: string; addr2: string; city: string; state: string; zip: string; country: string; phone: string;
  method: string;
};

// Places the print order with Sinalite the first time a Stripe session flips to
// paid — guarded by sinalite_order_ref so a page refresh never double-submits.
async function placeSinaliteOrderOnce(db: Awaited<ReturnType<typeof getDb>>, orderId: string) {
  const result = await db.execute({ sql: "SELECT * FROM orders WHERE id = ?", args: [orderId] });
  const row = result.rows[0];
  if (!row || (row.sinalite_order_ref as string)) return;

  const cartItems = JSON.parse((row.items_json as string) || "[]") as OrderCartItem[];
  const shippable = cartItems.filter((i) => i.sinaliteId);
  if (!shippable.length) return;

  let shipping: ShippingDetails | null = null;
  try { shipping = JSON.parse((row.shipping_json as string) || "null"); } catch { /* ignore */ }
  if (!shipping) return;

  const items: SinaliteOrderItem[] = shippable.map((i) => ({
    productId: Number(i.sinaliteId),
    options: i.sinaliteOptions ?? {},
    files: [
      { type: "front", url: i.frontFileUrl || "https://weprintnpack.ca/" },
      ...(i.doubleSided ? [{ type: "back" as const, url: i.backFileUrl || "https://weprintnpack.ca/" }] : []),
    ],
  }));

  console.log("[checkout/verify] placing Sinalite order for", orderId, "with body:", JSON.stringify({ items, shipping }, null, 2));

  try {
    const { raw } = await createSinaliteOrder(
      items,
      shipping,
      `Order ${orderId} — ${row.customer_name as string}`
    );
    await db.execute({
      sql: "UPDATE orders SET sinalite_order_ref = ? WHERE id = ?",
      args: [JSON.stringify(raw), orderId],
    });
  } catch (err) {
    console.error("Sinalite order creation failed for order", orderId, err);
  }
}

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
        await placeSinaliteOrderOnce(db, orderId);
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
