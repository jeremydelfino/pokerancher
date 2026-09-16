import {
  POKEMON_BY_ID,
  RELICS,
  type RunState,
  type StageDefinition,
} from "@pokerancher/shared";
import type { RunAward, StageCard } from "../api/client.js";
import { Frame } from "./Frame.js";
import { PokeSprite } from "./PokeSprite.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";
import { Stars } from "./Stars.js";
import { useDialog } from "../hooks/useDialog.js";

/**
 * Everything an expedition gave you, in one dialog you have to acknowledge.
 *
 * It is deliberately not dismissible: no Escape, no backdrop click, no close
 * cross. An expedition is twenty minutes of decisions, and the screen that pays
 * them out used to be a paragraph you could scroll past without reading. The
 * only exit is the button that banks the loot, so the recap is always seen.
 *
 * The numbers come from what the *server* credited (`award`), not from the run
 * state — the state says what the run was carrying, the award says what landed
 * in the account, and only the second one is the truth the player cares about.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

interface Props {
  state: RunState;
  stage: StageDefinition | null;
  award: RunAward | null;
  /** The refreshed stage list, to say which expedition this win just opened. */
  stages: readonly StageCard[];
  busy: boolean;
  onCollect: () => void;
}

export function RunRecap({ state, stage, award, stages, busy, onCollect }: Props) {
  useDialog(onCollect, { dismissible: false });

  const outcome = state.outcome;
  if (!outcome) return null;

  const won = outcome.status === "won";

  // Going home with the loot and beating the legendary are both `won`, but only
  // the second one opens the next expedition. Rather than re-deriving the
  // server's rule here, read its verdict: the refreshed board says whether this
  // stage is now cleared.
  const index = stages.findIndex((card) => card.id === state.stageId);
  const bossBeaten = won && index >= 0 && stages[index].cleared;
  const retired = won && !bossBeaten;

  // Prefer the credited amounts; fall back to the run's own tally if a run
  // somehow ended without an award (an abandon credits nothing).
  const resources = Object.entries(award?.resources ?? outcome.awarded.resources).filter(
    ([, amount]) => (amount ?? 0) > 0
  );
  const hatched = award?.hatched ?? [];
  const eggs = outcome.awarded.eggs;

  const standing = state.team.filter((member) => member.hp > 0);
  const fallen = state.team.filter((member) => member.hp <= 0);

  // Say what just opened rather than making the player go back and compare the
  // frieze to what they remember of it.
  const opened = bossBeaten ? (stages[index + 1] ?? null) : null;

  const empty = resources.length === 0 && hatched.length === 0 && state.relics.length === 0;

  return (
    <>
      <div className="modal-backdrop modal-backdrop-locked" />
      <Frame
        className={`modal recap ${bossBeaten ? "recap-won" : retired ? "recap-kept" : "recap-lost"}`}
        greenery="both"
        role="dialog"
        aria-modal
        aria-label="Fin d'expédition"
      >
        <div className="recap-head">
          <p className="recap-verdict">
            {bossBeaten ? "Légendaire vaincu" : retired ? "Butin ramené au Refuge" : "Expédition terminée"}
          </p>
          <p className="recap-message">{outcome.message}</p>
          {stage && (
            <p className="recap-where">
              {stage.name} · profondeur {outcome.depth}/{stage.rows}
            </p>
          )}
        </div>

        <div className="recap-body">
          {/* --- What you take home ---------------------------------------- */}
          <section className="recap-section">
            <p className="rail-title">Butin rapporté</p>
            {resources.length === 0 && eggs === 0 ? (
              <p className="recap-nothing">
                Rien n'est rentré — le butin non sécurisé se perd avec l'équipe.
              </p>
            ) : (
              <ul className="recap-loot">
                {resources.map(([resource, amount]) => (
                  <li key={resource} className="recap-loot-item">
                    <span
                      className="res-dot"
                      style={{ ["--res-color" as string]: `var(--res-${resource})` }}
                    >
                      <ResourceIcon resource={resource} />
                    </span>
                    <span className="recap-loot-amount">+{fr(amount ?? 0)}</span>
                    <span className="recap-loot-name">{resourceLabel(resource)}</span>
                  </li>
                ))}
                {eggs > 0 && hatched.length === 0 && (
                  <li className="recap-loot-item">
                    <span className="recap-loot-amount">+{eggs}</span>
                    <span className="recap-loot-name">œuf(s)</span>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* --- Eggs hatch on the way home, so they are a reveal ----------- */}
          {hatched.length > 0 && (
            <section className="recap-section">
              <p className="rail-title">
                Éclosions <span>{hatched.length}</span>
              </p>
              <ul className="recap-hatch">
                {hatched.map((hatch, i) => (
                  <li
                    key={`${hatch.species.id}-${i}`}
                    className={`recap-hatch-card rarity-${hatch.species.rarity} ${
                      hatch.isNew ? "recap-hatch-new" : ""
                    }`}
                  >
                    <PokeSprite
                      dex={hatch.species.dex}
                      name={hatch.species.name}
                      size={72}
                      shiny={hatch.shiny}
                    />
                    <span className="recap-hatch-name">{hatch.species.name}</span>
                    {hatch.shiny && <span className="recap-hatch-shiny">✦ Chromatique</span>}
                    <span className="recap-hatch-meta">
                      {hatch.isNew ? "nouveau !" : `×${hatch.quantity}`}
                    </span>
                    {!hatch.isNew && <Stars count={hatch.starTier.stars} />}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --- Relics are spent at the door; they still earned a line ----- */}
          {state.relics.length > 0 && (
            <section className="recap-section">
              <p className="rail-title">
                Reliques trouvées <span>{state.relics.length}</span>
              </p>
              <ul className="recap-relics">
                {state.relics.map((relicId, i) => (
                  <li key={`${relicId}-${i}`}>
                    <strong>{RELICS[relicId]?.name ?? relicId}</strong>
                    <span>{RELICS[relicId]?.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --- Who walked back out --------------------------------------- */}
          <section className="recap-section">
            <p className="rail-title">
              Équipe <span>{standing.length}/{state.team.length} debout</span>
            </p>
            <ul className="recap-team">
              {[...standing, ...fallen].map((member) => {
                const species = POKEMON_BY_ID[member.speciesId];
                const down = member.hp <= 0;
                return (
                  <li key={member.key} className={down ? "recap-down" : ""}>
                    <span className="recap-team-name">
                      {species?.name ?? member.name} <span className="party-level">N.{member.level}</span>
                    </span>
                    <span className="recap-team-hp">
                      {down ? "K.O." : `${member.hp}/${member.maxHp} PV`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {opened && (
          <p className="recap-unlock">
            <strong>Nouvelle expédition ouverte :</strong> {opened.name} — niveau {opened.level},{" "}
            {opened.rows} étapes.
          </p>
        )}

        {/* The one thing a player will otherwise get wrong: coming home rich is
            not the same as clearing the stage. */}
        {retired && (
          <p className="recap-tip">
            Le légendaire est toujours debout — {stage?.name ?? "cette expédition"} n'est pas
            terminée, et la suivante reste verrouillée. Seul le boss l'ouvre.
          </p>
        )}

        {empty && !won && (
          <p className="recap-tip">
            Sécuriser une partie du butin en cours de route, c'est ce qui fait qu'une
            expédition ratée rapporte quand même.
          </p>
        )}

        <button className="btn btn-magic btn-lg btn-block" disabled={busy} onClick={onCollect}>
          {busy ? "Récolte…" : "Récolter"}
        </button>
      </Frame>
    </>
  );
}
