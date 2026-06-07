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
  if (product.category === "vinyl-banners") {
    return `/products/banners/${product.slug}/templates`;
  }
  if (product.category === "roll-up-banners") {
    return `/products/banners/${product.slug}/templates`;
  }
  return `/products/${product.slug}`;
}
