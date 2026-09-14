/**
 * TODO_GAME_DESIGN — which traits each species carries.
 *
 * This is the file you asked to own. Keys are species ids from pokemon-data.ts,
 * values are trait ids from traits.ts. A species with no entry simply has no
 * synergy traits, which is a valid state.
 *
 *     bulbasaur: ["fertilisation", "explorateur"],
 *
 * Why two traits per species in the placeholder set: the Refuge has four pens
 * and each pen only accepts species whose job matches it, so the *job* trait is
 * forced by the slot. The second trait is what creates a real choice — picking
 * Bulbizarre over Vipélierre for the berry pen trades Carapace for Explorateur.
 * Keep that shape if you want the composition puzzle to stay interesting.
 */
export const SPECIES_TRAITS: Record<string, string[]> = {
  // Champ de baies
  sunkern: ["fertilisation", "chanceux"],
  bulbasaur: ["fertilisation", "explorateur"],
  snivy: ["fertilisation", "carapace"],

  // Ponton de pêche
  magikarp: ["pecheur", "chanceux"],
  lapras: ["pecheur", "explorateur"],
  wailord: ["pecheur", "carapace"],

  // Coupe de bois
  bonsly: ["bucheron", "carapace"],
  sudowoodo: ["bucheron", "explorateur"],
  torterra: ["bucheron", "fertilisation"],

  // Mine
  onix: ["mineur", "carapace"],
  steelix: ["mineur", "explorateur"],
  regirock: ["mineur", "carapace"],

  // Offensifs — pas d'enclos, mais ils comptent dans une équipe d'exploration
  keldeo: ["explorateur", "chanceux"],
  mawile: ["mineur", "carapace"],
};
