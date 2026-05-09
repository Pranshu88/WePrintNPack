import Link from "next/link";
import type { Product } from "@/lib/types";
import { getProductLink } from "@/lib/product-link";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <div className="product-thumbnail">
        <img alt={product.name} className="product-image" src={product.image} />
      </div>
      <div className="product-meta">
        <div>
          <p className="eyebrow">{product.categoryName}</p>
          <h3>{product.name}</h3>
        </div>
        <strong>{product.startingPrice}</strong>
      </div>
      <p>{product.description}</p>
      <Link className="button button-secondary" href={getProductLink(product)}>
        View details
      </Link>
    </article>
  );
}
