import type { SynergyState } from "@pokerancher/shared";
import { Stars } from "./Stars.js";

/**
 * The composition readout.
 *
 * Ordered by the engine: lit traits first, then whichever is closest to its
 * next tier. The point of the panel is the line at the bottom — "encore un
 * Pokémon" is the sentence that sends a player back into a run.
 */

function SynergyRow({ state }: { state: SynergyState }) {
  const target = state.nextThreshold ?? state.count;
  const ratio = target > 0 ? Math.min(1, state.count / target) : 1;
  const lit = state.tierIndex > 0;

  return (
    <li className={`synergy ${lit ? "synergy-lit" : ""}`}>
      <span className="synergy-head">
        <span className="synergy-name">
          {state.definition?.icon && <span aria-hidden="true">{state.definition.icon} </span>}
          {state.definition?.name ?? state.traitId}
        </span>
        <Stars count={state.tierIndex} total={state.tierCount} />
      </span>

      <span className="synergy-track">
        <span className="synergy-fill" style={{ transform: `scaleX(${ratio})` }} />
      </span>

      <span className="synergy-meta">
        <span className="synergy-count">
          {state.count} / {state.nextThreshold ?? state.count}
        </span>
        {state.toNext !== null ? (
          <span className="synergy-next">
            encore {state.toNext} pour le palier {state.tierIndex + 1}
          </span>
        ) : (
          <span className="synergy-next synergy-max">palier maximum</span>
        )}
      </span>
    </li>
  );
}

export function SynergyPanel({
  synergies,
  title = "Synergies",
  empty = "Aucun compagnon en poste.",
}: {
  synergies: readonly SynergyState[];
  title?: string;
  empty?: string;
}) {
  // A trait nobody holds is noise; a trait one short of lighting up is the
  // whole game. Only the second kind earns a line.
  const shown = synergies.filter((state) => state.count > 0);
  const nextUp = shown.find((state) => state.toNext !== null && state.tierIndex === 0) ?? null;

  return (
    <section className="synergy-panel">
      <p className="rail-title">
        {title}
        {shown.length > 0 && <span>{shown.filter((state) => state.tierIndex > 0).length} allumée(s)</span>}
      </p>

      {shown.length === 0 ? (
        <p className="synergy-empty">{empty}</p>
      ) : (
        <ul className="synergy-list">
          {shown.map((state) => (
            <SynergyRow key={state.traitId} state={state} />
          ))}
        </ul>
      )}

      {nextUp && (
        <p className="synergy-callout">
          <strong>Prochain bonus :</strong> {nextUp.definition?.name ?? nextUp.traitId}{" "}
          {nextUp.nextThreshold} — encore {nextUp.toNext} compagnon
          {(nextUp.toNext ?? 0) > 1 ? "s" : ""}.
        </p>
      )}
    </section>
  );
}
