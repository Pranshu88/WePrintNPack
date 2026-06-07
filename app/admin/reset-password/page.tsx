"use client";

import { useState, Suspense, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function AdminResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "12px 14px", fontSize: "0.95rem", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit", color: "#111827",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: "#f8f9fc", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} />
      <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "#f97316" }} />

      <div style={{
        position: "relative", zIndex: 10, background: "#fff", borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)", width: "100%", maxWidth: 440, margin: "0 16px", overflow: "hidden",
      }}>
        <div style={{ background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", padding: "28px 40px 24px" }}>
          <h1 style={{ color: "#fff", margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Reset Admin Password</h1>
          <p style={{ color: "rgba(255,255,255,0.85)", margin: "6px 0 0", fontSize: "0.85rem" }}>Enter your new password below.</p>
        </div>

        <div style={{ padding: "32px 40px 40px" }}>
          {!token && (
            <p style={{ color: "#ef4444", textAlign: "center", fontSize: "0.9rem" }}>Invalid reset link. Please request a new one.</p>
          )}

          {token && success && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
              <p style={{ fontWeight: 700, color: "#111827", fontSize: "1rem", margin: "0 0 8px" }}>Password reset successfully!</p>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 24px" }}>You can now login with your new password.</p>
              <a href="/admin/login" style={{
                display: "inline-block", padding: "12px 28px",
                background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                color: "#fff", textDecoration: "none", borderRadius: 999, fontWeight: 700, fontSize: "0.9rem",
              }}>
                Go to Admin Login
              </a>
            </div>
          )}

          {token && !success && (
            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.82rem", color: "#374151", marginBottom: 6 }}>New Password</label>
                <input type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.82rem", color: "#374151", marginBottom: 6 }}>Confirm Password</label>
                <input type="password" placeholder="Repeat your new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle} />
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", border: "none", borderRadius: 999,
                background: loading ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                color: loading ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: "0.97rem",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>}>
      <AdminResetPasswordForm />
    </Suspense>
  );
}
