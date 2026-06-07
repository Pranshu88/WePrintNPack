import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(
    `SELECT id, order_id, customer_name, customer_email, product_name, stars, comment, approved, created_at
     FROM reviews ORDER BY created_at DESC`
  );
  return NextResponse.json({ reviews: rows });
}

export async function PATCH(req: NextRequest) {
  const { id, approved } = await req.json() as { id: string; approved: boolean };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = await getDb();
  await db.execute({
    sql: `UPDATE reviews SET approved = ? WHERE id = ?`,
    args: [approved ? 1 : 0, id],
  });
  return NextResponse.json({ ok: true });
}
