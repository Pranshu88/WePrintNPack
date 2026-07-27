import AdminGalleryDetail from "@/components/admin-gallery-detail";
import Link from "next/link";

export const dynamic = "force-dynamic";

const APPAREL_PRODUCT_SLUGS = new Set(["t-shirts", "round-neck-tshirt", "collar-tshirt"]);
const PACKAGING_PRODUCT_SLUGS = new Set(["packaging-box", "pizza-boxes", "shipping-boxes", "mailer-boxes", "square-shipping-boxes"]);

function buildNavSections(section: "templates" | "apparel" | "packaging") {
  return [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: false, count: null as number | null },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: section === "templates", count: null as number | null },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: section === "apparel", count: null as number | null },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: section === "packaging", count: null as number | null },
        { label: "Categories", icon: "📁", href: "#", active: false, count: null as number | null },
        { label: "Reviews", icon: "💬", href: "#", active: false, count: 3 as number | null },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "#", active: false, count: 12 as number | null },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: false, count: null as number | null },
        { label: "Analytics", icon: "📊", href: "#", active: false, count: null as number | null },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Settings", icon: "⚙️", href: "#", active: false, count: null as number | null },
      ],
    },
  ];
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ productSlug: string; galleryId: string }>;
}) {
  const { productSlug, galleryId } = await params;
  const section = APPAREL_PRODUCT_SLUGS.has(productSlug) ? "apparel" : PACKAGING_PRODUCT_SLUGS.has(productSlug) ? "packaging" : "templates";
  const navSections = buildNavSections(section);
  const backHref = section === "apparel" ? "/admin/apparel" : section === "packaging" ? "/admin/packaging" : "/admin/templates";
  const backLabel = section === "apparel" ? "Apparel" : section === "packaging" ? "Packaging" : "Printing";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f8f9fc" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/applogo.jpeg" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>WE PRINT</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#f97316", lineHeight: 1.1 }}>N PACK</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 8px", marginBottom: 6, display: "block" }}>
                {section.title}
              </span>
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    borderRadius: 10, textDecoration: "none", marginBottom: 2, fontSize: "0.875rem",
                    fontWeight: item.active ? 600 : 500,
                    background: item.active ? "linear-gradient(135deg, #f97316, #ef4444, #6366f1)" : "transparent",
                    color: item.active ? "#fff" : "#374151",
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                  {item.count !== null && (
                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, borderRadius: 20, padding: "1px 7px", background: item.active ? "rgba(255,255,255,0.25)" : "#f3f4f6", color: item.active ? "#fff" : "#6b7280" }}>
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>


        {/* Profile */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f97316, #ef4444, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
            JD
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>John Doe</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Admin</div>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#f8f9fc", border: "1px solid #f0f0f0", borderRadius: 10, padding: "9px 14px" }}>
            <span style={{ color: "#9ca3af", fontSize: "0.95rem" }}>🔍</span>
            <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Search anything...</span>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            🔔
            <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              DASHBOARD / ADMIN / {backLabel.toUpperCase()}
            </p>
            <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
              Design <span style={{ color: "#f97316" }}>Templates</span>
            </h1>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>
              <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
              {" › "}
              <Link href="/admin" style={{ color: "#9ca3af", textDecoration: "none" }}>Admin</Link>
              {" › "}
              <Link href={backHref} style={{ color: "#9ca3af", textDecoration: "none" }}>{backLabel}</Link>
              {" › "}
              <span>Gallery</span>
            </p>
          </div>

          <AdminGalleryDetail productSlug={productSlug} galleryId={galleryId} />
        </main>
      </div>
    </div>
  );
}
