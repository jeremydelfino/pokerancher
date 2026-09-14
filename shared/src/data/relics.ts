import type { RunRelic } from "../run/types.js";

/**
 * TODO_GAME_DESIGN — temporary run modifiers.
 *
 * Relics feed the same effect bag as synergies, so they need no special casing
 * anywhere: a relic that says `combat_attack +4` is read by exactly the code
 * that reads a synergy saying the same thing.
 *
 * `grantsTraits` is the interesting one and the engine of the "one more run"
 * loop: handing every member a trait pushes a team toward a threshold it could
 * not reach from the roster alone. A player sitting at 3 Fertilisation who is
 * offered "+1 Fertilisation to everyone" is being offered a tier, not a stat.
 */
export const RELICS: Record<string, RunRelic> = {
  engrais: {
    id: "engrais",
    name: "Sac d'engrais",
    description: "Toute l'équipe gagne le trait Fertilisation.",
    effects: [],
    grantsTraits: ["fertilisation"],
  },
  boussole: {
    id: "boussole",
    name: "Vieille boussole",
    description: "Toute l'équipe gagne le trait Explorateur.",
    effects: [],
    grantsTraits: ["explorateur"],
  },
  ecaille: {
    id: "ecaille",
    name: "Écaille épaisse",
    description: "Toute l'équipe gagne le trait Carapace.",
    effects: [],
    grantsTraits: ["carapace"],
  },
  trefle: {
    id: "trefle",
    name: "Trèfle fané",
    description: "Toute l'équipe gagne le trait Chanceux.",
    effects: [],
    grantsTraits: ["chanceux"],
  },

  croc: {
    id: "croc",
    name: "Croc aiguisé",
    description: "+5 attaque pour toute l'équipe.",
    effects: [{ type: "combat_attack", value: 5 }],
  },
  armure: {
    id: "armure",
    name: "Plastron cabossé",
    description: "+25 points de vie pour toute l'équipe.",
    effects: [{ type: "combat_hp", value: 25 }],
  },
  besace: {
    id: "besace",
    name: "Besace percée",
    description: "Butin de run augmenté de 30 %.",
    effects: [{ type: "run_loot", value: 1.3, mode: "mult" }],
  },
  loupe: {
    id: "loupe",
    name: "Loupe de prospecteur",
    description: "Améliore la qualité des trouvailles.",
    effects: [{ type: "run_luck", value: 0.15 }],
  },
};

export const RELIC_IDS = Object.keys(RELICS);
