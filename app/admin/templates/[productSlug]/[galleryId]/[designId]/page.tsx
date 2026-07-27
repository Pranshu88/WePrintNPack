import AdminDesignColors from "@/components/admin-design-colors";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DesignColorsPage({
  params,
}: {
  params: Promise<{ productSlug: string; galleryId: string; designId: string }>;
}) {
  const { productSlug, galleryId, designId } = await params;
  const isApparel = productSlug === "t-shirts" || productSlug === "round-neck-tshirt" || productSlug === "collar-tshirt";
  const isPackaging = ["packaging-box", "pizza-boxes", "shipping-boxes", "mailer-boxes", "square-shipping-boxes"].includes(productSlug);

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: false },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: !isApparel && !isPackaging },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: isApparel },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: isPackaging },
        { label: "Categories", icon: "📁", href: "#", active: false },
        { label: "Reviews", icon: "💬", href: "#", active: false },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: false },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: false },
        { label: "Analytics", icon: "📊", href: "#", active: false },
      ],
    },
    {
      title: "System",
      items: [{ label: "Settings", icon: "⚙️", href: "#", active: false }],
    },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f8f9fc" }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/images/applogo.jpeg" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>WE PRINT</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1 }}>N PACK</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.09em", padding: "0 8px", marginBottom: 6, display: "block" }}>
                {section.title}
              </span>
              {section.items.map((item) => (
                <Link key={item.label} href={item.href} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, textDecoration: "none", marginBottom: 2,
                  fontSize: "0.875rem", fontWeight: item.active ? 600 : 500,
                  background: item.active ? "linear-gradient(135deg, #7c3aed, #db2777, #f97316)" : "transparent",
                  color: item.active ? "#fff" : "#374151",
                }}>
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>


        <div style={{ padding: "14px 16px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>Admin</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500 }}>
              Home &rsaquo; Admin &rsaquo; {isApparel ? "Apparel" : isPackaging ? "Packaging" : "Printing"} &rsaquo; Gallery &rsaquo; Design Colors
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", marginTop: 1 }}>
              Color <span style={{ color: "#7c3aed" }}>Variants</span>
            </div>
          </div>
          <Link
            href={`/admin/templates/${productSlug}/${galleryId}`}
            style={{ fontSize: "0.82rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
          >
            ← Back to Gallery
          </Link>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f8f9fc" }}>
          <AdminDesignColors productSlug={productSlug} galleryId={galleryId} designId={designId} />
        </div>
      </div>
    </div>
  );
}
