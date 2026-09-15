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
 * A species with no job spends every slot on cross-cutting traits instead — the
 * budget is the same, only the job line is missing.
 *
 * Because rarity follows the evolution family, a Pokémon *gains* a trait when it
 * evolves. That is the second reason to evolve, after the stat line: Herbizarre
 * brings Carapace to a composition that Bulbizarre could not.
 */
export const SPECIES_TRAITS: Record<string, string[]> = {
  /* --- Champ de baies ------------------------------------------------ */
  bulbasaur: ["fertilisation"],
  ivysaur: ["fertilisation", "carapace"],
  venusaur: ["fertilisation", "carapace", "veilleur"],
  chikorita: ["fertilisation"],
  bayleef: ["fertilisation", "veilleur"],
  meganium: ["fertilisation", "veilleur", "gourmand"],
  sunkern: ["fertilisation"],
  sunflora: ["fertilisation", "chanceux"],
  snivy: ["fertilisation"],
  servine: ["fertilisation", "explorateur"],
  serperior: ["fertilisation", "explorateur", "vigueur"],
  leafeon: ["fertilisation", "vigueur", "chanceux"],
  shaymin: ["fertilisation", "veilleur", "chanceux", "gratitude"],

  /* --- Ponton de pêche ----------------------------------------------- */
  magikarp: ["pecheur"],
  gyarados: ["pecheur", "vigueur", "carapace"],
  squirtle: ["pecheur"],
  wartortle: ["pecheur", "carapace"],
  blastoise: ["pecheur", "carapace", "veilleur"],
  totodile: ["pecheur"],
  croconaw: ["pecheur", "vigueur"],
  feraligatr: ["pecheur", "vigueur", "gourmand"],
  lapras: ["pecheur", "carapace"],
  wailmer: ["pecheur"],
  wailord: ["pecheur", "carapace", "gourmand"],
  manaphy: ["pecheur", "gourmand", "chanceux", "coeur_marin"],

  /* --- Coupe de bois ------------------------------------------------- */
  bonsly: ["bucheron"],
  sudowoodo: ["bucheron", "carapace"],
  turtwig: ["bucheron"],
  grotle: ["bucheron", "veilleur"],
  torterra: ["bucheron", "veilleur", "fertilisation"],
  caterpie: ["bucheron"],
  metapod: ["bucheron"],
  butterfree: ["bucheron", "explorateur"],
  weedle: ["bucheron"],
  kakuna: ["bucheron"],
  beedrill: ["bucheron", "vigueur"],
  celebi: ["bucheron", "explorateur", "veilleur", "voix_du_temps"],

  /* --- Mine ---------------------------------------------------------- */
  onix: ["mineur"],
  steelix: ["mineur", "vigueur"],
  geodude: ["mineur"],
  graveler: ["mineur", "carapace"],
  golem: ["mineur", "carapace", "vigueur"],
  aron: ["mineur"],
  lairon: ["mineur", "carapace"],
  aggron: ["mineur", "carapace", "vigueur"],
  larvitar: ["mineur"],
  pupitar: ["mineur", "vigueur"],
  tyranitar: ["mineur", "vigueur", "carapace"],
  mawile: ["mineur", "vigueur", "explorateur", "machoire_double"],
  regirock: ["mineur", "carapace", "vigueur", "colosse_scelle"],

  /* --- Combattants — aucun métier, uniquement l'expédition ----------- */
  charmander: ["vigueur"],
  charmeleon: ["vigueur", "explorateur"],
  charizard: ["vigueur", "explorateur", "chanceux"],
  machop: ["vigueur"],
  machoke: ["vigueur", "carapace"],
  machamp: ["vigueur", "carapace", "gourmand"],
  abra: ["chanceux"],
  kadabra: ["chanceux", "explorateur"],
  alakazam: ["chanceux", "explorateur", "veilleur"],
  gastly: ["chanceux"],
  haunter: ["chanceux", "vigueur"],
  gengar: ["chanceux", "vigueur", "explorateur"],
  growlithe: ["explorateur"],
  arcanine: ["explorateur", "vigueur"],
  eevee: ["chanceux"],
  vaporeon: ["chanceux", "carapace"],
  jolteon: ["chanceux", "vigueur"],
  flareon: ["chanceux", "explorateur"],
  rattata: ["gourmand"],
  raticate: ["gourmand", "vigueur"],
  pidgey: ["explorateur"],
  pidgeotto: ["explorateur", "vigueur"],
  pidgeot: ["explorateur", "vigueur", "chanceux"],
  zubat: ["explorateur"],
  golbat: ["explorateur", "vigueur"],
  vulpix: ["chanceux"],
  ninetales: ["chanceux", "veilleur"],
  scyther: ["vigueur", "explorateur"],
  magmar: ["vigueur", "gourmand"],
  electabuzz: ["vigueur", "chanceux"],
  dratini: ["veilleur"],
  dragonair: ["veilleur", "carapace"],
  dragonite: ["veilleur", "carapace", "vigueur"],
  keldeo: ["explorateur", "vigueur", "chanceux", "lame_resolue"],
};
