"use client";

import { useState, useEffect } from "react";

type Customer = { id: string; firstName: string; lastName: string; email: string };

type OrderItem = { name: string; qty: number; price: number; image?: string };

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  amountTotal: number;
  status: string;
  productionStatus: string;
  createdAt: string;
  reviewed: boolean;
};

const STATUS_STEPS = ["pending", "production", "completed"] as const;

function ProductionBadge({ status }: { status: string }) {
  const step = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {STATUS_STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: "0.75rem",
              fontWeight: 600,
              border: `2px solid ${active ? "#7c3aed" : done ? "#10b981" : "#e5e7eb"}`,
              background: active
                ? "linear-gradient(90deg,#7c3aed,#db2777)"
                : done ? "#dcfce7" : "#f9fafb",
              color: active ? "#fff" : done ? "#059669" : "#9ca3af",
            }}>
              {done && "✓ "}{s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontSize: "1.8rem",
            color: n <= (hover || value) ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewModal({
  order,
  customer,
  onClose,
  onDone,
}: {
  order: Order;
  customer: Customer;
  onClose: () => void;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const productName = order.items[0]?.name ?? "Product";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0) { setError("Please select a star rating"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/customer/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerId: customer.id,
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          productName,
          stars,
          comment,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Something went wrong");
      } else {
        onDone();
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1000, backdropFilter: "blur(2px)",
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 16, zIndex: 1001,
        width: "min(480px, 94vw)", padding: "0 0 28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>Write a Review</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", marginTop: 2 }}>{productName}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, cursor: "pointer", padding: "6px 10px", color: "#fff", fontSize: "1rem" }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px 24px 0" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "#374151", marginBottom: 8 }}>
              Your Rating
            </label>
            <StarPicker value={stars} onChange={setStars} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.88rem", color: "#374151", marginBottom: 8 }}>
              Your Review <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              style={{
                width: "100%", borderRadius: 10, border: "1.5px solid #e5e7eb",
                padding: "10px 12px", fontSize: "0.9rem", resize: "vertical",
                outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#dc2626", fontSize: "0.85rem", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "13px",
              background: submitting ? "#e5e7eb" : "linear-gradient(90deg,#7c3aed,#db2777,#f97316)",
              border: "none", borderRadius: 10, color: "#fff",
              fontWeight: 700, fontSize: "0.95rem", cursor: submitting ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </>
  );
}

export default function MyOrdersPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewDone, setReviewDone] = useState<string | null>(null); // order id

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) {
        const user = JSON.parse(saved) as Customer;
        setCustomer(user);
        fetchOrders(user.email);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  async function fetchOrders(email: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(email)}`);
      const data = await res.json() as { orders: Order[] };
      setOrders(data.orders ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function handleReviewDone(orderId: string) {
    setReviewOrder(null);
    setReviewDone(orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o))
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTop: "3px solid #7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#6b7280" }}>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: "0 0 8px", color: "#111827" }}>Sign in to view your orders</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>You need to be logged in to see your order history.</p>
          <a href="/" style={{
            display: "inline-block", padding: "12px 28px",
            background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff",
            borderRadius: 10, fontWeight: 700, textDecoration: "none",
          }}>Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 16px 60px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 20,
          background: "linear-gradient(90deg,#7c3aed22,#db277722)",
          color: "#7c3aed", fontWeight: 700, fontSize: "0.75rem",
          letterSpacing: "0.06em", marginBottom: 10,
        }}>MY ORDERS</div>
        <h1 style={{ margin: "0 0 6px", fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>
          Order History
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.92rem" }}>
          Hi {customer.firstName}, here are all your orders.
        </p>
      </div>

      {orders.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 32px",
          background: "#f9fafb", borderRadius: 16, border: "1.5px dashed #e5e7eb",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📦</div>
          <h3 style={{ margin: "0 0 8px", color: "#374151" }}>No orders yet</h3>
          <p style={{ margin: "0 0 20px", color: "#9ca3af" }}>Start shopping to see your orders here.</p>
          <a href="/" style={{
            display: "inline-block", padding: "11px 28px",
            background: "linear-gradient(90deg,#7c3aed,#db2777)", color: "#fff",
            borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
          }}>Browse Products</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {orders.map((order) => {
            const isReviewed = order.reviewed || reviewDone === order.id;
            const canReview = order.productionStatus === "completed" && !isReviewed;
            const date = new Date(order.createdAt).toLocaleDateString("en-CA", {
              year: "numeric", month: "short", day: "numeric",
            });

            return (
              <div key={order.id} style={{
                background: "#fff", borderRadius: 14,
                border: "1.5px solid #f3f4f6",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}>
                {/* Order top bar */}
                <div style={{
                  background: "linear-gradient(135deg,#7c3aed11,#db277711)",
                  padding: "14px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 8,
                  borderBottom: "1px solid #f3f4f6",
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "#7c3aed", letterSpacing: "0.04em" }}>
                      ORDER ID
                    </span>
                    <div style={{ fontWeight: 800, color: "#111827", fontSize: "0.95rem", marginTop: 1 }}>
                      #{order.id.slice(0, 12)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{date}</span>
                    <div style={{ fontWeight: 700, color: "#7c3aed", fontSize: "1.05rem", marginTop: 1 }}>
                      ${Number(order.amountTotal).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 20px" }}>
                  {/* Production status */}
                  <div style={{ marginBottom: 16 }}>
                    <ProductionBadge status={order.productionStatus} />
                  </div>

                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", background: "#f9fafb", borderRadius: 10,
                      }}>
                        {item.image && (
                          <img src={item.image} alt={item.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>{item.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>
                            Qty: {item.qty} &nbsp;·&nbsp; ${Number(item.price).toFixed(2)} each
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#374151", fontSize: "0.9rem" }}>
                          ${(Number(item.price) * Number(item.qty)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Review button */}
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    {isReviewed ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 8,
                        background: "#dcfce7", color: "#059669",
                        fontWeight: 600, fontSize: "0.82rem",
                      }}>
                        ✓ Review Submitted
                      </span>
                    ) : canReview ? (
                      <button
                        onClick={() => setReviewOrder(order)}
                        style={{
                          padding: "9px 20px",
                          background: "linear-gradient(90deg,#7c3aed,#db2777)",
                          border: "none", borderRadius: 8, color: "#fff",
                          fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        ★ Write a Review
                      </button>
                    ) : order.productionStatus !== "completed" ? (
                      <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                        Review available after order is completed
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewOrder && customer && (
        <ReviewModal
          order={reviewOrder}
          customer={customer}
          onClose={() => setReviewOrder(null)}
          onDone={() => handleReviewDone(reviewOrder.id)}
        />
      )}
    </div>
  );
}
