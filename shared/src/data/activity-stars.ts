import type { ActivityStarRule } from "../traits/stars.js";
import type { SlotType } from "../types.js";

/**
 * TODO_GAME_DESIGN — how a pen's score turns into stars.
 *
 * `baseScore` is what an occupied pen is worth before any bonus. Anything that
 * should raise a pen's rating contributes an `activity_score` effect targeted
 * at that slot (see synergies.ts); the totals are then compared against this
 * ladder. Five thresholds means five stars — add a sixth and the UI follows.
 */
export const ACTIVITY_STAR_RULES: Record<SlotType, ActivityStarRule> = {
  BERRY_FARM: { baseScore: 1, thresholds: [1, 2, 3, 4, 6] },
  FISHING_DOCK: { baseScore: 1, thresholds: [1, 2, 3, 4, 6] },
  WOODCUTTING: { baseScore: 1, thresholds: [1, 2, 3, 4, 6] },
  MINING: { baseScore: 1, thresholds: [1, 2, 3, 4, 6] },
};
