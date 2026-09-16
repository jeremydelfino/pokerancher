import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canWalk,
  distanceFromRanch,
  featureAt,
  POKEMON_BY_ID,
  type BattleAction,
  type ValleyState,
  type Vec2,
} from "@pokerancher/shared";
import { api, type ValleyAward, type ValleyEnvelope, type ValleyRosterEntry } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar } from "../components/CreatureAvatar.js";
import { Frame } from "../components/Frame.js";
import { PokemonBattle } from "../components/PokemonBattle.js";
import { PokeSprite } from "../components/PokeSprite.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { TopBar } from "../components/TopBar.js";
import { useToast } from "../components/Toast.js";
import { CapturePanel } from "../components/valley/CapturePanel.js";
import { ValleyHud } from "../components/valley/ValleyHud.js";
import { ValleyMap } from "../components/valley/ValleyMap.js";
import { Walker } from "../components/valley/Walker.js";
import { WorldCanvas } from "../components/valley/WorldCanvas.js";
import { useDialog } from "../hooks/useDialog.js";

/**
 * 🌿 PokeValley — a cozy endless Pokémon adventure.
 *
 * The Ranch is the idle half; this is the half you play. The loop is small on
 * purpose: walk, find something, decide whether to keep walking.
 *
 * The world is never sent over the wire. The client regenerates it from the
 * seed with the same pure functions the server uses, so the only thing that
 * travels is a position and an intent.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

/* --- Departure ------------------------------------------------------------ */

