import { NextResponse } from "next/server";
import { getGalleryTemplate, updateGalleryTemplate, deleteGalleryTemplate, type SinaliteSelectedOption } from "@/lib/template-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { templateId } = await params;
  const template = await getGalleryTemplate(templateId);
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
  const updates: { name?: string; previewImage?: string; images?: string[]; price?: string; specs?: string[]; description?: string; visible?: boolean; sinaliteOptions?: SinaliteSelectedOption[] } = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.previewImage === "string") updates.previewImage = body.previewImage;
  if (Array.isArray(body.images)) updates.images = (body.images as unknown[]).filter((s) => typeof s === "string") as string[];
  if (typeof body.price === "string") updates.price = body.price;
  if (Array.isArray(body.specs)) updates.specs = (body.specs as unknown[]).filter((s) => typeof s === "string") as string[];
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.visible === "boolean") updates.visible = body.visible;
  if (Array.isArray(body.sinaliteOptions)) {
    updates.sinaliteOptions = (body.sinaliteOptions as unknown[])
      .filter((o): o is SinaliteSelectedOption =>
        !!o && typeof o === "object" &&
        typeof (o as SinaliteSelectedOption).id === "number" &&
        typeof (o as SinaliteSelectedOption).group === "string" &&
        typeof (o as SinaliteSelectedOption).name === "string")
      .map((o) => ({ id: o.id, group: o.group, name: o.name }));
  }

  const template = await updateGalleryTemplate(templateId, updates);
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
  const deleted = await deleteGalleryTemplate(templateId);
  if (!deleted) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
