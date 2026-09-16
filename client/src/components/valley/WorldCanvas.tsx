import { useEffect, useRef } from "react";
import {
  ChunkCache,
  CHUNK_SIZE,
  dayProgress,
  localIndex,
  noise2D,
  tileHash,
  timeOfDay,
  type BiomeId,
  type Feature,
  type TerrainType,
  type ValleyState,
} from "@pokerancher/shared";
import { IS_WATER, lightAt, paintFor, waterFor, type PropKind } from "./tiles.js";

/**
 * The world, drawn.
 *
 * The client generates its own tiles from the seed rather than receiving them:
 * server and client run the identical pure function, so what is drawn is what
 * the server believes. The only thing on the wire is a position.
 *
 * Three rules keep it from looking like a spreadsheet of coloured cells, which
 * is what the first pass looked like:
 *
 *  1. **Ground is painted in patches, not speckles.** A slow noise field picks
 *     which tone of the biome's ramp a tile takes, so light and shade drift
 *     across a meadow instead of being sprinkled per tile.
 *  2. **Edges are drawn.** Where two ground families meet — sand against grass,
 *     anything against water — the boundary gets a dithered lip, so a shoreline
 *     reads as a shoreline rather than a staircase of squares.
 *  3. **Props have shadows and are sorted back to front**, which is the whole
 *     difference between "objects standing in a world" and "stickers on a grid".
 */

/**
 * Tile size on screen.
 *
 * 28 px filled a 1800 px canvas with 64 columns and the world read as static.
 * 40 is closer in — you can tell a pine from a bush at a glance, which is the
 * whole point of drawing them differently.
 */
export const TILE = 40;

/* --- Ground --------------------------------------------------------------- */

/**
 * Which tone of a ramp this tile takes.
 *
 * Two scales of noise and only a whisper of per-tile grain. The first pass gave
 * each tile 28 % of its own random value, which threw neighbours across tone
 * boundaries and painted the whole world as a checkerboard of slightly
 * different greens — the single ugliest thing on the screen. The grain is now
 * just enough to soften the band edges, and the patches come from the noise.
 */
function toneIndex(seed: number, x: number, y: number, tones: number): number {
  const broad = noise2D(seed ^ 0x70e5, x, y, 17);
  const fine = noise2D(seed ^ 0x1d3a, x, y, 6);
  const grain = tileHash(seed, x, y, 5) * 0.06;
  const v = broad * 0.68 + fine * 0.26 + grain;
  return Math.max(0, Math.min(tones - 1, Math.floor(v * tones)));
}

/** The "family" of a terrain, for deciding whether an edge is worth drawing. */
function family(terrain: TerrainType): string {
  if (IS_WATER(terrain)) return "water";
  if (terrain === "sand") return "sand";
  if (terrain === "snow" || terrain === "ice") return "snow";
  if (terrain === "dirt") return "dirt";
  return "green";
}

/* --- Props ---------------------------------------------------------------- */

/**
 * Everything that stands up.
 *
 * Drawn taller than a tile and anchored at its foot, so a tree overlaps the
 * tile behind it and the world gains a horizon.
 */
