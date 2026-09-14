import type { SynergyDefinition } from "../traits/types.js";

/**
 * TODO_GAME_DESIGN — thresholds and their effects.
 *
 * The engine reads nothing but `count` and `effects`. It never interprets an
 * effect's `type`; the reader does. The vocabulary the codebase currently
 * listens for:
 *
 *   slot_rate       mult   target = SlotType      Refuge production for that pen
 *   resource_rate   mult   target = ResourceType  Refuge production for a resource
 *   activity_score  add    target = SlotType      feeds the pen's star rating
 *   combat_attack   add    target = traitId?      damage dealt in runs
 *   combat_hp       add    target = traitId?      hit points in runs
 *   run_loot        mult   target = reward kind   size of run rewards
 *   run_luck        add    -                      nudges rarity rolls upward
 *
 * Inventing a new one costs a data entry plus one lookup wherever it should
 * bite. Nothing in traits/ needs to change.
 *
 * Thresholds are tuned to the shape of the game, not to balance: the Refuge has
 * four pens, so a trait that only appears on Refuge species can never exceed 4
 * holders. Cross-cutting traits go higher because run teams are larger.
 */
export const SYNERGIES: Record<string, SynergyDefinition> = {
  fertilisation: {
    traitId: "fertilisation",
    thresholds: [
      { count: 2, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.15, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 1 }] },
      { count: 3, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.35, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 2 }] },
      { count: 4, effects: [{ type: "slot_rate", target: "BERRY_FARM", value: 1.7, mode: "mult" }, { type: "activity_score", target: "BERRY_FARM", value: 3 }] },
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
      { count: 4, effects: [{ type: "slot_rate", target: "MINING", value: 1.7, mode: "mult" }, { type: "activity_score", target: "MINING", value: 3 }] },
    ],
  },

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

  chanceux: {
    traitId: "chanceux",
    thresholds: [
      { count: 2, effects: [{ type: "run_luck", value: 0.08 }] },
      { count: 3, effects: [{ type: "run_luck", value: 0.18 }, { type: "run_loot", target: "egg_shard", value: 1.5, mode: "mult" }] },
    ],
  },
};
