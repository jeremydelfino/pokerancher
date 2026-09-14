import type { ResourceType } from "../types.js";

/**
 * TODO_GAME_DESIGN — what a cleared node can hand out.
 *
 * The engine rolls `RUN_CONFIG.rewardOptions` entries from this table, weighted,
 * and shows them as a choice. `run_loot` multiplies resource amounts and
 * `run_luck` biases the weighting toward rarer entries, so both effects bite
 * here without the table knowing they exist.
 */

export interface RewardTemplate {
  id: string;
  label: string;
  description: string;
  weight: number;
  /** 0 = mundane, 1 = rare. Luck shifts the roll toward higher values. */
  rarity: number;
  resources?: Partial<Record<ResourceType, number>>;
  eggs?: number;
  /** Rolls a relic from RELICS rather than handing out loot. */
  relic?: boolean;
  healPercent?: number;
}

export const REWARD_TEMPLATES: RewardTemplate[] = [
  {
    id: "berries",
    label: "Panier de baies",
    description: "Des baies fraîches pour le Refuge.",
    weight: 20,
    rarity: 0.1,
    resources: { berry: 140 },
  },
  {
    id: "catch",
    label: "Pêche du jour",
    description: "De quoi remplir le vivier.",
    weight: 18,
    rarity: 0.15,
    resources: { fish: 110 },
  },
  {
    id: "timber",
    label: "Fagot de bois",
    description: "Du bois sec, prêt à l'emploi.",
    weight: 18,
    rarity: 0.15,
    resources: { wood: 90 },
  },
  {
    id: "ore",
    label: "Filon de minerai",
    description: "Un morceau de roche prometteur.",
    weight: 14,
    rarity: 0.3,
    resources: { ore: 70 },
  },
  {
    id: "shards",
    label: "Éclats d'œuf",
    description: "La monnaie des couveuses.",
    weight: 16,
    rarity: 0.4,
    resources: { egg_shard: 45 },
  },
  {
    id: "egg",
    label: "Œuf intact",
    description: "Un œuf entier, à faire éclore au Refuge.",
    weight: 7,
    rarity: 0.8,
    eggs: 1,
  },
  {
    id: "relic",
    label: "Relique",
    description: "Un objet qui change la suite de l'expédition.",
    weight: 15,
    rarity: 0.6,
    relic: true,
  },
  {
    id: "camp",
    label: "Campement",
    description: "L'équipe récupère 40 % de ses points de vie.",
    weight: 10,
    rarity: 0.2,
    healPercent: 0.4,
  },
];
