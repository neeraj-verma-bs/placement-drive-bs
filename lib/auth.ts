/**
 * Single-gate auth: one shared password from the environment, no per-user
 * accounts. A successful login sets an HMAC-signed cookie that `proxy.ts` can
 * verify at the edge without a database round-trip.
 */

const COOKIE_NAME = "pd_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

export { COOKIE_NAME, SESSION_TTL_SECONDS };

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

/** Constant-time comparison, so a wrong guess leaks no timing information. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Compare a fixed number of bytes either way; length still differs, but the
  // per-byte loop below does not short-circuit on the first mismatch.
  let mismatch = left.length === right.length ? 0 : 1;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

export function checkPassword(candidate: string): boolean {
  return timingSafeEqual(candidate, requiredEnv("APP_PASSWORD"));
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredEnv("SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return base64UrlEncode(signature);
}

/** Token shape: `<expiryEpochSeconds>.<hmac>`. */
export async function createSessionToken(
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const expiresAt = Number(payload);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now()) return false;

  return timingSafeEqual(token.slice(separator + 1), await sign(payload));
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
