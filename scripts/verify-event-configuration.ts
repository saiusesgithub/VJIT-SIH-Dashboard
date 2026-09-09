import "dotenv/config";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { officialPlannedTeamCount, officialVenues } from "../src/data/seed/event-configuration";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);

const [venueRows, judgeRows, coordinatorRows, rubricRows, reviewRows] = await Promise.all([
  sql.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM("plannedTeamCount"), 0)::int AS planned FROM "Venue" WHERE "hackathonId" = 'vjit-sih-2026'`),
  sql.query(`SELECT COUNT(*)::int AS count FROM "VenueJudge" vj JOIN "Venue" v ON v.id = vj."venueId" WHERE v."hackathonId" = 'vjit-sih-2026'`),
  sql.query(`SELECT COUNT(*)::int AS count FROM "FacultyCoordinator" fc JOIN "Venue" v ON v.id = fc."venueId" WHERE v."hackathonId" = 'vjit-sih-2026'`),
  sql.query(`SELECT rr."roundNumber", COUNT(r.id)::int AS criteria, SUM(r."maxMarks")::int AS maximum FROM "ReviewRound" rr JOIN "Rubric" r ON r."reviewRoundId" = rr.id WHERE rr."hackathonId" = 'vjit-sih-2026' GROUP BY rr."roundNumber" ORDER BY rr."roundNumber"`),
  sql.query(`SELECT rr."roundNumber", COUNT(r.id)::int AS completed FROM "ReviewRound" rr LEFT JOIN "Review" r ON r."reviewRoundId" = rr.id AND r.status = 'COMPLETED' WHERE rr."hackathonId" = 'vjit-sih-2026' GROUP BY rr."roundNumber" ORDER BY rr."roundNumber"`),
]);

const expectedAssignments = officialVenues.reduce((total, venue) => total + venue.judges.length, 0);
const expectedCoordinators = officialVenues.reduce((total, venue) => total + venue.coordinators.length, 0);
assert.deepEqual(venueRows[0], { count: officialVenues.length, planned: officialPlannedTeamCount });
assert.equal(judgeRows[0].count, expectedAssignments);
assert.equal(coordinatorRows[0].count, expectedCoordinators);
assert.deepEqual(rubricRows.map((row) => [row.roundNumber, row.criteria, row.maximum]), [[1, 10, 100], [2, 10, 100], [3, 10, 100]]);
assert.deepEqual(reviewRows.map((row) => [row.roundNumber, row.completed]), [[1, 39], [2, 25], [3, 7]]);

console.info(JSON.stringify({
  venues: venueRows[0],
  judgeAssignments: judgeRows[0].count,
  facultyCoordinators: coordinatorRows[0].count,
  rubrics: rubricRows,
  completedReviews: reviewRows,
}));