function drawProp(
  ctx: CanvasRenderingContext2D,
  kind: PropKind,
  body: string,
  shade: string,
  light: string,
  px: number,
  py: number,
  sway: number
) {
  const s = Math.round(sway);
  const foot = py + TILE;

  // One soft shadow under everything: the cheapest depth cue there is.
  ctx.fillStyle = "rgba(40, 32, 24, 0.18)";
  ctx.beginPath();
  ctx.ellipse(px + TILE / 2, foot - 4, TILE * 0.32, TILE * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (kind) {
    case "tree": {
      ctx.fillStyle = "#6b4a32";
      ctx.fillRect(px + 12, foot - 14, 5, 11);
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(px + 14 + s, foot - 24, 15, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(px + 14 + s, foot - 26, 13, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(px + 10 + s, foot - 30, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "pine": {
      ctx.fillStyle = "#5a4130";
      ctx.fillRect(px + 12, foot - 11, 5, 9);
      for (let tier = 0; tier < 3; tier++) {
        const w = 15 - tier * 4;
        const yy = foot - 14 - tier * 8;
        ctx.fillStyle = tier === 2 ? light : body;
        ctx.beginPath();
        ctx.moveTo(px + 14 + s * (tier / 2), yy - 10);
        ctx.lineTo(px + 14 - w + s * (tier / 2), yy + 2);
        ctx.lineTo(px + 14 + w + s * (tier / 2), yy + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = shade;
      ctx.fillRect(px + 4, foot - 14, 20, 2);
      break;
    }
    case "bush": {
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(px + 14 + s, foot - 8, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(px + 14 + s, foot - 10, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(px + 11 + s, foot - 13, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rock": {
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(px + 14, foot - 7, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(px + 14, foot - 9, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(px + 11, foot - 12, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cactus": {
      ctx.fillStyle = shade;
      ctx.fillRect(px + 12, foot - 24, 7, 22);
      ctx.fillStyle = body;
      ctx.fillRect(px + 12, foot - 24, 5, 22);
      ctx.fillStyle = light;
      ctx.fillRect(px + 13, foot - 22, 2, 16);
      ctx.fillStyle = body;
      ctx.fillRect(px + 6, foot - 17, 6, 4);
      ctx.fillRect(px + 6, foot - 21, 3, 6);
      ctx.fillRect(px + 19, foot - 20, 5, 4);
      ctx.fillRect(px + 21, foot - 24, 3, 6);
      break;
    }
    case "tuft": {
      // Tall grass: a handful of blades that lean together in the breeze.
      for (let i = 0; i < 5; i++) {
        const bx = px + 5 + i * 4.5;
        const lean = s * (0.5 + i * 0.16);
        const h = 10 + ((i * 7) % 5);
        ctx.strokeStyle = i % 2 ? body : shade;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, foot - 3);
        ctx.quadraticCurveTo(bx + lean * 0.6, foot - 3 - h * 0.6, bx + lean, foot - 3 - h);
        ctx.stroke();
      }
      ctx.strokeStyle = light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 14, foot - 3);
      ctx.quadraticCurveTo(px + 14 + s, foot - 12, px + 14 + s * 1.6, foot - 18);
      ctx.stroke();
      break;
    }
    case "reed": {
      for (let i = 0; i < 3; i++) {
        const bx = px + 8 + i * 6;
        const lean = s * (0.6 + i * 0.3);
        ctx.strokeStyle = i === 1 ? light : body;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, foot - 3);
        ctx.lineTo(bx + lean, foot - 16);
        ctx.stroke();
        ctx.fillStyle = shade;
        ctx.fillRect(bx + lean - 1, foot - 20, 3, 5);
      }
      break;
    }
    case "flower": {
      ctx.strokeStyle = "#4e8446";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 14, foot - 4);
      ctx.lineTo(px + 14 + s, foot - 12);
      ctx.stroke();
      ctx.fillStyle = body;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(px + 14 + s + Math.cos(a) * 3.2, foot - 15 + Math.sin(a) * 3.2, 2.6, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(px + 14 + s, foot - 15, 2.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/* --- Features ------------------------------------------------------------- */

function drawFeature(ctx: CanvasRenderingContext2D, feature: Feature, px: number, py: number, bob: number) {
  const b = Math.round(bob);
  const foot = py + TILE;

  ctx.fillStyle = "rgba(40, 32, 24, 0.2)";
  ctx.beginPath();
  ctx.ellipse(px + TILE / 2, foot - 4, TILE * 0.3, TILE * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (feature.kind) {
    case "pokeball_plant": {
      // The run's economy, so it has to be spotted from across the screen.
      ctx.strokeStyle = "#4e8446";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 14, foot - 4);
      ctx.lineTo(px + 14, foot - 14);
      ctx.stroke();
      ctx.fillStyle = "#3f7a46";
      ctx.beginPath();
      ctx.ellipse(px + 8, foot - 11, 5, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + 20, foot - 13, 5, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();

      const cy = foot - 22 + b;
      ctx.fillStyle = "#f7f3e8";
      ctx.beginPath();
      ctx.arc(px + 14, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0545f";
      ctx.beginPath();
      ctx.arc(px + 14, cy, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#2a2233";
      ctx.fillRect(px + 7, cy - 1, 14, 2);
      ctx.beginPath();
      ctx.arc(px + 14, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7f3e8";
      ctx.beginPath();
      ctx.arc(px + 14, cy, 1.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "resource": {
      const cy = foot - 14 + b;
      ctx.fillStyle = "#c78f3d";
      ctx.beginPath();
      ctx.moveTo(px + 14, cy - 9);
      ctx.lineTo(px + 22, cy);
      ctx.lineTo(px + 14, cy + 9);
      ctx.lineTo(px + 6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f2cd7a";
      ctx.beginPath();
      ctx.moveTo(px + 14, cy - 9);
      ctx.lineTo(px + 18, cy - 1);
      ctx.lineTo(px + 14, cy + 2);
      ctx.lineTo(px + 10, cy - 1);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "chest": {
      const top = foot - 18 + b;
      ctx.fillStyle = "#6b4a32";
      ctx.fillRect(px + 4, top + 6, 20, 12);
      ctx.fillStyle = "#8c6440";
      ctx.fillRect(px + 4, top, 20, 8);
      ctx.fillStyle = "#c78f3d";
      ctx.fillRect(px + 4, top + 7, 20, 3);
      ctx.fillRect(px + 12, top + 4, 4, 8);
      break;
    }
    case "camp": {
      ctx.fillStyle = "#8c6440";
      ctx.beginPath();
      ctx.moveTo(px + 14, foot - 26 + b);
      ctx.lineTo(px + 2, foot - 4);
      ctx.lineTo(px + 26, foot - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c9a06a";
      ctx.beginPath();
      ctx.moveTo(px + 14, foot - 26 + b);
      ctx.lineTo(px + 8, foot - 4);
      ctx.lineTo(px + 14, foot - 4);
      ctx.closePath();
      ctx.fill();
      // A fire, because a camp should look like somewhere you stop.
      ctx.fillStyle = "#f2b03d";
      ctx.beginPath();
      ctx.ellipse(px + 22, foot - 6 + b * 0.5, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.ellipse(px + 22, foot - 5 + b * 0.5, 1.4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cave": {
      ctx.fillStyle = "#6d6479";
      ctx.beginPath();
      ctx.ellipse(px + 14, foot - 8, 14, 12, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#231d33";
      ctx.beginPath();
      ctx.ellipse(px + 14, foot - 6, 8, 8, 0, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "ruins": {
      ctx.fillStyle = "#b5aec2";
      ctx.fillRect(px + 3, foot - 22, 5, 20);
      ctx.fillRect(px + 20, foot - 17, 5, 15);
      ctx.fillStyle = "#8e879e";
      ctx.fillRect(px + 3, foot - 22, 5, 4);
      ctx.fillRect(px + 20, foot - 17, 5, 4);
      ctx.fillRect(px + 8, foot - 20, 12, 4);
      break;
    }
    case "shrine": {
      // The rarest thing in the world gets a glow.
      const glow = ctx.createRadialGradient(px + 14, foot - 16, 2, px + 14, foot - 16, 24);
      glow.addColorStop(0, "rgba(212, 160, 255, 0.55)");
      glow.addColorStop(1, "rgba(212, 160, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(px - 12, foot - 42, TILE + 24, 48);
      ctx.fillStyle = "#c56bd6";
      ctx.fillRect(px + 4, foot - 26, 4, 24);
      ctx.fillRect(px + 20, foot - 26, 4, 24);
      ctx.fillStyle = "#e7b4f2";
      ctx.fillRect(px + 1, foot - 30, 26, 5);
      ctx.fillStyle = "#fff0b8";
      ctx.beginPath();
      ctx.arc(px + 14, foot - 16 + b, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/* --- The component -------------------------------------------------------- */

interface Props {
  state: ValleyState;
  /**
   * Sub-tile camera offset, in tiles — a **ref**, not a value.
   *
   * Walking updates it sixty times a second, and routing that through React
   * state would re-render the page on every frame. The render loop reads the
   * ref directly, so a walk costs zero renders.
   */
  offsetRef: { current: { x: number; y: number } };
  width: number;
  height: number;
}

export function WorldCanvas({ state, offsetRef, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<{ seed: number; cache: ChunkCache } | null>(null);
  const frameRef = useRef(0);

  // The live values the animation loop reads. Kept in a ref so the loop is
  // started once and never torn down — restarting it on every state change is
  // what made movement stutter.
  const live = useRef({ state, width, height });
  live.current = { state, width, height };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const { state: s, width: w, height: h } = live.current;
      const off = offsetRef.current;
      if (w < 2 || h < 2) return;

      if (!cacheRef.current || cacheRef.current.seed !== s.seed) {
        cacheRef.current = { seed: s.seed, cache: new ChunkCache(s.seed) };
      }
      const cache = cacheRef.current.cache;

      frameRef.current += 1;
      const frame = frameRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      const light = lightAt(timeOfDay(s.steps), dayProgress(s.steps));

      ctx.fillStyle = light.sky;
      ctx.fillRect(0, 0, w, h);

      // The camera keeps the player dead centre; the world slides under them.
      const cols = Math.ceil(w / TILE) + 3;
      const rows = Math.ceil(h / TILE) + 3;
      const originX = s.at.x - Math.floor(cols / 2);
      const originY = s.at.y - Math.floor(rows / 2);
      const shiftX = Math.round(w / 2 - TILE / 2 - Math.floor(cols / 2) * TILE - off.x * TILE);
      const shiftY = Math.round(h / 2 - TILE / 2 - Math.floor(rows / 2) * TILE - off.y * TILE);

      const terrainAtLocal = (x: number, y: number) =>
        cache.get(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)).tiles[localIndex(x, y)] as TerrainType;
      const biomeAtLocal = (x: number, y: number) =>
        cache.get(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE)).biomes[localIndex(x, y)] as BiomeId;

      type Standing = { kind: PropKind; body: string; shade: string; light: string; px: number; py: number; y: number; x: number };
      const standing: Standing[] = [];

      /* --- Ground pass ------------------------------------------------- */
      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          const x = originX + rx;
          const y = originY + ry;
          const terrain = terrainAtLocal(x, y);
          const biome = biomeAtLocal(x, y);
          const px = shiftX + rx * TILE;
          const py = shiftY + ry * TILE;

          if (IS_WATER(terrain)) {
            const water = waterFor(biome);
            const tones = terrain === "deep_water" ? water.deep : water.shallow;
            ctx.fillStyle = tones[toneIndex(s.seed, x, y, tones.length)];
            ctx.fillRect(px, py, TILE, TILE);

            // Ripples that travel, so water is the one thing always moving.
            const wave = Math.sin(frame / 30 + x * 0.8 + y * 0.5);
            if (wave > 0.55) {
              ctx.fillStyle = "rgba(255,255,255,0.14)";
              ctx.fillRect(px + 4, py + 10 + Math.round(wave * 3), TILE - 10, 2);
            }

            // Foam where water meets land — the edge that makes a shore.
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
              if (IS_WATER(terrainAtLocal(x + dx, y + dy))) continue;
              ctx.fillStyle = water.foam;
              const thick = 3 + Math.round(Math.sin(frame / 22 + (x + y) * 0.9) * 1);
              if (dy === -1) ctx.fillRect(px, py, TILE, thick);
              if (dy === 1) ctx.fillRect(px, py + TILE - thick, TILE, thick);
              if (dx === -1) ctx.fillRect(px, py, thick, TILE);
              if (dx === 1) ctx.fillRect(px + TILE - thick, py, thick, TILE);
            }
            continue;
          }

          const paint = paintFor(terrain, biome);
          ctx.fillStyle = paint.ramp[toneIndex(s.seed, x, y, paint.ramp.length)];
          ctx.fillRect(px, py, TILE, TILE);

          // A dithered lip where two ground families meet, so sand does not end
          // against grass in a perfect straight line.
          const mine = family(terrain);
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
            const neighbour = terrainAtLocal(x + dx, y + dy);
            if (family(neighbour) === mine || IS_WATER(neighbour)) continue;
            const other = paintFor(neighbour, biomeAtLocal(x + dx, y + dy));
            ctx.fillStyle = other.ramp[other.ramp.length - 1];
            const step = 4;
            for (let i = 0; i < TILE; i += step) {
              // The hash decides whether each notch of the lip is filled, which
              // is what turns a straight edge into a ragged one.
              if (tileHash(s.seed, x * 31 + i, y * 17 + dx * 3 + dy * 7, 9) > 0.45) continue;
              if (dy === -1) ctx.fillRect(px + i, py, step, 4);
              if (dy === 1) ctx.fillRect(px + i, py + TILE - 4, step, 4);
              if (dx === -1) ctx.fillRect(px, py + i, 4, step);
              if (dx === 1) ctx.fillRect(px + TILE - 4, py + i, 4, step);
            }
          }

          if (paint.prop) {
            standing.push({ ...paint.prop, px, py, x, y });
          }
        }
      }

      /* --- Standing pass, back to front -------------------------------- */
      standing.sort((a, b) => a.y - b.y);
      for (const prop of standing) {
        const stiff = prop.kind === "rock" || prop.kind === "cactus";
        const sway = stiff ? 0 : Math.sin(frame / 38 + prop.x * 0.6 + prop.y * 0.35) * 1.6;
        drawProp(ctx, prop.kind, prop.body, prop.shade, prop.light, prop.px, prop.py, sway);
      }

      /* --- Features ---------------------------------------------------- */
      const taken = new Set(s.taken);
      const seenChunks = new Set<string>();
      const c0 = Math.floor(originX / CHUNK_SIZE);
      const c1 = Math.floor((originX + cols) / CHUNK_SIZE);
      const r0 = Math.floor(originY / CHUNK_SIZE);
      const r1 = Math.floor((originY + rows) / CHUNK_SIZE);

      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          const key = `${cx},${cy}`;
          if (seenChunks.has(key)) continue;
          seenChunks.add(key);
          for (const feature of cache.get(cx, cy).features) {
            if (taken.has(feature.id)) continue;
            const px = shiftX + (feature.at.x - originX) * TILE;
            const py = shiftY + (feature.at.y - originY) * TILE;
            if (px < -TILE * 2 || py < -TILE * 2 || px > w + TILE || py > h + TILE) continue;
            drawFeature(ctx, feature, px, py, Math.sin(frame / 26 + feature.at.x) * 1.6);
          }
        }
      }

      /* --- The Ranch, always at the origin ----------------------------- */
      const rx = shiftX + (0 - originX) * TILE;
      const ry = shiftY + (0 - originY) * TILE;
      if (rx > -TILE * 3 && ry > -TILE * 3 && rx < w + TILE && ry < h + TILE) {
        const foot = ry + TILE;
        ctx.fillStyle = "rgba(40, 32, 24, 0.2)";
        ctx.beginPath();
        ctx.ellipse(rx + 16, foot - 3, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8c6440";
        ctx.fillRect(rx - 6, foot - 26, 44, 24);
        ctx.fillStyle = "#c2452f";
        ctx.beginPath();
        ctx.moveTo(rx - 12, foot - 26);
        ctx.lineTo(rx + 16, foot - 42);
        ctx.lineTo(rx + 44, foot - 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f2cd7a";
        ctx.fillRect(rx + 10, foot - 16, 12, 14);
        ctx.fillStyle = "#6b4a32";
        ctx.fillRect(rx + 10, foot - 16, 12, 2);
      }

      /* --- Air --------------------------------------------------------- */
      if (light.motes !== "none") {
        const count = 26;
        for (let i = 0; i < count; i++) {
          const seedX = tileHash(s.seed, i, 1, 21);
          const seedY = tileHash(s.seed, i, 2, 22);
          const drift = light.motes === "fireflies" ? 46 : 78;
          const mx = ((seedX * w + frame * (0.16 + seedY * 0.2)) % (w + 40)) - 20;
          const my = ((seedY * h + Math.sin(frame / drift + i) * 16) % (h + 40)) - 20;
          const twinkle = light.motes === "fireflies" ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 14 + i * 2)) : 0.5;
          ctx.globalAlpha = twinkle * (light.motes === "fireflies" ? 0.9 : 0.35);
          ctx.fillStyle = light.motes === "fireflies" ? "#ffe9a8" : "#fffdf5";
          ctx.fillRect(Math.round(mx), Math.round(my), 3, 3);
        }
        ctx.globalAlpha = 1;
      }

      /* --- Light, laid over everything at once -------------------------- */
      if (light.strength > 0.01) {
        ctx.globalAlpha = light.strength;
        ctx.fillStyle = light.tint;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // Elliptical, and measured so the clear middle actually covers the middle.
      // A radial gradient sized off the *longer* side put the corners of a wide
      // canvas deep into the falloff and greyed the entire world out.
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(w / h, 1);
      const reach = h;
      const vignette = ctx.createRadialGradient(0, 0, reach * 0.42, 0, 0, reach * 0.92);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(28, 22, 40, ${light.vignette})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(-w, -h, w * 2, h * 2);
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
    // Started once. Everything that changes is read from `live` — restarting the
    // loop on each new state is exactly what made walking stutter.
  }, []);

  return <canvas ref={canvasRef} className="valley-canvas" style={{ width, height }} />;
}
