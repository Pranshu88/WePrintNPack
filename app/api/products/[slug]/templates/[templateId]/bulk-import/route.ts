import { NextResponse } from "next/server";
import { getGalleryTemplate, addDesign } from "@/lib/template-data";

export const dynamic = "force-dynamic";

type BulkItem = {
  name: string;
  frontImage: string;      // data URL
  frontBgColor?: string;
  backBgColor?: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; templateId: string }> }
) {
  const { slug, templateId } = await params;

  const gallery = getGalleryTemplate(templateId);
  if (!gallery || gallery.productSlug !== slug) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  let items: BulkItem[];
  try {
    const body = await req.json();
    items = body.designs as BulkItem[];
    if (!Array.isArray(items) || items.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "Body must be { designs: [...] }" }, { status: 400 });
  }

  const results: { name: string; ok: boolean; error?: string }[] = [];

  for (const item of items) {
    if (!item.name?.trim() || !item.frontImage) {
      results.push({ name: item.name ?? "(unnamed)", ok: false, error: "name and frontImage required" });
      continue;
    }
    try {
      addDesign(templateId, {
        name: item.name.trim(),
        frontImage: item.frontImage,
        frontBgColor: item.frontBgColor ?? "#ffffff",
        backBgColor:  item.backBgColor  ?? "#ffffff",
      });
      results.push({ name: item.name.trim(), ok: true });
    } catch (e) {
      results.push({ name: item.name.trim(), ok: false, error: String(e) });
    }
  }

  const added   = results.filter((r) => r.ok).length;
  const failed  = results.filter((r) => !r.ok).length;
  const updated = getGalleryTemplate(templateId);

  return NextResponse.json({ added, failed, results, gallery: updated }, { status: 201 });
}
