import type { FinalDecision } from "@/lib/shortlisting";

export type LeaderboardExportScope = "ranked" | "shortlisted";

export interface LeaderboardExportEntry {
  code: string;
  name: string;
  overallRank: number | null;
  totalScore: number;
  completedReviews: number;
  venue: { name: string; room: string };
  problem: { code: string; title: string; theme?: string | null; category?: string | null };
  shortlisting: { decision: FinalDecision | null };
}

export interface LeaderboardExportOptions {
  scope: LeaderboardExportScope;
  limit: number | null;
  theme: string | null;
}

export function parseLeaderboardExportOptions(searchParams: URLSearchParams): LeaderboardExportOptions | null {
  const scope = searchParams.get("scope") ?? "ranked";
  if (scope !== "ranked" && scope !== "shortlisted") return null;
  const requested = searchParams.get("limit") ?? "25";
  const theme = searchParams.get("theme")?.trim() || null;
  if (theme && (theme.length > 120 || /[\u0000-\u001f]/.test(theme))) return null;
  if (requested === "all") return { scope, limit: null, theme };
  if (!/^\d{1,3}$/.test(requested)) return null;
  const limit = Number(requested);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= 500 ? { scope, limit, theme } : null;
}

export function selectLeaderboardExportEntries<T extends LeaderboardExportEntry>(entries: T[], options: LeaderboardExportOptions) {
  const eligible = entries.filter((entry) => entry.overallRank !== null
    && (options.scope === "ranked" || entry.shortlisting.decision === "SHORTLISTED")
    && (!options.theme || entry.problem.theme === options.theme));
  return options.limit === null ? eligible : eligible.slice(0, options.limit);
}
