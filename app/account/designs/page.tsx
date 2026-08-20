"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthModal from "@/components/auth-modal";

type SavedDesign = {
  id: string;
  name: string;
  productName: string;
  productPath: string;
  thumbnail: string | null;
  updatedAt: string;
};

type Customer = { id: string; firstName: string; lastName: string; email: string };

export default function MyDesignsPage() {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // retried: whether we've already tried re-minting the session cookie for a
  // localStorage-known user before giving up and asking them to sign in again —
  // covers accounts that signed in before customer_session cookies existed.
  const load = useCallback((retried = false) => {
    setLoading(true);
    fetch("/api/designs", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          if (!retried) {
            try {
              const saved = localStorage.getItem("wp_user");
              if (saved) {
                const user = JSON.parse(saved) as Customer;
                const sessionRes = await fetch("/api/auth/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: user.id }),
                });
                if (sessionRes.ok) { load(true); return; }
              }
            } catch { /* ignore */ }
          }
          setNeedsAuth(true);
          setDesigns([]);
          return;
        }
        const d = await r.json() as { designs?: SavedDesign[] };
        setNeedsAuth(false);
        setDesigns(d.designs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved design? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/designs/${id}`, { method: "DELETE" });
      if (r.ok) setDesigns((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 6 }}>My Designs</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>
        Designs you've saved while customizing a product. Pick one up where you left off.
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}

      {!loading && needsAuth && (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed #d1d5db", borderRadius: 16 }}>
          <p style={{ marginBottom: 16, color: "#374151" }}>Sign in to see designs saved to your account.</p>
          <button
            onClick={() => setAuthOpen(true)}
            style={{ padding: "12px 24px", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Sign In
          </button>
        </div>
      )}

      {!loading && !needsAuth && designs.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed #d1d5db", borderRadius: 16, color: "#6b7280" }}>
          You haven't saved any designs yet. Open the design editor on any product and click
          {" "}<strong>&quot;Save Design to My Account&quot;</strong>.
        </div>
      )}

      {!loading && !needsAuth && designs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {designs.map((d) => (
            <div key={d.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
              <div style={{ aspectRatio: "1", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {d.thumbnail
                  ? <img src={d.thumbnail} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>No preview</span>}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 2 }}>{d.name}</div>
                <div style={{ color: "#9ca3af", fontSize: "0.78rem", marginBottom: 10 }}>
                  {d.productName} · {new Date(d.updatedAt).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={`${d.productPath}?savedDesignId=${d.id}`}
                    style={{ flex: 1, textAlign: "center", padding: "8px 0", background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deletingId === d.id}
                    style={{ padding: "8px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: "0.82rem", color: "#dc2626", cursor: "pointer" }}
                  >
                    {deletingId === d.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignedIn={(c) => {
          try { localStorage.setItem("wp_user", JSON.stringify(c)); } catch { /* ignore */ }
          setAuthOpen(false);
          load();
        }}
      />
    </div>
  );
}
