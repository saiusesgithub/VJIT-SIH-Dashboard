import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLeaderboard, type LeaderboardTeam } from "../src/lib/leaderboard";

function team(code: string, scores: number[], venue = "lab-1", problem = "ps-1", status = "COMPLETED"): LeaderboardTeam {
  return { id: code, code, name: code, venue: { id: venue, name: venue, room: "A-201" }, problem: { id: problem, code: problem, title: problem }, reviews: scores.length ? [{ status, scores }] : [] };
}

test("ranks overall, venue and problem groups independently", () => {
  const result = calculateLeaderboard([team("T003", [70], "lab-1", "ps-2"), team("T002", [80], "lab-2", "ps-1"), team("T001", [90])]);
  assert.deepEqual(result.map((row) => [row.code, row.overallRank, row.venueRank, row.problemRank]), [["T001", 1, 1, 1], ["T002", 2, 1, 2], ["T003", 3, 2, 1]]);
});

test("ties use competition ranks and deterministic code ordering", () => {
  const rows = calculateLeaderboard([team("T003", [80]), team("T002", [90]), team("T001", [90])]);
  assert.deepEqual(rows.map((row) => [row.code, row.overallRank, row.venueRank, row.problemRank]), [["T001", 1, 1, 1], ["T002", 1, 1, 1], ["T003", 3, 3, 3]]);
});

test("only completed reviews contribute, while unreviewed teams are unranked", () => {
  const rows = calculateLeaderboard([team("T001", [100], "lab-1", "ps-1", "IN_PROGRESS"), team("T002", [0]), team("T003", [])]);
  assert.equal(rows[0].code, "T002");
  assert.equal(rows[0].overallRank, 1);
  assert.ok(rows.slice(1).every((row) => row.overallRank === null && row.venueRank === null && row.problemRank === null));
});

test("sums submitted rounds without giving draft scores credit", () => {
  const item = team("T001", [40, 30]);
  item.reviews.push({ status: "COMPLETED", scores: [20] }, { status: "PENDING", scores: [100] });
  const [row] = calculateLeaderboard([item]);
  assert.equal(row.totalScore, 90);
  assert.equal(row.completedReviews, 2);
});

test("decimal totals tie exactly and empty events are supported", () => {
  const rows = calculateLeaderboard([team("T001", [0.1, 0.2]), team("T002", [0.3])]);
  assert.deepEqual(rows.map((row) => row.overallRank), [1, 1]);
  assert.equal(rows[0].totalScore, 0.3);
  assert.deepEqual(calculateLeaderboard([]), []);
});
