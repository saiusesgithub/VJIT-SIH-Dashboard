import { createHmac } from "node:crypto";

export const JUDGE_PIN_BCRYPT_COST = 10;
export const DUMMY_JUDGE_PIN_HASH = "$2b$10$D4e6tX/2CJeSQDbq3pqGxOvlY97Ha6A41l8PXlpsoT0l0mtiJpvZ2";

export function createJudgePinLookup(pin: string) {
  const secret = process.env.JUDGE_PIN_LOOKUP_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JUDGE_PIN_LOOKUP_SECRET or ADMIN_SESSION_SECRET must contain at least 32 characters before judge PINs can be used.");
  }

  return createHmac("sha256", secret)
    .update("vjit-sih:judge-pin:v1\0")
    .update(pin)
    .digest("hex");
}
