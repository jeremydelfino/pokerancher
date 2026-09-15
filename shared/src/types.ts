export type ResourceType = "berry" | "fish" | "wood" | "ore" | "egg_shard" | "coin";

/** Resources a player can put up for sale. Coin is the price, not the goods. */
export const SELLABLE_RESOURCES: ResourceType[] = ["berry", "fish", "wood", "ore"];

export type SlotType = "BERRY_FARM" | "FISHING_DOCK" | "WOODCUTTING" | "MINING";

export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Ascending. Index is the rank, so sorting by rarity is an index comparison. */
export const RARITY_ORDER: readonly Rarity[] = ["common", "rare", "epic", "legendary"];

/**
 * Combat profile, nothing more.
 *
 * This used to gate Refuge work — "offensive" species were barred from pens.
 * It no longer does: a species works a pen if it has a `trait` (a job), and
 * fights if it is taken on an expedition. The two are independent, so a Pokémon
 * can do both. All `role` decides now is how its run stats are weighted:
 * offensive hits harder and folds faster, passive is the reverse.
 */
export type PokemonRole = "passive" | "offensive";

/**
 * A species' Refuge job: which pen it may work and how well.
 *
 * Named `trait` on PokemonSpecies for historical reasons — it predates the
 * synergy traits and is a completely different thing. Synergy traits live in
 * data/species-traits.ts.
 */
export interface PassiveTrait {
  slot: SlotType;
  /** Multiplier applied on top of the slot's base rate, e.g. 1.5 = +50%. */
  multiplier: number;
}

export interface PokemonSpecies {
  id: string;
  name: string;
  /** National Pokédex number — how any external sprite source addresses this species. */
  dex: number;
  rarity: Rarity;
  role: PokemonRole;
  /** The Refuge job. Absent means this species cannot work a pen — it says
   *  nothing about whether it can fight. */
  trait?: PassiveTrait;
}

export interface SlotDefinition {
  type: SlotType;
  label: string;
  resource: ResourceType;
  /** Base amount of `resource` produced per hour with no Pokemon trait bonus. */
  baseRatePerHour: number;
}

/** Star tier reached once a species' owned-duplicate count reaches the threshold. */
export interface StarTierInfo {
  stars: number;
  /** Duplicates currently owned (capped display at the current tier's window). */
  currentCount: number;
  /** Duplicates required to reach the next star (null if max tier reached). */
  nextThreshold: number | null;
  statMultiplier: number;
}
