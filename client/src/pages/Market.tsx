import { useCallback, useEffect, useMemo, useState } from "react";
import type { SlotUpgradeEffect, SlotUpgradeTier } from "@pokerancher/shared";
import { api, type MarketStall, type MarketState } from "../api/client.js";
import { Ambience } from "../components/Ambience.js";
import { Frame } from "../components/Frame.js";
import { MarketScene } from "../components/MarketScene.js";
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
  return [`${tier.capacity} place${tier.capacity > 1 ? "s" : ""}`, ...tier.effects.map(describeEffect)].join(
    " · "
  );
}

/* --- One stall ------------------------------------------------------------- */

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
    <article
      className={`stall rarity-${stall.grade} ${empty ? "stall-empty" : ""}`}
      style={{ ["--stall-color" as string]: `var(--res-${stall.resource})` }}
    >
      {/* A striped canopy over each counter, in the resource's own colour. */}
      <span className="stall-awning" aria-hidden="true" />

      <header className="stall-head">
        <span className="res-dot res-dot-lg">
          <ResourceIcon resource={stall.resource} size={18} />
        </span>
        <div className="stall-ident">
          <h3 className="stall-name">{resourceLabel(stall.resource)}</h3>
          <span className="badge">{RARITY_LABEL[stall.grade] ?? stall.grade}</span>
        </div>
        <span className="stall-price">
          {stall.unitPrice}
          <ResourceIcon resource="coin" size={10} />
        </span>
      </header>

      <p className="stall-blurb">{stall.blurb}</p>

      <div className="stall-counter">
        <span className="stall-stock">
          <span className="stall-stock-value">{fr(stall.owned)}</span>
          <span className="res-name">en stock</span>
        </span>
        <span className="stall-worth">{fr(stall.totalIfSoldAll)} pièces au total</span>
      </div>

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
        className="btn btn-primary btn-block"
        disabled={empty || busy || amount <= 0}
        onClick={() => onSell(stall.resource, amount)}
      >
        {empty ? "Étal vide" : amount > 0 ? `Vendre ${fr(amount)} → ${fr(total)} ¢` : "Choisis une quantité"}
      </button>
    </article>
  );
}

/* --- Page ------------------------------------------------------------------ */

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
    async (action: () => Promise<MarketState>) => {
      setBusy(true);
      try {
        setState(await action());
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );

  const handleSell = (resource: string, quantity: number) =>
    run(async () => {
      const result = await api.sell(resource, quantity);
      toast(`+${fr(result.earned)} pièces`, "success");
      return result.market;
    });

  const handleSellAll = () =>
    run(async () => {
      const result = await api.sellAll();
      if (result.sold.length === 0) toast("Tes étals sont vides", "info");
      else toast(`+${fr(result.earned)} pièces pour ${result.sold.length} lots`, "success");
      return result.market;
    });

  const handleUpgrade = (slotType: string, label: string) =>
    run(async () => {
      const result = await api.upgradeSlot(slotType);
      toast(`${label} — niveau ${result.level}, ${result.capacity} places !`, "success");
      return result.market;
    });

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
        </header>

        {!state ? (
          <span className="skeleton" style={{ height: 380 }} />
        ) : (
          <div className="stage">
            {/* Left rail: the purse and the one-click liquidation. */}
            <aside className="stage-rail stage-left">
              <Frame greenery="vine">
                <p className="rail-title">Ta bourse</p>
                <div className="purse">
                  <span className="res-dot res-dot-lg" style={{ ["--res-color" as string]: "var(--res-coin)" }}>
                    <ResourceIcon resource="coin" size={18} />
                  </span>
                  <span className="coin-amount">{fr(coins)}</span>
                </div>

                <p className="stat-line">
                  <span>Valeur du stock</span>
                  <strong>{fr(sellableTotal)} ¢</strong>
                </p>
                <p className="stat-line">
                  <span>Prix d'un œuf</span>
                  <strong>{fr(state.eggCoinCost)} ¢</strong>
                </p>

                <button
                  className="btn btn-primary btn-block"
                  disabled={busy || sellableTotal <= 0}
                  onClick={handleSellAll}
                >
                  Tout vendre
                </button>
              </Frame>

              <Frame tone="sunken" greenery="none">
                <p className="rail-title">Comment ça marche</p>
                <p className="choice-prompt" style={{ marginBottom: 0 }}>
                  Les pièces n'existent qu'ici : aucun enclos n'en produit, aucune expédition n'en
                  rapporte. La vente est la seule entrée, les enclos et les œufs les seules sorties.
                </p>
              </Frame>
            </aside>

            {/* Centre: the square, then the counters. */}
            <div className="stage-main">
              <Frame tone="dark" greenery="none" className="market-frame">
                <div className="market-banner">
                  <MarketScene />
                  <span className="market-haze" aria-hidden="true" />
                  <span className="market-sign">Place du Marché</span>
                </div>
              </Frame>

              <div className="stall-grid">
                {state.stalls.map((stall) => (
                  <Stall key={stall.resource} stall={stall} onSell={handleSell} busy={busy} />
                ))}
              </div>
            </div>

            {/* Right rail: what the coins are for. */}
            <aside className="stage-rail stage-right">
              <Frame greenery="corner">
                <p className="rail-title">Agrandir les enclos</p>
                <p className="choice-prompt">
                  Chaque palier remplace le précédent et ajoute une place — donc un porteur de trait
                  de plus.
                </p>

                <div className="upgrade-stack">
                  {state.upgrades.map((upgrade) => (
                    <article
                      key={upgrade.slotType}
                      className={`upgrade ${upgrade.next === null ? "upgrade-maxed" : ""}`}
                    >
                      <header className="upgrade-head">
                        <h3 className="stall-name">{upgrade.label}</h3>
                        <span className="upgrade-level">
                          {upgrade.capacity} place{upgrade.capacity > 1 ? "s" : ""}
                        </span>
                      </header>

                      <span className="upgrade-pips" aria-hidden="true">
                        {upgrade.ladder.map((tier) => (
                          <span
                            key={tier.level}
                            className={`upgrade-pip ${tier.level <= upgrade.level ? "upgrade-pip-on" : ""}`}
                          />
                        ))}
                      </span>

                      {upgrade.next ? (
                        <>
                          <div className="upgrade-next">
                            <strong>{upgrade.next.label}</strong>
                            <span>{tierSummary(upgrade.next)}</span>
                          </div>
                          <button
                            className="btn btn-magic btn-sm btn-block"
                            disabled={busy || !upgrade.affordable}
                            onClick={() => handleUpgrade(upgrade.slotType, upgrade.label)}
                          >
                            {fr(upgrade.next.cost)} pièces
                          </button>
                          {upgrade.missing !== null && (
                            <p className="upgrade-missing">Il te manque {fr(upgrade.missing)} ¢.</p>
                          )}
                        </>
                      ) : (
                        <p className="upgrade-done">Niveau maximum</p>
                      )}
                    </article>
                  ))}
                </div>
              </Frame>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
