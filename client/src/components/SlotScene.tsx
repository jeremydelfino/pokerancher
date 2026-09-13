import { useMemo, type CSSProperties } from "react";
import {
  PixelLayer,
  box,
  makeGrid,
  noise,
  paintBands,
  put,
  ridge,
  stamp,
  stampFlipped,
  toRows,
  type Grid,
  type Palette,
} from "./pixel.js";

/**
 * One pixel diorama per Refuge pen.
 *
 * Each scene is composed on a 64x34 grid: sky bands first, then terrain, then
 * hand-drawn sprites stamped in at fixed spots. The middle column is kept clear
 * because the assigned creature stands there.
 *
 * Anything that moves lives in a separate <g> on top, animated in CSS — the
 * static grid is built once per slot type and memoised.
 */

const W = 64;
const H = 34;

/** Accent per pen, used by the card for its gauge and trim. */
export const SLOT_ACCENT: Record<string, { accent: string; dark: string }> = {
  BERRY_FARM: { accent: "#e8a0ac", dark: "#c05a70" },
  FISHING_DOCK: { accent: "#9fdbe8", dark: "#3f86a8" },
  WOODCUTTING: { accent: "#b6d98f", dark: "#5f9a5e" },
  MINING: { accent: "#c7b8ec", dark: "#7a68b0" },
};

const P: Palette = {
  // sky ramp, dark to warm
  "1": "#1f1930",
  "2": "#2d2443",
  "3": "#3f2f5c",
  "4": "#5a4076",
  "5": "#8a5580",
  "6": "#c9727d",
  "7": "#e8956f",
  "8": "#f4c48a",
  "0": "#fff6d8",
  // grass
  g: "#8fbf6a",
  G: "#5f9a5e",
  H: "#3c6b4a",
  J: "#24452f",
  l: "#b6d98f",
  // soil
  d: "#a8703f",
  D: "#7a4f2c",
  E: "#4e3220",
  // wood
  w: "#c08a55",
  W: "#8b5e3c",
  V: "#5c3d28",
  // water
  b: "#9fdbe8",
  B: "#5aa8c4",
  N: "#35708f",
  M: "#24506b",
  // stone
  s: "#b9b3c9",
  S: "#8a84a0",
  T: "#5b5674",
  U: "#3b3752",
  X: "#241f38",
  // accents
  r: "#e05c72",
  f: "#f2b03d",
  y: "#ffd479",
  p: "#c56bd6",
  c: "#7ce0d3",
  m: "#f0a0b8",
  i: "#fffdf5",
  k: "#1a1428",
};

/* --- Sprite library ------------------------------------------------------- */

const PINE = [
  "....g....",
  "...gGH...",
  "..ggGHH..",
  "...gGH...",
  "..ggGHH..",
  ".ggGGHHH.",
  "..ggGHH..",
  ".ggGGHHH.",
  "ggGGGHHHH",
  "..ggGHH..",
  ".ggGGHHH.",
  "ggGGGHHHH",
  "....W....",
  "...WVV...",
];

const OAK = [
  "...gggG....",
  "..gggGGGH..",
  ".ggggGGGHH.",
  "ggggGGGGHHH",
  "ggggGGGGHHH",
  ".gggGGGGHH.",
  "..ggGGGHH..",
  "....WWW....",
  "....WWV....",
  "....WWV....",
  "...WWWVV...",
  "..HHHHHHH..",
];

const BUSH = [
  "...lll...",
  "..lgggG..",
  ".lggGGGH.",
  "lggrGGrHH",
  ".lgGGGHH.",
  "..GrGGH..",
];

const FENCE_POST = [".w.", "wWW", "wWW", "wWW", "wWW", "WVV"];

const STUMP = [".wwwwwww.", "wWWWWWWWw", "wWEEEWWWw", "WWWWWWWWW", ".VVVVVVV."];

const AXE = ["..s..", ".sss.", "ssss.", "..W..", "..W..", "..W.."];

const LOG = [".WWWWWW.", "wWWWWWWw", "wVWWWWVw", ".WWWWWW."];

const MUSHROOM = [".rrr.", "rrirr", "..i..", ".iii."];

const ROCK = ["..sss..", ".sSSSs.", "sSSSTTs", "sSTTTTs", ".TTTTT."];

const CRYSTAL = ["..c..", ".ccc.", ".cpc.", "cpppc", "cpppc", ".ppp.", "..p.."];

