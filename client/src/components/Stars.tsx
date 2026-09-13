const MAX_STARS = 4;

export function Stars({ count, label }: { count: number; label?: string }) {
  return (
    <span className="stars" title={label ?? `${count} étoile(s)`} aria-label={label ?? `${count} étoiles sur ${MAX_STARS}`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span key={i} className={i < count ? undefined : "star-off"} aria-hidden="true">
          ★
        </span>
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
