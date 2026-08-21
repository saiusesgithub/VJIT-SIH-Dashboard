ALTER TABLE "VenueJudge" ADD COLUMN "pinLookup" TEXT;

CREATE UNIQUE INDEX "VenueJudge_pinLookup_key" ON "VenueJudge"("pinLookup");
