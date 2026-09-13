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
 * One pixel diorama per Refuge pen, composed on an 80x36 grid.
 *
 * Legibility drives the layout:
 *   - rows 0-19 are sky, 20-27 midground, 28-35 a calm foreground band. The
 *     creature's feet land somewhere in that band whatever the card width, so
 *     it always stands on solid ground.
 *   - columns 30-50 stay clear; that is where the creature stands.
 *   - distant layers are drawn in --sc-far, a hazed tone, so depth reads
 *     without the background competing with the occupant.
 *
 * The sky ramp comes from themed CSS variables, so switching night/dawn
 * repaints every scene without re-rendering anything.
 */

const W = 80;
const H = 36;

/** Accent per pen, used by the card for its gauge. */
export const SLOT_ACCENT: Record<string, { accent: string; dark: string }> = {
  BERRY_FARM: { accent: "#e8a0ac", dark: "#c05a70" },
  FISHING_DOCK: { accent: "#9fdbe8", dark: "#3f86a8" },
  WOODCUTTING: { accent: "#b6d98f", dark: "#5f9a5e" },
  MINING: { accent: "#c7b8ec", dark: "#7a68b0" },
};

const P: Palette = {
  // sky ramp — themed
  "1": "var(--sc-1)",
  "2": "var(--sc-2)",
  "3": "var(--sc-3)",
  "4": "var(--sc-4)",
  "5": "var(--sc-5)",
  "6": "var(--sc-6)",
  "7": "var(--sc-7)",
  "8": "var(--sc-8)",
  "0": "var(--sc-sun)",
  F: "var(--sc-far)",
  // grass
  g: "#8fbf6a",
  G: "#5f9a5e",
  H: "#3c6b4a",
  J: "#35633f",
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

/** Squat conifer for the far treeline — no trunk, so neighbours merge. */
const FAR_TREE = ["..F..", "..F..", ".FFF.", ".FFF.", "FFFFF", "FFFFF"];

const SCENE_CLOUD = ["..iii...", ".iiiiii.", "iiiiiiii"];

const LEAF = ["ff", "ff"];

const SPARK = ["c"];

/** A short diagonal seam with one bright glint, not a symmetrical sparkle —
 *  sparkles scattered over a wall read as confetti. */
const ORE = [".pc", "pp."];

/** Columns the creature occupies; nothing tall is placed here. */
const CLEAR_FROM = 30;
const CLEAR_TO = 50;

/* --- Scene builders ------------------------------------------------------- */

function scatterTufts(g: Grid, y: number, seed: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = Math.round(noise(seed + i * 2.7) * (W - 6));
    if (x > CLEAR_FROM && x < CLEAR_TO) continue;
    stamp(g, TUFT, x, y);
  }
}

function buildBerryFarm(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["3", 2],
    ["4", 3],
    ["5", 3],
    ["6", 3],
    ["7", 2],
    ["8", 2],
  ]);

  stamp(g, SUN, 62, 11);

  // Hazed hedgerow in the distance, then the pasture.
  ridge(g, (x) => 19 + Math.sin(x / 13) * 1.6, "F", 23);
  box(g, 0, 21, W, 15, "G");
  box(g, 0, 21, W, 1, "g");

  // Foreground: worked soil, ridged every third row and lightly stony.
  box(g, 0, 28, W, 8, "D");
  for (let y = 29; y < H; y += 3) box(g, 0, y, W, 1, "d");
  for (let i = 0; i < 12; i++) {
    put(g, Math.round(noise(i * 5.3) * W), 29 + Math.round(noise(i * 9.1) * 6), "E");
  }

  // Fence line between pasture and field.
  box(g, 0, 23, W, 1, "W");
  box(g, 0, 25, W, 1, "W");
  for (let x = 3; x < W; x += 10) stamp(g, FENCE_POST, x, 21);

  stamp(g, SCARECROW, 10, 15);
  stampFlipped(g, BUSH, 1, 21);
  stamp(g, BUSH, 14, 21);
  stamp(g, BUSH, 62, 21);
  stampFlipped(g, BUSH, 71, 22);

  scatterTufts(g, 25, 1.4, 8);
  return toRows(g);
}

