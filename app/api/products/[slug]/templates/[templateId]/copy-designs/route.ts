import { NextResponse } from "next/server";
import { getGalleryTemplate, addDesign } from "@/lib/template-data";

export const dynamic = "force-dynamic";

// Copies every design from `fromGalleryId` onto this gallery template, skipping any
// name that already exists here. Used by the admin "Seed Design" button on raw
// Sinalite-imported business card rows that were never given their own designs.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { slug, templateId } = await params;
  const body = await req.json().catch(() => ({}));
  const fromGalleryId = typeof body.fromGalleryId === "string" ? body.fromGalleryId : undefined;
  if (!fromGalleryId) return NextResponse.json({ error: "fromGalleryId is required." }, { status: 400 });

  const target = await getGalleryTemplate(templateId);
  if (!target || target.productSlug !== slug) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }
  const source = await getGalleryTemplate(fromGalleryId);
  if (!source) return NextResponse.json({ error: "Source gallery not found." }, { status: 404 });

  const existingNames = new Set(target.designs.map((d) => d.name));
  let added = 0;
  for (const d of source.designs) {
    if (existingNames.has(d.name)) continue;
    await addDesign(templateId, {
      name: d.name,
      colorHex: d.colorHex,
      colorName: d.colorName,
      frontImage: d.frontImage,
      frontOverlay: d.frontOverlay,
      backImage: d.backImage,
      backOverlay: d.backOverlay,
      frontAdminItems: d.frontAdminItems,
      backAdminItems: d.backAdminItems,
      frontBgColor: d.frontBgColor,
      backBgColor: d.backBgColor,
    });
    added++;
  }

  const updated = await getGalleryTemplate(templateId);
  return NextResponse.json({ gallery: updated, added });
}
