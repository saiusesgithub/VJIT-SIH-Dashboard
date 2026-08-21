const encoder = new TextEncoder();

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

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSignedToken(payload: object, secret: string) {
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(secret), encoder.encode(encoded)));
  return `${encoded}.${bytesToBase64Url(signature)}`;
}

export async function verifySignedToken<T>(token: string | undefined, secret: string | null): Promise<T | null> {
  if (!token || !secret) return null;
  try {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) return null;
    const valid = await crypto.subtle.verify("HMAC", await signingKey(secret), base64UrlToBytes(signature), encoder.encode(encoded));
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as T;
  } catch {
    return null;
  }
}
