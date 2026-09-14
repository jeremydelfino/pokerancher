import { useCallback, useEffect, useMemo, useState } from "react";
import type { SlotUpgradeEffect, SlotUpgradeTier } from "@pokerancher/shared";
import { api, type MarketStall, type MarketState } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { ResourceIcon, resourceLabel } from "../components/ResourceIcon.js";
import { RARITY_LABEL } from "../components/Stars.js";
import { TopBar } from "../components/TopBar.js";
import { useToast } from "../components/Toast.js";
import { useCountUp } from "../hooks/useCountUp.js";

const fr = (n: number) => n.toLocaleString("fr-FR");

/**
 * Effects are stored as raw (type, value, mode) triples on purpose — the engine
 * never interprets them. Somebody has to, eventually, and for the shop that
 * somebody is this table. An unknown type still renders, just literally, so
 * inventing an effect in the data file never produces a blank card.
 */
function describeEffect(effect: SlotUpgradeEffect): string {
  if (effect.type === "slot_rate") return `Production ×${effect.value}`;
  if (effect.type === "resource_rate") return `Ressource ×${effect.value}`;
  if (effect.type === "activity_score") return `+${effect.value} d'activité`;
  return `${effect.type} ${effect.mode === "mult" ? "×" : "+"}${effect.value}`;
}

function tierSummary(tier: SlotUpgradeTier): string {
  return tier.effects.map(describeEffect).join(" · ");
}

