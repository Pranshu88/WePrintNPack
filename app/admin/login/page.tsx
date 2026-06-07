"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setForgotLoading(true);
    setError("");
    try {
      await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#fff",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decorations */}
      <div style={{ position: "absolute", top: 60, left: 60, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, opacity: 0.5 }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c4b5fd" }} />
        ))}
      </div>
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} />
      <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "#f97316" }} />
      <div style={{ position: "absolute", bottom: 80, right: 80, width: 180, height: 280, borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%", background: "linear-gradient(160deg, #ec4899, #db2777)" }} />
      <div style={{ position: "absolute", bottom: 0, right: 200, width: 120, height: 180, borderRadius: "50% 50% 0 0", background: "linear-gradient(160deg, #f97316, #db2777)", opacity: 0.7 }} />

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        padding: "44px 44px 40px",
        width: "100%",
        maxWidth: 460,
        margin: "0 16px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/images/applogo.jpeg" alt="WE PRINT N PACK" style={{ width: 70, height: 70, borderRadius: 14, objectFit: "cover", marginBottom: 10 }} />
          <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#111827", letterSpacing: "0.02em" }}>WE PRINT N PACK</div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", fontWeight: 700, marginTop: 2 }}>
            <span style={{ color: "#7c3aed" }}>PRINT.</span>{" "}
            <span style={{ color: "#db2777" }}>DESIGN.</span>{" "}
            <span style={{ color: "#f97316" }}>PACK.</span>{" "}
            <span style={{ color: "#ef4444" }}>DELIVER.</span>
          </div>
        </div>

        <h1 style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>Admin Login</h1>
        <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", margin: "0 0 28px" }}>Welcome back! Please login to your account.</p>

        {forgotSent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📧</div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: "1rem", marginBottom: 8 }}>Email Sent!</div>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.6 }}>
              A password reset link has been sent to <strong>info@weprintnpack.ca</strong>. Check your inbox.
            </p>
            <button onClick={() => setForgotSent(false)} style={{ marginTop: 20, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
              ← Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleLogin(e)}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", color: "#111827", marginBottom: 6 }}>Email</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "11px 14px", gap: 10, background: "#fff" }}>
                <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 7l10 7 10-7" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{ border: "none", outline: "none", flex: 1, fontSize: "0.875rem", color: "#374151", background: "none" }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", color: "#111827", marginBottom: 6 }}>Password</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "11px 14px", gap: 10, background: "#fff" }}>
                <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ border: "none", outline: "none", flex: 1, fontSize: "0.875rem", color: "#374151", background: "none" }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af", display: "flex" }}>
                  {showPass ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={forgotLoading}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontWeight: 600, fontSize: "0.82rem" }}
              >
                {forgotLoading ? "Sending…" : "Forgot password ?"}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 12,
                background: loading ? "#d1d5db" : "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
