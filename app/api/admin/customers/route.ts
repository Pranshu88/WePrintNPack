import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, first_name, last_name, email, phone, address, created_at FROM customers ORDER BY created_at DESC"
  );

  return NextResponse.json({ customers: result.rows });
}
