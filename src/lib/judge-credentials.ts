export function normalizeJudgePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function normalizeJudgeName(value: string) {
  return value.toLowerCase().replace(/\b(mr|mrs|ms|dr)\.?\b/g, "").replace(/[^a-z0-9]/g, "");
}
