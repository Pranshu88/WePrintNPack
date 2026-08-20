import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = (await req.json()) as { status?: string };
  if (!status || !["new", "contacted", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const db = await getDb();
  await db.execute({ sql: "UPDATE quote_requests SET status = ? WHERE id = ?", args: [status, id] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM quote_requests WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
