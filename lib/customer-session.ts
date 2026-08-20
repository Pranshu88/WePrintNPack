import crypto from "crypto";

const SECRET = process.env.CUSTOMER_SESSION_SECRET || "webprint-customer-secret-2024";
export const CUSTOMER_SESSION_COOKIE = "customer_session";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(customerId: string): string {
  return crypto.createHmac("sha256", SECRET).update(customerId).digest("hex");
}

export function makeCustomerSessionToken(customerId: string): string {
  return `${customerId}.${sign(customerId)}`;
}

export function verifyCustomerSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const id = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(id);
  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }
  return id;
}
