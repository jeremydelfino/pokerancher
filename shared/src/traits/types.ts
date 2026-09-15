/**
 * Trait and synergy vocabulary.
 *
 * Nothing here decides game design. An effect is deliberately just a
 * `(type, target, value)` triple: the engine never interprets `type`, it only
 * accumulates. Whoever reads the bag decides what "resource_rate" means. That
 * is what lets a new effect kind ship as a data entry instead of an engine
 * change.
 *
 * Note the existing `PokemonSpecies.trait` field is a different thing entirely
 * — it is the Refuge job (which pen a species may work, and its rate bonus).
 * Synergy traits live in their own data file, keyed by species id.
 */

/** How an effect combines with others sharing its (type, target). */
export type EffectMode =
  /** Summed. Use for flat bonuses: +3 damage, +10 loot. */
  | "add"
  /** Multiplied together. Use for rates: 1.2 = +20%. */
  | "mult"
  /** Only the largest wins. Use for caps and "best of" rules. */
  | "max";

export interface TraitEffect {
  /** Free-form. The engine never switches on this — readers do. */
  type: string;
  /** Narrows the effect. Omit to apply to every target of that type. */
  target?: string;
  value: number;
  /** Defaults to "add". */
  mode?: EffectMode;
}

/** A flattened accumulator, for shipping to the client or asserting in tests. */
export interface EffectBagEntry {
  type: string;
  target?: string;
  add: number;
  mult: number;
  max: number | null;
}

export interface TraitDefinition {
  id: string;
  name: string;
  description: string;
  /** Free-form grouping for the UI (e.g. "récolte", "combat"). */
  category?: string;
  /** Short pixel-friendly glyph shown on chips. */
  icon?: string;
  /**
   * A signature trait carried by exactly one species — the fourth trait every
   * legendary gets. The engine treats it like any other trait; this flag only
   * drives how it is drawn and what the roster test enforces.
   */
  exclusive?: boolean;
}

export interface SynergyThreshold {
  /** How many holders are required to light this tier up. */
  count: number;
  /** Optional label shown instead of the raw count. */
  label?: string;
  effects: TraitEffect[];
}

/**
 * Whether duplicate copies of the same species each count toward a trait.
 * "unique-species" is the TFT rule and the default: a second Bulbasaur does not
 * advance Fertilisation twice.
 */
export type SynergyCountMode = "unique-species" | "per-member";

/**
 * Whether reaching tier 3 also keeps tiers 1 and 2 running.
 *
 * "highest" is the TFT rule and the default: only the top tier reached applies,
 * so its effects are written as absolute values (tier 3 IS x1.35, not x1.35 on
 * top of tier 2). "cumulative" keeps every met tier, which means effects have
 * to be written as increments. Getting this backwards silently multiplies your
 * whole ladder together, so it is declared per trait rather than assumed.
 */
export type SynergyStacking = "highest" | "cumulative";

export interface SynergyDefinition {
  traitId: string;
  countMode?: SynergyCountMode;
  /** Defaults to "highest". */
  stacking?: SynergyStacking;
  /** Must be sorted ascending by count; the engine sorts defensively anyway. */
  thresholds: SynergyThreshold[];
}

/** One trait's live state for a given team. */
export interface SynergyState {
  traitId: string;
  definition: TraitDefinition | undefined;
  /** Holders counted under the trait's countMode. */
  count: number;
  /** Every threshold currently met, lowest first. Use this to draw stars. */
  activeTiers: SynergyThreshold[];
  /** The tiers whose effects actually apply, per the trait's stacking rule. */
  effectiveTiers: SynergyThreshold[];
  /** The highest met threshold, or null when none is. */
  currentTier: SynergyThreshold | null;
  /** 0 when nothing is active, otherwise the 1-based tier number. */
  tierIndex: number;
  /** Total tiers this trait can reach — how many stars to draw. */
  tierCount: number;
  /** Holders needed for the next tier, or null at max. */
  nextThreshold: number | null;
  /** How many more holders to reach it, or null at max. */
  toNext: number | null;
}

/** Anything that can hold traits: a Refuge occupant, or a run team member. */
export interface TraitCarrier {
  speciesId: string;
  /** Traits granted on top of the species' own — run relics use this. */
  extraTraits?: readonly string[];
}
