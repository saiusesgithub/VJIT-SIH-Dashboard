export interface JudgeReviewAuthContext {
  reviewJudgeId: string | null | undefined;
  reviewCompletedByJudgeId: string | null | undefined;
  sessionJudgeId: string;
  sessionJudgeRole: "external" | "internal";
  reviewCompletedByRole?: "external" | "internal";
}

/**
 * Determines if a judge can start or continue an in-progress review.
 * Rules:
 * - Any judge can start an unclaimed review
 * - A judge can continue their own in-progress review
 * - Internal judges cannot take over a review started by an external judge
 */
export function canJudgeWriteReview(context: JudgeReviewAuthContext): boolean {
  const { reviewJudgeId, sessionJudgeId } = context;

  // Unclaimed review - anyone can start
  if (!reviewJudgeId) return true;

  // Own review - can continue
  if (reviewJudgeId === sessionJudgeId) return true;

  // Cannot take over someone else's in-progress review
  return false;
}

/**
 * Determines if a judge can edit a completed review.
 * Rules:
 * - Only the judge who completed the review can edit it
 * - Internal judges cannot edit reviews completed by external judges
 */
export function canJudgeEditCompletedReview(context: JudgeReviewAuthContext): boolean {
  const { reviewCompletedByJudgeId, sessionJudgeId, sessionJudgeRole, reviewCompletedByRole } = context;

  // Must have been completed by someone
  if (!reviewCompletedByJudgeId) return false;

  // Same judge who completed it can edit
  if (reviewCompletedByJudgeId === sessionJudgeId) return true;

  // Internal judges cannot override external judge reviews
  if (sessionJudgeRole === "internal" && reviewCompletedByRole === "external") {
    return false;
  }

  // External judges cannot override other external judges' reviews
  // (each external judge "owns" their review)
  return false;
}
