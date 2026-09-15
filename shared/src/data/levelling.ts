import type { Rarity, ResourceType, SlotType } from "../types.js";

/**
 * TODO_GAME_DESIGN — what it costs to raise a Pokémon.
 *
 * Levelling is bought, not earned in battle. That is the join between the two
 * halves of the game: the Refuge produces berries, fish, wood and ore, and the
 * only thing worth doing with them besides selling is making a Pokémon strong
 * enough for the next expedition.
 *
 * Which resource a species eats comes from its **job** — a berry farmer levels
 * on berries. A Pokémon with no job has no pen to be fed from, so it levels on
 * coins instead, which is exactly the pressure that makes the market matter to
 * a player who only wants to fight.
 */

export const MAX_LEVEL = 100;

/** Level a freshly hatched Pokémon starts at. */
export const START_LEVEL = 5;

export const LEVEL_RESOURCE: Record<SlotType, ResourceType> = {
  BERRY_FARM: "berry",
  FISHING_DOCK: "fish",
  WOODCUTTING: "wood",
  MINING: "ore",
};

/** What a jobless species (a pure fighter) levels on. */
export const JOBLESS_LEVEL_RESOURCE: ResourceType = "coin";

/**
 * Cost of the level that takes you from `level` to `level + 1`.
 *
 * Quadratic-ish rather than exponential: exponential walls a player out at
 * level 40 and makes the last sixty levels decoration. This one keeps every
 * level buyable while making the top of the ladder a genuine project.
 */
export const LEVEL_COST = {
  base: 12,
  /** Multiplies with the level, squared — the main slope. */
  growth: 0.9,
  /** Rarity tax: a legendary costs more per level than a commun. */
  rarityFactor: { common: 1, rare: 1.35, epic: 1.8, legendary: 2.6 } satisfies Record<Rarity, number>,
} as const;
