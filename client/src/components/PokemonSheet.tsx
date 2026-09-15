import { useCallback, useEffect, useState } from "react";
import { MOVES, resolveTraits, SPECIES_BATTLE, TYPE_CHART } from "@pokerancher/shared";
import { api, type PokemonSheet as Sheet } from "../api/client.js";
import { Frame } from "./Frame.js";
import { PokeSprite } from "./PokeSprite.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";
import { RARITY_LABEL, Stars } from "./Stars.js";
import { TraitChips } from "./TraitChip.js";
import { TypeBadges } from "./TypeBadge.js";
import { useDialog } from "../hooks/useDialog.js";
import { useToast } from "./Toast.js";

/**
 * One Pokémon, everything you can do to it.
 *
 * Four things live here because they are four answers to the same question —
 * "what do I do with this one?" — and splitting them across screens would make
 * the player hold the level in their head while looking at the moves.
 *
 * Nothing on this sheet computes an outcome: every button sends an intent and
 * re-renders whatever the server hands back.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

function MoveRow({
  moveId,
  level,
  learned,
  selected,
  disabled,
  onToggle,
}: {
  moveId: string;
  level: number;
  learned: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const move = MOVES[moveId];
  if (!move) return null;
  const type = TYPE_CHART[move.type];

  return (
    <button
      className={`learn-row ${selected ? "learn-row-on" : ""} ${learned ? "" : "learn-row-locked"}`}
      style={{ ["--type-color" as string]: type.color }}
      disabled={disabled || !learned}
      onClick={onToggle}
      title={move.description}
    >
      <span className="learn-check" aria-hidden="true">
        {selected ? "✓" : learned ? "" : "🔒"}
      </span>
      <span className="learn-body">
        <span className="learn-name">{move.name}</span>
        <span className="learn-meta">
          <span className="learn-type">{type.label}</span>
          <span>{move.power > 0 ? `${move.power} puis.` : "statut"}</span>
          <span>{Math.round(move.accuracy * 100)} %</span>
          <span>{move.pp} PP</span>
        </span>
      </span>
      <span className="learn-level">{learned ? `N.${level}` : `N.${level} requis`}</span>
    </button>
  );
}

interface Props {
  unitId: string;
  onClose: () => void;
  /** Fired after anything that changes the collection, so the grid can refresh. */
  onChanged: () => void;
}

