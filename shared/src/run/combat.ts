import { RUN_CONFIG } from "../data/run-config.js";
import { enemiesFor } from "../data/enemies.js";
import { starTierForCount } from "../game-logic.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import type { EffectBag } from "../traits/effects.js";
import { makeRng, pick } from "./rng.js";
import type { CombatResult, CombatRound, CombatSide, EnemyDefinition, RunNodeType, RunTeamMember } from "./types.js";

/**
 * Deterministic combat.
 *
 * Pure in, pure out: same team, same enemy, same seed gives the same rounds
 * every time. That is what lets the server replay a fight the client animated
 * and confirm the outcome instead of trusting it.
 *
 * Trait and relic bonuses are read from the effect bag at fight time rather
 * than baked into the members, so a relic picked up two nodes ago is already
 * counted without anyone having to rewrite the team.
 */

const MAX_ROUNDS = 80;

export function memberAttack(member: RunTeamMember, bag: EffectBag): number {
  return Math.max(1, Math.round(bag.apply(member.attack, "combat_attack")));
}

export function memberMaxHp(member: RunTeamMember, bag: EffectBag): number {
  return Math.max(1, Math.round(bag.apply(member.maxHp, "combat_hp")));
}

/** Base stats for a freshly recruited team member, before any run bonus. */
export function baseStatsFor(speciesId: string, duplicateCount: number): { hp: number; attack: number } {
  const species = POKEMON_BY_ID[speciesId];
  const tier = starTierForCount(duplicateCount);
  const scale = 1 + (tier.statMultiplier - 1) * RUN_CONFIG.starStatWeight;
  // Offensive species hit harder and take less; passives are the reverse.
  const offensive = species?.role === "offensive";
  return {
    hp: Math.round(RUN_CONFIG.baseHp * scale * (offensive ? 0.9 : 1.15)),
    attack: Math.round(RUN_CONFIG.baseAttack * scale * (offensive ? 1.35 : 0.85)),
  };
}

export function rollEnemy(nodeType: RunNodeType, depth: number, seed: number): CombatSide {
  const definition: EnemyDefinition = pick(enemiesFor(nodeType), makeRng(seed));
  const hardening = 1 + depth * RUN_CONFIG.depthScaling * (definition.scaling ?? 1);
  const hp = Math.round(definition.hp * hardening);
  return { name: definition.name, hp, maxHp: hp, attack: Math.round(definition.attack * hardening) };
}

/** ±10% swing so identical fights are not literally identical, but still seeded. */
function jitter(base: number, rng: () => number): number {
  return Math.max(1, Math.round(base * (0.9 + rng() * 0.2)));
}

export function resolveCombat(
  team: readonly RunTeamMember[],
  enemy: CombatSide,
  seed: number,
  bag: EffectBag
): CombatResult {
  const rng = makeRng(seed);
  const hp = team.map((member) => Math.min(member.hp, memberMaxHp(member, bag)));
  const attacks = team.map((member) => memberAttack(member, bag));
  const rounds: CombatRound[] = [];

  let enemyHp = enemy.hp;
  let round = 1;

  const teamHpTotal = () => hp.reduce((sum, value) => sum + Math.max(0, value), 0);

  while (enemyHp > 0 && teamHpTotal() > 0 && round <= MAX_ROUNDS) {
    const teamDamage = hp.reduce(
      (sum, value, index) => (value > 0 ? sum + jitter(attacks[index], rng) : sum),
      0
    );
    enemyHp = Math.max(0, enemyHp - teamDamage);
    rounds.push({ round, attacker: "team", damage: teamDamage, teamHpAfter: teamHpTotal(), enemyHpAfter: enemyHp });

    if (enemyHp <= 0) break;

    // The enemy focuses the front-most member still standing.
    const target = hp.findIndex((value) => value > 0);
    if (target === -1) break;
    const enemyDamage = jitter(enemy.attack, rng);
    hp[target] = Math.max(0, hp[target] - enemyDamage);
    rounds.push({ round, attacker: "enemy", damage: enemyDamage, teamHpAfter: teamHpTotal(), enemyHpAfter: enemyHp });

    round++;
  }

  return {
    victory: enemyHp <= 0 && teamHpTotal() > 0,
    rounds,
    enemy: { ...enemy, hp: enemyHp },
    teamHp: hp,
  };
}
