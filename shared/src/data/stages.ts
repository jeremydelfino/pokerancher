/**
 * TODO_GAME_DESIGN — the ten expeditions.
 *
 * A stage is a difficulty step you unlock by clearing the one before it. What
 * changes from one to the next is deliberately three things and not ten:
 *
 *   • how long the trail is (`rows`)
 *   • how strong what lives on it is (`level`, and which `wild` pool)
 *   • how many of them show up at once (`foes`, 1 → 3)
 *
 * The boss is always a legendary, and always alone — a legendary that arrives
 * with two friends stops being a duel, and the duel is the point.
 *
 * Adding an eleventh stage is one entry here plus one legendary in battlers.ts.
 * Nothing else knows there are ten.
 */

export type Biome = "prairie" | "foret" | "grotte" | "cote" | "volcan" | "cime";

export interface StageDefinition {
  id: string;
  /** 1-based. Also the unlock order. */
  index: number;
  name: string;
  subtitle: string;
  biome: Biome;
  /** Rows before the boss. */
  rows: number;
  /** Level of the wild Pokémon here. */
  level: number;
  bossLevel: number;
  /** How many foes a normal fight fields. */
  foes: number;
  /** Which wild Pokémon appear, by id from battlers.ts. */
  wild: string[];
  /** The legendary waiting at the end. */
  boss: string;
  /** Multiplies every loot table on this trail. */
  rewardMultiplier: number;
}

export const STAGES: readonly StageDefinition[] = [
  {
    id: "stage-1", index: 1, name: "Le Sentier des Baies", subtitle: "Là où tout le monde commence.",
    biome: "prairie", rows: 4, level: 5, bossLevel: 9, foes: 1,
    wild: ["rattata", "chenipan", "roucool"],
    boss: "artikodin", rewardMultiplier: 1,
  },
  {
    id: "stage-2", index: 2, name: "La Clairière Basse", subtitle: "Les bois commencent à répondre.",
    biome: "foret", rows: 5, level: 9, bossLevel: 14, foes: 1,
    wild: ["chenipan", "roucool", "nosferapti", "ptitard"],
    boss: "electhor", rewardMultiplier: 1.15,
  },
  {
    id: "stage-3", index: 3, name: "Les Éboulis", subtitle: "Ça tombe de partout.",
    biome: "grotte", rows: 5, level: 14, bossLevel: 20, foes: 2,
    wild: ["racaillou", "nosferapti", "machoc", "voltorbe"],
    boss: "sulfura", rewardMultiplier: 1.3,
  },
  {
    id: "stage-4", index: 4, name: "La Côte Battue", subtitle: "Le vent porte autre chose que du sel.",
    biome: "cote", rows: 6, level: 20, bossLevel: 27, foes: 2,
    wild: ["krabby", "ptitard", "roucool", "caninos"],
    boss: "raikou", rewardMultiplier: 1.5,
  },
  {
    id: "stage-5", index: 5, name: "Le Gouffre", subtitle: "On n'entend plus la surface.",
    biome: "grotte", rows: 7, level: 27, bossLevel: 35, foes: 2,
    wild: ["fantominus", "abra", "osselait", "machoc", "racaillou"],
    boss: "entei", rewardMultiplier: 1.75,
  },
  {
    id: "stage-6", index: 6, name: "Les Fumerolles", subtitle: "La roche est encore chaude.",
    biome: "volcan", rows: 7, level: 35, bossLevel: 44, foes: 3,
    wild: ["magmar", "malosse", "smogo", "caninos"],
    boss: "suicune", rewardMultiplier: 2,
  },
  {
    id: "stage-7", index: 7, name: "La Forêt Noire", subtitle: "Les arbres se referment derrière toi.",
    biome: "foret", rows: 8, level: 44, bossLevel: 54, foes: 3,
    wild: ["insecateur", "fantominus", "farfuret", "tauros"],
    boss: "latias", rewardMultiplier: 2.3,
  },
  {
    id: "stage-8", index: 8, name: "Le Plateau Gelé", subtitle: "Respirer coûte quelque chose.",
    biome: "cime", rows: 9, level: 54, bossLevel: 65, foes: 3,
    wild: ["farfuret", "embrylex", "tauros", "insecateur"],
    boss: "latios", rewardMultiplier: 2.6,
  },
  {
    id: "stage-9", index: 9, name: "La Crête des Vents", subtitle: "Plus rien ne pousse à cette hauteur.",
    biome: "cime", rows: 10, level: 65, bossLevel: 78, foes: 3,
    wild: ["embrylex", "malosse", "magmar", "farfuret"],
    boss: "rayquaza", rewardMultiplier: 3,
  },
  {
    id: "stage-10", index: 10, name: "Le Sanctuaire", subtitle: "Ce qui attend là n'a jamais été vaincu.",
    biome: "grotte", rows: 10, level: 78, bossLevel: 92, foes: 3,
    wild: ["embrylex", "fantominus", "abra", "insecateur"],
    boss: "mewtwo", rewardMultiplier: 3.5,
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  string,
  StageDefinition
>;

export const FIRST_STAGE = STAGES[0].id;

/** A stage is open once the one before it is cleared. The first is always open. */
export function stageIsUnlocked(stageId: string, cleared: readonly string[]): boolean {
  const stage = STAGE_BY_ID[stageId];
  if (!stage) return false;
  if (stage.index === 1) return true;
  const previous = STAGES.find((s) => s.index === stage.index - 1);
  return previous ? cleared.includes(previous.id) : false;
}
