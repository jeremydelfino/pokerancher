import { useEffect, useRef } from "react";
import {
  ChunkCache,
  CHUNK_SIZE,
  dayProgress,
  distanceFromRanch,
  localIndex,
  tileHash,
  timeOfDay,
  type Feature,
  type TerrainType,
  type ValleyState,
} from "@pokerancher/shared";
import { lightAt, TILE_PAINT, type PropKind } from "./tiles.js";

/**
 * The world, drawn.
 *
 * The client generates its own tiles from the seed rather than receiving them:
 * the server and the client run the identical pure function, so what is drawn
 * is what the server believes. That is the trick that makes an endless world
 * playable over HTTP — the only thing on the wire is a position.
 *
 * Everything is integer-aligned and drawn with `imageSmoothingEnabled = false`:
 * a pixel-art world that lands on half pixels turns to mush.
 */

const TILE = 24;

/** Speckle pattern per tile, stable so the ground does not shimmer as you walk. */
function speckled(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, px: number, py: number, paint: { base: string; speckle: string }) {
  ctx.fillStyle = paint.base;
  ctx.fillRect(px, py, TILE, TILE);

  ctx.fillStyle = paint.speckle;
  const h = tileHash(seed, x, y, 3);
  const dots = 2 + Math.floor(h * 3);
  for (let i = 0; i < dots; i++) {
    const hx = tileHash(seed, x, y, 10 + i);
    const hy = tileHash(seed, x, y, 40 + i);
    ctx.fillRect(px + Math.floor(hx * (TILE - 4)), py + Math.floor(hy * (TILE - 4)), 3, 3);
  }
}

/** The things that stand up. Drawn tall so the world has a horizon, not a grid. */
function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, color: string, shade: string, px: number, py: number, bob: number) {
  const b = Math.round(bob);
  switch (kind) {
    case "tree":
      ctx.fillStyle = shade;
      ctx.fillRect(px + 10, py + 12, 4, 10);
      ctx.fillStyle = color;
      ctx.fillRect(px + 3, py - 4 + b, 18, 16);
      ctx.fillRect(px + 6, py - 9 + b, 12, 6);
      ctx.fillStyle = shade;
      ctx.fillRect(px + 3, py + 8 + b, 18, 3);
      break;
    case "bush":
      ctx.fillStyle = color;
      ctx.fillRect(px + 4, py + 8 + b, 16, 11);
      ctx.fillRect(px + 7, py + 4 + b, 10, 5);
      ctx.fillStyle = shade;
      ctx.fillRect(px + 4, py + 16 + b, 16, 3);
      break;
    case "rock":
      ctx.fillStyle = color;
      ctx.fillRect(px + 4, py + 9, 16, 11);
      ctx.fillRect(px + 8, py + 5, 9, 5);
      ctx.fillStyle = shade;
      ctx.fillRect(px + 4, py + 17, 16, 3);
      break;
    case "cactus":
      ctx.fillStyle = color;
      ctx.fillRect(px + 10, py - 2, 5, 22);
      ctx.fillRect(px + 5, py + 6, 5, 4);
      ctx.fillRect(px + 15, py + 3, 5, 4);
      ctx.fillStyle = shade;
      ctx.fillRect(px + 10, py + 17, 5, 3);
      break;
    case "flower":
      ctx.fillStyle = "#4d8354";
      ctx.fillRect(px + 11, py + 12, 2, 7);
      ctx.fillStyle = color;
      ctx.fillRect(px + 9, py + 7 + b, 6, 5);
      ctx.fillStyle = shade;
      ctx.fillRect(px + 11, py + 9 + b, 2, 2);
      break;
  }
}

const FEATURE_ART: Record<Feature["kind"], { color: string; shade: string; label: string }> = {
  pokeball_plant: { color: "#e05c72", shade: "#fffdf5", label: "⚾" },
  resource: { color: "#ffd479", shade: "#96663f", label: "✦" },
  chest: { color: "#c9975f", shade: "#66452c", label: "▣" },
  camp: { color: "#f2b03d", shade: "#66452c", label: "⌂" },
  cave: { color: "#5b5674", shade: "#24204a", label: "◗" },
  ruins: { color: "#b9b3c9", shade: "#5b5674", label: "⌸" },
  shrine: { color: "#c56bd6", shade: "#ffd479", label: "✧" },
};