function buildFishingDock(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["1", 2],
    ["2", 3],
    ["3", 3],
    ["4", 3],
    ["5", 2],
    ["6", 2],
  ]);

  stamp(g, SUN, 14, 11);

  // Far shore, then the lake in depth bands.
  ridge(g, (x) => 19 + Math.sin(x / 11 + 2) * 1.2, "F", 22);
  box(g, 0, 21, W, 2, "b");
  box(g, 0, 23, W, 3, "B");
  box(g, 0, 26, W, 3, "N");

  // Standing highlights so the water has texture even before it animates.
  for (let i = 0; i < 16; i++) {
    const x = Math.round(noise(i * 3.9) * W);
    const y = 23 + Math.round(noise(i * 7.3) * 5);
    box(g, x, y, 2, 1, "b");
  }

  stamp(g, REED, 2, 23);
  stamp(g, REED, 6, 25);
  stampFlipped(g, REED, 75, 24);
  stamp(g, LILY, 14, 26);
  stamp(g, LILY, 64, 25);
  stampFlipped(g, LILY, 70, 27);

  // A broad deck fills the foreground, so the creature always has planks
  // underfoot however the card crops.
  box(g, 0, 29, W, 7, "W");
  box(g, 0, 29, W, 1, "w");
  box(g, 0, 30, W, 1, "V");
  for (let x = 0; x < W; x += 7) box(g, x, 30, 1, 6, "V");

  return toRows(g);
}

function buildWoodcutting(): string[] {
  const g = makeGrid(W, H);
  paintBands(g, [
    ["2", 2],
    ["3", 3],
    ["4", 3],
    ["5", 3],
    ["7", 2],
    ["8", 2],
  ]);

  // Distant treeline: small conifers stamped every four columns so they
  // overlap into one mass, with a closing band underneath. A single serrated
  // ridge instead reads as a comb, and full-size pines read as candelabras.
  for (let x = -2; x < W + 2; x += 4) {
    stamp(g, FAR_TREE, x, 15 + Math.round(noise(x * 1.3) * 2));
  }
  box(g, 0, 20, W, 2, "F");

  box(g, 0, 21, W, 15, "H");
  box(g, 0, 21, W, 1, "G");
  box(g, 0, 28, W, 8, "J");
  box(g, 0, 28, W, 1, "H");
  // Speckle the clearing floor so it is not a flat slab behind the occupant.
  for (let i = 0; i < 22; i++) {
    put(g, Math.round(noise(i * 4.4) * W), 29 + Math.round(noise(i * 6.2) * 6), "H");
  }

  stamp(g, PINE, 0, 8);
  stamp(g, OAK, 10, 11);
  stamp(g, PINE, 70, 7);
  stamp(g, OAK, 60, 12);

  stamp(g, STUMP, 13, 29);
  stamp(g, AXE, 15, 24);
  stamp(g, LOG, 62, 31);
  stamp(g, LOG, 66, 28);
  stamp(g, MUSHROOM, 5, 31);
  stamp(g, MUSHROOM, 74, 30);
  stamp(g, ROCK, 24, 25);

  scatterTufts(g, 26, 3.6, 9);
  return toRows(g);
}

