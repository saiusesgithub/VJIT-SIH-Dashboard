CREATE TYPE "ShortlistingDecision" AS ENUM ('SHORTLISTED', 'HOLD', 'ELIMINATED');

ALTER TABLE "Team"
  ADD COLUMN "finalDecision" "ShortlistingDecision",
  ADD COLUMN "decisionUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "decisionRevision" INTEGER NOT NULL DEFAULT 0;
