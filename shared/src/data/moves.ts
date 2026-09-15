import type { PokeType } from "./types-chart.js";

/**
 * TODO_GAME_DESIGN — the move catalogue.
 *
 * A move is the only thing the player picks during a fight, so this file is
 * where the fight's texture lives: a big slow hit versus a reliable small one,
 * a heal that costs you a turn, a buff that pays off only if you survive.
 *
 * `power: 0` means the move deals no damage; whatever it does instead is in
 * `effect`. Keep status moves few and readable — a battle where every option is
 * a stat tweak stops being a battle.
 */

export type MoveCategory = "physique" | "speciale" | "statut";

export type MoveEffectKind =
  /** Restores a fraction of the user's max hit points. */
  | "heal"
  /** Multiplies the user's attack for the rest of the battle. */
  | "buff_attack"
  /** Multiplies the user's defence for the rest of the battle. */
  | "buff_defense"
  /** Divides the target's attack. */
  | "debuff_attack"
  /** Divides the target's defence. */
  | "debuff_defense";

export interface MoveEffect {
  kind: MoveEffectKind;
  /** Fraction for "heal", multiplier for the rest. */
  value: number;
}

export interface MoveDefinition {
  id: string;
  name: string;
  type: PokeType;
  category: MoveCategory;
  /** 0 for a status move. */
  power: number;
  /** 0..1. Rolled once per use, against the seeded RNG. */
  accuracy: number;
  /** Uses per battle. Running dry falls back to Lutte. */
  pp: number;
  /** Higher goes first regardless of speed. Defaults to 0. */
  priority?: number;
  effect?: MoveEffect;
  description: string;
}