const CART = ["S.........S", "SpppppppppS", "SSSSSSSSSSS", ".SSSSSSSSS.", "..U.....U..", "..U.....U.."];

const LILY = [".lllll.", "..lll.."];

const REED = [".l.", ".l.", "ll.", ".l.", ".ll", ".l."];

const SCARECROW = [
  "..ddd..",
  ".dkdkd.",
  ".ddddd.",
  "..www..",
  "wwwwwww",
  "..www..",
  "..www..",
  "..w.w..",
  "..V.V..",
];

const TUFT = ["g.g.g", ".ggg.", "..G.."];

const BUTTERFLY = ["mm.mm", ".mkm.", "mm.mm"];

const FISH = [".ff.r.", "ffffrr", ".ff.r."];

const LANTERN = ["..k..", ".kkk.", "kyyyk", "kyiyk", "kyyyk", ".kkk."];

const SUN = ["..00..", ".0000.", "000000", "000000", ".0000.", "..00.."];

const SCENE_CLOUD = ["..iii...", ".iiiiii.", "iiiiiiii"];

const LEAF = ["ff", "ff"];

const SPARK = ["c"];

/** A short diagonal seam with one bright glint, not a symmetrical sparkle —
 *  sparkles scattered over a wall read as confetti. */
const ORE = [".pc", "pp."];

/* --- Scene builders ------------------------------------------------------- */

/** Scatters tufts of grass along a ground line, skipping the creature's spot. */
function scatterTufts(g: Grid, y: number, seed: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = Math.round(noise(seed + i * 2.7) * (W - 6));
    if (x > 22 && x < 42) continue;
    stamp(g, TUFT, x, y);
  }
}

function buildBerryFarm(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["3", 2],
    ["4", 3],
    ["5", 2],
    ["6", 2],
    ["7", 2],
    ["8", 2],
  ]);

  stamp(g, SUN, 48, 9);

  // Rolling pasture behind the working field.
  ridge(g, (x) => 17 + Math.sin(x / 11) * 2 + Math.sin(x / 4 + 1) * 1, "H", 22);
  box(g, 0, 20, W, 14, "G");
  box(g, 0, 20, W, 1, "g");

  // Tilled soil in the foreground, ridged every third row.
  box(g, 0, 26, W, 8, "D");
  for (let y = 27; y < H; y += 3) box(g, 0, y, W, 1, "d");
  for (let i = 0; i < 26; i++) {
    const x = Math.round(noise(i * 5.3) * W);
    const y = 27 + Math.round(noise(i * 9.1) * 6);
    put(g, x, y, "E");
  }

  // Fence line across the middle distance.
  box(g, 0, 22, W, 1, "W");
  box(g, 0, 24, W, 1, "W");
  for (let x = 1; x < W; x += 9) stamp(g, FENCE_POST, x, 21);

  stamp(g, SCARECROW, 6, 13);
  stamp(g, BUSH, 14, 20);
  stamp(g, BUSH, 44, 19);
  stamp(g, BUSH, 53, 21);
  stampFlipped(g, BUSH, 0, 22);

  scatterTufts(g, 23, 1.4, 10);
  return toRows(g);
}

function buildFishingDock(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["1", 2],
    ["2", 2],
    ["3", 3],
    ["4", 2],
    ["5", 2],
    ["6", 2],
  ]);

  stamp(g, SUN, 6, 9);

  // Far shore, then water in four depth bands.
  ridge(g, (x) => 17 + Math.sin(x / 9 + 2) * 1.5, "U", 20);
  box(g, 0, 19, W, 2, "b");
  box(g, 0, 21, W, 3, "B");
  box(g, 0, 24, W, 4, "N");
  box(g, 0, 28, W, 6, "M");

  // A few standing highlights so the water has texture before it animates.
  for (let i = 0; i < 22; i++) {
    const x = Math.round(noise(i * 3.9) * W);
    const y = 21 + Math.round(noise(i * 7.3) * 7);
    put(g, x, y, "b");
    put(g, x + 1, y, "b");
  }

  stamp(g, REED, 1, 22);
  stamp(g, REED, 4, 24);
  stampFlipped(g, REED, 59, 23);
  stamp(g, LILY, 46, 25);
  stamp(g, LILY, 52, 28);
  stamp(g, LILY, 8, 27);

  // The deck the creature actually stands on.
  box(g, 6, 29, 52, 3, "W");
  box(g, 6, 29, 52, 1, "w");
  for (let x = 6; x < 58; x += 5) box(g, x, 29, 1, 3, "V");
  for (const x of [10, 22, 40, 52]) box(g, x, 32, 2, 2, "V");

  return toRows(g);
}

