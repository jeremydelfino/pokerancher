import type { BattleState } from "../battle/types.js";
import type { PokeType } from "../data/types-chart.js";
import type { ResourceType } from "../types.js";

/**
 * PokeValley — the vocabulary.
 *
 * Everything here is data the server can regenerate from a seed and a position.
 * A saved run is a seed, where you stand, what you are carrying and what you
 * have met; never a dump of the world, which is why an endless world still fits
 * in a database row.
 */

/* --- Space ---------------------------------------------------------------- */

/** A tile, in world coordinates. Negative in three quadrants; the Ranch is 0,0. */
export interface Vec2 {
  x: number;
  y: number;
}

export type TerrainType =
  | "grass"
  | "tall_grass"
  | "dirt"
  | "sand"
  | "snow"
  | "ice"
  | "rock"
  | "water"
  | "deep_water"
  | "tree"
  | "cactus"
  | "bush"
  | "flower";

/** Terrain a Pokémon can hide in. Read by the encounter roll, not hardcoded there. */
export const ENCOUNTER_TERRAIN: readonly TerrainType[] = ["tall_grass", "bush", "flower"];

/** Terrain that stops you. Water is deliberately not solid — you wade shallows. */
export const SOLID_TERRAIN: readonly TerrainType[] = ["tree", "rock", "cactus", "deep_water"];

export type BiomeId = "plains" | "forest" | "desert" | "snow";

/* --- What sits on a tile -------------------------------------------------- */

export type FeatureKind =
  | "resource"
  | "pokeball_plant"
  | "chest"
  | "camp"
  | "cave"
  | "ruins"
  | "shrine";

export interface Feature {
  /** Stable across regeneration: derived from the tile, not from a counter. */
  id: string;
  kind: FeatureKind;
  at: Vec2;
  /** For a resource node: what it gives. */
  resource?: ResourceType;
  /** Display label, already in French. */
  label: string;
}

export interface Chunk {
  cx: number;
  cy: number;
  /** Row-major, CHUNK_SIZE² entries. */
  tiles: TerrainType[];
  /** The dominant biome per tile, for the map and for encounter pools. */
  biomes: BiomeId[];
  features: Feature[];
}

/* --- Pokémon in the wild -------------------------------------------------- */

export type TimeOfDay = "morning" | "day" | "evening" | "night";

export interface EncounterRule {
  speciesId: string;
  /** Relative weight inside its biome. Nothing is a flat percentage. */
  weight: number;
  minLevel: number;
  maxLevel: number;
  /** Absent means "any time". */
  time?: TimeOfDay[];
  /** Metres from the Ranch before this one can show up at all. */
  minDistance?: number;
}

/* --- Run state ------------------------------------------------------------ */

export interface ValleyLoot {
  resources: Partial<Record<ResourceType, number>>;
  /** Pokéballs are a run resource: you find them, you spend them. */
  pokeballs: number;
}

export interface CaughtPokemon {
  speciesId: string;
  level: number;
  shiny: boolean;
  alpha: boolean;
}

/** A wild Pokémon, mid-encounter. */
export interface WildEncounter {
  speciesId: string;
  level: number;
  shiny: boolean;
  /** Rarer, stronger, and worth the Pokéball. */
  alpha: boolean;
  /** Attempts already made, so the log can say "it broke free again". */
  attempts: number;
}

export type ValleyStatus = "active" | "returned" | "lost";

export interface ValleyOutcome {
  status: Exclude<ValleyStatus, "active">;
  message: string;
  /** Metres from the Ranch at the furthest point reached. */
  bestDistance: number;
  /** What actually lands in the account. */
  banked: ValleyLoot;
  caught: CaughtPokemon[];
}

export interface ValleyState {
  /** The world. Everything spatial is regenerated from this. */
  seed: number;
  /** Human-readable form of the same number, for sharing. */
  code: string;
  status: ValleyStatus;
  at: Vec2;
  /** Steps taken. Drives encounter pacing and the clock. */
  steps: number;
  /** Furthest metres from the Ranch this run has reached. */
  bestDistance: number;
  team: import("../run/types.js").RunTeamMember[];
  /** Carried, and lost if the team faints. */
  carried: ValleyLoot;
  /** Banked at a camp, and kept whatever happens. */
  secured: ValleyLoot;
  caught: CaughtPokemon[];
  /** Feature ids already taken, so a harvested plant stays harvested. */
  taken: string[];
  /** Chunk keys the player has seen, for the map's fog of war. */
  seen: string[];
  relics: string[];
  /** Step the last battle ended on. Drives the encounter cooldown. */
  lastBattleStep?: number;
  battle: BattleState | null;
  wild: WildEncounter | null;
  outcome?: ValleyOutcome;
}

/** What a biome is, as data. Adding one is adding an entry here. */
export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  /** 0..1 bands this biome occupies. Overlap is fine — the closest match wins. */
  temperature: number;
  humidity: number;
  /** Ground under everything else. */
  ground: TerrainType;
  /** Ground where the height field dips. */
  lowGround: TerrainType;
  /** What grows on it, with the odds of each per tile. */
  flora: { terrain: TerrainType; chance: number }[];
  /** Resources this biome yields, and how often a node appears. */
  resources: { resource: ResourceType; weight: number }[];
  /** Pokéball plants per chunk, on average. The exploration economy. */
  pokeballDensity: number;
  /** Nudges wild levels: a desert is harsher than a meadow. */
  difficulty: number;
  /** Wild pools, before time and distance filters. */
  encounters: EncounterRule[];
  /** Two colours the map and the renderer tint with. */
  colors: { ground: string; accent: string };
  /** Types that feel at home here — used to flavour, never to gate. */
  affinities: PokeType[];
}
