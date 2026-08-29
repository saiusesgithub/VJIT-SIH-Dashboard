import { createSignedToken, verifySignedToken } from "@/lib/signed-session";

export const TEAM_SESSION_COOKIE = "sih_team_session";
export const TEAM_SESSION_DURATION_SECONDS = 24 * 60 * 60;

export interface TeamSessionPayload {
  scope: "team";
  teamId: string;
  expiresAt: number;
  nonce: string;
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export async function createTeamSessionToken(teamId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Team session configuration is unavailable.");
  return createSignedToken({ scope: "team", teamId, expiresAt: Date.now() + TEAM_SESSION_DURATION_SECONDS * 1000, nonce: crypto.randomUUID() } satisfies TeamSessionPayload, secret);
}

export async function verifyTeamSessionToken(token?: string) {
  const payload = await verifySignedToken<Partial<TeamSessionPayload>>(token, sessionSecret());
  if (payload?.scope !== "team" || typeof payload.teamId !== "string" || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now() || typeof payload.nonce !== "string") return null;
  return payload as TeamSessionPayload;
}

export function teamSessionCookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/team", expires, maxAge: TEAM_SESSION_DURATION_SECONDS, priority: "high" as const };
}

export function sanitizeTeamRedirect(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || value.startsWith("//")) return "/team";
  try {
    const target = new URL(value, "https://vjit-sih.local");
    const allowed = target.pathname === "/team" || target.pathname.startsWith("/team/");
    if (target.origin !== "https://vjit-sih.local" || !allowed || target.pathname.startsWith("/team/login")) return "/team";
    return `${target.pathname}${target.search}`;
  } catch { return "/team"; }
}
