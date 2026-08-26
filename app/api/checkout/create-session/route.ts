import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import getDb from "@/lib/db";
import { randomUUID } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

type CartItem = {
  id: string; name: string; qty: number; pricePerUnit: number; total: number; doubleSided?: boolean;
  sinaliteId?: string; sinaliteOptions?: Record<string, string>; sinaliteOptionLabels?: Record<string, string>;
  thumb?: string; frontPreview?: string; backPreview?: string;
  frontFileUrl?: string; backFileUrl?: string;
};
type ShippingDetails = {
  firstName: string; lastName: string; email: string;
  addr: string; addr2: string; city: string; state: string; zip: string; country: string; phone: string;
  method: string;
  cost?: number;
};

export async function POST(req: NextRequest) {
  try {
    const { items, customerName, customerEmail, address, customerId, shipping } = await req.json() as {
      items: CartItem[];
      customerName: string;
      customerEmail: string;
      address: string;
      customerId?: string;
      shipping?: ShippingDetails;
    };

    console.log("[checkout/create-session] request body:", JSON.stringify({ items, customerName, customerEmail, address, customerId, shipping }, null, 2));

    if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const deduped = new Map<string, CartItem>();
    for (const item of items) {
      const key = item.id;
      if (deduped.has(key)) {
        const existing = deduped.get(key)!;
        deduped.set(key, { ...existing, qty: existing.qty + item.qty, total: existing.total + item.total });
      } else {
        deduped.set(key, { ...item });
      }
    }
    const cleanItems = Array.from(deduped.values());

    const shippingCost = shipping?.cost ?? 0;
    const amountTotal = cleanItems.reduce((s, i) => s + i.total, 0) + shippingCost;

    const orderId = randomUUID();
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO orders (id, stripe_session_id, customer_id, customer_name, customer_email, address, items_json, amount_total, status, production_status, shipping_json, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', ?, ?)`,
      args: [orderId, customerId ?? "", customerName, customerEmail, address, JSON.stringify(cleanItems), amountTotal, shipping ? JSON.stringify(shipping) : "", new Date().toISOString()],
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        ...cleanItems.map((item) => ({
          price_data: {
            currency: "cad",
            product_data: {
              name: item.name,
              description: `${item.qty} ${item.qty === 1 ? "copy" : "copies"}${item.doubleSided ? " · Double-sided" : ""}`,
            },
            unit_amount: Math.round(item.total * 100),
          },
          quantity: 1,
        })),
        ...(shippingCost > 0 ? [{
          price_data: {
            currency: "cad",
            product_data: {
              name: `Shipping${shipping?.method ? ` (${shipping.method})` : ""}`,
            },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        }] : []),
      ],
      customer_email: customerEmail || undefined,
      metadata: { order_id: orderId },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
