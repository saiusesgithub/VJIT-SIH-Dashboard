CREATE TYPE "VenueJudgeRole" AS ENUM ('EXTERNAL', 'INTERNAL');

ALTER TABLE "Venue"
ADD COLUMN "theme" TEXT,
ADD COLUMN "teamCodeRange" TEXT,
ADD COLUMN "plannedTeamCount" INTEGER;

ALTER TABLE "VenueJudge"
ADD COLUMN "role" "VenueJudgeRole" NOT NULL DEFAULT 'INTERNAL';

CREATE TABLE "FacultyCoordinator" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacultyCoordinator_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FacultyCoordinator_venueId_idx" ON "FacultyCoordinator"("venueId");

ALTER TABLE "FacultyCoordinator"
ADD CONSTRAINT "FacultyCoordinator_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
