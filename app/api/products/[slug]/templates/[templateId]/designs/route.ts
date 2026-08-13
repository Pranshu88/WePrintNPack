import { NextResponse } from "next/server";
import { addDesign, type SerializableItem } from "@/lib/template-data";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { templateId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const colorHex = typeof body.colorHex === "string" ? body.colorHex : undefined;
  const colorName = typeof body.colorName === "string" ? body.colorName : undefined;
  const frontImage = typeof body.frontImage === "string" ? body.frontImage : "";
  const frontOverlay = typeof body.frontOverlay === "string" ? body.frontOverlay : undefined;
  const backImage = typeof body.backImage === "string" ? body.backImage : undefined;
  const backOverlay = typeof body.backOverlay === "string" ? body.backOverlay : undefined;
  const frontAdminItems = Array.isArray(body.frontAdminItems) ? (body.frontAdminItems as SerializableItem[]) : undefined;
  const backAdminItems = Array.isArray(body.backAdminItems) ? (body.backAdminItems as SerializableItem[]) : undefined;
  const frontBgColor = typeof body.frontBgColor === "string" ? body.frontBgColor : undefined;
  const backBgColor = typeof body.backBgColor === "string" ? body.backBgColor : undefined;
  const sizeLabel = typeof body.sizeLabel === "string" ? body.sizeLabel : undefined;

  if (!name || !frontImage) {
    return NextResponse.json({ error: "name and frontImage are required." }, { status: 400 });
  }

  const template = await addDesign(templateId, { name, colorHex, colorName, frontImage, frontOverlay, backImage, backOverlay, frontAdminItems, backAdminItems, frontBgColor, backBgColor, sizeLabel });
  if (!template) {
    return NextResponse.json({ error: "Gallery template not found." }, { status: 404 });
  }
  return NextResponse.json({ template }, { status: 201 });
}
