import type { SynergyDefinition } from "../traits/types.js";

/**
 * TODO_GAME_DESIGN — thresholds and their effects.
 *
 * The engine reads nothing but `count` and `effects`. It never interprets an
 * effect's `type`; the reader does. The vocabulary the codebase listens for:
 *
 *   slot_rate       mult   target = SlotType      Refuge production for that pen
 *   resource_rate   mult   target = ResourceType  Refuge production for a resource
 *   activity_score  add    target = SlotType      feeds the pen's star rating
 *   combat_attack   add    -                      damage dealt in runs
 *   combat_hp       add    -                      hit points in runs
 *   run_loot        mult   target = reward kind   size of run rewards
 *   run_luck        add    -                      nudges rarity rolls upward
 *
 * Inventing a new one costs a data entry plus one lookup wherever it should
 * bite. Nothing in traits/ needs to change.
 *
 * Counting the ceiling before you tune: a pen holds up to 4 Pokémon at level 4,
 * so a job trait can now reach 4 holders inside a single pen (more if a
 * cross-job species like Torterra helps). An expedition team is 6. Signature
 * traits light at 1 holder by definition — there is only ever one holder.
 */
export const SYNERGIES: Record<string, SynergyDefinition> = {
  /* --- Métiers ----------------------------------------------------------- */
  fertilisation: {
    traitId: "fertilisation",
    thresholds: [
      { count: 2, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.15, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 1 }] },
      { count: 3, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.35, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 2 }] },
      { count: 5, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.7, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 3 }] },
    ],
  },

  pecheur: {
    traitId: "pecheur",
    thresholds: [
      { count: 2, effects: [{ type: "slot_rate", target: "FISHING_DOCK", value: 1.15, mode: "mult" }, { type: "activity_score", target: "FISHING_DOCK", value: 1 }] },
      { count: 3, effects: [{ type: "slot_rate", target: "FISHING_DOCK", value: 1.35, mode: "mult" }, { type: "activity_score", target: "FISHING_DOCK", value: 2 }] },
      { count: 4, effects: [{ type: "slot_rate", target: "FISHING_DOCK", value: 1.7, mode: "mult" }, { type: "activity_score", target: "FISHING_DOCK", value: 3 }] },
    ],
  },

  bucheron: {
    traitId: "bucheron",
    thresholds: [
      { count: 2, effects: [{ type: "slot_rate", target: "WOODCUTTING", value: 1.15, mode: "mult" }, { type: "activity_score", target: "WOODCUTTING", value: 1 }] },
      { count: 3, effects: [{ type: "slot_rate", target: "WOODCUTTING", value: 1.35, mode: "mult" }, { type: "activity_score", target: "WOODCUTTING", value: 2 }] },
      { count: 4, effects: [{ type: "slot_rate", target: "WOODCUTTING", value: 1.7, mode: "mult" }, { type: "activity_score", target: "WOODCUTTING", value: 3 }] },
    ],
  },

  mineur: {
    traitId: "mineur",
    thresholds: [
      { count: 2, effects: [{ type: "slot_rate", target: "MINING", value: 1.15, mode: "mult" }, { type: "activity_score", target: "MINING", value: 1 }] },
      { count: 3, effects: [{ type: "slot_rate", target: "MINING", value: 1.35, mode: "mult" }, { type: "activity_score", target: "MINING", value: 2 }] },
      { count: 5, effects: [{ type: "slot_rate", target: "MINING", value: 1.7, mode: "mult" }, { type: "activity_score", target: "MINING", value: 3 }] },
    ],
  },

  /* --- Transversaux ------------------------------------------------------ */
  explorateur: {
    traitId: "explorateur",
    thresholds: [
      { count: 2, effects: [{ type: "run_loot", value: 1.2, mode: "mult" }, { type: "activity_score", value: 1 }] },
      { count: 3, effects: [{ type: "run_loot", value: 1.45, mode: "mult" }, { type: "run_luck", value: 0.05 }, { type: "activity_score", value: 1 }] },
      { count: 5, effects: [{ type: "run_loot", value: 2, mode: "mult" }, { type: "run_luck", value: 0.12 }, { type: "activity_score", value: 2 }] },
    ],
  },

  carapace: {
    traitId: "carapace",
    thresholds: [
      { count: 2, effects: [{ type: "combat_hp", value: 8 }] },
      { count: 3, effects: [{ type: "combat_hp", value: 20 }] },
      { count: 5, effects: [{ type: "combat_hp", value: 45 }, { type: "combat_attack", value: 3 }] },
    ],
  },

  vigueur: {
    traitId: "vigueur",
    thresholds: [
      { count: 2, effects: [{ type: "combat_attack", value: 3 }] },
      { count: 3, effects: [{ type: "combat_attack", value: 7 }] },
      { count: 5, effects: [{ type: "combat_attack", value: 14 }, { type: "combat_hp", value: 10 }] },
    ],
  },

  chanceux: {
    traitId: "chanceux",
    thresholds: [
      { count: 2, effects: [{ type: "run_luck", value: 0.08 }] },
      { count: 3, effects: [{ type: "run_luck", value: 0.18 }, { type: "run_loot", target: "egg_shard", value: 1.5, mode: "mult" }] },
    ],
  },

  gourmand: {
    traitId: "gourmand",
    thresholds: [
      { count: 2, effects: [{ type: "resource_rate", value: 1.1, mode: "mult" }] },
      { count: 3, effects: [{ type: "resource_rate", value: 1.25, mode: "mult" }, { type: "run_loot", value: 1.15, mode: "mult" }] },
    ],
  },

  veilleur: {
    traitId: "veilleur",
    thresholds: [
      { count: 2, effects: [{ type: "activity_score", value: 1 }] },
      { count: 3, effects: [{ type: "activity_score", value: 2 }, { type: "resource_rate", value: 1.12, mode: "mult" }] },
    ],
  },

  /* --- Signatures --------------------------------------------------------
   * One holder, one tier. A signature is not a threshold puzzle: owning the
   * legendary *is* the threshold, which is exactly what makes it feel rare. */
  gratitude: {
    traitId: "gratitude",
    thresholds: [
      { count: 1, label: "Shaymin", effects: [{ type: "resource_rate", target: "berry", value: 1.4, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 2 }] },
    ],
  },

  coeur_marin: {
    traitId: "coeur_marin",
    thresholds: [
      { count: 1, label: "Manaphy", effects: [{ type: "resource_rate", target: "fish", value: 1.4, mode: "mult" }, { type: "run_loot", value: 1.25, mode: "mult" }] },
    ],
  },

  voix_du_temps: {
    traitId: "voix_du_temps",
    thresholds: [
      { count: 1, label: "Celebi", effects: [{ type: "run_luck", value: 0.2 }, { type: "activity_score", value: 1 }] },
    ],
  },

  colosse_scelle: {
    traitId: "colosse_scelle",
    thresholds: [
      { count: 1, label: "Regirock", effects: [{ type: "combat_hp", value: 35 }] },
    ],
  },

  lame_resolue: {
    traitId: "lame_resolue",
    thresholds: [
      { count: 1, label: "Keldeo", effects: [{ type: "combat_attack", value: 10 }] },
    ],
  },

  machoire_double: {
    traitId: "machoire_double",
    thresholds: [
      { count: 1, label: "Mysdibule", effects: [{ type: "combat_attack", value: 6 }, { type: "slot_rate", target: "MINING", value: 1.2, mode: "mult" }] },
    ],
  },
};
