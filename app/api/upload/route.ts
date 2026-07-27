import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Uploads a data: URL (PNG/JPEG) to Vercel Blob and returns its public URL —
// used to host print-ready artwork files so external APIs (Sinalite) can fetch them.
export async function POST(req: NextRequest) {
  try {
    const { dataUrl, filename } = await req.json() as { dataUrl?: string; filename?: string };
    if (!dataUrl || !filename) {
      return NextResponse.json({ error: "Missing dataUrl or filename" }, { status: 400 });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Invalid data URL" }, { status: 400 });
    const [, contentType, base64] = match;
    const buffer = Buffer.from(base64, "base64");

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
