import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { put } from "@vercel/blob";
import getDb from "@/lib/db";

// Human-readable, collision-safe without needing an atomic counter — sortable by
// date and short enough for a customer to read back over the phone.
function generateReferenceNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `QR-${date}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();

    const name     = (data.get("name")     as string) || "";
    const phone    = (data.get("phone")    as string) || "";
    const email    = (data.get("email")    as string) || "";
    const product  = (data.get("product")  as string) || "";
    const quantity = (data.get("quantity") as string) || "";
    const message  = (data.get("message")  as string) || "";
    const file     = data.get("file") as File | null;

    if (!name || !phone || !email || !product || !quantity) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Persist first so the request is never lost even if email sending below fails
    // (missing env vars, provider outage, etc).
    let fileUrl = "";
    try {
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const blob = await put(file.name, buffer, { access: "public", addRandomSuffix: true });
        fileUrl = blob.url;
      }
    } catch (uploadErr) {
      console.error("Quote request file upload failed:", uploadErr);
    }
    const referenceNo = generateReferenceNo();
    try {
      const db = await getDb();
      await db.execute({
        sql: `INSERT INTO quote_requests (id, reference_no, name, phone, email, product, quantity, message, file_name, file_url, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
        args: [crypto.randomUUID(), referenceNo, name, phone, email, product, quantity, message, file?.name ?? "", fileUrl, new Date().toISOString()],
      });
    } catch (dbErr) {
      console.error("Quote request DB insert failed:", dbErr);
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const attachments: nodemailer.SendMailOptions["attachments"] = [];
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({ filename: file.name, content: buffer });
    }

    // 1. Notify admin
    await transporter.sendMail({
      from: `"We Print N Pack" <${process.env.GMAIL_USER}>`,
      to: process.env.CONTACT_TO_EMAIL || "pranshu@yopmail.com",
      replyTo: email,
      subject: `Print Quote [${referenceNo}] – ${product} – ${name}`,
      text: [
        `Reference: ${referenceNo}`,
        `Name:    ${name}`,
        `Phone:   ${phone}`,
        `Email:   ${email}`,
        `Product: ${product}`,
        `Qty:     ${quantity}`,
        `Message: ${message || "—"}`,
        file ? `File:    ${file.name}` : "",
      ].filter(Boolean).join("\n"),
      html: `
        <h2 style="color:#f97316;font-family:sans-serif">New Print Quote Request</h2>
        <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Reference</td><td><strong>${referenceNo}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Name</td><td>${name}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Product</td><td>${product}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Quantity</td><td>${quantity}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">Message</td><td>${message || "—"}</td></tr>
          ${file ? `<tr><td style="padding:6px 16px 6px 0;color:#555;font-weight:600">File</td><td>${file.name} (see attachment)</td></tr>` : ""}
        </table>
      `,
      attachments,
    });

    // 2. Confirmation email to customer
    await transporter.sendMail({
      from: `"We Print N Pack" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Thank you for contacting WE Print n Pack [${referenceNo}]`,
      text: [
        `Hi ${name},`,
        "",
        "Thank you for contacting WE Print n Pack.",
        "We received your quote request and our team will contact you shortly.",
        "",
        `Your reference number: ${referenceNo}`,
        "Please quote this number if you contact us about this request.",
        "",
        "Here's a summary of your request:",
        `  Product:  ${product}`,
        `  Quantity: ${quantity}`,
        `  Message:  ${message || "—"}`,
        "",
        "We look forward to working with you!",
        "",
        "— WE Print n Pack Team",
        "📞 +1 902 412 2133",
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#f97316;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px">WE PRINT N PACK</h1>
            <p style="color:#fff;margin:4px 0 0;font-size:13px;opacity:0.9">PRINT. DESIGN. PACK. DELIVER.</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="font-size:16px;color:#111;margin:0 0 12px">Hi <strong>${name}</strong>,</p>
            <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 20px">
              Thank you for contacting <strong>WE Print n Pack</strong>.<br/>
              We received your quote request and our team will contact you shortly.
            </p>
            <div style="background:#111827;padding:14px 20px;border-radius:6px;margin-bottom:20px;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Your reference number</p>
              <p style="margin:2px 0 0;font-size:20px;font-weight:700;color:#fff;letter-spacing:0.04em">${referenceNo}</p>
            </div>
            <div style="background:#fef9f5;border-left:4px solid #f97316;padding:16px 20px;border-radius:4px;margin-bottom:24px">
              <p style="margin:0 0 8px;font-weight:600;color:#111;font-size:14px">Your Request Summary</p>
              <table style="font-size:14px;color:#444;border-collapse:collapse;width:100%">
                <tr><td style="padding:4px 16px 4px 0;font-weight:600;width:90px">Product</td><td>${product}</td></tr>
                <tr><td style="padding:4px 16px 4px 0;font-weight:600">Quantity</td><td>${quantity}</td></tr>
                <tr><td style="padding:4px 16px 4px 0;font-weight:600">Message</td><td>${message || "—"}</td></tr>
              </table>
            </div>
            <p style="font-size:15px;color:#333;margin:0 0 24px">We look forward to working with you!</p>
            <p style="font-size:14px;color:#555;margin:0">
              — <strong>WE Print n Pack Team</strong><br/>
              📞 +1 902 412 2133
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, referenceNo });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
