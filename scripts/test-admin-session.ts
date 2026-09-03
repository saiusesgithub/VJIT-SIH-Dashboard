import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminSessionToken, verifyAdminSessionToken } from "../src/lib/admin-auth";
import { createJudgeSessionToken } from "../src/lib/judge-session";
import { createTeamSessionToken } from "../src/lib/team-session";
import { createSignedToken } from "../src/lib/signed-session";

test("admin authorization rejects judge, team, legacy, expired and tampered sessions", async () => {
  const original = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = "test-only-secret-not-used-for-real-sessions-12345";
  try {
    const admin = await createAdminSessionToken();
    assert.equal(await verifyAdminSessionToken(admin), true);
    assert.equal(await verifyAdminSessionToken(await createJudgeSessionToken({ assignmentId: "assignment", judgeId: "judge", venueId: "venue" })), false);
    assert.equal(await verifyAdminSessionToken(await createTeamSessionToken("team")), false);
    assert.equal(await verifyAdminSessionToken(await createSignedToken({ expiresAt: Date.now() + 10000, nonce: "old" }, process.env.ADMIN_SESSION_SECRET)), false);
    assert.equal(await verifyAdminSessionToken(await createSignedToken({ scope: "admin", expiresAt: Date.now() - 1, nonce: "expired" }, process.env.ADMIN_SESSION_SECRET)), false);
    assert.equal(await verifyAdminSessionToken(`${admin}tampered`), false);
    assert.equal(await verifyAdminSessionToken(), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = original;
  }
});