function buildWoodcutting(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["2", 2],
    ["3", 3],
    ["4", 3],
    ["5", 2],
    ["7", 2],
  ]);

  // Distant treeline as a flat silhouette, then real pines in front of it.
  ridge(g, (x) => 15 + Math.sin(x / 7) * 2 + Math.sin(x / 3) * 1, "X", 21);
  for (let i = 0; i < 9; i++) {
    const x = i * 7 + Math.round(noise(i * 4.1) * 3);
    stamp(g, PINE.map((row) => row.replace(/[gGH]/g, "X")), x, 8);
  }

  box(g, 0, 21, W, 13, "H");
  box(g, 0, 21, W, 1, "G");
  box(g, 0, 26, W, 8, "J");
  box(g, 0, 26, W, 1, "H");

  stamp(g, PINE, 0, 7);
  stamp(g, OAK, 8, 9);
  stamp(g, PINE, 50, 6);
  stamp(g, OAK, 53, 10);

  stamp(g, STUMP, 12, 27);
  stamp(g, AXE, 14, 22);
  stamp(g, LOG, 44, 29);
  stamp(g, LOG, 47, 26);
  stamp(g, MUSHROOM, 6, 29);
  stamp(g, MUSHROOM, 58, 28);
  stamp(g, ROCK, 36, 23);

  scatterTufts(g, 24, 3.6, 12);
  return toRows(g);
}

function buildMining(): string[] {
  const g = makeGrid(W, H);
  box(g, 0, 0, W, H, "X");

  // Back wall, lit from the lantern side, speckled so it reads as rough rock.
  box(g, 0, 6, W, 22, "T");
  box(g, 0, 6, W, 1, "S");
  for (let i = 0; i < 110; i++) {
    const x = Math.round(noise(i * 1.9) * W);
    const y = 7 + Math.round(noise(i * 5.7) * 19);
    put(g, x, y, noise(i * 3.3) > 0.55 ? "S" : "U");
  }

  // Ceiling with stalactites biting down into the chamber.
  for (let x = 0; x < W; x++) {
    const depth = 4 + Math.abs(Math.sin(x / 5.5)) * 3 + noise(x) * 2;
    box(g, x, 0, 1, Math.round(depth), "U");
  }
  for (const [x, len] of [[7, 6], [19, 4], [33, 7], [45, 5], [57, 4]] as const) {
    for (let k = 0; k < len; k++) {
      const w = len - k > 2 ? 2 : 1;
      box(g, x, 5 + k, w, 1, "U");
    }
  }

  // Ore seams glinting in the rock face.
  for (let i = 0; i < 5; i++) {
    const x = Math.round(noise(i * 6.7) * (W - 4));
    const y = 9 + Math.round(noise(i * 11.3) * 12);
    if (x > 24 && x < 40) continue;
    stamp(g, ORE, x, y);
  }

  // Floor.
  box(g, 0, 27, W, 7, "U");
  box(g, 0, 27, W, 1, "S");
  box(g, 0, 30, W, 4, "X");
  for (let i = 0; i < 20; i++) {
    put(g, Math.round(noise(i * 2.1) * W), 28 + Math.round(noise(i * 8.8) * 2), "T");
  }

  // Rails running off to the right, with the cart parked on them.
  box(g, 30, 31, 34, 1, "s");
  box(g, 30, 33, 34, 1, "s");
  for (let x = 31; x < W; x += 4) box(g, x, 31, 1, 3, "S");
  stamp(g, CART, 46, 25);

  stamp(g, CRYSTAL, 4, 21);
  stamp(g, CRYSTAL, 10, 23);
  stamp(g, ROCK, 16, 23);
  stampFlipped(g, CRYSTAL, 40, 22);
  stamp(g, LANTERN, 2, 8);
  box(g, 4, 2, 1, 6, "V");

  return toRows(g);
}

const BUILDERS: Record<string, () => string[]> = {
  BERRY_FARM: buildBerryFarm,
  FISHING_DOCK: buildFishingDock,
  WOODCUTTING: buildWoodcutting,
  MINING: buildMining,
};

/* --- Animated overlays ---------------------------------------------------- */

