import { useCallback, useEffect, useMemo, useState } from "react";
import { RELICS, resolveSynergies, resolveTraits } from "@pokerancher/shared";
import type { RunNode, RunState } from "@pokerancher/shared";
import { api, type OwnedPokemon, type RunAward, type RunEnvelope, type RunView } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { SynergyPanel } from "../components/SynergyPanel.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { useToast } from "../components/Toast.js";

const NODE_LABEL: Record<string, string> = {
  combat: "Combat",
  elite: "Élite",
  event: "Événement",
  reward: "Trésor",
  shop: "Échoppe",
  rest: "Camp",
  boss: "Boss",
};

function teamHp(state: RunState): { hp: number; max: number } {
  return state.team.reduce(
    (acc, member) => ({ hp: acc.hp + Math.max(0, member.hp), max: acc.max + member.maxHp }),
    { hp: 0, max: 0 }
  );
}

function LootStrip({ loot, label }: { loot: RunState["carried"]; label: string }) {
  const entries = Object.entries(loot.resources).filter(([, amount]) => (amount ?? 0) > 0);
  if (entries.length === 0 && loot.eggs === 0) {
    return (
      <p className="loot-strip">
        <span className="res-name">{label}</span> <span className="muted">vide</span>
      </p>
    );
  }
  return (
    <p className="loot-strip">
      <span className="res-name">{label}</span>
      {entries.map(([resource, amount]) => (
        <span key={resource} className="loot-item">
          <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${resource})` }}>
            <ResourceIcon resource={resource} />
          </span>
          {amount}
        </span>
      ))}
      {loot.eggs > 0 && <span className="loot-item">🥚 {loot.eggs}</span>}
    </p>
  );
}

function RunMapView({
  view,
  busy,
  onEnter,
}: {
  view: RunView;
  busy: boolean;
  onEnter: (nodeId: string) => void;
}) {
  const visited = new Set(view.state.path);
  const available = new Set(view.available);

  return (
    <div className="run-map">
      {view.map.rows.map((row, index) => (
        <div className="run-row" key={index}>
          {row.map((node: RunNode) => {
            const isAvailable = available.has(node.id);
            const isVisited = visited.has(node.id);
            return (
              <button
                key={node.id}
                className={`run-node run-node-${node.type} ${isAvailable ? "run-node-open" : ""} ${
                  isVisited ? "run-node-done" : ""
                }`}
                disabled={!isAvailable || busy}
                onClick={() => onEnter(node.id)}
              >
                {NODE_LABEL[node.type] ?? node.type}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

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

  // The preview is the whole point of the screen: you are picking thresholds,
  // not stat lines, so the synergies have to move while you choose.
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

  return (
    <div className="explore-layout">
      <section className="card explore-roster">
        <h2 className="section-title" style={{ color: "var(--ink)" }}>
          Composer l'équipe ({picked.length}/{teamSize})
        </h2>
        <div className="roster-grid">
          {pokemon.map((unit) => (
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
        <button
          className="btn btn-magic btn-lg btn-block"
          disabled={busy || picked.length === 0}
          onClick={() => onStart(picked)}
        >
          {busy ? "Départ…" : "Lancer l'expédition"}
        </button>
      </section>

      <div className="card explore-aside">
        <SynergyPanel
          synergies={preview}
          title="Aperçu des synergies"
          empty="Sélectionne des compagnons pour voir ce qui s'allume."
        />
      </div>
    </div>
  );
}

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
  const hp = state ? teamHp(state) : null;

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
                ? `Profondeur ${state.path.length} · ${state.relics.length} relique(s)`
                : "Compose une équipe, choisis ton chemin, sécurise avant d'aller trop loin."}
            </p>
          </div>
        </header>

        {!envelope ? (
          <span className="skeleton" style={{ height: 320 }} />
        ) : state && state.status === "active" ? (
          <div className="explore-layout">
            <section className="card">
              {pending ? (
                <>
                  <h2 className="section-title" style={{ color: "var(--ink)" }}>
                    {pending.title}
                  </h2>
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
                </>
              ) : (
                <>
                  <h2 className="section-title" style={{ color: "var(--ink)" }}>
                    Choisis ton chemin
                  </h2>
                  {view && <RunMapView view={view} busy={busy} onEnter={(id) => act(() => api.runEnter(id))} />}
                </>
              )}

              {state.lastCombat && (
                <p className="combat-log">
                  {state.lastCombat.victory ? "Victoire" : "Défaite"} contre {state.lastCombat.enemy.name} en{" "}
                  {state.lastCombat.rounds.length} échanges.
                </p>
              )}
            </section>

            <aside className="card explore-aside">
              <h2 className="section-title" style={{ color: "var(--ink)" }}>
                Équipe
              </h2>
              <p className="run-hp">
                {hp!.hp} / {hp!.max} PV
              </p>
              <div className="run-team">
                {state.team.map((member) => (
                  <span key={member.unitId} className={`run-member ${member.hp <= 0 ? "run-member-down" : ""}`}>
                    <CreatureAvatar speciesId={member.speciesId} size={44} still />
                    <span className="run-member-hp">{Math.max(0, member.hp)}</span>
                  </span>
                ))}
              </div>

              {state.relics.length > 0 && (
                <>
                  <p className="res-name">Reliques</p>
                  <ul className="relic-list">
                    {state.relics.map((relicId, index) => (
                      <li key={`${relicId}-${index}`} title={RELICS[relicId]?.description}>
                        {RELICS[relicId]?.name ?? relicId}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <LootStrip loot={state.secured} label="Sécurisé" />
              <LootStrip loot={state.carried} label="En jeu" />

              <SynergyPanel synergies={resolveSynergies(state.team)} title="Synergies actives" />

              <button className="btn btn-ghost btn-sm btn-block" disabled={busy} onClick={() => act(() => api.runAbandon())}>
                Abandonner
              </button>
            </aside>
          </div>
        ) : (
          <>
            {state?.outcome && (
              <section className="card run-outcome">
                <h2 className="section-title" style={{ color: "var(--ink)" }}>
                  {state.outcome.status === "won" ? "Expédition réussie" : "Expédition terminée"}
                </h2>
                <p>{state.outcome.message}</p>
                <LootStrip loot={state.outcome.awarded} label="Butin rapporté" />
                {award?.hatched.map((hatch, index) => (
                  <p key={index} className="hatch-line">
                    🥚 {hatch.species.name} {hatch.isNew ? "— nouveau compagnon !" : `×${hatch.quantity}`}
                  </p>
                ))}
                <button className="btn btn-primary" onClick={() => { setAward(null); load(); }}>
                  Nouvelle expédition
                </button>
              </section>
            )}

            {!state?.outcome && (
              <TeamPicker
                pokemon={pokemon}
                teamSize={envelope.config.teamSize}
                busy={busy}
                onStart={(unitIds) => act(() => api.runStart(unitIds))}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
