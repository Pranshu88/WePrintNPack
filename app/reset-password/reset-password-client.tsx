"use client";

import { useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
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
    width: "100%",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: "#111827",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#f8f9fc",
      }}
    >
      {/* Gradient header bar */}
      <div
        style={{
          width: "100%",
          height: 6,
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
        }}
      />

      <div
        style={{
          marginTop: 64,
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          overflow: "hidden",
        }}
      >
        {/* Card gradient strip */}
        <div
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
            padding: "28px 40px 24px",
          }}
        >
          <h1 style={{ color: "#fff", margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>
            Reset Password
          </h1>
          <p style={{ color: "rgba(255,255,255,0.85)", margin: "6px 0 0", fontSize: "0.88rem" }}>
            Enter your new password below.
          </p>
        </div>

        <div style={{ padding: "32px 40px 40px" }}>
          {!token && (
            <div style={{ color: "#ef4444", fontSize: "0.9rem", textAlign: "center" }}>
              Invalid reset link. Please request a new one.
            </div>
          )}

          {token && success && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "1.6rem",
                }}
              >
                ✓
              </div>
              <p style={{ color: "#111827", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 8px" }}>
                Password reset successfully.
              </p>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 24px" }}>
                You can now sign in with your new password.
              </p>
              <a
                href="/landing"
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                }}
              >
                Go to Home
              </a>
            </div>
          )}

          {token && !success && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle} htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {error && (
                <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: loading
                    ? "#e5e7eb"
                    : "linear-gradient(135deg, #7c3aed, #db2777)",
                  color: loading ? "#9ca3af" : "#fff",
                  border: "none",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: "0.97rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
