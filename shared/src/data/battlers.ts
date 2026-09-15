import type { PokeType } from "./types-chart.js";

/**
 * TODO_GAME_DESIGN — who can fight, and with what.
 *
 * Three groups, one shape:
 *   • SPECIES_BATTLE — the collectible roster, keyed by the ids in pokemon-data.ts
 *   • WILD_SPECIES   — what you meet on the trail; never collectible
 *   • BOSS_SPECIES   — one legendary per stage
 *
 * Kept separate from pokemon-data.ts on purpose, exactly like species-traits.ts:
 * you can rebalance a moveset without touching the roster, and add a wild
 * Pokémon without it appearing in the gacha.
 *
 * `tier` scales the stat line (see run-config.ts). Roughly: 1 commun, 2 rare,
 * 3 épique, 4 légendaire, 5 boss.
 */

export interface BattlerProfile {
  types: PokeType[];
  /** Up to four. The battle menu shows them in this order. */
  moves: string[];
  tier: number;
}

export interface WildSpecies extends BattlerProfile {
  id: string;
  name: string;
  /** National Pokédex number — this is what makes the real sprite load. */
  dex: number;
}

/* --- The collectible roster ---------------------------------------------- */

export const SPECIES_BATTLE: Record<string, BattlerProfile> = {
  // Champ de baies
  sunkern: { types: ["plante"], moves: ["charge", "fouet_lianes", "vampigraine", "lance_soleil"], tier: 1 },
  bulbasaur: { types: ["plante", "poison"], moves: ["charge", "tranch_herbe", "dard_venin", "vampigraine"], tier: 1 },
  snivy: { types: ["plante"], moves: ["vive_attaque", "tranch_herbe", "giga_sangsue", "lance_soleil"], tier: 2 },
  leafeon: { types: ["plante"], moves: ["vive_attaque", "tranch_herbe", "lance_soleil", "morsure"], tier: 3 },
  shaymin: { types: ["plante"], moves: ["giga_sangsue", "lance_soleil", "voix_enjoleuse", "soin_vital"], tier: 4 },

  // Ponton de pêche
  magikarp: { types: ["eau"], moves: ["charge", "pistolet_o", "bulles_o", "cascade"], tier: 1 },
  lapras: { types: ["eau", "glace"], moves: ["surf", "laser_glace", "vent_glace", "repos"], tier: 2 },
  wailord: { types: ["eau"], moves: ["surf", "belier", "bulles_o", "repos"], tier: 3 },
  manaphy: { types: ["eau"], moves: ["surf", "laser_glace", "psyko", "soin_vital"], tier: 4 },

  // Coupe de bois
  bonsly: { types: ["roche"], moves: ["charge", "jet_pierres", "mimi_queue", "eboulement"], tier: 1 },
  sudowoodo: { types: ["roche"], moves: ["jet_pierres", "eboulement", "poing_karate", "mur_de_fer"], tier: 2 },
  torterra: { types: ["plante", "sol"], moves: ["tranch_herbe", "seisme", "eboulement", "lance_soleil"], tier: 3 },
  celebi: { types: ["psy", "plante"], moves: ["choc_mental", "giga_sangsue", "psyko", "soin_vital"], tier: 4 },

  // Mine
  onix: { types: ["roche", "sol"], moves: ["charge", "jet_pierres", "queue_de_fer", "seisme"], tier: 1 },
  steelix: { types: ["acier", "sol"], moves: ["queue_de_fer", "seisme", "eboulement", "mur_de_fer"], tier: 2 },
  aggron: { types: ["acier", "roche"], moves: ["griffe_acier", "eboulement", "seisme", "mur_de_fer"], tier: 3 },
  regirock: { types: ["roche"], moves: ["eboulement", "seisme", "pouvoir_antique", "mur_de_fer"], tier: 4 },

  // Combattants
  keldeo: { types: ["eau", "combat"], moves: ["lame_sacree", "surf", "close_combat", "vive_attaque"], tier: 4 },
  mawile: { types: ["acier", "fee"], moves: ["griffe_acier", "eclat_magique", "morsure", "mur_de_fer"], tier: 4 },
};

/* --- Wild Pokémon --------------------------------------------------------- */

