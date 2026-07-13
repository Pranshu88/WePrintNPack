import { notFound } from "next/navigation";
import { getProductBySlug, categories, subProductSlug, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";
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

  let product = getProductBySlug(slug);
  if (product && !PRINT_ESSENTIALS_CATEGORIES.has(product.category)) product = undefined;

  if (!product) {
    const parent = getProductBySlug("premium-business-cards");
    const name = CATEGORY_SUBPRODUCT_OPTIONS["business-cards"].find((n) => subProductSlug(n) === slug);
    if (parent && name) product = { ...parent, slug, name };
  }

  if (!product) notFound();

  const isFlyer = slug === "bold-flyers";
  const isBusinessCards = slug === "premium-business-cards";
  const allowedNames = isFlyer
    ? ["Express Flyers", "Prime Flyers"]
    : isBusinessCards
      ? ["Business Cards", "Premium Business Cards", "Luxury Business Cards"]
      : undefined;

  return (
    <GalleryTemplatePage
      productSlug={slug}
      productName={product.name}
      productBasePath="/products/business-cards"
      categoryLabel={isFlyer ? "Flyers" : product.name}
      allowedNames={allowedNames}
    />
  );
}
