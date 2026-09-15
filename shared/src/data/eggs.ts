import type { Rarity, ResourceType, SlotType } from "../types.js";

/**
 * TODO_GAME_DESIGN — what you can hatch, and what it costs.
 *
 * Two kinds of egg, and the difference is the whole point of having more than
 * one:
 *
 *   • **targeted** eggs (`slots`) are cheap and narrow — you buy them when you
 *     know which pen you are short of, and you accept a common half the time;
 *   • **lottery** eggs are dear and wide — you buy them when you want a
 *     legendary and have nothing specific in mind.
 *
 * Both are priced in coins except the starter one, which keeps taking shards so
 * a brand-new account can roll before it has ever sold anything.
 */

export interface EggType {
  id: string;
  name: string;
  blurb: string;
  cost: { resource: ResourceType; amount: number };
  /** Rarity weights for this egg. Anything at 0 simply cannot come out. */
  weights: Record<Rarity, number>;
  /** When set, only species whose job is one of these can hatch. */
  slots?: SlotType[];
  /**
   * Odds of hatching a chromatic. Hatching one *unlocks* shiny for that species
   * forever, so the number is a doorway rather than a per-Pokémon cosmetic —
   * which is why the dear eggs move it so much.
   */
  shinyChance: number;
  /** Shell, speckles, and the glow behind it. Drives the pixel egg. */
  palette: { shell: string; shade: string; speck: string; glow: string };
}

export const EGG_TYPES: readonly EggType[] = [
  {
    id: "commun",
    name: "Œuf Tacheté",
    blurb: "L'œuf de tout le monde. Il sort surtout des communs, mais il sort de tout.",
    cost: { resource: "egg_shard", amount: 50 },
    weights: { common: 60, rare: 30, epic: 9, legendary: 1 },
    shinyChance: 1 / 350,
    palette: { shell: "#fbf3dd", shade: "#d9c49a", speck: "#f2b03d", glow: "rgba(242, 176, 61, 0.45)" },
  },
  {
    id: "mousse",
    name: "Œuf de Mousse",
    blurb: "Ne contient que des travailleurs des baies et du bois.",
    cost: { resource: "coin", amount: 260 },
    weights: { common: 52, rare: 34, epic: 12, legendary: 2 },
    shinyChance: 1 / 300,
    slots: ["BERRY_FARM", "WOODCUTTING"],
    palette: { shell: "#b6d98f", shade: "#5f9a5e", speck: "#fbf3dd", glow: "rgba(127, 176, 105, 0.5)" },
  },
  {
    id: "maree",
    name: "Œuf de Marée",
    blurb: "Ne contient que des pêcheurs.",
    cost: { resource: "coin", amount: 260 },
    weights: { common: 52, rare: 34, epic: 12, legendary: 2 },
    shinyChance: 1 / 300,
    slots: ["FISHING_DOCK"],
    palette: { shell: "#9fdbe8", shade: "#35708f", speck: "#fffdf5", glow: "rgba(90, 168, 196, 0.55)" },
  },
  {
    id: "roche",
    name: "Œuf de Roche",
    blurb: "Ne contient que des mineurs.",
    cost: { resource: "coin", amount: 260 },
    weights: { common: 52, rare: 34, epic: 12, legendary: 2 },
    shinyChance: 1 / 300,
    slots: ["MINING"],
    palette: { shell: "#c2bcd6", shade: "#5b5674", speck: "#ffd479", glow: "rgba(164, 158, 196, 0.5)" },
  },
  {
    id: "dore",
    name: "Œuf Doré",
    blurb: "Plus cher, mais les communs y sont rares.",
    cost: { resource: "coin", amount: 600 },
    weights: { common: 20, rare: 45, epic: 28, legendary: 7 },
    shinyChance: 1 / 120,
    palette: { shell: "#ffd479", shade: "#c9975f", speck: "#fffdf5", glow: "rgba(255, 212, 121, 0.7)" },
  },
  {
    id: "prisme",
    name: "Œuf Prisme",
    blurb: "Aucun commun n'en sort. Jamais.",
    cost: { resource: "coin", amount: 1800 },
    weights: { common: 0, rare: 34, epic: 46, legendary: 20 },
    shinyChance: 1 / 45,
    palette: { shell: "#c56bd6", shade: "#6d5088", speck: "#7ce0d3", glow: "rgba(197, 107, 214, 0.7)" },
  },
];

export const EGG_BY_ID = Object.fromEntries(EGG_TYPES.map((egg) => [egg.id, egg])) as Record<
  string,
  EggType
>;

export const DEFAULT_EGG = EGG_TYPES[0].id;
