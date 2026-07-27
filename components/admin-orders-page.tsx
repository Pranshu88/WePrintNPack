"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";

type CartItem = {
  id: string;
  name: string;
  qty: number;
  pricePerUnit: number;
  total: number;
  doubleSided?: boolean;
  thumb?: string;
  frontPreview?: string;
  backPreview?: string;
  boxFaceColors?: Record<string, string>;
  boxFaceImages?: { front?: string; right?: string; top?: string };
};

type Order = {
  id: string;
  stripe_session_id: string;
  customer_name: string;
  customer_email: string;
  address: string;
  customer_phone: string;
  items_json: string;
  amount_total: number;
  status: string;
  production_status: string;
  created_at: string;
};

type ProductionStatus = "pending" | "production" | "completed";

const STATUS_CONFIG: Record<ProductionStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: "Pending",    color: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  production: { label: "Production", color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  completed:  { label: "Completed",  color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
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
  content: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  } as React.CSSProperties,
};


function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as ProductionStatus] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.color,
      fontSize: "0.72rem", fontWeight: 700,
      padding: "3px 9px", borderRadius: 20,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "2-digit", minute: "2-digit",
  });
}

function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

function BoxCube3D({ faceColors, faceImages, rotX, rotY }: {
  faceColors: Record<string, string>;
  faceImages?: { front?: string; right?: string; top?: string };
  rotX: number; rotY: number;
}) {
  const S = 130;
  const half = S / 2;
  const DEF = "#c8a97e";

  const makeFace = (
    transform: string,
    colorId: string,
    darkFactor: number,
    img?: string,
  ): React.CSSProperties => {
    const base = faceColors[colorId] ?? DEF;
    const bg = img
      ? `url(${img}) center/cover no-repeat`
      : (darkFactor === 1 ? base : darkenHex(base, darkFactor));
    return {
      position: "absolute", width: S, height: S,
      background: bg,
      border: "1px solid rgba(0,0,0,0.18)",
      backfaceVisibility: "hidden",
      transform,
      filter: img ? `brightness(${darkFactor})` : undefined,
    };
  };

  return (
    <div style={{ perspective: 900, perspectiveOrigin: "50% 45%", width: S, height: S }}>
      <div style={{
        width: S, height: S, position: "relative",
        transformStyle: "preserve-3d",
        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
      }}>
        <div style={makeFace(`translateZ(${half}px)`,           "sq-front-panel",      1.0,  faceImages?.front)} />
        <div style={makeFace(`rotateY(180deg) translateZ(${half}px)`, "sq-back-panel", 0.7)} />
        <div style={makeFace(`rotateY(-90deg) translateZ(${half}px)`, "sq-left-side-panel", 0.82)} />
        <div style={makeFace(`rotateY(90deg) translateZ(${half}px)`,  "sq-right-side-panel", 0.82, faceImages?.right)} />
        <div style={makeFace(`rotateX(90deg) translateZ(${half}px)`,  "sq-outer-flap", 0.9,  faceImages?.top)} />
        <div style={makeFace(`rotateX(-90deg) translateZ(${half}px)`, "sq-outer-base-flap", 0.65)} />
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
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
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates", count: null },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: pathname === "/admin/apparel", count: null },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: pathname === "/admin/packaging", count: null },
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<CartItem | null>(null);
  const [previewRotY, setPreviewRotY] = useState(0);
  const [previewImgRatio, setPreviewImgRatio] = useState(1.7);
  const previewRotRef = useRef(0);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const [boxPrevRotX, setBoxPrevRotX] = useState(-20);
  const [boxPrevRotY, setBoxPrevRotY] = useState(210);
  const boxPrevRotRef = useRef({ rx: -20, ry: 210 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = (await res.json()) as { orders?: Order[] };
      setOrders(data.orders ?? []);
      if (data.orders?.length && !selectedId) {
        setSelectedId(data.orders[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(orderId: string, status: ProductionStatus) {
    setUpdatingId(orderId);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ production_status: status }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, production_status: status } : o))
      );
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  }

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;
  let selectedItems: CartItem[] = [];
  if (selectedOrder) {
    try { selectedItems = JSON.parse(selectedOrder.items_json) as CartItem[]; } catch { /* ignore */ }
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
                  {item.label === "Orders" && orders.length > 0 ? (
                    <span style={S.navCount(item.active)}>{orders.length}</span>
                  ) : item.count !== null ? (
                    <span style={S.navCount(item.active)}>{item.count}</span>
                  ) : null}
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500 }}>Home &rsaquo; Admin &rsaquo; Orders</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", marginTop: 1 }}>
              Orders <span style={{ color: "#7c3aed" }}>Management</span>
            </div>
          </div>
          <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
            {orders.length} {orders.length === 1 ? "order" : "orders"} total
          </div>
          <AdminNotificationBell />
        </header>

        {/* Two-panel content */}
        <div style={S.content}>

          {/* LEFT: Orders list */}
          <div style={{
            width: 320,
            flexShrink: 0,
            borderRight: "1px solid #f0f0f0",
            background: "#fff",
            overflowY: "auto",
          }}>
            {loading ? (
              <div style={{ padding: "40px 24px", color: "#9ca3af", fontSize: "0.875rem", textAlign: "center" }}>
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: "40px 24px", color: "#9ca3af", fontSize: "0.875rem", textAlign: "center" }}>
                No orders yet.
              </div>
            ) : (
              orders.map((order) => {
                let items: CartItem[] = [];
                try { items = JSON.parse(order.items_json) as CartItem[]; } catch { /* ignore */ }
                const isActive = order.id === selectedId;
                const shortId = order.stripe_session_id?.slice(-8) ?? order.id.slice(0, 8);

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid #f5f5f5",
                      padding: "14px 18px",
                      cursor: "pointer",
                      background: isActive ? "#faf5ff" : "#fff",
                      borderLeft: isActive ? "3px solid #7c3aed" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <code style={{
                            fontSize: "0.72rem", color: "#7c3aed",
                            background: "#ede9fe", padding: "2px 6px", borderRadius: 5, fontWeight: 700,
                          }}>
                            #{shortId}
                          </code>
                          <StatusBadge status={order.production_status} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827", marginBottom: 2 }}>
                          {order.customer_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {items.map((i) => i.name).join(", ")}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#111827" }}>
                          ${order.amount_total.toFixed(2)}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 2 }}>
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT: Order detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "#f8f9fc" }}>
            {!selectedOrder ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🛒</div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>Select an order to view details</div>
              </div>
            ) : (
              <div style={{ maxWidth: 700 }}>

                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>ORDER ID</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ fontSize: "0.85rem", color: "#7c3aed", background: "#ede9fe", padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>
                        #{selectedOrder.stripe_session_id?.slice(-12) ?? selectedOrder.id.slice(0, 12)}
                      </code>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        {formatDate(selectedOrder.created_at)} · {formatTime(selectedOrder.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status selector */}
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500, marginBottom: 6, textAlign: "right" }}>PRODUCTION STATUS</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["pending", "production", "completed"] as ProductionStatus[]).map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        const isActive = selectedOrder.production_status === s;
                        return (
                          <button
                            key={s}
                            disabled={updatingId === selectedOrder.id}
                            onClick={() => updateStatus(selectedOrder.id, s)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 20,
                              border: isActive ? `2px solid ${cfg.dot}` : "2px solid #e5e7eb",
                              background: isActive ? cfg.bg : "#fff",
                              color: isActive ? cfg.color : "#6b7280",
                              fontWeight: isActive ? 700 : 500,
                              fontSize: "0.78rem",
                              cursor: updatingId === selectedOrder.id ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", gap: 5,
                              transition: "all 0.15s",
                              opacity: updatingId === selectedOrder.id ? 0.6 : 1,
                            }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Customer info */}
                <div style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0",
                  padding: "20px 24px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                    Customer
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 3 }}>Name</div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#111827" }}>{selectedOrder.customer_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 3 }}>Email</div>
                      <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "#374151" }}>{selectedOrder.customer_email || "—"}</div>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 3 }}>Phone</div>
                        <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "#374151" }}>{selectedOrder.customer_phone}</div>
                      </div>
                    )}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 3 }}>Delivery Address</div>
                      <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "#374151", lineHeight: 1.5 }}>
                        {selectedOrder.address || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order items */}
                <div style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0",
                  padding: "20px 24px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                    Order Items
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {selectedItems.map((item, idx) => (
                      <div key={idx} style={{
                        display: "flex", gap: 16, alignItems: "flex-start",
                        paddingBottom: idx < selectedItems.length - 1 ? 14 : 0,
                        borderBottom: idx < selectedItems.length - 1 ? "1px solid #f5f5f5" : "none",
                      }}>
                        {/* Design image */}
                        <div
                          onClick={() => { previewRotRef.current = 0; setPreviewRotY(0); setPreviewImgRatio(1.7); boxPrevRotRef.current = { rx: -20, ry: 210 }; setBoxPrevRotX(-20); setBoxPrevRotY(210); setPreviewItem(item); }}
                          title="Preview design"
                          style={{
                            width: 80, height: 56, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "1px solid #e5e7eb",
                            position: "relative", cursor: "pointer",
                          }}
                        >
                          {item.thumb ? (
                            <img
                              src={item.thumb}
                              alt={item.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <path d="M3 9h18M9 21V9" />
                            </svg>
                          )}
                          {/* Eye overlay */}
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(0,0,0,0.38)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: 0, transition: "opacity 0.15s",
                          }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </div>
                        </div>

                        {/* Item info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#111827", marginBottom: 6 }}>
                            {item.name}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: "0.78rem", color: "#6b7280" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "#9ca3af" }}>Qty:</span>
                              <strong style={{ color: "#374151" }}>{item.qty}</strong>
                            </span>
                            {item.doubleSided && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ color: "#9ca3af" }}>Sides:</span>
                                <strong style={{ color: "#7c3aed" }}>Double-sided</strong>
                              </span>
                            )}
                            {item.pricePerUnit > 0 && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ color: "#9ca3af" }}>Unit price:</span>
                                <strong style={{ color: "#374151" }}>${item.pricePerUnit.toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Item total */}
                        <div style={{ flexShrink: 0, fontWeight: 800, fontSize: "0.95rem", color: "#111827" }}>
                          ${item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order total */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: 16, paddingTop: 14, borderTop: "1.5px solid #f0f0f0",
                  }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#6b7280" }}>Order Total</span>
                    <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#7c3aed" }}>
                      ${selectedOrder.amount_total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment status */}
                <div style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0",
                  padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                    Payment via Stripe
                    {selectedOrder.stripe_session_id && (
                      <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#9ca3af" }}>
                        Session: …{selectedOrder.stripe_session_id.slice(-16)}
                      </span>
                    )}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#d1fae5", color: "#065f46",
                    fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                    {selectedOrder.status === "paid" ? "Paid" : selectedOrder.status}
                  </span>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Design Preview Modal ── */}
      {previewItem && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "#f0f2f5",
            display: "flex", flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
            padding: "0 24px", height: 64, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>Design Preview</span>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", fontWeight: 500 }}>
                — {previewItem.name}
              </span>
            </div>
            <button
              onClick={() => setPreviewItem(null)}
              style={{
                background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
                borderRadius: "50%", width: 36, height: 36,
                cursor: "pointer", color: "#fff", fontSize: "1rem",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
              }}
            >✕</button>
          </div>

          {/* Body */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 28, padding: "32px 24px 40px",
          }}>
            {previewItem.name.toLowerCase().includes("box") ? (
              /* ── 3-D box preview (for box products) ── */
              <>
                <div
                  style={{ cursor: "grab", userSelect: "none", transform: "scale(2.4)", transformOrigin: "center center" }}
                  onMouseDown={(e) => {
                    const startX = e.clientX, startY = e.clientY;
                    const startRX = boxPrevRotRef.current.rx, startRY = boxPrevRotRef.current.ry;
                    const onMove = (me: MouseEvent) => {
                      boxPrevRotRef.current.ry = startRY + (me.clientX - startX) * 0.5;
                      boxPrevRotRef.current.rx = Math.max(-80, Math.min(80, startRX - (me.clientY - startY) * 0.5));
                      setBoxPrevRotY(boxPrevRotRef.current.ry);
                      setBoxPrevRotX(boxPrevRotRef.current.rx);
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <BoxCube3D
                    faceColors={previewItem.boxFaceColors ?? {}}
                    faceImages={previewItem.boxFaceImages}
                    rotX={boxPrevRotX}
                    rotY={boxPrevRotY}
                  />
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>Drag to rotate</p>
              </>
            ) : (
              /* ── 3-D flip card (for 2D products) ── */
              <>
                <div
                  style={{ perspective: "1600px" }}
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startRot = previewRotRef.current;
                    const card = previewCardRef.current;
                    if (card) card.style.transition = "none";
                    const onMove = (me: MouseEvent) => {
                      const rot = startRot + (me.clientX - startX) * 0.5;
                      previewRotRef.current = rot;
                      if (card) card.style.transform = `rotateY(${rot}deg)`;
                    };
                    const onUp = () => {
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                      setPreviewRotY(previewRotRef.current);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <div
                    ref={previewCardRef}
                    style={{
                      width: Math.min(window.innerWidth * 0.82, 620),
                      height: Math.round(Math.min(window.innerWidth * 0.82, 620) / previewImgRatio),
                      position: "relative",
                      transformStyle: "preserve-3d",
                      transform: `rotateY(${previewRotY}deg)`,
                      transition: "transform 0.45s ease",
                      cursor: "grab",
                      borderRadius: 14,
                    }}
                  >
                    {/* Front face */}
                    <div style={{
                      position: "absolute", inset: 0,
                      backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                      borderRadius: 14, overflow: "hidden",
                      boxShadow: "0 8px 40px rgba(124,58,237,0.18), 0 2px 12px rgba(0,0,0,0.12)",
                      background: previewItem.frontPreview || previewItem.thumb ? "transparent" : "#1e1b4b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {previewItem.frontPreview || previewItem.thumb ? (
                        <img
                          src={previewItem.frontPreview ?? previewItem.thumb}
                          alt="front"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight) {
                              setPreviewImgRatio(img.naturalWidth / img.naturalHeight);
                            }
                          }}
                          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
                        />
                      ) : (
                        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 600 }}>No front design</div>
                      )}
                    </div>
                    {/* Back face */}
                    <div style={{
                      position: "absolute", inset: 0,
                      backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderRadius: 14, overflow: "hidden",
                      boxShadow: "0 8px 40px rgba(219,39,119,0.15), 0 2px 12px rgba(0,0,0,0.12)",
                      background: previewItem.backPreview ? "transparent" : "#1e1b4b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {previewItem.backPreview ? (
                        <img
                          src={previewItem.backPreview}
                          alt="back"
                          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
                        />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>
                          </svg>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", fontWeight: 600 }}>
                            {previewItem.doubleSided ? "Back preview unavailable" : "Single-sided design"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Front / Back toggle buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => {
                      const target = Math.round(previewRotRef.current / 360) * 360;
                      previewRotRef.current = target;
                      setPreviewRotY(target);
                      if (previewCardRef.current) previewCardRef.current.style.transition = "transform 0.45s ease";
                    }}
                    style={{
                      padding: "11px 36px", borderRadius: 999,
                      background: "linear-gradient(135deg, #7c3aed, #db2777)",
                      border: "none", color: "#fff",
                      fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                    }}
                  >Front</button>
                  <button
                    onClick={() => {
                      const target = Math.round(previewRotRef.current / 360) * 360 + 180;
                      previewRotRef.current = target;
                      setPreviewRotY(target);
                      if (previewCardRef.current) previewCardRef.current.style.transition = "transform 0.45s ease";
                    }}
                    style={{
                      padding: "11px 36px", borderRadius: 999,
                      background: "#fff", border: "2px solid #e5e7eb",
                      color: "#374151",
                      fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >Back</button>
                </div>

                <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>
                  Drag the card to rotate · click Front / Back to flip
                </p>
              </>
            )}
          </div>
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
