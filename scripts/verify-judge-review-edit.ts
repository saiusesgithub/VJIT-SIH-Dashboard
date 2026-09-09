import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { createJudgeSessionToken, JUDGE_SESSION_COOKIE } from "../src/lib/judge-session";

const baseUrl = "http://localhost:3100";

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  try {
    const assignments = await prisma.venueJudge.findMany({ where: { pinHash: { not: null } }, select: { id: true, judgeId: true, venueId: true } });
    let fixture: { assignmentId: string; judgeId: string; venueId: string; teamId: string; roundId: string; updatedAt: Date } | null = null;
    for (const assignment of assignments) {
      const review = await prisma.review.findFirst({
        where: { status: "COMPLETED", judgeId: assignment.judgeId, team: { venueId: assignment.venueId } },
        select: { teamId: true, reviewRoundId: true, updatedAt: true },
      });
      if (review) fixture = { assignmentId: assignment.id, judgeId: assignment.judgeId, venueId: assignment.venueId, teamId: review.teamId, roundId: review.reviewRoundId, updatedAt: review.updatedAt };
      if (fixture) break;
    }
    assert.ok(fixture, "Seed at least one completed review owned by an active judge assignment");
    const token = await createJudgeSessionToken(fixture);
    const headers = { Cookie: `${JUDGE_SESSION_COOKIE}=${token}` };
    const path = `/judge/teams/${fixture.teamId}/reviews/${fixture.roundId}`;
    const readOnly = await fetch(`${baseUrl}${path}`, { headers });
    assert.equal(readOnly.status, 200);
    assert.ok((await readOnly.text()).includes("Edit my review"));
    const edit = await fetch(`${baseUrl}${path}?edit=1`, { headers });
    assert.equal(edit.status, 200);
    assert.ok((await edit.text()).includes("Save Review"));
    const unchanged = await prisma.review.findUniqueOrThrow({ where: { teamId_reviewRoundId: { teamId: fixture.teamId, reviewRoundId: fixture.roundId } }, select: { updatedAt: true } });
    assert.equal(unchanged.updatedAt.toISOString(), fixture.updatedAt.toISOString(), "Viewing or opening edit mode must not mutate the review");
    console.info("PASS: the submitting judge sees read-only results, can open edit mode, and GET requests do not mutate the review.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
