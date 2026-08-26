"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { AdminTemplateSection } from "./admin-template-section";
import AdminNotificationBell from "./admin-notification-bell";

export function AdminTemplatesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }
  const [loading, setLoading] = useState(true);
  const openAddRef = useRef<(() => void) | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => setProducts(data.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { totalOrdersAll?: number }) => { if (d.totalOrdersAll != null) setOrderCount(d.totalOrdersAll as number); })
      .catch(() => {});
  }, []);

  const S = {
    shell: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f8f9fc" } as React.CSSProperties,
    sidebar: { width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column" as const, flexShrink: 0, overflow: "hidden" } as React.CSSProperties,
    logoBox: { padding: "20px 20px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    nav: { flex: 1, padding: "16px 12px", overflowY: "auto" as const } as React.CSSProperties,
    navSection: { marginBottom: 24 } as React.CSSProperties,
    navTitle: { fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.09em", padding: "0 8px", marginBottom: 6, display: "block" },
    navItem: (active: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
      borderRadius: 10, textDecoration: "none", marginBottom: 2, fontSize: "0.875rem",
      fontWeight: active ? 600 : 500,
      background: active ? "linear-gradient(135deg, #7c3aed, #db2777, #f97316)" : "transparent",
      color: active ? "#fff" : "#374151",
    }),
    navCount: (active: boolean): React.CSSProperties => ({
      marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, borderRadius: 20,
      padding: "1px 7px", background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6",
      color: active ? "#fff" : "#6b7280",
    }),
    upgradeCard: { margin: "0 12px 12px", borderRadius: 16, padding: "18px 16px", background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)", color: "#fff" } as React.CSSProperties,
    profileRow: { padding: "14px 16px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    avatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 } as React.CSSProperties,
    mainArea: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" } as React.CSSProperties,
    topBar: { background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 } as React.CSSProperties,
    searchBox: { flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#f8f9fc", border: "1px solid #f0f0f0", borderRadius: 10, padding: "9px 14px" } as React.CSSProperties,
    content: { flex: 1, overflowY: "auto" as const, padding: "28px 32px" } as React.CSSProperties,
  };

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: pathname === "/admin", count: null },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates", count: null },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: pathname === "/admin/apparel", count: null },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: pathname === "/admin/packaging", count: null },
        { label: "Mockup", icon: "🖼️", href: "/admin/mockup", active: pathname === "/admin/mockup", count: null },
        { label: "Reviews", icon: "💬", href: "/admin/reviews", active: pathname === "/admin/reviews", count: null },      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: false, count: orderCount },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: false, count: null },
        { label: "Quotes", icon: "📝", href: "/admin/quotes", active: false, count: null },
        { label: "Analytics", icon: "📊", href: "#", active: false, count: null },
      ],
    },
    {
      title: "System",
      items: [{ label: "Settings", icon: "⚙️", href: "#", active: false, count: null }],
    },
  ];

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <img src="/images/applogo.jpeg" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>WE PRINT</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1 }}>N PACK</div>
          </div>
        </div>

        <nav style={S.nav}>
          {navSections.map((section) => (
            <div key={section.title} style={S.navSection}>
              <span style={S.navTitle}>{section.title}</span>
              {section.items.map((item) => (
                <Link key={item.label} href={item.href} style={S.navItem(item.active)}>
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                  {item.count !== null && <span style={S.navCount(item.active)}>{item.count}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div style={S.navSection}>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{ ...S.navItem(false), width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent" }}
            >
              <span>🚪</span>Logout
            </button>
          </div>
        </nav>

        <div style={S.profileRow}>
          <div style={S.avatar}>JD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>John Doe</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Admin</div>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
        </div>
      </aside>

      {/* Main */}
      <div style={S.mainArea}>
        <header style={S.topBar}>
          <AdminNotificationBell />
        </header>

        <main style={S.content}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em" }}>DASHBOARD / ADMIN</p>
              <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
                Product <span style={{ color: "#7c3aed" }}>Templates</span>
              </h1>
              <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#9ca3af" }}>
                <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
                {" › "}
                <Link href="/admin" style={{ color: "#9ca3af", textDecoration: "none" }}>Admin</Link>
                {" › "}Printing
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                Manage gallery templates and design options for each product.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" }}>Loading products…</div>
          ) : (
            <AdminTemplateSection products={products} openAddRef={openAddRef} onlyCategory="business-cards" />
          )}
        </main>
      </div>

      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", width: 320, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Do you want to logout?</h2>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>You will be redirected to the login page.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => void handleLogout()} style={{ padding: "0.5rem 1.4rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ padding: "0.5rem 1.4rem", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
