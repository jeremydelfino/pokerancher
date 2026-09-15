import { useMemo } from "react";
import {
  PixelLayer,
  box,
  makeGrid,
  noise,
  paintBands,
  put,
  ridge,
  stamp,
  toRows,
  type Grid,
  type Palette,
} from "./pixel.js";

/**
 * The market square.
 *
 * A banner scene, not a control: three stalls under striped awnings, a trader
 * behind the middle one, bunting overhead. It exists so the page reads as a
 * place you walk into rather than a table of prices — the prices are directly
 * underneath it, and they are what you actually click.
 *
 * Awning stripes borrow the resource colours, so the stall selling ore and the
 * ore chip on the counter below it are recognisably the same thing.
 */

const W = 112;
const H = 46;

const P: Palette = {
  "1": "var(--sc-1)",
  "2": "var(--sc-2)",
  "3": "var(--sc-3)",
  "4": "var(--sc-4)",
  "5": "var(--sc-5)",
  "6": "var(--sc-6)",
  "7": "var(--sc-7)",
  "8": "var(--sc-8)",
  F: "var(--sc-far)",
  // wood
  w: "#c9975f",
  W: "#96663f",
  V: "#66452c",
  X: "#432c1c",
  // cobbles
  c: "#8a84a0",
  C: "#5b5674",
  k: "#3b3752",
  // awnings
  r: "var(--res-berry)",
  f: "var(--res-fish)",
  o: "var(--res-wood)",
  m: "var(--res-ore)",
  i: "#fffdf5",
  // greenery
  g: "#5f9a5e",
  G: "#3c6b4a",
  // trader
  s: "#f4c48a",
  S: "#c08a55",
  b: "#4e3a6b",
  e: "#1a1428",
  // gold
  y: "#ffd479",
};

/** Striped canopy: alternating accent and cream, sagging one row at the ends. */
function awning(g: Grid, x: number, y: number, width: number, accent: string) {
  for (let dx = 0; dx < width; dx++) {
    const stripe = Math.floor(dx / 3) % 2 === 0 ? accent : "i";
    box(g, x + dx, y, 1, 3, stripe);
    // Scalloped hem.
    if (dx % 3 === 1) put(g, x + dx, y + 3, stripe);
  }
  box(g, x, y - 1, width, 1, "V");
}

function stall(g: Grid, x: number, accent: string, crate: string) {
  const width = 30;
  // Posts.
  box(g, x, 20, 2, 14, "V");
  box(g, x + width - 2, 20, 2, 14, "V");
  awning(g, x, 20, width, accent);
  // Counter and its shadowed underside.
  box(g, x - 1, 29, width + 2, 3, "w");
  box(g, x - 1, 32, width + 2, 1, "W");
  box(g, x, 33, width, 2, "X");
  // Goods on the counter.
  for (let i = 0; i < 4; i++) {
    box(g, x + 4 + i * 6, 27, 4, 2, crate);
    put(g, x + 4 + i * 6, 27, "i");
  }
  // Crates stacked beside the stall.
  box(g, x + 2, 35, 7, 5, "W");
  box(g, x + 3, 36, 5, 1, "w");
  box(g, x + 4, 35, 3, 5, "V");
  box(g, x + width - 9, 36, 6, 4, "W");
  box(g, x + width - 8, 37, 4, 1, "w");
}

const TRADER = [
  "..eeee..",
  ".eSSSSe.",
  ".SsssSS.",
  ".sesess.",
  ".ssssss.",
  "..ssss..",
  ".bbbbbb.",
  "bbbbbbbb",
  "bb.bb.bb",
  "bb.bb.bb",
];

const LANTERN = ["..X..", ".yyy.", "yyiyy", ".yyy.", "..X.."];

function buildMarket(): string[] {
  const g: Grid = makeGrid(W, H);

  paintBands(g, [
    ["1", 2],
    ["2", 2],
    ["3", 2],
    ["4", 2],
    ["5", 2],
    ["6", 2],
    ["7", 2],
    ["8", 2],
  ]);

  // Rooftops behind the square, hazed so they stay background.
  for (let x = 0; x < W; x += 13) {
    const h = 9 + Math.round(noise(x) * 5);
    box(g, x + 1, 22 - h, 11, h, "F");
    for (let i = 0; i < 6; i++) put(g, x + 1 + i, 22 - h - i, "F");
  }

  // Cobbled ground: a flat field, then a scatter of darker stones.
  box(g, 0, 34, W, H - 34, "c");
  box(g, 0, 34, W, 1, "C");
  for (let i = 0; i < 90; i++) {
    const x = Math.round(noise(i * 2.7) * (W - 3));
    const y = 35 + Math.round(noise(i * 5.3) * 10);
    box(g, x, y, 2, 1, noise(i * 9.1) > 0.55 ? "C" : "k");
  }

  // Grass creeping in at the edges of the square.
  ridge(g, (x) => (x < 14 || x > W - 14 ? 34 : H), "G", 37);
  for (let x = 0; x < 12; x++) if (x % 2 === 0) put(g, x, 33, "g");
  for (let x = W - 12; x < W; x++) if (x % 2 === 0) put(g, x, 33, "g");

  stall(g, 6, "r", "r");
  stall(g, 41, "f", "m");
  stall(g, 76, "o", "o");

  // The trader, behind the middle counter.
  stamp(g, TRADER, 52, 19);

  // Bunting between the stalls, with a lantern at each dip.
  for (let x = 2; x < W - 2; x++) {
    const y = 8 + Math.round(Math.abs(Math.sin(x / 9)) * 4);
    put(g, x, y, "V");
    if (x % 9 === 4) {
      put(g, x, y + 1, x % 18 === 4 ? "y" : "i");
      put(g, x, y + 2, x % 18 === 4 ? "y" : "i");
    }
  }
  stamp(g, LANTERN, 34, 15);
  stamp(g, LANTERN, 72, 15);

  return toRows(g);
}

export function MarketScene() {
  const rows = useMemo(buildMarket, []);
  return (
    <svg
      className="market-scene"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelLayer rows={rows} palette={P} />
    </svg>
  );
}
