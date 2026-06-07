import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(`
    SELECT
      o.id, o.stripe_session_id, o.customer_name, o.customer_email,
      o.address, o.items_json, o.amount_total, o.status, o.production_status, o.created_at,
      c.address AS customer_address_json, c.phone AS customer_phone
    FROM orders o
    LEFT JOIN customers c ON c.email = o.customer_email
    ORDER BY o.created_at DESC
  `);

  const orders = result.rows.map((r) => {
    let resolvedAddress = r.address as string;
    if (!resolvedAddress && r.customer_address_json) {
      try {
        const a = JSON.parse(r.customer_address_json as string) as { houseNo?: string; flat?: string; city?: string; state?: string };
        const parts = [a.houseNo, a.flat, a.city, a.state].filter(Boolean);
        resolvedAddress = parts.join(", ");
      } catch { /* ignore */ }
    }
    return {
      id: r.id,
      stripe_session_id: r.stripe_session_id,
      customer_name: r.customer_name,
      customer_email: r.customer_email,
      address: resolvedAddress,
      customer_phone: r.customer_phone ?? "",
      items_json: r.items_json,
      amount_total: r.amount_total,
      status: r.status,
      production_status: r.production_status,
      created_at: r.created_at,
    };
  });

  return NextResponse.json({ orders });
}
