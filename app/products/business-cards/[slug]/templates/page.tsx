import { notFound } from "next/navigation";
import { categories, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
import { getProductBySlug } from "@/lib/products";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

const PRINT_ESSENTIALS_CATEGORIES = new Set(
  categories.filter((c) => c.groupSlug === "print-essentials").map((c) => c.slug)
);

export default async function BusinessCardTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product = await getProductBySlug(slug);
  if (product && !PRINT_ESSENTIALS_CATEGORIES.has(product.category)) product = undefined;

  if (!product) {
    const parent = await getProductBySlug("premium-business-cards");
    const name = CATEGORY_SUBPRODUCT_OPTIONS["business-cards"].find((n) => subProductSlug(n) === slug);
    if (parent && name) product = { ...parent, slug, name };
  }

  if (!product) notFound();

  const isFlyer = slug === "bold-flyers";
  const isBusinessCards = slug === "premium-business-cards";
  // The Business Cards / Premium / Luxury tiers are the first 3 Sinalite "Business Cards" category
  // products (ids 1, 2, 7); Express/Prime Flyers are the first 2 "Flyers" category products
  // (ids 37, 38) — matched by id since their display name is now the real Sinalite product name,
  // not a fixed label.
  const allowedSinaliteIds = isBusinessCards ? ["1", "2", "7"] : isFlyer ? ["37", "38"] : undefined;

  return (
    <GalleryTemplatePage
      productSlug={slug}
      productName={product.name}
      productBasePath="/products/business-cards"
      categoryLabel={isFlyer ? "Flyers" : product.name}
      allowedSinaliteIds={allowedSinaliteIds}
    />
  );
}
