import { useEffect } from "react";
import { Link } from "react-router-dom";
import { resolveTraits } from "@pokerancher/shared";
import type { OwnedPokemon } from "../api/client.js";
import { CreatureAvatar } from "./CreatureAvatar.js";
import { Frame } from "./Frame.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";
import { Stars } from "./Stars.js";
import { TraitChips } from "./TraitChip.js";

interface Props {
  slotLabel: string;
  candidates: OwnedPokemon[];
  /** Everyone already in the pen — shown as "en poste" rather than offered again. */
  currentUnitIds: string[];
  resource: string;
  onPick: (pokemonUnitId: string) => void;
  onClose: () => void;
}

export function AssignSheet({
  slotLabel,
  candidates,
  currentUnitIds,
  resource,
  onPick,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <Frame
        className="sheet"
        greenery="both"
        role="dialog"
        aria-modal
        aria-label={`Choisir un compagnon pour ${slotLabel}`}
      >
        <div className="sheet-head">
          <h2 className="sheet-title">{slotLabel}</h2>
          {resource && (
            <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${resource})` }}>
              <ResourceIcon resource={resource} />
            </span>
          )}
          <span className="res-name">{resourceLabel(resource)}</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Fermer
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="empty">
            <CreatureAvatar speciesId="magikarp" size={76} />
            <p>
              Aucun compagnon libre n'a le métier qu'il faut pour cet enclos — ou ceux qui l'ont
              sont déjà partis en expédition.
            </p>
            <Link className="btn btn-magic btn-sm" to="/gacha" onClick={onClose}>
              Ouvrir un œuf
            </Link>
          </div>
        ) : (
          <div className="sheet-list">
            {candidates.map((pokemon) => {
              const active = currentUnitIds.includes(pokemon.id);
              const yieldMultiplier =
                (pokemon.species.trait?.multiplier ?? 1) * pokemon.starTier.statMultiplier;
              return (
                <button
                  key={pokemon.id}
                  className={`pick rarity-${pokemon.species.rarity} ${active ? "pick-active" : ""}`}
                  onClick={() => onPick(pokemon.id)}
                  disabled={active}
                >
                  <CreatureAvatar speciesId={pokemon.speciesId} size={64} />
                  <span className="pick-name">{pokemon.species.name}</span>
                  <Stars count={pokemon.starTier.stars} />
                  <TraitChips traits={resolveTraits(pokemon.speciesId)} />
                  <span className="pick-meta">×{yieldMultiplier.toFixed(2)} rendement</span>
                  {active && <span className="pick-meta">en poste</span>}
                </button>
              );
            })}
          </div>
        )}
      </Frame>
    </>
  );
}
