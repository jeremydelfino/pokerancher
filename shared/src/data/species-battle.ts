import type { PokeType } from "./types-chart.js";

/**
 * TODO_GAME_DESIGN — what each species is, and what it learns.
 *
 * A learnset is a list of (level, move). A Pokémon *knows* everything at or
 * below its level and *carries* four of them into battle; which four is the
 * player's call, in the codex. That split is the whole point: levelling opens
 * options rather than replacing numbers.
 *
 * Most of a learnset comes from the species' primary type, because that is
 * what makes a Feu Pokémon feel like a Feu Pokémon. The entries appended after
 * the pool are what make it feel like *that* Pokémon.
 */

export interface LearnsetEntry {
  level: number;
  move: string;
}

export interface BattlerProfile {
  types: PokeType[];
  learnset: LearnsetEntry[];
  /** Scales the stat line. Roughly: 1 commun, 2 rare, 3 épique, 4 légendaire, 5 boss. */
  tier: number;
}

/** Exported so the wild and boss lists in battlers.ts read the same way. */
export const at = (level: number, move: string): LearnsetEntry => ({ level, move });

/* --- Type movepools ---------------------------------------------------------
 * One ladder per type: something weak you get immediately, something solid in
 * the middle, something that costs PP at the top. A type without all three
 * leaves its Pokémon pressing the same button for twenty levels. */

const NORMAL: LearnsetEntry[] = [at(1, "charge"), at(4, "vive_attaque"), at(9, "mimi_queue"), at(16, "ecras_face"), at(24, "belier"), at(34, "hyper_voix"), at(44, "danse_lames")];
const PLANTE: LearnsetEntry[] = [at(1, "charge"), at(4, "fouet_lianes"), at(9, "feuillemagik"), at(15, "vampigraine"), at(21, "tranch_herbe"), at(29, "giga_sangsue"), at(36, "synthese"), at(45, "lance_soleil"), at(54, "vegepuissance")];
const FEU: LearnsetEntry[] = [at(1, "charge"), at(5, "flammeche"), at(11, "crocs_feu"), at(18, "morsure"), at(26, "lance_flammes"), at(35, "danse_lames"), at(44, "deflagration"), at(52, "boutefeu")];
const EAU: LearnsetEntry[] = [at(1, "charge"), at(4, "pistolet_o"), at(10, "aqua_jet"), at(16, "bulles_o"), at(23, "cascade"), at(32, "surf"), at(41, "laser_glace"), at(50, "hydrocanon")];
const ELECTRIK: LearnsetEntry[] = [at(1, "charge"), at(5, "eclair"), at(11, "vive_attaque"), at(17, "cage_eclair"), at(26, "tonnerre"), at(38, "fatal_foudre")];
const GLACE: LearnsetEntry[] = [at(1, "charge"), at(5, "poudreuse"), at(13, "vent_glace"), at(22, "laser_glace"), at(33, "blizzard"), at(44, "repos")];
const COMBAT: LearnsetEntry[] = [at(1, "cognobidon"), at(5, "poing_karate"), at(13, "balayage"), at(21, "ecras_face"), at(30, "danse_lames"), at(40, "close_combat")];
const POISON: LearnsetEntry[] = [at(1, "charge"), at(5, "dard_venin"), at(13, "acide"), at(22, "vibrobscur"), at(32, "bombe_beurk")];
const SOL: LearnsetEntry[] = [at(1, "charge"), at(5, "jet_de_sable"), at(12, "jet_pierres"), at(21, "tunnel"), at(32, "seisme"), at(44, "lame_de_roc")];
const VOL: LearnsetEntry[] = [at(1, "charge"), at(4, "tornade"), at(11, "aeropique"), at(19, "cru_aile"), at(30, "rapace")];
const PSY: LearnsetEntry[] = [at(1, "charge"), at(5, "choc_mental"), at(13, "hypnose"), at(22, "psyko"), at(32, "repos"), at(42, "vibrobscur")];
const INSECTE: LearnsetEntry[] = [at(1, "piqure"), at(6, "vampirisme"), at(13, "bourdon"), at(22, "dard_nuee"), at(32, "danse_lames")];
const ROCHE: LearnsetEntry[] = [at(1, "charge"), at(5, "jet_pierres"), at(13, "armure"), at(21, "eboulement"), at(31, "pouvoir_antique"), at(42, "lame_de_roc")];
const SPECTRE: LearnsetEntry[] = [at(1, "lechouille"), at(6, "choc_mental"), at(15, "tenebres"), at(23, "ball_ombre"), at(34, "vibrobscur")];
const DRAGON: LearnsetEntry[] = [at(1, "charge"), at(6, "draco_souffle"), at(17, "morsure"), at(29, "draco_griffe"), at(42, "colere")];
const TENEBRES: LearnsetEntry[] = [at(1, "charge"), at(5, "coup_bas"), at(13, "morsure"), at(23, "vibrobscur"), at(35, "danse_lames")];
const ACIER: LearnsetEntry[] = [at(1, "charge"), at(5, "griffe_acier"), at(15, "mur_de_fer"), at(23, "tete_de_fer"), at(34, "queue_de_fer")];
const FEE: LearnsetEntry[] = [at(1, "charge"), at(5, "charme"), at(13, "voix_enjoleuse"), at(26, "eclat_magique")];

