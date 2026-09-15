import { at, type BattlerProfile } from "./species-battle.js";

/**
 * TODO_GAME_DESIGN — who you fight that you cannot collect.
 *
 * Same shape as the roster in species-battle.ts, so the engine has one kind of
 * fighter and no special cases. What is different is only where they come from:
 *
 *   • WILD_SPECIES — what lives on a trail; which trail is decided by stages.ts
 *   • BOSS_SPECIES — one legendary per stage
 *
 * `dex` is mandatory and is what loads the real sprite.
 */

export interface WildSpecies extends BattlerProfile {
  id: string;
  name: string;
  /** National Pokédex number — this is what makes the real sprite load. */
  dex: number;
}

/* --- Wild Pokémon -----------------------------------------------------------
 * Only species the roster does NOT contain. A stage's pool can name a roster
 * species just as well — `battlerSource` resolves either — so this list stays
 * short and holds the ones you meet but never own. */

export const WILD_SPECIES: WildSpecies[] = [
  { id: "wild_spearow", name: "Piafabec", dex: 21, types: ["normal", "vol"], tier: 1, learnset: [at(1, "charge"), at(6, "tornade"), at(14, "aeropique"), at(24, "cru_aile"), at(36, "rapace")] },
  { id: "wild_ekans", name: "Abo", dex: 23, types: ["poison"], tier: 1, learnset: [at(1, "charge"), at(6, "dard_venin"), at(15, "morsure"), at(26, "acide"), at(38, "bombe_beurk")] },
  { id: "wild_sandshrew", name: "Sabelette", dex: 27, types: ["sol"], tier: 1, learnset: [at(1, "charge"), at(6, "jet_de_sable"), at(15, "jet_pierres"), at(26, "tunnel"), at(38, "seisme")] },
  { id: "wild_diglett", name: "Taupiqueur", dex: 50, types: ["sol"], tier: 1, learnset: [at(1, "charge"), at(6, "jet_de_sable"), at(14, "tunnel"), at(28, "seisme")] },
  { id: "wild_meowth", name: "Miaouss", dex: 52, types: ["normal"], tier: 1, learnset: [at(1, "charge"), at(6, "vive_attaque"), at(16, "coup_bas"), at(28, "ecras_face"), at(40, "danse_lames")] },
  { id: "wild_psyduck", name: "Psykokwak", dex: 54, types: ["eau"], tier: 2, learnset: [at(1, "charge"), at(6, "pistolet_o"), at(16, "choc_mental"), at(28, "surf"), at(40, "psyko")] },
  { id: "wild_mankey", name: "Férosinge", dex: 56, types: ["combat"], tier: 2, learnset: [at(1, "cognobidon"), at(7, "poing_karate"), at(17, "balayage"), at(29, "ecras_face"), at(42, "close_combat")] },
  { id: "wild_poliwag", name: "Ptitard", dex: 60, types: ["eau"], tier: 2, learnset: [at(1, "charge"), at(6, "pistolet_o"), at(15, "bulles_o"), at(27, "cascade"), at(39, "surf")] },
  { id: "wild_doduo", name: "Doduo", dex: 84, types: ["normal", "vol"], tier: 2, learnset: [at(1, "charge"), at(6, "aeropique"), at(17, "cru_aile"), at(30, "belier"), at(42, "rapace")] },
  { id: "wild_grimer", name: "Tadmorv", dex: 88, types: ["poison"], tier: 2, learnset: [at(1, "charge"), at(7, "dard_venin"), at(18, "acide"), at(30, "bombe_beurk"), at(42, "vibrobscur")] },
  { id: "wild_shellder", name: "Kokiyas", dex: 90, types: ["eau"], tier: 2, learnset: [at(1, "charge"), at(7, "pistolet_o"), at(18, "armure"), at(30, "vent_glace"), at(42, "laser_glace")] },
  { id: "wild_drowzee", name: "Soporifik", dex: 96, types: ["psy"], tier: 2, learnset: [at(1, "charge"), at(7, "choc_mental"), at(18, "hypnose"), at(30, "psyko"), at(42, "vibrobscur")] },
  { id: "wild_krabby", name: "Krabby", dex: 98, types: ["eau"], tier: 2, learnset: [at(1, "charge"), at(7, "pistolet_o"), at(18, "griffe_acier"), at(30, "cascade"), at(42, "hydrocanon")] },
  { id: "wild_voltorb", name: "Voltorbe", dex: 100, types: ["electrik"], tier: 2, learnset: [at(1, "charge"), at(7, "eclair"), at(18, "vive_attaque"), at(30, "cage_eclair"), at(42, "tonnerre")] },
  { id: "wild_cubone", name: "Osselait", dex: 104, types: ["sol"], tier: 3, learnset: [at(1, "charge"), at(8, "jet_pierres"), at(20, "tunnel"), at(32, "eboulement"), at(46, "seisme")] },
  { id: "wild_koffing", name: "Smogo", dex: 109, types: ["poison"], tier: 3, learnset: [at(1, "charge"), at(8, "dard_venin"), at(20, "acide"), at(32, "bombe_beurk"), at(46, "flammeche")] },
  { id: "wild_tauros", name: "Tauros", dex: 128, types: ["normal"], tier: 3, learnset: [at(1, "charge"), at(8, "ecras_face"), at(20, "morsure"), at(32, "belier"), at(46, "seisme")] },
  { id: "wild_sneasel", name: "Farfuret", dex: 215, types: ["tenebres", "glace"], tier: 3, learnset: [at(1, "coup_bas"), at(8, "morsure"), at(20, "vent_glace"), at(32, "vibrobscur"), at(46, "laser_glace")] },
  { id: "wild_houndour", name: "Malosse", dex: 228, types: ["tenebres", "feu"], tier: 3, learnset: [at(1, "charge"), at(8, "morsure"), at(20, "flammeche"), at(32, "vibrobscur"), at(46, "lance_flammes")] },
  { id: "wild_absol", name: "Absol", dex: 359, types: ["tenebres"], tier: 4, learnset: [at(1, "coup_bas"), at(10, "morsure"), at(22, "danse_lames"), at(36, "vibrobscur"), at(50, "lame_de_roc")] },
];

