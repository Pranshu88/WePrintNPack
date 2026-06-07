import { notFound } from "next/navigation";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

const SUB_NAMES: Record<string, string> = {
  "posters":       "Posters",
  "vinyl-banners": "Banners",
  "yard-signs":    "Yard Signs",
};

export default async function MarketingMaterialTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = SUB_NAMES[slug];
  if (!name) notFound();

  return (
    <GalleryTemplatePage
      productSlug={slug}
      productName={name}
      productBasePath="/products/marketing-material"
      categoryLabel="Marketing Material"
    />
  );
}
