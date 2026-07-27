"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, regionsForCountry, regionCode, fullAddressLine } from "@/lib/shipping-regions";

type CartItem = {
  id: string;
  name: string;
  qty: number;
  pricePerUnit: number;
  total: number;
  thumb?: string;
  frontPreview?: string;
  doubleSided?: boolean;
  previewBoxColor?: string;
  boxFaceImages?: { front?: string; right?: string; top?: string };
  previewW?: number;
  previewH?: number;
  previewD?: number;
  sinaliteId?: string;
  sinaliteOptions?: Record<string, string>;
  frontFileUrl?: string;
  backFileUrl?: string;
};

type ShippingOption = { carrier: string; service: string; price: number; days: number };

function SimpleCube3D({ bg, faceImages, previewW = 1, previewH = 1, previewD = 1 }: { bg: string; faceImages?: { front?: string; right?: string; top?: string }; previewW?: number; previewH?: number; previewD?: number }) {
  const MAX = 60;
  const sc = MAX / Math.max(previewW, previewH, previewD);
  const fw = previewW * sc, fh = previewH * sc;
  const fd = Math.max(previewD * sc, 15);
  const face = (w: number, h: number, imgSrc: string | undefined, transform: string): React.CSSProperties => ({
    position: "absolute", width: w, height: h,
    left: (fw - w) / 2, top: (fh - h) / 2,
    background: imgSrc ? `url("${imgSrc}") center/cover no-repeat` : bg,
    border: "1px solid rgba(0,0,0,0.13)",
    backfaceVisibility: "hidden", boxSizing: "border-box", transform,
  });
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: 300 }}>
      <div style={{ position: "relative", width: fw, height: fh, transformStyle: "preserve-3d", transform: "rotateX(-30deg) rotateY(30deg)" }}>
        <div style={face(fw, fh, faceImages?.front, `translateZ(${fd/2}px)`)} />
        <div style={face(fw, fh, faceImages?.front, `rotateY(180deg) translateZ(${fd/2}px)`)} />
        <div style={face(fd, fh, faceImages?.right, `rotateY(-90deg) translateZ(${fw/2}px)`)} />
        <div style={face(fd, fh, faceImages?.right, `rotateY(90deg) translateZ(${fw/2}px)`)} />
        <div style={face(fw, fd, faceImages?.top,   `rotateX(-90deg) translateZ(${fh/2}px)`)} />
        <div style={face(fw, fd, faceImages?.top,   `rotateX(90deg) translateZ(${fh/2}px)`)} />
      </div>
    </div>
  );
}

