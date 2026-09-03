import "dotenv/config";
import assert from "node:assert/strict";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../src/lib/admin-auth";
import { createJudgeSessionToken, JUDGE_SESSION_COOKIE } from "../src/lib/judge-session";
import { createTeamSessionToken, TEAM_SESSION_COOKIE } from "../src/lib/team-session";

// Read-only integration check against a local server using the same .env.
const baseUrl = "http://localhost:3100";

async function main() {
  const judge = await createJudgeSessionToken({ assignmentId: "test", judgeId: "test", venueId: "test" });
  const team = await createTeamSessionToken("test");
  for (const cookie of ["", `${JUDGE_SESSION_COOKIE}=${judge}`, `${TEAM_SESSION_COOKIE}=${team}`, `${ADMIN_SESSION_COOKIE}=${judge}`, `${ADMIN_SESSION_COOKIE}=${team}`]) {
    for (const rsc of [false, true]) {
      const response = await fetch(`${baseUrl}/admin/leaderboard`, { redirect: "manual", headers: { Cookie: cookie, ...(rsc ? { RSC: "1" } : {}) } });
      assert.equal(response.status, 307, "Non-faculty sessions must be redirected");
      assert.equal(new URL(response.headers.get("location")!, baseUrl).pathname, "/admin/login");
      assert.ok(!(await response.text()).includes("Team standings"));
    }
  }
  const cookie = `${ADMIN_SESSION_COOKIE}=${await createAdminSessionToken()}`;
  const response = await fetch(`${baseUrl}/admin/leaderboard`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const html = await response.text();
  assert.ok(html.includes("Team standings"), "Authorized response must render standings");
  assert.ok(html.includes("Overall rank") && html.includes("Venue rank") && html.includes("PS rank"));
  const venue = html.match(/name="venue"[\s\S]*?<option value="([^"]+)"/);
  if (venue) {
    const filtered = await fetch(`${baseUrl}/admin/leaderboard?venue=${encodeURIComponent(venue[1])}`, { headers: { Cookie: cookie } });
    assert.equal(filtered.status, 200);
    assert.ok((await filtered.text()).includes("Team standings"));
  }
  console.info("PASS: faculty rendering, venue filter, no-store headers, and 10 HTML/RSC cross-role denial checks. No database writes performed.");
}

main().catch(() => { console.error("Leaderboard route verification failed. Check the local server on port 3100, matching .env, and database availability."); process.exitCode = 1; });
