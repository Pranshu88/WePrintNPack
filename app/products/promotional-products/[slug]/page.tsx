import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

const SUB_NAMES: Record<string, string> = {
  "stickers-and-labels": "Stickers & Labels",
};

export default async function PromotionalProductsOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;
  const name = SUB_NAMES[slug];
  if (!name) notFound();

  const parent = getProductBySlug("promotional-products");
  if (!parent) notFound();

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
