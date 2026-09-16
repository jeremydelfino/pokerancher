import { useEffect, useRef } from "react";
import {
  CHUNK_SIZE,
  ChunkCache,
  distanceFromRanch,
  localIndex,
  type BiomeId,
  type TerrainType,
  type ValleyState,
} from "@pokerancher/shared";
import { IS_WATER, paintFor, waterFor } from "./tiles.js";

/**
 * The map.
 *
 * Rebuilt from one colour per *chunk* to one pixel per few *tiles*: a whole
 * 32×32 chunk painted as a single square told you nothing — you could not see a
 * lake, a forest edge or the shape of the coast, which is most of what a map is
 * for. It now samples the real terrain on a stride, so it is a small picture of
 * the world rather than a diagram of the chunk grid.
 *
 * It asks the same generator for the same tiles the world does, so the map can
 * never disagree with the ground under your feet.
 *
 * Only explored chunks are drawn. Everything else stays parchment: a map that
 * shows the forest before you find it takes the point out of walking there.
 */

/** Tiles per map pixel. 2 keeps a lake legible without costing a redraw budget. */
const STRIDE = 2;
const PIXEL = 2;

export function ValleyMap({ state, size = 300 }: { state: ValleyState; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<{ seed: number; cache: ChunkCache } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!cacheRef.current || cacheRef.current.seed !== state.seed) {
      cacheRef.current = { seed: state.seed, cache: new ChunkCache(state.seed, 600) };
    }
    const cache = cacheRef.current.cache;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Parchment underneath: the unknown is paper, not a void.
    ctx.fillStyle = "#e6d5ab";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(150, 120, 70, 0.10)";
    for (let y = 0; y < size; y += 4) ctx.fillRect(0, y, size, 1);

    const seen = new Set(state.seen);
    const span = Math.floor(size / PIXEL / 2);
    const originX = state.at.x - span * STRIDE;
    const originY = state.at.y - span * STRIDE;

    const inChunk = (x: number, y: number) =>
      seen.has(`${Math.floor(x / CHUNK_SIZE)},${Math.floor(y / CHUNK_SIZE)}`);

    for (let py = 0; py < size / PIXEL; py++) {
      for (let px = 0; px < size / PIXEL; px++) {
        const x = originX + px * STRIDE;
        const y = originY + py * STRIDE;
        if (!inChunk(x, y)) continue;

        const chunk = cache.get(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
        const index = localIndex(x, y);
        const terrain = chunk.tiles[index] as TerrainType;
        const biome = chunk.biomes[index] as BiomeId;

        if (IS_WATER(terrain)) {
          const water = waterFor(biome);
          ctx.fillStyle = terrain === "deep_water" ? water.deep[0] : water.shallow[0];
        } else {
          const paint = paintFor(terrain, biome);
          // The mid tone: a map wants the colour of a place, not its texture.
          ctx.fillStyle = paint.ramp[Math.min(paint.ramp.length - 1, 1)];
        }
        ctx.fillRect(px * PIXEL, py * PIXEL, PIXEL, PIXEL);
      }
    }

    // A parchment wash over the whole thing, so it reads as drawn, not rendered.
    ctx.fillStyle = "rgba(198, 160, 96, 0.14)";
    ctx.fillRect(0, 0, size, size);

    /* --- What is worth walking to ----------------------------------------- */
    const pin = (x: number, y: number, fill: string, ring = "#2a2233", r = 3) => {
      const mx = ((x - originX) / STRIDE) * PIXEL;
      const my = ((y - originY) / STRIDE) * PIXEL;
      if (mx < -r || my < -r || mx > size + r || my > size + r) return;
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(mx, my, r + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const taken = new Set(state.taken);
    for (const key of seen) {
      const [cx, cy] = key.split(",").map(Number);
      for (const feature of cache.get(cx, cy).features) {
        if (taken.has(feature.id)) continue;
        if (feature.kind === "camp") pin(feature.at.x, feature.at.y, "#f2b03d");
        else if (feature.kind === "shrine") pin(feature.at.x, feature.at.y, "#d4a0ff", "#2a2233", 4);
        else if (feature.kind === "ruins" || feature.kind === "cave") pin(feature.at.x, feature.at.y, "#b5aec2", "#2a2233", 2.5);
      }
    }

    pin(0, 0, "#c2452f", "#2a2233", 4); // the Ranch, always at the origin

    // The player last, and as an arrow rather than a dot: on a map of your own
    // walk, "where am I" must never take a second look.
    const mx = size / 2;
    const my = size / 2;
    ctx.fillStyle = "#2a2233";
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffdf5";
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0545f";
    ctx.beginPath();
    ctx.arc(mx, my, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, [state, size]);

  return (
    <div className="valley-map-inner">
      <canvas ref={ref} className="valley-map" style={{ width: size, height: size }} />
      <p className="valley-map-legend">
        <span><i className="pin pin-you" /> toi</span>
        <span><i className="pin pin-ranch" /> Ranch</span>
        <span><i className="pin pin-camp" /> camp</span>
        <span><i className="pin pin-rare" /> ruines</span>
        <strong>{distanceFromRanch(state.at).toLocaleString("fr-FR")} m</strong>
      </p>
    </div>
  );
}
