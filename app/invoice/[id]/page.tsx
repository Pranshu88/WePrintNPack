"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type OrderItem = { name: string; qty: number; pricePerUnit?: number; price?: number; total?: number };

type Shipping = { method?: string; cost?: number; addr?: string; addr2?: string; city?: string; state?: string; zip?: string; country?: string };

type Order = {
  id: string;
  stripeSessionId?: string;
  customerName: string;
  customerEmail: string;
  address: string;
  items: OrderItem[];
  amountTotal: number;
  status: string;
  shipping: Shipping | null;
  createdAt: string;
};

export default function InvoicePage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let email = "";
    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) email = (JSON.parse(saved) as { email?: string }).email ?? "";
    } catch { /* ignore */ }

    const qs = email ? `?email=${encodeURIComponent(email)}` : "";

    fetch(`/api/orders/${id}${qs}`)
      .then((r) => r.json() as Promise<{ order?: Order; error?: string }>)
      .then((d) => {
        if (d.order) setOrder(d.order);
        else setError(d.error ?? "Order not found");
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>Loading invoice…</div>;
  }
  if (error || !order) {
    return <div style={{ padding: 60, textAlign: "center", color: "#dc2626" }}>{error || "Order not found"}</div>;
  }

  const itemsTotal = order.items.reduce((s, i) => s + (i.total ?? (i.pricePerUnit ?? i.price ?? 0) * i.qty), 0);
  const shippingCost = order.shipping?.cost ?? Math.max(0, order.amountTotal - itemsTotal);
  const date = new Date(order.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px", color: "#111827", fontFamily: "inherit" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 22px", background: "linear-gradient(90deg,#7c3aed,#db2777)",
            border: "none", borderRadius: 8, color: "#fff", fontWeight: 700,
            fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "36px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, borderBottom: "2px solid #111827", paddingBottom: 20 }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>WeprintNpack</div>
            <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: 4 }}>Invoice</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Invoice #</div>
            <div style={{ fontWeight: 700 }}>{order.id.slice(0, 12).toUpperCase()}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 6 }}>{date}</div>
          </div>
        </div>

        {/* Bill to / status */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>BILL TO</div>
            <div style={{ fontWeight: 700 }}>{order.customerName}</div>
            <div style={{ color: "#6b7280", fontSize: "0.88rem" }}>{order.customerEmail}</div>
            <div style={{ color: "#6b7280", fontSize: "0.88rem", marginTop: 4, maxWidth: 280 }}>{order.address}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>PAYMENT STATUS</div>
            <span style={{
              display: "inline-block", padding: "4px 14px", borderRadius: 20,
              background: order.status === "paid" ? "#d1fae5" : "#fef3c7",
              color: order.status === "paid" ? "#065f46" : "#b45309",
              fontWeight: 700, fontSize: "0.8rem",
            }}>
              {order.status === "paid" ? "Paid" : order.status}
            </span>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", fontSize: "0.75rem", color: "#9ca3af" }}>ITEM</th>
              <th style={{ padding: "8px 4px", fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>QTY</th>
              <th style={{ padding: "8px 4px", fontSize: "0.75rem", color: "#9ca3af", textAlign: "right" }}>UNIT PRICE</th>
              <th style={{ padding: "8px 4px", fontSize: "0.75rem", color: "#9ca3af", textAlign: "right" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const unit = item.pricePerUnit ?? item.price ?? 0;
              const total = item.total ?? unit * item.qty;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 4px", fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: "10px 4px", textAlign: "center", color: "#6b7280" }}>{item.qty}</td>
                  <td style={{ padding: "10px 4px", textAlign: "right", color: "#6b7280" }}>${unit.toFixed(2)}</td>
                  <td style={{ padding: "10px 4px", textAlign: "right", fontWeight: 700 }}>${total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "0.9rem", color: "#6b7280" }}>
              <span>Subtotal</span>
              <span>${itemsTotal.toFixed(2)}</span>
            </div>
            {shippingCost > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "0.9rem", color: "#6b7280" }}>
                <span>Shipping{order.shipping?.method ? ` (${order.shipping.method})` : ""}</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", marginTop: 6, borderTop: "2px solid #111827", fontWeight: 800, fontSize: "1.1rem" }}>
              <span>Total</span>
              <span>${order.amountTotal.toFixed(2)} CAD</span>
            </div>
          </div>
        </div>

        {order.stripeSessionId && (
          <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#9ca3af" }}>
            Payment processed via Stripe · Session …{order.stripeSessionId.slice(-16)}
          </div>
        )}
      </div>
    </div>
  );
}
