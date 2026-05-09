import AdminDesignColors from "@/components/admin-design-colors";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DesignColorsPage({
  params,
}: {
  params: Promise<{ productSlug: string; galleryId: string; designId: string }>;
}) {
  const { productSlug, galleryId, designId } = await params;

  const sidebarSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Product listing", href: "/admin", active: false },
        { label: "Templates", href: "/admin/templates", active: true },
        { label: "Categories", href: "/admin#admin-categories", active: false },
        { label: "Reviews", href: "/admin#admin-reviews", active: false },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", href: "/admin#admin-orders", active: false },
        { label: "Inventory", href: "/admin#admin-inventory", active: false },
        { label: "Customers", href: "/admin#admin-customers", active: false },
        { label: "Analytics", href: "/admin#admin-analytics", active: false },
      ],
    },
    {
      title: "System",
      items: [{ label: "Settings", href: "/admin#admin-settings", active: false }],
    },
  ];

  return (
    <section className="section admin-page">
      <div className="container container-wide admin-shell">
        <aside className="admin-sidebar">
          {sidebarSections.map((section) => (
            <div className="admin-sidebar-section" key={section.title}>
              <p className="admin-sidebar-title">{section.title}</p>
              <div className="admin-sidebar-links">
                {section.items.map((item) => (
                  <Link
                    className={`admin-sidebar-link ${item.active ? "is-active" : ""}`}
                    href={item.href}
                    key={item.label}
                  >
                    <span className="admin-sidebar-icon" aria-hidden="true" />
                    <span className="admin-sidebar-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="admin-main">
          <header className="admin-page-header">
            <div>
              <p className="admin-page-kicker">DASHBOARD / ADMIN / TEMPLATES</p>
              <h1>
                Color <span>Variants</span>
              </h1>
              <p className="admin-breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">›</span>
                <Link href="/admin">Admin</Link>
                <span aria-hidden="true">›</span>
                <Link href="/admin/templates">Templates</Link>
                <span aria-hidden="true">›</span>
                <Link href={`/admin/templates/${productSlug}/${galleryId}`}>Gallery</Link>
                <span aria-hidden="true">›</span>
                <span>Design Colors</span>
              </p>
            </div>
          </header>

          <AdminDesignColors productSlug={productSlug} galleryId={galleryId} designId={designId} />
        </div>
      </div>
    </section>
  );
}
