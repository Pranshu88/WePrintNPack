import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_MAX_AGE, makeCustomerSessionToken } from "@/lib/customer-session";

// Mints/refreshes the customer_session cookie for a customer already known to the
// browser (localStorage "wp_user") — covers accounts that signed in before the
// session cookie existed, or whose cookie expired, without forcing a password re-entry.
export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = await getDb();
  const res = await db.execute({ sql: "SELECT id FROM customers WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, makeCustomerSessionToken(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
  return response;
}
