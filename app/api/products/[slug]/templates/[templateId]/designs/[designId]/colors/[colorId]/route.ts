import { NextResponse } from "next/server";
import { updateDesignColor, deleteDesignColor, type SerializableItem } from "@/lib/template-data";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string; colorId: string }> }
) {
  const { templateId, designId, colorId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const updates: {
    colorHex?: string;
    colorName?: string;
    frontImage?: string;
    frontOverlay?: string;
    backImage?: string;
    backOverlay?: string;
    frontAdminItems?: SerializableItem[];
    backAdminItems?: SerializableItem[];
  } = {};
  if (typeof body.colorHex === "string") updates.colorHex = body.colorHex;
  if (typeof body.colorName === "string") updates.colorName = body.colorName;
  if (typeof body.frontImage === "string") updates.frontImage = body.frontImage;
  if (typeof body.frontOverlay === "string") updates.frontOverlay = body.frontOverlay;
  if (typeof body.backImage === "string") updates.backImage = body.backImage;
  if (typeof body.backOverlay === "string") updates.backOverlay = body.backOverlay;
  if (Array.isArray(body.frontAdminItems)) updates.frontAdminItems = body.frontAdminItems as SerializableItem[];
  if (Array.isArray(body.backAdminItems)) updates.backAdminItems = body.backAdminItems as SerializableItem[];

  const design = await updateDesignColor(templateId, designId, colorId, updates);
  if (!design) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ design });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string; colorId: string }> }
) {
  const { templateId, designId, colorId } = await params;
  const deleted = await deleteDesignColor(templateId, designId, colorId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
