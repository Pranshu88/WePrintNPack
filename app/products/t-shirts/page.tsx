import Link from "next/link";
import { getProducts } from "@/lib/data";
import { getGalleryTemplates } from "@/lib/template-data";

export const dynamic = "force-dynamic";

export default async function TShirtsPage() {
  const tshirtProducts = getProducts("t-shirts");

  type TileData = { id: string; name: string; price: string; image: string; link: string };
  const tiles: TileData[] = [];

  for (const product of tshirtProducts) {
    const galleries = await getGalleryTemplates(product.slug);
    for (const g of galleries) {
      tiles.push({
        id: g.id,
        name: g.name,
        price: `Starting at ${product.startingPrice}`,
        image: g.previewImage || product.image,
        link: `/products/${product.slug}?gallery=${g.id}`,
      });
    }
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="container container-wide" style={{ paddingTop: "2rem" }}>

        <nav style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#6b7280", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#374151" }}>T-Shirts</span>
        </nav>

        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>T-Shirts</h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.95rem", color: "#6b7280" }}>Custom branded T-shirts for events, teams, and everyday wear</p>

        {tiles.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "0.95rem" }}>No products found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {tiles.map((tile) => (
              <Link key={tile.id} href={tile.link} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ borderRadius: "14px", overflow: "hidden", border: "1.5px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                  <div style={{ aspectRatio: "4/3", overflow: "hidden", background: "#f9fafb" }}>
                    <img src={tile.image} alt={tile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{tile.name}</p>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>{tile.price}</p>
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
