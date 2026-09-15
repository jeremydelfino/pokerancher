import { useCallback, useEffect, useMemo, useState } from "react";
import {
  memberMaxHp,
  POKEMON_BY_ID,
  RELICS,
  resolveSynergies,
  resolveTraits,
  runEffectBag,
} from "@pokerancher/shared";
import type { RunState } from "@pokerancher/shared";
import { api, type OwnedPokemon, type RunAward, type RunEnvelope, type RunView } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { BattleScene } from "../components/BattleScene.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { Frame } from "../components/Frame.js";
import { HealthBar } from "../components/HealthBar.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { RunMapView } from "../components/RunMapView.js";
import { SynergyPanel } from "../components/SynergyPanel.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { useToast } from "../components/Toast.js";

const fr = (n: number) => n.toLocaleString("fr-FR");

/* --- Small shared pieces --------------------------------------------------- */

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

  // Relics raise the ceiling, so the bar has to ask the effect bag for it.
  // Using the stored `maxHp` would print "76/51" the moment a +PV relic lands.
  const bag = useMemo(() => runEffectBag(state), [state]);

  return (
    <Frame tone="dark" greenery="vine">
      <p className="rail-title">
        Équipe <span>{alive}/{state.team.length}</span>
      </p>

      <div className="party-list">
        {state.team.map((member) => {
          const species = POKEMON_BY_ID[member.speciesId];
          const down = member.hp <= 0;
          return (
            <div key={member.unitId} className={`party-card ${down ? "party-card-down" : ""}`}>
              <CreatureAvatar speciesId={member.speciesId} size={44} still />
              <div className="party-body">
                <span className="party-name">{species?.name ?? member.speciesId}</span>
                <HealthBar hp={member.hp} maxHp={memberMaxHp(member, bag)} size="sm" />
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
        <SynergyPanel synergies={resolveSynergies(state.team)} title="Synergies actives" />
        <button className="btn btn-ghost btn-sm btn-block" disabled={busy} onClick={onAbandon}>
          Abandonner l'expédition
        </button>
      </Frame>
    </>
  );
}

/* --- Team picker ----------------------------------------------------------- */

function TeamPicker({
  pokemon,
  teamSize,
  busy,
  onStart,
}: {
  pokemon: OwnedPokemon[];
  teamSize: number;
  busy: boolean;
  onStart: (unitIds: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

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

  return (
    <div className="stage stage-no-left">
      <div className="stage-main">
        <Frame greenery="both">
          <p className="rail-title">
            Composer l'équipe
            <span>
              {picked.length}/{teamSize}
            </span>
          </p>

          <div className="roster-grid">
            {free.map((unit) => (
              <button
                key={unit.id}
                className={`pick ${picked.includes(unit.id) ? "pick-active" : ""} rarity-${unit.species.rarity}`}
                onClick={() => toggle(unit.id)}
                disabled={busy}
              >
                <CreatureAvatar speciesId={unit.speciesId} size={56} still />
                <span className="pick-name">{unit.species.name}</span>
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
                    <CreatureAvatar speciesId={unit.speciesId} size={56} still />
                    <span className="pick-name">{unit.species.name}</span>
                    <span className="pick-meta">au Refuge</span>
                  </span>
                ))}
              </div>
            </>
          )}

          <button
            className="btn btn-magic btn-lg btn-block"
            style={{ marginTop: "var(--s4)" }}
            disabled={busy || picked.length === 0}
            onClick={() => onStart(picked)}
          >
            {busy ? "Départ…" : `Lancer l'expédition (${picked.length})`}
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
  );
}

/* --- Page ------------------------------------------------------------------ */

export function Explore() {
  const [envelope, setEnvelope] = useState<RunEnvelope | null>(null);
  const [pokemon, setPokemon] = useState<OwnedPokemon[]>([]);
  const [inventory, setInventory] = useState<Record<string, number> | undefined>();
  const [award, setAward] = useState<RunAward | null>(null);
  const [busy, setBusy] = useState(false);
  // Which run step's fight has already been watched, so revisiting the screen
  // does not replay a battle the player already sat through.
  const [seenStep, setSeenStep] = useState(-1);
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

  const combat = state?.lastCombat;
  const replaying = Boolean(combat && state && state.step !== seenStep);

  const restart = () => {
    setAward(null);
    setSeenStep(-1);
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  };

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">L'Exploration</h1>
            <p className="page-subtitle">
              {state?.status === "active"
                ? `Profondeur ${state.path.length} · ${state.relics.length} relique(s) · ${state.team.filter((m) => m.hp > 0).length} debout`
                : "Compose une équipe, choisis ton chemin, sécurise avant d'aller trop loin."}
            </p>
          </div>
        </header>

        {!envelope ? (
          <span className="skeleton" style={{ height: 380 }} />
        ) : state && state.status === "active" ? (
          <div className="stage">
            <aside className="stage-rail stage-left">
              <PartyRail state={state} />
            </aside>

            <div className="stage-main">
              {/* The fight is the headline whenever there is one: it replays on
                  arrival, then the decision it earned appears underneath. */}
              {combat && (
                <Frame tone="dark" greenery="none" className="battle-frame">
                  <BattleScene
                    combat={combat}
                    team={state.team}
                    instant={!replaying}
                    onFinished={() => setSeenStep(state.step)}
                  />
                </Frame>
              )}

              {!replaying && pending && (
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
              )}

              {!replaying && !pending && view && (
                <Frame tone="dark" greenery="both">
                  <p className="rail-title">
                    Choisis ton chemin <span>profondeur {state.path.length}</span>
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
              Nouvelle expédition
            </button>
          </Frame>
        ) : (
          <TeamPicker
            pokemon={pokemon}
            teamSize={envelope.config.teamSize}
            busy={busy}
            onStart={(unitIds) => act(() => api.runStart(unitIds))}
          />
        )}
      </div>
    </>
  );
}
