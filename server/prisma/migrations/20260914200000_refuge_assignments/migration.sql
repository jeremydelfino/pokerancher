-- A pen can now hold several Pokemon, so the single column becomes a table.

-- CreateTable
CREATE TABLE "RefugeAssignment" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "pokemonUnitId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RefugeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefugeAssignment_pokemonUnitId_key" ON "RefugeAssignment"("pokemonUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeAssignment_slotId_seat_key" ON "RefugeAssignment"("slotId", "seat");

-- AddForeignKey
ALTER TABLE "RefugeAssignment" ADD CONSTRAINT "RefugeAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "RefugeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeAssignment" ADD CONSTRAINT "RefugeAssignment_pokemonUnitId_fkey" FOREIGN KEY ("pokemonUnitId") REFERENCES "PokemonUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every existing worker over as the pen's first seat, so nobody loses a
-- Pokemon they had assigned.
INSERT INTO "RefugeAssignment" ("id", "slotId", "pokemonUnitId", "seat")
SELECT gen_random_uuid()::text, "id", "pokemonUnitId", 0
FROM "RefugeSlot"
WHERE "pokemonUnitId" IS NOT NULL;

-- DropColumn
ALTER TABLE "RefugeSlot" DROP COLUMN "pokemonUnitId";
