"use client";

const PRIVACY_CONTENT = [
  "We collect personal information (name, email, phone, address) only to process your orders and provide customer support.",
  "Your information is never sold or shared with third parties except for shipping and payment processing purposes.",
  "We use cookies to improve your browsing experience and analyze site traffic.",
  "Payment information is processed securely through Stripe and is never stored on our servers.",
  "You may request deletion of your personal data at any time by contacting us.",
  "We may send order-related emails and occasional promotional offers. You can unsubscribe anytime.",
  "Our website uses SSL encryption to protect all data transmitted between your browser and our servers.",
];

const TERMS_CONTENT = [
  "Prices are subject to final artwork and production review.",
  "Taxes are extra.",
  "Production starts after payment and final artwork approval.",
  "No cancellation or refund once order is sent to production.",
  "Slight colour variation may occur between screen and final print.",
  "Customer is responsible for proofreading before approval.",
  "Turnaround time may vary by product and shipping.",
  "Free basic design includes minor layout only, not full branding.",
];

type PolicyType = "privacy" | "terms";

export function PolicyModal({ type, onClose }: { type: PolicyType; onClose: () => void }) {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms & Conditions";
  const items = isPrivacy ? PRIVACY_CONTENT : TERMS_CONTENT;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 3000,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 3001,
        width: "min(560px, 94vw)",
        maxHeight: "80vh",
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #7c3aed, #db2777, #f97316)",
          padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>{title}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", marginTop: 2 }}>
              We Print N Pack
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none",
              borderRadius: 8, cursor: "pointer",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "1rem", fontWeight: 700,
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "24px 28px 28px" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 7,
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                }} />
                <span style={{ fontSize: "0.92rem", color: "#374151", lineHeight: 1.65 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#7c3aed,#db2777,#f97316,#06b6d4)", flexShrink: 0 }} />
      </div>
    </>
  );
}
