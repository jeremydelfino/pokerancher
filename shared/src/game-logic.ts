import { SLOT_OCCUPANT_WEIGHTS } from "./data/market.js";
import { POKEMON_BY_ID, SLOTS_BY_TYPE } from "./pokemon-data.js";
import type { PokemonSpecies, Rarity, ResourceType, SlotType, StarTierInfo } from "./types.js";

/** Duplicate counts required to reach star 1, 2, 3, 4 respectively (2/2, 4/4, 8/8, 16/16). */
export const STAR_THRESHOLDS = [2, 4, 8, 16] as const;

/** Stat multiplier granted at each star tier (index 0 = 0 stars, not yet merged). */
export const STAR_MULTIPLIERS = [1, 1.1, 1.25, 1.5, 2] as const;

/** Server never credits more than this much offline time per claim, however long the client was away. */
export const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;

export const GACHA_EGG_COST: { resource: ResourceType; amount: number } = {
  resource: "egg_shard",
  amount: 50,
};

/** Granted once, to a brand new account, so a first gacha roll is possible before any Refuge income exists. */
export const STARTER_EGG_SHARDS = 150;

const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 30,
  epic: 9,
  legendary: 1,
};

/** How many total duplicates (including the first copy) a Pokemon owns, given its star tier progress. */
export function starTierForCount(duplicateCount: number): StarTierInfo {
  let stars = 0;
  for (const threshold of STAR_THRESHOLDS) {
    if (duplicateCount >= threshold) stars += 1;
  }
  const nextThreshold = STAR_THRESHOLDS.find((t) => t > duplicateCount) ?? null;
  return {
    stars,
    currentCount: duplicateCount,
    nextThreshold,
    statMultiplier: STAR_MULTIPLIERS[stars],
  };
}

export interface PenOccupant {
  speciesId: string;
  /** Duplicate count owned for this species, used for the star-tier stat bonus. */
  duplicateCount: number;
}

export interface PenProductionInput {
  slotType: SlotType;
  /** Everyone working the pen. An empty pen produces nothing. */
  occupants: readonly PenOccupant[];
  /** Milliseconds elapsed since the pen was last claimed. */
  elapsedMs: number;
  /**
   * Combined multiplier from active Refuge synergies and bought upgrades.
   * Defaults to 1 so every existing caller — and every saved game — keeps its
   * old numbers until the composition is actually passed in.
   */
  synergyMultiplier?: number;
}

export interface ProductionInput extends PenOccupant {
  slotType: SlotType;
  elapsedMs: number;
  synergyMultiplier?: number;
}

export interface ProductionResult {
  resource: ResourceType;
  amount: number;
  cappedElapsedMs: number;
}

/** What one worker contributes per hour, before the pen-wide multiplier. */
export function occupantRatePerHour(occupant: PenOccupant, slotType: SlotType): number {
  const species = POKEMON_BY_ID[occupant.speciesId];
  if (!species) throw new Error(`Unknown species: ${occupant.speciesId}`);
  // Role is a combat profile, not a permission: what decides whether a species
  // can work a pen is whether it has a job at all.
  if (!species.trait) {
    throw new Error(`${species.name} n'a pas de métier et ne peut pas travailler au Refuge`);
  }
  if (species.trait.slot !== slotType) {
    throw new Error(`${species.name} cannot be assigned to slot ${slotType}`);
  }

  const slot = SLOTS_BY_TYPE[slotType];
  const { statMultiplier } = starTierForCount(occupant.duplicateCount);
  return slot.baseRatePerHour * species.trait.multiplier * statMultiplier;
}

/**
 * Server-authoritative production calc for a whole pen.
 *
 * Elapsed time is always derived from a server-stored `lastCollectedAt`, never
 * from a client-supplied timestamp, and is capped at MAX_OFFLINE_MS so idling
 * longer never yields unbounded resources.
 *
 * Workers are summed, each weighted by its seat (SLOT_OCCUPANT_WEIGHTS), and
 * the pen-wide multiplier is applied once to the total rather than per worker —
 * otherwise a synergy would be counted four times in a full pen.
 */
export function computePenProduction(input: PenProductionInput): ProductionResult {
  const slot = SLOTS_BY_TYPE[input.slotType];
  const cappedElapsedMs = Math.min(Math.max(input.elapsedMs, 0), MAX_OFFLINE_MS);
  const hours = cappedElapsedMs / (60 * 60 * 1000);

  const ratePerHour = input.occupants.reduce((sum, occupant, seat) => {
    const weight = SLOT_OCCUPANT_WEIGHTS[seat] ?? SLOT_OCCUPANT_WEIGHTS[SLOT_OCCUPANT_WEIGHTS.length - 1] ?? 1;
    return sum + occupantRatePerHour(occupant, input.slotType) * weight;
  }, 0);

  const synergy = input.synergyMultiplier ?? 1;
  return {
    resource: slot.resource,
    amount: Math.floor(ratePerHour * synergy * hours),
    cappedElapsedMs,
  };
}

/** Single-worker convenience — the same maths with a one-element pen. */
export function computeProduction(input: ProductionInput): ProductionResult {
  return computePenProduction({
    slotType: input.slotType,
    occupants: [{ speciesId: input.speciesId, duplicateCount: input.duplicateCount }],
    elapsedMs: input.elapsedMs,
    synergyMultiplier: input.synergyMultiplier,
  });
}

function pickWeighted<T extends { rarity: Rarity }>(pool: readonly T[], rng: () => number): T {
  const total = pool.reduce((sum, item) => sum + RARITY_WEIGHTS[item.rarity], 0);
  let roll = rng() * total;
  for (const item of pool) {
    roll -= RARITY_WEIGHTS[item.rarity];
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/** Rolls one Pokemon species from the given pool, weighted by rarity. Defaults to Math.random. */
export function rollGachaSpecies(
  pool: readonly PokemonSpecies[],
  rng: () => number = Math.random
): PokemonSpecies {
  if (pool.length === 0) throw new Error("Gacha pool is empty");
  return pickWeighted(pool, rng);
}

