-- AlterTable
ALTER TABLE "Judge" ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "completedByJudgeId" TEXT;

-- CreateIndex
CREATE INDEX "Judge_phone_idx" ON "Judge"("phone");

-- CreateIndex
CREATE INDEX "Review_completedByJudgeId_idx" ON "Review"("completedByJudgeId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_completedByJudgeId_fkey" FOREIGN KEY ("completedByJudgeId") REFERENCES "Judge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
