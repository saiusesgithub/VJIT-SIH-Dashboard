import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { hasAdminSession, requireAdminSession } from "@/lib/require-admin-session";
import { hasCompletedReviewThree, parseDecisionInput, type ShortlistingState } from "@/lib/shortlisting";

export async function getTeamShortlisting(teamId: string): Promise<ShortlistingState | null> {
  await requireAdminSession();
  const team = await getDb().team.findUnique({
    where: { id: teamId },
    select: { finalDecision: true, decisionRevision: true, decisionUpdatedAt: true,
      reviews: { where: { reviewRound: { roundNumber: 3 } }, select: { status: true, reviewRound: { select: { roundNumber: true } } } } },
  });
  if (!team) return null;
  return { decision: team.finalDecision, revision: team.decisionRevision, updatedAt: team.decisionUpdatedAt?.toISOString() ?? null,
    eligible: hasCompletedReviewThree(team.reviews.map((review) => ({ status: review.status, roundNumber: review.reviewRound.roundNumber }))) };
}

export async function saveShortlistingDecision(value: unknown) {
  if (!(await hasAdminSession())) return { ok: false as const, code: "forbidden" as const };
  const input = parseDecisionInput(value);
  if (!input) return { ok: false as const, code: "invalid" as const };
  try {
    return await getDb().$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: input.teamId }, select: { hackathonId: true, finalDecision: true, decisionRevision: true } });
      if (!team) return { ok: false as const, code: "not_found" as const };
      const review = await tx.review.findFirst({ where: { teamId: input.teamId, status: "COMPLETED", reviewRound: { hackathonId: team.hackathonId, roundNumber: 3 } }, select: { id: true } });
      if (!review) return { ok: false as const, code: "not_eligible" as const };
      // A repeated identical request is safe, but a stale tab cannot replace a
      // newer faculty decision with a different one.
      if (team.finalDecision === input.decision) return { ok: true as const };
      if (team.decisionRevision !== input.revision) return { ok: false as const, code: "conflict" as const };
      const result = await tx.team.updateMany({ where: { id: input.teamId, decisionRevision: input.revision },
        data: { finalDecision: input.decision, decisionUpdatedAt: new Date(), decisionRevision: { increment: 1 } } });
      return result.count === 1 ? { ok: true as const } : { ok: false as const, code: "conflict" as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return { ok: false as const, code: "conflict" as const };
    throw error;
  }
}
