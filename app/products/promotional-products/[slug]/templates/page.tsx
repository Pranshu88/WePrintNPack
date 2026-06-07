import { notFound } from "next/navigation";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

const SUB_NAMES: Record<string, string> = {
  "stickers-and-labels": "Stickers & Labels",
};

export default async function PromotionalProductsTemplatesPage({
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
      productBasePath="/products/promotional-products"
      categoryLabel="Promotional Products"
    />
  );
}
