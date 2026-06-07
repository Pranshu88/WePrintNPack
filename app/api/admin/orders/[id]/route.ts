import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

const VALID_STATUSES = ["pending", "production", "completed"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { production_status?: string };
  const status = body.production_status;

  if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "UPDATE orders SET production_status = ? WHERE id = ?",
    args: [status, id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
