import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, first_name, last_name, email, phone, address FROM customers WHERE id = ?",
    args: [id],
  });

  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let parsedAddress = { houseNo: "", flat: "", city: "", state: "" };
  try { parsedAddress = { ...parsedAddress, ...JSON.parse((row.address as string) || "{}") }; } catch { /* ignore */ }

  return NextResponse.json({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? "",
    address: parsedAddress,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id?: string; phone?: string; houseNo?: string; flat?: string; city?: string; state?: string };
  const { id, phone = "", houseNo = "", flat = "", city = "", state = "" } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = await getDb();
  const addressJson = JSON.stringify({ houseNo, flat, city, state });
  await db.execute({
    sql: "UPDATE customers SET phone = ?, address = ? WHERE id = ?",
    args: [phone, addressJson, id],
  });

  return NextResponse.json({ ok: true });
}
