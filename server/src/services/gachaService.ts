import {
  DEFAULT_EGG,
  EGG_BY_ID,
  EGG_TYPES,
  eggOdds,
  rollEggSpecies,
  starTierForCount,
} from "@pokerancher/shared";
import { prisma } from "../db.js";

/**
 * Hatching.
 *
 * The client names which egg it is buying — a choice — and the server prices it,
 * debits it and rolls it. The odds live in data/eggs.ts and are published on the
 * same payload the button reads, so what the page promises and what the server
 * does come from one place.
 */

export function eggCatalogue() {
  return EGG_TYPES.map((egg) => ({ ...egg, odds: eggOdds(egg) }));
}

export async function rollEgg(userId: string, eggId: string = DEFAULT_EGG) {
  const egg = EGG_BY_ID[eggId];
  if (!egg) throw new Error("Cet œuf n'existe pas");

  const wallet = await prisma.inventoryItem.findUnique({
    where: { userId_resource: { userId, resource: egg.cost.resource } },
  });

  if (!wallet || wallet.quantity < egg.cost.amount) {
    throw new Error(
      `Il te manque ${egg.cost.amount - (wallet?.quantity ?? 0)} ${egg.cost.resource} pour un ${egg.name}`
    );
  }

  const species = rollEggSpecies(egg);

  const [paid, unit] = await prisma.$transaction([
    // Conditional debit: two clicks racing each other must not buy two eggs for
    // the price of one.
    prisma.inventoryItem.updateMany({
      where: { userId, resource: egg.cost.resource, quantity: { gte: egg.cost.amount } },
      data: { quantity: { decrement: egg.cost.amount } },
    }),
    prisma.pokemonUnit.upsert({
      where: { userId_speciesId: { userId, speciesId: species.id } },
      update: { quantity: { increment: 1 } },
      create: { userId, speciesId: species.id, quantity: 1 },
    }),
  ]);

  if (paid.count === 0) throw new Error("Paiement refusé");

  return {
    egg: { id: egg.id, name: egg.name },
    species,
    quantity: unit.quantity,
    isNew: unit.quantity === 1,
    starTier: starTierForCount(unit.quantity),
    paid: egg.cost,
  };
}
