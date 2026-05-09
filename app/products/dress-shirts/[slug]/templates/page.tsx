import { notFound } from "next/navigation";
import { getShirtBySlug } from "@/lib/shirt-data";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shirt = getShirtBySlug(slug);

  if (!shirt) notFound();

  return <GalleryTemplatePage productSlug={slug} productName={shirt.name} />;
}
