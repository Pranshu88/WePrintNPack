"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

type OrderData = {
  status: string;
  customerName: string;
  customerEmail: string;
  amountTotal: number;
  items: Array<{ name: string; qty: number; total: number }>;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get("session_id") ?? null;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) { setError("Invalid session."); setLoading(false); return; }

    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data: OrderData & { error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setOrder(data);
        // Clear cart from localStorage
        try {
          localStorage.removeItem("wp_cart");
          localStorage.setItem("wp_cart_count", "0");
        } catch { /* ignore */ }
      })
      .catch(() => setError("Could not verify payment."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <p style={{ color: "#6b7280" }}>Verifying payment…</p>
    </div>
  );

  if (error || !order || order.status !== "paid") return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f0f2f5", padding: 32 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#111827" }}>Payment Not Completed</h2>
      <p style={{ margin: 0, color: "#6b7280", textAlign: "center" }}>{error || "Your payment could not be verified."}</p>
      <button onClick={() => router.push("/cart")} style={{ padding: "12px 32px", borderRadius: 999, background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
        Back to Cart
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", textAlign: "center" }}>

        {/* Success icon */}
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "2rem", fontWeight: 900, color: "#111827" }}>Order Placed!</h1>
        <p style={{ margin: "0 0 32px", color: "#6b7280", lineHeight: 1.6 }}>
          Thank you, <strong>{order.customerName}</strong>! Your payment was successful. We&apos;ll start processing your order right away.
        </p>

        {/* Order items */}
        <div style={{ background: "#f9fafb", borderRadius: 14, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < order.items.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: "0.9rem" }}>
              <span style={{ color: "#374151", fontWeight: 600 }}>{item.name} × {item.qty}</span>
              <span style={{ color: "#111827", fontWeight: 700 }}>${item.total.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTop: "2px solid #e5e7eb", fontWeight: 800, fontSize: "1rem" }}>
            <span>Total Paid</span>
            <span style={{ color: "#7c3aed" }}>${order.amountTotal.toFixed(2)}</span>
          </div>
        </div>

        <p style={{ margin: "0 0 24px", fontSize: "0.82rem", color: "#9ca3af" }}>
          A confirmation will be sent to <strong>{order.customerEmail}</strong>
        </p>

        <button onClick={() => router.push("/")} style={{ padding: "14px 40px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 6px 20px rgba(124,58,237,0.35)" }}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
