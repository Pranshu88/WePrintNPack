// Server-only. Do not import from client components.

type SinaliteToken = { accessToken: string; expiresAt: number };

let cachedToken: SinaliteToken | null = null;

export type SinaliteProduct = {
  id: number;
  sku: string;
  name: string;
  category: string;
  enabled: number;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function getSinaliteToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const authUrl = process.env.SINALITE_AUTH_URL || "https://api.sinaliteuppy.com/auth/token";
  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requiredEnv("SINALITE_CLIENT_ID"),
      client_secret: requiredEnv("SINALITE_CLIENT_SECRET"),
      audience: process.env.SINALITE_AUDIENCE || "https://apiconnect.sinalite.com",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Sinalite auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

let cachedProducts: { at: number; products: SinaliteProduct[] } | null = null;
const PRODUCTS_CACHE_TTL_MS = 60_000;

export async function fetchSinaliteProducts(): Promise<SinaliteProduct[]> {
  if (cachedProducts && Date.now() - cachedProducts.at < PRODUCTS_CACHE_TTL_MS) {
    return cachedProducts.products;
  }

  const token = await getSinaliteToken();
  const apiUrl = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
  const res = await fetch(`${apiUrl}/product`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Sinalite product fetch failed: ${res.status} ${await res.text()}`);
  }

  const products = (await res.json()) as SinaliteProduct[];
  cachedProducts = { at: Date.now(), products };
  return products;
}

export type SinaliteOption = {
  id: number;
  group: string;
  name: string;
  hidden: number;
};

export async function fetchSinaliteProductOptions(sinaliteId: string): Promise<SinaliteOption[]> {
  const token = await getSinaliteToken();
  const apiUrl = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
  const res = await fetch(`${apiUrl}/product/${encodeURIComponent(sinaliteId)}/en_ca`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Sinalite product options fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as unknown;
  // The endpoint wraps the option array in an outer array: [[{id, group, name, hidden}, ...]]
  const arr = Array.isArray(data) ? data : [];
  const inner = Array.isArray(arr[0]) ? arr[0] : arr;
  return inner as SinaliteOption[];
}

export type SinalitePriceResult = {
  price: number;
  productOptions: Record<string, string>;
};

export type SinaliteShippingItem = { productId: number; options: Record<string, string> };
export type SinaliteShippingInfo = { state: string; zip: string; country: string };
export type SinaliteShippingOption = { carrier: string; service: string; price: number; days: number };

export async function fetchSinaliteShippingEstimate(
  items: SinaliteShippingItem[],
  shippingInfo: SinaliteShippingInfo
): Promise<SinaliteShippingOption[]> {
  const token = await getSinaliteToken();
  const apiUrl = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
  const payload = {
    items: items.map((i) => ({ productId: i.productId, options: i.options })),
    shippingInfo: {
      ShipState: shippingInfo.state,
      ShipZip: shippingInfo.zip,
      ShipCountry: shippingInfo.country,
    },
  };
  console.log("[sinalite/shippingEstimate] payload sent to Sinalite:", JSON.stringify(payload, null, 2));
  const res = await fetch(`${apiUrl}/order/shippingEstimate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Sinalite shipping estimate fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { body?: unknown };
  if (!Array.isArray(data.body)) {
    // Sinalite returns a non-array body (an error string/object) when an item's option
    // selection is incomplete or invalid for its product — surface that plainly instead
    // of crashing on .map().
    const detail = typeof data.body === "string" ? data.body : JSON.stringify(data.body ?? {});
    throw new Error(`Sinalite could not estimate shipping for one or more items: ${detail}`);
  }
  return (data.body as [string, string, string | number, number][]).map(([carrier, service, price, days]) => ({
    carrier,
    service,
    price: typeof price === "string" ? parseFloat(price) : price,
    days,
  }));
}

export type SinaliteOrderFile = { type: "front" | "back"; url: string };
export type SinaliteOrderItem = { productId: number; options: Record<string, string>; files: SinaliteOrderFile[] };
export type SinaliteOrderParty = {
  firstName: string; lastName: string; email: string;
  addr: string; addr2: string; city: string; state: string; zip: string; country: string; phone: string;
};
export type SinaliteOrderResult = { raw: unknown };

// Places the actual print order with Sinalite once payment has succeeded. Billing
// info is always WebPrintNPack's own account details (we're the buyer of record
// with Sinalite); shipping info is the end customer's delivery address — Sinalite
// ships direct-to-customer on our behalf.
export const WEPRINTNPACK_BILLING: SinaliteOrderParty = {
  firstName: "Mohammad mairaj",
  lastName: "Saifi",
  email: "info@weprintnpack.ca",
  addr: "Halifax, Nova Scotia",
  addr2: "",
  city: "Halifax",
  state: "NS",
  zip: "B3H",
  country: "CA",
  phone: "+1 902-412-2133",
};

export async function createSinaliteOrder(
  items: SinaliteOrderItem[],
  shipping: SinaliteOrderParty & { method: string },
  notes: string
): Promise<SinaliteOrderResult> {
  const token = await getSinaliteToken();
  const apiUrl = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
  const billing = WEPRINTNPACK_BILLING;
  const payload = {
    items: items.map((i) => ({ productId: i.productId, options: i.options, files: i.files })),
    shippingInfo: {
      ShipFName: shipping.firstName,
      ShipLName: shipping.lastName,
      ShipEmail: shipping.email,
      ShipAddr: shipping.addr,
      ShipAddr2: shipping.addr2,
      ShipCity: shipping.city,
      ShipState: shipping.state,
      ShipZip: shipping.zip,
      ShipCountry: shipping.country,
      ShipPhone: shipping.phone,
      ShipMethod: shipping.method,
    },
    billingInfo: {
      BillFName: billing.firstName,
      BillLName: billing.lastName,
      BillEmail: billing.email,
      BillAddr: billing.addr,
      BillAddr2: billing.addr2,
      BillCity: billing.city,
      BillState: billing.state,
      BillZip: billing.zip,
      BillCountry: billing.country,
      BillPhone: billing.phone,
    },
    notes,
  };
  console.log("[sinalite/order] payload sent to Sinalite:", JSON.stringify(payload, null, 2));
  const res = await fetch(`${apiUrl}/order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.json().catch(() => null);
  console.log("[sinalite/order] response from Sinalite:", JSON.stringify(raw, null, 2));
  if (!res.ok) {
    throw new Error(`Sinalite order creation failed: ${res.status} ${JSON.stringify(raw)}`);
  }
  return { raw };
}

export async function fetchSinalitePrice(sinaliteId: string, optionIds: number[]): Promise<SinalitePriceResult> {
  const token = await getSinaliteToken();
  const apiUrl = process.env.SINALITE_API_URL || "https://api.sinaliteuppy.com";
  const res = await fetch(`${apiUrl}/price/${encodeURIComponent(sinaliteId)}/en_ca`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ productOptions: optionIds }),
  });

  if (!res.ok) {
    throw new Error(`Sinalite price fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { price2?: { price?: number }; productOptions?: Record<string, string> };
  return {
    price: data.price2?.price ?? 0,
    productOptions: data.productOptions ?? {},
  };
}
