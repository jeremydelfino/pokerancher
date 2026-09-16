import type { TerrainType, TimeOfDay } from "@pokerancher/shared";

/**
 * The palette PokeValley is drawn with.
 *
 * Warm, low-saturation, pixel-art — a cozy afternoon rather than a dungeon.
 * Every terrain is two colours: a base and a speckle drawn on a fixed subset of
 * pixels, which is what stops a field of grass reading as a flat green
 * rectangle without costing a texture.
 */

export type PropKind = "tree" | "rock" | "cactus" | "bush" | "flower";

export interface TilePaint {
  base: string;
  speckle: string;
  /** Drawn standing up on the tile rather than flat. */
  prop?: { color: string; shade: string; kind: PropKind };
}

export const TILE_PAINT: Record<TerrainType, TilePaint> = {
  grass: { base: "#7fb069", speckle: "#8ebd74" },
  tall_grass: { base: "#5f9a5e", speckle: "#76ad6c" },
  dirt: { base: "#a98159", speckle: "#b58e65" },
  sand: { base: "#e2c58c", speckle: "#ecd4a2" },
  snow: { base: "#e9f1f6", speckle: "#f7fbfd" },
  ice: { base: "#b8dce8", speckle: "#cdeaf3" },
  rock: { base: "#9b94a8", speckle: "#aaa3b6", prop: { color: "#8a84a0", shade: "#5b5674", kind: "rock" } },
  water: { base: "#5aa8c4", speckle: "#6fb8d1" },
  deep_water: { base: "#35708f", speckle: "#3e7d9d" },
  tree: { base: "#5f9a5e", speckle: "#6ca568", prop: { color: "#3c6b4a", shade: "#24452f", kind: "tree" } },
  cactus: { base: "#e2c58c", speckle: "#ecd4a2", prop: { color: "#5f9a5e", shade: "#3c6b4a", kind: "cactus" } },
  bush: { base: "#7fb069", speckle: "#8ebd74", prop: { color: "#4d8354", shade: "#2f5a3a", kind: "bush" } },
  flower: { base: "#7fb069", speckle: "#8ebd74", prop: { color: "#e89b72", shade: "#c56bd6", kind: "flower" } },
};

/**
 * The light at a given hour.
 *
 * A wash laid over the whole world rather than per-tile colours: it keeps the
 * four phases to four numbers, and transitions are interpolated so dusk arrives
 * rather than being switched on.
 */
export interface Light {
  tint: string;
  strength: number;
  /** Seen past the edge of the world, and behind the HUD. */
  sky: string;
  label: string;
}

export const LIGHT: Record<TimeOfDay, Light> = {
  morning: { tint: "#ffd479", strength: 0.12, sky: "#f4c48a", label: "Matin" },
  day: { tint: "#fffdf5", strength: 0.06, sky: "#9fdbe8", label: "Journée" },
  evening: { tint: "#e89b72", strength: 0.26, sky: "#e07a86", label: "Soirée" },
  night: { tint: "#24506b", strength: 0.46, sky: "#24204a", label: "Nuit" },
};

/** Blends two hex colours. Used to slide between two phases of the day. */
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
 * The light right now, easing towards the next phase.
 *
 * `within` is 0..1 through the *current* phase. Only the last fifth blends, so
 * dusk creeps in — a hard switch at the boundary is what makes a day/night
 * cycle feel like someone flipping a light.
 */
export function lightAt(time: TimeOfDay, within: number): Light {
  const current = LIGHT[time];
  const next = LIGHT[ORDER[(ORDER.indexOf(time) + 1) % ORDER.length]];

  const t = within < 0.8 ? 0 : (within - 0.8) / 0.2;
  if (t <= 0) return current;

  return {
    tint: mixHex(current.tint, next.tint, t),
    strength: current.strength * (1 - t) + next.strength * t,
    sky: mixHex(current.sky, next.sky, t),
    label: current.label,
  };
}
