import { notFound } from "next/navigation";
import { subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import { getProductBySlug } from "@/lib/products";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

export default async function PromotionalProductsTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const parent = await getProductBySlug("promotional-products");
  if (!parent) notFound();

  const name = CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"].find((n) => subProductSlug(n) === slug);
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
