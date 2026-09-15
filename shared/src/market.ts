import {
  MARKET_BY_RESOURCE,
  MARKET_LISTINGS,
  SLOT_BASE_CAPACITY,
  SLOT_UPGRADES_REPLACE_PREVIOUS,
  SLOT_UPGRADE_TIERS,
  type MarketListing,
  type SlotUpgradeTier,
} from "./data/market.js";
import type { TraitEffect } from "./traits/types.js";
import type { ResourceType, SlotType } from "./types.js";
import { SELLABLE_RESOURCES } from "./types.js";

/**
 * The auction house, as pure functions.
 *
 * Same split as everywhere else in this package: the numbers live in
 * data/market.ts, the rules live here, and the server is the only thing allowed
 * to move a row. The client may call every function below to render a preview —
 * it just never gets to decide what the sale was worth.
 */

export const COIN: ResourceType = "coin";

export function isSellable(resource: string): resource is ResourceType {
  return SELLABLE_RESOURCES.includes(resource as ResourceType);
}

export function marketListing(resource: string): MarketListing | undefined {
  return isSellable(resource) ? MARKET_BY_RESOURCE[resource] : undefined;
}

export interface SellQuote {
  resource: ResourceType;
  quantity: number;
  unitPrice: number;
  /** Coins the seller receives. */
  total: number;
}

/**
 * What a sale is worth. Throws rather than returning zero on bad input: a sale
 * the player cannot make is a bug or a tampered request, and both deserve to be
 * loud. `owned` is passed in so the same check runs client-side for the preview
 * and server-side against the real row.
 */
export function sellQuote(resource: string, quantity: number, owned: number): SellQuote {
  const listing = marketListing(resource);
  if (!listing) throw new Error(`${resource} ne se vend pas à l'hôtel de vente`);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantité invalide");
  }
  if (quantity > owned) {
    throw new Error(`Tu n'as que ${owned} ${resource} en stock`);
  }
  return {
    resource: listing.resource,
    quantity,
    unitPrice: listing.unitPrice,
    total: listing.unitPrice * quantity,
  };
}

/** Every stall, with what the player currently holds. Drives the market page. */
export function marketStalls(inventory: Readonly<Record<string, number>>) {
  return MARKET_LISTINGS.map((listing) => {
    const owned = inventory[listing.resource] ?? 0;
    return { ...listing, owned, totalIfSoldAll: owned * listing.unitPrice };
  });
}

/* --- Pen upgrades --------------------------------------------------------- */

/** The ladder a given pen climbs. One shared ladder today; see the data file. */
export function slotUpgradeLadder(_slotType: SlotType): readonly SlotUpgradeTier[] {
  return SLOT_UPGRADE_TIERS;
}

export function maxSlotLevel(slotType: SlotType): number {
  return slotUpgradeLadder(slotType).length;
}

/**
 * How many Pokémon may work a pen at this level.
 *
 * Reads the ladder rather than doing arithmetic on the level, so a designer can
 * make level 2 jump straight to three workers without touching any code.
 */
export function slotCapacity(slotType: SlotType, level: number): number {
  const tier = slotUpgradeLadder(slotType).find((candidate) => candidate.level === level);
  return tier?.capacity ?? SLOT_BASE_CAPACITY;
}

/** The tier a pen would buy next, or null when it is already maxed. */
export function nextSlotUpgrade(slotType: SlotType, level: number): SlotUpgradeTier | null {
  return slotUpgradeLadder(slotType).find((tier) => tier.level === level + 1) ?? null;
}

/**
 * What a pen's current level contributes to the effect bag.
 *
 * Targets are stamped on here rather than written in the data, so a tier can
 * never end up buffing the wrong pen. With SLOT_UPGRADES_REPLACE_PREVIOUS only
 * the reached tier applies — see the note on that constant before changing it.
 */
export function slotUpgradeEffects(slotType: SlotType, level: number): TraitEffect[] {
  const ladder = slotUpgradeLadder(slotType);
  const reached = ladder.filter((tier) => tier.level <= level);
  const applied = SLOT_UPGRADES_REPLACE_PREVIOUS ? reached.slice(-1) : reached;

  return applied.flatMap((tier) =>
    tier.effects.map((effect) => ({
      type: effect.type,
      target: slotType,
      value: effect.value,
      mode: effect.mode,
    }))
  );
}

export interface SlotUpgradeState {
  slotType: SlotType;
  level: number;
  maxLevel: number;
  /** Workers allowed right now. */
  capacity: number;
  /** Workers the next tier would allow, or null when maxed. */
  nextCapacity: number | null;
  /** Label of the level currently owned, or null at level 0. */
  currentLabel: string | null;
  next: SlotUpgradeTier | null;
  /** Coins still missing for `next`, or null when maxed or already affordable. */
  missing: number | null;
  affordable: boolean;
}

export function slotUpgradeState(
  slotType: SlotType,
  level: number,
  coins: number
): SlotUpgradeState {
  const ladder = slotUpgradeLadder(slotType);
  const next = nextSlotUpgrade(slotType, level);
  const shortfall = next ? Math.max(0, next.cost - coins) : 0;

  return {
    slotType,
    level,
    maxLevel: ladder.length,
    capacity: slotCapacity(slotType, level),
    nextCapacity: next?.capacity ?? null,
    currentLabel: ladder.find((tier) => tier.level === level)?.label ?? null,
    next,
    missing: next && shortfall > 0 ? shortfall : null,
    affordable: next !== null && shortfall === 0,
  };
}

/**
 * Validates a purchase and returns the price. The caller still has to move the
 * rows — this only decides whether it may.
 */
export function slotUpgradeCost(slotType: SlotType, level: number, coins: number): number {
  const next = nextSlotUpgrade(slotType, level);
  if (!next) throw new Error("Cet enclos est déjà au niveau maximum");
  if (coins < next.cost) {
    throw new Error(`Il te manque ${next.cost - coins} pièces pour « ${next.label} »`);
  }
  return next.cost;
}
