import { notFound } from "next/navigation";
import { categories, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import { getProductBySlug } from "@/lib/products";
import BusinessCardOrderClient from "@/components/business-card-order-client";

export const dynamic = "force-dynamic";

const PRINT_ESSENTIALS_CATEGORIES = new Set(
  categories.filter((c) => c.groupSlug === "print-essentials").map((c) => c.slug)
);

export default async function BusinessCardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gallery?: string; savedDesignId?: string }>;
}) {
  const { slug } = await params;
  const { gallery, savedDesignId } = await searchParams;

  // Real, standalone products (Business Cards, Flyers, Brochures, Postcards…)
  let product = await getProductBySlug(slug);
  if (product && !PRINT_ESSENTIALS_CATEGORIES.has(product.category)) product = undefined;

  // Ad-hoc sub-products (Door Hangers, Rack Cards, Letterheads…) with no Product of their
  // own — validated against the canonical list in CATEGORY_SUBPRODUCT_OPTIONS.
  if (!product) {
    const parent = await getProductBySlug("premium-business-cards");
    const name = CATEGORY_SUBPRODUCT_OPTIONS["business-cards"].find((n) => subProductSlug(n) === slug);
    if (parent && name) product = { ...parent, slug, name };
  }

  if (!product) notFound();

  return <BusinessCardOrderClient product={product} galleryId={gallery ?? null} savedDesignId={savedDesignId ?? null} />;
}
