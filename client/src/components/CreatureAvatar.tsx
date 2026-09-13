import { useMemo, useState } from "react";
import { POKEMON_BY_ID } from "@pokerancher/shared";
import { spriteIsAnimated, spriteUrl } from "../sprites.js";

/**
 * Renders a creature from whichever art source is configured (see src/sprites.ts).
 *
 * The built-in source is a parametric SVG drawn from scratch: its palette comes
 * from a hash of the species id and its silhouette details from the Refuge job it
 * is built for (leaf / fin / twig / crystal), so a pen's occupant reads at a glance.
 * It is also the fallback whenever an external sprite fails to load.
 */

type Job = "BERRY_FARM" | "FISHING_DOCK" | "WOODCUTTING" | "MINING" | "WANDERER";

/** Hue plus saturation/lightness per job, so a miner reads as stone and a fisher as water. */
const JOB_TONE: Record<Job, { hue: number; sat: number; light: number }> = {
  BERRY_FARM: { hue: 122, sat: 54, light: 62 },
  FISHING_DOCK: { hue: 196, sat: 64, light: 62 },
  WOODCUTTING: { hue: 74, sat: 40, light: 54 },
  MINING: { hue: 246, sat: 28, light: 63 },
  WANDERER: { hue: 282, sat: 56, light: 66 },
};

export const RARITY_AURA: Record<string, string | undefined> = {
  common: undefined,
  rare: "rgba(79, 168, 224, 0.55)",
  epic: "rgba(160, 111, 240, 0.6)",
  legendary: "rgba(245, 166, 35, 0.72)",
};

/** Sprite sheets pad their canvas with transparency, so draw them larger than the slot
 *  to make the creature itself fill it. Overflow is anchored upward (see .creature-sprite). */
const SPRITE_OVERSCAN = 1.55;

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
  className?: string;
}

export function CreatureAvatar({ speciesId, size = 88, rarity, still = false, className }: Props) {
  const species = POKEMON_BY_ID[speciesId];
  const resolvedRarity = rarity ?? species?.rarity ?? "common";
  const aura = RARITY_AURA[resolvedRarity];

  const url = species ? spriteUrl(species.dex) : null;
  const [spriteBroken, setSpriteBroken] = useState(false);
  const showSprite = url !== null && !spriteBroken;
  // Animated sprites already breathe on their own; stacking the CSS bob looks jittery.
  const frozen = still || (showSprite && spriteIsAnimated(url));

  return (
    <span
      className={`creature ${frozen ? "creature-still" : ""} ${className ?? ""}`}
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

function ProceduralCreature({ speciesId, size }: { speciesId: string; size: number }) {
  const species = POKEMON_BY_ID[speciesId];
  const job: Job = (species?.trait?.slot as Job) ?? "WANDERER";

  const palette = useMemo(() => {
    const seed = hashString(speciesId);
    const tone = JOB_TONE[job];
    const hue = (tone.hue + ((seed % 52) - 26) + 360) % 360;
    // Second axis of variety so two species of the same job never look like palette swaps.
    const light = tone.light + (((seed >> 11) % 13) - 6);
    const tilt = ((seed >> 5) % 2 === 0 ? 1 : -1) * (4 + ((seed >> 7) % 5));
    return {
      body: `hsl(${hue} ${tone.sat}% ${light}%)`,
      bodyDeep: `hsl(${hue} ${tone.sat - 6}% ${light - 16}%)`,
      belly: `hsl(${(hue + 12) % 360} ${tone.sat + 8}% ${Math.min(92, light + 28)}%)`,
      accent: `hsl(${(hue + 34) % 360} ${Math.min(74, tone.sat + 22)}% 48%)`,
      tilt,
    };
  }, [speciesId, job]);

  return (
    <>
      <svg
        className="creature-art"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={species?.name ?? speciesId}
      >
        <defs>
          <radialGradient id={`body-${speciesId}`} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor={palette.body} />
            <stop offset="100%" stopColor={palette.bodyDeep} />
          </radialGradient>
        </defs>

        <g transform={`rotate(${palette.tilt} 50 60)`}>
          {/* behind the body: tails and side fins */}
          {job === "FISHING_DOCK" && (
            <path d="M82 68 C94 58 100 78 90 86 C82 92 74 84 78 74 Z" fill={palette.accent} opacity="0.9" />
          )}
          {job === "WOODCUTTING" && (
            <g stroke={palette.accent} strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M36 26 C30 16 24 10 16 7" />
              <path d="M27 13 L19 16" strokeWidth="4" />
              <path d="M64 26 C70 16 76 10 84 7" />
              <path d="M73 13 L81 16" strokeWidth="4" />
            </g>
          )}

          {/* body */}
          <path
            d="M50 93 C26 93 14 76 14 57 C14 33 30 11 50 11 C70 11 86 33 86 57 C86 76 74 93 50 93 Z"
            fill={`url(#body-${speciesId})`}
          />
          {/* belly */}
          <ellipse cx="50" cy="68" rx="21" ry="18" fill={palette.belly} opacity="0.85" />
          {/* feet */}
          <ellipse cx="36" cy="91" rx="9" ry="5" fill={palette.bodyDeep} />
          <ellipse cx="64" cy="91" rx="9" ry="5" fill={palette.bodyDeep} />

          {/* in front of the body, so the job always reads */}
          {job === "FISHING_DOCK" && (
            <>
              <path d="M50 9 C57 17 60 28 59 38 L41 38 C40 28 43 17 50 9 Z" fill={palette.accent} opacity="0.92" />
              <path d="M50 9 C54 17 56 28 55.5 38 L50 38 Z" fill="#fff" opacity="0.24" />
            </>
          )}
          {job === "MINING" && (
            <>
              <path d="M32 34 L39 8 L46 34 Z" fill={palette.accent} />
              <path d="M54 32 L63 2 L72 32 Z" fill={palette.accent} />
              <path d="M63 2 L72 32 L66 32 Z" fill="#fff" opacity="0.3" />
              <path d="M39 8 L46 34 L42 34 Z" fill="#fff" opacity="0.3" />
            </>
          )}
          {job === "BERRY_FARM" && (
            <>
              <path d="M50 14 C50 8 54 3 60 2" stroke={palette.accent} strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M60 2 C70 2 74 10 68 16 C62 21 54 17 54 9 Z" fill={palette.accent} />
            </>
          )}
          {job === "WANDERER" && (
            <>
              <circle cx="50" cy="6" r="5.5" fill="var(--amber)" />
              <path d="M50 12 C46 18 54 20 50 26" stroke="var(--amber)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
              <path d="M22 62 C30 70 70 70 78 62" stroke="var(--coral)" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.75" />
            </>
          )}

          {/* face */}
          <g className="creature-eye" style={{ transformOrigin: "38px 54px" }}>
            <ellipse cx="38" cy="54" rx="5.2" ry="6.4" fill="#2f3a33" />
            <circle cx="39.8" cy="51.6" r="1.9" fill="#fff" />
          </g>
          <g className="creature-eye" style={{ transformOrigin: "62px 54px" }}>
            <ellipse cx="62" cy="54" rx="5.2" ry="6.4" fill="#2f3a33" />
            <circle cx="63.8" cy="51.6" r="1.9" fill="#fff" />
          </g>
          <ellipse cx="27" cy="64" rx="6" ry="4" fill="#ff8fa3" opacity="0.5" />
          <ellipse cx="73" cy="64" rx="6" ry="4" fill="#ff8fa3" opacity="0.5" />
          <path d="M45 65 Q50 70 55 65" stroke="#2f3a33" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </>
  );
}
