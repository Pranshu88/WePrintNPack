"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import AuthModal from "@/components/auth-modal";

type Customer = { id: string; firstName: string; lastName: string; email: string };

export function LandingHeader() {
  const [authOpen, setAuthOpen]         = useState(false);
  const [currentUser, setCurrentUser]   = useState<Customer | null>(null);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount]       = useState(0);
  const [cartAuthPending, setCartAuthPending] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const SERVICES_MENU = [
    { label: "Printing", href: "/products" },
    { label: "Dieline",  href: "/products/packaging-box" },
    { label: "Mockup",   href: "/products/mockup-generator" },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) setCurrentUser(JSON.parse(saved) as Customer);
    } catch { /* ignore */ }
    const refreshCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as unknown[];
        setCartCount(cart.length);
      } catch { /* ignore */ }
    };
    refreshCount();
    window.addEventListener("wp-cart-updated", refreshCount);
    return () => window.removeEventListener("wp-cart-updated", refreshCount);
  }, []);

  function handleCartClick() {
    if (currentUser) {
      window.location.href = "/cart";
    } else {
      setCartAuthPending(true);
      setAuthOpen(true);
    }
  }

  return (
    <>
      {/* Announcement bar */}
      <div className="lp-announce-bar">
        <span>🎉 Get 10% OFF your first order! &nbsp;|&nbsp; Use code: <strong>WELCOME10</strong></span>
        <span>📦 Free Shipping on orders over $200</span>
        <span>📞 Need help? &nbsp;<strong>+1 902-412-2133</strong></span>
      </div>

      {/* Main header */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="/" className="lp-brand">
            <Image src="/images/applogo.jpeg" alt="We Print N Pack" width={180} height={50} className="lp-brand-img" style={{ width: 180, objectFit: "contain" }} priority />
          </a>

          <nav className="lp-nav">
            <a href="/#lp-popular"  className="lp-nav-link lp-nav-active">Products</a>
            <span
              style={{ position: "relative", display: "inline-block" }}
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <a href="/#lp-products" className="lp-nav-link">Services</a>
              {servicesOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", left: 0,
                  background: "#fff", borderRadius: 12, zIndex: 999,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.14)", minWidth: 170,
                  border: "1px solid #f3f4f6", overflow: "hidden",
                }}>
                  {SERVICES_MENU.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      style={{
                        display: "block", padding: "10px 16px",
                        textDecoration: "none", fontSize: "0.88rem", fontWeight: 600,
                        color: "#374151",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </span>
            <a href="#"             className="lp-nav-link">Deals</a>
            <a href="/#lp-footer"   className="lp-nav-link">About Us</a>
            <span className="lp-nav-link" style={{ cursor: "default", pointerEvents: "none" }}>Resources ▾</span>
          </nav>

          {/* Hamburger */}
          <button
            className="lp-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`lp-h-line${mobileMenuOpen ? " lp-h-top" : ""}`} />
            <span className={`lp-h-line${mobileMenuOpen ? " lp-h-mid" : ""}`} />
            <span className={`lp-h-line${mobileMenuOpen ? " lp-h-bot" : ""}`} />
          </button>

          <div className="lp-header-right">

            {/* User / sign in */}
            <div style={{ position: "relative" }}>
              <button
                className="lp-header-icon"
                onClick={() => currentUser ? setProfileOpen((v) => !v) : setAuthOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                aria-label={currentUser ? `Signed in as ${currentUser.firstName}` : "Sign in"}
              >
                {currentUser ? (
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed" }}>
                    {currentUser.firstName}
                  </span>
                ) : (
                  "👤"
                )}
              </button>

              {currentUser && profileOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setProfileOpen(false)} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    background: "#fff", borderRadius: 12, zIndex: 999,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.14)", minWidth: 200,
                    border: "1px solid #f3f4f6", overflow: "hidden",
                  }}>
                    <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, #7c3aed, #db2777)" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        {currentUser.email}
                      </div>
                    </div>
                    <a
                      href="/my-orders"
                      onClick={() => setProfileOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "12px 16px", background: "#fff",
                        textDecoration: "none", fontSize: "0.88rem", fontWeight: 600,
                        color: "#374151", borderBottom: "1px solid #f3f4f6",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <rect x="9" y="7" width="12" height="14" rx="2"/>
                        <line x1="13" y1="11" x2="17" y2="11"/>
                        <line x1="13" y1="15" x2="17" y2="15"/>
                      </svg>
                      My Orders
                    </a>
                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        setProfileOpen(false);
                        try { localStorage.removeItem("wp_user"); } catch { /* ignore */ }
                      }}
                      style={{
                        width: "100%", padding: "12px 16px", background: "#fff", border: "none",
                        textAlign: "left", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                        color: "#dc2626", display: "flex", alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Cart */}
            <button
              className="lp-header-icon lp-cart-icon"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", position: "relative" }}
              aria-label="View cart"
              onClick={handleCartClick}
            >
              🛒
              {cartCount > 0 && <span className="lp-cart-badge">{cartCount}</span>}
            </button>

            <a href="/#quote-form" className="lp-header-cta">Get a Quote</a>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <nav className="lp-mobile-nav">
          {[
            { label: "Products", href: "/#lp-popular"  },
            { label: "Services", href: "/#lp-products" },
            { label: "Deals",    href: "#"             },
            { label: "About Us", href: "/#lp-footer"   },
          ].map(({ label, href }) => (
            <a key={label} href={href} className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              {label}
            </a>
          ))}
          <span className="lp-mobile-nav-link" style={{ cursor: "default", color: "#9ca3af" }}>Resources ▾</span>
          <a href="/#quote-form" className="lp-mobile-cta" onClick={() => setMobileMenuOpen(false)}>
            Get a Quote
          </a>
        </nav>
      )}

      {authOpen && (
        <AuthModal
          open={authOpen}
          onClose={() => { setAuthOpen(false); setCartAuthPending(false); }}
          onSignedIn={(user: Customer) => {
            setCurrentUser(user);
            try { localStorage.setItem("wp_user", JSON.stringify(user)); } catch { /* ignore */ }
            setAuthOpen(false);
            if (cartAuthPending) { setCartAuthPending(false); window.location.href = "/cart"; }
          }}
        />
      )}
    </>
  );
}
