import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to verify the Neon connection.");
}

const sql = neon(process.env.DATABASE_URL);

const [connection, teams, completedReviews] = await Promise.all([
  sql.query("SELECT 1 AS connected"),
  sql.query('SELECT COUNT(*)::int AS count FROM "Team"'),
  sql.query(`
    SELECT rr."roundNumber", COUNT(r.id)::int AS completed
    FROM "ReviewRound" rr
    LEFT JOIN "Review" r
      ON r."reviewRoundId" = rr.id
      AND r.status = 'COMPLETED'
    GROUP BY rr."roundNumber"
    ORDER BY rr."roundNumber"
  `),
]);

console.info(JSON.stringify({
  connection: connection[0],
  teams: teams[0],
  completedReviews,
}));
