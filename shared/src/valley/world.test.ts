import { describe, expect, it } from "vitest";
import { CHUNK_SIZE } from "../data/valley-config.js";
import { BIOME_LIST } from "../data/valley-biomes.js";
import { ChunkCache, generateChunk, generateFeatures } from "./chunk.js";
import { fbm, noise2D, tileHash } from "./noise.js";
import { biomeAt, chunkOf, distanceFromRanch, localIndex, sampleWorld, terrainAt } from "./world.js";

const SEED = 0x51d3;

describe("noise", () => {
  it("gives the same value for the same coordinates, always", () => {
    for (const [x, y] of [[0, 0], [37, -412], [-9001, 2], [123456, -654321]]) {
      const a = noise2D(SEED, x, y, 64);
      const b = noise2D(SEED, x, y, 64);
      expect(b).toBe(a);
    }
  });

  it("stays inside 0..1", () => {
    for (let i = 0; i < 400; i++) {
      const x = (i * 977) % 4001 - 2000;
      const y = (i * 613) % 4001 - 2000;
      const v = fbm(SEED, x, y, { scale: 90 });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is smooth — neighbouring tiles never jump", () => {
    // The test that catches a hash used where interpolation was meant: white
    // noise would fail this on the first pair.
    let worst = 0;
    for (let x = -200; x < 200; x++) {
      const a = fbm(SEED, x, 17, { scale: 120, octaves: 3 });
      const b = fbm(SEED, x + 1, 17, { scale: 120, octaves: 3 });
      worst = Math.max(worst, Math.abs(a - b));
    }
    expect(worst).toBeLessThan(0.1);
  });

  it("gives different worlds for different seeds", () => {
    const a = fbm(1, 100, 100, { scale: 64 });
    const b = fbm(2, 100, 100, { scale: 64 });
    expect(a).not.toBe(b);
  });

  it("hashes negative coordinates as reliably as positive ones", () => {
    expect(tileHash(SEED, -5, -9)).toBe(tileHash(SEED, -5, -9));
    expect(tileHash(SEED, -5, -9)).not.toBe(tileHash(SEED, 5, 9));
  });
});

describe("determinism", () => {
  it("returns the same tile for the same seed and coordinates", () => {
    // The promise a shared seed rests on.
    for (const [x, y] of [[0, 0], [412, -77], [-3000, 1500], [99999, 99999]]) {
      expect(terrainAt(SEED, x, y)).toBe(terrainAt(SEED, x, y));
      expect(biomeAt(SEED, x, y).biome.id).toBe(biomeAt(SEED, x, y).biome.id);
    }
  });

  it("regenerates a chunk identically after it is evicted", () => {
    const cache = new ChunkCache(SEED, 4);
    const first = cache.get(3, 3);
    const tiles = [...first.tiles];
    const featureIds = first.features.map((f) => f.id);

    // Walk far enough to push it out of a four-chunk cache, then come back.
    for (let i = 0; i < 20; i++) cache.get(50 + i, 50 + i);
    const again = cache.get(3, 3);

    expect(again.tiles).toEqual(tiles);
    expect(again.features.map((f) => f.id)).toEqual(featureIds);
  });

  it("never grows past its cache limit", () => {
    const cache = new ChunkCache(SEED, 12);
    for (let i = 0; i < 300; i++) cache.get(i, i * 2);
    expect(cache.size).toBeLessThanOrEqual(12);
  });
});

describe("continuity across chunk borders", () => {
  it("draws the same tile whichever chunk asks for it", () => {
    // A tile on the seam belongs to exactly one chunk, but the world function
    // must not care: this is what stops rivers ending at a chunk edge.
    const chunkA = generateChunk(SEED, 0, 0);
    const chunkB = generateChunk(SEED, 1, 0);

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const lastOfA = chunkA.tiles[ly * CHUNK_SIZE + (CHUNK_SIZE - 1)];
      const firstOfB = chunkB.tiles[ly * CHUNK_SIZE];
      expect(lastOfA).toBe(terrainAt(SEED, CHUNK_SIZE - 1, ly));
      expect(firstOfB).toBe(terrainAt(SEED, CHUNK_SIZE, ly));
    }
  });

  it("keeps water flowing from one chunk into the next", () => {
    // Find a seam tile that is water and check its neighbour across the border
    // is water too, far more often than chance would give.
    let seamWater = 0;
    let continued = 0;
    for (let y = -400; y < 400; y++) {
      if (terrainAt(SEED, CHUNK_SIZE - 1, y).includes("water")) {
        seamWater++;
        if (terrainAt(SEED, CHUNK_SIZE, y).includes("water")) continued++;
      }
    }
    expect(seamWater).toBeGreaterThan(5);
    expect(continued / seamWater).toBeGreaterThan(0.75);
  });

  it("maps world coordinates into a chunk the same way in both directions", () => {
    for (const [x, y] of [[0, 0], [31, 31], [32, 32], [-1, -1], [-33, 64]]) {
      const { cx, cy } = chunkOf(x, y);
      const chunk = generateChunk(SEED, cx, cy);
      expect(chunk.tiles[localIndex(x, y)]).toBe(terrainAt(SEED, x, y));
    }
  });
});

