import { PixelIcon, type Palette } from "./pixel.js";

const MAX_STARS = 4;

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

export function Stars({ count, label }: { count: number; label?: string }) {
  return (
    <span
      className="stars"
      title={label ?? `${count} étoile(s)`}
      aria-label={label ?? `${count} étoiles sur ${MAX_STARS}`}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <PixelIcon
          key={i}
          art={STAR}
          palette={i < count ? LIT : DIM}
          size={12}
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