function drawFeature(ctx: CanvasRenderingContext2D, feature: Feature, px: number, py: number, bob: number) {
  const art = FEATURE_ART[feature.kind];
  const b = Math.round(bob);

  // A soft plinth so a feature reads as an object on the ground, not a sticker.
  ctx.fillStyle = "rgba(26, 20, 40, 0.22)";
  ctx.fillRect(px + 4, py + 17, 16, 4);

  if (feature.kind === "pokeball_plant") {
    ctx.fillStyle = "#4d8354";
    ctx.fillRect(px + 11, py + 12, 2, 6);
    ctx.fillStyle = art.color;
    ctx.fillRect(px + 8, py + 5 + b, 8, 4);
    ctx.fillStyle = art.shade;
    ctx.fillRect(px + 8, py + 9 + b, 8, 4);
    ctx.fillStyle = "#17111f";
    ctx.fillRect(px + 11, py + 7 + b, 2, 3);
    return;
  }

  ctx.fillStyle = art.color;
  ctx.fillRect(px + 5, py + 6 + b, 14, 12);
  ctx.fillStyle = art.shade;
  ctx.fillRect(px + 5, py + 6 + b, 14, 3);
  ctx.fillRect(px + 9, py + 11 + b, 6, 3);
}

interface Props {
  state: ValleyState;
  /** Sub-tile offset, so walking looks continuous instead of teleporting. */
  offset: { x: number; y: number };
  width: number;
  height: number;
}

