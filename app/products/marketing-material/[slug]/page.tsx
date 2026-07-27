import { notFound } from "next/navigation";
import { subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import { getProductBySlug } from "@/lib/products";
import { getGalleryTemplate } from "@/lib/template-data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

export default async function MarketingMaterialOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;

  const parent = await getProductBySlug("marketing-material");
  if (!parent) notFound();

  const name = CATEGORY_SUBPRODUCT_OPTIONS["marketing-material"].find((n) => subProductSlug(n) === slug);
  if (!name) notFound();

  // Use gallery name if available, otherwise fall back to SUB_NAMES
  const galleryName = gallery ? (await getGalleryTemplate(gallery))?.name : undefined;

  // Use parent product data but with this sub-product's slug for template API calls
  const product = { ...parent, slug };

  return (
    <BusinessCardOrderClient
      product={product}
      galleryId={gallery ?? null}
      categoryLabel="Marketing Material"
      categoryHref="/products/marketing-material"
      productBasePath="/products/marketing-material"
      productNameOverride={galleryName ?? name}
    />
  );
}
