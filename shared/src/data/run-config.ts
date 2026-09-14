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

  /** Rows between the entry and the boss, boss excluded. */
  rows: 8,

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

  /** Base hit points and attack per team member, before star tier and traits. */
  baseHp: 40,
  baseAttack: 9,

  /** Star tier multiplies these, reusing the merge progression already in game-logic. */
  starStatWeight: 1,

  /** How much each row past the first hardens enemies. */
  depthScaling: 0.18,

  /** How many options a post-combat reward screen shows. */
  rewardOptions: 3,
} as const;
