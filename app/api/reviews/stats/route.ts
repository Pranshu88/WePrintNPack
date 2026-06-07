import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(
    `SELECT AVG(stars) as average, COUNT(*) as total FROM reviews WHERE approved = 1`
  );
  const row = rows[0];
  const average = row?.average ? Number(Number(row.average).toFixed(1)) : null;
  const total = Number(row?.total ?? 0);
  return NextResponse.json({ average, total });
}
