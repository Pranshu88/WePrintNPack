"use client";

import Link from "next/link";
import { shirtProducts } from "@/lib/shirt-data";
import styles from "./page.module.css";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i + 0.5 <= rating;
        return (
          <span
            key={i}
            className={filled ? styles.starFilled : half ? styles.starHalf : styles.starEmpty}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

export default function DressShirtsPage() {
  return (
    <div className={styles.page}>
      <div className="container container-wide">
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/products">Apparel</Link>
          <span>/</span>
          <span>Dress Shirts</span>
        </nav>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Dress Shirts</h1>
          <p className={styles.pageSubtitle}>
            Custom embroidered and printed dress shirts for your team
          </p>
        </div>

        <div className={styles.productGrid}>
          {shirtProducts.map((shirt) => (
            <Link
              key={shirt.slug}
              href={`/products/dress-shirts/${shirt.slug}`}
              className={styles.card}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={shirt.images[0]}
                  alt={shirt.name}
                  className={styles.productImage}
                />
                {shirt.isNew && (
                  <span className={styles.badgeNew}>New options</span>
                )}
                <button
                  className={styles.heartBtn}
                  onClick={(e) => e.preventDefault()}
                  aria-label="Add to wishlist"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>

              <div className={styles.cardContent}>
                <div className={styles.colorSwatches}>
                  {shirt.colors.map((color) => (
                    <span
                      key={color.name}
                      className={styles.swatch}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>

                <h2 className={styles.productName}>{shirt.name}</h2>

                {shirt.rating !== undefined && (
                  <div className={styles.ratingRow}>
                    <StarRating rating={shirt.rating} />
                    <span className={styles.ratingNum}>{shirt.rating}</span>
                    <span className={styles.reviewCount}>
                      ({shirt.reviewCount})
                    </span>
                  </div>
                )}

                <p className={styles.priceRange}>{shirt.priceRange}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
