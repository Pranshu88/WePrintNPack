"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";

interface QuoteRequest {
  id: string;
  reference_no: string | null;
  name: string;
  phone: string;
  email: string;
  product: string;
  quantity: string;
  message: string;
  file_name: string;
  file_url: string;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(name);
}

const STATUS_LABEL: Record<QuoteRequest["status"], string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

const STATUS_COLOR: Record<QuoteRequest["status"], { bg: string; fg: string }> = {
  new: { bg: "#eef2ff", fg: "#4f46e5" },
  contacted: { bg: "#fef9c3", fg: "#a16207" },
  closed: { bg: "#dcfce7", fg: "#15803d" },
};

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

export function AdminQuotesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [newQuoteCount, setNewQuoteCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | QuoteRequest["status"]>("all");
  const [detail, setDetail] = useState<QuoteRequest | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: pathname === "/admin", count: null as number | null },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates", count: null },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: pathname === "/admin/apparel", count: null },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: pathname === "/admin/packaging", count: null },
        { label: "Mockup", icon: "🖼️", href: "/admin/mockup", active: pathname === "/admin/mockup", count: null },
        { label: "Reviews", icon: "💬", href: "/admin/reviews", active: pathname === "/admin/reviews", count: null },
      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: pathname === "/admin/orders", count: orderCount },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: pathname === "/admin/customers", count: null },
        { label: "Quotes", icon: "📝", href: "/admin/quotes", active: pathname === "/admin/quotes", count: newQuoteCount },
        { label: "Analytics", icon: "📊", href: "#", active: false, count: null },
      ],
    },
    {
      title: "System",
      items: [{ label: "Settings", icon: "⚙️", href: "#", active: false, count: null }],
    },
  ];

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quotes", { cache: "no-store" });
      const data = (await res.json()) as { quotes?: QuoteRequest[] };
      setQuotes(data.quotes ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { totalOrdersAll?: number; newQuotes?: number }) => {
        if (d.totalOrdersAll != null) setOrderCount(d.totalOrdersAll);
        if (d.newQuotes != null) setNewQuoteCount(d.newQuotes);
      })
      .catch(() => {});
  }, [fetchQuotes]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this quote request? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      if (detail?.id === id) setDetail(null);
      await fetchQuotes();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(id: string, status: QuoteRequest["status"]) {
    setUpdatingId(id);
    try {
      await fetch(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchQuotes();
      setDetail((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-CA", {
      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  }

  const productOptions = Array.from(new Set(quotes.map((q) => q.product))).sort();

  const filteredQuotes = quotes.filter((q) => {
    if (productFilter !== "all" && q.product !== productFilter) return false;
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return [q.name, q.email, q.phone, q.product, q.reference_no ?? ""].some((v) => v.toLowerCase().includes(s));
  });

  function exportCsv() {
    const cols = ["Reference #", "Name", "Email", "Phone", "Product", "Quantity", "Message", "Status", "Submitted"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filteredQuotes.map((q) => [
      q.reference_no ?? "", q.name, q.email, q.phone, q.product, q.quantity, q.message, STATUS_LABEL[q.status], formatDate(q.created_at),
    ].map(escape).join(","));
    const csv = [cols.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              {section.items.map((item) => (
                <Link key={item.label} href={item.href} style={S.navItem(item.active)}>
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                  {item.count !== null && (
                    <span style={S.navCount(item.active)}>{item.count}</span>
                  )}
                </Link>
              ))}
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
              placeholder="Search by reference #, name, email, phone, product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              Quote <span style={{ color: "#7c3aed" }}>Requests</span>
            </h1>
            <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "#9ca3af" }}>
              <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>Home</Link>
              {" › "}
              <Link href="/admin" style={{ color: "#9ca3af", textDecoration: "none" }}>Admin</Link>
              {" › "}Quotes
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
              Everyone who submitted the &quot;Get a Quote&quot; form, with their contact details.
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
              📝
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
                {quotes.length}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 2 }}>
                Total Quote Requests
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}
            >
              <option value="all">All Products</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.85rem", color: "#374151", fontWeight: 600 }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
            </select>
            {(productFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => { setProductFilter("all"); setStatusFilter("all"); }}
                style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#7c3aed", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
              >
                Clear filters
              </button>
            )}
            <button
              onClick={exportCsv}
              disabled={filteredQuotes.length === 0}
              style={{
                marginLeft: "auto", padding: "9px 16px", borderRadius: 10, border: "none",
                background: filteredQuotes.length === 0 ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #db2777)",
                color: filteredQuotes.length === 0 ? "#9ca3af" : "#fff",
                fontSize: "0.85rem", fontWeight: 700, cursor: filteredQuotes.length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV ({filteredQuotes.length})
            </button>
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
            <div
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
                padding: "14px 20px",
              }}
            >
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
                All Quote Requests
              </span>
            </div>

            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
                Loading quote requests…
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div style={{ padding: "64px 48px", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📝</div>
                <p style={{ color: "#9ca3af", fontSize: "0.95rem", margin: 0 }}>
                  {quotes.length === 0 ? "No quote requests yet" : "No quote requests match your search"}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fc", borderBottom: "1px solid #f0f0f0" }}>
                      {["Reference #", "Name", "Contact", "Product", "Qty", "File", "Status", "Submitted", "Actions"].map((col) => (
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
                    {filteredQuotes.map((q, i) => {
                      const sc = STATUS_COLOR[q.status];
                      return (
                        <tr
                          key={q.id}
                          onClick={() => setDetail(q)}
                          style={{
                            borderBottom: i < filteredQuotes.length - 1 ? "1px solid #f5f5f5" : "none",
                            transition: "background 0.1s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "#fafafa")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                        >
                          <td style={{ padding: "13px 16px", fontFamily: "monospace", fontSize: "0.8rem", color: "#7c3aed", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {q.reference_no || "—"}
                          </td>
                          <td style={{ padding: "13px 16px", fontWeight: 600, color: "#111827" }}>{q.name}</td>
                          <td style={{ padding: "13px 16px", color: "#374151" }}>
                            <div>{q.email}</div>
                            <div style={{ color: "#9ca3af", fontSize: "0.78rem" }}>{q.phone}</div>
                          </td>
                          <td style={{ padding: "13px 16px", color: "#374151" }}>{q.product}</td>
                          <td style={{ padding: "13px 16px", color: "#6b7280" }}>{q.quantity}</td>
                          <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                            {!q.file_url ? (
                              <span style={{ color: "#d1d5db" }}>—</span>
                            ) : isImageFile(q.file_name) ? (
                              <button
                                onClick={() => setLightbox(q.file_url)}
                                title={q.file_name}
                                style={{ padding: 0, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", width: 36, height: 36, cursor: "pointer", background: "#fff" }}
                              >
                                <img src={q.file_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </button>
                            ) : (
                              <a
                                href={q.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={q.file_name}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, border: "1px solid #e5e7eb", borderRadius: 8, color: "#7c3aed", textDecoration: "none", fontSize: "1rem" }}
                              >
                                📄
                              </a>
                            )}
                          </td>
                          <td style={{ padding: "13px 16px" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, background: sc.bg, color: sc.fg }}>
                              {STATUS_LABEL[q.status]}
                            </span>
                          </td>
                          <td style={{ padding: "13px 16px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {formatDate(q.created_at)}
                          </td>
                          <td style={{ padding: "13px 16px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(q.id)}
                              disabled={deletingId === q.id}
                              style={{
                                padding: "6px 14px",
                                border: "1px solid #fee2e2",
                                borderRadius: 8,
                                background: deletingId === q.id ? "#f9fafb" : "#fff",
                                color: deletingId === q.id ? "#9ca3af" : "#ef4444",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                cursor: deletingId === q.id ? "not-allowed" : "pointer",
                              }}
                            >
                              {deletingId === q.id ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", justifyContent: "flex-end" }} onClick={() => setDetail(null)}>
          <div style={{ background: "#fff", width: 420, maxWidth: "100%", height: "100%", overflowY: "auto", padding: "28px 26px", boxShadow: "-8px 0 32px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                {detail.reference_no && (
                  <div style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>{detail.reference_no}</div>
                )}
                <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 800, color: "#111827" }}>{detail.name}</h2>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#9ca3af" }}>{formatDate(detail.created_at)}</p>
              </div>
              <button onClick={() => setDetail(null)} style={{ border: "none", background: "#f3f4f6", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "1rem", color: "#6b7280" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Email", value: <a href={`mailto:${detail.email}`} style={{ color: "#7c3aed" }}>{detail.email}</a> },
                { label: "Phone", value: <a href={`tel:${detail.phone}`} style={{ color: "#7c3aed" }}>{detail.phone}</a> },
                { label: "Product", value: detail.product },
                { label: "Quantity", value: detail.quantity },
                { label: "Message", value: detail.message || "—" },
                {
                  label: "Attached file",
                  value: !detail.file_url
                    ? (detail.file_name || "—")
                    : isImageFile(detail.file_name)
                      ? (
                        <button
                          onClick={() => setLightbox(detail.file_url)}
                          style={{ padding: 0, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", width: 140, height: 100, cursor: "pointer", background: "#fff" }}
                        >
                          <img src={detail.file_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                      )
                      : (
                        <a href={detail.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed" }}>
                          📄 {detail.file_name || "View file"}
                        </a>
                      ),
                },
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: "0.9rem", color: "#111827" }}>{row.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, borderTop: "1px solid #f3f4f6", paddingTop: 20 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Status</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["new", "contacted", "closed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(detail.id, st)}
                    disabled={updatingId === detail.id}
                    style={{
                      padding: "7px 14px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 700,
                      border: detail.status === st ? "none" : "1px solid #e5e7eb",
                      background: detail.status === st ? STATUS_COLOR[st].bg : "#fff",
                      color: detail.status === st ? STATUS_COLOR[st].fg : "#6b7280",
                      cursor: updatingId === detail.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }} />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 24, right: 28, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", width: 36, height: 36, borderRadius: "50%", fontSize: "1.1rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

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
