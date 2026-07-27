import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";

export type SavedAddress = {
  id: string;
  houseNo: string;
  flat: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  createdAt: string;
};

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("id");
  if (!customerId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, house_no, flat, city, state, postal_code, country, phone, created_at
          FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC`,
    args: [customerId],
  });

  const addresses: SavedAddress[] = result.rows.map((r) => ({
    id: r.id as string,
    houseNo: (r.house_no as string) ?? "",
    flat: (r.flat as string) ?? "",
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    postalCode: (r.postal_code as string) ?? "",
    country: (r.country as string) ?? "",
    phone: (r.phone as string) ?? "",
    createdAt: r.created_at as string,
  }));

  return NextResponse.json({ addresses }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    customerId?: string; houseNo?: string; flat?: string; city?: string;
    state?: string; postalCode?: string; country?: string; phone?: string;
  };
  const { customerId, houseNo = "", flat = "", city = "", state = "", postalCode = "", country = "", phone = "" } = body;
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  const db = await getDb();

  // Avoid saving an exact duplicate of the most recent address.
  const existing = await db.execute({
    sql: `SELECT id FROM customer_addresses
          WHERE customer_id = ? AND house_no = ? AND flat = ? AND city = ?
            AND state = ? AND postal_code = ? AND country = ? AND phone = ?
          LIMIT 1`,
    args: [customerId, houseNo, flat, city, state, postalCode, country, phone],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ ok: true, id: existing.rows[0].id });
  }

  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO customer_addresses (id, customer_id, house_no, flat, city, state, postal_code, country, phone, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, customerId, houseNo, flat, city, state, postalCode, country, phone, new Date().toISOString()],
  });

  return NextResponse.json({ ok: true, id });
}