export const WILD_BY_ID = Object.fromEntries(WILD_SPECIES.map((s) => [s.id, s])) as Record<string, WildSpecies>;

/* --- Bosses --------------------------------------------------------------- */

/**
 * One legendary per stage, in the order stages.ts uses them. A boss is not a
 * wild Pokémon with more hit points: it fields a full moveset with a heal or a
 * buff in it, so the fight has to be won rather than out-statted.
 */
export const BOSS_SPECIES: WildSpecies[] = [
  { id: "artikodin", name: "Artikodin", dex: 144, types: ["glace", "vol"], learnset: [at(1, "laser_glace"), at(8, "cru_aile"), at(18, "blizzard"), at(30, "repos")], tier: 5 },
  { id: "electhor", name: "Électhor", dex: 145, types: ["electrik", "vol"], learnset: [at(1, "tonnerre"), at(8, "cru_aile"), at(18, "eclair"), at(30, "repos")], tier: 5 },
  { id: "sulfura", name: "Sulfura", dex: 146, types: ["feu", "vol"], learnset: [at(1, "lance_flammes"), at(8, "cru_aile"), at(18, "deflagration"), at(30, "repos")], tier: 5 },
  { id: "raikou", name: "Raikou", dex: 243, types: ["electrik"], learnset: [at(1, "tonnerre"), at(8, "vive_attaque"), at(18, "morsure"), at(30, "soin_vital")], tier: 5 },
  { id: "entei", name: "Entei", dex: 244, types: ["feu"], learnset: [at(1, "deflagration"), at(8, "belier"), at(18, "morsure"), at(30, "soin_vital")], tier: 5 },
  { id: "suicune", name: "Suicune", dex: 245, types: ["eau"], learnset: [at(1, "surf"), at(8, "laser_glace"), at(18, "bulles_o"), at(30, "repos")], tier: 5 },
  { id: "latias", name: "Latias", dex: 380, types: ["dragon", "psy"], learnset: [at(1, "psyko"), at(8, "draco_griffe"), at(18, "eclat_magique"), at(30, "soin_vital")], tier: 5 },
  { id: "latios", name: "Latios", dex: 381, types: ["dragon", "psy"], learnset: [at(1, "psyko"), at(8, "draco_griffe"), at(18, "vibrobscur"), at(30, "colere")], tier: 5 },
  { id: "rayquaza", name: "Rayquaza", dex: 384, types: ["dragon", "vol"], learnset: [at(1, "colere"), at(8, "draco_griffe"), at(18, "cru_aile"), at(30, "seisme")], tier: 5 },
  { id: "mewtwo", name: "Mewtwo", dex: 150, types: ["psy"], learnset: [at(1, "psyko"), at(8, "ball_ombre"), at(18, "choc_mental"), at(30, "soin_vital")], tier: 5 },
];

export const BOSS_BY_ID = Object.fromEntries(BOSS_SPECIES.map((s) => [s.id, s])) as Record<string, WildSpecies>;
