import type { ResourceType, SlotType } from "../types.js";
import { EffectBag } from "./effects.js";
import { resolveSynergies, synergyEffects, teamEffectBag } from "./engine.js";
import { activityStars, type ActivityStars } from "./stars.js";
import type { SynergyState, TraitCarrier, TraitEffect } from "./types.js";

/**
 * The Refuge's view of the trait engine: who is working, what that lights up,
 * and what it multiplies.
 */

export interface RefugeOccupant extends TraitCarrier {
  slotType: SlotType;
}

export interface RefugeComposition {
  team: RefugeOccupant[];
  synergies: SynergyState[];
  effects: EffectBag;
}

export function refugeComposition(
  occupants: readonly RefugeOccupant[],
  extra: readonly TraitEffect[] = []
): RefugeComposition {
  const synergies = resolveSynergies(occupants);
  return {
    team: [...occupants],
    synergies,
    effects: new EffectBag().addAll(synergyEffects(synergies)).addAll(extra),
  };
}

/**
 * Production multiplier a pen currently enjoys. Slot-targeted and
 * resource-targeted bonuses compound, so a trait can buff "the mine" and a
 * relic can buff "ore" without either having to know about the other.
 */
export function refugeRateMultiplier(
  effects: EffectBag,
  slotType: SlotType,
  resource: ResourceType
): number {
  return effects.multiplier("slot_rate", slotType) * effects.multiplier("resource_rate", resource);
}

export function refugeActivityStars(
  effects: EffectBag,
  slotType: SlotType,
  occupied: boolean
): ActivityStars {
  return activityStars(slotType, effects, { occupied });
}

/** Convenience for callers holding nothing but a roster. */
export function refugeEffectBag(occupants: readonly RefugeOccupant[]): EffectBag {
  return teamEffectBag(occupants);
}