export const WILD_SPECIES: WildSpecies[] = [
  { id: "rattata", name: "Rattata", dex: 19, types: ["normal"], moves: ["charge", "vive_attaque", "morsure", "mimi_queue"], tier: 1 },
  { id: "chenipan", name: "Chenipan", dex: 10, types: ["insecte"], moves: ["charge", "bourdon", "dard_venin", "mimi_queue"], tier: 1 },
  { id: "roucool", name: "Roucool", dex: 16, types: ["normal", "vol"], moves: ["charge", "cru_aile", "vive_attaque", "mimi_queue"], tier: 1 },
  { id: "nosferapti", name: "Nosferapti", dex: 41, types: ["poison", "vol"], moves: ["cru_aile", "morsure", "dard_venin", "vibrobscur"], tier: 1 },
  { id: "racaillou", name: "Racaillou", dex: 74, types: ["roche", "sol"], moves: ["jet_pierres", "charge", "eboulement", "mur_de_fer"], tier: 1 },

  { id: "machoc", name: "Machoc", dex: 66, types: ["combat"], moves: ["poing_karate", "charge", "belier", "close_combat"], tier: 2 },
  { id: "caninos", name: "Caninos", dex: 58, types: ["feu"], moves: ["flammeche", "morsure", "vive_attaque", "lance_flammes"], tier: 2 },
  { id: "ptitard", name: "Ptitard", dex: 60, types: ["eau"], moves: ["pistolet_o", "bulles_o", "charge", "surf"], tier: 2 },
  { id: "abra", name: "Abra", dex: 63, types: ["psy"], moves: ["choc_mental", "psyko", "repos", "ball_ombre"], tier: 2 },
  { id: "fantominus", name: "Fantominus", dex: 92, types: ["spectre", "poison"], moves: ["ball_ombre", "vibrobscur", "choc_mental", "dard_venin"], tier: 2 },
  { id: "krabby", name: "Krabby", dex: 98, types: ["eau"], moves: ["pistolet_o", "griffe_acier", "bulles_o", "cascade"], tier: 2 },
  { id: "voltorbe", name: "Voltorbe", dex: 100, types: ["electrik"], moves: ["eclair", "charge", "vive_attaque", "tonnerre"], tier: 2 },

  { id: "osselait", name: "Osselait", dex: 104, types: ["sol"], moves: ["jet_pierres", "seisme", "belier", "mimi_queue"], tier: 3 },
  { id: "smogo", name: "Smogo", dex: 109, types: ["poison"], moves: ["dard_venin", "vibrobscur", "flammeche", "bourdon"], tier: 3 },
  { id: "insecateur", name: "Insécateur", dex: 123, types: ["insecte", "vol"], moves: ["bourdon", "cru_aile", "vive_attaque", "griffe_acier"], tier: 3 },
  { id: "magmar", name: "Magmar", dex: 126, types: ["feu"], moves: ["lance_flammes", "poing_karate", "flammeche", "deflagration"], tier: 3 },
  { id: "tauros", name: "Tauros", dex: 128, types: ["normal"], moves: ["belier", "charge", "morsure", "seisme"], tier: 3 },
  { id: "farfuret", name: "Farfuret", dex: 215, types: ["tenebres", "glace"], moves: ["morsure", "vent_glace", "vive_attaque", "laser_glace"], tier: 3 },
  { id: "malosse", name: "Malosse", dex: 228, types: ["tenebres", "feu"], moves: ["morsure", "flammeche", "vibrobscur", "lance_flammes"], tier: 3 },
  { id: "embrylex", name: "Embrylex", dex: 246, types: ["roche", "sol"], moves: ["jet_pierres", "morsure", "seisme", "eboulement"], tier: 4 },
];

export const WILD_BY_ID = Object.fromEntries(WILD_SPECIES.map((s) => [s.id, s])) as Record<string, WildSpecies>;

/* --- Bosses --------------------------------------------------------------- */

/**
 * One legendary per stage, in the order stages.ts uses them. A boss is not a
 * wild Pokémon with more hit points: it fields a full moveset with a heal or a
 * buff in it, so the fight has to be won rather than out-statted.
 */
export const BOSS_SPECIES: WildSpecies[] = [
  { id: "artikodin", name: "Artikodin", dex: 144, types: ["glace", "vol"], moves: ["laser_glace", "cru_aile", "blizzard", "repos"], tier: 5 },
  { id: "electhor", name: "Électhor", dex: 145, types: ["electrik", "vol"], moves: ["tonnerre", "cru_aile", "eclair", "repos"], tier: 5 },
  { id: "sulfura", name: "Sulfura", dex: 146, types: ["feu", "vol"], moves: ["lance_flammes", "cru_aile", "deflagration", "repos"], tier: 5 },
  { id: "raikou", name: "Raikou", dex: 243, types: ["electrik"], moves: ["tonnerre", "vive_attaque", "morsure", "soin_vital"], tier: 5 },
  { id: "entei", name: "Entei", dex: 244, types: ["feu"], moves: ["deflagration", "belier", "morsure", "soin_vital"], tier: 5 },
  { id: "suicune", name: "Suicune", dex: 245, types: ["eau"], moves: ["surf", "laser_glace", "bulles_o", "repos"], tier: 5 },
  { id: "latias", name: "Latias", dex: 380, types: ["dragon", "psy"], moves: ["psyko", "draco_griffe", "eclat_magique", "soin_vital"], tier: 5 },
  { id: "latios", name: "Latios", dex: 381, types: ["dragon", "psy"], moves: ["psyko", "draco_griffe", "vibrobscur", "colere"], tier: 5 },
  { id: "rayquaza", name: "Rayquaza", dex: 384, types: ["dragon", "vol"], moves: ["colere", "draco_griffe", "cru_aile", "seisme"], tier: 5 },
  { id: "mewtwo", name: "Mewtwo", dex: 150, types: ["psy"], moves: ["psyko", "ball_ombre", "choc_mental", "soin_vital"], tier: 5 },
];

export const BOSS_BY_ID = Object.fromEntries(BOSS_SPECIES.map((s) => [s.id, s])) as Record<string, WildSpecies>;
