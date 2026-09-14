import { PixelIcon, type Palette } from "./pixel.js";

const DEFAULT_TOTAL = 4;

const STAR = [
  "...i...",
  "...i...",
  "iiiiiii",
  ".iiiii.",
  "..iii..",
  ".ii.ii.",
  ".i...i.",
];

const LIT: Palette = { i: "#ffd479" };
const DIM: Palette = { i: "#6d5088" };

/**
 * Star rating. `total` lets the same component draw a merge tier (4 stars) and
 * an activity rating (5), rather than two near-identical components.
 */
export function Stars({
  count,
  total = DEFAULT_TOTAL,
  size = 12,
  label,
}: {
  count: number;
  total?: number;
  size?: number;
  label?: string;
}) {
  return (
    <span
      className="stars"
      title={label ?? `${count} étoile(s)`}
      aria-label={label ?? `${count} étoiles sur ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <PixelIcon
          key={i}
          art={STAR}
          palette={i < count ? LIT : DIM}
          size={size}
          className={i < count ? undefined : "star-off"}
        />
      ))}
    </span>
  );
}

export const RARITY_LABEL: Record<string, string> = {
  common: "commun",
  rare: "rare",
  epic: "épique",
  legendary: "légendaire",
};
