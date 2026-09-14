import { SPECIES_TRAITS } from "../data/species-traits.js";
import { SYNERGIES } from "../data/synergies.js";
import { TRAIT_DEFINITIONS } from "../data/traits.js";
import { EffectBag } from "./effects.js";
import type { SynergyState, SynergyThreshold, TraitCarrier, TraitEffect } from "./types.js";

/**
 * Trait resolution and threshold synergies.
 *
 * Traits currently come from the species config, because the schema keeps one
 * PokemonUnit row per (user, species) — there is no per-copy identity to hang
 * them on. Every read goes through `resolveTraits`, whose `extra` argument is
 * what run relics use to grant a trait for the length of a run. Moving to
 * per-instance traits later means feeding that same argument from a column,
 * not rewriting anything downstream.
 */

export function resolveTraits(speciesId: string, extra: readonly string[] = []): string[] {
  const own = SPECIES_TRAITS[speciesId] ?? [];
  return [...new Set([...own, ...extra])];
}

export function traitsOf(carrier: TraitCarrier): string[] {
  return resolveTraits(carrier.speciesId, carrier.extraTraits ?? []);
}

/**
 * Counts holders per trait.
 *
 * Duplicate copies of a species do not advance a trait twice unless its
 * definition opts into "per-member" — that is the TFT rule, and it is what
 * forces a player to widen their roster instead of stacking one good species.
 */
export function countTraits(team: readonly TraitCarrier[]): Map<string, number> {
  const holders = new Map<string, TraitCarrier[]>();

  for (const member of team) {
    for (const traitId of traitsOf(member)) {
      const list = holders.get(traitId);
      if (list) list.push(member);
      else holders.set(traitId, [member]);
    }
  }

  const counts = new Map<string, number>();
  for (const [traitId, members] of holders) {
    const mode = SYNERGIES[traitId]?.countMode ?? "unique-species";
    counts.set(
      traitId,
      mode === "per-member" ? members.length : new Set(members.map((m) => m.speciesId)).size
    );
  }
  return counts;
}

function sortedThresholds(traitId: string): SynergyThreshold[] {
  const defined = SYNERGIES[traitId]?.thresholds ?? [];
  return [...defined].sort((a, b) => a.count - b.count);
}

export function resolveSynergy(traitId: string, count: number): SynergyState {
  const thresholds = sortedThresholds(traitId);
  const activeTiers = thresholds.filter((tier) => count >= tier.count);
  const next = thresholds.find((tier) => tier.count > count) ?? null;

  return {
    traitId,
    definition: TRAIT_DEFINITIONS[traitId],
    count,
    activeTiers,
    currentTier: activeTiers[activeTiers.length - 1] ?? null,
    tierIndex: activeTiers.length,
    tierCount: thresholds.length,
    nextThreshold: next?.count ?? null,
    toNext: next ? next.count - count : null,
  };
}

/**
 * Every trait present in the team, strongest tier first then closest to its
 * next tier — so the panel naturally reads "what I have" before "what I am two
 * Pokémon away from".
 */
export function resolveSynergies(team: readonly TraitCarrier[]): SynergyState[] {
  return [...countTraits(team)]
    .map(([traitId, count]) => resolveSynergy(traitId, count))
    .sort((a, b) => b.tierIndex - a.tierIndex || (a.toNext ?? 99) - (b.toNext ?? 99) || a.traitId.localeCompare(b.traitId));
}

export function synergyEffects(states: readonly SynergyState[]): TraitEffect[] {
  return states.flatMap((state) => state.activeTiers.flatMap((tier) => tier.effects));
}

/**
 * The one call most callers want: team in, queryable effect bag out.
 * `extra` carries anything that is not a synergy — run relics, event buffs.
 */
export function teamEffectBag(
  team: readonly TraitCarrier[],
  extra: readonly TraitEffect[] = []
): EffectBag {
  return new EffectBag().addAll(synergyEffects(resolveSynergies(team))).addAll(extra);
}