export const MOVES: Record<string, MoveDefinition> = {
  /* --- Normal ------------------------------------------------------------ */
  charge: { id: "charge", name: "Charge", type: "normal", category: "physique", power: 40, accuracy: 1, pp: 20, description: "Une charge du corps entier, sans finesse." },
  vive_attaque: { id: "vive_attaque", name: "Vive-Attaque", type: "normal", category: "physique", power: 40, accuracy: 1, pp: 15, priority: 1, description: "Frappe toujours en premier." },
  belier: { id: "belier", name: "Bélier", type: "normal", category: "physique", power: 85, accuracy: 0.85, pp: 10, description: "Puissant, mais mal assuré." },
  mimi_queue: { id: "mimi_queue", name: "Mimi-Queue", type: "normal", category: "statut", power: 0, accuracy: 1, pp: 10, effect: { kind: "debuff_defense", value: 0.75 }, description: "Baisse la défense de l'adversaire." },
  lutte: { id: "lutte", name: "Lutte", type: "normal", category: "physique", power: 30, accuracy: 1, pp: 99, description: "Le dernier recours quand plus aucune attaque n'a de PP." },

  /* --- Plante ------------------------------------------------------------ */
  fouet_lianes: { id: "fouet_lianes", name: "Fouet Lianes", type: "plante", category: "physique", power: 45, accuracy: 1, pp: 20, description: "Deux lianes claquent sur la cible." },
  tranch_herbe: { id: "tranch_herbe", name: "Tranch'Herbe", type: "plante", category: "speciale", power: 55, accuracy: 0.95, pp: 15, description: "Des feuilles tranchantes comme des lames." },
  lance_soleil: { id: "lance_soleil", name: "Lance-Soleil", type: "plante", category: "speciale", power: 105, accuracy: 0.85, pp: 5, description: "Concentre la lumière en un rayon." },
  vampigraine: { id: "vampigraine", name: "Vampigraine", type: "plante", category: "statut", power: 0, accuracy: 0.9, pp: 10, effect: { kind: "heal", value: 0.3 }, description: "Draine la vie ambiante et se soigne." },
  giga_sangsue: { id: "giga_sangsue", name: "Giga-Sangsue", type: "plante", category: "speciale", power: 70, accuracy: 1, pp: 10, description: "Aspire l'énergie de la cible." },

  /* --- Feu --------------------------------------------------------------- */
  flammeche: { id: "flammeche", name: "Flammèche", type: "feu", category: "speciale", power: 45, accuracy: 1, pp: 20, description: "Une petite gerbe de flammes." },
  lance_flammes: { id: "lance_flammes", name: "Lance-Flammes", type: "feu", category: "speciale", power: 90, accuracy: 0.95, pp: 10, description: "Un torrent de feu nourri." },
  deflagration: { id: "deflagration", name: "Déflagration", type: "feu", category: "speciale", power: 110, accuracy: 0.8, pp: 5, description: "Une explosion qui ne pardonne pas." },

  /* --- Eau --------------------------------------------------------------- */
  pistolet_o: { id: "pistolet_o", name: "Pistolet à O", type: "eau", category: "speciale", power: 45, accuracy: 1, pp: 20, description: "Un jet d'eau sous pression." },
  surf: { id: "surf", name: "Surf", type: "eau", category: "speciale", power: 90, accuracy: 1, pp: 10, description: "Une vague balaye le terrain." },
  cascade: { id: "cascade", name: "Cascade", type: "eau", category: "physique", power: 80, accuracy: 1, pp: 10, description: "Charge portée par un mur d'eau." },
  bulles_o: { id: "bulles_o", name: "Bulles d'O", type: "eau", category: "speciale", power: 55, accuracy: 1, pp: 15, effect: { kind: "debuff_attack", value: 0.85 }, description: "Des bulles qui gênent autant qu'elles blessent." },

  /* --- Électrik ---------------------------------------------------------- */
  eclair: { id: "eclair", name: "Éclair", type: "electrik", category: "speciale", power: 50, accuracy: 1, pp: 20, description: "Une décharge rapide." },
  tonnerre: { id: "tonnerre", name: "Tonnerre", type: "electrik", category: "speciale", power: 100, accuracy: 0.8, pp: 8, description: "Foudroie la cible — quand ça touche." },

  /* --- Glace ------------------------------------------------------------- */
  vent_glace: { id: "vent_glace", name: "Vent Glace", type: "glace", category: "speciale", power: 55, accuracy: 1, pp: 15, effect: { kind: "debuff_attack", value: 0.85 }, description: "Un souffle glacé qui engourdit." },
  laser_glace: { id: "laser_glace", name: "Laser Glace", type: "glace", category: "speciale", power: 90, accuracy: 1, pp: 8, description: "Un rayon de froid absolu." },
  blizzard: { id: "blizzard", name: "Blizzard", type: "glace", category: "speciale", power: 110, accuracy: 0.75, pp: 5, description: "Une tempête aveuglante." },

  /* --- Combat ------------------------------------------------------------ */
  poing_karate: { id: "poing_karate", name: "Poing-Karaté", type: "combat", category: "physique", power: 50, accuracy: 1, pp: 20, description: "Un coup sec et précis." },
  close_combat: { id: "close_combat", name: "Close Combat", type: "combat", category: "physique", power: 110, accuracy: 0.9, pp: 5, effect: { kind: "buff_defense", value: 0.8 }, description: "Tout donner, quitte à s'exposer." },
  lame_sacree: { id: "lame_sacree", name: "Lame Sacrée", type: "combat", category: "physique", power: 95, accuracy: 1, pp: 8, description: "La corne fend l'air comme une épée." },

  /* --- Sol / Roche / Acier ----------------------------------------------- */
  jet_pierres: { id: "jet_pierres", name: "Jet-Pierres", type: "roche", category: "physique", power: 50, accuracy: 0.95, pp: 15, description: "Une volée de cailloux." },
  eboulement: { id: "eboulement", name: "Éboulement", type: "roche", category: "physique", power: 85, accuracy: 0.9, pp: 10, description: "Fait tomber la paroi sur la cible." },
  seisme: { id: "seisme", name: "Séisme", type: "sol", category: "physique", power: 100, accuracy: 1, pp: 8, description: "Le sol se soulève d'un coup." },
  queue_de_fer: { id: "queue_de_fer", name: "Queue de Fer", type: "acier", category: "physique", power: 90, accuracy: 0.85, pp: 10, description: "Une queue durcie comme une barre." },
  mur_de_fer: { id: "mur_de_fer", name: "Mur de Fer", type: "acier", category: "statut", power: 0, accuracy: 1, pp: 8, effect: { kind: "buff_defense", value: 1.5 }, description: "Durcit la peau jusqu'à la fin du combat." },
  griffe_acier: { id: "griffe_acier", name: "Griffe Acier", type: "acier", category: "physique", power: 65, accuracy: 0.95, pp: 15, description: "Des griffes métalliques." },

  /* --- Vol / Insecte / Poison -------------------------------------------- */
  cru_aile: { id: "cru_aile", name: "Cru-Aile", type: "vol", category: "physique", power: 60, accuracy: 1, pp: 15, description: "Un coup d'aile en plein vol." },
  dard_venin: { id: "dard_venin", name: "Dard-Venin", type: "poison", category: "physique", power: 45, accuracy: 1, pp: 20, description: "Un dard chargé de venin." },
  bourdon: { id: "bourdon", name: "Bourdon", type: "insecte", category: "speciale", power: 80, accuracy: 1, pp: 10, description: "Un vrombissement qui déchire l'air." },

  /* --- Psy / Spectre / Ténèbres / Fée ------------------------------------ */
  choc_mental: { id: "choc_mental", name: "Choc Mental", type: "psy", category: "speciale", power: 55, accuracy: 1, pp: 20, description: "Une pression exercée sur l'esprit." },
  psyko: { id: "psyko", name: "Psyko", type: "psy", category: "speciale", power: 95, accuracy: 1, pp: 8, effect: { kind: "debuff_defense", value: 0.85 }, description: "Brise la concentration autant que le corps." },
  ball_ombre: { id: "ball_ombre", name: "Ball'Ombre", type: "spectre", category: "speciale", power: 85, accuracy: 1, pp: 10, description: "Une sphère d'ombre lancée à bout portant." },
  morsure: { id: "morsure", name: "Morsure", type: "tenebres", category: "physique", power: 60, accuracy: 1, pp: 15, description: "Une mâchoire qui se referme." },
  pouvoir_antique: { id: "pouvoir_antique", name: "Pouvoir Antique", type: "roche", category: "speciale", power: 60, accuracy: 1, pp: 10, effect: { kind: "buff_attack", value: 1.25 }, description: "Réveille une force endormie." },
  vibrobscur: { id: "vibrobscur", name: "Vibrobscur", type: "tenebres", category: "speciale", power: 80, accuracy: 1, pp: 10, description: "Une onde noire qui traverse tout." },
  voix_enjoleuse: { id: "voix_enjoleuse", name: "Voix Enjôleuse", type: "fee", category: "speciale", power: 65, accuracy: 1, pp: 15, description: "Un chant qui frappe sans prévenir." },
  eclat_magique: { id: "eclat_magique", name: "Éclat Magique", type: "fee", category: "speciale", power: 90, accuracy: 1, pp: 8, description: "Une lumière féerique, tranchante." },

  /* --- Dragon ------------------------------------------------------------ */
  draco_griffe: { id: "draco_griffe", name: "Draco-Griffe", type: "dragon", category: "physique", power: 85, accuracy: 1, pp: 10, description: "Des griffes chargées de puissance draconique." },
  colere: { id: "colere", name: "Colère", type: "dragon", category: "physique", power: 120, accuracy: 0.8, pp: 4, description: "Une fureur incontrôlable." },

  /* --- Soin -------------------------------------------------------------- */
  repos: { id: "repos", name: "Repos", type: "psy", category: "statut", power: 0, accuracy: 1, pp: 6, effect: { kind: "heal", value: 0.45 }, description: "Récupère près de la moitié de ses PV." },
  soin_vital: { id: "soin_vital", name: "Soin Vital", type: "normal", category: "statut", power: 0, accuracy: 1, pp: 5, effect: { kind: "heal", value: 0.35 }, description: "Referme ses blessures." },
};

export const STRUGGLE_MOVE = "lutte";

export function moveDefinition(moveId: string): MoveDefinition | undefined {
  return MOVES[moveId];
}
