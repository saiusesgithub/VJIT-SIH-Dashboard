import assert from "node:assert/strict";
import { test } from "node:test";
import { canJudgeEditCompletedReview, canJudgeWriteReview } from "../src/lib/judge-review-authorization";

test("an unclaimed review can be started by the signed-in judge", () => {
  assert.equal(canJudgeWriteReview(null, "judge-1"), true);
  assert.equal(canJudgeWriteReview(undefined, "judge-1"), true);
});

test("only the review owner can edit submitted scores and feedback", () => {
  assert.equal(canJudgeEditCompletedReview("judge-1", "judge-1"), true);
  assert.equal(canJudgeEditCompletedReview("judge-1", "judge-2"), false);
  assert.equal(canJudgeEditCompletedReview(null, "judge-1"), false);
});
