import type { EnemyDefinition } from "../run/types.js";

/**
 * TODO_GAME_DESIGN — who the player fights.
 *
 * `tiers` says which node types may field this enemy, so adding a boss is one
 * entry with `tiers: ["boss"]`. `scaling` multiplies the depth hardening from
 * RUN_CONFIG, letting a specific enemy ramp faster than the rest.
 */
export const ENEMIES: EnemyDefinition[] = [
  { id: "ratatas", name: "Nuée de Rattata", tiers: ["combat"], hp: 55, attack: 7 },
  { id: "chenipan", name: "Colonie de Chenipan", tiers: ["combat"], hp: 70, attack: 6 },
  { id: "nosferapti", name: "Vol de Nosferapti", tiers: ["combat"], hp: 62, attack: 9 },
  { id: "racaillou", name: "Éboulis de Racaillou", tiers: ["combat", "elite"], hp: 95, attack: 8, scaling: 1.15 },

  { id: "onix-sauvage", name: "Onix sauvage", tiers: ["elite"], hp: 150, attack: 14, scaling: 1.2 },
  { id: "dracolosse", name: "Dracolosse égaré", tiers: ["elite"], hp: 170, attack: 16, scaling: 1.25 },

  { id: "gardien", name: "Gardien du Sanctuaire", tiers: ["boss"], hp: 320, attack: 22, scaling: 1.3 },
  { id: "colosse", name: "Colosse de Pierre", tiers: ["boss"], hp: 380, attack: 19, scaling: 1.3 },
];

export function enemiesFor(nodeType: string): EnemyDefinition[] {
  const pool = ENEMIES.filter((enemy) => enemy.tiers.includes(nodeType as never));
  return pool.length > 0 ? pool : ENEMIES;
}
