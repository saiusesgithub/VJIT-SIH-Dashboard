import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const CONTEXT = "vjit-sih:team-access:encryption:v1";

function getEncryptionKey() {
  const secret = process.env.TEAM_ACCESS_ENCRYPTION_SECRET || process.env.TEAM_ACCESS_LOOKUP_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("A team access encryption secret of at least 32 characters is required.");
  return createHash("sha256").update(CONTEXT).update("\0").update(secret).digest();
}

export function encryptTeamAccessCode(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(CONTEXT));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptTeamAccessCode(value: string | null | undefined) {
  if (!value) return null;
  try {
    const [version, encodedIv, encodedTag, encodedValue, ...extra] = value.split(".");
    if (version !== VERSION || !encodedIv || !encodedTag || !encodedValue || extra.length) return null;
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAAD(Buffer.from(CONTEXT));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encodedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