type User = { id: string; firstName: string; lastName: string; email: string };

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({ houseNo: "", flat: "", city: "", state: "", postalCode: "", country: "CA", phone: "" });
  const [addressEditOpen, setAddressEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ houseNo: "", flat: "", city: "", state: "", postalCode: "", country: "CA", phone: "" });
  const [editFormError, setEditFormError] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingIdx, setSelectedShippingIdx] = useState<number | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const autoFetchedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wp_cart");
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch { /* ignore */ }

    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) {
        const u = JSON.parse(saved) as User;
        setUser(u);
        fetch(`/api/auth/addresses?id=${u.id}`)
          .then((r) => r.json())
          .then((d: { addresses?: { houseNo: string; flat: string; city: string; state: string; postalCode: string; country: string; phone: string }[] }) => {
            const latest = d.addresses?.[0];
            if (latest) {
              setCheckoutForm({
                houseNo: latest.houseNo, flat: latest.flat, city: latest.city, state: latest.state,
                postalCode: latest.postalCode, country: latest.country || "CA", phone: latest.phone,
              });
              setHasSavedAddress(true);
            }
          })
          .catch(() => {});
      }
    } catch { /* ignore */ }

    setLoaded(true);
  }, []);

  // Fetch live carrier rates from Sinalite for every Sinalite-linked cart item.
  async function fetchShippingOptions(state: string, postalCode: string, country: string) {
    const shippingItems = items
      .filter((i) => i.sinaliteId && i.sinaliteOptions)
      .map((i) => ({ productId: Number(i.sinaliteId), options: i.sinaliteOptions! }));
    if (!shippingItems.length) {
      setShippingError("No shippable items in cart.");
      setShippingOptions([]);
      setSelectedShippingIdx(null);
      return;
    }
    setShippingLoading(true);
    setShippingError("");
    try {
      const res = await fetch("/api/sinalite/shipping-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: shippingItems, state: regionCode(state), zip: postalCode, country }),
      });
      const data = await res.json() as { options?: ShippingOption[]; error?: string };
      if (data.error) { setShippingError(data.error); setShippingOptions([]); setSelectedShippingIdx(null); return; }
      const fetched = data.options ?? [];
      setShippingOptions(fetched);
      setSelectedShippingIdx(fetched.length ? 0 : null);
      if (fetched.length > 0 && user) {
        const { houseNo, flat, city, phone } = checkoutForm;
        fetch("/api/auth/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: user.id, houseNo, flat, city, state, postalCode, country, phone }),
        }).catch(() => { /* ignore */ });
      }
    } catch {
      setShippingError("Failed to fetch shipping options.");
      setShippingOptions([]);
      setSelectedShippingIdx(null);
    } finally {
      setShippingLoading(false);
    }
  }

  // Once a saved address and the cart items are both ready, auto-fetch shipping
  // options once — no need to click "Get Shipping Options" again next visit.
  useEffect(() => {
    if (autoFetchedRef.current) return;
    if (!hasSavedAddress || items.length === 0) return;
    const { flat, city, state, postalCode, country } = checkoutForm;
    if (!flat.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) return;
    autoFetchedRef.current = true;
    void fetchShippingOptions(state, postalCode, country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSavedAddress, items.length, checkoutForm]);

  function handleGetShippingOptions() {
    const { flat, city, state, postalCode, country } = checkoutForm;
    if (!flat.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) {
      setShippingError("Please add your delivery address first.");
      return;
    }
    void fetchShippingOptions(state, postalCode, country);
  }

  function removeItem(id: string) {
    save(items.filter((i) => i.id !== id));
  }

  function save(updated: CartItem[]) {
    setItems(updated);
    try {
      localStorage.setItem("wp_cart", JSON.stringify(updated));
      localStorage.setItem("wp_cart_count", String(updated.length));
    } catch { /* ignore */ }
  }

  async function handleCheckout() {
    if (!items.length) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const { houseNo, flat, city, state, postalCode, country, phone } = checkoutForm;
      const shippingMethod = selectedShippingIdx != null ? shippingOptions[selectedShippingIdx]?.service : "";
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerName: user ? `${user.firstName} ${user.lastName}` : "Guest",
          customerEmail: user?.email ?? "",
          address: [flat, houseNo, city, state, postalCode, country].filter(Boolean).join(", "),
          customerId: user?.id ?? "",
          shipping: {
            firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "",
            addr: flat, addr2: houseNo, city, state: regionCode(state), zip: postalCode, country, phone,
            method: shippingMethod ?? "",
          },
        }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? "Failed to start checkout.");
      }
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const shippingCost = selectedShippingIdx != null ? (shippingOptions[selectedShippingIdx]?.price ?? 0) : 0;
  const total = subtotal + shippingCost;

  if (!loaded) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 750, display: "flex", flexDirection: "column", background: "#f0f2f5" }}>

      {/* Gradient header */}

      <div style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
        padding: "0 28px", height: 64, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Back to home */}
          <button
            onClick={() => router.push("/")}
            style={{
              background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
              borderRadius: 10, height: 36, padding: "0 12px", cursor: "pointer",
              color: "#fff", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.88rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem" }}>Checkout</span>
          </div>
        </div>
        {/* No close ✕ for cart page — back button handles navigation */}
        <div style={{ width: 36 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT — items */}
          <div style={{ flex: "0 0 50%", background: "#fff", padding: "28px 32px", overflowY: "auto", borderRight: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Your Items</h2>
              <span style={{ background: "#f3f4f6", borderRadius: 999, padding: "2px 10px", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "0.95rem" }}>
                <p style={{ margin: 0 }}>Your cart is empty.</p>
                <button onClick={() => router.push("/")} style={{ marginTop: 12, background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "0.95rem" }}>
                  ← Browse products
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "stretch", gap: 0,
                    padding: 0, borderRadius: 14,
                    border: "1.5px solid #f3f4f6", background: "#fafafa",
                    position: "relative", overflow: "hidden",
                    minHeight: 160,
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 160, flexShrink: 0,
                      background: "transparent",
                      position: "relative", overflow: "hidden",
                    }}>
                      {item.boxFaceImages?.front
                        ? <SimpleCube3D bg={item.previewBoxColor ?? "#c8a97e"} faceImages={item.boxFaceImages} previewW={item.previewW ?? 315} previewH={item.previewH ?? 202} previewD={item.previewD ?? 62} />
                        : (item.frontPreview ?? item.thumb)
                          ? <img src={item.frontPreview ?? item.thumb} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                          : <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, padding: "16px 18px" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{item.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#9ca3af" }}>
                        Custom Design{item.doubleSided ? " · Double-sided" : ""}
                      </p>
                    </div>

                    {/* Price + delete */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, paddingRight: 18, paddingTop: 16, paddingBottom: 16 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>${item.total.toFixed(2)}</span>
                      <button onClick={() => setDeleteConfirmId(item.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Order summary */}
          <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", background: "#f0f2f5" }}>

            <h2 style={{ margin: "0 0 20px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Order Summary</h2>

            {/* Summary rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                <span>Subtotal ({items.length} {items.length === 1 ? "Item" : "Items"})</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
              </div>
              {shippingCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                  <span>Shipping ({shippingOptions[selectedShippingIdx!]?.service})</span>
                  <span style={{ color: "#111827", fontWeight: 600 }}>${shippingCost.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1.5px solid #e5e7eb", paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Total</span>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#7c3aed" }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery address */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#111827" }}>Delivery Address</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>Add or select your delivery address</p>
                </div>
              </div>

              {(() => {
                const hasAddress =
                  checkoutForm.flat.trim() !== "" || checkoutForm.city.trim() !== "";
                const addressLine = fullAddressLine(checkoutForm);
                const openAddressForm = () => {
                  setEditForm({ ...checkoutForm });
                  setEditFormError("");
                  setAddressEditOpen(true);
                };

                if (addressEditOpen) {
                  return (
                    <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 12, padding: 18, background: "#fafafa", display: "flex", flexDirection: "column", gap: 14 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Shipping Address
                      </span>

                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                          Street Address <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="123 Main Street"
                          value={editForm.flat}
                          onChange={(e) => setEditForm((p) => ({ ...p, flat: e.target.value }))}
                          style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          placeholder="Suite, unit, floor, etc."
                          value={editForm.houseNo}
                          onChange={(e) => setEditForm((p) => ({ ...p, houseNo: e.target.value }))}
                          style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                            City <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Toronto"
                            value={editForm.city}
                            onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                            style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                            Province / State <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <select
                            value={editForm.state}
                            onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value }))}
                            style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: editForm.state ? "#111827" : "#9ca3af", outline: "none", boxSizing: "border-box", background: "#fff" }}
                          >
                            <option value="">Select region</option>
                            {regionsForCountry(editForm.country).map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                            Postal / ZIP Code <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="M5V 1A1"
                            value={editForm.postalCode}
                            onChange={(e) => setEditForm((p) => ({ ...p, postalCode: e.target.value }))}
                            style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                            Country <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <select
                            value={editForm.country}
                            onChange={(e) => setEditForm((p) => {
                              const nextRegions = regionsForCountry(e.target.value);
                              return { ...p, country: e.target.value, state: nextRegions.includes(p.state) ? p.state : "" };
                            })}
                            style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #e5e7eb", borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                          Phone Number <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. +1 902 489 6081"
                          value={editForm.phone}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                          style={{ width: "100%", padding: "11px 13px", border: `1.5px solid ${editFormError && !editForm.phone ? "#dc2626" : "#e5e7eb"}`, borderRadius: 9, fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", background: "#fff" }}
                        />
                      </div>

                      {editFormError && (
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>{editFormError}</p>
                      )}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => setAddressEditOpen(false)}
                          style={{ flex: 1, padding: "12px", border: "1.5px solid #e5e7eb", borderRadius: 10, cursor: "pointer", background: "#fff", color: "#374151", fontWeight: 700, fontSize: "0.88rem" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            const { houseNo, flat, city, state, postalCode, country, phone } = editForm;
                            if (!phone.trim()) { setEditFormError("Phone number is required."); return; }
                            if (!flat.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) {
                              setEditFormError("Please fill in all required address fields."); return;
                            }
                            setEditFormError("");
                            setCheckoutForm({ houseNo, flat, city, state, postalCode, country, phone });
                            if (user) {
                              fetch("/api/auth/profile", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: user.id, phone, houseNo, flat, city, state, postalCode, country }),
                              }).catch(() => { /* ignore */ });
                            }
                            setAddressEditOpen(false);
                          }}
                          style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 800, fontSize: "0.88rem" }}
                        >
                          Save Address
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{
                    border: "1.5px solid #e5e7eb", borderRadius: 10,
                    padding: "11px 14px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 10, background: "#fafafa",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {hasAddress ? (
                        <span style={{ fontSize: "0.85rem", color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {addressLine}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Select delivery address</span>
                      )}
                    </div>
                    <button
                      onClick={openAddressForm}
                      style={{
                        padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                        border: "1.5px solid #7c3aed", background: "#fff",
                        color: "#7c3aed", fontWeight: 700, fontSize: "0.78rem", flexShrink: 0,
                      }}
                    >{hasAddress ? "Edit" : "Add"}</button>
                  </div>
                );
              })()}
            </div>

            {/* Shipment Details — live carrier rates from Sinalite, always visible */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#111827" }}>Shipment Details</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#6b7280" }}>Select a shipping method for your order.</p>

              {shippingLoading && (
                <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#9ca3af" }}>Loading shipping options…</p>
              )}
              {shippingError && (
                <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>{shippingError}</p>
              )}
              {!shippingLoading && shippingOptions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {shippingOptions.map((opt, i) => {
                    const selected = selectedShippingIdx === i;
                    return (
                      <button
                        key={`${opt.carrier}-${opt.service}-${i}`}
                        onClick={() => setSelectedShippingIdx(i)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          border: `1.5px solid ${selected ? "#7c3aed" : "#e5e7eb"}`,
                          borderRadius: 10, padding: "12px 14px", background: "#fff",
                          cursor: "pointer", width: "100%", textAlign: "left",
                        }}
                      >
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>{opt.carrier}</p>
                          <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>{opt.service}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>${opt.price.toFixed(2)}</span>
                          <span style={{
                            width: 18, height: 18, borderRadius: "50%",
                            border: `2px solid ${selected ? "#7c3aed" : "#d1d5db"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            {selected && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#7c3aed" }} />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleGetShippingOptions}
                disabled={shippingLoading}
                style={{
                  padding: "10px 20px", borderRadius: 10, cursor: shippingLoading ? "not-allowed" : "pointer",
                  border: "1.5px solid #7c3aed", background: "#fff", color: "#7c3aed",
                  fontWeight: 700, fontSize: "0.85rem", opacity: shippingLoading ? 0.6 : 1,
                }}
              >
                Get Shipping Options
              </button>
            </div>

            {/* Promo code */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></svg>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>Promo Code</span>
              </div>
              <div style={{ display: "flex", gap: 8, width: "fit-content" }}>
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  style={{ width: 200, padding: "9px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: "0.88rem", outline: "none", background: "#fff" }}
                />
                <button style={{ padding: "9px 18px", border: "1.5px solid #7c3aed", borderRadius: 10, background: "#fff", color: "#7c3aed", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                  Apply
                </button>
              </div>
            </div>

            {/* Proceed to checkout */}
            {checkoutError && (
              <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>{checkoutError}</p>
            )}
            <button
              disabled={items.length === 0 || checkoutLoading}
              onClick={handleCheckout}
              style={{
                width: "fit-content", padding: "12px 28px",
                background: items.length > 0 ? "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)" : "#e5e7eb",
                border: "none", borderRadius: 12, cursor: items.length > 0 && !checkoutLoading ? "pointer" : "not-allowed",
                color: items.length > 0 ? "#fff" : "#9ca3af",
                fontSize: "0.95rem", fontWeight: 800,
                boxShadow: items.length > 0 ? "0 6px 20px rgba(124,58,237,0.4)" : "none",
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 10, opacity: checkoutLoading ? 0.7 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {checkoutLoading ? "Redirecting to payment…" : "Proceed to Checkout"}
            </button>

            <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>
              🔒 Secure Checkout · 100% Safe &amp; Secure Payments
            </p>
            {user && (
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>
                Signed in as {user.firstName} {user.lastName} · {user.email}
              </p>
            )}
          </div>
        </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}>
            <div style={{ padding: "24px 24px 20px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "1rem", color: "#111827" }}>Remove Item?</p>
              <p style={{ margin: "0 0 24px", fontSize: "0.875rem", color: "#6b7280" }}>Are you sure you want to delete this item from your cart?</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e5e7eb", borderRadius: 12, background: "#fff", color: "#374151", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                >No</button>
                <button
                  onClick={() => { removeItem(deleteConfirmId); setDeleteConfirmId(null); }}
                  style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 12, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                >Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
