import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateProblemAnalytics, type AnalyticsRound, type ProblemPerformanceInput } from "../src/lib/problem-analytics";
import { hasCompletedReviewThree, parseDecisionInput } from "../src/lib/shortlisting";

const rounds: AnalyticsRound[] = [1, 2, 3].map((number) => ({ id: `r${number}`, number, name: `Review ${number}`, maximum: 100 }));
const review = (roundId: string, score: number, status = "COMPLETED") => ({ roundId, status, scores: [score] });
const problem = (teams: ProblemPerformanceInput["teams"]): ProblemPerformanceInput => ({ id: "ps1", code: "PS001", title: "Traffic", teams });

test("overall PS statistics compare only fully evaluated teams", () => {
  const [row] = calculateProblemAnalytics([problem([
    { reviews: [review("r1", 60), review("r2", 70), review("r3", 80)] },
    { reviews: [review("r1", 100), review("r2", 100), review("r3", 100, "IN_PROGRESS")] },
    { reviews: [review("r1", 40), review("r2", 50), review("r3", 60)] },
  ])], rounds);
  assert.equal(row.teamCount, 3);
  assert.equal(row.sampleSize, 2);
  assert.deepEqual([row.average, row.highest, row.lowest], [180, 210, 150]);
  assert.equal(row.completedReviews, 8);
  assert.equal(row.completionPercentage, 89);
  assert.deepEqual([row.progress[2].completed, row.progress[2].inProgress, row.progress[2].pending], [2, 1, 0]);
});

test("per-round scores include genuine zero and exclude unfinished scores", () => {
  const [row] = calculateProblemAnalytics([problem([{ reviews: [review("r1", 0)] }, { reviews: [review("r1", 20)] }, { reviews: [review("r1", 100, "PENDING")] }])], rounds, "r1");
  assert.deepEqual([row.sampleSize, row.average, row.highest, row.lowest], [2, 10, 20, 0]);
  assert.equal(row.progress[1].pending, 3);
});

test("empty samples and zero-team statements return no misleading scores", () => {
  const rows = calculateProblemAnalytics([problem([]), { ...problem([{ reviews: [] }]), id: "ps2" }], rounds);
  for (const row of rows) { assert.equal(row.average, null); assert.equal(row.highest, null); assert.equal(row.lowest, null); assert.equal(row.completionPercentage, 0); }
  assert.equal(calculateProblemAnalytics([problem([{ reviews: [] }])], [])[0].sampleSize, 0);
  assert.equal(calculateProblemAnalytics([problem([{ reviews: [review("r1", 10)] }])], rounds, "unknown")[0].sampleSize, 0);
});

test("decimal score averages round to two places without mutating input", () => {
  const input = [problem([{ reviews: [{ roundId: "r1", status: "COMPLETED", scores: [0.1, 0.2] }] }, { reviews: [review("r1", 0.4)] }])];
  const before = structuredClone(input);
  const [row] = calculateProblemAnalytics(input, rounds, "r1");
  assert.equal(row.average, 0.35);
  assert.deepEqual(input, before);
});

test("only an explicitly completed third review unlocks shortlisting", () => {
  assert.equal(hasCompletedReviewThree([]), false);
  assert.equal(hasCompletedReviewThree([{ roundNumber: 1, status: "COMPLETED" }, { roundNumber: 2, status: "COMPLETED" }]), false);
  assert.equal(hasCompletedReviewThree([{ roundNumber: 3, status: "IN_PROGRESS" }]), false);
  assert.equal(hasCompletedReviewThree([{ roundNumber: 3, status: "COMPLETED" }]), true);
});

test("decision input accepts only supported statuses and valid revisions", () => {
  for (const decision of ["SHORTLISTED", "HOLD", "ELIMINATED"]) assert.ok(parseDecisionInput({ teamId: "team-001", decision, revision: 0 }));
  for (const decision of ["APPROVED", "toString", "", null]) assert.equal(parseDecisionInput({ teamId: "team-001", decision, revision: 0 }), null);
  for (const revision of [-1, 1.5, "0", Infinity, undefined]) assert.equal(parseDecisionInput({ teamId: "team-001", decision: "HOLD", revision }), null);
  assert.equal(parseDecisionInput({ teamId: "../team", decision: "HOLD", revision: 0 }), null);
  assert.equal(parseDecisionInput(null), null);
});
