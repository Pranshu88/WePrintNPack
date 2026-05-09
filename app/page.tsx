import Link from "next/link";
import { getProducts, groupProductsByCatalog } from "@/lib/data";
import CatalogProductTile from "@/components/catalog-product-tile";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type HeroCard = {
  label: string;
  wide?: boolean;
  compact?: boolean;
};

type HeroPanel = {
  variant: "left" | "right";
  title: string;
  subtitle: string;
  price?: string;
  cards: HeroCard[];
  image: string;
};


const heroPanels: HeroPanel[] = [
  {
    variant: "left",
    title: "Visiting Cards ",
    subtitle: "100 Visiting Cards at",
    price: "Rs. 200",
    cards: [{ label: "Shop Now" }],
    image: "/images/card2.jpg"   // ✅ local path
  },
  {
    variant: "right",
    title: "Wear your brand with pride",
    subtitle: "Starting at",
    price: "Rs. 320",
    cards: [{ label: "Shop Now" }],
    image: "/images/tshirt.jpg" // ✅ local path
  }
];

export default function HomePage() {
  const catalogSections = groupProductsByCatalog(getProducts());

  return (
    <div className={styles.homePage}>
      <section className={styles.heroSection}>
        <div className="container container-wide">
          <div className={styles.heroGrid}>
            {heroPanels.map((panel) => (
              <article
                className={`${styles.heroPanel} ${
                  panel.variant === "left"
                    ? styles.heroPanelLeft
                    : styles.heroPanelRight
                }`}
                key={panel.title}
              >
                <div
                  className={`${styles.heroMedia} ${
                    panel.variant === "left"
                      ? styles.heroMediaLeft
                      : styles.heroMediaRight
                  }`}
                  aria-hidden="true"
                  style={{ backgroundImage: `url(${panel.image})` }}
                />
                <div
                  className={`${styles.heroCopy} ${
                    panel.variant === "left"
                      ? styles.heroCopyLeft
                      : styles.heroCopyRight
                  }`}
                >
                  <h2>{panel.title}</h2>
                  <p className={styles.heroPriceLine}>
                    <span className={styles.heroPriceLabel}>{panel.subtitle}</span>
                    {panel.price ? <span className={styles.heroPriceValue}>{panel.price}</span> : null}
                  </p>
                  <div className={styles.heroCards}>
                    {panel.cards.map((card) => (
                      <div
                        className={`${styles.heroCard} ${
                          card.wide ? styles.heroCardWide : ""
                        } ${
                          card.compact ? styles.heroCardCompact : ""
                        }`}
                        key={card.label}
                      >
                        <strong className={styles.cta}>
                          {card.label}
                          <span className={styles.arrow}>&rarr;</span>
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container container-wide">
          <div className={styles.catalogSections}>
            {catalogSections.map((section) => (
              <div key={section.slug} className={styles.catalogSection}>
                <div className={styles.catalogSectionHeader}>
                  <div>
                    <h2>{section.title}</h2>
                  </div>
                  {section.products.length > 5 && (
                    <Link className="button button-secondary" href="/products">
                      View all
                    </Link>
                  )}
                </div>

                <div className="category-rail">
               {section.products.map((product) => (
          <CatalogProductTile
            key={product.slug}
            product={product}
            tileContentClass={styles.catalogTileContent}
            tileNameClass={styles.catalogTileName}
            tilePriceClass={styles.catalogTilePrice}
            tileExploreClass={styles.catalogTileExplore}
          />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.subscribeSection}>
  <div className={styles.subscribeContainer}>

    {/* LEFT IMAGE */}
   <div className={styles.subscribeImage} />

    {/* RIGHT CONTENT */}
    <div className={styles.subscribeContent}>
      <h2>It&apos;s good to be on the list.</h2>
      <p>
        Get 15% off* your first order when you sign up for our emails
      </p>

      <input
        type="email"
        placeholder="Subscription email"
        className={styles.subscribeInput}
      />

      <small>
        Yes, I&apos;d like to receive special offer emails from VistaPrint, as well as
        news about products, services and my designs in progress.
      </small>

      <button className={styles.subscribeButton}>Submit</button>
    </div>

  </div>
</section>

    </div>
  );
}
