import type { BiomeId, TerrainType, TimeOfDay } from "@pokerancher/shared";

/**
 * How PokeValley is painted.
 *
 * The first pass gave every terrain one global colour, so grass in the forest
 * was the same green as grass in the plains and the four biomes read as one
 * beige-and-green smear. Colour is now chosen by **(terrain, biome)**, and each
 * combination carries a *ramp* of three or four tones rather than one: a slow
 * noise picks which tone a tile takes, so ground reads as patches of light and
 * shade instead of a flat rectangle with dots on it.
 *
 * Cozy means warm and low-contrast. No pure blacks, no full-saturation greens.
 */

export type PropKind = "tree" | "pine" | "rock" | "cactus" | "bush" | "flower" | "tuft" | "reed";

export interface PropArt {
  kind: PropKind;
  body: string;
  shade: string;
  light: string;
}

export interface TerrainPaint {
  /** Three or four close tones. A slow noise picks which one a tile takes. */
  ramp: string[];
  /** Drawn standing on the tile, with a shadow, sorted back to front. */
  prop?: PropArt;
}

/**
 * A biome declares its ground ONCE.
 *
 * ⚠️ This is the shape that matters. The first pass let every terrain carry its
 * own ramp, so a `tree` tile painted its own green before the tree went on top
 * — and every prop in the world sat on a visible square of slightly different
 * colour. Ground now comes from the biome and props only carry their drawing,
 * which is the difference between "a meadow with trees in it" and "a grid".
 */
interface BiomeArt {
  /** The ground everywhere above the low-water mark. */
  ground: string[];
  /** The ground in the dips. */
  low: string[];
  /** Which art each prop terrain gets here. */
  props: Partial<Record<TerrainType, PropArt>>;
}

const BIOME_ART: Record<BiomeId, BiomeArt> = {
  plains: {
    ground: ["#79ae63", "#7fb368", "#86b96e", "#8dbf75"],
    low: ["#b5905f", "#bb9668", "#c19c70"],
    props: {
      tall_grass: { kind: "tuft", body: "#4e8446", shade: "#3b6a37", light: "#84b46f" },
      flower: { kind: "flower", body: "#f0a5b6", shade: "#d4738d", light: "#fff0b8" },
      bush: { kind: "bush", body: "#4e8446", shade: "#39643a", light: "#6da95c" },
      tree: { kind: "tree", body: "#4a8a4d", shade: "#31603a", light: "#69ac5e" },
      rock: { kind: "rock", body: "#a99177", shade: "#7d6a55", light: "#c7b096" },
    },
  },

  forest: {
    ground: ["#51874f", "#578d54", "#5d9359", "#63995e"],
    low: ["#74604a", "#7b6750", "#826e57"],
    props: {
      tall_grass: { kind: "tuft", body: "#356237", shade: "#274b2c", light: "#5b9152" },
      flower: { kind: "flower", body: "#d9b0e8", shade: "#a878c4", light: "#fff3c4" },
      bush: { kind: "bush", body: "#35633a", shade: "#234529", light: "#4f8a4a" },
      tree: { kind: "pine", body: "#2f5c37", shade: "#1e3f28", light: "#457c45" },
      rock: { kind: "rock", body: "#8d8375", shade: "#675f55", light: "#aca396" },
    },
  },

  desert: {
    ground: ["#dfc088", "#e5c790", "#eace98", "#efd5a1"],
    low: ["#c9a87a", "#cfaf81", "#d5b689"],
    props: {
      tall_grass: { kind: "tuft", body: "#a89152", shade: "#8a7440", light: "#ceb87a" },
      rock: { kind: "rock", body: "#a99177", shade: "#7d6a55", light: "#c7b096" },
      cactus: { kind: "cactus", body: "#5f9a5e", shade: "#40734a", light: "#7fb66e" },
      tree: { kind: "tree", body: "#8a9a5b", shade: "#65713f", light: "#a8b578" },
      bush: { kind: "bush", body: "#9aa361", shade: "#767d47", light: "#b7bd85" },
      flower: { kind: "flower", body: "#f2b03d", shade: "#c98a26", light: "#ffe9a8" },
    },
  },

  snow: {
    ground: ["#e4eef4", "#eaf2f8", "#f0f6fa", "#f6fafd"],
    low: ["#bcdae9", "#c3e0ed", "#cae5f0"],
    props: {
      tall_grass: { kind: "reed", body: "#8fae9a", shade: "#6a8a78", light: "#b6cebb" },
      rock: { kind: "rock", body: "#a3aebb", shade: "#7a8695", light: "#c4cdd7" },
      tree: { kind: "pine", body: "#3d6a55", shade: "#274a3c", light: "#d8ebef" },
      bush: { kind: "bush", body: "#9fb8ae", shade: "#78928a", light: "#cfe0da" },
      flower: { kind: "flower", body: "#cfe0ff", shade: "#9ab4e0", light: "#ffffff" },
      cactus: { kind: "cactus", body: "#6f8f7c", shade: "#4e6a5c", light: "#9ab8a6" },
    },
  },
};

