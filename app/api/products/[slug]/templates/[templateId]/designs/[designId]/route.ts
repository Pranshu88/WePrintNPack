import { NextResponse } from "next/server";
import { getDesign, updateDesign, deleteDesign, type GalleryTemplate, type SerializableItem } from "@/lib/template-data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string }> }
) {
  const { templateId, designId } = await params;
  const design = await getDesign(templateId, designId);
  if (!design) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ design });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string }> }
) {
  const { templateId, designId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const updates: {
    name?: string;
    colorHex?: string;
    colorName?: string;
    frontImage?: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
    frontBgColor?: string;
    backBgColor?: string;
  } = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.colorHex === "string") updates.colorHex = body.colorHex;
  if (typeof body.colorName === "string") updates.colorName = body.colorName;
  if (typeof body.frontImage === "string") updates.frontImage = body.frontImage;
  if (typeof body.frontOverlay === "string") updates.frontOverlay = body.frontOverlay;
  if (typeof body.backImage === "string") updates.backImage = body.backImage;
  if (typeof body.backOverlay === "string") updates.backOverlay = body.backOverlay;
  if (Array.isArray(body.frontAdminItems)) updates.frontAdminItems = body.frontAdminItems as SerializableItem[];
  if (Array.isArray(body.backAdminItems)) updates.backAdminItems = body.backAdminItems as SerializableItem[];
  if (typeof body.frontBgColor === "string") updates.frontBgColor = body.frontBgColor;
  if (typeof body.backBgColor === "string") updates.backBgColor = body.backBgColor;

  let template: GalleryTemplate | undefined;
  try {
    template = await updateDesign(templateId, designId, updates);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!template) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string }> }
) {
  const { templateId, designId } = await params;
  const deleted = await deleteDesign(templateId, designId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
