import assert from "node:assert/strict";
import test from "node:test";
import { normalizeJudgeName, normalizeJudgePhone } from "../src/lib/judge-credentials";

test("normalizes judge phone numbers for password login", () => {
  assert.equal(normalizeJudgePhone("+91 91545-27454"), "9154527454");
  assert.equal(normalizeJudgePhone("9154527454"), "9154527454");
});

test("matches workbook and database judge names despite honorifics and punctuation", () => {
  assert.equal(normalizeJudgeName("Ms. Anubha Mathew"), normalizeJudgeName("Anubha Mathew"));
  assert.equal(normalizeJudgeName("Dr. Chandrashekhar Reddy"), normalizeJudgeName("Dr Chandrashekhar Reddy"));
});
