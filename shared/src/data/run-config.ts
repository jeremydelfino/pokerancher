import type { RunNodeType } from "../run/types.js";

/**
 * TODO_GAME_DESIGN — shape of a run.
 *
 * Everything the map generator and the end-of-run rules need. No combat maths
 * here; those live in enemies.ts and combat.ts.
 */
export const RUN_CONFIG = {
  /** How many Pokémon the player may take. At least one, at most this. */
  teamSize: 6,

  /** Default rows between the entry and the boss. Stages override it. */
  rows: 8 as number,

  /** Each row gets between these many nodes, inclusive. */
  minWidth: 2,
  maxWidth: 3,

  /**
   * Node weights by progress through the run (0 = entry, 1 = just before the
   * boss). The generator interpolates between the two tables, which is what
   * makes early rows gentle and late rows mean.
   */
  earlyWeights: {
    combat: 60,
    event: 22,
    reward: 10,
    rest: 8,
    shop: 5,
    elite: 0,
    boss: 0,
  } satisfies Record<RunNodeType, number>,

  lateWeights: {
    combat: 42,
    event: 12,
    reward: 8,
    rest: 10,
    shop: 5,
    elite: 26,
    boss: 0,
  } satisfies Record<RunNodeType, number>,

  /** After clearing one of these, the player is asked to bank or push on. */
  secureAfter: ["elite", "rest"] as RunNodeType[],

  /** Fraction of carried loot kept when banking. 1 = bank everything. */
  secureKeepRatio: 0.75,

  /** Fraction of carried (unbanked) loot kept after a defeat. */
  defeatKeepRatio: 0,

  /** Levels your team starts above the stage's wild Pokémon. */
  playerLevelEdge: 2,

  /** Extra levels per merge star, so duplicates keep mattering. */
  starLevelBonus: 2,

  /** How many levels each row past the first adds to what lives on it. */
  depthLevels: 1,

  /** Extra levels and stat scale an elite encounter gets over a plain one. */
  eliteLevelBonus: 3,
  eliteScale: 1.1,

  /** Fraction of max hit points a camp restores. */
  restHealRatio: 0.3,

  /** How many options a post-combat reward screen shows. */
  rewardOptions: 3,
} as const;
