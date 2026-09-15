import { useMemo, useState } from "react";
import { POKEMON_BY_ID } from "@pokerancher/shared";
import { spriteIsAnimated, spriteUrl } from "../sprites.js";
import { PixelLayer, makeGrid, stamp, toRows, type Palette } from "./pixel.js";

/**
 * Renders a creature from whichever art source is configured (see src/sprites.ts).
 *
 * The built-in source is a 12x16 pixel creature: its palette comes from a hash
 * of the species id and its silhouette detail from the Refuge job it is built
 * for (leaf / fin / twigs / crystal), so a pen's occupant reads at a glance.
 * It is also the fallback whenever an external sprite fails to load.
 */

type Job = "BERRY_FARM" | "FISHING_DOCK" | "WOODCUTTING" | "MINING" | "WANDERER";

/** Hue plus saturation/lightness per job, so a miner reads as stone and a fisher as water. */
const JOB_TONE: Record<Job, { hue: number; sat: number; light: number }> = {
  BERRY_FARM: { hue: 108, sat: 46, light: 58 },
  FISHING_DOCK: { hue: 194, sat: 52, light: 58 },
  WOODCUTTING: { hue: 78, sat: 36, light: 52 },
  MINING: { hue: 258, sat: 26, light: 60 },
  WANDERER: { hue: 292, sat: 44, light: 62 },
};

export const RARITY_AURA: Record<string, string | undefined> = {
  common: undefined,
  rare: "rgba(90, 168, 196, 0.6)",
  epic: "rgba(197, 107, 214, 0.6)",
  legendary: "rgba(242, 176, 61, 0.7)",
};

/** Sprite sheets pad their canvas with transparency, so draw them larger than
 *  the slot to make the creature itself fill it (see .creature-sprite). */
const SPRITE_OVERSCAN = 1.55;

/** Face and belly are kept apart on purpose: a pale patch directly under the
 *  eyes stops reading as a belly and starts reading as a muzzle. */
const BODY = [
  "...AAAAAA...",
  "..ABBBBBBA..",
  ".ABBBBBBBBA.",
  "ABBKiBBiKBBA",
  "ABBBBBBBBBBA",
  "ABBmBBBBmBBA",
  "ABBBBkkBBBBA",
  "ABBBBBBBBBBA",
  "AABBBCCBBBAA",
  ".ABBCCCCBBA.",
  ".AABCCCCBAA.",
  "..AABBBBAA..",
  "...AA..AA...",
  "..DD....DD..",
];

const CROWN: Record<Job, string[]> = {
  BERRY_FARM: ["......XY....", ".....XYX....", "......X.....", "............"],
  FISHING_DOCK: [".....XX.....", "....XXYX....", "....XXYX....", ".....XX....."],
  WOODCUTTING: ["..X......X..", "...X....X...", "....X..X....", "............"],
  MINING: [".....X......", "....XYX.....", "....XXX.....", ".....X......"],
  WANDERER: [".....X......", ".....X......", "....XYX.....", "............"],
};

const GRID_W = 12;
const GRID_H = 18;

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Props {
  speciesId: string;
  size?: number;
  /** Falls back to the species' own rarity when omitted. */
  rarity?: string;
  still?: boolean;
  shiny?: boolean;
  className?: string;
}

export function CreatureAvatar({ speciesId, size = 88, rarity, still = false, shiny = false, className }: Props) {
  const species = POKEMON_BY_ID[speciesId];
  const resolvedRarity = rarity ?? species?.rarity ?? "common";
  const aura = RARITY_AURA[resolvedRarity];

  const url = species ? spriteUrl(species.dex, false, shiny) : null;
  const [spriteBroken, setSpriteBroken] = useState(false);
  const showSprite = url !== null && !spriteBroken;
  // Animated sprites already breathe on their own; stacking the CSS bob looks jittery.
  const frozen = still || (showSprite && spriteIsAnimated(url));

  return (
    <span
      className={`creature ${frozen ? "creature-still" : ""} ${shiny ? "creature-shiny" : ""} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {aura && <span className="creature-aura" style={{ ["--aura-color" as string]: aura }} />}
      {!showSprite && <span className="creature-shadow" />}

      {showSprite ? (
        <img
          className="creature-art creature-sprite"
          src={url}
          width={Math.round(size * SPRITE_OVERSCAN)}
          height={Math.round(size * SPRITE_OVERSCAN)}
          alt={species?.name ?? speciesId}
          draggable={false}
          onError={() => setSpriteBroken(true)}
        />
      ) : (
        <ProceduralCreature speciesId={speciesId} size={size} />
      )}
    </span>
  );
}

/**
 * The parametric creature.
 *
 * Exported because it is also the stand-in for a battler with no sprite source
 * configured — a wild Pokémon still deserves a silhouette rather than a letter
 * in a box.
 */
export function ProceduralCreature({ speciesId, size }: { speciesId: string; size: number }) {
  const species = POKEMON_BY_ID[speciesId];
  const job: Job = (species?.trait?.slot as Job) ?? "WANDERER";

  const { rows, palette } = useMemo(() => {
    const seed = hashString(speciesId);
    const tone = JOB_TONE[job];
    const hue = (tone.hue + ((seed % 52) - 26) + 360) % 360;
    // Second axis of variety so two species of the same job never look like palette swaps.
    const light = tone.light + (((seed >> 11) % 13) - 6);
    const accentHue = (hue + 40 + ((seed >> 3) % 40)) % 360;

    const g = makeGrid(GRID_W, GRID_H);
    stamp(g, CROWN[job], 0, 0);
    stamp(g, BODY, 0, 4);

    return {
      rows: toRows(g),
      palette: {
        A: `hsl(${hue} ${tone.sat}% ${Math.max(18, light - 20)}%)`,
        B: `hsl(${hue} ${tone.sat}% ${light}%)`,
        C: `hsl(${(hue + 14) % 360} ${tone.sat + 10}% ${Math.min(78, light + 14)}%)`,
        D: `hsl(${hue} ${tone.sat}% ${Math.max(14, light - 30)}%)`,
        X: `hsl(${accentHue} ${Math.min(72, tone.sat + 22)}% 46%)`,
        Y: `hsl(${accentHue} ${Math.min(80, tone.sat + 30)}% 68%)`,
        m: `hsl(${(hue + 340) % 360} 62% ${Math.min(80, light + 14)}%)`,
        k: "#1a1428",
        K: "#1a1428",
        i: "#fffdf5",
      } satisfies Palette,
    };
  }, [speciesId, job]);

  // Anchored to the floor of its box (xMidYMax) so creatures of different sizes
  // still line up on the same ground line.
  return (
    <svg
      className="creature-art"
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      role="img"
      aria-label={species?.name ?? speciesId}
    >
      <PixelLayer rows={rows} palette={palette} />
    </svg>
  );
}
