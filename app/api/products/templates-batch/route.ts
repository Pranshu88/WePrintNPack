import { NextRequest, NextResponse } from "next/server";
import { getGalleryTemplatesForSlugs } from "@/lib/template-data";

export const dynamic = "force-dynamic";

// Same data as GET /api/products/[slug]/templates, but for many slugs in one
// request — used by the homepage/listing carousels that otherwise fire one
// request per product (20-50+ separate round-trips to the remote DB).
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = slugsParam.split(",").map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return NextResponse.json({ templatesBySlug: {} });

  const templatesBySlug = await getGalleryTemplatesForSlugs(slugs);
  return NextResponse.json({ templatesBySlug });
}
