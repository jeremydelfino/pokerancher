import { ACTIVITY_STAR_RULES } from "../data/activity-stars.js";
import type { SlotType } from "../types.js";
import type { EffectBag } from "./effects.js";

/**
 * Activity efficiency, expressed in stars.
 *
 * The engine knows one rule and no numbers: a pen has a score, and a ladder of
 * thresholds turns that score into stars. Everything that can push the score —
 * synergies, relics, future Refuge upgrades — does so by contributing an
 * `activity_score` effect targeted at the slot. Adding a new source of stars is
 * therefore a data entry, never an engine change.
 */

export interface ActivityStarRule {
  /** Score with an occupied pen and no bonuses at all. */
  baseScore: number;
  /** Score needed for star 1, 2, 3… Sorted ascending. */
  thresholds: number[];
}

export interface ActivityStars {
  slotType: SlotType;
  stars: number;
  maxStars: number;
  score: number;
  /** Score needed for the next star, or null at max. */
  nextThreshold: number | null;
  /** How much score is still missing, or null at max. */
  toNext: number | null;
}

export const ACTIVITY_SCORE_EFFECT = "activity_score";

export function activityStars(
  slotType: SlotType,
  bag: EffectBag,
  { occupied = true }: { occupied?: boolean } = {}
): ActivityStars {
  const rule = ACTIVITY_STAR_RULES[slotType];
  const thresholds = [...(rule?.thresholds ?? [])].sort((a, b) => a - b);

  // An empty pen scores nothing: stars describe what the pen is producing, not
  // what it could produce if someone were working it.
  const score = occupied ? bag.apply(rule?.baseScore ?? 0, ACTIVITY_SCORE_EFFECT, slotType) : 0;
  const next = thresholds.find((threshold) => threshold > score) ?? null;

  return {
    slotType,
    stars: thresholds.filter((threshold) => score >= threshold).length,
    maxStars: thresholds.length,
    score: Math.round(score * 100) / 100,
    nextThreshold: next,
    toNext: next === null ? null : Math.round((next - score) * 100) / 100,
  };
}
