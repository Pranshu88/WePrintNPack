import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const { rows } = await db.execute({
    sql: "SELECT id, label, file_url, created_at FROM product_guidelines WHERE product_slug = ? ORDER BY created_at DESC",
    args: [slug],
  });

  const guidelines = rows.map((r) => ({
    id: r.id,
    label: r.label,
    fileUrl: r.file_url,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ guidelines });
}
