import Image from "next/image";
import LandingContactForm from "@/components/landing-form";

export const dynamic = "force-static";

/* ── DATA ────────────────────────────────────────────────── */
const WHATSAPP = "19024122133"; // country code + number, no + or spaces

const products = [
  { name: "Business Cards", img: "/images/product1.png" },
  { name: "Flyers",         img: "/images/product2.png" },
  { name: "Yard Signs",     img: "/images/product3.png" },
  { name: "Stickers",       img: "/images/prodcut4.png" },
  { name: "Banners",        img: "/images/product5.png" },
  { name: "Packaging",      img: "/images/product6.png" },
];

const features = [
  { icon: "🖨️", title: "High Quality Prints",  desc: "We use premium materials and latest technology."              },
  { icon: "⚡",  title: "Fast Turnaround",       desc: "Quick processing and on-time delivery."                       },
  { icon: "💰",  title: "Affordable Pricing",    desc: "Competitive prices without compromising on quality."          },
  { icon: "🎨",  title: "Custom Solutions",      desc: "Tailored printing & packaging solutions for your brand."      },
  { icon: "💬",  title: "Customer Support",      desc: "We're here to help you at every step of the way."            },
];

const gallery = [
  { src: "/images/recent1.png", label: "Business Cards" },
  { src: "/images/recent2.png", label: "Flyers & Prints" },
  { src: "/images/recent3.png", label: "Print Design" },
  { src: "/images/recent4.png", label: "Visiting Cards" },
  { src: "/images/recent5.png", label: "Custom T-Shirts" },
  { src: "/images/recent6.png", label: "Brand Cards" },
];