/* --- The roster ----------------------------------------------------------- */

export const SPECIES_BATTLE: Record<string, BattlerProfile> = {
  /* --- Champ de baies ------------------------------------------------ */
  bulbasaur: { types: ["plante", "poison"], tier: 1, learnset: [...PLANTE, at(13, "dard_venin"), at(25, "acide")] },
  ivysaur: { types: ["plante", "poison"], tier: 2, learnset: [...PLANTE, at(13, "dard_venin"), at(25, "acide")] },
  venusaur: { types: ["plante", "poison"], tier: 3, learnset: [...PLANTE, at(25, "acide"), at(40, "bombe_beurk")] },
  chikorita: { types: ["plante"], tier: 1, learnset: [...PLANTE, at(12, "charme")] },
  bayleef: { types: ["plante"], tier: 2, learnset: [...PLANTE, at(12, "charme")] },
  meganium: { types: ["plante"], tier: 3, learnset: [...PLANTE, at(24, "voix_enjoleuse"), at(38, "eclat_magique")] },
  sunkern: { types: ["plante"], tier: 1, learnset: [...PLANTE] },
  sunflora: { types: ["plante"], tier: 2, learnset: [...PLANTE, at(26, "hyper_voix")] },
  snivy: { types: ["plante"], tier: 1, learnset: [...PLANTE, at(10, "vive_attaque")] },
  servine: { types: ["plante"], tier: 2, learnset: [...PLANTE, at(10, "vive_attaque")] },
  serperior: { types: ["plante"], tier: 3, learnset: [...PLANTE, at(10, "vive_attaque"), at(44, "coup_bas")] },
  leafeon: { types: ["plante"], tier: 3, learnset: [...PLANTE, at(20, "vive_attaque"), at(36, "danse_lames")] },
  shaymin: { types: ["plante"], tier: 4, learnset: [...PLANTE, at(30, "eclat_magique"), at(45, "soin_vital")] },

  /* --- Ponton de pêche ----------------------------------------------- */
  magikarp: { types: ["eau"], tier: 1, learnset: [...EAU] },
  gyarados: { types: ["eau", "vol"], tier: 3, learnset: [...EAU, at(25, "morsure"), at(35, "rapace"), at(48, "colere")] },
  squirtle: { types: ["eau"], tier: 1, learnset: [...EAU, at(14, "armure")] },
  wartortle: { types: ["eau"], tier: 2, learnset: [...EAU, at(14, "armure")] },
  blastoise: { types: ["eau"], tier: 3, learnset: [...EAU, at(14, "armure"), at(42, "tete_de_fer")] },
  totodile: { types: ["eau"], tier: 1, learnset: [...EAU, at(12, "morsure")] },
  croconaw: { types: ["eau"], tier: 2, learnset: [...EAU, at(12, "morsure")] },
  feraligatr: { types: ["eau"], tier: 3, learnset: [...EAU, at(12, "morsure"), at(40, "danse_lames")] },
  lapras: { types: ["eau", "glace"], tier: 2, learnset: [...EAU, at(16, "vent_glace"), at(28, "laser_glace"), at(40, "blizzard")] },
  wailmer: { types: ["eau"], tier: 1, learnset: [...EAU, at(18, "belier")] },
  wailord: { types: ["eau"], tier: 3, learnset: [...EAU, at(18, "belier"), at(36, "hyper_voix")] },
  manaphy: { types: ["eau"], tier: 4, learnset: [...EAU, at(28, "psyko"), at(44, "soin_vital")] },

  /* --- Coupe de bois ------------------------------------------------- */
  bonsly: { types: ["roche"], tier: 1, learnset: [...ROCHE] },
  sudowoodo: { types: ["roche"], tier: 2, learnset: [...ROCHE, at(24, "poing_karate")] },
  turtwig: { types: ["plante"], tier: 1, learnset: [...PLANTE, at(14, "jet_pierres")] },
  grotle: { types: ["plante"], tier: 2, learnset: [...PLANTE, at(14, "jet_pierres"), at(26, "tunnel")] },
  torterra: { types: ["plante", "sol"], tier: 3, learnset: [...PLANTE, at(14, "jet_pierres"), at(26, "tunnel"), at(40, "seisme")] },
  caterpie: { types: ["insecte"], tier: 1, learnset: [...INSECTE] },
  metapod: { types: ["insecte"], tier: 1, learnset: [...INSECTE, at(8, "armure")] },
  butterfree: { types: ["insecte", "vol"], tier: 2, learnset: [...INSECTE, at(14, "tornade"), at(24, "choc_mental"), at(34, "hypnose")] },
  weedle: { types: ["insecte", "poison"], tier: 1, learnset: [...INSECTE, at(5, "dard_venin")] },
  kakuna: { types: ["insecte", "poison"], tier: 1, learnset: [...INSECTE, at(8, "armure")] },
  beedrill: { types: ["insecte", "poison"], tier: 2, learnset: [...INSECTE, at(16, "dard_venin"), at(26, "acide"), at(36, "danse_lames")] },
  celebi: { types: ["psy", "plante"], tier: 4, learnset: [...PSY, at(20, "choc_mental"), at(32, "psyko"), at(44, "soin_vital")] },

  /* --- Mine ---------------------------------------------------------- */
  onix: { types: ["roche", "sol"], tier: 1, learnset: [...ROCHE, at(16, "tunnel"), at(28, "queue_de_fer")] },
  steelix: { types: ["acier", "sol"], tier: 2, learnset: [...ACIER, at(16, "tunnel"), at(28, "queue_de_fer"), at(40, "seisme")] },
  geodude: { types: ["roche", "sol"], tier: 1, learnset: [...ROCHE, at(18, "tunnel")] },
  graveler: { types: ["roche", "sol"], tier: 2, learnset: [...ROCHE, at(18, "tunnel"), at(30, "seisme")] },
  golem: { types: ["roche", "sol"], tier: 3, learnset: [...ROCHE, at(18, "tunnel"), at(30, "seisme"), at(44, "belier")] },
  aron: { types: ["acier", "roche"], tier: 1, learnset: [...ACIER, at(14, "griffe_acier")] },
  lairon: { types: ["acier", "roche"], tier: 2, learnset: [...ACIER, at(14, "griffe_acier"), at(28, "tete_de_fer")] },
  aggron: { types: ["acier", "roche"], tier: 3, learnset: [...ACIER, at(14, "griffe_acier"), at(28, "tete_de_fer"), at(46, "seisme")] },
  larvitar: { types: ["roche", "sol"], tier: 1, learnset: [...ROCHE, at(16, "morsure")] },
  pupitar: { types: ["roche", "sol"], tier: 2, learnset: [...ROCHE, at(16, "morsure"), at(30, "tunnel")] },
  tyranitar: { types: ["roche", "tenebres"], tier: 3, learnset: [...ROCHE, at(16, "morsure"), at(30, "tunnel"), at(48, "seisme")] },
  mawile: { types: ["acier", "fee"], tier: 4, learnset: [...ACIER, at(12, "charme"), at(22, "morsure"), at(34, "eclat_magique")] },
  regirock: { types: ["roche"], tier: 4, learnset: [...ROCHE, at(30, "mur_de_fer"), at(44, "seisme")] },

  /* --- Combattants — aucun métier, uniquement l'expédition ----------- */
  charmander: { types: ["feu"], tier: 1, learnset: [...FEU] },
  charmeleon: { types: ["feu"], tier: 2, learnset: [...FEU] },
  charizard: { types: ["feu", "vol"], tier: 3, learnset: [...FEU, at(30, "cru_aile"), at(44, "rapace")] },
  machop: { types: ["combat"], tier: 1, learnset: [...COMBAT] },
  machoke: { types: ["combat"], tier: 2, learnset: [...COMBAT, at(24, "jet_pierres")] },
  machamp: { types: ["combat"], tier: 3, learnset: [...COMBAT, at(24, "jet_pierres"), at(42, "seisme")] },
  abra: { types: ["psy"], tier: 1, learnset: [...PSY] },
  kadabra: { types: ["psy"], tier: 2, learnset: [...PSY, at(22, "ball_ombre")] },
  alakazam: { types: ["psy"], tier: 3, learnset: [...PSY, at(22, "ball_ombre"), at(40, "vibrobscur")] },
  gastly: { types: ["spectre", "poison"], tier: 1, learnset: [...SPECTRE, at(10, "dard_venin")] },
  haunter: { types: ["spectre", "poison"], tier: 2, learnset: [...SPECTRE, at(10, "dard_venin"), at(28, "acide")] },
  gengar: { types: ["spectre", "poison"], tier: 3, learnset: [...SPECTRE, at(28, "acide"), at(42, "bombe_beurk")] },
  growlithe: { types: ["feu"], tier: 1, learnset: [...FEU, at(12, "morsure")] },
  arcanine: { types: ["feu"], tier: 2, learnset: [...FEU, at(12, "morsure"), at(34, "boutefeu")] },
  eevee: { types: ["normal"], tier: 1, learnset: [...NORMAL] },
  vaporeon: { types: ["eau"], tier: 2, learnset: [...EAU, at(30, "repos")] },
  jolteon: { types: ["electrik"], tier: 2, learnset: [...ELECTRIK, at(30, "vive_attaque")] },
  flareon: { types: ["feu"], tier: 2, learnset: [...FEU, at(30, "danse_lames")] },
  rattata: { types: ["normal"], tier: 1, learnset: [...NORMAL, at(10, "morsure")] },
  raticate: { types: ["normal"], tier: 2, learnset: [...NORMAL, at(10, "morsure"), at(28, "coup_bas")] },
  pidgey: { types: ["normal", "vol"], tier: 1, learnset: [...NORMAL, at(8, "tornade"), at(20, "cru_aile")] },
  pidgeotto: { types: ["normal", "vol"], tier: 2, learnset: [...NORMAL, at(8, "tornade"), at(20, "cru_aile")] },
  pidgeot: { types: ["normal", "vol"], tier: 3, learnset: [...NORMAL, at(20, "cru_aile"), at(38, "rapace")] },
  zubat: { types: ["poison", "vol"], tier: 1, learnset: [...POISON, at(8, "tornade"), at(18, "morsure")] },
  golbat: { types: ["poison", "vol"], tier: 2, learnset: [...POISON, at(18, "morsure"), at(30, "cru_aile")] },
  vulpix: { types: ["feu"], tier: 1, learnset: [...FEU, at(12, "charme")] },
  ninetales: { types: ["feu", "fee"], tier: 2, learnset: [...FEU, at(12, "charme"), at(30, "eclat_magique")] },
  scyther: { types: ["insecte", "vol"], tier: 2, learnset: [...INSECTE, at(14, "aeropique"), at(26, "danse_lames"), at(38, "griffe_acier")] },
  magmar: { types: ["feu"], tier: 2, learnset: [...FEU, at(20, "poing_karate")] },
  electabuzz: { types: ["electrik"], tier: 2, learnset: [...ELECTRIK, at(20, "poing_karate")] },
  dratini: { types: ["dragon"], tier: 1, learnset: [...DRAGON] },
  dragonair: { types: ["dragon"], tier: 2, learnset: [...DRAGON, at(26, "laser_glace")] },
  dragonite: { types: ["dragon", "vol"], tier: 3, learnset: [...DRAGON, at(26, "laser_glace"), at(38, "cru_aile"), at(50, "rapace")] },
  keldeo: { types: ["eau", "combat"], tier: 4, learnset: [...EAU, at(20, "lame_sacree"), at(32, "close_combat"), at(44, "surf")] },
};
