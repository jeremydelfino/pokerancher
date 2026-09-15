import type { TraitDefinition } from "../traits/types.js";
import type { Rarity } from "../types.js";

/**
 * TODO_GAME_DESIGN — trait catalogue.
 *
 * Three kinds live here, and only the comment tells them apart — the engine
 * sees one flat list:
 *
 *   • the four **jobs** (fertilisation, pêcheur, bûcheron, mineur), which mirror
 *     `PokemonSpecies.trait` and are therefore forced by the pen a species works;
 *   • the **cross-cutting** traits, which are where the actual composition
 *     choice lives — two species can work the same pen and bring different ones;
 *   • the **signature** traits, marked `exclusive`, one per legendary.
 *
 * Adding, renaming or deleting is free: nothing outside this file and its two
 * siblings (species-traits.ts, synergies.ts) knows these ids exist.
 */
export const TRAIT_DEFINITIONS: Record<string, TraitDefinition> = {
  /* --- Métiers ----------------------------------------------------------- */
  fertilisation: {
    id: "fertilisation",
    name: "Fertilisation",
    description: "Fait pousser plus vite ce qui sort de terre.",
    category: "métier",
    icon: "🌱",
  },
  pecheur: {
    id: "pecheur",
    name: "Pêcheur",
    description: "Sait où mordent les poissons.",
    category: "métier",
    icon: "🎣",
  },
  bucheron: {
    id: "bucheron",
    name: "Bûcheron",
    description: "Abat plus de bois à chaque passage.",
    category: "métier",
    icon: "🪓",
  },
  mineur: {
    id: "mineur",
    name: "Mineur",
    description: "Trouve les veines que les autres ratent.",
    category: "métier",
    icon: "⛏️",
  },

  /* --- Transversaux ------------------------------------------------------ */
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
  vigueur: {
    id: "vigueur",
    name: "Vigueur",
    description: "Frappe plus fort, et plus longtemps.",
    category: "combat",
    icon: "⚔️",
  },
  chanceux: {
    id: "chanceux",
    name: "Chanceux",
    description: "Tombe sur les bonnes choses un peu trop souvent.",
    category: "fortune",
    icon: "🍀",
  },
  gourmand: {
    id: "gourmand",
    name: "Gourmand",
    description: "Ne revient jamais les mains vides d'une récolte.",
    category: "récolte",
    icon: "🍯",
  },
  veilleur: {
    id: "veilleur",
    name: "Veilleur",
    description: "Tient l'enclos en ordre pendant que les autres dorment.",
    category: "récolte",
    icon: "🔔",
  },

  /* --- Signatures légendaires -------------------------------------------- */
  gratitude: {
    id: "gratitude",
    name: "Gratitude",
    description: "Les fleurs poussent sur son passage.",
    category: "signature",
    icon: "🌸",
    exclusive: true,
  },
  coeur_marin: {
    id: "coeur_marin",
    name: "Cœur Marin",
    description: "La mer lui rend toujours plus qu'elle ne prend.",
    category: "signature",
    icon: "🌊",
    exclusive: true,
  },
  voix_du_temps: {
    id: "voix_du_temps",
    name: "Voix du Temps",
    description: "Une seconde chance sur chaque tirage.",
    category: "signature",
    icon: "🕰️",
    exclusive: true,
  },
  colosse_scelle: {
    id: "colosse_scelle",
    name: "Colosse Scellé",
    description: "Ce qui le frappe s'effrite avant lui.",
    category: "signature",
    icon: "🗿",
    exclusive: true,
  },
  lame_resolue: {
    id: "lame_resolue",
    name: "Lame Résolue",
    description: "Une seule attaque, et elle porte.",
    category: "signature",
    icon: "🗡️",
    exclusive: true,
  },
  machoire_double: {
    id: "machoire_double",
    name: "Mâchoire Double",
    description: "Deux gueules, deux fois le travail.",
    category: "signature",
    icon: "🔩",
    exclusive: true,
  },
};

export function traitDefinition(traitId: string): TraitDefinition | undefined {
  return TRAIT_DEFINITIONS[traitId];
}

export function isExclusiveTrait(traitId: string): boolean {
  return TRAIT_DEFINITIONS[traitId]?.exclusive === true;
}

/**
 * TODO_GAME_DESIGN — how many traits a species carries, by rarity.
 *
 * This is a hard rule, not a guideline: `species-traits.test.ts` fails the build
 * if any species breaks it. Rarity is therefore readable straight off a card —
 * four chips means legendary, one means common — and a legendary's fourth chip
 * is always its signature.
 *
 * For a species that works a pen, the job eats one of these slots. Keldeo has
 * no job, so all four of its slots are free.
 */
export const TRAITS_PER_RARITY: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};
