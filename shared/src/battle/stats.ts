import { BATTLE_CONFIG } from "../data/battle-config.js";
import { BOSS_BY_ID, SPECIES_BATTLE, WILD_BY_ID, type BattlerProfile, type WildSpecies } from "../data/battlers.js";
import { MOVES, STRUGGLE_MOVE } from "../data/moves.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import type { Battler, BattleMove } from "./types.js";

/**
 * Turning a species into a fighter.
 *
 * One formula for everyone — your Pokémon, a wild Rattata and a legendary boss
 * all come out of `makeBattler`. That is what stops the boss being a special
 * case the rest of the engine has to remember.
 */

export interface BattlerSource {
  id: string;
  name: string;
  dex: number;
  profile: BattlerProfile;
}

/** Looks a fighter up wherever it lives: roster, wild pool, or boss list. */
export function battlerSource(id: string): BattlerSource | undefined {
  const roster = POKEMON_BY_ID[id];
  const profile = SPECIES_BATTLE[id];
  if (roster && profile) return { id, name: roster.name, dex: roster.dex, profile };

  const wild: WildSpecies | undefined = WILD_BY_ID[id] ?? BOSS_BY_ID[id];
  if (wild) return { id, name: wild.name, dex: wild.dex, profile: wild };

  return undefined;
}

function movesOf(profile: BattlerProfile): BattleMove[] {
  const known = profile.moves.filter((id) => MOVES[id]);
  const pool = known.length > 0 ? known : [STRUGGLE_MOVE];
  return pool.slice(0, 4).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp }));
}

export interface MakeBattlerInput {
  key: string;
  id: string;
  level: number;
  /** Extra flat multiplier — the star tier for your team, the stage for a foe. */
  scale?: number;
}

export function makeBattler({ key, id, level, scale = 1 }: MakeBattlerInput): Battler {
  const source = battlerSource(id);
  if (!source) throw new Error(`Unknown battler: ${id}`);

  const { base, perLevel, tierStep } = BATTLE_CONFIG;
  const tier = 1 + (source.profile.tier - 1) * tierStep;
  // Level and tier both multiply, so a level-30 commun and a level-12 légendaire
  // can land in the same range — which is the point of a collection game.
  const growth = (1 + (level - 1) * perLevel) * tier * scale;

  const maxHp = Math.max(1, Math.round(base.hp * growth));

  return {
    key,
    speciesId: id,
    name: source.name,
    dex: source.dex,
    types: source.profile.types,
    level,
    hp: maxHp,
    maxHp,
    attack: Math.max(1, Math.round(base.attack * growth)),
    defense: Math.max(1, Math.round(base.defense * growth)),
    speed: Math.max(1, Math.round(base.speed * growth)),
    moves: movesOf(source.profile),
    attackStage: 1,
    defenseStage: 1,
  };
}

/** Effective attack after any stat moves landed this battle. */
export function effectiveAttack(battler: Battler): number {
  return Math.max(1, battler.attack * battler.attackStage);
}

export function effectiveDefense(battler: Battler): number {
  return Math.max(1, battler.defense * battler.defenseStage);
}