interface DecoProps {
  art: readonly string[];
  x: number;
  y: number;
  className?: string;
  style?: CSSProperties;
  opacity?: number;
}

/** Outer <g> holds the position, inner <g> carries the animation — a CSS
 *  transform on the same node would clobber the translate attribute. */
function Deco({ art, x, y, className, style, opacity }: DecoProps) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <g className={className} style={style}>
        <PixelLayer rows={art} palette={P} />
      </g>
    </g>
  );
}

/** Horizontal glints that slide one pixel at a time across the water. */
const SHIMMER = (() => {
  const g = makeGrid(W, 12);
  for (let i = 0; i < 30; i++) {
    const x = Math.round(noise(i * 4.7) * W);
    const y = Math.round(noise(i * 8.2) * 12);
    box(g, x, y, 2 + Math.round(noise(i * 3.3) * 2), 1, "i");
  }
  return toRows(g);
})();

function sceneDeco(slotType: string) {
  switch (slotType) {
    case "BERRY_FARM":
      return (
        <>
          <Deco art={SCENE_CLOUD} x={0} y={10} className="px-cloud-s" opacity={0.5} />
          <Deco art={BUTTERFLY} x={16} y={17} className="px-flutter" />
          <Deco
            art={BUTTERFLY}
            x={42}
            y={21}
            className="px-flutter"
            style={{ animationDelay: "-2.1s", animationDuration: "7s" }}
          />
        </>
      );

    case "FISHING_DOCK":
      return (
        <>
          <Deco art={SCENE_CLOUD} x={0} y={10} className="px-cloud-s" opacity={0.35} />
          <g transform="translate(0 20)">
            <g className="px-shimmer">
              <PixelLayer rows={SHIMMER} palette={P} opacity={0.5} />
            </g>
          </g>
          <Deco art={FISH} x={44} y={22} className="px-fish" />
          <Deco
            art={FISH}
            x={14}
            y={24}
            className="px-fish"
            style={{ animationDelay: "-3.4s", animationDuration: "9s" }}
          />
        </>
      );

    case "WOODCUTTING":
      return (
        <>
          {[
            { x: 12, y: 10, delay: "0s" },
            { x: 54, y: 9, delay: "-2.6s" },
            { x: 30, y: 11, delay: "-4.9s" },
          ].map((leaf, i) => (
            <Deco
              key={i}
              art={LEAF}
              x={leaf.x}
              y={leaf.y}
              className="px-leaf"
              style={{ animationDelay: leaf.delay, ["--leaf-x" as string]: i % 2 ? "-7px" : "8px" }}
            />
          ))}
          {[
            { x: 8, y: 30, d: "0s" },
            { x: 56, y: 29, d: "-3.1s" },
            { x: 38, y: 31, d: "-5.5s" },
          ].map((fly, i) => (
            <Deco
              key={`f${i}`}
              art={["y"]}
              x={fly.x}
              y={fly.y}
              className="px-firefly-s"
              style={{
                animationDelay: fly.d,
                ["--ff-x" as string]: i % 2 ? "-6px" : "7px",
                ["--ff-y" as string]: "-12px",
              }}
            />
          ))}
        </>
      );

    case "MINING":
      return (
        <>
          <Deco art={CRYSTAL} x={4} y={21} className="px-glow" opacity={0.7} />
          <Deco
            art={CRYSTAL}
            x={10}
            y={23}
            className="px-glow"
            style={{ animationDelay: "-0.8s" }}
            opacity={0.7}
          />
          <Deco art={LANTERN} x={2} y={8} className="px-flicker" />
          {[
            { x: 20, y: 12, d: "0s" },
            { x: 44, y: 10, d: "-2.2s" },
            { x: 60, y: 13, d: "-4.4s" },
            { x: 32, y: 11, d: "-6.1s" },
          ].map((mote, i) => (
            <Deco
              key={i}
              art={SPARK}
              x={mote.x}
              y={mote.y}
              className="px-dust"
              style={{ animationDelay: mote.d }}
            />
          ))}
        </>
      );

    default:
      return null;
  }
}

export function SlotScene({ slotType }: { slotType: string }) {
  const rows = useMemo(() => (BUILDERS[slotType] ?? buildBerryFarm)(), [slotType]);
  const deco = useMemo(() => sceneDeco(slotType), [slotType]);

  return (
    <svg
      className="scene-art"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelLayer rows={rows} palette={P} />
      {deco}
    </svg>
  );
}
