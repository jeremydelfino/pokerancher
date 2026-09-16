import { useCallback, useEffect, useState } from "react";
import {
  describeMove,
  MOVES,
  resolveTraits,
  SPECIES_BATTLE,
  SYNERGIES,
  TRAIT_DEFINITIONS,
  TYPE_CHART,
} from "@pokerancher/shared";
import { EffectGroups } from "./EffectGroups.js";
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
  const facts = describeMove(moveId);
  if (!move || !facts) return null;
  const type = TYPE_CHART[move.type];

  return (
    <button
      className={`learn-row ${selected ? "learn-row-on" : ""} ${learned ? "" : "learn-row-locked"}`}
      style={{ ["--type-color" as string]: type.color }}
      disabled={disabled || !learned}
      onClick={onToggle}
    >
      <span className="learn-check" aria-hidden="true">
        {selected ? "✓" : learned ? "" : "🔒"}
      </span>
      <span className="learn-body">
        <span className="learn-name">
          {move.name}
          <span className="learn-cat">{facts.category}</span>
        </span>
        <span className="learn-meta">
          <span className="learn-type">{type.label}</span>
          {facts.chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </span>
        {/* What it actually does. Four numbers tell a veteran what a move is;
            they tell everyone else nothing, and they say nothing at all about
            the half of the catalogue whose point is its effect. */}
        {facts.lines.map((line) => (
          <span key={line} className="learn-note">
            {line}
          </span>
        ))}
      </span>
      <span className="learn-level">{learned ? `N.${level}` : `N.${level} requis`}</span>
    </button>
  );
}

/**
 * One trait this species carries, and every tier it can reach.
 *
 * The Codex is where a player decides who to raise, and "Carapace" on a chip
 * says nothing about whether raising this one helps their farm or their fights.
 * The numbers are the answer, so they are on the sheet — the same sentences the
 * Refuge rail shows, from the same describer.
 */
function TraitBlock({ traitId }: { traitId: string }) {
  const definition = TRAIT_DEFINITIONS[traitId];
  const ladder = SYNERGIES[traitId]?.thresholds ?? [];
  if (!definition) return null;

  return (
    <section className="trait-block">
      <p className="trait-block-head">
        <span className="trait-block-name">
          {definition.icon && <span aria-hidden="true">{definition.icon} </span>}
          {definition.name}
        </span>
        {definition.exclusive && <span className="badge badge-sig">signature</span>}
      </p>
      <p className="trait-block-desc">{definition.description}</p>

      {ladder.length === 0 ? (
        <p className="trait-block-desc muted">Aucune synergie ne lit ce trait pour l'instant.</p>
      ) : (
        <ol className="trait-tiers">
          {ladder.map((tier) => (
            <li key={tier.count} className="trait-tier">
              <span className="trait-tier-count">
                {tier.label ?? `${tier.count} porteurs`}
              </span>
              <EffectGroups effects={tier.effects} />
            </li>
          ))}
        </ol>
      )}

      {ladder.length > 1 && (
        <p className="trait-block-note">
          Seul le palier le plus haut atteint s'applique — il remplace les précédents,
          il ne s'y ajoute pas. Les porteurs se comptent par espèce : deux exemplaires
          du même Pokémon n'en font qu'un.
        </p>
      )}
    </section>
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
                <PokeSprite dex={species.dex} name={species.name} size={196} shiny={sheet.shiny} />
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
            {/* --- Traits ---------------------------------------------------- */}
            <section className="sheet-section">
              <p className="rail-title">
                Traits et synergies <span>{resolveTraits(sheet.speciesId).length}</span>
              </p>
              <div className="trait-blocks">
                {resolveTraits(sheet.speciesId).map((traitId) => (
                  <TraitBlock key={traitId} traitId={traitId} />
                ))}
              </div>
            </section>
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
