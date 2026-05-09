"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { categories, catalogGroups, groupProductsByCatalog } from "@/lib/data";
import type { Product } from "@/lib/types";

type ProductFormState = {
  slug: string;
  name: string;
  category: string;
  image: string;
  imageName: string;
  description: string;
  startingPrice: string;
  specs: string;
};

const emptyForm = (category = categories[0]?.slug ?? ""): ProductFormState => ({
  slug: "",
  name: "",
  category,
  image: "",
  imageName: "",
  description: "",
  startingPrice: "",
  specs: "",
});

function specsToText(specs: Product["specs"]) {
  return specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n");
}

function parseSpecsText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");

      if (separator === -1) {
        return { label: line, value: line };
      }

      const label = line.slice(0, separator).trim();
      const specValue = line.slice(separator + 1).trim();

      if (!label || !specValue) {
        return null;
      }

      return { label, value: specValue };
    })
    .filter((item): item is { label: string; value: string } => item !== null);
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };

    reader.onerror = () => {
      reject(new Error("Unable to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

type SidebarItem = {
  label: string;
  href: string;
  count?: number;
  active?: boolean;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

const sidebarSections: SidebarSection[] = [
  {
    title: "Catalogue",
    items: [
      { label: "Product listing", href: "#product-listing", count: 5, active: true },
      { label: "Templates", href: "/admin/templates" },
      { label: "Categories", href: "#admin-categories" },
      { label: "Reviews", href: "#admin-reviews", count: 3 }
    ]
  },
  {
    title: "Commerce",
    items: [
      { label: "Orders", href: "#admin-orders", count: 12 },
      { label: "Inventory", href: "#admin-inventory" },
      { label: "Customers", href: "#admin-customers" },
      { label: "Analytics", href: "#admin-analytics" }
    ]
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "#admin-settings" }]
  }
];

const statusStyles = [
  { label: "Active", tone: "success" },
  { label: "Active", tone: "success" },
  { label: "Low stock", tone: "warning" },
  { label: "Active", tone: "success" },
  { label: "Draft", tone: "danger" }
] as const;

function getStatusForProduct(index: number) {
  return statusStyles[index % statusStyles.length];
}

type AdminProductManagerProps = {
  initialProducts: Product[];
};

export function AdminProductManager({ initialProducts }: AdminProductManagerProps) {
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [saving, setSaving] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/products", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load products.");
      }

      const data = (await response.json()) as { products: Product[] };
      setProducts(data.products || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function startCreate() {
    setEditingSlug(null);
    setForm(emptyForm(categories[0]?.slug ?? ""));
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function startEdit(product: Product) {
    setEditingSlug(product.slug);
    setIsFormOpen(true);
    setForm({
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.image,
      imageName: "Existing image",
      description: product.description,
      startingPrice: product.startingPrice,
      specs: specsToText(product.specs),
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category,
      image: form.image.trim(),
      description: form.description.trim(),
      startingPrice: form.startingPrice.trim(),
      specs: parseSpecsText(form.specs)
    };

    try {
      const response = await fetch(
        editingSlug ? `/api/products/${editingSlug}` : "/api/products",
        {
          method: editingSlug ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = (await response.json()) as {
        product?: Product;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to save product.");
      }

      setMessage(editingSlug ? "Product updated." : "Product created.");
      if (data.product) {
        setEditingSlug(data.product.slug);
        setForm({
          slug: data.product.slug,
          name: data.product.name,
          category: data.product.category,
          image: data.product.image,
          imageName: "Existing image",
          description: data.product.description,
          startingPrice: data.product.startingPrice,
          specs: specsToText(data.product.specs),
        });
      }

      await loadProducts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);

    setForm((current) => ({
      ...current,
      image: dataUrl,
      imageName: file.name
    }));
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/products/${product.slug}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to delete product.");
      }

      if (editingSlug === product.slug) {
        startCreate();
      }

      setMessage("Product deleted.");
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete product.");
    }
  }

  const productCount = products.length;
  const groupedProducts = groupProductsByCatalog(products);
  const categoryCount = groupedProducts.length;
  const latestUpdatedAt = products
    .map((product) => product.updatedAt || product.createdAt || "")
    .filter(Boolean)
    .sort()
    .at(-1);

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
                    {typeof item.count === "number" && (
                      <span className="admin-sidebar-count">{item.count}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="admin-main">
          <header className="admin-page-header" id="admin-dashboard">
            <div>
              <p className="admin-page-kicker">DASHBOARD / ADMIN</p>
              <h1>
                Admin <span>Dashboard</span>
              </h1>
              <p className="admin-breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden="true">›</span>
                <span>Admin Dashboard</span>
              </p>
              <p className="lead">
                Keep the product listing current with live create, edit, and delete actions.
              </p>
            </div>

            <div className="admin-actions">
              <button className="button button-secondary admin-button-outline" type="button" onClick={startCreate}>
                + New product
              </button>
              <button className="button button-primary admin-button-solid" type="button" onClick={loadProducts}>
                Refresh
              </button>
            </div>
          </header>

          <div className="metric-grid admin-metrics" id="admin-categories">
            <article className="metric-card">
              <span>Catalog products</span>
              <strong>{productCount}</strong>
            </article>
            <article className="metric-card">
              <span>Active categories</span>
              <strong>{categoryCount}</strong>
            </article>
            <article className="metric-card">
              <span>Latest update</span>
              <strong>{formatDate(latestUpdatedAt)}</strong>
            </article>
           
          </div>

          {(message || error) && (
            <div
              className={`panel admin-banner ${error ? "admin-banner-error" : "admin-banner-success"}`}
            >
              {error || message}
            </div>
          )}

          <div className="panel admin-list-panel" id="product-listing">
            <div className="panel-heading admin-list-heading">
              <div>
                <h2>Product listing</h2>
                <span>{loading ? "Loading..." : `${products.length} records`}</span>
              </div>
              <div className="admin-panel-actions">
                <button
                  className="button button-secondary button-inline admin-button-outline"
                  type="button"
                  onClick={startCreate}
                >
                  + Add product
                </button>
                <button
                  className="button button-primary button-inline admin-button-solid"
                  type="button"
                  onClick={loadProducts}
                >
                  Sync
                </button>
              </div>
            </div>

            <div className="admin-group-list">
              {groupedProducts.map((group) => (
                <section className="admin-group-panel" key={group.slug}>
                  <div className="panel-heading admin-group-heading">
                    <h3>{group.title}</h3>
                    <span>
                      {group.products.length} product
                      {group.products.length === 1 ? "" : "s"}
                    </span>
                  </div>

              
                  <div className="table admin-table">
                    <div className="table-row table-head admin-table-head">
                      <span>Product</span>
                      <span>Category</span>
                      <span>Price</span>
                      <span>Status</span>
                      <span>Updated</span>
                      <span>Actions</span>
                    </div>

                    {group.products.map((product) => {
                      const index = products.findIndex((item) => item.slug === product.slug);
                      const status = getStatusForProduct(index);

                      return (
                        <div className="table-row admin-table-row" key={product.slug}>
                          <span className="admin-product-name">
                            <strong>{product.name}</strong>
                            <small>{product.slug}</small>
                          </span>
                          <span>
                            <span className="admin-pill">{product.categoryName}</span>
                          </span>
                          <span className="admin-price">{product.startingPrice}</span>
                          <span>
                            <span className={`admin-status admin-status-${status.tone}`}>
                              <span className="admin-status-dot" />
                              {status.label}
                            </span>
                          </span>
                          <span className="admin-updated">{formatDate(product.updatedAt || product.createdAt)}</span>
                          <span className="admin-row-actions">
                            <button
                              className="button button-secondary button-inline admin-button-outline"
                              type="button"
                              onClick={() => startEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              className="button button-secondary button-inline admin-button-danger"
                              type="button"
                              onClick={() => handleDelete(product)}
                            >
                              Delete
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}

              {!loading && groupedProducts.length === 0 && (
                <div className="admin-empty">No products yet.</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {isFormOpen && (
        <div className="admin-modal-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div
            className="panel admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <h2 id="admin-product-form-title">{editingSlug ? "Edit product" : "Create product"}</h2>
                <span>{editingSlug ? editingSlug : "New catalog item"}</span>
              </div>
              <button className="button button-dark button-inline" type="button" onClick={() => setIsFormOpen(false)}>
                Close
              </button>
            </div>

            <form className="admin-form" onSubmit={handleSubmit} id="product-editor">
              <label>
                Slug
                <input
                  required
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="custom-mailer-box"
                />
              </label>

              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Custom Mailer Box"
                />
              </label>

              <label>
                Category
                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  {catalogGroups.map((group) => (
                    <optgroup key={group.slug} label={group.title}>
                      {categories
                        .filter((category) => category.groupSlug === group.slug)
                        .map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label>
                Image
                <input
                  required={!editingSlug}
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    void handleImageChange(event);
                  }}
                />
                <span className="admin-field-help">
                  {form.imageName || "Upload an image from your computer"}
                </span>
                {form.image && (
                  <span className="admin-image-preview">
                    <img alt="" className="product-image" src={form.image} />
                  </span>
                )}
              </label>

              <label>
                Starting price
                <input
                  required
                  value={form.startingPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startingPrice: event.target.value }))
                  }
                  placeholder="$180"
                />
              </label>

              <label className="full-width">
                Description
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Starter packaging product for branded shipping and unboxing."
                />
              </label>

              <label className="full-width">
                Specs
                <textarea
                  required
                  rows={6}
                  value={form.specs}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, specs: event.target.value }))
                  }
                  placeholder="Board: E-flute corrugated"
                />
              </label>

              <div className="button-row admin-form-actions">
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingSlug ? "Update product" : "Create product"}
                </button>
                <button className="button button-secondary" type="button" onClick={startCreate}>
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
