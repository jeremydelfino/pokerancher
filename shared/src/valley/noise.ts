import { subSeed } from "../rng.js";

/**
 * Deterministic value noise, sampled in WORLD coordinates.
 *
 * This is the single rule the whole world rests on: nothing is ever generated
 * "per chunk". Every query is `(seed, worldX, worldY)`, so a river that reaches
 * the right edge of chunk (0,0) keeps flowing into chunk (1,0) without either
 * chunk knowing the other exists. Generate a chunk in isolation and you get
 * seams; generate from world coordinates and continuity is free.
 *
 * Value noise rather than Perlin/simplex on purpose: it is a dozen lines, has
 * no gradient table to keep in sync, and at the scales this game samples (a
 * biome is hundreds of tiles across) the difference is invisible. What matters
 * is that it is smooth and reproducible, and both are easy to test.
 */

/** Hash a lattice point to [0,1). Pure: same inputs, same output, forever. */
function latticeValue(seed: number, x: number, y: number): number {
  // `| 0` keeps negative coordinates working: the world extends in every
  // direction, so x = -4001 has to hash as reliably as x = 4001.
  const h = subSeed(seed, x | 0, y | 0);
  return h / 4294967296;
}

/** Smoothstep. Linear interpolation leaves visible creases on the lattice. */
const fade = (t: number) => t * t * (3 - 2 * t);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * One octave of smooth noise at `frequency` tiles per lattice cell.
 *
 * Returns 0..1. Larger `scale` means broader features: 200 gives continents,
 * 8 gives clumps of grass.
 */
export function noise2D(seed: number, x: number, y: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;

  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = fade(sx - x0);
  const fy = fade(sy - y0);

  const v00 = latticeValue(seed, x0, y0);
  const v10 = latticeValue(seed, x0 + 1, y0);
  const v01 = latticeValue(seed, x0, y0 + 1);
  const v11 = latticeValue(seed, x0 + 1, y0 + 1);

  return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
}

export interface FbmOptions {
  /** Tiles per lattice cell at the first octave. */
  scale: number;
  /** How many octaves to stack. Each one is finer and quieter. */
  octaves?: number;
  /** How much quieter each octave is than the last. */
  persistence?: number;
  /** How much finer each octave is than the last. */
  lacunarity?: number;
}

/**
 * Fractal noise: a few octaves of `noise2D` stacked.
 *
 * One octave is too smooth to look like terrain — it gives rolling blobs with
 * no detail. Three or four give a coastline that is broad at a distance and
 * ragged up close, which is what makes a world worth walking across.
 *
 * Normalised back to 0..1 by the total amplitude, so callers can compare the
 * result against thresholds without knowing the octave count.
 */
export function fbm(seed: number, x: number, y: number, options: FbmOptions): number {
  const { scale, octaves = 4, persistence = 0.5, lacunarity = 2 } = options;

  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    // Each octave gets its own stream, or they would all be the same field
    // scaled differently and the detail would rhyme with the shape.
    total += noise2D(subSeed(seed, i + 1), x * frequency, y * frequency, scale) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / max;
}

/**
 * Noise pushed towards 0 and 1, away from the middle.
 *
 * Raw fbm clusters around 0.5, so a threshold at 0.5 produces a world that is
 * half one thing and half another with a mush of transition between. Biomes
 * read better when each one has a confident middle.
 */
export function ridged(value: number, strength = 1.6): number {
  const centred = (value - 0.5) * 2;
  const pushed = Math.sign(centred) * Math.pow(Math.abs(centred), 1 / strength);
  return (pushed + 1) / 2;
}

/**
 * A stable pseudo-random value for one world tile, independent of the noise
 * fields.
 *
 * Decoration ("is there a flower on this exact tile?") wants to be uncorrelated
 * with terrain, and wants to stay put when the player walks away and comes
 * back. This is the hash to use for anything placed per tile.
 */
export function tileHash(seed: number, x: number, y: number, salt = 0): number {
  return subSeed(seed, x | 0, y | 0, salt) / 4294967296;
}