/* ── PAGE ────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing-page">

      {/* ── HEADER ─────────────────────────────────────── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="/landing" className="lp-brand">
            <Image
              src="/images/applogo.jpeg"
              alt="We Print N Pack"
              width={50}
              height={50}
              className="lp-brand-img"
              priority
            />
            <div className="lp-brand-text">
              <strong>WE PRINT N PACK</strong>
              <span>PRINT. DESIGN. PACK. DELIVER.</span>
            </div>
          </a>

          <nav className="lp-nav">
            <a href="#"              className="lp-nav-link lp-nav-active">Home</a>
            <a href="#lp-products"   className="lp-nav-link">Products</a>
            <a href="#lp-features"   className="lp-nav-link">How It Works</a>
            <a href="#lp-features"   className="lp-nav-link">Why Us</a>
            <a href="#lp-gallery"    className="lp-nav-link">Our Work</a>
            <a href="#lp-footer"     className="lp-nav-link">Contact</a>
          </nav>

          <a href="#quote-form" className="lp-header-cta">↑ Upload Design</a>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-body">
          {/* Left */}
          <div className="lp-hero-left">
          <div className="lp-premium-badge">
            <span>PREMIUM QUALITY</span>
            <span className="lp-separator">•</span>
            <span className="lp-fast-text">FAST TURNAROUND</span>
          </div>
            <h1>
              Custom Printing &amp; Packaging &ndash;<br />
              <span className="lp-col-pink">Fast,</span>{" "}
              <span className="lp-col-orange">Affordable,</span>{" "}
              <span className="lp-col-green">Reliable.</span>
            </h1>
            <p className="lp-hero-sub">
              High-quality prints that make your brand stand out.
              Quick turnaround. Delivered right to your door.
            </p>
            <div className="lp-hero-btns">
              <a href="#quote-form" className="lp-btn-orange">↑ Upload Design</a>
              <a href="#quote-form" className="lp-btn-dark">Get Quote →</a>
            </div>
          </div>

          {/* Right — branded product showcase */}
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
            <span className="lp-stat-icon">🚚</span>
            <div><strong>Fast Delivery</strong><span>On-time, every time</span></div>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-icon">💰</span>
            <div><strong>Best Pricing</strong><span>Affordable always</span></div>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-icon">⭐</span>
            <div><strong>Premium Quality</strong><span>Top-notch prints</span></div>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-icon">🔒</span>
            <div><strong>100% Secure</strong><span>Safe &amp; confidential</span></div>
          </div>
        </div>
      </section>

      {/* ── OUR PRODUCTS ───────────────────────────────── */}
      <section className="lp-sec lp-products" id="lp-products">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-centered">
            <h2>Our Products</h2>
            <div className="lp-dots">
              <span /><span /><span /><span /><span />
            </div>
          </div>
          <div className="lp-prod-grid">
            {products.map((p) => (
              <a key={p.name} href="#quote-form" className="lp-prod-card">
                <div className="lp-prod-img">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    sizes="(max-width:640px) 50vw, 200px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="lp-prod-info">
                  <span className="lp-prod-name">{p.name}</span>
                  <span className="lp-prod-link">Explore →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE FORM ─────────────────────────────────── */}
      <section className="lp-form-sec" id="quote-form">
        <div className="lp-wrap">
          <div className="lp-form-grid">
            {/* Left info */}
            <div className="lp-form-info">
              <span className="lp-tag-orange">GET YOUR FREE QUOTE</span>
              <h2 className="lp-form-title">Let&apos;s Bring Your<br />Ideas to Life!</h2>
              <p className="lp-form-sub">
                Fill out the form and we&apos;ll get back to you with the best offer.
              </p>
              <ul className="lp-check-list">
                <li><span className="lp-ck">✓</span> Quick Response</li>
                <li><span className="lp-ck">✓</span> Best Price Guarantee</li>
                <li><span className="lp-ck">✓</span> 100% Secure &amp; Confidential</li>
                <li><span className="lp-ck">✓</span> Satisfaction Guaranteed</li>
              </ul>
              <div className="lp-quote-plane">
  <Image
    src="/images/aeroplane.png"
    alt="Aeroplane"
    width={420}
    height={200}
    className="lp-quote-plane-img"
  />
</div>
            </div>

            {/* Right form card */}
            <div className="lp-form-card">
              <LandingContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="lp-features" id="lp-features">
        <div className="lp-wrap">
          <div className="lp-feat-row">
            {features.map((f) => (
              <div key={f.title} className="lp-feat-item">
                <div className="lp-feat-ico">{f.icon}</div>
                <strong className="lp-feat-title">{f.title}</strong>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ────────────────────────────────────── */}
      <section className="lp-sec lp-gallery" id="lp-gallery">
        <div className="lp-wrap">
          <div className="lp-sec-head lp-centered">
            <h2>Our Recent Work</h2>
            <div className="lp-dots">
              <span /><span /><span /><span /><span />
            </div>
          </div>
          <div className="lp-gal-row">
            {gallery.map((g) => (
              <div key={g.src} className="lp-gal-card">
                <Image
                  src={g.src}
                  alt={g.label}
                  fill
                  sizes="(max-width:640px) 50vw, 200px"
                  style={{ objectFit: "cover" }}
                />
                <div className="lp-gal-overlay">
                  <span className="lp-gal-label">{g.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-centered">
            <a href="#quote-form" className="lp-view-more">View More Work →</a>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-wrap lp-cta-inner">
          <div className="lp-cta-plane">✈️</div>
          <div className="lp-cta-copy">
            <h2>Ready to Start Your Project?</h2>
            <p>Upload your design now and let&apos;s create something amazing together!</p>
          </div>
          <a href="#quote-form" className="lp-cta-btn">↑ Upload Design Now</a>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="lp-footer" id="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot-cols">

            {/* Brand */}
            <div className="lp-foot-brand">
              <a href="/landing" className="lp-foot-logo">
                <Image
                  src="/images/applogo.jpeg"
                  alt="We Print N Pack"
                  width={48}
                  height={48}
                  style={{ borderRadius: 10, objectFit: "cover" }}
                />
                <div>
                  <span className="lp-foot-logo-name">WE PRINT N PACK</span>
                  <span className="lp-foot-logo-tag">PRINT. DESIGN. PACK. DELIVER.</span>
                </div>
              </a>
              <p>
                Your trusted partner for all custom printing and packaging needs.
                Quality, speed, and reliability — every time.
              </p>
              <div className="lp-social-row">
                <a href="#" className="lp-social" aria-label="Facebook">f</a>
                <a href="#" className="lp-social" aria-label="Instagram">📷</a>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="lp-social" aria-label="WhatsApp">💬</a>
                <a href="#" className="lp-social" aria-label="LinkedIn">in</a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lp-foot-col">
              <h4>Quick Links</h4>
              <ul className="lp-foot-links">
                <li><a href="/landing">Home</a></li>
                <li><a href="#lp-products">Products</a></li>
                <li><a href="#lp-features">How It Works</a></li>
                <li><a href="#lp-features">Why Us</a></li>
                <li><a href="#lp-gallery">Our Work</a></li>
                <li><a href="#lp-footer">Contact</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="lp-foot-col">
              <h4>Contact Us</h4>
              <div className="lp-foot-contacts">
                <div className="lp-foot-contact">
                  <span className="lp-foot-contact-ico">📞</span>
                  <span>+1 902 412 2133</span>
                </div>
                <div className="lp-foot-contact">
                  <span className="lp-foot-contact-ico">✉️</span>
                  <span>info@weprintnpack.ca</span>
                </div>
                <div className="lp-foot-contact">
                  <span className="lp-foot-contact-ico">📍</span>
                  <span>
                    Maham International Inc. O/a WE Print n Pack<br />
                    646 Old Sackville Road<br />
                    Lower Sackville, Nova Scotia B4C 2K3<br />
                    Canada<br />
                    Hst no. 768775355RT0001<br />
                    Business number : 768775355NS0001
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="lp-foot-col">
              <h4>Chat on WhatsApp</h4>
              <p className="lp-wa-text">Have questions? Chat with us on WhatsApp!</p>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi! I'd like to get a print quote.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-wa-btn"
              >
                💬 Chat on WhatsApp
              </a>
            </div>
          </div>

          <div className="lp-foot-bottom">
            © 2025 We Print N Pack. All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
