import { TRAIT_DEFINITIONS } from "@pokerancher/shared";

/**
 * A trait as it appears on a Pokémon card: glyph, name, nothing else.
 *
 * Signature traits get the gold treatment — there is exactly one holder of each
 * in the whole roster, and that should be visible at a glance rather than
 * something you learn by reading the tooltip.
 */
export function TraitChip({ traitId, muted = false }: { traitId: string; muted?: boolean }) {
  const definition = TRAIT_DEFINITIONS[traitId];
  return (
    <span
      className={`trait-chip ${muted ? "trait-chip-muted" : ""} ${
        definition?.exclusive ? "trait-chip-signature" : ""
      }`}
      title={definition ? `${definition.name} — ${definition.description}` : traitId}
    >
      {definition?.icon && <span aria-hidden="true">{definition.icon}</span>}
      {definition?.name ?? traitId}
    </span>
  );
}

export function TraitChips({ traits, muted }: { traits: readonly string[]; muted?: boolean }) {
  if (traits.length === 0) return <span className="trait-chip trait-chip-muted">Aucun trait</span>;
  return (
    <span className="trait-chips">
      {traits.map((traitId) => (
        <TraitChip key={traitId} traitId={traitId} muted={muted} />
      ))}
    </span>
  );
}
