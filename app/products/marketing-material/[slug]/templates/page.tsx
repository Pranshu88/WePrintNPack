import { notFound } from "next/navigation";
import { getProductBySlug, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

export default async function MarketingMaterialTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const parent = getProductBySlug("marketing-material");
  if (!parent) notFound();

  const name = CATEGORY_SUBPRODUCT_OPTIONS["marketing-material"].find((n) => subProductSlug(n) === slug);
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
