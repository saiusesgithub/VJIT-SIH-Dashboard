import type { FinalDecision } from "@/lib/shortlisting";

export type LeaderboardExportScope = "ranked" | "shortlisted";

export interface LeaderboardExportEntry {
  code: string;
  name: string;
  overallRank: number | null;
  completedReviews: number;
  venue: { name: string; room: string };
  problem: { code: string; title: string };
  shortlisting: { decision: FinalDecision | null };
}

export interface LeaderboardExportOptions {
  scope: LeaderboardExportScope;
  limit: number | null;
}

export function parseLeaderboardExportOptions(searchParams: URLSearchParams): LeaderboardExportOptions | null {
  const scope = searchParams.get("scope") ?? "ranked";
  if (scope !== "ranked" && scope !== "shortlisted") return null;
  const requested = searchParams.get("limit") ?? "25";
  if (requested === "all") return { scope, limit: null };
  if (!/^\d{1,3}$/.test(requested)) return null;
  const limit = Number(requested);
  return Number.isSafeInteger(limit) && limit >= 1 && limit <= 500 ? { scope, limit } : null;
}

export function selectLeaderboardExportEntries<T extends LeaderboardExportEntry>(entries: T[], options: LeaderboardExportOptions) {
  const eligible = entries.filter((entry) => entry.overallRank !== null
    && (options.scope === "ranked" || entry.shortlisting.decision === "SHORTLISTED"));
  return options.limit === null ? eligible : eligible.slice(0, options.limit);
}
