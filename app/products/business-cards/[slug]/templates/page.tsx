import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

export default async function BusinessCardTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product || product.category !== "business-cards") notFound();

  return (
    <GalleryTemplatePage
      productSlug={slug}
      productName={product.name}
      productBasePath="/products/business-cards"
      categoryLabel="Business Cards"
    />
  );
}