export function WorldCanvas({ state, offset, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<ChunkCache | null>(null);
  const frameRef = useRef(0);

  // One cache per seed. A new run means a new world, so the old one goes.
  if (!cacheRef.current || (cacheRef.current as unknown as { seed?: number }).seed !== state.seed) {
    cacheRef.current = new ChunkCache(state.seed);
    (cacheRef.current as unknown as { seed?: number }).seed = state.seed;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const cache = cacheRef.current;
    if (!canvas || !cache) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = () => {
      frameRef.current += 1;
      const frame = frameRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      const time = timeOfDay(state.steps);
      const cycle = dayProgress(state.steps);
      const light = lightAt(time, cycle);

      ctx.fillStyle = light.sky;
      ctx.fillRect(0, 0, width, height);

      // The camera keeps the player dead centre; the world slides under them.
      const cols = Math.ceil(width / TILE) + 2;
      const rows = Math.ceil(height / TILE) + 2;
      const originX = state.at.x - Math.floor(cols / 2);
      const originY = state.at.y - Math.floor(rows / 2);
      const shiftX = Math.round(width / 2 - TILE / 2 - Math.floor(cols / 2) * TILE - offset.x * TILE);
      const shiftY = Math.round(height / 2 - TILE / 2 - Math.floor(rows / 2) * TILE - offset.y * TILE);

      // --- Ground, then props, so a tree overlaps the tile below it.
      const props: { kind: PropKind; color: string; shade: string; px: number; py: number; x: number; y: number }[] = [];

      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          const x = originX + rx;
          const y = originY + ry;
          const chunk = cache.get(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
          const terrain = chunk.tiles[localIndex(x, y)] as TerrainType;
          const paint = TILE_PAINT[terrain];
          const px = shiftX + rx * TILE;
          const py = shiftY + ry * TILE;

          if (terrain === "water" || terrain === "deep_water") {
            // Water breathes: a slow shimmer, the cheapest thing that makes a
            // still world feel alive.
            const wave = Math.sin((frame / 26) + (x + y) * 0.6) * 0.5 + 0.5;
            ctx.fillStyle = paint.base;
            ctx.fillRect(px, py, TILE, TILE);
            ctx.fillStyle = paint.speckle;
            ctx.globalAlpha = 0.25 + wave * 0.35;
            ctx.fillRect(px + 2, py + Math.floor(wave * 6) + 4, TILE - 6, 3);
            ctx.globalAlpha = 1;
          } else {
            speckled(ctx, state.seed, x, y, px, py, paint);
          }

          if (paint.prop) {
            props.push({ ...paint.prop, px, py, x, y });
          }
        }
      }

      for (const prop of props) {
        // Foliage sways; stone does not.
        const sway =
          prop.kind === "rock" || prop.kind === "cactus"
            ? 0
            : Math.sin(frame / 34 + prop.x * 0.7 + prop.y * 0.4) * 1.2;
        drawProp(ctx, prop.kind, prop.color, prop.shade, prop.px, prop.py, sway);
      }

      // --- Features on top of the ground they sit on.
      const taken = new Set(state.taken);
      const seenChunks = new Set<string>();
      for (let ry = 0; ry < rows; ry += CHUNK_SIZE) {
        for (let rx = 0; rx < cols; rx += CHUNK_SIZE) {
          for (const dy of [0, 1]) {
            for (const dx of [0, 1]) {
              const cx = Math.floor((originX + rx) / CHUNK_SIZE) + dx;
              const cy = Math.floor((originY + ry) / CHUNK_SIZE) + dy;
              const key = `${cx},${cy}`;
              if (seenChunks.has(key)) continue;
              seenChunks.add(key);

              for (const feature of cache.get(cx, cy).features) {
                if (taken.has(feature.id)) continue;
                const px = shiftX + (feature.at.x - originX) * TILE;
                const py = shiftY + (feature.at.y - originY) * TILE;
                if (px < -TILE || py < -TILE || px > width || py > height) continue;
                drawFeature(ctx, feature, px, py, Math.sin(frame / 22 + feature.at.x) * 1.4);
              }
            }
          }
        }
      }

      // --- The Ranch gate, so home is always visible on the map's origin.
      const ranchX = shiftX + (0 - originX) * TILE;
      const ranchY = shiftY + (0 - originY) * TILE;
      if (ranchX > -TILE * 2 && ranchY > -TILE * 2 && ranchX < width && ranchY < height) {
        ctx.fillStyle = "#96663f";
        ctx.fillRect(ranchX - 6, ranchY - 10, 36, 30);
        ctx.fillStyle = "#c9975f";
        ctx.fillRect(ranchX - 6, ranchY - 10, 36, 6);
        ctx.fillStyle = "#ffd479";
        ctx.fillRect(ranchX + 6, ranchY + 4, 10, 14);
      }

      // --- The player, dead centre.
      //
      // Drawn bigger than a tile and given a hard outline on purpose: a first
      // pass sized them to the tile and they vanished into a field of grass,
      // which is fatal in a game about walking. You must always be able to find
      // yourself instantly.
      const cxp = Math.round(width / 2 - TILE / 2);
      const cyp = Math.round(height / 2 - TILE / 2);
      const bob = Math.round(Math.sin(frame / 9) * 1.2);

      ctx.fillStyle = "rgba(26, 20, 40, 0.35)";
      ctx.fillRect(cxp + 3, cyp + 20, 18, 5);

      // The outline is drawn first, as a slightly larger silhouette behind.
      ctx.fillStyle = "#17111f";
      ctx.fillRect(cxp + 3, cyp - 2 + bob, 18, 25);

      ctx.fillStyle = "#e05c72";
      ctx.fillRect(cxp + 4, cyp - 1 + bob, 16, 9); // cap
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(cxp + 6, cyp + 1 + bob, 5, 3); // cap badge
      ctx.fillStyle = "#f7e6c4";
      ctx.fillRect(cxp + 5, cyp + 8 + bob, 14, 7); // face
      ctx.fillStyle = "#17111f";
      ctx.fillRect(cxp + 8, cyp + 10 + bob, 2, 2);
      ctx.fillRect(cxp + 14, cyp + 10 + bob, 2, 2);
      ctx.fillStyle = "#5aa8c4";
      ctx.fillRect(cxp + 5, cyp + 15 + bob, 14, 5); // jacket
      ctx.fillStyle = "#3d3352";
      ctx.fillRect(cxp + 6, cyp + 20 + bob, 4, 3);
      ctx.fillRect(cxp + 14, cyp + 20 + bob, 4, 3);

      // --- The light, laid over everything at once.
      if (light.strength > 0.01) {
        ctx.globalAlpha = light.strength;
        ctx.fillStyle = light.tint;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // A soft vignette, so the eye sits in the middle where the player is.
      // Soft is the operative word: at 0.34 it turned a sunny meadow murky.
      const reach = Math.max(width, height);
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        reach * 0.34,
        width / 2,
        height / 2,
        reach * 0.78
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(26, 20, 40, 0.17)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [state, offset, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="valley-canvas"
      style={{ width, height }}
      aria-label={`Monde de PokeValley, à ${distanceFromRanch(state.at)} mètres du Ranch`}
    />
  );
}
