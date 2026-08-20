import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_MAX_AGE, makeCustomerSessionToken } from "@/lib/customer-session";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "webprint-salt-2024").digest("hex");
}

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, password } = (await req.json()) as { firstName: string; lastName: string; email: string; password: string };
  if (!firstName || !lastName || !email || !password) return NextResponse.json({ error: "All fields are required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.execute({ sql: "SELECT id FROM customers WHERE email = ?", args: [email] });
  if (existing.rows.length > 0) return NextResponse.json({ error: "Email already registered" }, { status: 400 });

  const id = crypto.randomUUID();
  await db.execute({ sql: "INSERT INTO customers (id, first_name, last_name, email, password_hash, phone, address, created_at) VALUES (?, ?, ?, ?, ?, '', '', ?)", args: [id, firstName, lastName, email, hashPassword(password), new Date().toISOString()] });

  const response = NextResponse.json({ ok: true, customer: { id, firstName, lastName, email } });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, makeCustomerSessionToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
  return response;
}
