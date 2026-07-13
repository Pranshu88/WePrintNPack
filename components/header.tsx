"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./header.module.css";

const navLinks = [
  { label: "Home",         href: "/"            },
  { label: "Products",     href: "/products"    },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Why Us",       href: "/why-us"      },
  { label: "Our Work",     href: "/our-work"    },
  { label: "Contact",      href: "/contact"     },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>

        {/* ── Logo ─────────────────────────────────────── */}
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/applogo.jpeg"
            alt="We Print N Pack"
            width={180}
            height={52}
            className={styles.brandImg}
            priority
          />
        </Link>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav className={styles.nav} aria-label="Primary">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && (pathname ?? "").startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ── CTA ──────────────────────────────────────── */}
        <Link href="/landing#quote-form" className={styles.cta}>
          ↑ Upload Design
        </Link>

        {/* ── Hamburger (mobile only) ───────────────────── */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`${styles.hLine} ${menuOpen ? styles.hLineTop : ""}`} />
          <span className={`${styles.hLine} ${menuOpen ? styles.hLineMid : ""}`} />
          <span className={`${styles.hLine} ${menuOpen ? styles.hLineBot : ""}`} />
        </button>

      </div>

      {/* ── Mobile drawer ────────────────────────────── */}
      {menuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && (pathname ?? "").startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileNavLink} ${active ? styles.navActive : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/landing#quote-form" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>
            ↑ Upload Design
          </Link>
        </nav>
      )}
    </header>
  );
}
