export const decisionLabels = { SHORTLISTED: "Shortlisted", HOLD: "Hold", ELIMINATED: "Eliminated" } as const;
export type FinalDecision = keyof typeof decisionLabels;

export interface ShortlistingState {
  decision: FinalDecision | null;
  updatedAt: string | null;
  revision: number;
  eligible: boolean;
}

export interface DecisionInput { teamId: string; decision: FinalDecision; revision: number }

export function parseDecisionInput(value: unknown): DecisionInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.teamId !== "string" || !/^[a-z0-9-]{1,100}$/i.test(input.teamId)
    || typeof input.decision !== "string" || !Object.hasOwn(decisionLabels, input.decision)
    || !Number.isSafeInteger(input.revision) || (input.revision as number) < 0) return null;
  return { teamId: input.teamId, decision: input.decision as FinalDecision, revision: input.revision as number };
}

export function hasCompletedReviewThree(reviews: Array<{ status: string; roundNumber: number }>) {
  return reviews.some((review) => review.roundNumber === 3 && review.status === "COMPLETED");
}
