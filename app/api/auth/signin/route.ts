import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_MAX_AGE, makeCustomerSessionToken } from "@/lib/customer-session";

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

  const id = String(customer.id);
  const response = NextResponse.json({ ok: true, customer: { id, firstName: String(customer.first_name), lastName: String(customer.last_name), email: String(customer.email) } });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, makeCustomerSessionToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
  return response;
}
