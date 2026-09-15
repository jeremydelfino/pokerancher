import { useMemo } from "react";
import {
  PixelLayer,
  box,
  makeGrid,
  noise,
  put,
  ridge,
  stamp,
  stampFlipped,
  toRows,
  type Grid,
  type Palette,
} from "./pixel.js";

/**
 * The things you fight.
 *
 * Four archetypes built procedurally on a 32x26 grid, each recoloured per
 * enemy. Hand-drawing eight sprites would have been eight sprites' worth of
 * typing for the same result; a boulder is a ridge with noise on it, and that
 * is genuinely how you would draw one.
 *
 * Colours are literal rather than themed: a foe should look the same at dawn
 * and at midnight, because it is lit by the fight, not by the sky.
 */

const W = 32;
const H = 26;

type Archetype = "swarm" | "rock" | "dragon" | "guardian";

interface FoeLook {
  archetype: Archetype;
  /** body, shadow, highlight, accent. */
  colors: [string, string, string, string];
}

const FOES: Record<string, FoeLook> = {
  ratatas: { archetype: "swarm", colors: ["#a87fd4", "#6b4a96", "#d4bdf0", "#f4c48a"] },
  chenipan: { archetype: "swarm", colors: ["#8fbf6a", "#4e7a3f", "#d6efb0", "#e05c72"] },
  nosferapti: { archetype: "swarm", colors: ["#5b5674", "#302c47", "#9a93bd", "#e05c72"] },
  racaillou: { archetype: "rock", colors: ["#8a7f6e", "#4f4738", "#bdb29c", "#7ce0d3"] },
  "onix-sauvage": { archetype: "rock", colors: ["#8a84a0", "#4a4463", "#c2bcd6", "#9fdbe8"] },
  dracolosse: { archetype: "dragon", colors: ["#e8a15c", "#a05f2c", "#f7d9a8", "#7ce0d3"] },
  gardien: { archetype: "guardian", colors: ["#7ba7c9", "#3d5f7d", "#cfe7f5", "#ffd479"] },
  colosse: { archetype: "rock", colors: ["#9a8c74", "#5a4f3d", "#cbbfa6", "#e05c72"] },
};

/** Falls back to a rocky lump so an enemy added in data still renders. */
function lookFor(id: string): FoeLook {
  return FOES[id] ?? { archetype: "rock", colors: ["#8a84a0", "#4a4463", "#c2bcd6", "#ffd479"] };
}

/** Enemy names are the only id the run state carries, so map them back. */
export function foeIdFromName(name: string): string {
  const slug = name.toLowerCase();
  if (slug.includes("rattata")) return "ratatas";
  if (slug.includes("chenipan")) return "chenipan";
  if (slug.includes("nosferapti")) return "nosferapti";
  if (slug.includes("racaillou")) return "racaillou";
  if (slug.includes("onix")) return "onix-sauvage";
  if (slug.includes("dracolosse")) return "dracolosse";
  if (slug.includes("gardien")) return "gardien";
  if (slug.includes("colosse")) return "colosse";
  return "racaillou";
}

/* --- Archetypes ----------------------------------------------------------- */

const EYE = ["ee", "pp"];

function eyes(g: Grid, x: number, y: number, gap: number) {
  stamp(g, EYE, x, y);
  stamp(g, EYE, x + gap, y);
}

/** A small beast: round body, ears, tail. Used three at a time. */
function beast(g: Grid, cx: number, cy: number, r: number, flip: boolean) {
  for (let dy = -r; dy <= r; dy++) {
    const span = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let dx = -span; dx <= span; dx++) {
      put(g, cx + dx, cy + dy, dy > r - 2 ? "S" : "B");
    }
  }
  // Lit crown.
  for (let dx = -r + 1; dx <= 0; dx++) put(g, cx + dx, cy - r + 1, "H");
  // Ears.
  put(g, cx - r + 1, cy - r - 1, "B");
  put(g, cx - r + 2, cy - r - 1, "B");
  put(g, cx + r - 2, cy - r - 1, "B");
  put(g, cx + r - 1, cy - r - 1, "B");
  // Tail, on the side it is facing away from.
  const tx = flip ? cx + r : cx - r;
  put(g, tx, cy + 1, "A");
  put(g, tx + (flip ? 1 : -1), cy, "A");
  if (r >= 4) eyes(g, cx - 2, cy - 1, 3);
}

