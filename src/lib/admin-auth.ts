const encoder = new TextEncoder();

export const ADMIN_SESSION_COOKIE = "sih_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 12 * 60 * 60;

interface SessionPayload {
  expiresAt: number;
  nonce: string;
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function validateAdminPin(candidate: string) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin || !candidate || candidate.length > 128) return false;

  const [candidateDigest, configuredDigest] = await Promise.all([
    digest(candidate),
    digest(configuredPin),
  ]);

  let difference = 0;
  for (let index = 0; index < candidateDigest.length; index += 1) {
    difference |= candidateDigest[index] ^ configuredDigest[index];
  }
  return difference === 0;
}

export async function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session configuration is unavailable.");

  const payload: SessionPayload = {
    expiresAt: Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importSigningKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)));
  return `${encodedPayload}.${bytesToBase64Url(signature)}`;
}

export async function verifyAdminSessionToken(token?: string) {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");
    if (!encodedPayload || !encodedSignature || extra) return false;

    const key = await importSigningKey(secret);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!validSignature) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as Partial<SessionPayload>;
    return typeof payload.expiresAt === "number" && payload.expiresAt > Date.now() && typeof payload.nonce === "string";
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    expires,
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    priority: "high" as const,
  };
}

export function sanitizeAdminRedirect(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || value.startsWith("//")) return "/admin";

  try {
    const target = new URL(value, "https://vjit-sih.local");
    const isAdminPath = target.pathname === "/admin" || target.pathname.startsWith("/admin/");
    if (target.origin !== "https://vjit-sih.local" || !isAdminPath || target.pathname.startsWith("/admin/login")) {
      return "/admin";
    }
    return `${target.pathname}${target.search}`;
  } catch {
    return "/admin";
  }
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function failedLoginDelay() {
  return new Promise((resolve) => setTimeout(resolve, 800));
}
