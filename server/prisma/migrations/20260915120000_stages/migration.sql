-- CreateTable
CREATE TABLE "StageClear" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "clearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bestDepth" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StageClear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StageClear_userId_stageId_key" ON "StageClear"("userId", "stageId");

-- AddForeignKey
ALTER TABLE "StageClear" ADD CONSTRAINT "StageClear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
