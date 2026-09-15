import { BATTLE_CONFIG } from "../data/battle-config.js";
import { BOSS_BY_ID, WILD_BY_ID, type WildSpecies } from "../data/battlers.js";
import { MOVES, STRUGGLE_MOVE } from "../data/moves.js";
import { SPECIES_BATTLE, type BattlerProfile } from "../data/species-battle.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import { activeMoves } from "../progression.js";
import type { PokemonRole } from "../types.js";
import type { Battler, BattleMove } from "./types.js";

/**
 * Turning a species into a fighter.
 *
 * One formula for everyone — your Pokémon, a wild Piafabec and a legendary boss
 * all come out of `makeBattler`. That is what stops the boss being a special
 * case the rest of the engine has to remember.
 */

export interface BattlerSource {
  id: string;
  name: string;
  dex: number;
  profile: BattlerProfile;
  role: PokemonRole;
}

/** Looks a fighter up wherever it lives: roster, wild pool, or boss list. */
export function battlerSource(id: string): BattlerSource | undefined {
  const roster = POKEMON_BY_ID[id];
  const profile = SPECIES_BATTLE[id];
  if (roster && profile) {
    return { id, name: roster.name, dex: roster.dex, profile, role: roster.role };
  }

  const wild: WildSpecies | undefined = WILD_BY_ID[id] ?? BOSS_BY_ID[id];
  // A wild Pokémon has no Refuge role to read, and "offensive" is the honest
  // default for something whose entire job is attacking you.
  if (wild) return { id, name: wild.name, dex: wild.dex, profile: wild, role: "offensive" };

  return undefined;
}

function toSlots(moveIds: readonly string[]): BattleMove[] {
  const pool = moveIds.filter((id) => MOVES[id]);
  const chosen = pool.length > 0 ? pool : [STRUGGLE_MOVE];
  return chosen.slice(0, 4).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp }));
}

export interface MakeBattlerInput {
  key: string;
  id: string;
  level: number;
  /** Extra flat multiplier — the stage's hardening for a foe. */
  scale?: number;
  /** The player's chosen four. Anything illegal is dropped, never rejected. */
  moves?: readonly string[];
  shiny?: boolean;
}

export function makeBattler({ key, id, level, scale = 1, moves, shiny = false }: MakeBattlerInput): Battler {
  const source = battlerSource(id);
  if (!source) throw new Error(`Unknown battler: ${id}`);

  const { base, perLevel, tierStep, roleTilt } = BATTLE_CONFIG;
  const tier = 1 + (source.profile.tier - 1) * tierStep;
  // Level and tier both multiply, so a level-30 commun and a level-12 légendaire
  // can land in the same range — which is the point of a collection game.
  const growth = (1 + (level - 1) * perLevel) * tier * scale;

  // `role` earns its keep here: an offensive species hits harder and folds
  // faster, a passive one is the reverse, at the same level and tier.
  const offensive = source.role === "offensive";
  const attackTilt = offensive ? roleTilt : 1 / roleTilt;
  const guardTilt = offensive ? 1 / roleTilt : roleTilt;

  const maxHp = Math.max(1, Math.round(base.hp * growth * guardTilt));

  return {
    key,
    speciesId: id,
    name: source.name,
    dex: source.dex,
    shiny,
    types: source.profile.types,
    level,
    hp: maxHp,
    maxHp,
    attack: Math.max(1, Math.round(base.attack * growth * attackTilt)),
    defense: Math.max(1, Math.round(base.defense * growth * guardTilt)),
    speed: Math.max(1, Math.round(base.speed * growth)),
    moves: toSlots(SPECIES_BATTLE[id] ? activeMoves(id, level, moves) : wildMoves(source.profile, level)),
    attackStage: 1,
    defenseStage: 1,
  };
}

/** A wild Pokémon carries the last four moves its level has reached. */
function wildMoves(profile: BattlerProfile, level: number): string[] {
  return profile.learnset
    .filter((entry) => entry.level <= level && MOVES[entry.move])
    .slice(-4)
    .map((entry) => entry.move);
}

/** Effective attack after any stat moves landed this battle. */
export function effectiveAttack(battler: Battler): number {
  return Math.max(1, battler.attack * battler.attackStage);
}

export function effectiveDefense(battler: Battler): number {
  return Math.max(1, battler.defense * battler.defenseStage);
}
