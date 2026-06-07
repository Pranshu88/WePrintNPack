"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

const S = {
  shell: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#f8f9fc",
  } as React.CSSProperties,
  sidebar: {
    width: 240,
    background: "#fff",
    borderRight: "1px solid #f0f0f0",
    display: "flex",
    flexDirection: "column" as const,
    flexShrink: 0,
    overflow: "hidden",
  } as React.CSSProperties,
  logoBox: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid #f5f5f5",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,
  nav: {
    flex: 1,
    padding: "16px 12px",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  navSection: { marginBottom: 24 } as React.CSSProperties,
  navTitle: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.09em",
    padding: "0 8px",
    marginBottom: 6,
    display: "block",
  },
  navItem: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 10,
    textDecoration: "none",
    marginBottom: 2,
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 500,
    background: active
      ? "linear-gradient(135deg, #7c3aed, #db2777, #f97316)"
      : "transparent",
    color: active ? "#fff" : "#374151",
  }),
  navCount: (active: boolean): React.CSSProperties => ({
    marginLeft: "auto",
    fontSize: "0.7rem",
    fontWeight: 700,
    borderRadius: 20,
    padding: "1px 7px",
    background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6",
    color: active ? "#fff" : "#6b7280",
  }),
  upgradeCard: {
    margin: "0 12px 12px",
    borderRadius: 16,
    padding: "18px 16px",
    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f97316 100%)",
    color: "#fff",
  } as React.CSSProperties,
  profileRow: {
    padding: "14px 16px",
    borderTop: "1px solid #f5f5f5",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  } as React.CSSProperties,
  mainArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  } as React.CSSProperties,
  topBar: {
    background: "#fff",
    borderBottom: "1px solid #f0f0f0",
    padding: "12px 28px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexShrink: 0,
  } as React.CSSProperties,
  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f8f9fc",
    border: "1px solid #f0f0f0",
    borderRadius: 10,
    padding: "9px 14px",
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "28px 32px",
  } as React.CSSProperties,
};

export function AdminCustomersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: pathname === "/admin", count: null },
        { label: "Templates", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates", count: null },
        { label: "Reviews", icon: "💬", href: "/admin/reviews", active: pathname === "/admin/reviews", count: null },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: pathname === "/admin/orders", count: null },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: pathname === "/admin/customers", count: null },
        { label: "Analytics", icon: "📊", href: "#", active: false, count: null },
      ],
    },
    {
      title: "System",
      items: [{ label: "Settings", icon: "⚙️", href: "#", active: false, count: null }],
    },
  ];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = (await res.json()) as { customers?: Customer[] };
      setCustomers(data.customers ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { totalOrdersAll?: number }) => { if (d.totalOrdersAll != null) setOrderCount(d.totalOrdersAll as number); })
      .catch(() => {});
  }, [fetchCustomers]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      await fetchCustomers();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <img
            src="/images/applogo.jpeg"
            alt="Logo"
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }}
          />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
              WE PRINT
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1 }}>
              N PACK
            </div>
          </div>
        </div>

        <nav style={S.nav}>
          {navSections.map((section) => (
            <div key={section.title} style={S.navSection}>
              <span style={S.navTitle}>{section.title}</span>
              {section.items.map((item) => {
                const displayCount = item.label === "Orders" ? orderCount : item.count;
                return (
                  <Link key={item.label} href={item.href} style={S.navItem(item.active)}>
                    <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                    {item.label}
                    {displayCount !== null && (
                      <span style={S.navCount(item.active)}>{displayCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          <div style={S.navSection}>
            <button onClick={() => setShowLogoutConfirm(true)} style={{ ...S.navItem(false), width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent" }}>
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
          <div style={S.searchBox}>
            <span style={{ color: "#9ca3af", fontSize: "0.95rem" }}>🔍</span>
            <input
              type="text"
              placeholder="Search anything..."
              style={{
                border: "none",
                background: "none",
                outline: "none",
                fontSize: "0.875rem",
                color: "#374151",
                flex: 1,
              }}
            />
          </div>
          <AdminNotificationBell />
        </header>

        <main style={S.content}>
          {/* Page header */}
          <div style={{ marginBottom: 28 }}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#7c3aed",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              DASHBOARD / ADMIN
            </p>
            <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
              Customer <span style={{ color: "#7c3aed" }}>Management</span>
            </h1>
            <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "#9ca3af" }}>
              <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
              {" › "}
              <Link href="/admin" style={{ color: "#9ca3af", textDecoration: "none" }}>Admin</Link>
              {" › "}Customers
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
              View and manage registered customers.
            </p>
          </div>

          {/* Stats card */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 14,
              padding: "14px 22px",
              marginBottom: 24,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              👥
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {customers.length}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 2 }}>
                Total Customers
              </div>
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #f0f0f0",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {/* Table header gradient bar */}
            <div
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
                padding: "14px 20px",
              }}
            >
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
                All Customers
              </span>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "48px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "0.9rem",
                }}
              >
                Loading customers…
              </div>
            ) : customers.length === 0 ? (
              <div
                style={{
                  padding: "64px 48px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>👥</div>
                <p style={{ color: "#9ca3af", fontSize: "0.95rem", margin: 0 }}>
                  No customers yet
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fc", borderBottom: "1px solid #f0f0f0" }}>
                      {["Name", "Email", "Phone", "Address", "Joined", "Actions"].map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: "11px 16px",
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: i < customers.length - 1 ? "1px solid #f5f5f5" : "none",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLTableRowElement).style.background = "#fafafa")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")
                        }
                      >
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                flexShrink: 0,
                              }}
                            >
                              {c.first_name[0]?.toUpperCase()}
                              {c.last_name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#111827" }}>
                                {c.first_name} {c.last_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px", color: "#374151" }}>{c.email}</td>
                        <td style={{ padding: "13px 16px", color: "#6b7280" }}>
                          {c.phone || <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#6b7280", maxWidth: 220 }}>
                          {(() => {
                            let addr: { houseNo?: string; flat?: string; city?: string; state?: string } = {};
                            try { addr = JSON.parse(c.address || "{}"); } catch { /* ignore */ }
                            const parts = [addr.houseNo, addr.flat, addr.city, addr.state].filter(Boolean);
                            return parts.length > 0
                              ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {addr.houseNo && <span style={{ fontSize: "0.78rem" }}><strong>Unit:</strong> {addr.houseNo}</span>}
                                  {addr.flat    && <span style={{ fontSize: "0.78rem" }}><strong>Street:</strong> {addr.flat}</span>}
                                  {(addr.city || addr.state) && (
                                    <span style={{ fontSize: "0.78rem" }}><strong>City:</strong> {[addr.city, addr.state].filter(Boolean).join(", ")}</span>
                                  )}
                                </div>
                              )
                              : <span style={{ color: "#d1d5db" }}>—</span>;
                          })()}
                        </td>
                        <td
                          style={{ padding: "13px 16px", color: "#9ca3af", whiteSpace: "nowrap" }}
                        >
                          {formatDate(c.created_at)}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                            style={{
                              padding: "6px 14px",
                              border: "1px solid #fee2e2",
                              borderRadius: 8,
                              background: deletingId === c.id ? "#f9fafb" : "#fff",
                              color: deletingId === c.id ? "#9ca3af" : "#ef4444",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: deletingId === c.id ? "not-allowed" : "pointer",
                            }}
                          >
                            {deletingId === c.id ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
