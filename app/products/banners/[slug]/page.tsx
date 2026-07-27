import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { getGalleryTemplate } from "@/lib/template-data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

export default async function BannerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug }    = await params;
  const { gallery } = await searchParams;
  const product     = await getProductBySlug(slug);

  if (!product || (product.category !== "vinyl-banners" && product.category !== "roll-up-banners")) {
    notFound();
  }

  const galleryName = gallery ? (await getGalleryTemplate(gallery))?.name : undefined;

  return (
    <BusinessCardOrderClient
      product={product}
      galleryId={gallery ?? null}
      categoryLabel="Banners"
      categoryHref="/products/banners"
      productBasePath="/products/banners"
      productNameOverride={galleryName}
    />
  );
}
