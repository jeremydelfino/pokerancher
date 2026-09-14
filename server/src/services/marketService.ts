import {
  EGG_COIN_COST,
  marketStalls,
  SELLABLE_RESOURCES,
  sellQuote,
  SLOTS,
  slotUpgradeLadder,
  slotUpgradeState,
  type ResourceType,
} from "@pokerancher/shared";
import { prisma } from "../db.js";

/**
 * The auction house.
 *
 * The client sends what it wants to sell and how much; it never sends a price
 * or a total. Every figure that lands in a row comes from sellQuote() run here,
 * against the quantity the database says the player owns — so a tampered
 * request fails the ownership check before it can mint a single coin.
 */

async function inventoryOf(userId: string): Promise<Record<string, number>> {
  const items = await prisma.inventoryItem.findMany({ where: { userId } });
  return Object.fromEntries(items.map((item) => [item.resource, item.quantity]));
}

export async function getMarketState(userId: string) {
  const inventory = await inventoryOf(userId);
  const slots = await prisma.refugeSlot.findMany({ where: { userId } });
  const levelByType = new Map(slots.map((slot) => [slot.slotType, slot.level]));
  const coins = inventory.coin ?? 0;

  return {
    coins,
    stalls: marketStalls(inventory),
    upgrades: SLOTS.map((def) => ({
      label: def.label,
      ladder: slotUpgradeLadder(def.type),
      ...slotUpgradeState(def.type, levelByType.get(def.type) ?? 0, coins),
    })),
    eggCoinCost: EGG_COIN_COST,
    inventory,
  };
}

/**
 * Moves `quantity` of one resource out and the coins it fetched in.
 *
 * The debit is conditional on the stock still being there: two sales racing
 * each other would both pass the check above, and without the `gte` guard the
 * second would mint coins out of a negative balance. Losing the race costs the
 * player a retry, not the economy its integrity.
 */
async function settle(userId: string, resource: ResourceType, quantity: number, total: number) {
  await prisma.$transaction(async (tx) => {
    const debited = await tx.inventoryItem.updateMany({
      where: { userId, resource, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (debited.count === 0) {
      throw new Error(`Stock de ${resource} insuffisant`);
    }
    await tx.inventoryItem.upsert({
      where: { userId_resource: { userId, resource: "coin" } },
      update: { quantity: { increment: total } },
      create: { userId, resource: "coin", quantity: total },
    });
  });
}

export async function sellResource(userId: string, resource: string, quantity: number) {
  const inventory = await inventoryOf(userId);
  const quote = sellQuote(resource, quantity, inventory[resource] ?? 0);

  await settle(userId, quote.resource, quote.quantity, quote.total);

  return { sold: [quote], earned: quote.total };
}

/**
 * Empties every stall at once. Each resource is settled separately rather than
 * summed into one write, so a stock that changed between the read and the write
 * fails only its own line.
 */
export async function sellEverything(userId: string) {
  const inventory = await inventoryOf(userId);
  const sold = [];

  for (const resource of SELLABLE_RESOURCES) {
    const owned = inventory[resource] ?? 0;
    if (owned <= 0) continue;
    const quote = sellQuote(resource, owned, owned);
    await settle(userId, quote.resource, quote.quantity, quote.total);
    sold.push(quote);
  }

  return { sold, earned: sold.reduce((sum, quote) => sum + quote.total, 0) };
}
