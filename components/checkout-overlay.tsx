"use client";

import React, { useState, useEffect, useRef } from "react";
import AuthModal from "@/components/auth-modal";

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthCustomer = { id: string; firstName: string; lastName: string; email: string };
type SavedCartItem = { id: string; name: string; qty: number; pricePerUnit: number; total: number; thumb?: string; doubleSided?: boolean; boxFaceImages?: { front?: string; right?: string; top?: string }; previewBoxColor?: string; previewW?: number; previewH?: number; previewD?: number };

function SimpleCube3D({ bg, faceImages, previewW = 1, previewH = 1, previewD = 1 }: { bg: string; faceImages?: { front?: string; right?: string; top?: string }; previewW?: number; previewH?: number; previewD?: number }) {
  const MAX = 44;
  const sc = MAX / Math.max(previewW, previewH, previewD);
  const fw = previewW * sc, fh = previewH * sc;
  const fd = Math.max(previewD * sc, 11);

  const face = (w: number, h: number, imgSrc: string | undefined, transform: string): React.CSSProperties => ({
    position: "absolute", width: w, height: h,
    left: (fw - w) / 2, top: (fh - h) / 2,
    background: imgSrc ? `url(${imgSrc}) center/cover no-repeat` : bg,
    border: "1px solid rgba(0,0,0,0.13)",
    backfaceVisibility: "hidden", boxSizing: "border-box",
    transform,
  });
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", perspective: 220 }}>
      <div style={{ position: "relative", width: fw, height: fh, transformStyle: "preserve-3d", transform: "rotateX(-30deg) rotateY(30deg)" }}>
        <div style={face(fw, fh, faceImages?.front,  `translateZ(${fd/2}px)`)} />
        <div style={face(fw, fh, faceImages?.front,  `rotateY(180deg) translateZ(${fd/2}px)`)} />
        <div style={face(fd, fh, faceImages?.right,  `rotateY(-90deg) translateZ(${fw/2}px)`)} />
        <div style={face(fd, fh, faceImages?.right,  `rotateY(90deg) translateZ(${fw/2}px)`)} />
        <div style={face(fw, fd, faceImages?.top,    `rotateX(-90deg) translateZ(${fh/2}px)`)} />
        <div style={face(fw, fd, faceImages?.top,    `rotateX(90deg) translateZ(${fh/2}px)`)} />
      </div>
    </div>
  );
}

type CheckoutOverlayProps = {
  productName: string;
  pricePerUnit: number;
  selectedQty: number;
  setSelectedQty: (fn: (prev: number) => number) => void;
  pendingCartId: string | null;
  thumb?: string;
  boxFaceImages?: { front?: string; right?: string; top?: string };
  isDoubleSided?: boolean;
  onClose: () => void;
  onCloseAll: () => void;
  onPreviewClick?: () => void;
  previewRender?: (rotX: number, rotY: number) => React.ReactNode;
};

