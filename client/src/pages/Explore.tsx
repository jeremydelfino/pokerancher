import { useCallback, useEffect, useMemo, useState } from "react";
import {
  POKEMON_BY_ID,
  RELICS,
  resolveSynergies,
  resolveTraits,
  type BattleAction,
  type RunState,
} from "@pokerancher/shared";
import { api, type OwnedPokemon, type RunAward, type RunEnvelope, type RunView } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { Frame } from "../components/Frame.js";
import { HealthBar } from "../components/HealthBar.js";
import { PokemonBattle } from "../components/PokemonBattle.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { RunMapView } from "../components/RunMapView.js";
import { StageSelect } from "../components/StageSelect.js";
import { SynergyPanel } from "../components/SynergyPanel.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { TypeBadges } from "../components/TypeBadge.js";
import { useToast } from "../components/Toast.js";

const fr = (n: number) => n.toLocaleString("fr-FR");

/* --- Shared pieces --------------------------------------------------------- */

function LootStrip({ loot, label }: { loot: RunState["carried"]; label: string }) {
  const entries = Object.entries(loot.resources).filter(([, amount]) => (amount ?? 0) > 0);
  const empty = entries.length === 0 && loot.eggs === 0;

  return (
    <p className="loot-strip">
      <span className="res-name">{label}</span>
      {empty && <span className="muted">vide</span>}
      {entries.map(([resource, amount]) => (
        <span key={resource} className="loot-item">
          <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${resource})` }}>
            <ResourceIcon resource={resource} />
          </span>
          {fr(amount ?? 0)}
        </span>
      ))}
      {loot.eggs > 0 && <span className="loot-item">🥚 {loot.eggs}</span>}
    </p>
  );
}

/** The left rail during a run: who is alive, how hurt, and what they bring. */
function PartyRail({ state }: { state: RunState }) {
  const alive = state.team.filter((member) => member.hp > 0).length;
  const activeKey = state.battle ? state.battle.team[state.battle.activeIndex]?.key : null;

  return (
    <Frame tone="dark" greenery="vine">
      <p className="rail-title">
        Équipe
        <span>
          {alive}/{state.team.length}
        </span>
      </p>

      <div className="party-list">
        {state.team.map((member) => {
          const species = POKEMON_BY_ID[member.speciesId];
          const down = member.hp <= 0;
          return (
            <div
              key={member.key}
              className={`party-card ${down ? "party-card-down" : ""} ${
                member.key === activeKey ? "party-card-active" : ""
              }`}
            >
              <CreatureAvatar speciesId={member.speciesId} size={44} still />
              <div className="party-body">
                <span className="party-name">
                  {species?.name ?? member.name} <span className="party-level">N.{member.level}</span>
                </span>
                <HealthBar hp={member.hp} maxHp={member.maxHp} size="sm" />
                <TypeBadges types={member.types} size="sm" />
                <TraitChips traits={resolveTraits(member.speciesId, member.extraTraits)} />
              </div>
              {down && <span className="party-ko">K.O.</span>}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** The right rail: everything the run has earned or picked up. */
function SpoilsRail({
  state,
  busy,
  onAbandon,
}: {
  state: RunState;
  busy: boolean;
  onAbandon: () => void;
}) {
  return (
    <>
      <Frame tone="dark" greenery="none">
        <p className="rail-title">Butin</p>
        <LootStrip loot={state.secured} label="Sécurisé" />
        <LootStrip loot={state.carried} label="En jeu" />
      </Frame>

      <Frame tone="dark" greenery="none">
        <p className="rail-title">
          Reliques <span>{state.relics.length}</span>
        </p>
        {state.relics.length === 0 ? (
          <p className="synergy-empty">Aucune relique pour l'instant.</p>
        ) : (
          <ul className="relic-list">
            {state.relics.map((relicId, index) => (
              <li key={`${relicId}-${index}`}>
                <strong>{RELICS[relicId]?.name ?? relicId}</strong>
                <span>{RELICS[relicId]?.description}</span>
              </li>
            ))}
          </ul>
        )}
      </Frame>

      <Frame tone="dark" greenery="none">
        <SynergyPanel synergies={resolveSynergies(state.team)} title="Synergies" />
        <button
          className="btn btn-ghost btn-sm btn-block"
          disabled={busy || Boolean(state.battle)}
          onClick={onAbandon}
          title={state.battle ? "Termine le combat d'abord" : undefined}
        >
          Abandonner l'expédition
        </button>
      </Frame>
    </>
  );
}

/* --- Departure ------------------------------------------------------------- */

function Departure({
  envelope,
  pokemon,
  busy,
  onStart,
}: {
  envelope: RunEnvelope;
  pokemon: OwnedPokemon[];
  busy: boolean;
  onStart: (unitIds: string[], stageId: string) => void;
}) {
  const firstOpen =
    envelope.stages.find((stage) => stage.unlocked && !stage.cleared) ?? envelope.stages[0];
  const [stageId, setStageId] = useState(firstOpen?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);

  const teamSize = envelope.config.teamSize;
  const stage = envelope.stages.find((s) => s.id === stageId) ?? firstOpen;

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= teamSize
          ? current
          : [...current, id]
    );

  // The preview is the point of the screen: you are picking thresholds, not
  // stat lines, so the synergies have to move while you choose.
  const preview = useMemo(
    () =>
      resolveSynergies(
        picked
          .map((id) => pokemon.find((p) => p.id === id))
          .filter((p): p is OwnedPokemon => Boolean(p))
          .map((p) => ({ speciesId: p.speciesId }))
      ),
    [picked, pokemon]
  );

  const free = pokemon.filter((unit) => !unit.busy);
  const working = pokemon.filter((unit) => unit.busy);
  const cleared = envelope.stages.filter((s) => s.cleared).length;

  return (
    <>
      {/* The road across the top: ten tiles, left to right, in the order you
          walk them. A rail made them a list; a frieze makes them a journey. */}
      <Frame greenery="corner" className="frieze-frame">
        <p className="rail-title">
          Expéditions <span>{cleared}/{envelope.stages.length} terminées</span>
        </p>
        <StageSelect stages={envelope.stages} selected={stageId} onSelect={setStageId} />
      </Frame>

      <div className="stage stage-no-left">
        <div className="stage-main">
        <Frame greenery="both">
          <p className="rail-title">
            Composer l'équipe
            <span>
              {picked.length}/{teamSize}
            </span>
          </p>

          {stage && (
            <p className="choice-prompt">
              <strong>{stage.name}</strong> — Pokémon sauvages niveau {stage.level}, par{" "}
              {stage.foes}. Ton équipe partira niveau {stage.level + 2} et plus.
            </p>
          )}

          <div className="roster-grid">
            {free.map((unit) => (
              <button
                key={unit.id}
                className={`pick ${picked.includes(unit.id) ? "pick-active" : ""} rarity-${unit.species.rarity}`}
                onClick={() => toggle(unit.id)}
                disabled={busy}
              >
                <CreatureAvatar speciesId={unit.speciesId} size={52} still />
                <span className="pick-name">{unit.species.name}</span>
                <span className="pick-level">N.{unit.level}</span>
                <TraitChips traits={resolveTraits(unit.speciesId)} />
              </button>
            ))}
          </div>

          {working.length > 0 && (
            <>
              <p className="rail-title" style={{ marginTop: "var(--s5)" }}>
                Indisponibles
              </p>
              <p className="choice-prompt">
                Un Pokémon ne fait qu'une chose à la fois : retire-le de son enclos pour l'emmener.
              </p>
              <div className="roster-grid">
                {working.map((unit) => (
                  <span key={unit.id} className="pick pick-busy" title="Occupé au Refuge">
                    <CreatureAvatar speciesId={unit.speciesId} size={52} still />
                    <span className="pick-name">{unit.species.name}</span>
                    <span className="pick-meta">N.{unit.level} · au Refuge</span>
                  </span>
                ))}
              </div>
            </>
          )}

          <button
            className="btn btn-magic btn-lg btn-block"
            style={{ marginTop: "var(--s4)" }}
            disabled={busy || picked.length === 0 || !stage?.unlocked}
            onClick={() => stage && onStart(picked, stage.id)}
          >
            {busy ? "Départ…" : stage ? `Partir pour ${stage.name}` : "Choisis une expédition"}
          </button>
        </Frame>
      </div>

        <aside className="stage-rail stage-right">
          <Frame tone="dark" greenery="vine">
            <SynergyPanel
              synergies={preview}
              title="Aperçu des synergies"
              empty="Sélectionne des compagnons pour voir ce qui s'allume."
            />
          </Frame>
        </aside>
      </div>
    </>
  );
}

/* --- Page ------------------------------------------------------------------ */

export function Explore() {
  const [envelope, setEnvelope] = useState<RunEnvelope | null>(null);
  const [pokemon, setPokemon] = useState<OwnedPokemon[]>([]);
  const [inventory, setInventory] = useState<Record<string, number> | undefined>();
  const [award, setAward] = useState<RunAward | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const [run, owned, refuge] = await Promise.all([api.runState(), api.pokemon(), api.refugeState()]);
    setEnvelope(run);
    setPokemon(owned);
    setInventory(refuge.inventory);
  }, []);

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [load, toast]);

  const act = useCallback(
    async (action: () => Promise<{ run: RunView; awarded: RunAward | null }>) => {
      setBusy(true);
      try {
        const result = await action();
        setEnvelope((current) => (current ? { ...current, run: result.run } : current));
        if (result.awarded) {
          setAward(result.awarded);
          await load();
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [load, toast]
  );

  const view = envelope?.run ?? null;
  const state = view?.state ?? null;
  const pending = state?.pending[0] ?? null;
  const battle = state?.battle ?? null;

  const restart = () => {
    setAward(null);
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  };

  const onBattle = (action: BattleAction) => act(() => api.runBattle(action));

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">L'Exploration</h1>
            <p className="page-subtitle">
              {state?.status === "active" && view
                ? `${view.stage.name} · profondeur ${state.path.length}/${view.stage.rows} · ${state.relics.length} relique(s)`
                : "Choisis une expédition, compose ton équipe, et va chercher le légendaire."}
            </p>
          </div>
        </header>

        {!envelope ? (
          <span className="skeleton" style={{ height: 420 }} />
        ) : state && state.status === "active" && view ? (
          <div className="stage">
            <aside className="stage-rail stage-left">
              <PartyRail state={state} />
            </aside>

            <div className="stage-main">
              {battle ? (
                <Frame tone="dark" greenery="none" className="battle-frame">
                  <PokemonBattle battle={battle} busy={busy} onAction={onBattle} />
                </Frame>
              ) : pending ? (
                <Frame greenery="corner">
                  <p className="rail-title">{pending.title}</p>
                  <p className="choice-prompt">{pending.prompt}</p>
                  <div className="choice-grid">
                    {pending.options.map((option) => (
                      <button
                        key={option.id}
                        className="choice-card"
                        disabled={busy}
                        onClick={() => act(() => api.runChoose(option.id))}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </Frame>
              ) : (
                <Frame tone="dark" greenery="both">
                  <p className="rail-title">
                    Choisis ton chemin <span>{view.stage.name}</span>
                  </p>
                  <RunMapView view={view} busy={busy} onEnter={(id) => act(() => api.runEnter(id))} />
                </Frame>
              )}
            </div>

            <aside className="stage-rail stage-right">
              <SpoilsRail state={state} busy={busy} onAbandon={() => act(() => api.runAbandon())} />
            </aside>
          </div>
        ) : state?.outcome ? (
          <Frame greenery="both" className="run-outcome">
            <p className="rail-title">
              {state.outcome.status === "won" ? "Expédition réussie" : "Expédition terminée"}
            </p>
            <p>{state.outcome.message}</p>
            <LootStrip loot={state.outcome.awarded} label="Butin rapporté" />
            {award?.hatched.map((hatch, index) => (
              <p key={index} className="hatch-line">
                🥚 {hatch.species.name} {hatch.isNew ? "— nouveau compagnon !" : `×${hatch.quantity}`}
              </p>
            ))}
            <button className="btn btn-primary" onClick={restart}>
              Retour aux expéditions
            </button>
          </Frame>
        ) : (
          <Departure
            envelope={envelope}
            pokemon={pokemon}
            busy={busy}
            onStart={(unitIds, stageId) => act(() => api.runStart(unitIds, stageId))}
          />
        )}
      </div>
    </>
  );
}
