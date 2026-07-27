import { NextResponse } from "next/server";
import { getGalleryTemplates, getGalleryTemplatesPaginated, createGalleryTemplate } from "@/lib/template-data";
import { syncSinaliteCategoryIntoGallery } from "@/lib/sinalite-category-sync";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const rawPage = searchParams.get("page");
  const includeHidden = searchParams.get("admin") === "1";

  // Admin view only — checks Sinalite's live catalog for this category and imports
  // anything new before reading from the DB, so the admin list is always current
  // without a manual import script. Skipped on the public site to avoid the extra
  // Sinalite round-trip on every storefront visit.
  if (includeHidden) await syncSinaliteCategoryIntoGallery(slug);

  if (rawPage === null) {
    const templates = await getGalleryTemplates(slug, includeHidden);
    return NextResponse.json({ templates });
  }

  const page = Math.max(1, parseInt(rawPage, 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const result = await getGalleryTemplatesPaginated(slug, page, limit, includeHidden);
  return NextResponse.json(result);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const previewImage = typeof body.previewImage === "string" ? body.previewImage : "";
  const description = typeof body.description === "string" ? body.description : undefined;

  if (!name || !previewImage) {
    return NextResponse.json({ error: "name and previewImage are required." }, { status: 400 });
  }

  const template = await createGalleryTemplate(slug, name, previewImage, description);
  return NextResponse.json({ template }, { status: 201 });
}
