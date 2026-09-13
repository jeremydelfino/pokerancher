export type ResourceType = "berry" | "fish" | "wood" | "ore" | "egg_shard";

export type SlotType = "BERRY_FARM" | "FISHING_DOCK" | "WOODCUTTING" | "MINING";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type PokemonRole = "passive" | "offensive";

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
  /** Only passive-role species produce resources in the Refuge. */
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
