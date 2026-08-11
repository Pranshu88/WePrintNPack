"use client";

import { Fragment, useState, useEffect } from "react";
import Image from "next/image";
import LandingContactForm from "@/components/landing-form";
import PopularProductsCarousel from "@/components/popular-products-carousel";
import { LISTING_ALLOWED_CATEGORIES, LISTING_EXCLUDED_SLUGS } from "@/lib/data";
import AuthModal from "@/components/auth-modal";
import { WelcomePopup } from "@/components/welcome-popup";
import { PolicyModal } from "@/components/policy-modal";
import type { Product } from "@/lib/types";

const WHATSAPP = "19024122133";

const howItWorks = [
  { num: "1", title: "Choose Your Product", desc: "Select from 100+ printing products and services.",          color: "#7c3aed" },
  { num: "2", title: "Upload or Design",    desc: "Upload your artwork or use our easy online design tools.",  color: "#db2777" },
  { num: "3", title: "Review & Approve",    desc: "We'll review your order and ensure everything is perfect.", color: "#0d9488" },
  { num: "4", title: "Print & Deliver",     desc: "High-quality printing with fast, reliable delivery to you.",color: "#f97316" },
];

function HowIcon({ num, color }: { num: string; color: string }) {
  if (num === "1") return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  );
  if (num === "2") return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
  if (num === "3") return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 12 10 17 19 8"/>
    </svg>
  );
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

const trustBadges = [
  { icon: "🔒", title: "Secure Payment" },
  { icon: "⭐", title: "Satisfaction Guaranteed" },
  { icon: "🔄", title: "Easy Reorder" },
  { icon: "💰", title: "Bulk Discounts\nSave More" },
  { icon: "🌿", title: "Eco-Friendly Printing" },
];

const gallery = [
  { src: "/images/recent1.png", label: "Business Cards" },
  { src: "/images/recent2.png", label: "Flyers & Prints" },
  { src: "/images/recent3.png", label: "Print Design" },
  { src: "/images/recent4.png", label: "Visiting Cards" },
  { src: "/images/recent5.png", label: "Custom T-Shirts" },
  { src: "/images/recent6.png", label: "Brand Cards" },
];

