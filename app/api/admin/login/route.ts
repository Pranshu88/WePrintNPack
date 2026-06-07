import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "webprint-admin-secret-2024";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "webprint-salt-2024").digest("hex");
}

function generateAdminToken(): string {
  return crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update("webprint-admin-authenticated").digest("hex");
}

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, email, password_hash FROM admin_users WHERE email = ?",
    args: [email.toLowerCase().trim()],
  });

  const admin = result.rows[0] as unknown as { id: string; email: string; password_hash: string } | undefined;

  if (!admin || admin.password_hash !== hashPassword(password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = generateAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
