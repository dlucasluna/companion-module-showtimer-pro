import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  userId: string;
  companyId: string;
  /** Expiry (ms since epoch). */
  exp: number;
}

export const SESSION_COOKIE = "ctr_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (min. 32 chars)");
    return "dev-only-insecure-session-secret-000000";
  }
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Stateless signed token: base64url(payload).hmac */
export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.userId !== "string" || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
