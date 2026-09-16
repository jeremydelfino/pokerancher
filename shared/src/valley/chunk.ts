import { CHUNK_SIZE, VALLEY_CONFIG } from "../data/valley-config.js";
import { makeRng, pickWeighted, subSeed } from "../rng.js";
import type { Chunk, Feature, FeatureKind, TerrainType, Vec2 } from "./types.js";
import { SOLID_TERRAIN } from "./types.js";
import { biomeAt, chunkKey, sampleWorld } from "./world.js";

/**
 * Chunks: a cache shape, not a generation unit.
 *
 * Every tile still comes from `sampleWorld(seed, worldX, worldY)` — the chunk
 * just decides which 1 024 of them to compute at once. That is the whole reason
 * rivers and forests cross borders seamlessly: no chunk ever generates anything
 * "of its own".
 *
 * Features are the one thing placed *per chunk*, because "how many Pokéball
 * plants are in this square" is a per-square question. They still hash off the
 * chunk coordinates, so they land in the same spots every time you walk back.
 */

const FEATURE_STREAM = 0x5eed;

/** A feature's id is derived from where it is, so it survives regeneration. */
const featureId = (kind: FeatureKind, at: Vec2) => `${kind}@${at.x},${at.y}`;

const STRUCTURE_LABEL: Record<FeatureKind, string> = {
  resource: "Ressource",
  pokeball_plant: "Plant à Pokéballs",
  chest: "Coffre",
  camp: "Camp",
  cave: "Grotte",
  ruins: "Ruines",
  shrine: "Sanctuaire",
};

/** Somewhere in this chunk that is not solid rock, water or a tree. */
function findOpenTile(
  seed: number,
  cx: number,
  cy: number,
  rng: () => number,
  attempts = 12
): Vec2 | null {
  for (let i = 0; i < attempts; i++) {
    const x = cx * CHUNK_SIZE + Math.floor(rng() * CHUNK_SIZE);
    const y = cy * CHUNK_SIZE + Math.floor(rng() * CHUNK_SIZE);
    const { terrain } = sampleWorld(seed, x, y);
    if (!SOLID_TERRAIN.includes(terrain) && terrain !== "water") return { x, y };
  }
  return null;
}

/**
 * What is worth stopping for in this chunk.
 *
 * Deterministic from (seed, chunk), so a cave you saw and walked past is still
 * there when you come back, and a shrine sits at one fixed place in a given
 * seed — which is the whole point of sharing a seed.
 */
export function generateFeatures(seed: number, cx: number, cy: number): Feature[] {
  const rng = makeRng(subSeed(seed, FEATURE_STREAM, cx, cy));
  const { biome } = biomeAt(seed, cx * CHUNK_SIZE + CHUNK_SIZE / 2, cy * CHUNK_SIZE + CHUNK_SIZE / 2);
  const features: Feature[] = [];

  const place = (kind: FeatureKind, resource?: Feature["resource"]) => {
    const at = findOpenTile(seed, cx, cy, rng);
    if (!at) return;
    // Two features never share a tile: the second one would be unreachable.
    if (features.some((f) => f.at.x === at.x && f.at.y === at.y)) return;
    features.push({ id: featureId(kind, at), kind, at, resource, label: STRUCTURE_LABEL[kind] });
  };

  // Pokéballs first: they are the run's economy, and a biome that gives none is
  // a biome you have to leave.
  const plants = Math.floor(biome.pokeballDensity) + (rng() < biome.pokeballDensity % 1 ? 1 : 0);
  for (let i = 0; i < plants; i++) place("pokeball_plant");

  // Resource nodes, weighted by what the biome actually produces.
  const nodes = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < nodes; i++) {
    const pickRes = pickWeighted(biome.resources, (r) => r.weight, rng);
    place("resource", pickRes.resource);
  }

  // Structures, rarest last so an early `place` never eats the shrine's tile.
  const { structures } = VALLEY_CONFIG;
  if (rng() < structures.chest) place("chest");
  if (rng() < structures.camp) place("camp");
  if (rng() < structures.cave) place("cave");
  if (rng() < structures.ruins) place("ruins");
  if (rng() < structures.shrine) place("shrine");

  return features;
}

/** One chunk, fully realised. Cheap enough to regenerate rather than store. */
export function generateChunk(seed: number, cx: number, cy: number): Chunk {
  const tiles: TerrainType[] = new Array(CHUNK_SIZE * CHUNK_SIZE);
  const biomes: Chunk["biomes"] = new Array(CHUNK_SIZE * CHUNK_SIZE);

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const x = cx * CHUNK_SIZE + lx;
      const y = cy * CHUNK_SIZE + ly;
      const sample = sampleWorld(seed, x, y);
      const i = ly * CHUNK_SIZE + lx;
      tiles[i] = sample.terrain;
      biomes[i] = sample.biome.id;
    }
  }

  return { cx, cy, tiles, biomes, features: generateFeatures(seed, cx, cy) };
}

/**
 * A bounded cache of generated chunks.
 *
 * The world is endless, so the only question that matters is what to throw
 * away. Least-recently-touched, with a hard cap: walking in a straight line for
 * an hour must not grow the heap. Anything evicted regenerates identically, so
 * eviction is never observable.
 */
export class ChunkCache {
  private readonly chunks = new Map<string, Chunk>();

  constructor(
    private readonly seed: number,
    private readonly limit = VALLEY_CONFIG.cacheLimit
  ) {}

  get(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    const hit = this.chunks.get(key);
    if (hit) {
      // Map preserves insertion order, so re-inserting marks it as freshest.
      this.chunks.delete(key);
      this.chunks.set(key, hit);
      return hit;
    }

    const chunk = generateChunk(this.seed, cx, cy);
    this.chunks.set(key, chunk);

    while (this.chunks.size > this.limit) {
      const oldest = this.chunks.keys().next().value;
      if (oldest === undefined) break;
      this.chunks.delete(oldest);
    }

    return chunk;
  }

  /** The window around a position, for a renderer to draw. */
  around(at: Vec2, radius = VALLEY_CONFIG.loadRadius): Chunk[] {
    const cx = Math.floor(at.x / CHUNK_SIZE);
    const cy = Math.floor(at.y / CHUNK_SIZE);
    const out: Chunk[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) out.push(this.get(cx + dx, cy + dy));
    }
    return out;
  }

  get size(): number {
    return this.chunks.size;
  }
}
