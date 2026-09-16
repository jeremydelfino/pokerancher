import { useEffect, useRef } from "react";
import { BIOME_BY_ID, CHUNK_SIZE, ChunkCache, type ValleyState } from "@pokerancher/shared";

/**
 * The map, with fog of war.
 *
 * Drawn from the same world the player is walking through — it asks the same
 * generator for the same chunks rather than keeping a second copy of the
 * terrain, so the map can never disagree with the ground.
 *
 * Only chunks in `state.seen` are painted. Everything else stays parchment,
 * because a map that shows you where the forest is before you find it takes the
 * point out of walking there.
 */

const CELL = 7;

export function ValleyMap({ state, size = 260 }: { state: ValleyState; size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<ChunkCache | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!cacheRef.current) cacheRef.current = new ChunkCache(state.seed, 400);
    const cache = cacheRef.current;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Parchment underneath: the unexplored world is paper, not black.
    ctx.fillStyle = "#e8d9b0";
    ctx.fillRect(0, 0, size, size);

    const playerChunk = {
      cx: Math.floor(state.at.x / CHUNK_SIZE),
      cy: Math.floor(state.at.y / CHUNK_SIZE),
    };
    const span = Math.floor(size / CELL / 2);
    const originX = playerChunk.cx - span;
    const originY = playerChunk.cy - span;

    const seen = new Set(state.seen);

    for (let dy = 0; dy <= span * 2; dy++) {
      for (let dx = 0; dx <= span * 2; dx++) {
        const cx = originX + dx;
        const cy = originY + dy;
        if (!seen.has(`${cx},${cy}`)) continue;

        // One colour per chunk, from its centre biome: a map is a summary.
        const chunk = cache.get(cx, cy);
        const biomeId = chunk.biomes[Math.floor((CHUNK_SIZE * CHUNK_SIZE) / 2)];
        ctx.fillStyle = BIOME_BY_ID[biomeId]?.colors.ground ?? "#7fb069";
        ctx.fillRect(dx * CELL, dy * CELL, CELL, CELL);

        // Anything still standing in that chunk earns a dot.
        const left = chunk.features.filter((f) => !state.taken.includes(f.id));
        if (left.some((f) => f.kind === "shrine" || f.kind === "ruins" || f.kind === "cave")) {
          ctx.fillStyle = "#c56bd6";
          ctx.fillRect(dx * CELL + 2, dy * CELL + 2, 3, 3);
        } else if (left.some((f) => f.kind === "camp")) {
          ctx.fillStyle = "#f2b03d";
          ctx.fillRect(dx * CELL + 2, dy * CELL + 2, 3, 3);
        }
      }
    }

    const mark = (cx: number, cy: number, color: string) => {
      const px = (cx - originX) * CELL;
      const py = (cy - originY) * CELL;
      if (px < -CELL || py < -CELL || px > size || py > size) return;
      ctx.fillStyle = "#17111f";
      ctx.fillRect(px - 1, py - 1, CELL + 2, CELL + 2);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, CELL, CELL);
    };

    mark(0, 0, "#96663f"); // the Ranch, always at the origin
    mark(playerChunk.cx, playerChunk.cy, "#e05c72");
  }, [state, size]);

  return <canvas ref={ref} className="valley-map" style={{ width: size, height: size }} />;
}
