import { TYPE_CHART, type PokeType } from "@pokerancher/shared";

/**
 * A Pokémon type, in its own colour.
 *
 * The colours come from the chart rather than from the theme on purpose: a
 * player reads "feu" by its orange before they read the word, and that has to
 * hold at night and at noon alike.
 */
export function TypeBadge({ type, size = "md" }: { type: PokeType; size?: "sm" | "md" }) {
  const entry = TYPE_CHART[type];
  if (!entry) return null;

  return (
    <span className={`type-badge type-badge-${size}`} style={{ ["--type-color" as string]: entry.color }}>
      {entry.label}
    </span>
  );
}

export function TypeBadges({ types, size }: { types: readonly PokeType[]; size?: "sm" | "md" }) {
  return (
    <span className="type-badges">
      {types.map((type) => (
        <TypeBadge key={type} type={type} size={size} />
      ))}
    </span>
  );
}
