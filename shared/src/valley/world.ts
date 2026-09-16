import { BIOME_LIST, BIOMES } from "../data/valley-biomes.js";
import { CHUNK_SIZE, VALLEY_CONFIG } from "../data/valley-config.js";
import { subSeed } from "../rng.js";
import { fbm, ridged, tileHash } from "./noise.js";
import type { BiomeDefinition, BiomeId, TerrainType, Vec2 } from "./types.js";

/**
 * The world, as a pure function of (seed, x, y).
 *
 * Nothing here holds state and nothing here knows about chunks. Ask what is at
 * a tile and you get the same answer every time, from anywhere, forever — which
 * is what lets the server verify a position it never generated and the client
 * draw a chunk the server has never sent.
 *
 * Chunks are a *cache shape* layered on top (chunk.ts), not a generation unit.
 */

/** Independent noise fields. Same seed, different streams — never correlated. */
const FIELD = {
  height: 1,
  temperature: 2,
  humidity: 3,
  detail: 4,
  water: 5,
} as const;

/** Broad enough that a biome is a place you walk through, not a tile you cross. */
const SCALE = {
  height: 140,
  temperature: 320,
  humidity: 260,
  detail: 26,
  water: 90,
} as const;

export interface WorldSample {
  height: number;
  temperature: number;
  humidity: number;
  biome: BiomeDefinition;
  /** 0..1 — how firmly this tile belongs to its biome rather than a neighbour.
   *  Low values are the transition band, where flora thins out. */
  affinity: number;
  terrain: TerrainType;
}

/**
 * The climate at a tile.
 *
 * Temperature drifts with latitude as well as noise, so the world has a *shape*
 * — head north far enough and you find snow, rather than four biomes shuffled
 * at random forever. The noise keeps it from being four stripes.
 */