export default function CheckoutOverlay({
  productName,
  pricePerUnit,
  selectedQty,
  setSelectedQty,
  pendingCartId,
  thumb,
  boxFaceImages,
  isDoubleSided,
  onClose,
  onCloseAll,
  onPreviewClick,
  previewRender,
}: CheckoutOverlayProps) {
  // ── Internal state ──────────────────────────────────────────────────────────
  const [cartUser, setCartUser] = useState<AuthCustomer | null>(null);
  const [previewRotX, setPreviewRotX] = useState(-20);
  const [previewRotY, setPreviewRotY] = useState(210);
  const previewRotRef = useRef({ rx: -20, ry: 210 });
  const [authForCartOpen, setAuthForCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [existingCartItems, setExistingCartItems] = useState<SavedCartItem[]>([]);
  const [checkoutForm, setCheckoutForm] = useState({ houseNo: "", flat: "", city: "", state: "", phone: "" });
  const [checkoutError, setCheckoutError] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressEditOpen, setAddressEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ houseNo: "", flat: "", city: "", state: "", phone: "" });
  const [editFormError, setEditFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load saved user from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wp_user");
      if (saved) {
        const user = JSON.parse(saved) as AuthCustomer;
        setCartUser(user);
        fetchAndPrefillAddress(user.id);
      } else {
        setAuthForCartOpen(true);
      }
    } catch { /* ignore */ }

    try {
      const allCart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as SavedCartItem[];
      setExistingCartItems(allCart.filter(i => i.id !== pendingCartId));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAndPrefillAddress(userId: string) {
    setAddressLoading(true);
    try {
      const res = await fetch(`/api/auth/profile?id=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { phone: string; address: { houseNo: string; flat: string; city: string; state: string } };
        setCheckoutForm({
          phone:   data.phone ?? "",
          houseNo: data.address?.houseNo ?? "",
          flat:    data.address?.flat ?? "",
          city:    data.address?.city ?? "",
          state:   data.address?.state ?? "",
        });
      }
    } catch { /* ignore */ } finally {
      setAddressLoading(false);
    }
  }

  return (
    <>
      {/* ── Auth gate for cart ─────────────────────────────────────────────── */}
      <AuthModal
        open={authForCartOpen}
        onClose={() => { setAuthForCartOpen(false); onClose(); }}
        onSignedIn={(customer) => {
          setCartUser(customer);
          try { localStorage.setItem("wp_user", JSON.stringify(customer)); } catch { /* ignore */ }
          setAuthForCartOpen(false);
          setCheckoutError("");
          setOrderPlaced(false);
          try {
            const allCart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as SavedCartItem[];
            setExistingCartItems(allCart.filter(i => i.id !== pendingCartId));
          } catch { /* ignore */ }
          fetchAndPrefillAddress(customer.id);
        }}
      />

      {/* ── Checkout Screen ────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 750,
        display: "flex", flexDirection: "column",
        background: "#f0f2f5",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #db2777 60%, #f97316 100%)",
          padding: "0 28px", height: 64, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Back → home */}
            <button
              onClick={() => { window.location.href = "/"; }}
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
          <button onClick={onCloseAll} style={{
            background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
            borderRadius: "50%", width: 36, height: 36, cursor: "pointer",
            color: "#fff", fontSize: "1rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {orderPlaced ? (
          /* ── Order success ── */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 40 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#111827" }}>Order Placed!</h2>
            <p style={{ margin: 0, color: "#6b7280", textAlign: "center", maxWidth: 340 }}>
              Thank you, <strong>{cartUser?.firstName}</strong>! Your order for{" "}
              <strong>{selectedQty} {productName}</strong> has been received.
              We&apos;ll be in touch soon.
            </p>
            <button onClick={onCloseAll} style={{
              marginTop: 8, padding: "12px 36px", borderRadius: 999,
              background: "linear-gradient(135deg,#7c3aed,#db2777)", border: "none",
              color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
            }}>Back to Editor</button>
          </div>
        ) : (
          /* ── Main checkout layout ── */
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* LEFT — Your Items */}
            <div style={{
              flex: "0 0 50%", background: "#fff", padding: "28px 32px",
              overflowY: "auto", borderRight: "1px solid #eee",
            }}>
              {/* Section heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>Your Items</h2>
                <span style={{
                  background: "#f3f0ff", color: "#7c3aed", fontSize: "0.75rem",
                  fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                }}>{1 + existingCartItems.length} {1 + existingCartItems.length === 1 ? "Item" : "Items"}</span>
              </div>

              {/* Current item card */}
              <div style={{
                border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 18, background: "#fff",
              }}>
                {/* Thumbnail — draggable 3D preview if provided, else thumb image */}
                <div
                  style={{
                    width: 110, height: 110, borderRadius: 8,
                    overflow: "hidden", flexShrink: 0,
                    border: "1px solid #e5e7eb",
                    position: "relative",
                    background: "transparent",
                    cursor: previewRender ? "grab" : "default",
                  }}
                  onMouseDown={previewRender ? (e) => {
                    const startX = e.clientX, startY = e.clientY;
                    const startRX = previewRotRef.current.rx, startRY = previewRotRef.current.ry;
                    const onMove = (me: MouseEvent) => {
                      previewRotRef.current.ry = startRY + (me.clientX - startX) * 0.5;
                      previewRotRef.current.rx = Math.max(-80, Math.min(80, startRX - (me.clientY - startY) * 0.5));
                      setPreviewRotY(previewRotRef.current.ry);
                      setPreviewRotX(previewRotRef.current.rx);
                    };
                    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  } : undefined}
                >
                  {previewRender ? (
                    <div style={{
                      position: "absolute",
                      width: "760px",
                      height: "620px",
                      top: "50%",
                      left: "50%",
                      marginLeft: "-380px",
                      marginTop: "-310px",
                      transform: "scale(0.33)",
                      transformOrigin: "center center",
                      pointerEvents: "none",
                    }}>
                      {previewRender(previewRotX, previewRotY)}
                    </div>
                  ) : thumb ? (
                    <img src={thumb} alt="preview" style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: "0.72rem" }}>No preview</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{productName}</p>
                  <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#6b7280" }}>
                    Custom Design{isDoubleSided ? " · Double-sided" : ""}
                  </p>
                  {/* Quantity stepper */}
                  <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => setSelectedQty(q => Math.max(1, q - 1))}
                      style={{
                        width: 36, height: 36, border: "none", background: "#f9fafb",
                        cursor: "pointer", fontSize: "1.2rem", color: "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >−</button>
                    <span style={{
                      minWidth: 44, textAlign: "center", fontSize: "0.95rem",
                      fontWeight: 700, color: "#111827", padding: "0 8px",
                      borderLeft: "1.5px solid #e5e7eb", borderRight: "1.5px solid #e5e7eb",
                      lineHeight: "36px",
                    }}>{selectedQty}</span>
                    <button
                      onClick={() => setSelectedQty(q => q + 1)}
                      style={{
                        width: 36, height: 36, border: "none", background: "#f9fafb",
                        cursor: "pointer", fontSize: "1.2rem", color: "#374151",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >+</button>
                  </div>
                </div>

                {/* Delete current item */}
                <button
                  onClick={() => setDeleteConfirmId("__current__")}
                  title="Remove"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#ef4444", padding: 8, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>

              {/* Previously saved cart items */}
              {existingCartItems.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {existingCartItems.map((item) => (
                    <div key={item.id} style={{
                      border: "1.5px solid #e5e7eb", borderRadius: 14, padding: "16px 20px",
                      display: "flex", alignItems: "center", gap: 18, background: "#fff",
                    }}>
                      {/* Thumbnail — 3D cube if previewBoxColor saved, else canvas thumb */}
                      <div style={{
                        width: 110, height: 110, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                      }}>
                        {item.boxFaceImages?.front
                          ? <SimpleCube3D bg={item.previewBoxColor ?? "#c8a97e"} faceImages={item.boxFaceImages} previewW={item.previewW ?? 315} previewH={item.previewH ?? 202} previewD={item.previewD ?? 62} />
                          : item.thumb
                            ? <img src={item.thumb} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                        }
                      </div>

                      {/* Info + qty stepper */}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>{item.name}</p>
                        <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "#6b7280" }}>
                          Custom Design{item.doubleSided ? " · Double-sided" : ""}
                        </p>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                          <button
                            onClick={() => {
                              const updated = existingCartItems.map(i =>
                                i.id === item.id
                                  ? { ...i, qty: Math.max(1, i.qty - 1), total: i.pricePerUnit * Math.max(1, i.qty - 1) }
                                  : i
                              );
                              setExistingCartItems(updated);
                              try { localStorage.setItem("wp_cart", JSON.stringify(updated)); } catch { /* ignore */ }
                            }}
                            style={{ width: 36, height: 36, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: "1.2rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                          >−</button>
                          <span style={{ minWidth: 44, textAlign: "center", fontSize: "0.95rem", fontWeight: 700, color: "#111827", padding: "0 8px", borderLeft: "1.5px solid #e5e7eb", borderRight: "1.5px solid #e5e7eb", lineHeight: "36px" }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => {
                              const updated = existingCartItems.map(i =>
                                i.id === item.id
                                  ? { ...i, qty: i.qty + 1, total: i.pricePerUnit * (i.qty + 1) }
                                  : i
                              );
                              setExistingCartItems(updated);
                              try { localStorage.setItem("wp_cart", JSON.stringify(updated)); } catch { /* ignore */ }
                            }}
                            style={{ width: 36, height: 36, border: "none", background: "#f9fafb", cursor: "pointer", fontSize: "1.2rem", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                          >+</button>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Remove"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — Order Summary */}
            {(() => {
              const hasAddress = !addressLoading &&
                checkoutForm.houseNo.trim() !== "" &&
                checkoutForm.flat.trim() !== "" &&
                checkoutForm.city.trim() !== "" &&
                checkoutForm.state.trim() !== "";
              const openAddressPopup = () => {
                setEditForm({ ...checkoutForm });
                setEditFormError("");
                setAddressEditOpen(true);
              };
              return (
                <div style={{
                  flex: "0 0 50%", background: "#fff",
                  padding: "28px 32px", overflowY: "auto",
                  borderLeft: "1px solid #eee", display: "flex", flexDirection: "column", gap: 0,
                }}>
                  <h2 style={{ margin: "0 0 20px", fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Order Summary</h2>

                  {/* Summary rows */}
                  {(() => {
                    const currentTotal = pricePerUnit * selectedQty;
                    const existingTotal = existingCartItems.reduce((s, i) => s + i.total, 0);
                    const subtotal = currentTotal + existingTotal;
                    const totalItemCount = 1 + existingCartItems.length;
                    const delivery = 10;
                    const total = subtotal + delivery;
                    return (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                            <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? "Item" : "Items"})</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>
                              {subtotal > 0 ? `$${subtotal.toFixed(2)}` : "—"}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#6b7280" }}>
                            <span>Delivery Charges</span>
                            <span style={{ color: "#111827", fontWeight: 600 }}>USD ${delivery.toFixed(2)}</span>
                          </div>
                        </div>

                        <div style={{ borderTop: "1.5px solid #f0f2f5", paddingTop: 14, marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#111827" }}>Total</span>
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#7c3aed" }}>
                              {subtotal > 0 ? `$${total.toFixed(2)}` : "Contact for quote"}
                            </span>
                          </div>
                          <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
                            Quantity: <strong style={{ color: "#111827" }}>{selectedQty} {selectedQty === 1 ? "copy" : "copies"}</strong>
                            {isDoubleSided && <span style={{ color: "#7c3aed", marginLeft: 8 }}>· Double-sided included</span>}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* Delivery Address */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,#7c3aed,#db2777)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#111827" }}>Delivery Address</p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#9ca3af" }}>Add or select your delivery address</p>
                      </div>
                    </div>

                    {/* Address row */}
                    <div style={{
                      border: "1.5px solid #e5e7eb", borderRadius: 10,
                      padding: "11px 14px", display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 10, background: "#fafafa",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {hasAddress ? (
                          <span style={{ fontSize: "0.85rem", color: "#111827", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {checkoutForm.houseNo}, {checkoutForm.flat}, {checkoutForm.city}, {checkoutForm.state}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Select delivery address</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={openAddressPopup}
                          style={{
                            padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                            border: "1.5px solid #7c3aed", background: "#fff",
                            color: "#7c3aed", fontWeight: 700, fontSize: "0.78rem",
                          }}
                        >{hasAddress ? "Edit" : "Add"}</button>
                        <button
                          onClick={openAddressPopup}
                          style={{
                            width: 28, height: 28, border: "1.5px solid #e5e7eb",
                            borderRadius: 7, background: "#fff", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#374151",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Phone shown below address if saved */}
                    {hasAddress && checkoutForm.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingLeft: 2 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.85-.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
                        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{checkoutForm.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Fast delivery badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#f9f5ff", borderRadius: 10, padding: "12px 14px",
                    marginBottom: 20,
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>Fast &amp; Reliable Delivery</p>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>We deliver your products safely to your doorstep</p>
                    </div>
                    <span style={{ color: "#7c3aed", fontWeight: 600, fontSize: "0.75rem", flexShrink: 0 }}>Usually in 2–4 days</span>
                  </div>

                  <div style={{ borderTop: "1.5px solid #f0f2f5", paddingTop: 16, marginBottom: 16 }}>
                    {/* Promo Code */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>Promo Code</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        style={{
                          flex: 1, padding: "10px 13px", border: "1.5px solid #e5e7eb",
                          borderRadius: 9, fontSize: "0.88rem", color: "#111827",
                          outline: "none", background: "#fff",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                      <button style={{
                        padding: "10px 18px", border: "1.5px solid #7c3aed",
                        borderRadius: 9, cursor: "pointer", background: "#fff",
                        color: "#7c3aed", fontWeight: 700, fontSize: "0.85rem",
                      }}>Apply</button>
                    </div>
                  </div>

                  {checkoutError && (
                    <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>{checkoutError}</p>
                  )}

                  {/* Proceed to Checkout */}
                  <button
                    disabled={stripeLoading}
                    onClick={async () => {
                      const { houseNo, flat, city, state, phone } = checkoutForm;
                      if (!phone.trim()) { setCheckoutError("Phone number is required. Please add your delivery address."); return; }
                      if (!houseNo.trim() || !flat.trim() || !city.trim() || !state.trim()) {
                        setCheckoutError("Please add your delivery address first."); return;
                      }
                      setCheckoutError("");
                      if (cartUser) {
                        fetch("/api/auth/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: cartUser.id, phone, houseNo, flat, city, state }),
                        }).catch(() => {});
                      }
                      setStripeLoading(true);
                      const currentItem = pricePerUnit > 0 && selectedQty > 0 ? {
                        id: pendingCartId ?? Date.now().toString(),
                        name: productName,
                        qty: selectedQty,
                        pricePerUnit,
                        total: pricePerUnit * selectedQty,
                        doubleSided: isDoubleSided ?? false,
                        thumb,
                        boxFaceImages,
                      } : null;
                      const otherItems = existingCartItems.filter(i => i.pricePerUnit > 0 && i.qty > 0);
                      const cartItems = [...(currentItem ? [currentItem] : []), ...otherItems];
                      if (!cartItems.length) { setStripeLoading(false); setCheckoutError("No valid items to checkout."); return; }
                      try {
                        const res = await fetch("/api/checkout/create-session", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: cartItems,
                            customerName: cartUser ? `${cartUser.firstName} ${cartUser.lastName}` : "Guest",
                            customerEmail: cartUser?.email ?? "",
                            address: [houseNo, flat, city, state].filter(Boolean).join(", "),
                            customerId: cartUser?.id ?? "",
                          }),
                        });
                        const data = await res.json() as { url?: string; error?: string };
                        if (data.url) { window.location.href = data.url; }
                        else { setCheckoutError(data.error ?? "Failed to start checkout."); setStripeLoading(false); }
                      } catch { setCheckoutError("Network error. Please try again."); setStripeLoading(false); }
                    }}
                    style={{
                      width: "100%", maxWidth: 320, padding: "15px",
                      background: stripeLoading ? "#9ca3af" : "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)",
                      border: "none", borderRadius: 12,
                      cursor: stripeLoading ? "not-allowed" : "pointer",
                      color: "#fff", fontSize: "1rem", fontWeight: 800,
                      boxShadow: stripeLoading ? "none" : "0 6px 20px rgba(124,58,237,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: stripeLoading ? 0.75 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {stripeLoading ? "Redirecting to payment…" : "Proceed to Checkout"}
                  </button>

                  <p style={{ margin: "10px 0 0", fontSize: "0.73rem", color: "#9ca3af" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 4 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Secure Checkout &nbsp;·&nbsp; 100% Safe &amp; Secure Payments
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#b0b7c3" }}>
                    Signed in as {cartUser?.firstName} {cartUser?.lastName} · {cartUser?.email}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Delete Confirm Dialog ── */}
        {deleteConfirmId && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 900,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, width: "100%", maxWidth: 360,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden",
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
                    onClick={() => {
                      if (deleteConfirmId === "__current__") {
                        try {
                          const cart = JSON.parse(localStorage.getItem("wp_cart") ?? "[]") as Array<{ id: string }>;
                          const updated = cart.filter(i => i.id !== pendingCartId);
                          localStorage.setItem("wp_cart", JSON.stringify(updated));
                          localStorage.setItem("wp_cart_count", String(updated.length));
                        } catch { /* ignore */ }
                        setDeleteConfirmId(null);
                        onClose();
                      } else {
                        const updated = existingCartItems.filter(i => i.id !== deleteConfirmId);
                        setExistingCartItems(updated);
                        try {
                          localStorage.setItem("wp_cart", JSON.stringify(updated));
                          localStorage.setItem("wp_cart_count", String(updated.length));
                        } catch { /* ignore */ }
                        setDeleteConfirmId(null);
                      }
                    }}
                    style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 12, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                  >Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Address Popup ── */}
        {addressEditOpen && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 800,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460,
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden",
            }}>
              {/* Popup header */}
              <div style={{
                background: "linear-gradient(135deg,#7c3aed 0%,#db2777 60%,#f97316 100%)",
                padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem" }}>
                    {editForm.houseNo || editForm.city ? "Edit Address" : "Add Address"}
                  </span>
                </div>
                <button onClick={() => setAddressEditOpen(false)} style={{
                  background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.35)",
                  borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
                  color: "#fff", fontSize: "0.9rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>

              {/* Popup form */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
                {(
                  [
                    { key: "houseNo", label: "House / Unit No.", placeholder: "e.g. 12" },
                    { key: "flat",    label: "Street / Apartment", placeholder: "e.g. 123 Main St, Apt 4B" },
                    { key: "city",    label: "City", placeholder: "e.g. Halifax" },
                    { key: "state",   label: "Province", placeholder: "e.g. Nova Scotia" },
                  ] as { key: keyof typeof editForm; label: string; placeholder: string }[]
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={editForm[key]}
                      onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      style={{
                        width: "100%", padding: "11px 13px",
                        border: "1.5px solid #e5e7eb", borderRadius: 9,
                        fontSize: "0.92rem", color: "#111827", outline: "none",
                        boxSizing: "border-box", background: "#fff",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                ))}

                {/* Phone */}
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                    Phone Number <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 902 489 6081"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    style={{
                      width: "100%", padding: "11px 13px",
                      border: `1.5px solid ${editFormError && !editForm.phone ? "#dc2626" : "#e5e7eb"}`,
                      borderRadius: 9, fontSize: "0.92rem", color: "#111827",
                      outline: "none", boxSizing: "border-box", background: "#fff",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                    onBlur={(e) => (e.target.style.borderColor = editFormError && !editForm.phone ? "#dc2626" : "#e5e7eb")}
                  />
                </div>

                {editFormError && (
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>{editFormError}</p>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => setAddressEditOpen(false)}
                    style={{
                      flex: 1, padding: "12px", border: "1.5px solid #e5e7eb",
                      borderRadius: 10, cursor: "pointer", background: "#fff",
                      color: "#374151", fontWeight: 700, fontSize: "0.9rem",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const { houseNo, flat, city, state, phone } = editForm;
                      if (!phone.trim()) { setEditFormError("Phone number is required."); return; }
                      if (!houseNo.trim() || !flat.trim() || !city.trim() || !state.trim()) {
                        setEditFormError("Please fill in all address fields."); return;
                      }
                      setEditFormError("");
                      setCheckoutForm({ houseNo, flat, city, state, phone });
                      if (cartUser) {
                        fetch("/api/auth/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: cartUser.id, phone, houseNo, flat, city, state }),
                        }).catch(() => { /* ignore */ });
                      }
                      setAddressEditOpen(false);
                    }}
                    style={{
                      flex: 2, padding: "12px",
                      background: "linear-gradient(135deg,#7c3aed,#db2777)",
                      border: "none", borderRadius: 10, cursor: "pointer",
                      color: "#fff", fontWeight: 800, fontSize: "0.9rem",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Save Address
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
