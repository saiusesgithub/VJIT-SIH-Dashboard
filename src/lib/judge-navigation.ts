import type { ReviewStatus } from "@/types/domain";

export function getCurrentJudgeRound<T extends { status: ReviewStatus }>(rounds: T[]): T | undefined {
  // Input follows the database's display order. Resume existing work first.
  return rounds.find((round) => round.status === "in_progress") ?? rounds.find((round) => round.status === "pending");
}
