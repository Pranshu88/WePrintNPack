"use client";

import { useRouter } from "next/navigation";

export default function CancelPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "48px 40px", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "1.8rem", fontWeight: 900, color: "#111827" }}>Payment Cancelled</h1>
        <p style={{ margin: "0 0 32px", color: "#6b7280", lineHeight: 1.6 }}>
          Your payment was cancelled. Your cart is still saved — you can try again anytime.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/cart")} style={{ padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}>
            Back to Cart
          </button>
          <button onClick={() => router.push("/")} style={{ padding: "13px 28px", borderRadius: 12, background: "#fff", border: "1.5px solid #e5e7eb", color: "#374151", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
