import assert from "node:assert/strict";
import { test } from "node:test";
import { canJudgeEditCompletedReview, canJudgeWriteReview, type JudgeReviewAuthContext } from "../src/lib/judge-review-authorization";

test("canJudgeWriteReview: an unclaimed review can be started by any judge", () => {
  const externalContext: JudgeReviewAuthContext = {
    reviewJudgeId: null,
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-external-1",
    sessionJudgeRole: "external",
  };
  const internalContext: JudgeReviewAuthContext = {
    reviewJudgeId: null,
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-internal-1",
    sessionJudgeRole: "internal",
  };

  assert.equal(canJudgeWriteReview(externalContext), true);
  assert.equal(canJudgeWriteReview(internalContext), true);
});

test("canJudgeWriteReview: a judge can continue their own in-progress review", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-1",
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-1",
    sessionJudgeRole: "external",
  };

  assert.equal(canJudgeWriteReview(context), true);
});

test("canJudgeWriteReview: a judge cannot take over another judge's in-progress review", () => {
  const externalTakingExternal: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-external-1",
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-external-2",
    sessionJudgeRole: "external",
  };
  const internalTakingExternal: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-external-1",
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-internal-1",
    sessionJudgeRole: "internal",
  };

  assert.equal(canJudgeWriteReview(externalTakingExternal), false);
  assert.equal(canJudgeWriteReview(internalTakingExternal), false);
});

test("canJudgeEditCompletedReview: the judge who completed a review can edit it", () => {
  const externalContext: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-external-1",
    reviewCompletedByJudgeId: "judge-external-1",
    sessionJudgeId: "judge-external-1",
    sessionJudgeRole: "external",
    reviewCompletedByRole: "external",
  };
  const internalContext: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-internal-1",
    reviewCompletedByJudgeId: "judge-internal-1",
    sessionJudgeId: "judge-internal-1",
    sessionJudgeRole: "internal",
    reviewCompletedByRole: "internal",
  };

  assert.equal(canJudgeEditCompletedReview(externalContext), true);
  assert.equal(canJudgeEditCompletedReview(internalContext), true);
});

test("canJudgeEditCompletedReview: internal judges cannot edit reviews completed by external judges", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-external-1",
    reviewCompletedByJudgeId: "judge-external-1",
    sessionJudgeId: "judge-internal-1",
    sessionJudgeRole: "internal",
    reviewCompletedByRole: "external",
  };

  assert.equal(canJudgeEditCompletedReview(context), false);
});

test("canJudgeEditCompletedReview: external judges cannot edit other external judges' reviews", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-external-1",
    reviewCompletedByJudgeId: "judge-external-1",
    sessionJudgeId: "judge-external-2",
    sessionJudgeRole: "external",
    reviewCompletedByRole: "external",
  };

  assert.equal(canJudgeEditCompletedReview(context), false);
});

test("canJudgeEditCompletedReview: external judges cannot edit internal judges' reviews", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-internal-1",
    reviewCompletedByJudgeId: "judge-internal-1",
    sessionJudgeId: "judge-external-1",
    sessionJudgeRole: "external",
    reviewCompletedByRole: "internal",
  };

  assert.equal(canJudgeEditCompletedReview(context), false);
});

test("canJudgeEditCompletedReview: internal judges cannot edit other internal judges' reviews", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-internal-1",
    reviewCompletedByJudgeId: "judge-internal-1",
    sessionJudgeId: "judge-internal-2",
    sessionJudgeRole: "internal",
    reviewCompletedByRole: "internal",
  };

  assert.equal(canJudgeEditCompletedReview(context), false);
});

test("canJudgeEditCompletedReview: cannot edit a review that hasn't been completed", () => {
  const context: JudgeReviewAuthContext = {
    reviewJudgeId: "judge-1",
    reviewCompletedByJudgeId: null,
    sessionJudgeId: "judge-1",
    sessionJudgeRole: "external",
  };

  assert.equal(canJudgeEditCompletedReview(context), false);
});