/** Terrains whose ground is the biome's low ground rather than its high ground. */
const LOW_TERRAIN: readonly TerrainType[] = ["dirt", "ice"];

/**
 * What to paint a tile with.
 *
 * The ground always comes from the biome — never from the terrain — so a tuft
 * of grass and the bare ground beside it are the same colour, and the world
 * stops looking like a spreadsheet.
 */
export function paintFor(terrain: TerrainType, biome: BiomeId): TerrainPaint {
  const art = BIOME_ART[biome] ?? BIOME_ART.plains;
  const ramp = LOW_TERRAIN.includes(terrain) ? art.low : art.ground;
  return { ramp, prop: art.props[terrain] };
}

/** Water is the world's, not a biome's — it only tints with the local light. */
const WATER: Record<BiomeId, { deep: string[]; shallow: string[]; foam: string }> = {
  plains: { deep: ["#3a7fa3", "#428bb0"], shallow: ["#5fa8c6", "#6fb6d2"], foam: "#cfeaf3" },
  forest: { deep: ["#2f6d8c", "#377897"], shallow: ["#5197b4", "#5fa4c0"], foam: "#bfe0ea" },
  desert: { deep: ["#3d8fa8", "#479bb4"], shallow: ["#6cb9cd", "#7cc6d8"], foam: "#e2f3f6" },
  snow: { deep: ["#4a7f9b", "#548ba7"], shallow: ["#79aec6", "#89bcd2"], foam: "#f0fbff" },
};

export function waterFor(biome: BiomeId) {
  return WATER[biome] ?? WATER.plains;
}

/** Terrain that behaves like open water when deciding shorelines. */
export const IS_WATER = (t: TerrainType) => t === "water" || t === "deep_water";

/* --- Light ---------------------------------------------------------------- */

export interface Light {
  /** Colour washed over the world. */
  tint: string;
  strength: number;
  /** Behind the world, and the colour the vignette leans towards. */
  sky: string;
  /** How dark the corners go. Night closes in; noon barely does. */
  vignette: number;
  label: string;
  /** What drifts through the air at this hour. */
  motes: "pollen" | "fireflies" | "none";
}

export const LIGHT: Record<TimeOfDay, Light> = {
  morning: { tint: "#ffd9a0", strength: 0.14, sky: "#f6d2a4", vignette: 0.14, label: "Matin", motes: "pollen" },
  day: { tint: "#fff8e0", strength: 0.05, sky: "#a8dcea", vignette: 0.1, label: "Journée", motes: "pollen" },
  evening: { tint: "#f0956f", strength: 0.24, sky: "#e8846f", vignette: 0.2, label: "Soirée", motes: "fireflies" },
  night: { tint: "#3b5a86", strength: 0.44, sky: "#232a4c", vignette: 0.34, label: "Nuit", motes: "fireflies" },
};

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

const ORDER: TimeOfDay[] = ["morning", "day", "evening", "night"];

/**
 * The light right now, easing into the next phase.
 *
 * `within` is 0..1 through the *current* phase, and only its last third blends.
 * Dusk has to creep in — a hard switch at the boundary is what makes a day/night
 * cycle feel like someone flipping a switch.
 */
export function lightAt(time: TimeOfDay, within: number): Light {
  const current = LIGHT[time];
  const next = LIGHT[ORDER[(ORDER.indexOf(time) + 1) % ORDER.length]];

  const t = within < 0.66 ? 0 : (within - 0.66) / 0.34;
  if (t <= 0) return current;

  return {
    tint: mixHex(current.tint, next.tint, t),
    strength: current.strength * (1 - t) + next.strength * t,
    sky: mixHex(current.sky, next.sky, t),
    vignette: current.vignette * (1 - t) + next.vignette * t,
    label: current.label,
    motes: t > 0.5 ? next.motes : current.motes,
  };
}
