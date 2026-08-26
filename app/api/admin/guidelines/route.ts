import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const db = await getDb();
  const { rows } = await db.execute(
    slug
      ? { sql: "SELECT * FROM product_guidelines WHERE product_slug = ? ORDER BY created_at DESC", args: [slug] }
      : { sql: "SELECT * FROM product_guidelines ORDER BY created_at DESC", args: [] }
  );

  const guidelines = rows.map((r) => ({
    id: r.id,
    productSlug: r.product_slug,
    label: r.label,
    fileUrl: r.file_url,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ guidelines });
}

export async function POST(req: NextRequest) {
  const { productSlug, label, fileUrl } = await req.json() as { productSlug?: string; label?: string; fileUrl?: string };
  if (!productSlug || !label || !fileUrl) {
    return NextResponse.json({ error: "productSlug, label and fileUrl are required" }, { status: 400 });
  }

  const db = await getDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO product_guidelines (id, product_slug, label, file_url, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [id, productSlug, label, fileUrl, new Date().toISOString()],
  });

  return NextResponse.json({ guideline: { id, productSlug, label, fileUrl, createdAt: new Date().toISOString() } });
}
