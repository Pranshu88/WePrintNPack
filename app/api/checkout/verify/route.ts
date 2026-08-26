import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";
import { createSinaliteOrder, type SinaliteOrderItem } from "@/lib/sinalite";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

type OrderCartItem = {
  name: string; sinaliteId?: string; sinaliteOptions?: Record<string, string>;
  doubleSided?: boolean; thumb?: string; frontPreview?: string; backPreview?: string;
  frontFileUrl?: string; backFileUrl?: string; qty?: number; pricePerUnit?: number; total?: number;
};
type ShippingDetails = {
  firstName: string; lastName: string; email: string;
  addr: string; addr2: string; city: string; state: string; zip: string; country: string; phone: string;
  method: string; cost?: number;
};

// Sends the paid-order invoice to the customer's inbox — called once, right after
// an order's status first flips to 'paid'.
async function sendInvoiceEmail(orderId: string, customerName: string, customerEmail: string, items: OrderCartItem[], amountTotal: number, shipping: ShippingDetails | null) {
  if (!customerEmail) return;

  const itemsTotal = items.reduce((s, i) => s + (i.total ?? (i.pricePerUnit ?? 0) * (i.qty ?? 0)), 0);
  const shippingCost = shipping?.cost ?? Math.max(0, amountTotal - itemsTotal);
  const date = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const rowsHtml = items.map((i) => {
    const unit = i.pricePerUnit ?? 0;
    const total = i.total ?? unit * (i.qty ?? 0);
    return `
      <tr>
        <td style="padding:10px 4px;border-bottom:1px solid #f3f4f6;font-weight:600">${i.name}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #f3f4f6;text-align:center;color:#6b7280">${i.qty ?? ""}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280">$${unit.toFixed(2)}</td>
        <td style="padding:10px 4px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700">$${total.toFixed(2)}</td>
      </tr>`;
  }).join("");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `"We Print N Pack" <${process.env.GMAIL_USER}>`,
      to: customerEmail,
      subject: `Your invoice for order #${orderId.slice(0, 12).toUpperCase()} — We Print N Pack`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#7c3aed;margin-bottom:0">We Print N Pack</h2>
          <p style="color:#6b7280;margin-top:2px">Invoice · ${date}</p>
          <p style="font-size:15px">Hi ${customerName}, thanks for your order! Here's your invoice.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead>
              <tr style="border-bottom:1.5px solid #e5e7eb;text-align:left">
                <th style="padding:8px 4px;font-size:12px;color:#9ca3af">ITEM</th>
                <th style="padding:8px 4px;font-size:12px;color:#9ca3af;text-align:center">QTY</th>
                <th style="padding:8px 4px;font-size:12px;color:#9ca3af;text-align:right">UNIT PRICE</th>
                <th style="padding:8px 4px;font-size:12px;color:#9ca3af;text-align:right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <table style="width:100%;margin-top:12px">
            <tr><td style="text-align:right;color:#6b7280;padding:4px 0">Subtotal</td><td style="text-align:right;width:100px;padding:4px 0">$${itemsTotal.toFixed(2)}</td></tr>
            ${shippingCost > 0 ? `<tr><td style="text-align:right;color:#6b7280;padding:4px 0">Shipping${shipping?.method ? ` (${shipping.method})` : ""}</td><td style="text-align:right;padding:4px 0">$${shippingCost.toFixed(2)}</td></tr>` : ""}
            <tr><td style="text-align:right;font-weight:800;font-size:17px;border-top:2px solid #111827;padding-top:10px">Total</td><td style="text-align:right;font-weight:800;font-size:17px;border-top:2px solid #111827;padding-top:10px">$${amountTotal.toFixed(2)} CAD</td></tr>
          </table>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Order ID: ${orderId}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Invoice email failed for order", orderId, err);
  }
}

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

      let justPaidId: string | null = null;

      if (orderId) {
        const updateResult = await db.execute({
          sql: "UPDATE orders SET status = 'paid', stripe_session_id = ? WHERE id = ? AND status = 'pending_payment'",
          args: [sessionId, orderId],
        });
        if (updateResult.rowsAffected > 0) justPaidId = orderId;
        await placeSinaliteOrderOnce(db, orderId);
      } else {
        const existing = await db.execute({
          sql: "SELECT id FROM orders WHERE stripe_session_id = ?",
          args: [sessionId],
        });
        if (!existing.rows[0]) {
          const newOrderId = randomUUID();
          await db.execute({
            sql: `INSERT INTO orders (id, stripe_session_id, customer_id, customer_name, customer_email, address, items_json, amount_total, status, production_status, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'pending', ?)`,
            args: [
              newOrderId,
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
          justPaidId = newOrderId;
        }
      }

      if (justPaidId) {
        const paidResult = await db.execute({ sql: "SELECT * FROM orders WHERE id = ?", args: [justPaidId] });
        const paidRow = paidResult.rows[0];
        if (paidRow) {
          let shipping: ShippingDetails | null = null;
          try { shipping = JSON.parse((paidRow.shipping_json as string) || "null"); } catch { /* ignore */ }
          const items = JSON.parse((paidRow.items_json as string) || "[]") as OrderCartItem[];
          await sendInvoiceEmail(justPaidId, paidRow.customer_name as string, paidRow.customer_email as string, items, paidRow.amount_total as number, shipping);
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
