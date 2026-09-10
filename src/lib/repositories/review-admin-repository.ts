import "server-only";

import { ReviewStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export async function resetReviewToPending(reviewId: string) {
  if (!/^[a-z0-9-]{1,128}$/i.test(reviewId)) return false;
  const event = await getDb().hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true } })
    ?? await getDb().hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) return false;
  const review = await getDb().review.findFirst({ where: { id: reviewId, team: { hackathonId: event.id } }, select: { id: true } });
  if (!review) return false;
  await getDb().$transaction(async (tx) => {
    await tx.reviewScore.deleteMany({ where: { reviewId: review.id } });
    await tx.review.update({ where: { id: review.id }, data: { status: ReviewStatus.PENDING, judgeId: null, completedByJudgeId: null, startedAt: null, submittedAt: null, generalRemarks: null, improvements: null } });
  });
  return true;
}
