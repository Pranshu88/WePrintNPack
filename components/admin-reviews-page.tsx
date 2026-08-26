"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";

type Review = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  stars: number;
  comment: string;
  approved: number;
  created_at: string;
};

function Stars({ count }: { count: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: "0.95rem", letterSpacing: 1 }}>
      {"★".repeat(count)}{"☆".repeat(5 - count)}
    </span>
  );
}

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
    color: active ? "#fff" : "#374151", cursor: "pointer",
  }),
  navCount: (active: boolean): React.CSSProperties => ({
    marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, borderRadius: 20,
    padding: "1px 7px", background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6",
    color: active ? "#fff" : "#6b7280",
  }),
  mainArea: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" } as React.CSSProperties,
  topBar: { background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 } as React.CSSProperties,
  content: { flex: 1, overflowY: "auto" as const, padding: "28px 32px" } as React.CSSProperties,
  panel: { background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } as React.CSSProperties,
  upgradeCard: { margin: "0 12px 12px", borderRadius: 16, padding: "18px 16px", background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)", color: "#fff" } as React.CSSProperties,
  profileRow: { padding: "14px 16px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
  avatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 } as React.CSSProperties,
};

export function AdminReviewsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      const data = await res.json() as { reviews: Review[] };
      setReviews(data.reviews ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  async function handleApprove(id: string, approve: boolean) {
    setUpdating(id);
    try {
      await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved: approve }),
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, approved: approve ? 1 : 0 } : r))
      );
    } catch { /* ignore */ }
    setUpdating(null);
  }

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return r.approved === 0;
    if (filter === "approved") return r.approved === 1;
    return true;
  });

  const pendingCount = reviews.filter((r) => r.approved === 0).length;
  const approvedCount = reviews.filter((r) => r.approved === 1).length;

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: pathname === "/admin" },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates" },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: pathname === "/admin/apparel" },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: pathname === "/admin/packaging" },
        { label: "Mockup", icon: "🖼️", href: "/admin/mockup", active: pathname === "/admin/mockup" },
        { label: "Reviews", icon: "⭐", href: "/admin/reviews", active: pathname === "/admin/reviews", count: pendingCount || null },      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: pathname === "/admin/orders" },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: pathname === "/admin/customers" },
        { label: "Quotes", icon: "📝", href: "/admin/quotes", active: pathname === "/admin/quotes" },
        { label: "Analytics", icon: "📊", href: "#", active: false },
      ],
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
                  <span>{item.icon}</span>
                  {item.label}
                  {item.count ? <span style={S.navCount(item.active)}>{item.count}</span> : null}
                </Link>
              ))}
            </div>
          ))}
          <div style={S.navSection}>
            <span style={S.navTitle}>System</span>
            <a href="#" style={S.navItem(false)}><span>⚙️</span>Settings</a>
            <button onClick={() => setShowLogoutConfirm(true)} style={{ ...S.navItem(false), width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent" }}>
              <span>🚪</span>Logout
            </button>
          </div>
        </nav>

        <div style={S.profileRow}>
          <div style={S.avatar}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>Admin</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={S.mainArea}>
        {/* Top bar */}
        <header style={S.topBar}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#f8f9fc", border: "1px solid #f0f0f0", borderRadius: 10, padding: "9px 14px" }}>
            <span style={{ color: "#9ca3af" }}>🔍</span>
            <input type="text" placeholder="Search reviews..." style={{ border: "none", background: "none", outline: "none", fontSize: "0.875rem", color: "#374151", flex: 1 }} />
          </div>
          <AdminNotificationBell />
        </header>

        <main style={S.content}>
          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              DASHBOARD / REVIEWS
            </p>
            <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
              Customer <span style={{ color: "#7c3aed" }}>Reviews</span>
            </h1>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Reviews", value: reviews.length, color: "#7c3aed", bg: "#f5f3ff", icon: "💬" },
              { label: "Pending Approval", value: pendingCount, color: "#f59e0b", bg: "#fef3c7", icon: "⏳" },
              { label: "Approved", value: approvedCount, color: "#10b981", bg: "#d1fae5", icon: "✅" },
            ].map((stat) => (
              <div key={stat.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", borderTop: `4px solid ${stat.color}`, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 1 }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["all", "pending", "approved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: "0.82rem",
                  background: filter === tab ? "linear-gradient(90deg,#7c3aed,#db2777)" : "#f3f4f6",
                  color: filter === tab ? "#fff" : "#374151",
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "pending" && pendingCount > 0 && (
                  <span style={{ marginLeft: 6, background: filter === tab ? "rgba(255,255,255,0.3)" : "#e5e7eb", borderRadius: 10, padding: "1px 6px", fontSize: "0.72rem" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Reviews list */}
          <div style={S.panel}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Loading reviews...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⭐</div>
                <div style={{ color: "#6b7280", fontWeight: 600 }}>No reviews found</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filtered.map((review) => {
                  const date = new Date(review.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
                  const isUpdating = updating === review.id;
                  return (
                    <div key={review.id} style={{
                      border: "1.5px solid",
                      borderColor: review.approved ? "#d1fae5" : "#fef3c7",
                      borderRadius: 12, padding: "16px 18px",
                      background: review.approved ? "#f0fdf4" : "#fffbeb",
                    }}>
                      {/* Header row */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, color: "#111827" }}>{review.customer_name}</span>
                            <Stars count={Number(review.stars)} />
                            <span style={{
                              padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                              background: review.approved ? "#dcfce7" : "#fef3c7",
                              color: review.approved ? "#059669" : "#b45309",
                            }}>
                              {review.approved ? "Approved" : "Pending"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 3 }}>
                            {review.customer_email} &nbsp;·&nbsp; {review.product_name} &nbsp;·&nbsp; {date}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 8 }}>
                          {!review.approved ? (
                            <button
                              onClick={() => handleApprove(review.id, true)}
                              disabled={isUpdating}
                              style={{
                                padding: "7px 16px", border: "none", borderRadius: 8, cursor: isUpdating ? "not-allowed" : "pointer",
                                background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff",
                                fontWeight: 700, fontSize: "0.8rem",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                            >
                              {isUpdating ? "..." : "✓ Approve"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApprove(review.id, false)}
                              disabled={isUpdating}
                              style={{
                                padding: "7px 16px", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: isUpdating ? "not-allowed" : "pointer",
                                background: "#fff", color: "#6b7280",
                                fontWeight: 600, fontSize: "0.8rem",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                            >
                              {isUpdating ? "..." : "Unapprove"}
                            </button>
                          )}
                          <button
                            onClick={() => handleApprove(review.id, false)}
                            disabled={isUpdating}
                            style={{
                              padding: "7px 14px", border: "1.5px solid #fecaca", borderRadius: 8, cursor: isUpdating ? "not-allowed" : "pointer",
                              background: "#fff", color: "#dc2626",
                              fontWeight: 600, fontSize: "0.8rem",
                              opacity: isUpdating ? 0.6 : 1,
                            }}
                            title="Reject"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Comment */}
                      {review.comment && (
                        <div style={{
                          background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "10px 12px",
                          fontSize: "0.88rem", color: "#374151", lineHeight: 1.6,
                          borderLeft: "3px solid #7c3aed",
                        }}>
                          "{review.comment}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