function Departure({
  envelope,
  busy,
  onStart,
}: {
  envelope: ValleyEnvelope;
  busy: boolean;
  onStart: (unitIds: string[], seed?: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [seed, setSeed] = useState("");
  const free = envelope.roster.filter((unit) => !unit.busy);

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= envelope.config.teamSize
          ? current
          : [...current, id]
    );

  return (
    <div className="stage stage-no-left">
      <div className="stage-main">
        <Frame greenery="both">
          <p className="rail-title">
            Ton équipe <span>{picked.length}/{envelope.config.teamSize}</span>
          </p>
          <p className="choice-prompt">
            Trois compagnons partent avec toi. Le monde est sans fin : va aussi loin que
            tu le sens, et rentre quand tu veux — ce que tu ramènes reste au Ranch.
          </p>

          <div className="roster-grid">
            {free.map((unit) => (
              <button
                key={unit.id}
                className={`pick ${picked.includes(unit.id) ? "pick-active" : ""} rarity-${unit.species?.rarity}`}
                disabled={busy}
                onClick={() => toggle(unit.id)}
              >
                <CreatureAvatar speciesId={unit.speciesId} size={72} still shiny={unit.shiny} />
                <span className="pick-name">{unit.species?.name ?? unit.speciesId}</span>
                <span className="pick-level">N.{unit.level}</span>
              </button>
            ))}
          </div>

          {free.length === 0 && (
            <p className="synergy-empty">
              Tous tes Pokémon travaillent au Refuge. Retires-en un de son enclos pour
              l'emmener.
            </p>
          )}

          <label className="valley-seed-field">
            <span>Seed (facultatif)</span>
            <input
              type="text"
              size={1}
              value={seed}
              placeholder="POKE-7F4A-92BC"
              onChange={(event) => setSeed(event.target.value)}
            />
          </label>
          <p className="capture-hint">
            Laisse vide pour un monde neuf. Colle la seed d'un ami pour marcher
            exactement le même.
          </p>

          <button
            className="btn btn-magic btn-lg btn-block"
            style={{ marginTop: "var(--s4)" }}
            disabled={busy || picked.length === 0}
            onClick={() => onStart(picked, seed.trim() || undefined)}
          >
            {busy ? "Départ…" : "Partir pour PokeValley"}
          </button>
        </Frame>
      </div>

      <aside className="stage-rail stage-right">
        <Frame tone="dark" greenery="vine">
          <p className="rail-title">Records</p>
          <p className="stat-line">
            <span>Plus loin</span>
            <strong>{fr(envelope.record.bestDistance)} m</strong>
          </p>
          <p className="stat-line">
            <span>Expéditions</span>
            <strong>{fr(envelope.record.runs)}</strong>
          </p>
          <p className="stat-line">
            <span>Capturés</span>
            <strong>{fr(envelope.record.pokemonCaught)}</strong>
          </p>
          <p className="stat-line">
            <span>Espèces croisées</span>
            <strong>{fr(envelope.record.discovered.length)}</strong>
          </p>
        </Frame>
      </aside>
    </div>
  );
}

/* --- The recap ------------------------------------------------------------ */

function ValleyRecap({
  state,
  award,
  busy,
  onCollect,
}: {
  state: ValleyState;
  award: ValleyAward | null;
  busy: boolean;
  onCollect: () => void;
}) {
  useDialog(onCollect, { dismissible: false });
  const outcome = state.outcome;
  if (!outcome) return null;

  const won = outcome.status === "returned";
  const resources = Object.entries(award?.resources ?? outcome.banked.resources).filter(
    ([, n]) => (n ?? 0) > 0
  );

  return (
    <>
      <div className="modal-backdrop modal-backdrop-locked" />
      <Frame className={`modal recap ${won ? "recap-won" : "recap-lost"}`} greenery="both" role="dialog" aria-modal>
        <div className="recap-head">
          <p className="recap-verdict">{won ? "Expédition terminée" : "Équipe hors de combat"}</p>
          <p className="recap-message">{outcome.message}</p>
          <p className="recap-where">
            Plus loin atteint : {fr(outcome.bestDistance)} m · {fr(state.steps)} pas · seed {state.code}
          </p>
        </div>

        <div className="recap-body">
          <section className="recap-section">
            <p className="rail-title">Butin rapporté</p>
            {resources.length === 0 ? (
              <p className="recap-nothing">
                Rien n'est rentré. Un camp met le sac à l'abri — c'est ce qui sauve une
                expédition qui tourne mal.
              </p>
            ) : (
              <ul className="recap-loot">
                {resources.map(([resource, amount]) => (
                  <li key={resource} className="recap-loot-item">
                    <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${resource})` }}>
                      <ResourceIcon resource={resource} />
                    </span>
                    <span className="recap-loot-amount">+{fr(amount ?? 0)}</span>
                    <span className="recap-loot-name">{resourceLabel(resource)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(award?.caught.length ?? 0) > 0 && (
            <section className="recap-section">
              <p className="rail-title">
                Capturés <span>{award!.caught.length}</span>
              </p>
              <ul className="recap-hatch">
                {award!.caught.map((trophy, i) => (
                  <li
                    key={`${trophy.speciesId}-${i}`}
                    className={`recap-hatch-card ${trophy.isNew ? "recap-hatch-new" : ""}`}
                  >
                    <PokeSprite
                      dex={POKEMON_BY_ID[trophy.speciesId]?.dex ?? 1}
                      name={trophy.name}
                      size={72}
                      shiny={trophy.shiny}
                    />
                    <span className="recap-hatch-name">{trophy.name}</span>
                    <span className="recap-hatch-meta">
                      N.{trophy.level}
                      {trophy.alpha && " · ALPHA"}
                    </span>
                    {trophy.isNew && <span className="recap-hatch-shiny">nouveau !</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <button className="btn btn-magic btn-lg btn-block" disabled={busy} onClick={onCollect}>
          {busy ? "Récolte…" : "Récolter"}
        </button>
      </Frame>
    </>
  );
}

/* --- The page ------------------------------------------------------------- */

const KEYS: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  z: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  q: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  a: { x: -1, y: 0 },
};

export function Valley() {
  const [envelope, setEnvelope] = useState<ValleyEnvelope | null>(null);
  const [finished, setFinished] = useState<ValleyState | null>(null);
  const [award, setAward] = useState<ValleyAward | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const toast = useToast();

  const held = useRef(new Set<string>());
  const inFlight = useRef(0);

  const load = useCallback(async () => {
    setEnvelope(await api.valleyState());
  }, []);

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [load, toast]);

  const state = envelope?.run ?? null;

  /** Applies whatever a route handed back, and catches the end of the run. */
  const apply = useCallback(
    (result: { state: ValleyState; awarded?: ValleyAward | null; log?: string[] }) => {
      setEnvelope((current) => (current ? { ...current, run: result.state } : current));
      if (result.log?.length) setLog((current) => [...result.log!, ...current].slice(0, 6));
      if (result.state.outcome) {
        setFinished(result.state);
        if (result.awarded) setAward(result.awarded);
      }
    },
    []
  );

  const act = useCallback(
    async (action: () => Promise<{ state: ValleyState; awarded?: ValleyAward | null; log?: string[] }>) => {
      setBusy(true);
      try {
        apply(await action());
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [apply, toast]
  );

  /**
   * Steps waiting to be confirmed by the server.
   *
   * Drained one request at a time and strictly in order — the server resolves
   * each step against the previous one, so overlapping them would let two
   * requests race over the same tile. Prediction already hid the latency; this
   * only has to be correct.
   */
  const queue = useRef<Vec2[]>([]);
  const pumping = useRef(false);

  const sendStep = useCallback(
    async (direction: Vec2) => {
      queue.current.push(direction);
      inFlight.current += 1;
      if (pumping.current) return;

      pumping.current = true;
      try {
        while (queue.current.length > 0) {
          const next = queue.current.shift()!;
          try {
            apply(await api.valleyWalk([next]));
          } catch {
            // A refused step means the prediction was wrong; drop the rest and
            // let the reconciliation effect snap us back.
            queue.current.length = 0;
            held.current.clear();
          } finally {
            inFlight.current = Math.max(0, inFlight.current - 1);
          }
        }
      } finally {
        pumping.current = false;
      }
    },
    [apply]
  );

  /**
   * Walking.
   *
   * The first version asked the server for three tiles at a time and jumped the
   * camera when the answer came back, which is exactly as smooth as it sounds.
   * This one **predicts**: the world is a pure function of the seed, so the
   * client can check `canWalk` itself and start sliding the instant a key goes
   * down, then let the server's answer confirm or correct it.
   *
   * The server stays authoritative — it still resolves every step and every
   * encounter roll. Prediction only removes the wait, and a mismatch snaps
   * (it cannot happen for terrain, since both sides read the same tiles; it can
   * for a step refused because a battle opened, which is the point of snapping).
   */
  const anim = useRef({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, start: 0, active: false });
  const predicted = useRef<Vec2>({ x: 0, y: 0 });
  const cameraRef = useRef({ x: 0, y: 0 });
  const [motion, setMotion] = useState({ facing: 1, moving: false });

  /** One tile takes this long. Slower reads as heavy, faster as skating. */
  const STEP_MS = 145;

  // Whenever the server speaks, its position wins.
  useEffect(() => {
    if (!state) return;
    if (inFlight.current > 0) return;
    if (predicted.current.x === state.at.x && predicted.current.y === state.at.y) return;
    predicted.current = { ...state.at };
    anim.current.active = false;
    cameraRef.current = { x: 0, y: 0 };
  }, [state]);

  const walkableRef = useRef(false);
  walkableRef.current = Boolean(state && state.status === "active" && !state.battle && !finished);

  const seedRef = useRef(0);
  seedRef.current = state?.seed ?? 0;

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (!KEYS[key]) return;
      held.current.add(key);
      event.preventDefault();
    };
    const onUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      held.current.delete(key);
    };
    // A key held while the tab loses focus would otherwise walk forever.
    const onBlur = () => held.current.clear();

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);

    let raf = 0;
    let lastMoving = false;
    let lastFacing = 1;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);

      const a = anim.current;

      if (a.active) {
        const t = Math.min(1, (now - a.start) / STEP_MS);
        // Ease-out: a step should land, not coast.
        const eased = 1 - Math.pow(1 - t, 2);
        cameraRef.current = {
          x: (a.from.x - a.to.x) * (1 - eased),
          y: (a.from.y - a.to.y) * (1 - eased),
        };
        if (t >= 1) {
          a.active = false;
          cameraRef.current = { x: 0, y: 0 };
        }
      }

      const moving = a.active || held.current.size > 0;
      if (moving !== lastMoving || lastFacing !== (cameraRef.current.x > 0 ? -1 : lastFacing)) {
        lastMoving = moving;
      }

      // Start the next step the moment the last one lands.
      if (!a.active && walkableRef.current && held.current.size > 0) {
        const keys = [...held.current];
        const direction = KEYS[keys[keys.length - 1]];
        if (direction) {
          const from = predicted.current;
          const to = { x: from.x + direction.x, y: from.y + direction.y };

          if (direction.x !== 0) lastFacing = direction.x > 0 ? 1 : -1;

          if (canWalk(seedRef.current, to)) {
            predicted.current = to;
            anim.current = { from, to, start: now, active: true };
            void sendStep(direction);
          }
        }
      }

      setMotion((current) =>
        current.moving === moving && current.facing === lastFacing
          ? current
          : { moving, facing: lastFacing }
      );
    };

    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      cancelAnimationFrame(raf);
      held.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collect = () => {
    setFinished(null);
    setAward(null);
    setLog([]);
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  };

  /**
   * The world fills whatever space the page gives it.
   *
   * Hardcoding 960×560 left a third of a 16/9 screen empty, and PokeValley is a
   * mode you look at — the viewport is the point.
   */
  const [viewport, setViewport] = useState({ width: 960, height: 560 });
  const observerRef = useRef<ResizeObserver | null>(null);

  /**
   * Measure the world box whenever the element itself appears or goes away.
   *
   * ⚠️ A callback ref, not `useEffect([Boolean(state)])`. Entering a battle
   * unmounts this div and leaving one mounts a *new* one, while `Boolean(state)`
   * stays true throughout — so the effect never re-ran, no observer was ever
   * attached to the new element, and the canvas came back from a fight at
   * whatever size it happened to be holding. That was the broken map.
   */
  const worldRef = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!element) return;

    const measure = () => {
      const width = Math.max(320, Math.floor(element.clientWidth));
      // 16/9, capped so the world never pushes the help line off the screen.
      const height = Math.max(300, Math.min(Math.round(width * 0.5625), window.innerHeight - 250));
      setViewport((current) =>
        current.width === width && current.height === height ? current : { width, height }
      );
    };

    measureRef.current = measure;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  // The height is derived from `window.innerHeight`, which a vertical-only
  // resize changes without touching the element's width — so the observer alone
  // would miss it.
  const measureRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onResize = () => measureRef.current?.();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // `featureAt` is pure and regenerates the chunk, so asking on every state
  // change costs one lookup and never needs the world to be in React state.
  const underfoot = useMemo(() => (state ? featureAt(state, state.at) : null), [state]);

  if (!envelope) {
    return (
      <>
        <Ambience variant="soft" />
        <TopBar />
        <div className="page">
          <span className="skeleton" style={{ height: 420 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Ambience variant="soft" />
      <TopBar />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">PokeValley</h1>
            <p className="page-subtitle">
              {state
                ? `${fr(distanceFromRanch(state.at))} m du Ranch · seed ${state.code}`
                : "Un monde sans fin, à explorer tranquillement."}
            </p>
          </div>
        </header>

        {!state ? (
          <Departure
            envelope={envelope}
            busy={busy}
            onStart={(unitIds, seed) =>
              act(async () => {
                const started = await api.valleyStart(unitIds, seed);
                await load();
                return { state: started.state };
              })
            }
          />
        ) : state.battle ? (
          <div className="stage">
            <aside className="stage-rail stage-left">
              <Frame tone="dark" greenery="vine">
                <ValleyHud state={state} variant="rail" />
              </Frame>
            </aside>

            <div className="stage-main">
              <Frame tone="dark" greenery="none" className="battle-frame">
                <PokemonBattle
                  battle={state.battle}
                  busy={busy}
                  onAction={(action: BattleAction) => act(() => api.valleyBattle(action))}
                />
              </Frame>
            </div>

            <aside className="stage-rail stage-right">
              <Frame greenery="corner">
                <CapturePanel
                  state={state}
                  busy={busy}
                  onThrow={() =>
                    act(async () => {
                      const result = await api.valleyBall();
                      return result;
                    })
                  }
                  onFlee={() => act(() => api.valleyFlee())}
                />
              </Frame>
            </aside>
          </div>
        ) : (
          <div className="valley-screen">
            <div className="valley-world" ref={worldRef}>
              <WorldCanvas
                state={state}
                offsetRef={cameraRef}
                width={viewport.width}
                height={viewport.height}
              />

              {/* Dead centre, over the canvas — an <img> so an animated sprite
                  actually animates, which drawImage would not do for a GIF. */}
              <Walker state={state} facing={motion.facing} moving={motion.moving} />

              <ValleyHud state={state} />

              {log.length > 0 && (
                <div className="valley-log">
                  {log.map((line, i) => (
                    <p key={`${line}-${i}`} style={{ opacity: 1 - i * 0.16 }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}

              {underfoot && (
                <button
                  className="btn btn-magic valley-action"
                  disabled={busy}
                  onClick={() => act(() => api.valleyHarvest())}
                >
                  {underfoot.kind === "pokeball_plant"
                    ? "Cueillir des Pokéballs"
                    : underfoot.kind === "camp"
                      ? "S'installer au camp"
                      : `Fouiller — ${underfoot.label}`}
                </button>
              )}

              <div className="valley-controls">
                <button className="btn btn-soft btn-sm" onClick={() => setShowMap((v) => !v)}>
                  🧭 Carte
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => act(() => api.valleyReturn())}
                >
                  Rentrer au Ranch
                </button>
              </div>

              {showMap && (
                <div className="valley-map-wrap">
                  <p className="rail-title">
                    Carte <span>seed {state.code}</span>
                  </p>
                  <ValleyMap state={state} />
                  <button className="btn btn-soft btn-sm btn-block" onClick={() => setShowMap(false)}>
                    Fermer
                  </button>
                </div>
              )}
            </div>

            <p className="valley-help">
              Flèches ou ZQSD pour marcher · l'herbe haute cache des Pokémon · reviens
              quand tu veux
            </p>
          </div>
        )}
      </div>

      {finished && (
        <ValleyRecap state={finished} award={award} busy={busy} onCollect={collect} />
      )}
    </>
  );
}
