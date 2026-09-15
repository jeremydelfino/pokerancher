import { LEVEL_COST, LEVEL_RESOURCE, JOBLESS_LEVEL_RESOURCE, MAX_LEVEL, START_LEVEL } from "./data/levelling.js";
import { MOVES } from "./data/moves.js";
import { SPECIES_BATTLE, type LearnsetEntry } from "./data/species-battle.js";
import { evolutionTargets, POKEMON_BY_ID } from "./pokemon-data.js";
import type { PokemonSpecies, ResourceType } from "./types.js";

/**
 * Growing a Pokémon: levels, moves, evolution.
 *
 * All pure, all shared. The codex screen calls these to render what is possible
 * and the server calls the same ones to decide what actually happens — so the
 * button is never offering something the server will refuse.
 */

/* --- Levels --------------------------------------------------------------- */

export interface LevelCost {
  resource: ResourceType;
  amount: number;
}

/** Which resource this species is fed on. */
export function levelResource(species: PokemonSpecies): ResourceType {
  return species.trait ? LEVEL_RESOURCE[species.trait.slot] : JOBLESS_LEVEL_RESOURCE;
}

/** Cost of the single level from `level` to `level + 1`. Null at the cap. */
export function levelUpCost(speciesId: string, level: number): LevelCost | null {
  const species = POKEMON_BY_ID[speciesId];
  if (!species || level >= MAX_LEVEL) return null;

  const { base, growth, rarityFactor } = LEVEL_COST;
  const amount = Math.round((base + growth * level * level) * rarityFactor[species.rarity]);
  return { resource: levelResource(species), amount };
}

/** Cost of `steps` levels in one go, so the UI can offer +1 and +10 honestly. */
export function levelUpCostFor(speciesId: string, level: number, steps: number): LevelCost | null {
  const first = levelUpCost(speciesId, level);
  if (!first) return null;

  let amount = 0;
  let reached = level;
  for (let i = 0; i < steps; i++) {
    const step = levelUpCost(speciesId, reached);
    if (!step) break;
    amount += step.amount;
    reached += 1;
  }
  return reached === level ? null : { resource: first.resource, amount };
}

/** How many of those `steps` a given balance can actually pay for. */
export function affordableLevels(speciesId: string, level: number, balance: number, cap = 100): number {
  let spent = 0;
  let gained = 0;
  for (let i = 0; i < cap; i++) {
    const step = levelUpCost(speciesId, level + gained);
    if (!step || spent + step.amount > balance) break;
    spent += step.amount;
    gained += 1;
  }
  return gained;
}

export { MAX_LEVEL, START_LEVEL };

/* --- Moves ---------------------------------------------------------------- */

export interface KnownMove extends LearnsetEntry {
  /** True once the Pokémon is high enough level to use it. */
  learned: boolean;
}

/** The species' whole learnset, flagged by what this level has reached. */
export function learnsetOf(speciesId: string, level: number): KnownMove[] {
  const profile = SPECIES_BATTLE[speciesId];
  if (!profile) return [];

  // Sort *before* de-duplicating: a species that adds a move its type ladder
  // already teaches lists it twice, and the entry that must survive is the
  // earlier one. Filtering in source order kept whichever happened to be
  // written first, which quietly locked Lokhlass out of Laser Glace until 41
  // when it learns it at 28.
  const seen = new Set<string>();
  return profile.learnset
    .filter((entry) => MOVES[entry.move])
    .sort((a, b) => a.level - b.level || a.move.localeCompare(b.move))
    .filter((entry) => !seen.has(entry.move) && seen.add(entry.move))
    .map((entry) => ({ ...entry, learned: level >= entry.level }));
}

/** Just the ids it may carry right now. */
export function knownMoves(speciesId: string, level: number): string[] {
  return learnsetOf(speciesId, level)
    .filter((entry) => entry.learned)
    .map((entry) => entry.move);
}

/**
 * The four moves it walks into battle with.
 *
 * `chosen` wins where it is legal; anything illegal (a move it never learns, or
 * has not reached) is dropped rather than rejected, so a Pokémon that evolved
 * into a different learnset still comes out with a working moveset instead of
 * an error.
 *
 * The auto-fill only runs when *nothing* legal was chosen. A player who picked
 * three moves meant three: topping it back up to four would put a move they had
 * just removed straight back on the card.
 */
export function activeMoves(speciesId: string, level: number, chosen: readonly string[] = []): string[] {
  const known = knownMoves(speciesId, level);
  const picked = chosen.filter((move) => known.includes(move)).slice(0, 4);
  if (picked.length > 0) return picked;

  // Nothing chosen (or nothing legal survived an evolution): fall back to the
  // most recently learned, which is almost always what a player would pick.
  return [...known].reverse().slice(0, 4);
}

/** Moves unlocked by crossing from one level to another, for the level-up notice. */
export function movesLearnedBetween(speciesId: string, from: number, to: number): string[] {
  return learnsetOf(speciesId, to)
    .filter((entry) => entry.level > from && entry.level <= to)
    .map((entry) => entry.move);
}

/* --- Evolution ------------------------------------------------------------ */

export interface EvolutionOption {
  species: PokemonSpecies;
  /** Level required. Same for every target of a branching evolution. */
  atLevel: number;
  ready: boolean;
}

export function evolutionOptions(speciesId: string, level: number): EvolutionOption[] {
  const species = POKEMON_BY_ID[speciesId];
  const atLevel = species?.evolvesAtLevel ?? 0;
  return evolutionTargets(speciesId).map((target) => ({
    species: target,
    atLevel,
    ready: level >= atLevel,
  }));
}

export function canEvolveInto(speciesId: string, level: number, targetId: string): boolean {
  return evolutionOptions(speciesId, level).some((option) => option.ready && option.species.id === targetId);
}
