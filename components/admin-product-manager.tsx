"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import { categories, groupProductsByCatalog, LISTING_ALLOWED_CATEGORIES, LISTING_EXCLUDED_SLUGS } from "@/lib/data";
import { usePathname } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";
import type { Product } from "@/lib/types";

type ProductFormState = {
  slug: string;
  name: string;
  category: string;
  image: string;
  imageName: string;
  description: string;
  startingPrice: string;
  specs: string;
  subProducts: string[];
};

const emptyForm = (category = categories[0]?.slug ?? ""): ProductFormState => ({
  slug: "",
  name: "",
  category,
  image: "",
  imageName: "",
  description: "",
  startingPrice: "",
  specs: "",
  subProducts: [],
});

function specsToText(specs: Product["specs"]) {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}

function parseSpecsText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return { label: line, value: line };
      const label = line.slice(0, separator).trim();
      const specValue = line.slice(separator + 1).trim();
      if (!label || !specValue) return null;
      return { label, value: specValue };
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}


const recentOrders = [
  { id: "#1024", name: "Emma Johnson", amount: "$236.00", status: "Completed", color: "#22c55e", bg: "#f0fdf4" },
  { id: "#1023", name: "Michael Brown", amount: "$125.50", status: "Processing", color: "#7c3aed", bg: "#fff7ed" },
  { id: "#1022", name: "Sophia Davis", amount: "$89.00", status: "Shipped", color: "#3b82f6", bg: "#eff6ff" },
  { id: "#1021", name: "James Wilson", amount: "$310.00", status: "Completed", color: "#22c55e", bg: "#f0fdf4" },
];

const recentActivity = [
  { icon: "📦", title: "New product added", sub: "Premium Business Cards", time: "2 mins ago", color: "#7c3aed", bg: "#f5f3ff" },
  { icon: "🏷️", title: "Category updated", sub: "Marketing Materials", time: "15 mins ago", color: "#06b6d4", bg: "#ecfeff" },
  { icon: "🛍️", title: "Order #1024 completed", sub: "Emma Johnson", time: "1 hour ago", color: "#7c3aed", bg: "#fff7ed" },
  { icon: "⭐", title: "New review received", sub: "Premium Business Cards", time: "2 hours ago", color: "#eab308", bg: "#fefce8" },
];

// SVG chart path points (x, y) for a smooth sales wave
const chartData = [
  { x: 0,   y: 148, label: "May 16" },
  { x: 100, y: 160, label: "May 17" },
  { x: 200, y: 100, label: "May 18" },
  { x: 300, y: 135, label: "May 19" },
  { x: 400, y: 55,  label: "May 20" },
  { x: 500, y: 100, label: "May 21" },
  { x: 600, y: 85,  label: "May 22" },
];

function buildSmoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

const linePath = buildSmoothPath(chartData);
const fillPath = linePath + ` L 600,200 L 0,200 Z`;

type AdminProductManagerProps = {
  initialProducts: Product[];
};

