"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { AdminTemplateSection } from "./admin-template-section";

const sidebarSections = [
  {
    title: "Catalogue",
    items: [
      { label: "Product listing", href: "/admin", active: false },
      { label: "Templates", href: "/admin/templates", active: true },
      { label: "Categories", href: "/admin#admin-categories", active: false },
      { label: "Reviews", href: "/admin#admin-reviews", active: false },
    ],
  },
  {
    title: "Commerce",
    items: [
      { label: "Orders", href: "/admin#admin-orders", active: false },
      { label: "Inventory", href: "/admin#admin-inventory", active: false },
      { label: "Customers", href: "/admin#admin-customers", active: false },
      { label: "Analytics", href: "/admin#admin-analytics", active: false },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/admin#admin-settings", active: false }],
  },
];

export function AdminTemplatesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => setProducts(data.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section admin-page">
      <div className="container container-wide admin-shell">
        <aside className="admin-sidebar">
          {sidebarSections.map((section) => (
            <div className="admin-sidebar-section" key={section.title}>
              <p className="admin-sidebar-title">{section.title}</p>
              <div className="admin-sidebar-links">
                {section.items.map((item) => (
                  <Link
                    className={`admin-sidebar-link ${item.active ? "is-active" : ""}`}
                    href={item.href}
                    key={item.label}
                  >
                    <span className="admin-sidebar-icon" aria-hidden="true" />
                    <span className="admin-sidebar-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="admin-main">
          <header className="admin-page-header">
            <div>
              <p className="admin-page-kicker">DASHBOARD / ADMIN</p>
              <h1>
                Product <span>Templates</span>
              </h1>
              <p className="admin-breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">›</span>
                <Link href="/admin">Admin</Link>
                <span aria-hidden="true">›</span>
                <span>Templates</span>
              </p>
              <p className="lead">
                Manage gallery templates and design options for each product.
              </p>
            </div>
          </header>

          {loading ? (
            <div style={{ padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" }}>
              Loading products…
            </div>
          ) : (
            <AdminTemplateSection products={products} />
          )}
        </div>
      </div>
    </section>
  );
}
