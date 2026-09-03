import assert from "node:assert/strict";
import { test } from "node:test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { createTeamQrImage, getJudgeTeamUrl, getQrOrigin } from "../src/lib/team-qr";
import { getCurrentJudgeRound } from "../src/lib/judge-navigation";
import { sanitizeJudgeRedirect } from "../src/lib/judge-session";

test("QR destinations use a configured canonical origin and stable internal team ID", () => {
  assert.equal(getJudgeTeamUrl("https://sih.example.edu/", "team-017"), "https://sih.example.edu/judge/teams/team-017");
  assert.equal(getQrOrigin(undefined), null);
  for (const origin of ["http://example.edu", "https://user:secret@example.edu", "https://example.edu/path", "https://example.edu?pin=1234", "https://example.edu/#token", "javascript:alert(1)", "not a url"]) assert.equal(getQrOrigin(origin), null);
  assert.equal(getQrOrigin("http://localhost:3100")?.local, true);
  for (const id of ["../admin", "", "T001?pin=1234", "foo/bar", "x".repeat(65)]) assert.throws(() => getJudgeTeamUrl("https://sih.example.edu", id));
});

test("generated QR decodes to just the team URL and has a white quiet zone", async () => {
  for (const teamId of ["team-017", "9ec4fc17-7a31-4020-83d6-e732f0af58d4"]) {
    const image = await createTeamQrImage("https://sih.example.edu", teamId);
    const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
    assert.equal(png.width, 512);
    assert.equal(png.height, 512);
    assert.deepEqual([...png.data.subarray(0, 4)], [255, 255, 255, 255]);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, `https://sih.example.edu/judge/teams/${teamId}`);
    assert.equal(new URL(decoded!.data).search, "");
  }
});

test("login return destination keeps the scanned team but rejects outside URLs", () => {
  const path = "/judge/teams/team-017";
  assert.equal(sanitizeJudgeRedirect(path), path);
  for (const destination of ["https://evil.example", "//evil.example", "/admin", "/judge/../../admin", "/judge/login"]) assert.equal(sanitizeJudgeRedirect(destination), "/judge");
});

test("current review prioritizes in-progress work over an earlier pending round", () => {
  const pending = { id: "r1", status: "pending" as const };
  const active = { id: "r2", status: "in_progress" as const };
  const done = { id: "r3", status: "completed" as const };
  assert.equal(getCurrentJudgeRound([pending, active, done]), active);
  assert.equal(getCurrentJudgeRound([done, pending]), pending);
  assert.equal(getCurrentJudgeRound([done]), undefined);
  assert.equal(getCurrentJudgeRound([]), undefined);
});
