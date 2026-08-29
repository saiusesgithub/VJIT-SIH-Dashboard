CREATE TYPE "SubmissionType" AS ENUM ('GITHUB', 'DEMO', 'PRESENTATION', 'PROTOTYPE', 'VIDEO', 'DOCUMENTATION', 'OTHER');
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'TEAMS', 'JUDGES', 'VENUE');
CREATE TYPE "IssueCategory" AS ENUM ('REVIEW', 'VENUE', 'SCHEDULE', 'SUBMISSION', 'TECHNICAL', 'JUDGE', 'OTHER');
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

ALTER TABLE "Team" ADD COLUMN "accessCodeHash" TEXT, ADD COLUMN "accessCodeLookup" TEXT;
ALTER TABLE "ReviewRound" ADD COLUMN "feedbackVisibleToTeams" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TeamSubmission" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "type" "SubmissionType" NOT NULL,
  "url" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "hackathonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "audience" "AnnouncementAudience" NOT NULL,
  "venueId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamIssue" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "category" "IssueCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
  "adminResponse" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "TeamIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_accessCodeLookup_key" ON "Team"("accessCodeLookup");
CREATE UNIQUE INDEX "TeamSubmission_teamId_type_key" ON "TeamSubmission"("teamId", "type");
CREATE INDEX "TeamSubmission_teamId_idx" ON "TeamSubmission"("teamId");
CREATE INDEX "TeamSubmission_type_idx" ON "TeamSubmission"("type");
CREATE INDEX "Announcement_hackathonId_idx" ON "Announcement"("hackathonId");
CREATE INDEX "Announcement_audience_idx" ON "Announcement"("audience");
CREATE INDEX "Announcement_venueId_idx" ON "Announcement"("venueId");
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");
CREATE INDEX "Announcement_expiresAt_idx" ON "Announcement"("expiresAt");
CREATE INDEX "TeamIssue_teamId_idx" ON "TeamIssue"("teamId");
CREATE INDEX "TeamIssue_status_idx" ON "TeamIssue"("status");
CREATE INDEX "TeamIssue_category_idx" ON "TeamIssue"("category");
CREATE INDEX "TeamIssue_createdAt_idx" ON "TeamIssue"("createdAt");

ALTER TABLE "TeamSubmission" ADD CONSTRAINT "TeamSubmission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamIssue" ADD CONSTRAINT "TeamIssue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
