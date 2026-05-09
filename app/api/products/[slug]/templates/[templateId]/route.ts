import { NextResponse } from "next/server";
import { getGalleryTemplate, updateGalleryTemplate, deleteGalleryTemplate } from "@/lib/template-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { templateId } = await params;
  const template = getGalleryTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { templateId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const updates: { name?: string; previewImage?: string } = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.previewImage === "string") updates.previewImage = body.previewImage;

  const template = updateGalleryTemplate(templateId, updates);
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { templateId } = await params;
  const deleted = deleteGalleryTemplate(templateId);
  if (!deleted) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