type Customer = { id: string; firstName: string; lastName: string; email: string };

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartAuthPending, setCartAuthPending] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartToast, setCartToast] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<string>("4.9");
  const [policyOpen, setPolicyOpen] = useState<"privacy" | "terms" | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [carouselProducts, setCarouselProducts] = useState<Product[]>([]);
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
    try {
      const cart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as unknown[];
      setCartCount(cart.length);
    } catch { /* ignore */ }
    fetch("/api/reviews/stats")
      .then((r) => r.json())
      .then((d: { average: number | null }) => {
        if (d.average !== null) setRatingAvg(String(d.average));
      })
      .catch(() => { /* keep default */ });
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products: Product[] }) => {
        const listing = d.products.filter(
          (p) => LISTING_ALLOWED_CATEGORIES.has(p.category) && !LISTING_EXCLUDED_SLUGS.has(p.slug)
        );
        // Popular Products carousel shows every product's gallery templates, not just the
        // curated set used for the "Browse by Category" cards below.
        setCarouselProducts(d.products.filter((p) => !LISTING_EXCLUDED_SLUGS.has(p.slug)));
        const deduped = listing.reduce<Product[]>((acc, p) => {
          if (p.category === "flyers") return acc;
          if (p.category === "t-shirts") {
            if (!acc.some((x) => x.category === "t-shirts")) acc.push({ ...p, name: "T-Shirts" });
          } else {
            acc.push(p);
          }
          return acc;
        }, []);
        setCategoryProducts(deduped);
      })
      .catch(() => { /* keep empty */ });

  }, []);

  useEffect(() => {
    // Scroll-triggered animations (re-scans whenever new .lp-anim nodes, e.g. category cards, mount)
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("lp-visible"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".lp-anim").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categoryProducts]);

  function handleCartClick() {
    if (cartCount === 0) {
      setCartToast(true);
      setTimeout(() => setCartToast(false), 2500);
      return;
    }
    if (currentUser) {
      window.location.href = "/cart";
    } else {
      setCartAuthPending(true);
      setAuthOpen(true);
    }
  }

  return (
    <div className="landing-page">

      <WelcomePopup />
      {policyOpen && <PolicyModal type={policyOpen} onClose={() => setPolicyOpen(null)} />}

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────── */}
      <div className="lp-announce-bar">
        <div className="lp-announce-track">
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1 ? true : undefined} style={{ display: "inline-flex" }}>
              <span className="lp-announce-item">🎉 Get 10% OFF your first order! &nbsp;|&nbsp; Use code: <strong>WELCOME10</strong></span>
              <span className="lp-announce-item">📦 Free Shipping on orders over $200</span>
              <span className="lp-announce-item">📞 Need help? &nbsp;<strong>+1 902-412-2133</strong></span>
              <span className="lp-announce-item">🚀 Canada Wide Delivery</span>
              <span className="lp-announce-item">✅ 100% Satisfaction Guaranteed</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="/landing" className="lp-brand">
            <Image src="/images/applogo.jpeg" alt="We Print N Pack" width={250} height={80} className="lp-brand-img" style={{ width: 250, height: 80, objectFit: "fill", marginLeft: -10 }} priority />
          </a>

          <nav className="lp-nav">
            <a href="#lp-popular"   className="lp-nav-link lp-nav-active">Products</a>
            <span
              style={{ position: "relative", display: "inline-block" }}
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <a href="#lp-products" className="lp-nav-link">Services</a>
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
            <a href="#lp-footer"    className="lp-nav-link">About Us</a>
            <span className="lp-nav-link" style={{ cursor: "default", pointerEvents: "none" }}>Resources ▾</span>
          </nav>

          {/* Hamburger (mobile only) */}
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

              {/* Profile dropdown */}
              {currentUser && profileOpen && (
                <>
                  {/* Backdrop to close */}
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 998 }}
                    onClick={() => setProfileOpen(false)}
                  />
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    background: "#fff", borderRadius: 12, zIndex: 999,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.14)", minWidth: 200,
                    border: "1px solid #f3f4f6", overflow: "hidden",
                  }}>
                    {/* User info */}
                    <div style={{
                      padding: "14px 16px",
                      background: "linear-gradient(135deg, #7c3aed, #db2777)",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        {currentUser.email}
                      </div>
                    </div>
                    {/* My Orders */}
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
                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        setCurrentUser(null);
                        setProfileOpen(false);
                        try { localStorage.removeItem("wp_user"); } catch { /* ignore */ }
                      }}
                      style={{
                        width: "100%", padding: "12px 16px",
                        background: "#fff", border: "none",
                        textAlign: "left", cursor: "pointer",
                        fontSize: "0.88rem", fontWeight: 600,
                        color: "#dc2626",
                        display: "flex", alignItems: "center", gap: 8,
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
            <button
              className="lp-header-icon lp-cart-icon"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", position: "relative" }}
              aria-label="View cart"
              onClick={handleCartClick}
            >
              🛒
              {cartCount > 0 && <span className="lp-cart-badge">{cartCount}</span>}
            </button>
            <a href="#quote-form" className="lp-header-cta">Get a Quote</a>
          </div>
        </div>
      </header>

      {/* ── Mobile nav drawer ──────────────────────────────── */}
      {mobileMenuOpen && (
        <nav className="lp-mobile-nav">
          {[
            { label: "Products",   href: "#lp-popular"  },
            { label: "Services",   href: "#lp-products" },
            { label: "Deals",      href: "#"            },
            { label: "About Us",   href: "#lp-footer"   },
          ].map((link) => (
            <a key={link.label} href={link.href} className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <span className="lp-mobile-nav-link" style={{ cursor: "default", color: "#9ca3af" }}>Resources ▾</span>
          <a href="#quote-form" className="lp-mobile-cta" onClick={() => setMobileMenuOpen(false)}>
            Get a Quote
          </a>
        </nav>
      )}

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-body">
          <div className="lp-hero-left">
            <div className="lp-premium-badge">
              <span>QUALITY PRINTING, ENDLESS POSSIBILITIES</span>
            </div>
            <h1>
              Print Solutions that<br />
              <span className="lp-hero-brand-gradient">Build Your Brand.</span>
            </h1>
            <p className="lp-hero-sub">
              High-quality printing, custom packaging, and fast delivery to help your business stand out.
            </p>
            <ul className="lp-hero-checks">
              <li><span className="lp-ck">✓</span> Premium Quality Materials</li>
              <li><span className="lp-ck">✓</span> Fast Turnaround Time</li>
              <li><span className="lp-ck">✓</span> Free Shipping on Orders Over $200</li>
              <li><span className="lp-ck">✓</span> 100% Satisfaction Guaranteed</li>
            </ul>
            <div className="lp-hero-btns">
              <a href="#lp-products" className="lp-btn-primary">Shop Now</a>
              <a href="#quote-form"  className="lp-btn-outline">Get a Free Quote</a>
            </div>
          </div>

          <div className="lp-hero-right">
            <div className="lp-hero-showcase">
              <Image
                src="/images/hero-products.jpg"
                alt="We Print N Pack – Custom Printing & Packaging Products"
                fill
                sizes="(max-width:860px) 100vw, 55vw"
                style={{ objectFit: "contain", objectPosition: "center" }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="lp-stats-bar">
          <div className="lp-stat">
            <strong className="lp-stat-num lp-stat-purple">500+</strong>
            <span>Happy Customers</span>
          </div>
          <div className="lp-stat">
            <strong className="lp-stat-num lp-stat-pink">10K+</strong>
            <span>Orders Delivered</span>
          </div>
          <div className="lp-stat">
            <strong className="lp-stat-num lp-stat-teal">{ratingAvg}/5</strong>
            <span>Customer Rating</span>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-with-icon">
              <span className="lp-stat-icon-sm">🚚</span>
              <div className="lp-stat-icon-text">
                <strong>Canada Wide</strong>
                <span>Shipping</span>
              </div>
            </div>
          </div>
          <div className="lp-stat">
            <div className="lp-stat-with-icon">
              <span className="lp-stat-icon-sm">⏰</span>
              <div className="lp-stat-icon-text">
                <strong>24/7</strong>
                <span>Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRINT & PACKAGING ──────────────────────────────── */}
      <section className="lp-sec lp-pp" id="lp-pp">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-centered lp-anim">
            <h2>PRINT &amp; PACKAGING</h2>
            <div className="lp-underline-bar" />
          </div>
          <div className="lp-pp-grid">
            <a href="/products" className="lp-pp-card lp-pp-card--green lp-anim lp-anim-d1">
              <div className="lp-pp-head">
                <span className="lp-pp-title">Design &amp; Print</span>
                <span className="lp-pp-arrow">
                  <Image src="/images/ic_arrow.png" alt="" width={48} height={48} />
                </span>
              </div>
              <div className="lp-pp-img-wrap">
                <Image src="/images/ic_print1.png" alt="Design & Print" fill sizes="(max-width:860px) 100vw, 50vw" style={{ objectFit: "cover" }} />
              </div>
            </a>
            <a href="/products/packaging-box" className="lp-pp-card lp-pp-card--blue lp-anim lp-anim-d2">
              <div className="lp-pp-head">
                <span className="lp-pp-title">Dieline Template<br />Maker</span>
                <span className="lp-pp-arrow">
                  <Image src="/images/ic_arrow.png" alt="" width={48} height={48} />
                </span>
              </div>
              <div className="lp-pp-img-wrap">
                <Image src="/images/ic_design1.png" alt="Dieline Template Maker" fill sizes="(max-width:860px) 100vw, 50vw" style={{ objectFit: "cover" }} />
              </div>
            </a>
            <a href="/products/mockup-generator" className="lp-pp-card lp-pp-card--purple lp-anim lp-anim-d3">
              <div className="lp-pp-head">
                <span className="lp-pp-title">Mockup Generator</span>
                <span className="lp-pp-arrow">
                  <Image src="/images/ic_arrow.png" alt="" width={48} height={48} />
                </span>
              </div>
              <div className="lp-pp-img-wrap">
                <Image src="/images/ic_mockup.png" alt="Mockup Generator" fill sizes="(max-width:860px) 100vw, 33vw" style={{ objectFit: "cover" }} />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── POPULAR PRODUCTS ───────────────────────────────── */}
      <section className="lp-sec lp-popular" id="lp-popular">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-centered lp-anim">
            <h2>POPULAR PRODUCTS</h2>
            <div className="lp-underline-bar" />
          </div>
          <PopularProductsCarousel products={carouselProducts} />
        </div>
      </section>

      {/* ── QUOTE FORM ─────────────────────────────────────── */}
      <section className="lp-form-sec" id="quote-form">
        <div className="lp-wrap">
          <div className="lp-form-grid">
            <div className="lp-form-info lp-anim">
              <span className="lp-tag-orange">GET YOUR FREE QUOTE</span>
              <h2 className="lp-form-title">Let&apos;s Bring Your<br />Ideas to Life!</h2>
              <p className="lp-form-sub">Fill out the form and we&apos;ll get back to you with the best offer.</p>
              <ul className="lp-check-list">
                <li><span className="lp-ck">✓</span> Quick Response</li>
                <li><span className="lp-ck">✓</span> Best Price Guarantee</li>
                <li><span className="lp-ck">✓</span> 100% Secure &amp; Confidential</li>
                <li><span className="lp-ck">✓</span> Satisfaction Guaranteed</li>
              </ul>
              <div className="lp-quote-plane">
                <Image src="/images/aeroplane.png" alt="Aeroplane" width={420} height={200} className="lp-quote-plane-img" />
              </div>
            </div>
            <div className="lp-form-card">
              <LandingContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section className="lp-sec lp-how" id="lp-how">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-centered lp-anim">
            <h2>HOW IT WORKS</h2>
            <div className="lp-underline-bar" />
          </div>
          <div className="lp-how-row">
            {howItWorks.map((step, i) => (
              <Fragment key={step.num}>
                <div className={`lp-how-step lp-anim lp-anim-d${i + 1}`}>
                  <div className="lp-how-badges">
                    <div className="lp-how-num" style={{ background: step.color }}>
                      {step.num}
                    </div>
                    <span className="lp-how-inner-dash" />
                    <div className="lp-how-icon-ring" style={{ borderColor: step.color }}>
                      <HowIcon num={step.num} color={step.color} />
                    </div>
                  </div>
                  <strong className="lp-how-title">{step.title}</strong>
                  <p className="lp-how-desc">{step.desc}</p>
                </div>
                {i < howItWorks.length - 1 && <div className="lp-how-connector" />}
              </Fragment>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-wrap lp-cta-inner">
          <div className="lp-cta-copy lp-anim">
            <h2>Ready to bring your ideas to life?</h2>
            <p>Get started with premium printing solutions today.</p>
            <a href="#quote-form" className="lp-cta-btn lp-cta-btn-white">Get Started</a>
          </div>
          <div className="lp-cta-img">
            <Image
              src="/images/banner.png"
              alt="Print products"
              fill
              sizes="(max-width:860px) 100vw, 50vw"
              style={{ objectFit: "cover", objectPosition: "left center" }}
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="lp-footer" id="lp-footer">
        {/* Trust badges */}
        <div className="lp-trust-bar">
          <div className="lp-wrap lp-trust-inner">
            {trustBadges.map((b, i) => (
              <div key={b.title} className={`lp-trust-item lp-anim lp-anim-d${i + 1}`}>
                <span className="lp-trust-icon">{b.icon}</span>
                <span className="lp-trust-label">{b.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-wrap">
          <div className="lp-foot-cols">
            {/* Brand */}
            <div className="lp-foot-brand">
              <a href="/landing" className="lp-foot-logo">
                <Image src="/images/applogo.jpeg" alt="We Print N Pack" width={48} height={48} style={{ borderRadius: 10, objectFit: "cover" }} />
                <div>
                  <span className="lp-foot-logo-name">WE PRINT N PACK</span>
                  <span className="lp-foot-logo-tag">PRINT. DESIGN. PACK. DELIVER.</span>
                </div>
              </a>
              <p>Your trusted printing &amp; packaging partner in Halifax and across Canada.</p>
              <div className="lp-social-row">
                <a href="#" className="lp-social" aria-label="Facebook">f</a>
                <a href="#" className="lp-social" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                </a>
              </div>
            </div>

            {/* Shop */}
            <div className="lp-foot-col">
              <h4>SHOP</h4>
              <ul className="lp-foot-links">
                <li><a href="/products/business-cards">Business Printing</a></li>
                <li><a href="/products/promotional-products">Promotional Products</a></li>
                <li><a href="/products/t-shirts">T-Shirts</a></li>
                <li><a href="/products/marketing-material">Marketing Material</a></li>
                <li><a href="/products/packaging-box">Packaging Box</a></li>
              </ul>
            </div>

            {/* Services */}
            <div className="lp-foot-col">
              <h4>SERVICES</h4>
              <ul className="lp-foot-links">
                <li><a href="#">Graphic Design</a></li>
                <li><a href="#">Packaging Solutions</a></li>
                <li><a href="#">Large Format Printing</a></li>
                <li><a href="#">Mailing &amp; Fulfilment</a></li>
                <li><a href="#">Branding Services</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="lp-foot-col">
              <h4>RESOURCES</h4>
              <ul className="lp-foot-links">
                <li><a href="#lp-how">How to Order</a></li>
                <li><a href="#">Design Guides</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Help Center</a></li>
              </ul>
            </div>

            {/* About */}
            <div className="lp-foot-col">
              <h4>ABOUT</h4>
              <ul className="lp-foot-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#lp-how">Our Process</a></li>
                <li><a href="#">Reviews</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setPolicyOpen("privacy"); }}>Privacy Policy</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setPolicyOpen("terms"); }}>Terms &amp; Conditions</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="lp-foot-col">
              <h4>CONTACT US</h4>
              <div className="lp-foot-contacts">
                <div className="lp-foot-contact"><span>📞</span><span>+1 902-412-2133</span></div>
                <div className="lp-foot-contact"><span>✉️</span><span>info@weprintnpack.ca</span></div>
                <div className="lp-foot-contact"><span>📍</span><span>Halifax, Nova Scotia, Canada</span></div>
                <div className="lp-foot-contact"><span>🕐</span><span>Mon – Sat: 9:00 AM – 6:00 PM</span></div>
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* ── WHATSAPP FLOAT ─────────────────────────────────── */}
      <a
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi! I'd like to get a print quote.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="lp-wa-float"
        aria-label="Chat on WhatsApp"
      >
        💬
      </a>

      {/* ── AUTH MODAL ─────────────────────────────────────── */}
      <AuthModal
        open={authOpen}
        onClose={() => { setAuthOpen(false); setCartAuthPending(false); }}
        onSignedIn={(customer) => {
          setCurrentUser(customer);
          try { localStorage.setItem("wp_user", JSON.stringify(customer)); } catch { /* ignore */ }
          setAuthOpen(false);
          if (cartAuthPending) {
            setCartAuthPending(false);
            window.location.href = "/cart";
          }
        }}
      />

      {/* Cart toast */}
      {cartToast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "#111827", color: "#fff",
          padding: "12px 24px", borderRadius: 12,
          fontSize: "0.92rem", fontWeight: 600,
          boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "lp-toast-in 0.2s ease",
        }}>
          🛒 No items added to cart
        </div>
      )}

    </div>
  );
}
