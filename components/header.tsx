"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <header className={styles.header}>
      <div className={styles.bar}>

        {/* ── Logo ─────────────────────────────────────── */}
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/applogo.jpeg"
            alt="We Print N Pack"
            width={52}
            height={52}
            className={styles.brandImg}
            priority
          />
          <div className={styles.brandText}>
            <strong>WE PRINT N PACK</strong>
            <span>PRINT. DESIGN. PACK. DELIVER.</span>
          </div>
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

      </div>
    </header>
  );
}
