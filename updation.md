# WebPrint → SinaLite Integration: Required Updates

Context: Sabhi products SinaLite (manufacturer) bana raha hai. Wholesale rate pe supply milega, aur shipment/fulfillment bhi unhi ki API se hoga. Is doc me wo sab changes hain jo app me karne padenge.

---

## A. SinaLite se kya chahiye (pehle ye milna zaroori hai)

1. **Reseller/Partner account approval** — [sinalite.com/en_us/api-signup](https://sinalite.com/en_us/api-signup) pe signup, business verification ke baad approval.
2. **client_id + client_secret** — approval ke baad SinaLite dashboard/team se milega. Contact: support ticket / chat / phone **1-866-899-2499**.
3. Poora **product catalog** (`GET /product`) — kaunse products, kaunse variants/options available hain.
4. Wholesale price list / live pricing confirmation.
5. Order format spec — artwork/design file upload format (PDF/PNG?), required fields.
6. Webhook support hai ya status poll karna padega — confirm karna.
7. Payment terms (per-order invoice / monthly settlement / prepaid wallet).

---

## B. SinaLite API — endpoints (liveapi.sinalite.com)

- **Auth:** `POST /auth/token` — `client_id` + `client_secret` se Bearer token milta hai.
- **Catalog:**
  - `GET /product` — sabhi products
  - `GET /product/{id}` — ek product detail
  - `GET /product/{id}/{storeCode}` — pricing options + metadata (storeCode: 6=Canada, 9=US)
- **Pricing:**
  - `GET /variants/{id}/{offset}` — variant pricing, 1000 per page
  - `GET /pricedbykey/{id}/{key}` — specific variant combo price
  - `POST /price/{id}/{storeCode}` — selected options ka final price
- **Order:**
  - `POST /order/shippingEstimate` — address ke basis pe shipping rate
  - `POST /order/new` — order place (items + shipping + billing)
- Sandbox env: `https://api.sinaliteuppy.com` (pehle yahan test karo)
- Header: `Content-Type: application/json`, `Authorization: Bearer <token>`

---

## C. Product catalog reconciliation (one-time, sabse pehle karna hai)

Abhi tumhare products (business cards, banners, packaging box, etc.) sirf UI/naam level pe bane hain — SinaLite ke actual catalog se koi mapping nahi hai. Isliye:

1. `GET /product` se SinaLite ka poora catalog nikalo.
2. Tumhare existing products ko unke `product_id` se **remap** karo.
3. Options (size, paper stock, finish, corners, sides, qty) unke variant options ke saath **align** karo.
4. Jo products/options SinaLite ke paas nahi hain — remove/update karo.
5. Jo SinaLite ke paas hain but tumhare app me missing hain — add karo.

Reference ke liye Printfever jaisi site dekhi ja sakti hai (same manufacturer, business cards example): size (Standard/Slim/Square/European), qty (100–5000+), stock (14pt/16pt coated), finish (matte/glossy), sides, corners — is tarah ke discrete option fields chahiye, freeform "specs" text nahi.

---

## D. Database schema changes (lib/db.ts)

- `products` / `gallery_templates` me add:
  - `manufacturer_sku` / `manufacturer_product_id`
  - `wholesale_cost` (SinaLite se aane wala cost, `price`/`starting_price` se alag)
- `orders` me add:
  - `manufacturer_order_id`
  - `tracking_number`
  - `carrier`
  - `wholesale_cost_total`
- Naya table/config: `manufacturer_config` (client_id, client_secret, base URL) — ya `.env` me store.

---

## E. Naya integration layer (code)

- `lib/manufacturer-api.ts` — naya module:
  - Token fetch + cache/refresh (`/auth/token`)
  - Catalog sync (`/product`, `/variants`)
  - Live price fetch (`/price/{id}/{storeCode}`)
  - Shipping estimate (`/order/shippingEstimate`)
  - Order placement (`/order/new`)
- `app/api/webhooks/manufacturer/route.ts` — naya endpoint, agar SinaLite status/tracking webhook push karta hai.

---

## F. Checkout flow changes

- `app/api/checkout/create-session/route.ts` — hardcoded flat $10 shipping hatao, `/order/shippingEstimate` se real-time rate lo (address ke basis pe).
- `app/api/checkout/verify/route.ts` — payment verify hone ke baad `/order/new` call karke order SinaLite ko auto-forward karo, `manufacturer_order_id` save karo.

---

## G. Admin panel changes

- `components/admin-template-section.tsx` / product manager:
  - `wholesale_cost` field add
  - `manufacturer_sku` mapping field add
  - Margin (price − cost) display
- Orders page (`AdminOrdersPage`):
  - Manual `production_status` dropdown ki jagah SinaLite status + `tracking_number` dikhana
  - "Resend to manufacturer" retry button

---

## H. Inventory/availability sync (optional, likely needed)

- Cron/scheduled job — SinaLite catalog se price/stock periodically sync
- Stock-out hone par product "out of stock" mark karna

---

## I. Design/artwork export check

- `components/design-editor-shell.tsx` — customer designs SinaLite ke required format (print-ready PDF/PNG) me export ho, ye verify/build karna.

---

## J. Business/ops (non-code)

- Return/refund policy update — fulfillment ab SinaLite ke SLA pe depend karega.
- Customer support flow — order issues me SinaLite se coordinate karne ka process.
- GST/invoice handling — SinaLite se B2B invoice, customer ko B2C invoice.

---

## Priority order

1. SinaLite reseller account + credentials (A)
2. Sandbox pe API test (auth token, catalog fetch) (B)
3. Product catalog reconciliation (C)
4. DB schema update (D)
5. Manufacturer API integration layer (E)
6. Checkout flow update (F)
7. Admin panel update (G)
8. Inventory sync + design export check (H, I)
9. Ops/business updates (J)
