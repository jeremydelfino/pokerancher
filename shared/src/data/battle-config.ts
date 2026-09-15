/**
 * TODO_GAME_DESIGN — the numbers behind a battle.
 *
 * Everything the damage formula and the stat line need, in one place. Nothing
 * in battle/ hardcodes a number; if a fight feels wrong, it is fixed here.
 */
export const BATTLE_CONFIG = {
  /** Stat line of a level-1, tier-1 fighter. */
  base: {
    hp: 42,
    attack: 14,
    defense: 12,
    speed: 12,
  },

  /** How much each level past the first adds, as a fraction of the base. */
  perLevel: 0.12,

  /** How much each tier past the first adds, as a fraction of the base. */
  tierStep: 0.28,

  /**
   * How far `role` tilts the stat line. An offensive species multiplies its
   * attack by this and divides its bulk by it; a passive one does the reverse.
   * At 1 the role stops meaning anything.
   */
  roleTilt: 1.18,

  /** Same-type attack bonus. */
  stab: 1.5,

  /** Damage is rolled inside this band, so two identical hits still differ. */
  rollMin: 0.85,
  rollMax: 1,

  /**
   * Damage floor. Without it a resisted hit against a wall rounds to zero and
   * the fight stalls forever — a battle must always be moving toward an end.
   */
  minDamage: 1,

  /** Multiplier applied to a fainted member's replacement on the turn it enters. */
  switchInProtection: 1,

  /** How many stat stages a single move may stack to, in each direction. */
  maxBuff: 2.25,
  minDebuff: 0.45,
} as const;