/** One stall: a stock, a fixed price, and a quantity the player picks. */
function Stall({
  stall,
  onSell,
  busy,
}: {
  stall: MarketStall;
  onSell: (resource: string, quantity: number) => void;
  busy: boolean;
}) {
  const [quantity, setQuantity] = useState(0);

  // Selling shrinks the stock under us; clamp rather than leave a stale number
  // in the box that the server would reject.
  useEffect(() => {
    setQuantity((current) => Math.min(current, stall.owned));
  }, [stall.owned]);

  const empty = stall.owned <= 0;
  const amount = Math.min(Math.max(quantity, 0), stall.owned);
  const total = amount * stall.unitPrice;

  return (
    <article className={`stall ${empty ? "stall-empty" : ""} rarity-${stall.grade}`}>
      <header className="stall-head">
        <span
          className="res-dot res-dot-lg"
          style={{ ["--res-color" as string]: `var(--res-${stall.resource})` }}
        >
          <ResourceIcon resource={stall.resource} size={18} />
        </span>
        <div>
          <h3 className="stall-name">{resourceLabel(stall.resource)}</h3>
          <span className="badge">{RARITY_LABEL[stall.grade] ?? stall.grade}</span>
        </div>
        <span className="stall-price">
          {stall.unitPrice} <ResourceIcon resource="coin" size={10} /> /u
        </span>
      </header>

      <p className="stall-blurb">{stall.blurb}</p>

      <p className="stall-stock">
        En stock : <strong>{fr(stall.owned)}</strong>
        {!empty && <span className="muted"> · soit {fr(stall.totalIfSoldAll)} pièces</span>}
      </p>

      <div className="stall-controls">
        <input
          className="stall-range"
          type="range"
          min={0}
          max={stall.owned}
          value={amount}
          disabled={empty || busy}
          onChange={(event) => setQuantity(Number(event.target.value))}
          aria-label={`Quantité de ${resourceLabel(stall.resource)} à vendre`}
        />
        <div className="stall-presets">
          {[10, 100, 1000].map((step) => (
            <button
              key={step}
              className="btn btn-ghost btn-sm"
              disabled={empty || busy || stall.owned < step}
              onClick={() => setQuantity(Math.min(step, stall.owned))}
            >
              {step}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            disabled={empty || busy}
            onClick={() => setQuantity(stall.owned)}
          >
            Max
          </button>
        </div>
      </div>

      <button
        className="btn btn-primary"
        disabled={empty || busy || amount <= 0}
        onClick={() => onSell(stall.resource, amount)}
      >
        {amount > 0 ? `Vendre ${fr(amount)} → ${fr(total)} pièces` : "Choisis une quantité"}
      </button>
    </article>
  );
}

export function Market() {
  const [state, setState] = useState<MarketState | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const coins = useCountUp(state?.coins ?? 0);

  const load = useCallback(async () => {
    setState(await api.market());
  }, []);

  useEffect(() => {
    load().catch((err) => toast(err instanceof Error ? err.message : String(err), "error"));
  }, [load, toast]);

  const run = useCallback(
    async (action: () => Promise<MarketState>, success: (next: MarketState) => void) => {
      setBusy(true);
      try {
        success(await action());
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const handleSell = (resource: string, quantity: number) =>
    run(
      async () => {
        const result = await api.sell(resource, quantity);
        toast(`+${fr(result.earned)} pièces`, "success");
        return result.market;
      },
      setState
    );

  const handleSellAll = () =>
    run(
      async () => {
        const result = await api.sellAll();
        if (result.sold.length === 0) toast("Tes étals sont vides", "info");
        else toast(`+${fr(result.earned)} pièces pour ${result.sold.length} lots`, "success");
        return result.market;
      },
      setState
    );

  const handleUpgrade = (slotType: string, label: string) =>
    run(
      async () => {
        const result = await api.upgradeSlot(slotType);
        toast(`${label} — niveau ${result.level} débloqué !`, "success");
        return result.market;
      },
      setState
    );

  const sellableTotal = useMemo(
    () => state?.stalls.reduce((sum, stall) => sum + stall.totalIfSoldAll, 0) ?? 0,
    [state]
  );

  return (
    <>
      <Ambience variant="soft" />
      <TopBar inventory={state?.inventory} />

      <div className="page">
        <header className="page-head">
          <div>
            <h1 className="page-title">L'Hôtel de Vente</h1>
            <p className="page-subtitle">
              Les prix sont fixes et affichés — écoule tes récoltes, puis réinvestis dans les enclos.
            </p>
          </div>

          <div className="coin-purse">
            <span className="res-dot res-dot-lg" style={{ ["--res-color" as string]: "var(--res-coin)" }}>
              <ResourceIcon resource="coin" size={18} />
            </span>
            <span className="coin-amount">{fr(coins)}</span>
            <span className="coin-label">pièces</span>
          </div>
        </header>

        {!state ? (
          <div className="stall-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="skeleton" style={{ height: 260 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="refuge-summary">
              <span className="res-dot res-dot-lg" style={{ ["--res-color" as string]: "var(--res-coin)" }}>
                <ResourceIcon resource="coin" size={18} />
              </span>
              <div className="refuge-summary-text">
                {sellableTotal > 0
                  ? `Tout ton stock vaut ${fr(sellableTotal)} pièces. Un œuf en coûte ${fr(state.eggCoinCost)}.`
                  : `Rien à vendre pour l'instant — récolte au Refuge ou reviens d'expédition. Un œuf coûte ${fr(state.eggCoinCost)} pièces.`}
              </div>
              <button
                className="btn btn-primary"
                disabled={busy || sellableTotal <= 0}
                onClick={handleSellAll}
              >
                Tout vendre
              </button>
            </div>

            <h2 className="section-title">Les étals</h2>
            <div className="stall-grid stagger">
              {state.stalls.map((stall) => (
                <Stall key={stall.resource} stall={stall} onSell={handleSell} busy={busy} />
              ))}
            </div>

            <h2 className="section-title">Améliorations d'enclos</h2>
            <p className="market-note">
              Chaque palier remplace le précédent : le niveau 3 n'est pas le niveau 2 plus un bonus,
              c'est un nouveau rendement.
            </p>

            <div className="upgrade-grid stagger">
              {state.upgrades.map((upgrade) => (
                <article
                  key={upgrade.slotType}
                  className={`upgrade ${upgrade.next === null ? "upgrade-maxed" : ""}`}
                >
                  <header className="upgrade-head">
                    <h3 className="stall-name">{upgrade.label}</h3>
                    <span className="upgrade-level">
                      Niv. {upgrade.level}/{upgrade.maxLevel}
                    </span>
                  </header>

                  {/* A pixel pip per level: the ladder is short enough to read at a glance. */}
                  <span className="upgrade-pips" aria-hidden="true">
                    {upgrade.ladder.map((tier) => (
                      <span
                        key={tier.level}
                        className={`upgrade-pip ${tier.level <= upgrade.level ? "upgrade-pip-on" : ""}`}
                      />
                    ))}
                  </span>

                  <p className="upgrade-current">
                    {upgrade.currentLabel ? `Actuel : ${upgrade.currentLabel}` : "Enclos d'origine"}
                  </p>

                  {upgrade.next ? (
                    <>
                      <div className="upgrade-next">
                        <strong>{upgrade.next.label}</strong>
                        <span>{tierSummary(upgrade.next)}</span>
                      </div>
                      <button
                        className="btn btn-magic"
                        disabled={busy || !upgrade.affordable}
                        onClick={() => handleUpgrade(upgrade.slotType, upgrade.label)}
                      >
                        {fr(upgrade.next.cost)} pièces
                      </button>
                      {upgrade.missing !== null && (
                        <p className="muted" style={{ fontSize: "var(--read-sm)" }}>
                          Il te manque {fr(upgrade.missing)} pièces.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="upgrade-done">Niveau maximum atteint.</p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