export function PokemonSheet({ unitId, onClose, onChanged }: Props) {
  useDialog(onClose);
  const toast = useToast();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState(unitId);

  const load = useCallback(async (target: string) => {
    setSheet(await api.pokemonSheet(target));
  }, []);

  useEffect(() => {
    load(id).catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [id, load, toast]);

  const run = useCallback(
    async (action: () => Promise<Sheet>) => {
      setBusy(true);
      try {
        setSheet(await action());
        onChanged();
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [onChanged, toast],
  );

  const level = (steps: number) =>
    run(async () => {
      const result = await api.levelUp(id, steps);
      const learned = result.learned.map((m) => MOVES[m]?.name ?? m);
      toast(
        learned.length > 0
          ? `Niveau ${result.level} — apprend ${learned.join(", ")} !`
          : `Niveau ${result.level} !`,
        "success",
      );
      return result.unit;
    });

  const toggleMove = (moveId: string) => {
    if (!sheet) return;
    const next = sheet.moves.includes(moveId)
      ? sheet.moves.filter((m) => m !== moveId)
      : [...sheet.moves, moveId].slice(-4);
    if (next.length === 0) {
      toast("Garde au moins une attaque", "info");
      return;
    }
    run(async () => (await api.setMoves(id, next)).unit);
  };

  const evolve = (targetId: string, name: string) =>
    run(async () => {
      const result = await api.evolve(id, targetId);
      toast(`${result.from} évolue en ${name} !`, "success");
      // Merging folds this unit into an existing stack, so follow the new id.
      setId(result.unitId);
      return result.unit;
    });

  const toggleShiny = () => run(async () => (await api.setShiny(id, !sheet!.shiny)).unit);

  if (!sheet) {
    return (
      <>
        <div className="modal-backdrop" onClick={onClose} />
        <Frame className="modal" greenery="both" role="dialog" aria-modal aria-label="Fiche">
          <span className="skeleton" style={{ height: 320 }} />
        </Frame>
      </>
    );
  }

  const { species } = sheet;
  const maxed = sheet.level >= sheet.maxLevel;
  const frozen = sheet.busy?.kind === "expedition";

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <Frame
        className="modal sheet-pokemon"
        greenery="both"
        role="dialog"
        aria-modal
        aria-label={species.name}
      >
        <div className="modal-head">
          <h2 className="modal-title">{species.name}</h2>
          <span className="badge">{RARITY_LABEL[species.rarity] ?? species.rarity}</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Fermer
          </button>
        </div>

        {frozen && (
          <p className="sheet-warning">
            {species.name} est en expédition — reviens quand l'équipe est rentrée.
          </p>
        )}

        {/* Two columns on a wide screen: what the Pokémon *is* on the left,
            what it can *learn* on the right. The learnset is the only part that
            grows without bound, so it is the only part that scrolls — the rest
            of the sheet stays put instead of sliding under the frame. */}
        <div className="sheet-body">
          <div className="sheet-col">
            {/* --- Identity ---------------------------------------------------- */}
            <div className="sheet-head">
              <div className="sheet-portrait">
                <PokeSprite dex={species.dex} name={species.name} size={132} shiny={sheet.shiny} />
                {sheet.shinyUnlocked && (
                  <button
                    className={`shiny-toggle ${sheet.shiny ? "shiny-on" : ""}`}
                    disabled={busy || frozen}
                    onClick={toggleShiny}
                    title={
                      sheet.shiny ? "Revenir à la couleur normale" : "Afficher la forme chromatique"
                    }
                  >
                    ✦ {sheet.shiny ? "Chromatique" : "Normal"}
                  </button>
                )}
              </div>

              <div className="sheet-facts">
                <p className="sheet-level">
                  Niveau <strong>{sheet.level}</strong>
                  <span className="muted"> / {sheet.maxLevel}</span>
                </p>
                <TypeBadges types={SPECIES_BATTLE[sheet.speciesId]?.types ?? []} />
                <TraitChips traits={resolveTraits(sheet.speciesId)} />
                <p className="stat-line">
                  <span>Exemplaires</span>
                  <strong>×{sheet.quantity}</strong>
                </p>
                <p className="stat-line">
                  <span>Fusion</span>
                  <strong>
                    <Stars count={sheet.starTier.stars} />
                  </strong>
                </p>
                {species.trait && (
                  <p className="stat-line">
                    <span>Métier</span>
                    <strong>×{species.trait.multiplier}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* --- Level ------------------------------------------------------- */}
            <section className="sheet-section">
              <p className="rail-title">
                Entraînement
                <span>
                  {fr(sheet.balance.amount)} {resourceLabel(sheet.balance.resource)}
                </span>
              </p>

              {maxed ? (
                <p className="upgrade-done">Niveau maximum atteint</p>
              ) : (
                <div className="level-bar">
                  <button
                    className="btn btn-primary"
                    disabled={busy || frozen || !sheet.levelCost}
                    onClick={() => level(1)}
                  >
                    <span
                      className="res-dot"
                      style={{
                        ["--res-color" as string]: `var(--res-${sheet.balance.resource})`,
                      }}
                    >
                      <ResourceIcon resource={sheet.balance.resource} />
                    </span>
                    +1 niveau · {fr(sheet.levelCost?.amount ?? 0)}
                  </button>
                  <button
                    className="btn btn-soft"
                    disabled={busy || frozen || sheet.affordable < 1}
                    onClick={() => level(10)}
                    title={
                      sheet.affordable < 10
                        ? `Tu peux t'offrir ${sheet.affordable} niveau(x) pour l'instant`
                        : undefined
                    }
                  >
                    +{Math.min(10, Math.max(1, sheet.affordable))} niveaux ·{" "}
                    {fr(sheet.levelCostTen?.amount ?? 0)}
                  </button>
                </div>
              )}
            </section>

            {/* --- Evolution --------------------------------------------------- */}
            {sheet.evolutions.length > 0 && (
              <section className="sheet-section">
                <p className="rail-title">Évolution</p>
                <div className="evo-grid">
                  {sheet.evolutions.map((option) => (
                    <button
                      key={option.species.id}
                      className={`evo-card ${option.ready ? "evo-ready" : ""}`}
                      disabled={busy || frozen || !option.ready}
                      onClick={() => evolve(option.species.id, option.species.name)}
                    >
                      <PokeSprite
                        dex={option.species.dex}
                        name={option.species.name}
                        size={64}
                        shiny={sheet.shiny}
                      />
                      <span className="evo-name">{option.species.name}</span>
                      <span className="evo-req">
                        {option.ready ? "Prêt !" : `Niveau ${option.atLevel}`}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* --- Moves ----------------------------------------------------- */}
          <div className="sheet-col sheet-col-moves">
            <section className="sheet-section sheet-section-moves">
              <p className="rail-title">
                Attaques <span>{sheet.moves.length}/4</span>
              </p>
              <p className="choice-prompt">
                Monter de niveau ouvre de nouvelles attaques. Choisis-en quatre — c'est avec
                celles-là qu'il partira au combat.
              </p>
              <div className="learn-list">
                {sheet.learnset.map((entry) => (
                  <MoveRow
                    key={entry.move}
                    moveId={entry.move}
                    level={entry.level}
                    learned={entry.learned}
                    selected={sheet.moves.includes(entry.move)}
                    disabled={busy || frozen}
                    onToggle={() => toggleMove(entry.move)}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </Frame>
    </>
  );
}
