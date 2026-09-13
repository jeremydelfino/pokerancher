import { useMemo, type CSSProperties } from "react";

/**
 * Tiny pixel-art engine.
 *
 * Art is authored as arrays of strings — one character per pixel, "." for
 * transparent — then composed onto a grid and emitted as SVG rects. Horizontal
 * runs of the same colour collapse into a single rect, so a 64x34 diorama costs
 * a few hundred nodes instead of two thousand.
 *
 * Everything renders on integer coordinates with shape-rendering=crispEdges, so
 * the result stays a true pixel grid at any zoom.
 */

export type Palette = Record<string, string>;
export type Grid = string[][];

export const EMPTY = ".";

export function makeGrid(width: number, height: number, fill = EMPTY): Grid {
  return Array.from({ length: height }, () => new Array<string>(width).fill(fill));
}

export function put(g: Grid, x: number, y: number, ch: string): void {
  const row = g[Math.round(y)];
  if (!row) return;
  const i = Math.round(x);
  if (i < 0 || i >= row.length) return;
  row[i] = ch;
}

export function box(g: Grid, x: number, y: number, w: number, h: number, ch: string): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) put(g, x + dx, y + dy, ch);
  }
}

/** Draws `art` at (x, y), skipping transparent cells so sprites layer cleanly. */
export function stamp(g: Grid, art: readonly string[], x: number, y: number): void {
  art.forEach((line, dy) => {
    for (let dx = 0; dx < line.length; dx++) {
      const ch = line[dx];
      if (ch === EMPTY || ch === " ") continue;
      put(g, x + dx, y + dy, ch);
    }
  });
}

/** Same as stamp, mirrored horizontally — one sprite, two silhouettes. */
export function stampFlipped(g: Grid, art: readonly string[], x: number, y: number): void {
  stamp(
    g,
    art.map((line) => [...line].reverse().join("")),
    x,
    y
  );
}

/** 50% checkerboard between two colours — the classic way to fake a gradient step. */
export function ditherRow(g: Grid, y: number, a: string, b: string): void {
  const width = g[0]?.length ?? 0;
  for (let x = 0; x < width; x++) put(g, x, y, (x + y) % 2 === 0 ? a : b);
}

/** Fills each column from a curve down to `until`, for rolling hills and cave walls. */
export function ridge(g: Grid, top: (x: number) => number, ch: string, until?: number): void {
  const width = g[0]?.length ?? 0;
  const bottom = until ?? g.length;
  for (let x = 0; x < width; x++) {
    const start = Math.round(top(x));
    for (let y = start; y < bottom; y++) put(g, x, y, ch);
  }
}

/**
 * Paints stacked horizontal bands with a dithered seam between each pair, then
 * floods the rest of the grid with the last band's colour.
 *
 * The flood matters: terrain drawn afterwards rarely starts on exactly the row
 * the bands ended on, and any cell left untouched renders as a hole onto
 * whatever sits behind the SVG.
 */
export function paintBands(g: Grid, bands: ReadonlyArray<readonly [string, number]>): number {
  const width = g[0]?.length ?? 0;
  let y = 0;
  bands.forEach(([ch, rows], i) => {
    for (let k = 0; k < rows; k++, y++) box(g, 0, y, width, 1, ch);
    const next = bands[i + 1];
    if (next) {
      ditherRow(g, y, ch, next[0]);
      y++;
    }
  });

  const last = bands[bands.length - 1]?.[0];
  if (last && y < g.length) box(g, 0, y, width, g.length - y, last);
  return y;
}

/** Deterministic 0..1 noise — same scene every render, no flicker between mounts. */
export function noise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function toRows(g: Grid): string[] {
  return g.map((row) => row.join(""));
}

interface Run {
  x: number;
  y: number;
  w: number;
  ch: string;
}

function runsOf(rows: readonly string[]): Run[] {
  const out: Run[] = [];
  rows.forEach((row, y) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i];
      if (ch === EMPTY || ch === " ") {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < row.length && row[j] === ch) j++;
      out.push({ x: i, y, w: j - i, ch });
      i = j;
    }
  });
  return out;
}

interface LayerProps {
  rows: readonly string[];
  palette: Palette;
  className?: string;
  style?: CSSProperties;
  opacity?: number;
}

/** A pixel layer as an SVG <g> — compose several inside one <svg> scene. */
export function PixelLayer({ rows, palette, className, style, opacity }: LayerProps) {
  const runs = useMemo(() => runsOf(rows), [rows]);
  return (
    <g className={className} style={style} opacity={opacity}>
      {runs.map((run) => (
        <rect
          key={`${run.x}-${run.y}-${run.ch}`}
          x={run.x}
          y={run.y}
          width={run.w}
          height={1}
          fill={palette[run.ch] ?? "transparent"}
        />
      ))}
    </g>
  );
}

interface IconProps {
  art: readonly string[];
  palette: Palette;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** A standalone sprite with its own viewBox — icons, marks, small creatures. */
export function PixelIcon({ art, palette, size = 16, className, style, title }: IconProps) {
  const w = art[0]?.length ?? 1;
  const h = art.length || 1;
  return (
    <svg
      className={className}
      style={style}
      width={(size * w) / Math.max(w, h)}
      height={(size * h) / Math.max(w, h)}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <PixelLayer rows={art} palette={palette} />
    </svg>
  );
}
