CREATE TABLE "TeamFeedback" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "preGuidelines" INTEGER NOT NULL,
    "preCommunication" INTEGER NOT NULL,
    "supportCoordination" INTEGER NOT NULL,
    "supportMentors" INTEGER NOT NULL,
    "infraResources" INTEGER NOT NULL,
    "infraWorkspace" INTEGER NOT NULL,
    "evaluationClarity" INTEGER NOT NULL,
    "evaluationFairness" INTEGER NOT NULL,
    "keyLearnings" TEXT NOT NULL,
    "overallFeedback" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamFeedback_teamId_key" ON "TeamFeedback"("teamId");

ALTER TABLE "TeamFeedback" ADD CONSTRAINT "TeamFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
