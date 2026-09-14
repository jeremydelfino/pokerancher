import {
  EGG_COIN_COST,
  GACHA_EGG_COST,
  POKEMON_SPECIES,
  rollGachaSpecies,
  starTierForCount,
  type ResourceType,
} from "@pokerancher/shared";
import { prisma } from "../db.js";

/**
 * Two ways to pay for the same egg: shards, which only expeditions drop, and
 * coins, which only the auction house pays out. Both are priced in data; this
 * file just picks which row to debit.
 */
export type EggCurrency = "egg_shard" | "coin";

export const EGG_PRICES: Record<EggCurrency, { resource: ResourceType; amount: number }> = {
  egg_shard: GACHA_EGG_COST,
  coin: { resource: "coin", amount: EGG_COIN_COST },
};

export function isEggCurrency(value: unknown): value is EggCurrency {
  return value === "egg_shard" || value === "coin";
}

export async function rollEgg(userId: string, currency: EggCurrency = "egg_shard") {
  const price = EGG_PRICES[currency];

  const wallet = await prisma.inventoryItem.findUnique({
    where: { userId_resource: { userId, resource: price.resource } },
  });

  if (!wallet || wallet.quantity < price.amount) {
    throw new Error(
      `Not enough ${price.resource} (need ${price.amount}, have ${wallet?.quantity ?? 0})`
    );
  }

  const species = rollGachaSpecies(POKEMON_SPECIES);

  const [, unit] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { userId_resource: { userId, resource: price.resource } },
      data: { quantity: { decrement: price.amount } },
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
    paid: price,
  };
}
