import { notFound } from "next/navigation";
import { getProductBySlug, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

export default async function PromotionalProductsOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;

  const parent = getProductBySlug("promotional-products");
  if (!parent) notFound();

  const name = CATEGORY_SUBPRODUCT_OPTIONS["promotional-products"].find((n) => subProductSlug(n) === slug);
  if (!name) notFound();

  const product = { ...parent, slug };

  return (
    <BusinessCardOrderClient
      product={product}
      galleryId={gallery ?? null}
      categoryLabel="Promotional Products"
      categoryHref="/products/promotional-products"
      productBasePath="/products/promotional-products"
      productNameOverride={name}
    />
  );
}
