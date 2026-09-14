import type { TraitDefinition } from "../traits/types.js";

/**
 * TODO_GAME_DESIGN — trait catalogue.
 *
 * Everything below is placeholder so the engine has something to chew on. Add,
 * rename or delete freely: nothing outside this file and its two siblings
 * (species-traits.ts, synergies.ts) knows these ids exist.
 *
 * A trait only needs an entry here to show up in the UI. Giving it thresholds
 * and effects happens in synergies.ts; handing it to a species happens in
 * species-traits.ts. The three files are deliberately separate so you can add a
 * trait to a species without touching balance, and rebalance without touching
 * the roster.
 */
export const TRAIT_DEFINITIONS: Record<string, TraitDefinition> = {
  fertilisation: {
    id: "fertilisation",
    name: "Fertilisation",
    description: "Fait pousser plus vite ce qui sort de terre.",
    category: "récolte",
    icon: "🌱",
  },
  pecheur: {
    id: "pecheur",
    name: "Pêcheur",
    description: "Sait où mordent les poissons.",
    category: "récolte",
    icon: "🎣",
  },
  bucheron: {
    id: "bucheron",
    name: "Bûcheron",
    description: "Abat plus de bois à chaque passage.",
    category: "récolte",
    icon: "🪓",
  },
  mineur: {
    id: "mineur",
    name: "Mineur",
    description: "Trouve les veines que les autres ratent.",
    category: "récolte",
    icon: "⛏️",
  },
  explorateur: {
    id: "explorateur",
    name: "Explorateur",
    description: "Rapporte davantage des expéditions.",
    category: "exploration",
    icon: "🧭",
  },
  carapace: {
    id: "carapace",
    name: "Carapace",
    description: "Encaisse à la place des autres.",
    category: "combat",
    icon: "🛡️",
  },
  chanceux: {
    id: "chanceux",
    name: "Chanceux",
    description: "Tombe sur les bonnes choses un peu trop souvent.",
    category: "fortune",
    icon: "🍀",
  },
};

export function traitDefinition(traitId: string): TraitDefinition | undefined {
  return TRAIT_DEFINITIONS[traitId];
}
