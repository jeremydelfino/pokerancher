import { VALLEY_CONFIG } from "../data/valley-config.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import { makeRng, pickWeighted, subSeed } from "../rng.js";
import type { BiomeDefinition, EncounterRule, TimeOfDay, WildEncounter } from "./types.js";

/**
 * Who you meet, how strong they are, and how often.
 *
 * All seeded off (run seed, step), never `Math.random()`: the server resolves
 * every encounter itself, and a client that replays a step gets the same
 * Pokémon rather than a reroll until something rare shows up.
 */

/* --- The clock ------------------------------------------------------------ */

/**
 * Time passes as you walk, not as you sit.
 *
 * A player who steps away from the keyboard should find the same afternoon they
 * left. It also means "wait for night" is a thing you do by walking, which is
 * the behaviour the game wants to reward anyway.
 */
export function timeOfDay(steps: number): TimeOfDay {
  const { stepsPerCycle, phases } = VALLEY_CONFIG.dayNight;
  const t = (steps % stepsPerCycle) / stepsPerCycle;

  let acc = 0;
  for (const { phase, length } of phases) {
    acc += length;
    if (t < acc) return phase as TimeOfDay;
  }
  return phases[phases.length - 1].phase as TimeOfDay;
}

/** 0..1 through the current cycle — the renderer tints the world with this. */
export function dayProgress(steps: number): number {
  return (steps % VALLEY_CONFIG.dayNight.stepsPerCycle) / VALLEY_CONFIG.dayNight.stepsPerCycle;
}

/* --- Difficulty ----------------------------------------------------------- */

/**
 * The level band at a given distance.
 *
 * A band rather than a single number, so 3 000 m is *varied* — you meet
 * something you can handle and then something you cannot, which is what makes
 * the decision to push on interesting. A flat multiplier would just make
 * everything uniformly harder.
 */
export function levelBandAt(metres: number, biome: BiomeDefinition): { min: number; max: number } {
  const { baseLevel, levelsPerThousandMetres, spread, maxLevel } = VALLEY_CONFIG.difficulty;
  const centre = (baseLevel + (metres / 1000) * levelsPerThousandMetres) * biome.difficulty;

  return {
    min: Math.max(1, Math.round(centre - spread)),
    max: Math.min(maxLevel, Math.max(2, Math.round(centre + spread))),
  };
}

/** Which rules can fire here, now, at this distance. */
export function eligibleEncounters(
  biome: BiomeDefinition,
  metres: number,
  time: TimeOfDay
): EncounterRule[] {
  const band = levelBandAt(metres, biome);

  return biome.encounters.filter((rule) => {
    if (rule.time && !rule.time.includes(time)) return false;
    if (rule.minDistance && metres < rule.minDistance) return false;
    // The band gate is what quietly swaps Chenipan for Papilusion as you walk:
    // a species drops out once you have outgrown it.
    return band.max >= rule.minLevel && band.min <= rule.maxLevel;
  });
}

/**
 * Does something jump out on this step?
 *
 * Two gates, because pacing is the whole difference between an exploration game
 * and a slot machine: a cooldown after every battle, and a roll that is only
 * generous while you are standing in cover.
 */
export function shouldEncounter(
  seed: number,
  steps: number,
  stepsSinceBattle: number,
  inCover: boolean
): boolean {
  const { cooldownSteps, chancePerStep, chanceOpenGround, graceSteps } = VALLEY_CONFIG.encounter;
  if (steps < graceSteps) return false;
  if (stepsSinceBattle < cooldownSteps) return false;

  const rng = makeRng(subSeed(seed, 0xe1c0, steps));
  return rng() < (inCover ? chancePerStep : chanceOpenGround);
}

/** Rolls the actual Pokémon. Returns null when the biome has nothing eligible. */
export function rollEncounter(
  seed: number,
  steps: number,
  biome: BiomeDefinition,
  metres: number,
  time: TimeOfDay
): WildEncounter | null {
  const pool = eligibleEncounters(biome, metres, time);
  if (pool.length === 0) return null;

  const rng = makeRng(subSeed(seed, 0x111d, steps));
  const rule = pickWeighted(pool, (r) => r.weight, rng);

  const band = levelBandAt(metres, biome);
  // Clamp the band into what this species is willing to be, so a level-40 band
  // never produces a level-40 Chenipan.
  const min = Math.max(band.min, rule.minLevel);
  const max = Math.max(min, Math.min(band.max, rule.maxLevel));
  let level = min + Math.floor(rng() * (max - min + 1));

  const alpha = rng() < alphaChance(metres);
  if (alpha) level = Math.min(VALLEY_CONFIG.difficulty.maxLevel, level + VALLEY_CONFIG.alpha.levelBonus);

  return {
    speciesId: rule.speciesId,
    level,
    shiny: rng() < VALLEY_CONFIG.shinyChance,
    alpha,
    attempts: 0,
  };
}

/** Rarer than anything else out there, and a little likelier the further you go. */
export function alphaChance(metres: number): number {
  const { baseChance, perThousandMetres, maxChance } = VALLEY_CONFIG.alpha;
  return Math.min(maxChance, baseChance + (metres / 1000) * perThousandMetres);
}

/** For the Pokédex screen: everything this biome can ever produce. */
export function biomeRoster(biome: BiomeDefinition): string[] {
  return [...new Set(biome.encounters.map((rule) => rule.speciesId))].filter((id) => POKEMON_BY_ID[id]);
}
