"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "wp_welcome_shown";

export function WelcomePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  function close() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 2001,
        width: "min(820px, 94vw)",
        maxHeight: "82vh",
        background: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: "absolute", top: 16, right: 20,
            background: "none", border: "none", cursor: "pointer",
            fontSize: "1.1rem", color: "#374151", zIndex: 10,
            lineHeight: 1, fontWeight: 700,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Logo row — spans full width */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "22px 24px 0" }}>
          <Image src="/images/applogo.jpeg" alt="We Print N Pack" width={44} height={44} style={{ borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: "0.88rem", background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>
              WE PRINT N PACK
            </div>
            <div style={{ fontSize: "0.6rem", color: "#9ca3af", letterSpacing: "0.1em" }}>
              PRINT. DESIGN. PACK. DELIVER.
            </div>
          </div>
        </div>

        {/* Body row */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* Left */}
          <div style={{ flex: "0 0 48%", padding: "24px 32px 28px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

            {/* Maple leaf badge */}
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              border: "2px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", marginBottom: 16,
            }}>
              🍁
            </div>

            {/* Heading */}
            <h2 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.15 }}>
              Proudly printing in
            </h2>
            <h2 style={{ margin: "0 0 14px", fontSize: "2rem", fontWeight: 900, lineHeight: 1.15, background: "linear-gradient(90deg,#db2777,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Canada
            </h2>

            {/* Subtitle */}
            <p style={{ margin: "0 0 28px", fontSize: "0.92rem", color: "#6b7280", lineHeight: 1.6 }}>
              Explore our collection of top products printed locally.
            </p>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <a
                href="#lp-popular"
                onClick={close}
                style={{
                  padding: "12px 28px", textAlign: "center",
                  background: "linear-gradient(90deg,#7c3aed,#db2777)",
                  color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                  borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                Shop Now
              </a>
              <a
                href="#quote-form"
                onClick={close}
                style={{
                  padding: "12px 24px", textAlign: "center",
                  border: "2px solid #d1d5db", background: "#fff",
                  color: "#374151", fontWeight: 700, fontSize: "0.9rem",
                  borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                Get a Free Quote
              </a>
            </div>
          </div>

          {/* Right — image fills full height */}
          <div style={{ flex: "0 0 52%", position: "relative", overflow: "hidden", background: "#f1f5f9" }}>
            {/* Decorative circles */}
            <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "#7c3aed1a", zIndex: 1 }} />
            <div style={{ position: "absolute", bottom: 0, left: -40, width: 160, height: 160, borderRadius: "50%", background: "#06b6d41a", zIndex: 1 }} />
            <div style={{ position: "absolute", top: "40%", right: -30, width: 120, height: 120, borderRadius: "50%", background: "#f973161a", zIndex: 1 }} />

            <Image
              src="/images/hero-products.jpg"
              alt="We Print N Pack products"
              fill
              style={{ objectFit: "cover", objectPosition: "center" }}
              priority
            />
          </div>
        </div>

        {/* Bottom gradient bar */}
        <div style={{ height: 5, background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316,#06b6d4)", flexShrink: 0 }} />
      </div>
    </>
  );
}
