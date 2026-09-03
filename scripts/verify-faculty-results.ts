import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../src/lib/admin-auth";
import { createJudgeSessionToken } from "../src/lib/judge-session";
import { createTeamSessionToken } from "../src/lib/team-session";

// Run against a local server on 3100 connected to the same DEVELOPMENT database.
// Only an isolated test event is written. All its records are removed in finally.
const base = "http://localhost:3100";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const fixtureId = `test-shortlisting-${randomUUID()}`;
const teamId = `${fixtureId}-team`;
const reviewId = `${fixtureId}-review`;

async function main() {
  const adminToken = await createAdminSessionToken();
  const headers = { Cookie: `${ADMIN_SESSION_COOKIE}=${adminToken}`, Origin: base, "Content-Type": "application/json" };
  const post = (decision: string, revision: number) => fetch(`${base}/admin/shortlisting`, { method: "POST", headers, body: JSON.stringify({ teamId, decision, revision }), redirect: "manual" });
  for (const token of [undefined, await createTeamSessionToken("test"), await createJudgeSessionToken({ judgeId: "test", assignmentId: "test", venueId: "test" })]) {
    for (const rsc of [false, true]) {
      const response = await fetch(`${base}/admin/problem-statements`, { redirect: "manual", headers: { Cookie: token ? `${ADMIN_SESSION_COOKIE}=${token}` : "", ...(rsc ? { RSC: "1" } : {}) } });
      assert.equal(response.status, 307);
    }
    const denied = await fetch(`${base}/admin/shortlisting`, { method: "POST", headers: { ...headers, Cookie: token ? `${ADMIN_SESSION_COOKIE}=${token}` : "" }, body: JSON.stringify({ teamId, decision: "HOLD", revision: 0 }), redirect: "manual" });
    assert.equal(denied.status, 303);
  }
  const crossOrigin = await fetch(`${base}/admin/shortlisting`, { method: "POST", headers: { ...headers, Origin: "https://other.example" }, body: "{}" });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await post("INVALID", 0)).status, 400);

  for (const path of ["/admin/problem-statements", "/admin/problem-statements?round=review-1", "/admin/leaderboard"]) {
    const response = await fetch(`${base}${path}`, { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const html = await response.text();
    assert.ok(html.includes(path.includes("leaderboard") ? "Final decision" : "Scored sample"));
  }

  const originalTeamCount = await db.team.count();
  try {
    await db.$transaction(async (tx) => {
      await tx.hackathon.create({ data: { id: fixtureId, name: "Temporary shortlisting verification", shortName: "TEST", academicYear: "TEST", status: "COMPLETED", startDate: new Date("2000-01-01"), endDate: new Date("2000-01-02") } });
      await tx.venue.create({ data: { id: `${fixtureId}-venue`, hackathonId: fixtureId, code: "TEST", name: "Test venue", roomNumber: "TEST", displayOrder: 1 } });
      await tx.problemStatement.create({ data: { id: `${fixtureId}-ps`, hackathonId: fixtureId, venueId: `${fixtureId}-venue`, code: "TEST", title: "Test", description: "Temporary test" } });
      await tx.team.create({ data: { id: teamId, hackathonId: fixtureId, venueId: `${fixtureId}-venue`, problemStatementId: `${fixtureId}-ps`, teamCode: "TEST", teamName: "Temporary test" } });
      await tx.reviewRound.create({ data: { id: `${fixtureId}-round`, hackathonId: fixtureId, roundNumber: 3, name: "Review 3", displayOrder: 3 } });
      await tx.review.create({ data: { id: reviewId, teamId, reviewRoundId: `${fixtureId}-round`, status: "PENDING" } });
    });
    assert.equal((await post("SHORTLISTED", 0)).status, 409, "Pending Review 3 must reject a decision");
    await db.review.update({ where: { id: reviewId }, data: { status: "COMPLETED", startedAt: new Date(), submittedAt: new Date() } });
    const reviewBefore = await db.review.findUniqueOrThrow({ where: { id: reviewId } });
    assert.equal((await post("HOLD", 0)).status, 200);
    const held = await db.team.findUniqueOrThrow({ where: { id: teamId } });
    assert.equal(held.finalDecision, "HOLD");
    assert.equal(held.decisionRevision, 1);
    assert.ok(held.decisionUpdatedAt);
    assert.equal((await post("HOLD", 0)).status, 200, "Retry must be idempotent");
    const retried = await db.team.findUniqueOrThrow({ where: { id: teamId } });
    assert.equal(retried.decisionRevision, held.decisionRevision);
    assert.equal(retried.decisionUpdatedAt?.getTime(), held.decisionUpdatedAt.getTime());
    assert.equal((await post("ELIMINATED", 0)).status, 409, "Stale changes must be rejected");
    const concurrent = await Promise.all([post("SHORTLISTED", 1), post("ELIMINATED", 1)]);
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 409]);
    const final = await db.team.findUniqueOrThrow({ where: { id: teamId } });
    assert.equal(final.decisionRevision, 2);
    assert.deepEqual(await db.review.findUniqueOrThrow({ where: { id: reviewId } }), reviewBefore, "Shortlisting must never change reviews");
    assert.equal(await db.reviewScore.count({ where: { reviewId } }), 0);
  } finally {
    await db.$transaction(async (tx) => {
      await tx.team.deleteMany({ where: { hackathonId: fixtureId } });
      await tx.problemStatement.deleteMany({ where: { hackathonId: fixtureId } });
      await tx.venue.deleteMany({ where: { hackathonId: fixtureId } });
      await tx.hackathon.deleteMany({ where: { id: fixtureId } });
    });
  }
  assert.equal(await db.team.count(), originalTeamCount);
  console.info("PASS: private HTML/RSC pages, private writes, CSRF, analytics rendering, Review 3 gating, saved decisions, timestamps, retries, concurrency, and unchanged reviews. Temporary test event removed.");
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Faculty workflow verification failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
