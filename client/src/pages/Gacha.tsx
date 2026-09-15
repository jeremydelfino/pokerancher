import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RARITY_ORDER } from "@pokerancher/shared";
import { api, type EggCard, type GachaResult } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar, RARITY_AURA } from "../components/CreatureAvatar.js";
import { Egg } from "../components/Egg.js";
import { Frame } from "../components/Frame.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { RARITY_LABEL, Stars } from "../components/Stars.js";
import { TopBar } from "../components/TopBar.js";
import { TraitChips } from "../components/TraitChip.js";
import { useToast } from "../components/Toast.js";

type Phase = "idle" | "shaking" | "bursting" | "revealed";

const SHAKE_MS = 1150;
const BURST_MS = 520;
const fr = (n: number) => n.toLocaleString("fr-FR");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return {
    x: `${Math.cos(angle) * 170}px`,
    y: `${Math.sin(angle) * 170 - 30}px`,
    r: `${(i % 2 === 0 ? 1 : -1) * (180 + i * 22)}deg`,
    delay: `${i * 11}ms`,
  };
});

/** One egg in the shop rail: shell, price, and the odds it actually rolls. */
function EggOption({
  egg,
  balance,
  selected,
  onSelect,
}: {
  egg: EggCard;
  balance: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const affordable = balance >= egg.cost.amount;

  return (
    <button
      className={`egg-option ${selected ? "egg-option-active" : ""} ${affordable ? "" : "egg-option-poor"}`}
      style={{ ["--egg-glow" as string]: egg.palette.glow }}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="egg-option-art">
        <Egg palette={egg.palette} />
      </span>

      <span className="egg-option-body">
        <span className="egg-option-name">{egg.name}</span>
        <span className="egg-option-blurb">{egg.blurb}</span>

        <span className="egg-odds">
          {RARITY_ORDER.map((rarity) => {
            const row = egg.odds.find((o) => o.rarity === rarity);
            if (!row || row.percent === 0) return null;
            return (
              <span key={rarity} className="egg-odd" style={{ ["--rarity" as string]: `var(--rarity-${rarity})` }}>
                <span className="egg-odd-bar" style={{ height: `${Math.max(6, row.percent)}%` }} />
                <span className="egg-odd-label">{row.percent}%</span>
              </span>
            );
          })}
        </span>
      </span>

      <span className="egg-option-price">
        <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${egg.cost.resource})` }}>
          <ResourceIcon resource={egg.cost.resource} />
        </span>
        {fr(egg.cost.amount)}
      </span>
    </button>
  );
}

export function Gacha() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GachaResult | null>(null);
  const [history, setHistory] = useState<GachaResult[]>([]);
  const [eggs, setEggs] = useState<EggCard[]>([]);
  const [eggId, setEggId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number> | null>(null);
  const alive = useRef(true);
  const toast = useToast();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const [info, refuge] = await Promise.all([api.gachaInfo(), api.refugeState()]);
    if (!alive.current) return;
    setEggs(info.eggs);
    setInventory(refuge.inventory);
    setEggId((current) => current ?? info.eggs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refresh().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [refresh, toast]);

  const egg = eggs.find((candidate) => candidate.id === eggId) ?? eggs[0] ?? null;
  const balance = egg ? inventory?.[egg.cost.resource] ?? 0 : 0;
  const affordable = egg !== null && balance >= egg.cost.amount;
  const busy = phase === "shaking" || phase === "bursting";

  const handleRoll = async () => {
    if (busy || !affordable || !egg) return;
    setPhase("shaking");
    setResult(null);

    const startedAt = Date.now();
    try {
      const rolled = await api.gachaRoll(egg.id);
      await sleep(Math.max(0, SHAKE_MS - (Date.now() - startedAt)));
      if (!alive.current) return;

      setResult(rolled);
      setPhase("bursting");
      await sleep(BURST_MS);
      if (!alive.current) return;

      setPhase("revealed");
      setHistory((current) => [rolled, ...current].slice(0, 8));
      await refresh();
    } catch (err) {
      if (!alive.current) return;
      setPhase("idle");
      toast(err instanceof Error ? err.message : String(err), "error");
    }
  };

  const rarity = result?.species.rarity ?? "common";
  const showRays = phase === "revealed" && (rarity === "epic" || rarity === "legendary");

  const sparkles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        left: `${10 + ((i * 37) % 78)}%`,
        top: `${12 + ((i * 53) % 66)}%`,
        delay: `${i * 220}ms`,
      })),
    []
  );

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={inventory ?? undefined} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">La Couveuse</h1>
            <p className="page-subtitle">
              Chaque œuf a ses propres chances — et certains ne contiennent qu'un seul métier.
            </p>
          </div>
        </header>

        <div className="stage stage-wide-left stage-no-right">
          {/* Left rail: the shelf of eggs. */}
          <aside className="stage-rail stage-left">
            <Frame greenery="vine">
              <p className="rail-title">
                Les œufs <span>{eggs.length}</span>
              </p>
              <div className="egg-shelf">
                {eggs.map((option) => (
                  <EggOption
                    key={option.id}
                    egg={option}
                    balance={inventory?.[option.cost.resource] ?? 0}
                    selected={option.id === egg?.id}
                    onSelect={() => setEggId(option.id)}
                  />
                ))}
              </div>
            </Frame>
          </aside>

          {/* Centre: the incubator. */}
          <div className="stage-main">
            <Frame tone="dark" greenery="none" className="hatchery-frame">
              <div
                className={`hatchery ${phase === "revealed" ? "" : "stage-lit"}`}
                style={{ ["--egg-glow" as string]: egg?.palette.glow ?? "rgba(255,212,121,.5)" }}
              >
                <span
                  className={`rays ${showRays ? "rays-on" : ""}`}
                  style={{ ["--ray-color" as string]: RARITY_AURA[rarity] ?? "rgba(255, 221, 148, 0.55)" }}
                />

                {phase !== "revealed" && egg && (
                  <div className={`egg-wrap egg-${phase}`}>
                    <Egg palette={egg.palette} />
                    <button
                      className="egg-button"
                      onClick={handleRoll}
                      disabled={busy || !affordable}
                      aria-label={`Ouvrir un ${egg.name}`}
                    />
                  </div>
                )}

                {phase === "bursting" && (
                  <>
                    <span className="egg-flash" />
                    {SHARDS.map((shard, i) => (
                      <span
                        key={i}
                        className="shard"
                        style={{
                          ["--shard-x" as string]: shard.x,
                          ["--shard-y" as string]: shard.y,
                          ["--shard-r" as string]: shard.r,
                          animationDelay: shard.delay,
                        }}
                      />
                    ))}
                  </>
                )}

                {phase === "revealed" && result && (
                  <div className={`reveal rarity-${rarity}`}>
                    <CreatureAvatar speciesId={result.species.id} size={148} />

                    <div className="reveal-box dialogue dialogue-caret">
                      <span className="badge">{RARITY_LABEL[rarity] ?? rarity}</span>
                      <h2 className="reveal-name dialogue-type">{result.species.name}</h2>
                      <Stars count={result.starTier.stars} />
                      <TraitChips traits={[]} />
                      <p className="reveal-tag">
                        {result.isNew
                          ? "Nouveau compagnon !"
                          : `Doublon ×${result.quantity} · rendement ×${result.starTier.statMultiplier}`}
                      </p>
                      {result.starTier.nextThreshold !== null && (
                        <p className="muted" style={{ fontSize: "var(--read-sm)" }}>
                          Palier suivant à {result.starTier.nextThreshold} exemplaires
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {rarity === "legendary" &&
                  phase === "revealed" &&
                  sparkles.map((s, i) => (
                    <span key={i} className="sparkle" style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
                  ))}
              </div>
            </Frame>

            {egg && (
              <Frame greenery="corner">
                <div className="hatch-bar">
                  <div className="hatch-cost">
                    <span className="rail-title" style={{ margin: 0 }}>
                      {egg.name}
                    </span>
                    <p className="hatch-price">
                      <span
                        className="res-dot res-dot-lg"
                        style={{ ["--res-color" as string]: `var(--res-${egg.cost.resource})` }}
                      >
                        <ResourceIcon resource={egg.cost.resource} size={18} />
                      </span>
                      {fr(egg.cost.amount)} {resourceLabel(egg.cost.resource)}
                      <span className="muted"> · tu en as {fr(balance)}</span>
                    </p>
                  </div>

                  <button className="btn btn-magic btn-lg" onClick={handleRoll} disabled={busy || !affordable}>
                    {busy ? "L'œuf remue…" : affordable ? "Faire éclore" : "Trop cher"}
                  </button>
                </div>

                {!affordable && (
                  <p className="muted" style={{ fontSize: "var(--read-sm)" }}>
                    Il te manque {fr(egg.cost.amount - balance)} {resourceLabel(egg.cost.resource)} —
                    {egg.cost.resource === "coin"
                      ? " vends tes récoltes au marché."
                      : " les éclats viennent des expéditions."}
                  </p>
                )}

                {history.length > 0 && (
                  <>
                    <p className="rail-title" style={{ marginTop: "var(--s4)" }}>
                      Derniers tirages
                    </p>
                    <div className="gacha-history">
                      {history.map((entry, i) => (
                        <span
                          key={i}
                          className={`history-chip rarity-${entry.species.rarity}`}
                          title={`${entry.species.name} — ${entry.egg.name}`}
                        >
                          <CreatureAvatar speciesId={entry.species.id} size={44} still />
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </Frame>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
