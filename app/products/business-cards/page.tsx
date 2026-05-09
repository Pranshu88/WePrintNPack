import Link from "next/link";
import { getProducts } from "@/lib/data";
import { getProductLink } from "@/lib/product-link";

export const dynamic = "force-dynamic";

export default function BusinessCardsPage() {
  const products = getProducts("business-cards");

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="container container-wide" style={{ paddingTop: "2rem" }}>
        <nav style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>Business Cards</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Business Cards</h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>Premium quality custom business cards for professionals</p>

        {products.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>No business card products found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {products.map((p) => (
              <Link key={p.slug} href={getProductLink(p)} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ borderRadius: "14px", overflow: "hidden", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                  <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#f9fafb" }}>
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{p.name}</p>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>From {p.startingPrice}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
