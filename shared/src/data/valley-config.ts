/**
 * TODO_GAME_DESIGN — the knobs of PokeValley.
 *
 * Every number the world reads is here, and nothing reads a literal. The point
 * is that tuning the feel of an endless world — how far apart encounters are,
 * how fast it gets dangerous, how many Pokéballs a forest gives up — is editing
 * this file, not hunting through a generator.
 */

export const VALLEY_CONFIG = {
  /** Tiles per chunk, square. 32 is a comfortable screenful and a half. */
  chunkSize: 32,

  /** How many chunks around the player stay loaded. 3 → a 7×7 window.
   *  Widened from its literal: `as const` would otherwise freeze the type to
   *  `3`, and a default parameter reading it would refuse every other number. */
  loadRadius: 3 as number,

  /** Chunks kept in memory before the oldest are dropped. Bounds the cache. */
  cacheLimit: 160 as number,

  /** One tile is this many metres. Sets how quickly the distance counter moves. */
  metresPerTile: 4,

  /* --- Pacing ------------------------------------------------------------
     The world has to be walkable. A fight every five seconds is not an
     exploration game, so an encounter needs both a cooldown and a roll. */
  encounter: {
    /** Steps after a battle before another can start, whatever the roll says. */
    cooldownSteps: 12,
    /** Chance per step, standing in cover. */
    chancePerStep: 0.11,
    /** Standing anywhere else. Low, so the grass is where the Pokémon are. */
    chanceOpenGround: 0.015,
    /** Steps of grace at the very start of a run. */
    graceSteps: 8,
  },

  /** An alpha is rare enough to be an event, and scales in a little with distance. */
  alpha: {
    baseChance: 0.012,
    /** Added per 1000 m, capped. */
    perThousandMetres: 0.008,
    maxChance: 0.06,
    /** Levels added on top of the band. */
    levelBonus: 4,
    /** Stat scale, applied through makeBattler. */
    statScale: 1.28,
  },

  /** Shiny in the wild. Rarer than an egg — it is meant to stop you dead. */
  shinyChance: 1 / 600,

  /* --- Difficulty --------------------------------------------------------
     Wild level is a band that widens with distance rather than a single
     multiplier, so 3 000 m is *varied* and dangerous, not uniformly hard. */
  difficulty: {
    /** Level at the Ranch gate. */
    baseLevel: 3,
    /** Levels gained per 1000 m walked. */
    levelsPerThousandMetres: 5,
    /** How far above and below the band a roll can land. */
    spread: 2,
    /** Never past the collection's own ceiling. */
    maxLevel: 90,
  },

  /* --- Capture -----------------------------------------------------------
     Four factors, all visible to the player on the throw screen. */
  capture: {
    /** Floor and ceiling, so no throw is ever hopeless or certain. */
    minChance: 0.04,
    maxChance: 0.95,
    /** Weight of the target's remaining health. Most of the decision. */
    hpWeight: 0.55,
    /** Base odds against a full-health target of your own level. */
    base: 0.18,
    /** Per level the wild Pokémon is *below* your best. Capped by levelBonusMax. */
    levelBonusPerLevel: 0.02,
    levelBonusMax: 0.24,
    /** Per level it is *above* your best. Harsher than the bonus, on purpose. */
    levelPenaltyPerLevel: 0.035,
    /** Rarer species resist. Multiplies the whole chance. */
    rarityFactor: { common: 1, rare: 0.72, epic: 0.5, legendary: 0.26 },
    /** An alpha resists on top of its rarity. */
    alphaFactor: 0.55,
  },

  /** Starting kit. Enough to catch something, not enough to stop looking. */
  start: {
    pokeballs: 5,
    teamSize: 3,
  },

  /** A harvested Pokéball plant gives this many, inclusive. */
  pokeballsPerPlant: { min: 1, max: 3 },

  /** Resource node yield, before trait bonuses. */
  resourcesPerNode: { min: 4, max: 11 },

  /* --- The clock ---------------------------------------------------------
     Time passes as you walk, not as you sit. A run that is paused is not
     drifting towards night. */
  dayNight: {
    /** Steps for a full cycle. */
    stepsPerCycle: 900,
    /** Fractions of the cycle, in order. Must sum to 1. */
    phases: [
      { phase: "morning", length: 0.18 },
      { phase: "day", length: 0.42 },
      { phase: "evening", length: 0.14 },
      { phase: "night", length: 0.26 },
    ],
  },

  /** How often a structure shows up, per chunk. Rolled against the seed. */
  structures: {
    camp: 0.055,
    cave: 0.045,
    ruins: 0.03,
    chest: 0.22,
    /** The one that makes a seed worth sharing. */
    shrine: 0.004,
  },
} as const;

export const CHUNK_SIZE = VALLEY_CONFIG.chunkSize;
