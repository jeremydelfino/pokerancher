-- PokeValley: one row per run, plus a single high-water record per player.
-- The world itself is never stored — it regenerates from the seed.

CREATE TABLE "ValleyRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ValleyRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ValleyRun_userId_status_idx" ON "ValleyRun"("userId", "status");

ALTER TABLE "ValleyRun" ADD CONSTRAINT "ValleyRun_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ValleyRecord" (
    "userId" TEXT NOT NULL,
    "bestDistance" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "pokemonCaught" INTEGER NOT NULL DEFAULT 0,
    "alphasDefeated" INTEGER NOT NULL DEFAULT 0,
    "discovered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValleyRecord_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ValleyRecord" ADD CONSTRAINT "ValleyRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