describe("biomes", () => {
  it("produces every MVP biome somewhere in the world", () => {
    const seen = new Set<string>();
    for (let y = -3000; y <= 3000; y += 120) {
      for (let x = -3000; x <= 3000; x += 120) seen.add(biomeAt(SEED, x, y).biome.id);
    }
    for (const biome of BIOME_LIST) expect(seen, `${biome.id} introuvable`).toContain(biome.id);
  });

  it("changes biome gradually, not tile by tile", () => {
    // Walking a straight line should cross a handful of biomes, not hundreds.
    let switches = 0;
    let previous = biomeAt(SEED, -1500, 40).biome.id;
    for (let x = -1500; x < 1500; x++) {
      const now = biomeAt(SEED, x, 40).biome.id;
      if (now !== previous) switches++;
      previous = now;
    }
    expect(switches).toBeGreaterThan(0);
    expect(switches).toBeLessThan(30);
  });

  it("thins the vegetation out in the transition band", () => {
    // Affinity is what the generator uses to fade one biome into the next;
    // if it were always 1 there would be no transition at all.
    let low = 0;
    for (let x = -800; x < 800; x += 3) {
      if (biomeAt(SEED, x, 120).affinity < 0.5) low++;
    }
    expect(low).toBeGreaterThan(0);
  });

  it("leaves the Ranch gate walkable", () => {
    // A run that opens inside a tree is a run that cannot start.
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) expect(terrainAt(SEED, x, y)).toBe("grass");
    }
  });
});

describe("features", () => {
  it("places the same features in the same spots every time", () => {
    const a = generateFeatures(SEED, 5, -3);
    const b = generateFeatures(SEED, 5, -3);
    expect(b).toEqual(a);
  });

  it("never puts two features on one tile", () => {
    for (let cx = 0; cx < 12; cx++) {
      const features = generateFeatures(SEED, cx, 4);
      const tiles = features.map((f) => `${f.at.x},${f.at.y}`);
      expect(new Set(tiles).size).toBe(tiles.length);
    }
  });

  it("never places a feature on a tile you cannot stand on", () => {
    for (let cx = -6; cx < 6; cx++) {
      for (const feature of generateFeatures(SEED, cx, 2)) {
        const terrain = sampleWorld(SEED, feature.at.x, feature.at.y).terrain;
        expect(["tree", "rock", "cactus", "deep_water", "water"], feature.id).not.toContain(terrain);
      }
    }
  });

  it("gives a forest more Pokéball plants than a desert", () => {
    // The exploration economy: where you refill has to depend on where you are.
    const count = (biomeId: string) => {
      let plants = 0;
      let chunks = 0;
      for (let cx = -40; cx < 40; cx++) {
        for (let cy = -40; cy < 40; cy += 7) {
          const mid = biomeAt(SEED, cx * CHUNK_SIZE + 16, cy * CHUNK_SIZE + 16).biome.id;
          if (mid !== biomeId) continue;
          chunks++;
          plants += generateFeatures(SEED, cx, cy).filter((f) => f.kind === "pokeball_plant").length;
        }
      }
      return chunks > 0 ? plants / chunks : 0;
    };
    expect(count("forest")).toBeGreaterThan(count("desert"));
  });
});

describe("distance", () => {
  it("counts metres from the Ranch at the origin", () => {
    expect(distanceFromRanch({ x: 0, y: 0 })).toBe(0);
    expect(distanceFromRanch({ x: 3, y: 4 })).toBe(20); // 5 tiles × 4 m
    expect(distanceFromRanch({ x: -250, y: 0 })).toBe(1000);
  });
});
