import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import GalleryTemplatePage from "@/components/gallery-templates-page";

export const dynamic = "force-dynamic";

export default async function BannerTemplatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product  = await getProductBySlug(slug);

  if (!product || (product.category !== "vinyl-banners" && product.category !== "roll-up-banners")) {
    notFound();
  }

  const isRollUp       = product.category === "roll-up-banners";
  const allowedNames   = isRollUp
    ? ["Standard Roll-Up Banner", "Premium Roll-Up Banner"]
    : ["Vinyl Banner", "Large Outdoor Banner"];
  const categoryLabel  = isRollUp ? "Roll-Up Banners" : "Vinyl Banners";

  return (
    <GalleryTemplatePage
      productSlug={slug}
      productName={product.name}
      productBasePath="/products/banners"
      categoryLabel={categoryLabel}
      allowedNames={allowedNames}
    />
  );
}