export function AdminProductManager({ initialProducts }: AdminProductManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [saving, setSaving] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  type StatsData = {
    ordersToday: number;
    totalOrdersAll: number;
    revenueToday: number;
    totalOrders: number;
    recentOrders: Array<{ customer_name: string; customer_email: string; amount_total: number; production_status: string; created_at: string; stripe_session_id: string | null; id: string }>;
  };
  const [stats, setStats] = useState<StatsData>({ ordersToday: 0, revenueToday: 0, totalOrders: 0, totalOrdersAll: 0, recentOrders: [] });

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json() as StatsData;
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load products.");
      const data = (await response.json()) as { products: Product[] };
      setProducts(data.products || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  function startCreate() {
    setEditingSlug(null);
    setForm(emptyForm(categories[0]?.slug ?? ""));
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function startEdit(product: Product) {
    setEditingSlug(product.slug);
    setIsFormOpen(true);
    setForm({
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      imageName: "Existing image",
      description: product.description,
      startingPrice: product.startingPrice,
      specs: specsToText(product.specs),
      subProducts: product.subProducts ?? [],
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const parsedSpecs = parseSpecsText(form.specs);
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category,
      image: form.image.trim(),
      description: form.description.trim(),
      startingPrice: form.startingPrice.trim(),
      subProducts: form.subProducts,
      specs: parsedSpecs.length > 0 ? parsedSpecs : [{ label: "Details", value: form.description.trim() }],
    };
    try {
      const response = await fetch(
        editingSlug ? `/api/products/${editingSlug}` : "/api/products",
        { method: editingSlug ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = (await response.json()) as { product?: Product; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save product.");
      setMessage(editingSlug ? "Product updated." : "Product created.");
      await loadProducts();
      setIsFormOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, image: dataUrl, imageName: file.name }));
  }

  const visibleProducts = products.filter((p) => LISTING_ALLOWED_CATEGORIES.has(p.category) && !LISTING_EXCLUDED_SLUGS.has(p.slug));
  const deduplicatedProducts = visibleProducts.reduce<Product[]>((acc, p) => {
    if (p.category === "flyers") return acc;
    if (p.category === "t-shirts") {
      if (!acc.some((x) => x.category === "t-shirts")) acc.push({ ...p, name: "T-Shirts" });
    } else {
      acc.push(p);
    }
    return acc;
  }, []);
  const productCount = deduplicatedProducts.length;
  const groupedProducts = groupProductsByCatalog(deduplicatedProducts);
  const latestUpdatedAt = products
    .map((p) => p.updatedAt || p.createdAt || "")
    .filter(Boolean).sort().at(-1);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    shell: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f8f9fc" } as React.CSSProperties,
    sidebar: { width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" } as React.CSSProperties,
    logoBox: { padding: "20px 20px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
    nav: { flex: 1, padding: "16px 12px", overflowY: "auto" } as React.CSSProperties,
    navSection: { marginBottom: 24 } as React.CSSProperties,
    navTitle: { fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.09em", padding: "0 8px", marginBottom: 6, display: "block" },
    navItem: (active: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
      borderRadius: 10, textDecoration: "none", marginBottom: 2, fontSize: "0.875rem",
      fontWeight: active ? 600 : 500,
      background: active ? "linear-gradient(135deg, #7c3aed, #db2777, #f97316)" : "transparent",
      color: active ? "#fff" : "#374151", cursor: "pointer",
    }),
    navCount: (active: boolean): React.CSSProperties => ({
      marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, borderRadius: 20,
      padding: "1px 7px", background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6",
      color: active ? "#fff" : "#6b7280",
    }),
    upgradeCard: {
      margin: "0 12px 12px", borderRadius: 16, padding: "18px 16px",
      background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)",
      color: "#fff",
    } as React.CSSProperties,
    profileRow: {
      padding: "14px 16px", borderTop: "1px solid #f5f5f5",
      display: "flex", alignItems: "center", gap: 10,
    } as React.CSSProperties,
    avatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 } as React.CSSProperties,
    mainArea: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } as React.CSSProperties,
    topBar: { background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 } as React.CSSProperties,
    searchBox: { flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#f8f9fc", border: "1px solid #f0f0f0", borderRadius: 10, padding: "9px 14px" } as React.CSSProperties,
    content: { flex: 1, overflowY: "auto", padding: "28px 32px" } as React.CSSProperties,
    pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 } as React.CSSProperties,
    metricGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 } as React.CSSProperties,
    metricCard: (color: string): React.CSSProperties => ({
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderTop: `4px solid ${color}`,
      display: "flex", alignItems: "flex-start", gap: 16,
    }),
    metricIcon: (bg: string): React.CSSProperties => ({
      width: 44, height: 44, borderRadius: 12, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0,
    }),
    chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 } as React.CSSProperties,
    panel: { background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } as React.CSSProperties,
    panelTitle: { fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 } as React.CSSProperties,
    tableHead: { display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.9fr", padding: "10px 16px", background: "#f8f9fc", borderRadius: 10, marginBottom: 4 } as React.CSSProperties,
    tableHeadCell: { fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.06em" },
    tableRow: { display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.9fr", padding: "12px 16px", alignItems: "center", borderBottom: "1px solid #f9fafb" } as React.CSSProperties,
    productThumb: { width: 40, height: 40, borderRadius: 8, objectFit: "cover" as const, background: "#f3f4f6", flexShrink: 0 } as React.CSSProperties,
    editBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#374151" } as React.CSSProperties,
    btnPrimary: { display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", border: "none", borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" } as React.CSSProperties,
    btnOutline: { display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#374151", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" } as React.CSSProperties,
  };

  const navItems = [
    { label: "Category listing", href: "/admin", count: productCount, active: pathname === "/admin" },
    { label: "Templates", href: "/admin/templates", count: null, active: pathname === "/admin/templates" },
    { label: "Reviews", href: "/admin/reviews", count: null, active: pathname === "/admin/reviews" },
  ];

  const metrics = [
    { label: "Total Products", value: productCount, icon: "🛍️", color: "#7c3aed", iconBg: "#f5f3ff", trend: `${productCount} active listings`, trendColor: "#22c55e" },
    { label: "Orders Today", value: stats.ordersToday, icon: "📦", color: "#7c3aed", iconBg: "#fff7ed", trend: `${stats.totalOrders} total orders`, trendColor: "#22c55e" },
    { label: "Revenue (Today)", value: `$${stats.revenueToday.toFixed(2)}`, icon: "💰", color: "#ec4899", iconBg: "#fdf2f8", trend: stats.revenueToday > 0 ? "Paid orders today" : "No revenue today", trendColor: stats.revenueToday > 0 ? "#22c55e" : "#9ca3af" },
  ];

  return (
    <div style={S.shell}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.logoBox}>
          <img src="/images/applogo.jpeg" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>WE PRINT</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1 }}>N PACK</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={S.nav}>
          <div style={S.navSection}>
            <span style={S.navTitle}>Catalogue</span>
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} style={S.navItem(item.active)}>
                <span style={{ fontSize: "1rem" }}>
                  {item.label === "Category listing" ? "🗂️" : item.label === "Templates" ? "🎨" : "💬"}
                </span>
                {item.label}
                {item.count !== null && (
                  <span style={S.navCount(item.active)}>{item.count}</span>
                )}
              </Link>
            ))}
          </div>

          <div style={S.navSection}>
            <span style={S.navTitle}>Commerce</span>
            {[
              { label: "Orders", icon: "🛒", count: stats.totalOrdersAll || null, href: "/admin/orders" },
              { label: "Customers", icon: "👥", count: null, href: "/admin/customers" },
              { label: "Analytics", icon: "📊", count: null, href: "#" },
            ].map((item) => (
              <a key={item.label} href={item.href} style={S.navItem(false)}>
                <span>{item.icon}</span>
                {item.label}
                {item.count !== null && <span style={S.navCount(false)}>{item.count}</span>}
              </a>
            ))}
          </div>

          <div style={S.navSection}>
            <span style={S.navTitle}>System</span>
            <a href="#" style={S.navItem(false)}><span>⚙️</span>Settings</a>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{ ...S.navItem(false), width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent" }}
            >
              <span>🚪</span>Logout
            </button>
          </div>
        </nav>


        {/* Profile */}
        <div style={S.profileRow}>
          <div style={S.avatar}>JD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>John Doe</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Admin</div>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={S.mainArea}>
        {/* Top bar */}
        <header style={S.topBar}>
          <div style={S.searchBox}>
            <span style={{ color: "#9ca3af", fontSize: "0.95rem" }}>🔍</span>
            <input
              type="text"
              placeholder="Search anything..."
              style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", color: "#374151", flex: 1 }}
            />
          </div>
          <AdminNotificationBell />
        </header>

        {/* Scrollable content */}
        <main style={S.content}>
          {/* Page header */}
          <div style={S.pageHeader}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                DASHBOARD / ADMIN
              </p>
              <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
                Admin <span style={{ color: "#7c3aed" }}>Dashboard</span>
              </h1>
              <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#9ca3af" }}>
                <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
                {" › "}Admin Dashboard
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                Welcome back, John! Here&apos;s what&apos;s happening with your store today.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => void loadProducts()} style={{ ...S.btnOutline, background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", color: "#fff", border: "none" }}>
                <span>🔄</span> Sync
              </button>
              <button onClick={() => void loadProducts()} style={{ ...S.btnOutline, background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "#fff", border: "none" }}>
                <span>↺</span> Refresh
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {(message || error) && (
            <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 20, background: error ? "#fef2f2" : "#f0fdf4", color: error ? "#dc2626" : "#16a34a", border: `1px solid ${error ? "#fecaca" : "#bbf7d0"}`, fontSize: "0.875rem", fontWeight: 500 }}>
              {error || message}
            </div>
          )}

          {/* Metric cards */}
          <div style={S.metricGrid}>
            {metrics.map((m) => (
              <div key={m.label} style={S.metricCard(m.color)}>
                <div style={S.metricIcon(m.iconBg)}>{m.icon}</div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#111827", lineHeight: 1, marginBottom: 8 }}>{m.value}</div>
                  <div style={{ fontSize: "0.75rem", color: m.trendColor, fontWeight: 500 }}>{m.trend}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Category Listing */}
          <div style={{ ...S.panel, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Category Listing</h2>
                <span style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>
                  {loading ? "Loading..." : `${productCount} records`}
                </span>
              </div>
            </div>

            {/* Table header */}
            <div style={S.tableHead}>
              <span style={S.tableHeadCell}>Product</span>
              <span style={S.tableHeadCell}>Updated</span>
              <span style={S.tableHeadCell}>Actions</span>
            </div>

            {/* Scrollable rows */}
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {loading && (
                <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>Loading products…</div>
              )}
              {!loading && groupedProducts.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>No products yet.</div>
              )}
              {groupedProducts.flatMap((group) =>
                group.products.map((product, idx) => {
                  return (
                    <div key={product.slug} style={{ ...S.tableRow, background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      {/* Product */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {product.image ? (
                          <img src={product.image} alt={product.name} style={S.productThumb} />
                        ) : (
                          <div style={{ ...S.productThumb, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🖼️</div>
                        )}
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{product.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{product.slug}</div>
                        </div>
                      </div>
                      {/* Updated */}
                      <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>{formatDate(product.updatedAt || product.createdAt)}</span>
                      {/* Actions */}
                      <div>
                        <button onClick={() => startEdit(product)} style={S.editBtn}>
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #f3f4f6", marginTop: 8 }}>
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{productCount} total products</span>
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Last updated: {formatDate(latestUpdatedAt)}</span>
            </div>
          </div>

          {/* Charts row */}
          <div style={S.chartsRow}>
            {/* Sales Overview */}
            <div style={{ ...S.panel, gridColumn: "1 / 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={S.panelTitle}>Sales Overview</h3>
                <select style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 10px", fontSize: "0.8rem", color: "#374151", background: "#fff", cursor: "pointer" }}>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>
              <svg viewBox="0 0 620 220" style={{ width: "100%", height: 160, overflow: "visible" }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="60%" stopColor="#db2777" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                {[0, 50, 100, 150, 200].map((y, i) => (
                  <g key={y}>
                    <line x1="0" y1={y} x2="600" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x="-8" y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                      {["2K", "1.5K", "1K", "500", "0"][i]}
                    </text>
                  </g>
                ))}
                <path d={fillPath} fill="url(#chartGrad)" />
                <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="400" cy="55" r="5" fill="#db2777" />
                <rect x="355" y="28" width="90" height="22" rx="6" fill="#1f2937" />
                <text x="400" y="43" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="600">$1,450 · May 20</text>
                {chartData.map((pt) => (
                  <text key={pt.label} x={pt.x} y="215" textAnchor="middle" fontSize="10" fill="#9ca3af">{pt.label}</text>
                ))}
              </svg>
            </div>

            {/* Recent Orders */}
            <div style={S.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={S.panelTitle}>Recent Orders</h3>
                <Link href="/admin/orders" style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>View All</Link>
              </div>
              {stats.recentOrders.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: "#9ca3af", margin: 0 }}>No orders yet.</p>
              ) : stats.recentOrders.map((o) => {
                const initials = o.customer_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                const shortId = o.stripe_session_id?.slice(-8) ?? o.id.slice(0, 8);
                const statusMap: Record<string, { color: string; bg: string }> = {
                  pending:    { color: "#b45309", bg: "#fef3c7" },
                  production: { color: "#1d4ed8", bg: "#dbeafe" },
                  completed:  { color: "#065f46", bg: "#d1fae5" },
                };
                const sc = statusMap[o.production_status] ?? statusMap.pending;
                return (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827" }}>#{shortId}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{o.customer_name}</div>
                    </div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>${o.amount_total.toFixed(2)}</div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: sc.color, background: sc.bg, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>{o.production_status}</span>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div style={S.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={S.panelTitle}>Recent Activity</h3>
                <a href="#" style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>View All</a>
              </div>
              {recentActivity.map((a) => (
                <div key={a.title} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f9fafb" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827" }}>{a.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{a.sub}</div>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", whiteSpace: "nowrap" }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Edit / Create Modal ─────────────────────────────────────────── */}
      {isFormOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setIsFormOpen(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
                  {editingSlug ? "Edit Product" : "New Product"}
                </h2>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>{editingSlug ?? "New catalog item"}</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Image */}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Image</span>
                <input
                  required={!editingSlug}
                  accept="image/*"
                  type="file"
                  onChange={(e) => { void handleImageChange(e); }}
                  style={{ fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{form.imageName || "Upload from your computer"}</span>
                {form.image && (
                  <img src={form.image} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                )}
              </label>

              {/* Starting price */}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Starting Price</span>
                <input
                  required
                  value={form.startingPrice}
                  onChange={(e) => setForm((c) => ({ ...c, startingPrice: e.target.value }))}
                  placeholder="$180"
                  style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.875rem", outline: "none" }}
                />
              </label>

              {/* Description */}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Description</span>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Product description…"
                  style={{ padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.875rem", resize: "vertical", outline: "none" }}
                />
              </label>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} style={{ ...S.btnPrimary, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : editingSlug ? "Update Product" : "Create Product"}
                </button>
                <button type="button" onClick={startCreate} style={{ ...S.btnOutline, flex: "0 0 auto" }}>
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 380, width: "90%",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)", textAlign: "center",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚪</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Do you want to logout?</h2>
            <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: "0.875rem" }}>You will be redirected to the admin login page.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                style={{
                  padding: "11px 32px", border: "none", borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                  color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: loggingOut ? "not-allowed" : "pointer",
                }}
              >
                {loggingOut ? "Logging out…" : "Yes"}
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: "11px 32px", border: "1.5px solid #e5e7eb", borderRadius: 10,
                  background: "#fff", color: "#374151", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
