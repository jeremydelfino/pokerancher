/**
 * TODO_GAME_DESIGN — types and how they answer each other.
 *
 * Stored as three short lists per type rather than an 18x18 grid: a grid is 324
 * cells nobody can proof-read, while "le feu bat la plante, l'eau bat le feu"
 * is how the rule is actually held in a designer's head. `effectiveness()`
 * builds the multiplier from these.
 *
 * Reading the lists:
 *   strongAgainst — this type deals double to those
 *   weakAgainst   — this type deals half to those
 *   noEffect      — this type deals nothing to those
 */

export type PokeType =
  | "normal"
  | "plante"
  | "feu"
  | "eau"
  | "electrik"
  | "glace"
  | "combat"
  | "poison"
  | "sol"
  | "vol"
  | "psy"
  | "insecte"
  | "roche"
  | "spectre"
  | "dragon"
  | "tenebres"
  | "acier"
  | "fee";

export interface TypeChartEntry {
  label: string;
  /** Hex used for the type badge. Cosmetic only. */
  color: string;
  strongAgainst: PokeType[];
  weakAgainst: PokeType[];
  noEffect?: PokeType[];
}

export const TYPE_CHART: Record<PokeType, TypeChartEntry> = {
  normal: {
    label: "Normal", color: "#a8a878",
    strongAgainst: [], weakAgainst: ["roche", "acier"], noEffect: ["spectre"],
  },
  plante: {
    label: "Plante", color: "#78c850",
    strongAgainst: ["eau", "sol", "roche"],
    weakAgainst: ["feu", "plante", "poison", "vol", "insecte", "dragon", "acier"],
  },
  feu: {
    label: "Feu", color: "#f08030",
    strongAgainst: ["plante", "glace", "insecte", "acier"],
    weakAgainst: ["feu", "eau", "roche", "dragon"],
  },
  eau: {
    label: "Eau", color: "#6890f0",
    strongAgainst: ["feu", "sol", "roche"],
    weakAgainst: ["eau", "plante", "dragon"],
  },
  electrik: {
    label: "Électrik", color: "#f8d030",
    strongAgainst: ["eau", "vol"],
    weakAgainst: ["plante", "electrik", "dragon"], noEffect: ["sol"],
  },
  glace: {
    label: "Glace", color: "#98d8d8",
    strongAgainst: ["plante", "sol", "vol", "dragon"],
    weakAgainst: ["feu", "eau", "glace", "acier"],
  },
  combat: {
    label: "Combat", color: "#c03028",
    strongAgainst: ["normal", "glace", "roche", "tenebres", "acier"],
    weakAgainst: ["poison", "vol", "psy", "insecte", "fee"], noEffect: ["spectre"],
  },
  poison: {
    label: "Poison", color: "#a040a0",
    strongAgainst: ["plante", "fee"],
    weakAgainst: ["poison", "sol", "roche", "spectre"], noEffect: ["acier"],
  },
  sol: {
    label: "Sol", color: "#e0c068",
    strongAgainst: ["feu", "electrik", "poison", "roche", "acier"],
    weakAgainst: ["plante", "insecte"], noEffect: ["vol"],
  },
  vol: {
    label: "Vol", color: "#a890f0",
    strongAgainst: ["plante", "combat", "insecte"],
    weakAgainst: ["electrik", "roche", "acier"],
  },
  psy: {
    label: "Psy", color: "#f85888",
    strongAgainst: ["combat", "poison"],
    weakAgainst: ["psy", "acier"], noEffect: ["tenebres"],
  },
  insecte: {
    label: "Insecte", color: "#a8b820",
    strongAgainst: ["plante", "psy", "tenebres"],
    weakAgainst: ["feu", "combat", "poison", "vol", "spectre", "acier", "fee"],
  },
  roche: {
    label: "Roche", color: "#b8a038",
    strongAgainst: ["feu", "glace", "vol", "insecte"],
    weakAgainst: ["combat", "sol", "acier"],
  },
  spectre: {
    label: "Spectre", color: "#705898",
    strongAgainst: ["psy", "spectre"],
    weakAgainst: ["tenebres"], noEffect: ["normal"],
  },
  dragon: {
    label: "Dragon", color: "#7038f8",
    strongAgainst: ["dragon"],
    weakAgainst: ["acier"], noEffect: ["fee"],
  },
  tenebres: {
    label: "Ténèbres", color: "#705848",
    strongAgainst: ["psy", "spectre"],
    weakAgainst: ["combat", "tenebres", "fee"],
  },
  acier: {
    label: "Acier", color: "#b8b8d0",
    strongAgainst: ["glace", "roche", "fee"],
    weakAgainst: ["feu", "eau", "electrik", "acier"],
  },
  fee: {
    label: "Fée", color: "#ee99ac",
    strongAgainst: ["combat", "dragon", "tenebres"],
    weakAgainst: ["feu", "poison", "acier"],
  },
};

export const ALL_TYPES = Object.keys(TYPE_CHART) as PokeType[];

/** Damage multiplier of one attacking type against a (possibly dual) defender. */
export function effectiveness(attacking: PokeType, defending: readonly PokeType[]): number {
  const entry = TYPE_CHART[attacking];
  if (!entry) return 1;

  return defending.reduce((total, type) => {
    if (entry.noEffect?.includes(type)) return 0;
    if (entry.strongAgainst.includes(type)) return total * 2;
    if (entry.weakAgainst.includes(type)) return total * 0.5;
    return total;
  }, 1);
}

/** The line the battle log prints for a multiplier. Null when it is plain. */
export function effectivenessLabel(multiplier: number): string | null {
  if (multiplier === 0) return "Ça n'affecte pas l'adversaire…";
  if (multiplier >= 2) return "C'est super efficace !";
  if (multiplier <= 0.5) return "Ce n'est pas très efficace…";
  return null;
}
