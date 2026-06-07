import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

export default async function BusinessCardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string }>;
}) {
  const { slug } = await params;
  const { gallery } = await searchParams;
  const product = getProductBySlug(slug);

  if (!product || (product.category !== "business-cards" && product.category !== "flyers")) notFound();

  return <BusinessCardOrderClient product={product} galleryId={gallery ?? null} />;
}