function buildMining(): string[] {
  const g = makeGrid(W, H);
  box(g, 0, 0, W, H, "X");

  // Back wall, speckled so it reads as rough rock rather than flat fill.
  box(g, 0, 8, W, 21, "T");
  box(g, 0, 8, W, 1, "S");
  for (let i = 0; i < 120; i++) {
    const x = Math.round(noise(i * 1.9) * W);
    const y = 9 + Math.round(noise(i * 5.7) * 18);
    put(g, x, y, noise(i * 3.3) > 0.55 ? "S" : "U");
  }

  // Ceiling with stalactites biting down into the chamber.
  for (let x = 0; x < W; x++) {
    box(g, x, 0, 1, Math.round(5 + Math.abs(Math.sin(x / 6)) * 3 + noise(x) * 2), "U");
  }
  for (const [x, len] of [[9, 6], [23, 4], [41, 7], [57, 5], [71, 4]] as const) {
    for (let k = 0; k < len; k++) box(g, x, 7 + k, len - k > 2 ? 2 : 1, 1, "U");
  }

  // Ore seams in the rock face, away from where the creature stands.
  for (let i = 0; i < 6; i++) {
    const x = Math.round(noise(i * 6.7) * (W - 4));
    const y = 11 + Math.round(noise(i * 11.3) * 13);
    if (x > CLEAR_FROM && x < CLEAR_TO) continue;
    stamp(g, ORE, x, y);
  }

  // Floor.
  box(g, 0, 29, W, 7, "U");
  box(g, 0, 29, W, 1, "S");
  box(g, 0, 33, W, 3, "X");
  for (let i = 0; i < 18; i++) {
    put(g, Math.round(noise(i * 2.1) * W), 30 + Math.round(noise(i * 8.8) * 2), "T");
  }

  // Rails running off to the right, with the cart parked on them.
  box(g, 52, 33, W - 52, 1, "s");
  box(g, 52, 35, W - 52, 1, "s");
  for (let x = 53; x < W; x += 5) box(g, x, 33, 1, 3, "S");
  stamp(g, CART, 62, 27);

  stamp(g, CRYSTAL, 4, 24);
  stamp(g, CRYSTAL, 12, 26);
  stamp(g, ROCK, 20, 26);
  stampFlipped(g, CRYSTAL, 52, 25);
  stamp(g, LANTERN, 4, 11);
  box(g, 6, 5, 1, 6, "V");

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
  const g = makeGrid(W, 8);
  for (let i = 0; i < 26; i++) {
    box(
      g,
      Math.round(noise(i * 4.7) * W),
      Math.round(noise(i * 8.2) * 8),
      2 + Math.round(noise(i * 3.3) * 2),
      1,
      "i"
    );
  }
  return toRows(g);
})();

function sceneDeco(slotType: string) {
  switch (slotType) {
    case "BERRY_FARM":
      return (
        <>
          <Deco art={SCENE_CLOUD} x={0} y={13} className="px-cloud-s" opacity={0.4} />
          <Deco art={BUTTERFLY} x={20} y={22} className="px-flutter" />
          <Deco
            art={BUTTERFLY}
            x={56}
            y={24}
            className="px-flutter"
            style={{ animationDelay: "-2.1s", animationDuration: "7s" }}
          />
        </>
      );

    case "FISHING_DOCK":
      return (
        <>
          <Deco art={SCENE_CLOUD} x={0} y={13} className="px-cloud-s" opacity={0.3} />
          <g transform="translate(0 22)">
            <g className="px-shimmer">
              <PixelLayer rows={SHIMMER} palette={P} opacity={0.45} />
            </g>
          </g>
          <Deco art={FISH} x={58} y={24} className="px-fish" />
          <Deco
            art={FISH}
            x={18}
            y={26}
            className="px-fish"
            style={{ animationDelay: "-3.4s", animationDuration: "9s" }}
          />
        </>
      );

    case "WOODCUTTING":
      return (
        <>
          {[
            { x: 14, y: 12, delay: "0s" },
            { x: 66, y: 11, delay: "-2.6s" },
            { x: 36, y: 13, delay: "-4.9s" },
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
            { x: 8, y: 32, d: "0s" },
            { x: 70, y: 31, d: "-3.1s" },
            { x: 46, y: 33, d: "-5.5s" },
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
          <Deco art={CRYSTAL} x={4} y={24} className="px-glow" opacity={0.7} />
          <Deco
            art={CRYSTAL}
            x={12}
            y={26}
            className="px-glow"
            style={{ animationDelay: "-0.8s" }}
            opacity={0.7}
          />
          <Deco art={LANTERN} x={4} y={11} className="px-flicker" />
          {[
            { x: 24, y: 14, d: "0s" },
            { x: 54, y: 12, d: "-2.2s" },
            { x: 72, y: 15, d: "-4.4s" },
            { x: 40, y: 13, d: "-6.1s" },
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
      {/* One themed wash over the terrain: it shifts the whole pen to the time
          of day and takes the edge off the contrast at the same time. */}
      <rect x="0" y="0" width={W} height={H} fill="var(--sc-tint)" />
      {deco}
    </svg>
  );
}
