import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, reference_no, name, phone, email, product, quantity, message, file_name, file_url, status, created_at FROM quote_requests ORDER BY created_at DESC"
  );

  return NextResponse.json({ quotes: result.rows });
}
