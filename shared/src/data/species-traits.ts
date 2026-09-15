/**
 * TODO_GAME_DESIGN — which traits each species carries.
 *
 * The count is not free: it is fixed by rarity (TRAITS_PER_RARITY in traits.ts)
 * and enforced by a test.
 *
 *   commun     1 trait   → son métier, rien d'autre
 *   rare       2 traits  → métier + 1 transversal
 *   épique     3 traits  → métier + 2 transversaux
 *   légendaire 4 traits  → métier + 2 transversaux + SA signature
 *
 * A species with no job (Keldeo) spends every slot on cross-cutting traits
 * instead — the budget is the same, only the job line is missing.
 *
 * Why it is shaped this way: the job is forced by the pen, so it creates no
 * decision. Everything above the job is the decision — staffing the berry pen
 * with Bulbizarre or Vipélierre trades nothing in production and everything in
 * what else lights up. Rarity buying *more traits* rather than bigger numbers is
 * what makes a legendary a composition piece instead of a stat stick.
 */
export const SPECIES_TRAITS: Record<string, string[]> = {
  /* --- Champ de baies ---------------------------------------------------- */
  sunkern: ["fertilisation"],
  bulbasaur: ["fertilisation"],
  snivy: ["fertilisation", "explorateur"],
  leafeon: ["fertilisation", "vigueur", "chanceux"],
  shaymin: ["fertilisation", "veilleur", "chanceux", "gratitude"],

  /* --- Ponton de pêche --------------------------------------------------- */
  magikarp: ["pecheur"],
  lapras: ["pecheur", "carapace"],
  wailord: ["pecheur", "carapace", "gourmand"],
  manaphy: ["pecheur", "gourmand", "chanceux", "coeur_marin"],

  /* --- Coupe de bois ----------------------------------------------------- */
  bonsly: ["bucheron"],
  sudowoodo: ["bucheron", "carapace"],
  // The cross-job pick: put Torterra on wood and Fertilisation gains a holder
  // from outside the berry pen. That is the combo the whole system is built for.
  torterra: ["bucheron", "fertilisation", "veilleur"],
  celebi: ["bucheron", "explorateur", "veilleur", "voix_du_temps"],

  /* --- Mine -------------------------------------------------------------- */
  onix: ["mineur"],
  steelix: ["mineur", "vigueur"],
  aggron: ["mineur", "carapace", "vigueur"],
  regirock: ["mineur", "carapace", "vigueur", "colosse_scelle"],

  /* --- Combattants ------------------------------------------------------- */
  keldeo: ["explorateur", "vigueur", "chanceux", "lame_resolue"],
  mawile: ["mineur", "vigueur", "explorateur", "machoire_double"],
};
