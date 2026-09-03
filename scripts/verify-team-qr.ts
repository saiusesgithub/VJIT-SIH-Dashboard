import "dotenv/config";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../src/lib/admin-auth";
import { createJudgeSessionToken, JUDGE_SESSION_COOKIE } from "../src/lib/judge-session";
import { createTeamSessionToken, TEAM_SESSION_COOKIE } from "../src/lib/team-session";
import { getJudgeTeamPath, getJudgeTeamUrl, getQrOrigin } from "../src/lib/team-qr";

// Read-only: run against a local production server with the same environment.
const baseUrl = "http://localhost:3100";
let stage = "database fixtures";

async function main() {
  const configured = getQrOrigin(process.env.APP_URL);
  assert.ok(configured && process.env.DATABASE_URL, "Set APP_URL and DATABASE_URL first");
  const sql = neon(process.env.DATABASE_URL);
  const teams = await sql.query(`SELECT t.id, t."venueId", t."teamCode"
    FROM "Team" t WHERE t."hackathonId" = (
      SELECT id FROM "Hackathon" ORDER BY (status = 'LIVE') DESC, "startDate" DESC LIMIT 1
    ) ORDER BY t."teamCode"`);
  assert.ok(teams.length > 1, "Seed teams in at least two venues before verification");
  const assignments = await sql.query(`SELECT id, "judgeId", "venueId" FROM "VenueJudge" WHERE "pinHash" IS NOT NULL`);
  const assignment = assignments.find((item) => teams.some((team) => team.venueId === item.venueId));
  assert.ok(assignment, "An active judge assignment is required");
  const ownTeam = teams.find((team) => team.venueId === assignment.venueId)!;
  const otherTeam = teams.find((team) => team.venueId !== assignment.venueId)!;
  assert.ok(otherTeam, "A second venue is required");
  const snapshot = () => sql.query('SELECT id, status, "startedAt", "submittedAt", "updatedAt" FROM "Review" ORDER BY id');
  const before = await snapshot();
  stage = "faculty access checks";
  const adminCookie = `${ADMIN_SESSION_COOKIE}=${await createAdminSessionToken()}`;
  const judgeToken = await createJudgeSessionToken({ assignmentId: assignment.id, judgeId: assignment.judgeId, venueId: assignment.venueId });
  const judgeCookie = `${JUDGE_SESSION_COOKIE}=${judgeToken}`;
  const teamToken = await createTeamSessionToken(ownTeam.id);
  const get = (path: string, cookie = "", rsc = false) => fetch(`${baseUrl}${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(30_000), headers: { Cookie: cookie, ...(rsc ? { RSC: "1" } : {}) },
  });
  for (const cookie of ["", judgeCookie, `${TEAM_SESSION_COOKIE}=${teamToken}`, `${ADMIN_SESSION_COOKIE}=${judgeToken}`, `${ADMIN_SESSION_COOKIE}=${teamToken}`]) {
    for (const rsc of [false, true]) {
      const denied = await get("/admin/qr-cards", cookie, rsc);
      assert.equal(denied.status, 307, "QR printing must remain faculty-only");
      assert.equal(new URL(denied.headers.get("location")!, baseUrl).pathname, "/admin/login");
    }
  }
  const response = await get("/admin/qr-cards", adminCookie);
  stage = "QR decoding";
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const html = await response.text();
  const images = [...html.matchAll(/<img\b[^>]*data-team-qr-image[^>]*>/g)];
  assert.equal(images.length, teams.length, "Every selected team needs one QR");
  const decodedUrls: string[] = [];
  for (const image of images) {
    const encoded = image[0].match(/src="data:image\/png;base64,([^"]+)"/);
    assert.ok(encoded, "QR must be an embedded PNG");
    const png = PNG.sync.read(Buffer.from(encoded[1], "base64"));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    const teamCode = image[0].match(/alt="Scan to open ([^ ]+) in the judge workspace"/)?.[1];
    const team = teams.find((item) => item.teamCode === teamCode);
    assert.ok(team, "QR must have the matching team label");
    assert.equal(decoded?.data, getJudgeTeamUrl(configured.origin, team.id), "QR must contain only the correct team URL");
    decodedUrls.push(decoded!.data);
  }
  // Suspense can stream sheets out of order in raw HTML before browser placement.
  assert.deepEqual(decodedUrls.sort(), teams.map((team) => getJudgeTeamUrl(configured.origin, team.id)).sort());
  stage = "card filters";
  for (const [query, count] of [
    [`venue=${encodeURIComponent(assignment.venueId)}`, teams.filter((team) => team.venueId === assignment.venueId).length],
    [`team=${encodeURIComponent(ownTeam.id)}`, 1],
    ["team=missing-qr-team", 0],
  ] as const) {
    const filtered = await get(`/admin/qr-cards?${query}`, adminCookie);
    assert.equal(filtered.status, 200);
    assert.equal(((await filtered.text()).match(/<img\b[^>]*data-team-qr-image/g) ?? []).length, count);
  }
  const path = getJudgeTeamPath(ownTeam.id);
  stage = "judge login destination";
  const unauthenticated = await get(path);
  const login = new URL(unauthenticated.headers.get("location")!, baseUrl);
  assert.equal(unauthenticated.status, 307);
  assert.equal(login.pathname, "/judge/login");
  assert.equal(login.searchParams.get("returnTo"), path);
  const loginPage = await get(`${login.pathname}${login.search}`);
  assert.equal(loginPage.status, 200);
  assert.ok((await loginPage.text()).includes(`value="${path}"`), "Login form must retain the scanned destination");
  const allowed = await get(path, judgeCookie);
  stage = "judge venue authorization";
  assert.equal(allowed.status, 200);
  assert.ok((await allowed.text()).includes(ownTeam.teamCode));
  for (const rsc of [false, true]) {
    const otherPath = getJudgeTeamPath(otherTeam.id);
    let denied = await get(otherPath, judgeCookie, rsc);
    // Next 16 canonicalizes RSC requests with its own _rsc query marker.
    if (rsc && denied.status === 307) {
      const target = new URL(denied.headers.get("location")!, baseUrl);
      assert.equal(target.origin, baseUrl);
      assert.equal(target.pathname, otherPath);
      assert.ok(target.searchParams.has("_rsc"));
      denied = await get(`${target.pathname}${target.search}`, judgeCookie, true);
    }
    const body = await denied.text();
    // Next can stream a not-found response after headers were sent.
    assert.ok(denied.status === 404 || body.includes("NEXT_HTTP_ERROR_FALLBACK;404"), "Off-venue team must be not-found");
    assert.ok(!body.includes(otherTeam.teamCode), "Off-venue team information must not leak");
  }
  stage = "review immutability";
  assert.deepEqual(await snapshot(), before, "Scanning / GET requests must not mutate reviews");
  console.info(`PASS: ${images.length} decoded QR cards, filters, faculty-only HTML/RSC access, judge login destination, venue authorization, and unchanged review records. No database writes performed.`);
}

main().catch((error: unknown) => {
  if (error instanceof assert.AssertionError) console.error(error.message);
  console.error(`QR route verification failed during ${stage} (${error instanceof Error ? error.name : "unknown error"}). Check the local server on port 3100, matching APP_URL/session environment, database availability, and two venues with a judge assignment.`);
  process.exitCode = 1;
});
