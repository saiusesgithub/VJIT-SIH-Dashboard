import "dotenv/config";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../src/lib/admin-auth";
import { createJudgeSessionToken, JUDGE_SESSION_COOKIE } from "../src/lib/judge-session";
import { createTeamSessionToken, TEAM_SESSION_COOKIE } from "../src/lib/team-session";

// Read-only integration check against a local server using the same .env.
const baseUrl = "http://localhost:3100";

async function main() {
  const judge = await createJudgeSessionToken({ assignmentId: "test", judgeId: "test", venueId: "test", role: "external" });
  const team = await createTeamSessionToken("test");
  for (const cookie of ["", `${JUDGE_SESSION_COOKIE}=${judge}`, `${TEAM_SESSION_COOKIE}=${team}`, `${ADMIN_SESSION_COOKIE}=${judge}`, `${ADMIN_SESSION_COOKIE}=${team}`]) {
    for (const path of ["/admin/leaderboard", "/admin/leaderboard/export?scope=ranked&limit=10"]) {
      for (const rsc of [false, true]) {
        const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { Cookie: cookie, ...(rsc ? { RSC: "1" } : {}) } });
        assert.equal(response.status, 307, "Non-faculty sessions must be redirected");
        assert.equal(new URL(response.headers.get("location")!, baseUrl).pathname, "/admin/login");
        assert.ok(!(await response.text()).includes("Team standings"));
      }
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
  const exported = await fetch(`${baseUrl}/admin/leaderboard/export?scope=ranked&limit=10`, { headers: { Cookie: cookie } });
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-type") ?? "", /spreadsheetml/);
  assert.match(exported.headers.get("content-disposition") ?? "", /attachment; filename="vjit-sih-ranked-top-10\.xlsx"/);
  assert.match(exported.headers.get("cache-control") ?? "", /no-store/);
  const bytes = new Uint8Array(await exported.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 2)], [0x50, 0x4b]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const sheet = workbook.getWorksheet("Selected teams");
  assert.ok(sheet && sheet.rowCount >= 6 && sheet.rowCount <= 15);
  assert.deepEqual((sheet.getRow(5).values as unknown[]).slice(1), ["Overall rank", "Team ID", "Team name", "Problem code", "Problem statement", "Venue", "Room", "Review progress", "Final decision"]);
  console.info("PASS: faculty rendering, venue filter, private/no-store Excel download, readable top-10 workbook, and 20 HTML/RSC cross-role denial checks. No database writes performed.");
}

main().catch((error: unknown) => {
  if (error instanceof assert.AssertionError) console.error(error.message);
  console.error("Leaderboard route verification failed. Check the local server on port 3100, matching .env, and database availability.");
  process.exitCode = 1;
});