function drawSwarm(g: Grid) {
  beast(g, 9, 17, 4, false);
  beast(g, 23, 18, 4, true);
  beast(g, 16, 11, 6, false);
}

function drawRock(g: Grid) {
  // A broad mound, then noise-bitten so the silhouette is not a clean arc.
  ridge(
    g,
    (x) => {
      const t = (x - 3) / 26;
      if (t < 0 || t > 1) return H;
      return 22 - Math.sin(t * Math.PI) * 15 + Math.round(noise(x * 3.1) * 2);
    },
    "B",
    H - 1
  );
  // Lit top-left face.
  for (let x = 6; x < 17; x++) {
    for (let y = 8; y < 14; y++) {
      if (g[y]?.[x] === "B" && (x + y) % 3 !== 0) put(g, x, y, "H");
    }
  }
  // Cracks.
  for (let y = 12; y < 22; y++) put(g, 19 + ((y % 3) - 1), y, "S");
  for (let y = 15; y < 21; y++) put(g, 11 + (y % 2), y, "S");
  // Rubble at the feet.
  box(g, 2, 23, 4, 2, "S");
  box(g, 26, 22, 4, 3, "S");
  eyes(g, 12, 15, 6);
}

function drawDragon(g: Grid) {
  // Coiled body.
  for (let i = 0; i < 20; i++) {
    const x = 8 + i;
    const y = 20 - Math.round(Math.sin(i / 6) * 7);
    box(g, x, y, 2, 4, "B");
    put(g, x, y, "H");
  }
  // Wing.
  const wing = [
    "..AAAA..",
    ".AAAAAA.",
    "AAAAAAA.",
    ".AAAAA..",
    "..AAA...",
    "...A....",
  ];
  stamp(g, wing, 4, 4);
  stampFlipped(g, wing, 20, 5);
  // Head and snout.
  box(g, 18, 5, 8, 6, "B");
  box(g, 25, 8, 4, 2, "B");
  box(g, 19, 6, 5, 2, "H");
  put(g, 28, 9, "S");
  eyes(g, 22, 7, 3);
}

function drawGuardian(g: Grid) {
  // Torso and legs.
  box(g, 11, 10, 11, 12, "B");
  box(g, 12, 22, 3, 4, "S");
  box(g, 18, 22, 3, 4, "S");
  // Shoulder plates.
  box(g, 7, 10, 5, 4, "S");
  box(g, 21, 10, 5, 4, "S");
  // Chest plate.
  box(g, 13, 13, 7, 5, "H");
  box(g, 15, 15, 3, 2, "A");
  // Helm.
  box(g, 12, 3, 9, 7, "B");
  box(g, 13, 4, 7, 2, "H");
  box(g, 13, 7, 7, 2, "S");
  eyes(g, 14, 7, 4);
  // Crest.
  box(g, 15, 0, 3, 3, "A");
  // Shield.
  box(g, 2, 12, 5, 9, "S");
  box(g, 3, 13, 3, 7, "H");
  put(g, 4, 16, "A");
}

const BUILDERS: Record<Archetype, (g: Grid) => void> = {
  swarm: drawSwarm,
  rock: drawRock,
  dragon: drawDragon,
  guardian: drawGuardian,
};

/* --- Component ------------------------------------------------------------ */

interface Props {
  /** The enemy's display name — the only handle the run state carries. */
  name: string;
  size?: number;
  className?: string;
}

export function Foe({ name, size = 132, className = "" }: Props) {
  const id = foeIdFromName(name);
  const look = lookFor(id);

  const rows = useMemo(() => {
    const g = makeGrid(W, H);
    BUILDERS[look.archetype](g);
    return toRows(g);
  }, [look.archetype]);

  const palette: Palette = {
    B: look.colors[0],
    S: look.colors[1],
    H: look.colors[2],
    A: look.colors[3],
    e: "#fffdf5",
    p: "#1a1428",
  };

  return (
    <span className={`foe ${className}`.trim()} title={name}>
      <svg
        className="foe-art"
        width={size}
        height={(size * H) / W}
        viewBox={`0 0 ${W} ${H}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={name}
      >
        <PixelLayer rows={rows} palette={palette} />
      </svg>
      <span className="foe-shadow" aria-hidden="true" />
    </span>
  );
}
