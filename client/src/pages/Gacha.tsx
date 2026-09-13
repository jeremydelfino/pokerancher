import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type GachaResult } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { CreatureAvatar, RARITY_AURA } from "../components/CreatureAvatar.js";
import { Egg } from "../components/Egg.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { RARITY_LABEL, Stars } from "../components/Stars.js";
import { TopBar } from "../components/TopBar.js";
import { useToast } from "../components/Toast.js";

type Phase = "idle" | "shaking" | "bursting" | "revealed";

const SHAKE_MS = 1150;
const BURST_MS = 520;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    x: `${Math.cos(angle) * 150}px`,
    y: `${Math.sin(angle) * 150 - 30}px`,
    r: `${(i % 2 === 0 ? 1 : -1) * (180 + i * 24)}deg`,
    delay: `${i * 12}ms`,
  };
});

export function Gacha() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GachaResult | null>(null);
  const [history, setHistory] = useState<GachaResult[]>([]);
  const [eggCost, setEggCost] = useState<{ resource: string; amount: number } | null>(null);
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
    setEggCost(info.eggCost);
    setInventory(refuge.inventory);
  }, []);

  useEffect(() => {
    refresh().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [refresh, toast]);

  const balance = eggCost ? inventory?.[eggCost.resource] ?? 0 : 0;
  const affordable = eggCost !== null && balance >= eggCost.amount;
  const busy = phase === "shaking" || phase === "bursting";

  const handleRoll = async () => {
    if (busy || !affordable) return;
    setPhase("shaking");
    setResult(null);

    const startedAt = Date.now();
    try {
      const rolled = await api.gachaRoll();
      await sleep(Math.max(0, SHAKE_MS - (Date.now() - startedAt)));
      if (!alive.current) return;

      setResult(rolled);
      setPhase("bursting");
      await sleep(BURST_MS);
      if (!alive.current) return;

      setPhase("revealed");
      setHistory((current) => [rolled, ...current].slice(0, 6));
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
      Array.from({ length: 6 }, (_, i) => ({
        left: `${12 + ((i * 37) % 76)}%`,
        top: `${14 + ((i * 53) % 64)}%`,
        delay: `${i * 240}ms`,
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
            <h1 className="page-title">Les Œufs</h1>
            <p className="page-subtitle">
              Chaque doublon renforce le compagnon déjà présent — 2, 4, 8 puis 16 exemplaires.
            </p>
          </div>
        </header>

        <div className="gacha-layout">
          <div className={`gacha-stage ${phase === "revealed" ? "" : "stage-lit"}`}>
            <span
              className={`rays ${showRays ? "rays-on" : ""}`}
              style={{ ["--ray-color" as string]: RARITY_AURA[rarity] ?? "rgba(255, 221, 148, 0.55)" }}
            />

            {phase !== "revealed" && (
              <div className={`egg-wrap egg-${phase}`}>
                <Egg />
                <button
                  className="egg-button"
                  onClick={handleRoll}
                  disabled={busy || !affordable}
                  aria-label="Ouvrir un œuf"
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
                <CreatureAvatar speciesId={result.species.id} size={132} />

                {/* The result lands in a handheld-RPG text box rather than loose copy. */}
                <div className="reveal-box dialogue dialogue-caret">
                  <span className="badge">{RARITY_LABEL[rarity] ?? rarity}</span>
                  <h2 className="reveal-name dialogue-type">{result.species.name}</h2>
                  <Stars count={result.starTier.stars} />
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

          <div className="gacha-panel card">
            {eggCost && (
              <p className="gacha-cost">
                <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${eggCost.resource})` }}>
                  <ResourceIcon resource={eggCost.resource} />
                </span>
                {eggCost.amount} {resourceLabel(eggCost.resource)} par œuf · tu en as {balance.toLocaleString("fr-FR")}
              </p>
            )}

            <button className="btn btn-magic btn-lg" onClick={handleRoll} disabled={busy || !affordable}>
              {busy ? "L'œuf remue…" : phase === "revealed" ? "Ouvrir un autre œuf" : "Ouvrir un œuf"}
            </button>

            {!affordable && eggCost && (
              <p className="muted" style={{ fontSize: "var(--read-sm)" }}>
                Il te manque {(eggCost.amount - balance).toLocaleString("fr-FR")} {resourceLabel(eggCost.resource)} —
                récolte dans le Refuge pour en gagner.
              </p>
            )}

            {history.length > 0 && (
              <>
                <p className="res-name">Derniers tirages</p>
                <div className="gacha-history">
                  {history.map((entry, i) => (
                    <span key={i} className={`history-chip rarity-${entry.species.rarity}`} title={entry.species.name}>
                      <CreatureAvatar speciesId={entry.species.id} size={40} still />
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
