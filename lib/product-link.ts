export function getProductLink(product: { category: string; slug: string }): string {
  if (product.category === "dress-shirts") {
    return `/products/dress-shirts/${product.slug}/templates`;
  }
  if (product.category === "business-cards") {
    return `/products/business-cards/${product.slug}/templates`;
  }
  if (product.category === "flyers") {
    return `/products/business-cards/${product.slug}/templates`;
  }
  if (product.category === "postcards") {
    // Postcards has no dedicated order page of its own — it's a "print-essentials" category
    // like Business Cards/Flyers, so /products/business-cards/[slug]/page.tsx already accepts
    // it (checked via PRINT_ESSENTIALS_CATEGORIES) and gives it the same Sinalite-backed
    // size/pricing configurator, instead of falling through to the generic bare-bones
    // /products/[slug] page (ShirtOrderClient) which has none of that.
    return `/products/business-cards/${product.slug}`;
  }
  if (product.category === "vinyl-banners") {
    return `/products/banners/${product.slug}/templates`;
  }
  if (product.category === "roll-up-banners") {
    return `/products/banners/${product.slug}/templates`;
  }
  return `/products/${product.slug}`;
}
