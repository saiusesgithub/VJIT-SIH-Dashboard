export function formatTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function rangeLabel(codes: string[]) {
  if (!codes.length) return "No problem statements";
  return codes.length === 1 ? codes[0] : `${codes[0]}–${codes.at(-1)}`;
}
