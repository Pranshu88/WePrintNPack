import { NextResponse } from "next/server";
import { addDesignColor, type SerializableItem } from "@/lib/template-data";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string; designId: string }> }
) {
  const { templateId, designId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const colorHex = typeof body.colorHex === "string" ? body.colorHex : "";
  const colorName = typeof body.colorName === "string" ? body.colorName.trim() : "";
  const frontImage = typeof body.frontImage === "string" ? body.frontImage : "";
  const frontOverlay = typeof body.frontOverlay === "string" ? body.frontOverlay : undefined;
  const backImage = typeof body.backImage === "string" ? body.backImage : undefined;
  const backOverlay = typeof body.backOverlay === "string" ? body.backOverlay : undefined;
  const frontAdminItems = Array.isArray(body.frontAdminItems) ? body.frontAdminItems as SerializableItem[] : undefined;
  const backAdminItems = Array.isArray(body.backAdminItems) ? body.backAdminItems as SerializableItem[] : undefined;

  if (!colorHex || !colorName || !frontImage) {
    return NextResponse.json({ error: "colorHex, colorName and frontImage are required." }, { status: 400 });
  }

  const design = addDesignColor(templateId, designId, { colorHex, colorName, frontImage, frontOverlay, backImage, backOverlay, frontAdminItems, backAdminItems });
  if (!design) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }
  return NextResponse.json({ design }, { status: 201 });
}
