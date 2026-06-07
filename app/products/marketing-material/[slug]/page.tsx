import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data";
import { getGalleryTemplate } from "@/lib/template-data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

const SUB_NAMES: Record<string, string> = {
  "posters":       "Posters",
  "vinyl-banners": "Banners",
  "yard-signs":    "Yard Signs",
};

export default async function MarketingMaterialOrderPage({
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

  const parent = getProductBySlug("marketing-material");
  if (!parent) notFound();

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
