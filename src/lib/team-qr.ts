import QRCode from "qrcode";

export function getQrOrigin(value: string | undefined): { origin: string; local: boolean } | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return null;
    return { origin: url.origin, local };
  } catch { return null; }
}

export function getJudgeTeamPath(teamId: string) {
  if (!/^[a-z0-9-]{1,64}$/i.test(teamId)) throw new Error("Invalid team identifier for QR card.");
  return `/judge/teams/${encodeURIComponent(teamId)}`;
}

export function getJudgeTeamUrl(origin: string, teamId: string) {
  const configured = getQrOrigin(origin);
  if (!configured) throw new Error("APP_URL must be an HTTPS origin without credentials, query parameters or a subpath.");
  return `${configured.origin}${getJudgeTeamPath(teamId)}`;
}

export function createTeamQrImage(origin: string, teamId: string) {
  // Generate locally: no third-party QR service receives team URLs.
  return QRCode.toDataURL(getJudgeTeamUrl(origin, teamId), {
    type: "image/png", width: 512, margin: 4, errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
