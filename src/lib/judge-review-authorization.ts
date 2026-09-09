export function canJudgeWriteReview(reviewJudgeId: string | null | undefined, sessionJudgeId: string) {
  return !reviewJudgeId || reviewJudgeId === sessionJudgeId;
}

export function canJudgeEditCompletedReview(reviewJudgeId: string | null | undefined, sessionJudgeId: string) {
  return Boolean(reviewJudgeId) && reviewJudgeId === sessionJudgeId;
}