export function climateAt(seed: number, x: number, y: number): { temperature: number; humidity: number } {
  const latitude = Math.max(-1, Math.min(1, y / 2600));
  const drift = latitude * 0.34;

  const temperature = clamp01(
    ridged(fbm(subSeed(seed, FIELD.temperature), x, y, { scale: SCALE.temperature, octaves: 3 })) - drift
  );
  const humidity = clamp01(
    ridged(fbm(subSeed(seed, FIELD.humidity), x, y, { scale: SCALE.humidity, octaves: 3 }))
  );

  return { temperature, humidity };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Squared distance in climate space. The closest biome to the local climate wins. */
function climateDistance(biome: BiomeDefinition, temperature: number, humidity: number): number {
  const dt = biome.temperature - temperature;
  const dh = biome.humidity - humidity;
  return dt * dt + dh * dh;
}

/**
 * Which biome a tile belongs to, and how firmly.
 *
 * Picking the nearest biome in (temperature, humidity) space is what makes
 * transitions gradual for free: the climate fields are smooth, so the winner
 * changes at a contour line rather than at a chunk border. `affinity` is how
 * much better the winner is than the runner-up — near a contour it approaches
 * zero, and that is exactly where the generator thins the trees out so the edge
 * of a forest reads as an edge instead of a wall.
 */
export function biomeAt(
  seed: number,
  x: number,
  y: number,
  /** Pass a climate you already sampled: it is the expensive half of this call,
   *  and generating a chunk asks for both. */
  climate = climateAt(seed, x, y)
): { biome: BiomeDefinition; affinity: number } {
  const { temperature, humidity } = climate;

  let best = BIOME_LIST[0];
  let bestD = Infinity;
  let secondD = Infinity;

  for (const biome of BIOME_LIST) {
    const d = climateDistance(biome, temperature, humidity);
    if (d < bestD) {
      secondD = bestD;
      bestD = d;
      best = biome;
    } else if (d < secondD) {
      secondD = d;
    }
  }

  // 0 at a perfect tie, towards 1 deep inside a biome.
  const affinity = secondD === Infinity ? 1 : clamp01((secondD - bestD) / 0.06);
  return { biome: best, affinity };
}

/** Everything about one tile, in one pass. */
export function sampleWorld(seed: number, x: number, y: number): WorldSample {
  const climate = climateAt(seed, x, y);
  const { biome, affinity } = biomeAt(seed, x, y, climate);
  const height = fbm(subSeed(seed, FIELD.height), x, y, { scale: SCALE.height, octaves: 4 });

  return {
    height,
    temperature: climate.temperature,
    humidity: climate.humidity,
    biome,
    affinity,
    terrain: terrainAt(seed, x, y, biome, affinity, height),
  };
}

/**
 * Water, carved across the world rather than per chunk.
 *
 * A ridge of noise near its midline gives long winding bands — rivers that run
 * for hundreds of tiles and cross chunk borders without either side matching
 * anything up. The height field pushes lakes into the dips.
 */
function waterAt(seed: number, x: number, y: number, height: number): TerrainType | null {
  const river = fbm(subSeed(seed, FIELD.water), x, y, { scale: SCALE.water, octaves: 3 });
  const fromMid = Math.abs(river - 0.5);

  // These thresholds are measured, not guessed. fbm is bell-shaped around 0.5,
  // so a band around the midline over-selects badly: 0.012/0.028 looked narrow
  // and put a fifth of the world under water. Sampling the real distribution
  // puts |river - 0.5| < 0.0028 at about 1.5 % of tiles and < 0.0075 at 4 %,
  // which gives a river you cross rather than a coast you walk around.
  if (fromMid < 0.0028) return "deep_water";
  if (fromMid < 0.0075) return "water";

  // Lakes sit in the dips. The height field's 2nd percentile is 0.21.
  if (height < 0.21) return height < 0.19 ? "deep_water" : "water";
  return null;
}

/**
 * The terrain on a tile.
 *
 * Layered: water first (it wins over everything), then the biome's ground, then
 * whatever grows on it. Flora is rolled from `tileHash`, which is uncorrelated
 * with the terrain fields — otherwise every tree in the world would line up
 * along the same contours.
 */
export function terrainAt(
  seed: number,
  x: number,
  y: number,
  biome: BiomeDefinition = biomeAt(seed, x, y).biome,
  affinity: number = biomeAt(seed, x, y).affinity,
  height: number = fbm(subSeed(seed, FIELD.height), x, y, { scale: SCALE.height, octaves: 4 })
): TerrainType {
  const water = waterAt(seed, x, y, height);
  if (water) return water;

  // The clearing left for the Ranch gate, so a run never opens inside a tree.
  if (Math.abs(x) <= 2 && Math.abs(y) <= 2) return "grass";

  const ground = height < 0.36 ? biome.lowGround : biome.ground;

  // Detail noise clumps the vegetation instead of peppering it evenly: a forest
  // wants thickets and clearings, not a uniform scatter of trees.
  const clump = fbm(subSeed(seed, FIELD.detail), x, y, { scale: SCALE.detail, octaves: 2 });

  // In the transition band, flora gives way. This is what makes one biome fade
  // into the next rather than stopping at a line.
  const density = 0.35 + 0.65 * affinity;

  let roll = tileHash(seed, x, y, 77);
  for (const { terrain, chance } of biome.flora) {
    const threshold = chance * density * (0.55 + clump);
    if (roll < threshold) return terrain;
    roll -= threshold;
  }

  return ground;
}

/* --- Coordinates ---------------------------------------------------------- */

export const chunkOf = (x: number, y: number) => ({
  cx: Math.floor(x / CHUNK_SIZE),
  cy: Math.floor(y / CHUNK_SIZE),
});

export const chunkKey = (cx: number, cy: number) => `${cx},${cy}`;

/** Local index inside a chunk, handling negatives (JS `%` does not). */
export const localIndex = (x: number, y: number) => {
  const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return ly * CHUNK_SIZE + lx;
};

/** Metres from the Ranch, which stands at the origin. */
export function distanceFromRanch(at: Vec2): number {
  return Math.round(Math.hypot(at.x, at.y) * VALLEY_CONFIG.metresPerTile);
}

export const BIOME_BY_ID = BIOMES as Record<BiomeId, BiomeDefinition>;
