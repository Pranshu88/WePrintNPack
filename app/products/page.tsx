import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const products = getProducts(params.category);

  return (
    <section className="section page-section">
      <div className="container">
        <SectionHeading
          eyebrow="Catalog"
          title="Shop print and packaging products"
          description="Customers can compare products, review standard specs, and move into a guided ordering flow."
        />
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
