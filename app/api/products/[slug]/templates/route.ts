import { NextResponse } from "next/server";
import { getGalleryTemplates, getGalleryTemplatesPaginated, createGalleryTemplate } from "@/lib/template-data";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const rawPage = searchParams.get("page");

  // When no ?page= param, return all templates (used by admin + order clients)
  if (rawPage === null) {
    const templates = getGalleryTemplates(slug);
    return NextResponse.json({ templates });
  }

  // With ?page=, return paginated response (used by customer gallery)
  const page = Math.max(1, parseInt(rawPage, 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const result = getGalleryTemplatesPaginated(slug, page, limit);
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

  if (!name || !previewImage) {
    return NextResponse.json({ error: "name and previewImage are required." }, { status: 400 });
  }

  const template = createGalleryTemplate(slug, name, previewImage);
  return NextResponse.json({ template }, { status: 201 });
}
