import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "webprint-salt-2024").digest("hex");
}

export async function POST(req: NextRequest) {
  const { token, newPassword } = (await req.json()) as { token: string; newPassword: string };

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, email, token, expires_at, used FROM password_resets WHERE token = ?",
    args: [token],
  });

  const reset = result.rows[0] as unknown as { id: string; email: string; token: string; expires_at: string; used: number } | undefined;

  if (!reset) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  if (reset.used === 1) {
    return NextResponse.json({ error: "This reset link has already been used" }, { status: 400 });
  }

  if (new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: "This reset link has expired" }, { status: 400 });
  }

  const passwordHash = hashPassword(newPassword);

  await db.batch([
    { sql: "UPDATE customers SET password_hash = ? WHERE email = ?", args: [passwordHash, reset.email] },
    { sql: "UPDATE admin_users SET password_hash = ? WHERE email = ?", args: [passwordHash, reset.email] },
    { sql: "UPDATE password_resets SET used = 1 WHERE id = ?", args: [reset.id] },
  ], "write");

  return NextResponse.json({ ok: true });
}
