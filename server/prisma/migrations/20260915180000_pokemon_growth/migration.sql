-- A collected Pokemon now grows: it has a level, a chosen moveset, and may be shiny.

-- AlterTable
ALTER TABLE "PokemonUnit" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "PokemonUnit" ADD COLUMN     "moves" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PokemonUnit" ADD COLUMN     "shiny" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PokemonUnit" ADD COLUMN     "shinyUnlocked" BOOLEAN NOT NULL DEFAULT false;
