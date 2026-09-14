import { TRAIT_DEFINITIONS } from "@pokerancher/shared";

/** A trait as it appears on a Pokémon card: glyph, name, nothing else. */
export function TraitChip({ traitId, muted = false }: { traitId: string; muted?: boolean }) {
  const definition = TRAIT_DEFINITIONS[traitId];
  return (
    <span className={`trait-chip ${muted ? "trait-chip-muted" : ""}`} title={definition?.description}>
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
