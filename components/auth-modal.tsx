"use client";

import { useState, FormEvent, useEffect } from "react";

type Customer = { id: string; firstName: string; lastName: string; email: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSignedIn: (customer: Customer) => void;
};

type View = "signin" | "signup" | "forgot";

export default function AuthModal({ open, onClose, onSignedIn }: Props) {
  const [view, setView] = useState<View>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign-up fields
  const [suFirstName, setSuFirstName] = useState("");
  const [suLastName, setSuLastName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  // Password visibility
  const [showSiPwd, setShowSiPwd] = useState(false);
  const [showSuPwd, setShowSuPwd] = useState(false);

  // Forgot password field
  const [fpEmail, setFpEmail] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setView("signin");
      setError("");
      setForgotSuccess(false);
      setSiEmail(""); setSiPassword("");
      setSuFirstName(""); setSuLastName(""); setSuEmail(""); setSuPassword("");
      setFpEmail("");
    }
  }, [open]);

  function switchView(v: View) {
    setView(v);
    setError("");
    setForgotSuccess(false);
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; customer?: Customer; error?: string };
      if (!res.ok || !data.ok || !data.customer) {
        setError(data.error ?? "Invalid credentials.");
      } else {
        onSignedIn(data.customer);
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: suFirstName,
          lastName: suLastName,
          email: suEmail,
          password: suPassword,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; customer?: Customer; error?: string };
      if (!res.ok || !data.ok || !data.customer) {
        setError(data.error ?? "Sign up failed.");
      } else {
        onSignedIn(data.customer);
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setForgotSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

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

  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "13px",
    background: loading ? "#e5e7eb" : "linear-gradient(135deg, #7c3aed, #db2777)",
    color: loading ? "#9ca3af" : "#fff",
    border: "none",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: "0.97rem",
    cursor: loading ? "not-allowed" : "pointer",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 20,
          maxWidth: 440,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Gradient header strip */}
        <div
          style={{
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            padding: "26px 36px 22px",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              color: "#fff",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            ✕
          </button>
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.45rem", fontWeight: 800 }}>
            {view === "signin" && "Welcome Back"}
            {view === "signup" && "Create Account"}
            {view === "forgot" && "Reset Password"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.82)", margin: "5px 0 0", fontSize: "0.85rem" }}>
            {view === "signin" && "Sign in to your WE PRINT N PACK account"}
            {view === "signup" && "Join WE PRINT N PACK today"}
            {view === "forgot" && "We'll send you a reset link"}
          </p>
        </div>

        <div style={{ padding: "32px 36px 36px" }}>
          {/* ── SIGN IN ── */}
          {view === "signin" && (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle} htmlFor="si-email">Email</label>
                <input
                  id="si-email"
                  type="email"
                  placeholder="you@example.com"
                  value={siEmail}
                  onChange={(e) => setSiEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }} htmlFor="si-password">Password</label>
                  <button
                    type="button"
                    onClick={() => switchView("forgot")}
                    style={{ background: "none", border: "none", color: "#7c3aed", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                <input
                  id="si-password"
                  type={showSiPwd ? "text" : "password"}
                  placeholder="Your password"
                  value={siPassword}
                  onChange={(e) => setSiPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                />
                <button type="button" onClick={() => setShowSiPwd(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}>
                  {showSiPwd ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
                </div>
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("signup")}
                  style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "0.85rem" }}
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="su-first">First Name</label>
                  <input
                    id="su-first"
                    type="text"
                    placeholder="First"
                    value={suFirstName}
                    onChange={(e) => setSuFirstName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="su-last">Last Name</label>
                  <input
                    id="su-last"
                    type="text"
                    placeholder="Last"
                    value={suLastName}
                    onChange={(e) => setSuLastName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle} htmlFor="su-email">Email</label>
                <input
                  id="su-email"
                  type="email"
                  placeholder="you@example.com"
                  value={suEmail}
                  onChange={(e) => setSuEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="su-password">Password</label>
                <div style={{ position: "relative" }}>
                <input
                  id="su-password"
                  type={showSuPwd ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                />
                <button type="button" onClick={() => setShowSuPwd(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, display: "flex" }}>
                  {showSuPwd ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
                </div>
              </div>
              {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchView("signin")}
                  style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "0.85rem" }}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {view === "forgot" && (
            <div>
              {forgotSuccess ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>📧</div>
                  <p style={{ color: "#111827", fontWeight: 700, fontSize: "1rem", margin: "0 0 8px" }}>
                    Check your inbox
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.88rem", margin: "0 0 24px", lineHeight: 1.6 }}>
                    Instructions have been sent to your email.
                  </p>
                  <button
                    onClick={() => switchView("signin")}
                    style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={labelStyle} htmlFor="fp-email">Email Address</label>
                    <input
                      id="fp-email"
                      type="email"
                      placeholder="you@example.com"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      required
                      style={inputStyle}
                    />
                  </div>
                  {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
                  <button type="submit" disabled={loading} style={primaryBtn}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </button>
                  <p style={{ textAlign: "center", margin: 0 }}>
                    <button
                      type="button"
                      onClick={() => switchView("signin")}
                      style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      ← Back to Sign In
                    </button>
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
