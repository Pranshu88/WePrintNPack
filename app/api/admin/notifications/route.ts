import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();

  const [ordersRes, reviewsRes] = await Promise.all([
    db.execute(`
      SELECT id, customer_name, customer_email, items_json, amount_total, created_at
      FROM orders ORDER BY created_at DESC LIMIT 100
    `),
    db.execute(`
      SELECT id, customer_name, product_name, stars, created_at
      FROM reviews ORDER BY created_at DESC LIMIT 100
    `),
  ]);

  type Notif = { id: string; type: "order" | "review"; message: string; created_at: string };
  const notifications: Notif[] = [];

  for (const r of ordersRes.rows) {
    let firstItem = "";
    try {
      const items = JSON.parse(r.items_json as string) as Array<{ name?: string }>;
      if (items[0]?.name) firstItem = items[0].name;
    } catch { /* ignore */ }
    notifications.push({
      id: `order-${r.id}`,
      type: "order",
      message: `${r.customer_name || r.customer_email || "A customer"} has ordered${firstItem ? ` "${firstItem}"` : ""}${(r.amount_total as number) > 0 ? ` — $${((r.amount_total as number) / 100).toFixed(2)}` : ""}`,
      created_at: r.created_at as string,
    });
  }

  for (const r of reviewsRes.rows) {
    notifications.push({
      id: `review-${r.id}`,
      type: "review",
      message: `${r.customer_name || "A customer"} left a ${r.stars}★ review on "${r.product_name}"`,
      created_at: r.created_at as string,
    });
  }

  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ notifications });
}
