"use client";

import { useState, useRef } from "react";
import { categories, CATEGORY_SUBPRODUCT_OPTIONS } from "@/lib/data";

/* ── CONFIG — update these ───────────────────────────────── */
const CONTACT_EMAIL   = "info@weprintnpack.ca";

const ALL_PRODUCT_NAMES = Array.from(new Set([
  ...categories.map(c => c.name),
  ...Object.values(CATEGORY_SUBPRODUCT_OPTIONS).flat(),
]));

const PRODUCTS = [...ALL_PRODUCT_NAMES, "Other"];

type Form = {
  name: string; phone: string; email: string;
  product: string; quantity: string; message: string;
};
const EMPTY: Form = { name:"", phone:"", email:"", product:"", quantity:"", message:"" };

export default function LandingContactForm() {
  const [form, setForm]         = useState<Form>(EMPTY);
  const [file, setFile]         = useState<File | null>(null);
  const [done, setDone]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err,  setErr]          = useState("");
  const [drag, setDrag]         = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(p => ({ ...p, [k]: e.target.value }));
      if (err) setErr("");
    };

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setErr("File must be under 20 MB."); return; }
    setFile(f); setErr("");
  }

  function validate() {
    if (!form.name.trim())    return "Please enter your name.";
    if (!form.phone.trim())   return "Please enter your phone number.";
    if (!form.email.includes("@")) return "Please enter a valid email.";
    if (!form.product)        return "Please select a product type.";
    if (!form.quantity.trim()) return "Please enter a quantity.";
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("name",     form.name);
      fd.append("phone",    form.phone);
      fd.append("email",    form.email);
      fd.append("product",  form.product);
      fd.append("quantity", form.quantity);
      fd.append("message",  form.message);
      if (file) fd.append("file", file);

      const res = await fetch("/api/contact", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr((j as { error?: string }).error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setForm(EMPTY);
      setFile(null);
    } catch {
      setErr("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ── SUCCESS STATE ─────────────────────────────────────── */
  if (done) return (
    <div className="lp-success">
      <span className="lp-success-ico">🎉</span>
      <h3>Request Sent!</h3>
      <p>Your quote request has been sent to {CONTACT_EMAIL}. We&apos;ll get back to you shortly.</p>
      <button
        onClick={() => setDone(false)}
        style={{ background:"none", border:"none", color:"#2563eb", cursor:"pointer", fontWeight:600 }}
      >
        ← Submit another
      </button>
    </div>
  );

  /* ── FORM ──────────────────────────────────────────────── */
  return (
    <form onSubmit={submit} noValidate>
      {err && <div className="lp-err">⚠️ {err}</div>}

      <div className="lp-fg">
        <div className="lp-field">
          <label htmlFor="lf-name">Full Name *</label>
          <input id="lf-name" type="text" placeholder="Enter your full name" value={form.name} onChange={set("name")} />
        </div>
        <div className="lp-field">
          <label htmlFor="lf-phone">Phone Number *</label>
          <input id="lf-phone" type="tel" placeholder="Enter your phone number" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="lp-field">
          <label htmlFor="lf-email">Email Address *</label>
          <input id="lf-email" type="email" placeholder="Enter your email address" value={form.email} onChange={set("email")} />
        </div>
        <div className="lp-field">
          <label htmlFor="lf-product">Product Type *</label>
          <select id="lf-product" value={form.product} onChange={set("product")}>
            <option value="" disabled>Select product</option>
            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="lp-field">
          <label htmlFor="lf-qty">Quantity *</label>
          <input id="lf-qty" type="text" placeholder="Enter quantity" value={form.quantity} onChange={set("quantity")} />
        </div>
        <div className="lp-field lp-fg-full">
          <label htmlFor="lf-msg">Message</label>
          <textarea id="lf-msg" placeholder="Tell us about your requirements..." value={form.message} onChange={set("message")} />
        </div>

        {/* Upload */}
        <div className="lp-field lp-fg-full">
          <label>Upload Design / File</label>
          <div
            className={`lp-upload${drag ? " drag-active" : ""}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.ai,.svg,.eps,.psd"
              style={{ display: "none" }}
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            <div className="lp-upload-inner">
              <span className="lp-upload-icon">↑</span>
              <span className="lp-upload-main">Drag &amp; drop your file here</span>
              <span className="lp-upload-sub">JPG, PNG, PDF, AI, PSD (Max 20MB)</span>
              {file && <span className="lp-upload-name">✅ {file.name}</span>}
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="lp-send-btn" disabled={busy}>
        {busy ? "Sending…" : (
          <>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0, transform:"rotate(-40deg)"}}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            Send Request
          </>
        )}
      </button>
      <p className="lp-form-privacy">🔒 Your data is safe. No spam, ever.</p>
    </form>
  );
}
