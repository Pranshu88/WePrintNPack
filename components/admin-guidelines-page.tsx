"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminNotificationBell from "./admin-notification-bell";
import { CATEGORY_SUBPRODUCT_OPTIONS, subProductSlug } from "@/lib/data";

type ProductOption = { slug: string; name: string };
type Guideline = { id: string; productSlug: string; label: string; fileUrl: string; createdAt: string };
type GuidelineKind = "preview" | "square" | "rounded" | "vertical";

const GUIDELINE_KINDS: { key: GuidelineKind; title: string }[] = [
  { key: "preview", title: "Preview" },
  { key: "square", title: "Square" },
  { key: "rounded", title: "Rounded" },
  { key: "vertical", title: "Vertical" },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

const S = {
  shell: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#f8f9fc" } as React.CSSProperties,
  sidebar: { width: 240, background: "#fff", borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column" as const, flexShrink: 0, overflow: "hidden" } as React.CSSProperties,
  logoBox: { padding: "20px 20px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
  nav: { flex: 1, padding: "16px 12px", overflowY: "auto" as const } as React.CSSProperties,
  navSection: { marginBottom: 24 } as React.CSSProperties,
  navTitle: { fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.09em", padding: "0 8px", marginBottom: 6, display: "block" },
  navItem: (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
    borderRadius: 10, textDecoration: "none", marginBottom: 2, fontSize: "0.875rem",
    fontWeight: active ? 600 : 500,
    background: active ? "linear-gradient(135deg, #7c3aed, #db2777, #f97316)" : "transparent",
    color: active ? "#fff" : "#374151", cursor: "pointer",
  }),
  mainArea: { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" } as React.CSSProperties,
  topBar: { background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "12px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 } as React.CSSProperties,
  content: { flex: 1, overflowY: "auto" as const, padding: "28px 32px" } as React.CSSProperties,
  panel: { background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } as React.CSSProperties,
  profileRow: { padding: "14px 16px", borderTop: "1px solid #f5f5f5", display: "flex", alignItems: "center", gap: 10 } as React.CSSProperties,
  avatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 } as React.CSSProperties,
};

export function AdminGuidelinesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [sinaliteId, setSinaliteId] = useState("");
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [files, setFiles] = useState<Record<GuidelineKind, File | null>>({ preview: null, square: null, rounded: null, vertical: null });
  const [previews, setPreviews] = useState<Record<GuidelineKind, string | null>>({ preview: null, square: null, rounded: null, vertical: null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleLogout() {
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }

  const loadGuidelines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guidelines", { cache: "no-store" });
      const data = await res.json() as { guidelines: Guideline[] };
      setGuidelines(data.guidelines ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slugFromUrl = params.get("slug");
    if (slugFromUrl) setSelectedSlug(slugFromUrl);
    const sinaliteIdFromUrl = params.get("sinaliteId");
    if (sinaliteIdFromUrl) setSinaliteId(sinaliteIdFromUrl);
  }, []);

  useEffect(() => {
    setSizeOptions([]);
    setSelectedSize("");
    if (!sinaliteId) return;
    let cancelled = false;
    fetch(`/api/sinalite/products/${sinaliteId}/options`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { options?: { group: string; name: string; hidden: number }[] }) => {
        if (cancelled) return;
        const sizeNames = Array.from(new Set(
          (data.options ?? []).filter((o) => o.hidden === 0 && o.group.toLowerCase() === "size").map((o) => o.name)
        ));
        setSizeOptions(sizeNames);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sinaliteId]);

  useEffect(() => {
    void loadGuidelines();
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ products: { slug: string; name: string }[] }>)
      .then((d) => {
        // Real, standalone products (their own DB record) take priority — then every
        // ad-hoc sub-product (Door Hangers, Postcards, Presentation Folders, …) that
        // resolves to its own page under /products/<category>/<slug> but has no Product
        // row of its own (see CATEGORY_SUBPRODUCT_OPTIONS + subProductSlug in lib/data.ts).
        const seen = new Set<string>();
        const opts: ProductOption[] = [];
        for (const p of d.products ?? []) {
          if (seen.has(p.slug)) continue;
          seen.add(p.slug);
          opts.push({ slug: p.slug, name: p.name });
        }
        for (const names of Object.values(CATEGORY_SUBPRODUCT_OPTIONS)) {
          for (const name of names) {
            const slug = subProductSlug(name);
            if (seen.has(slug)) continue;
            seen.add(slug);
            opts.push({ slug, name });
          }
        }
        setProducts(opts);
        if (opts[0]) setSelectedSlug((prev) => prev || opts[0].slug);
      })
      .catch(() => {});
  }, [loadGuidelines]);

  async function handleSave() {
    setError("");
    const entries = GUIDELINE_KINDS.filter((k) => files[k.key]);
    if (!selectedSlug || entries.length === 0) {
      setError("Please choose a product and at least one image.");
      return;
    }
    setUploading(true);
    try {
      for (const { key, title } of entries) {
        const file = files[key];
        if (!file) continue;
        const dataUrl = await readFileAsDataUrl(file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename: file.name }),
        });
        const uploadData = await uploadRes.json() as { url?: string; error?: string };
        if (!uploadData.url) { setError(uploadData.error ?? "Upload failed"); setUploading(false); return; }

        const label = selectedSize ? `${selectedSize} — ${title}` : title;
        await fetch("/api/admin/guidelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug: selectedSlug, label, fileUrl: uploadData.url }),
        });
      }

      setFiles({ preview: null, square: null, rounded: null, vertical: null });
      setPreviews((prev) => {
        for (const url of Object.values(prev)) if (url) URL.revokeObjectURL(url);
        return { preview: null, square: null, rounded: null, vertical: null };
      });
      await loadGuidelines();
    } catch {
      setError("Something went wrong, please try again.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/guidelines/${id}`, { method: "DELETE" });
      setGuidelines((prev) => prev.filter((g) => g.id !== id));
    } catch { /* ignore */ }
    setDeletingId(null);
  }

  const productName = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug;

  const visibleGuidelines = selectedSize
    ? guidelines.filter((g) => {
        if (g.productSlug !== selectedSlug) return false;
        const size = g.label.split("—")[0]?.trim() ?? "";
        return size === selectedSize;
      })
    : [];

  const navSections = [
    {
      title: "Catalogue",
      items: [
        { label: "Category listing", icon: "🗂️", href: "/admin", active: pathname === "/admin" },
        { label: "Printing", icon: "🎨", href: "/admin/templates", active: pathname === "/admin/templates" },
        { label: "Apparel", icon: "👕", href: "/admin/apparel", active: pathname === "/admin/apparel" },
        { label: "Packaging", icon: "📦", href: "/admin/packaging", active: pathname === "/admin/packaging" },
        { label: "Mockup", icon: "🖼️", href: "/admin/mockup", active: pathname === "/admin/mockup" },
        { label: "Reviews", icon: "⭐", href: "/admin/reviews", active: pathname === "/admin/reviews" },      ],
    },
    {
      title: "Commerce",
      items: [
        { label: "Orders", icon: "🛒", href: "/admin/orders", active: pathname === "/admin/orders" },
        { label: "Customers", icon: "👥", href: "/admin/customers", active: pathname === "/admin/customers" },
        { label: "Quotes", icon: "📝", href: "/admin/quotes", active: pathname === "/admin/quotes" },
      ],
    },
  ];

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <img src="/images/applogo.jpeg" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>WE PRINT</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", lineHeight: 1.1 }}>N PACK</div>
          </div>
        </div>

        <nav style={S.nav}>
          {navSections.map((section) => (
            <div key={section.title} style={S.navSection}>
              <span style={S.navTitle}>{section.title}</span>
              {section.items.map((item) => (
                <Link key={item.label} href={item.href} style={S.navItem(item.active)}>
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div style={S.navSection}>
            <span style={S.navTitle}>System</span>
            <button onClick={() => setShowLogoutConfirm(true)} style={{ ...S.navItem(false), width: "100%", textAlign: "left", border: "none", cursor: "pointer", background: "transparent" }}>
              <span>🚪</span>Logout
            </button>
          </div>
        </nav>

        <div style={S.profileRow}>
          <div style={S.avatar}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>Admin</div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Administrator</div>
          </div>
        </div>
      </aside>

      <div style={S.mainArea}>
        <header style={S.topBar}>
          <div style={{ flex: 1 }} />
          <AdminNotificationBell />
        </header>

        <main style={S.content}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              DASHBOARD / GUIDELINES
            </p>
            <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#111827" }}>
              Product <span style={{ color: "#7c3aed" }}>Guidelines</span>
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Upload the print-ready design template PDFs shown on each product&apos;s Guides tab (e.g. size-specific bleed templates, vertical templates, rounded-corner templates).
            </p>
          </div>

          {/* Upload form */}
          <div style={{ ...S.panel, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
              <div>
                {selectedSlug && (
                  <div style={{ marginBottom: 12, fontSize: "0.85rem", color: "#6b7280" }}>
                    Product: <strong style={{ color: "#111827" }}>{productName(selectedSlug)}</strong>
                  </div>
                )}
                {sizeOptions.length > 0 && (
                  <div style={{ maxWidth: 260 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: 6 }}>Size</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.9rem" }}
                    >
                      <option value="">Choose a size…</option>
                      {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {(sizeOptions.length === 0 || selectedSize) && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={uploading}
                  style={{
                    padding: "10px 24px", background: uploading ? "#e5e7eb" : "linear-gradient(90deg,#7c3aed,#db2777)",
                    border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                    cursor: uploading ? "not-allowed" : "pointer", flexShrink: 0,
                  }}
                >
                  {uploading ? "Saving…" : "Save"}
                </button>
              )}
            </div>

            {(sizeOptions.length === 0 || selectedSize) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {GUIDELINE_KINDS.map(({ key, title }) => {
                const chosen = files[key];
                const previewUrl = previews[key];
                return (
                  <label
                    key={key}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: previewUrl ? 8 : "22px 12px", minHeight: 110,
                      border: "2px dashed #d1d5db", borderRadius: 12, cursor: "pointer",
                      background: "#fafafa", textAlign: "center", overflow: "hidden",
                    }}
                  >
                    {previewUrl ? (
                      <>
                        {chosen?.type === "application/pdf" ? (
                          <span style={{ fontSize: "1.8rem" }}>📄</span>
                        ) : (
                          <img src={previewUrl} alt={chosen?.name ?? title} style={{ width: "100%", height: 80, objectFit: "contain", borderRadius: 8 }} />
                        )}
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                          {chosen?.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "1.4rem" }}>⬆️</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{`Upload ${title}`}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept={key === "preview" ? "image/*" : "application/pdf"}
                      onChange={(e) => {
                        const picked = e.target.files?.[0] ?? null;
                        setFiles((prev) => ({ ...prev, [key]: picked }));
                        setPreviews((prev) => {
                          if (prev[key]) URL.revokeObjectURL(prev[key]!);
                          return { ...prev, [key]: picked ? URL.createObjectURL(picked) : null };
                        });
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                );
              })}
            </div>
            )}
            {error && <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: 14 }}>{error}</p>}
          </div>

          {/* List */}
          <div style={S.panel}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Loading guidelines...</div>
            ) : visibleGuidelines.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📐</div>
                <div style={{ color: "#6b7280", fontWeight: 600 }}>No guideline files uploaded yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visibleGuidelines.map((g) => (
                  <div key={g.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    border: "1.5px solid #f3f4f6", borderRadius: 10, padding: "12px 16px",
                  }}>
                    <span style={{ fontSize: "1.4rem" }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.92rem" }}>{g.label}</div>
                      <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{productName(g.productSlug)}</div>
                    </div>
                    <a href={g.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c3aed", textDecoration: "none" }}>
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(g.id)}
                      disabled={deletingId === g.id}
                      style={{
                        padding: "6px 14px", border: "1.5px solid #fecaca", borderRadius: 8,
                        background: "#fff", color: "#dc2626", fontWeight: 600, fontSize: "0.8rem",
                        cursor: deletingId === g.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {deletingId === g.id ? "…" : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", width: 320, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Do you want to logout?</h2>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>You will be redirected to the login page.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => void handleLogout()} style={{ padding: "0.5rem 1.4rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ padding: "0.5rem 1.4rem", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
