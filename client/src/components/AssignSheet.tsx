import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { OwnedPokemon } from "../api/client.js";
import { CreatureAvatar } from "./CreatureAvatar.js";
import { Stars } from "./Stars.js";

interface Props {
  slotLabel: string;
  candidates: OwnedPokemon[];
  currentUnitId: string | null;
  onPick: (pokemonUnitId: string) => void;
  onClose: () => void;
}

export function AssignSheet({ slotLabel, candidates, currentUnitId, onPick, onClose }: Props) {
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
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`Choisir un compagnon pour ${slotLabel}`}>
        <div className="sheet-head">
          <h2 className="sheet-title">{slotLabel}</h2>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Fermer
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="empty">
            <CreatureAvatar speciesId="magikarp" size={76} />
            <p>Aucun compagnon n'a encore le talent qu'il faut pour cet enclos.</p>
            <Link className="btn btn-magic btn-sm" to="/gacha" onClick={onClose}>
              Ouvrir un œuf
            </Link>
          </div>
        ) : (
          <div className="sheet-list">
            {candidates.map((pokemon) => {
              const active = pokemon.id === currentUnitId;
              const yieldMultiplier =
                (pokemon.species.trait?.multiplier ?? 1) * pokemon.starTier.statMultiplier;
              return (
                <button
                  key={pokemon.id}
                  className={`pick rarity-${pokemon.species.rarity} ${active ? "pick-active" : ""}`}
                  onClick={() => onPick(pokemon.id)}
                >
                  <CreatureAvatar speciesId={pokemon.speciesId} size={64} />
                  <span className="pick-name">{pokemon.species.name}</span>
                  <Stars count={pokemon.starTier.stars} />
                  <span className="pick-meta">×{yieldMultiplier.toFixed(2)} rendement</span>
                  {active && <span className="pick-meta">en poste</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
