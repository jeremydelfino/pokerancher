import { GACHA_EGG_COST, POKEMON_SPECIES, rollGachaSpecies, starTierForCount } from "@pokerancher/shared";
import { prisma } from "../db.js";

export async function rollEgg(userId: string) {
  const currency = await prisma.inventoryItem.findUnique({
    where: { userId_resource: { userId, resource: GACHA_EGG_COST.resource } },
  });

  if (!currency || currency.quantity < GACHA_EGG_COST.amount) {
    throw new Error(
      `Not enough ${GACHA_EGG_COST.resource} (need ${GACHA_EGG_COST.amount}, have ${currency?.quantity ?? 0})`
    );
  }

  const species = rollGachaSpecies(POKEMON_SPECIES);

  const [, unit] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { userId_resource: { userId, resource: GACHA_EGG_COST.resource } },
      data: { quantity: { decrement: GACHA_EGG_COST.amount } },
    }),
    prisma.pokemonUnit.upsert({
      where: { userId_speciesId: { userId, speciesId: species.id } },
      update: { quantity: { increment: 1 } },
      create: { userId, speciesId: species.id, quantity: 1 },
    }),
  ]);

  return {
    species,
    quantity: unit.quantity,
    isNew: unit.quantity === 1,
    starTier: starTierForCount(unit.quantity),
  };
}
