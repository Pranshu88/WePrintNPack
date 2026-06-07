import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import getDb from "@/lib/db";

const ADMIN_EMAIL = "info@weprintnpack.ca";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string };

  if (!email || email.toLowerCase().trim() !== ADMIN_EMAIL) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id FROM admin_users WHERE email = ?",
    args: [ADMIN_EMAIL],
  });

  if (!result.rows[0]) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: "INSERT INTO password_resets (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)",
    args: [id, ADMIN_EMAIL, token, expiresAt],
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/admin/reset-password?token=${token}`;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      });

      await transporter.sendMail({
        from: `"WE PRINT N PACK" <${gmailUser}>`,
        to: ADMIN_EMAIL,
        subject: "Admin Password Reset – WE PRINT N PACK",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #7c3aed, #db2777, #f97316); padding: 28px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 1.4rem;">Admin Password Reset</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 0.9rem;">WE PRINT N PACK</p>
            </div>
            <div style="padding: 28px 32px; background: #fff; border-radius: 0 0 12px 12px; border: 1px solid #f0f0f0;">
              <p style="color: #374151; line-height: 1.6;">Click the button below to reset your admin password. This link expires in <strong>1 hour</strong>.</p>
              <a href="${resetLink}"
                 style="display: inline-block; padding: 13px 28px; background: linear-gradient(135deg, #7c3aed, #db2777, #f97316); color: #fff; text-decoration: none; border-radius: 999px; font-weight: 700; margin: 16px 0;">
                Reset Admin Password
              </a>
              <p style="color: #9ca3af; font-size: 0.8rem; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send admin reset email:", err);
    }
  } else {
    console.log("[Admin Password Reset] Reset link:", resetLink);
  }

  return NextResponse.json({ ok: true });
}
