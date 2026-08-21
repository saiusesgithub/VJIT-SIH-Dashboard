import { createSignedToken, verifySignedToken } from "@/lib/signed-session";

export const JUDGE_SESSION_COOKIE = "sih_judge_session";
export const JUDGE_SESSION_DURATION_SECONDS = 12 * 60 * 60;

export interface JudgeSessionPayload {
  scope: "judge";
  assignmentId: string;
  judgeId: string;
  venueId: string;
  expiresAt: number;
  nonce: string;
}

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export async function createJudgeSessionToken(identity: Pick<JudgeSessionPayload, "assignmentId" | "judgeId" | "venueId">) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Judge session configuration is unavailable.");
  return createSignedToken({
    scope: "judge",
    assignmentId: identity.assignmentId,
    judgeId: identity.judgeId,
    venueId: identity.venueId,
    expiresAt: Date.now() + JUDGE_SESSION_DURATION_SECONDS * 1000,
    nonce: crypto.randomUUID(),
  } satisfies JudgeSessionPayload, secret);
}

export async function verifyJudgeSessionToken(token?: string) {
  const payload = await verifySignedToken<Partial<JudgeSessionPayload>>(token, sessionSecret());
  if (
    payload?.scope !== "judge" ||
    typeof payload.assignmentId !== "string" ||
    typeof payload.judgeId !== "string" ||
    typeof payload.venueId !== "string" ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt <= Date.now() ||
    typeof payload.nonce !== "string"
  ) return null;
  return payload as JudgeSessionPayload;
}

export function judgeSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/judge",
    expires,
    maxAge: JUDGE_SESSION_DURATION_SECONDS,
    priority: "high" as const,
  };
}

export function sanitizeJudgeRedirect(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || value.startsWith("//")) return "/judge";
  try {
    const target = new URL(value, "https://vjit-sih.local");
    const allowed = target.pathname === "/judge" || target.pathname.startsWith("/judge/");
    if (target.origin !== "https://vjit-sih.local" || !allowed || target.pathname.startsWith("/judge/login")) return "/judge";
    return `${target.pathname}${target.search}`;
  } catch {
    return "/judge";
  }
}
