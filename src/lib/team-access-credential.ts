import { createHmac } from "node:crypto";

export const TEAM_ACCESS_BCRYPT_COST = 10;
export const DUMMY_TEAM_ACCESS_HASH = "$2b$10$D4e6tX/2CJeSQDbq3pqGxOvlY97Ha6A41l8PXlpsoT0l0mtiJpvZ2";

export function normalizeTeamAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function createTeamAccessLookup(value: string) {
  const secret = process.env.TEAM_ACCESS_LOOKUP_SECRET || process.env.JUDGE_PIN_LOOKUP_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("A team access lookup secret of at least 32 characters is required.");
  return createHmac("sha256", secret).update("vjit-sih:team-access:v1\0").update(normalizeTeamAccessCode(value)).digest("hex");
}

export function developmentTeamAccessCode(teamCode: string) {
  return `DEV-${teamCode.toUpperCase()}`;
}
