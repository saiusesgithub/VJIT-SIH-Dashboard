import { createSignedToken, verifySignedToken } from "@/lib/signed-session";

const encoder = new TextEncoder();

export const ADMIN_SESSION_COOKIE = "sih_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 12 * 60 * 60;

export type AdminRole = "faculty" | "super_admin";

interface SessionPayload {
  scope: "admin";
  role: AdminRole;
  expiresAt: number;
  nonce: string;
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function matchesPin(candidate: string, configuredPin?: string) {
  if (!configuredPin || !candidate || candidate.length > 128) return false;
  const [candidateDigest, configuredDigest] = await Promise.all([digest(candidate), digest(configuredPin)]);
  let difference = 0;
  for (let index = 0; index < candidateDigest.length; index += 1) {
    difference |= candidateDigest[index] ^ configuredDigest[index];
  }
  return difference === 0;
}

export async function validateAdminPin(candidate: string): Promise<AdminRole | null> {
  const [superAdmin, faculty] = await Promise.all([
    matchesPin(candidate, process.env.SUPER_ADMIN_PIN),
    matchesPin(candidate, process.env.ADMIN_PIN),
  ]);
  return superAdmin ? "super_admin" : faculty ? "faculty" : null;
}

export async function createAdminSessionToken(role: AdminRole = "faculty") {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Admin session configuration is unavailable.");

  const payload: SessionPayload = {
    scope: "admin",
    role,
    expiresAt: Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  };
  return createSignedToken(payload, secret);
}

export async function getAdminSessionRole(token?: string): Promise<AdminRole | null> {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const payload = await verifySignedToken<Partial<SessionPayload>>(token, secret);
  if (payload?.scope !== "admin" || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now() || typeof payload.nonce !== "string") return null;
  // Legacy signed sessions from before roles were introduced remain read-only.
  return payload.role === "super_admin" ? "super_admin" : "faculty";
}

export async function verifyAdminSessionToken(token?: string) {
  return Boolean(await getAdminSessionRole(token));
}

export async function verifySuperAdminSessionToken(token?: string) {
  return (await getAdminSessionRole(token)) === "super_admin";
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
