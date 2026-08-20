import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [r1, r2, r3, r4, r5, r6] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) as cnt FROM orders WHERE status = 'paid' AND created_at >= ?", args: [todayIso] }),
    db.execute({ sql: "SELECT COALESCE(SUM(amount_total), 0) as rev FROM orders WHERE status = 'paid' AND created_at >= ?", args: [todayIso] }),
    db.execute({ sql: "SELECT COUNT(*) as cnt FROM orders WHERE status = 'paid'", args: [] }),
    db.execute({ sql: "SELECT customer_name, customer_email, amount_total, production_status, created_at, stripe_session_id, id FROM orders WHERE status = 'paid' ORDER BY created_at DESC LIMIT 5", args: [] }),
    db.execute({ sql: "SELECT COUNT(*) as cnt FROM orders", args: [] }),
    db.execute({ sql: "SELECT COUNT(*) as cnt FROM quote_requests WHERE status = 'new'", args: [] }),
  ]);

  return NextResponse.json({
    ordersToday: r1.rows[0]?.cnt ?? 0,
    revenueToday: r2.rows[0]?.rev ?? 0,
    totalOrders: r3.rows[0]?.cnt ?? 0,
    recentOrders: r4.rows,
    totalOrdersAll: r5.rows[0]?.cnt ?? 0,
    newQuotes: r6.rows[0]?.cnt ?? 0,
  });
}
