-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonUnit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PokemonUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "pokemonUnitId" TEXT,
    "lastCollectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_resource_key" ON "InventoryItem"("userId", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonUnit_userId_speciesId_key" ON "PokemonUnit"("userId", "speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeSlot_pokemonUnitId_key" ON "RefugeSlot"("pokemonUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeSlot_userId_slotType_key" ON "RefugeSlot"("userId", "slotType");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonUnit" ADD CONSTRAINT "PokemonUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeSlot" ADD CONSTRAINT "RefugeSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeSlot" ADD CONSTRAINT "RefugeSlot_pokemonUnitId_fkey" FOREIGN KEY ("pokemonUnitId") REFERENCES "PokemonUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
