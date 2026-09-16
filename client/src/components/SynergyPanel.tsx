import { useState } from "react";
import { SYNERGIES, type SynergyState } from "@pokerancher/shared";
import { EffectGroups } from "./EffectGroups.js";
import { Stars } from "./Stars.js";

/**
 * The composition readout.
 *
 * Ordered by the engine: lit traits first, then whichever is closest to its
 * next tier. Two things earn their space here:
 *
 *  - the line at the bottom — "encore un Pokémon" is the sentence that sends a
 *    player back into a run;
 *  - and what a lit tier *actually does*, in French, split between the Refuge
 *    and the expedition. A star with no sentence next to it is decoration: the
 *    player has no way to know whether four Vigueur holders help their farm or
 *    their fights, and guesses wrong.
 */

function SynergyRow({ state }: { state: SynergyState }) {
  const [open, setOpen] = useState(false);

  const target = state.nextThreshold ?? state.count;
  const ratio = target > 0 ? Math.min(1, state.count / target) : 1;
  const lit = state.tierIndex > 0;

  // The ladder is not on SynergyState (the server sends only the live tiers),
  // so read it from the same data the server resolved against.
  const ladder = SYNERGIES[state.traitId]?.thresholds ?? [];
  const nextTier = ladder.find((tier) => tier.count === state.nextThreshold) ?? null;

  // What to say without unfolding: what it does now, or what it would do next.
  const headline = state.currentTier ?? nextTier;
  const headlineIsPromise = !state.currentTier;

  return (
    <li className={`synergy ${lit ? "synergy-lit" : ""}`}>
      <button
        className="synergy-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title={open ? "Replier l'échelle" : "Voir tous les paliers"}
      >
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
      </button>

      {state.definition?.description && open && (
        <p className="synergy-desc">{state.definition.description}</p>
      )}

      {/* Always one readable line about the effect, folded or not — that is the
          whole point of the panel. */}
      {headline && (
        <div className={`synergy-fx ${headlineIsPromise ? "synergy-fx-promise" : ""}`}>
          {headlineIsPromise && (
            <span className="fx-pending">À {headline.count} porteurs :</span>
          )}
          <EffectGroups effects={headline.effects} muted={headlineIsPromise} />
        </div>
      )}

      {open && ladder.length > 1 && (
        <ol className="synergy-ladder">
          {ladder.map((tier, index) => {
            const reached = state.count >= tier.count;
            const active = state.currentTier?.count === tier.count;
            return (
              <li
                key={tier.count}
                className={`ladder-step ${reached ? "ladder-reached" : ""} ${active ? "ladder-active" : ""}`}
              >
                <span className="ladder-head">
                  <span className="ladder-tier">{tier.label ?? `${tier.count} porteurs`}</span>
                  {active && <span className="ladder-flag">actif</span>}
                  {reached && !active && <span className="ladder-flag ladder-flag-past">remplacé</span>}
                </span>
                <EffectGroups effects={tier.effects} muted={!reached} />
                {index === 0 && ladder.length > 1 && (
                  <span className="ladder-note">
                    Seul le palier le plus haut s'applique — il remplace les précédents.
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
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
