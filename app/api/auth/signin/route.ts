import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "webprint-salt-2024").digest("hex");
}

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email: string; password: string };
  if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });

  const db = await getDb();
  const res = await db.execute({ sql: "SELECT id, first_name, last_name, email, password_hash FROM customers WHERE email = ?", args: [email] });
  const customer = res.rows[0];

  if (!customer || String(customer.password_hash) !== hashPassword(password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, customer: { id: String(customer.id), firstName: String(customer.first_name), lastName: String(customer.last_name), email: String(customer.email) } });
}
