import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string };

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id FROM customers WHERE email = ?",
    args: [email],
  });

  if (!result.rows[0]) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: "INSERT INTO password_resets (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)",
    args: [id, email, token, expiresAt],
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  if (smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: "Reset your WE PRINT N PACK password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7c3aed, #db2777); padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Password Reset</h1>
            </div>
            <div style="padding: 28px 32px; background: #fff; border-radius: 0 0 12px 12px; border: 1px solid #f0f0f0;">
              <p style="color: #374151; line-height: 1.6;">Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetLink}"
                 style="display: inline-block; padding: 13px 28px; background: linear-gradient(135deg, #7c3aed, #db2777); color: #fff; text-decoration: none; border-radius: 999px; font-weight: 700; margin: 16px 0;">
                Reset Password
              </a>
              <p style="color: #9ca3af; font-size: 0.8rem;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  } else {
    console.log("[Password Reset] Reset link for", email, ":", resetLink);
  }

  return NextResponse.json({ ok: true });
}
