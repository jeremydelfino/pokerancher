import type { SlotUpgradeEffect, SlotUpgradeTier } from "@pokerancher/shared";
import { slotUpgradeLadder } from "@pokerancher/shared";
import type { RefugeSlotState } from "../api/client.js";
import { Frame } from "./Frame.js";
import { ResourceIcon } from "./ResourceIcon.js";
import { useDialog } from "../hooks/useDialog.js";
import { PixelIcon, type Palette } from "./pixel.js";

/**
 * Buying a pen level.
 *
 * Lives here rather than on the market page because the thing you are upgrading
 * is right behind the dialog: you press UP on the pen you were looking at and
 * the ladder opens over it.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

const ICON: Palette = { i: "currentColor", g: "var(--c-grass)", y: "var(--c-gold)" };

/** A pen with an extra stall — what a level actually buys. */
const SEAT_ART = [
  "iiiiiiiiiiii",
  "i..........i",
  "i.gg..gg...i",
  "i.gg..gg...i",
  "i..........i",
  "i.gg..gg...i",
  "i.gg..gg...i",
  "i..........i",
  "iiiiiiiiiiii",
];

/** An upward chevron stack — the "more per hour" mark. */
const RATE_ART = [
  "....yy....",
  "...yyyy...",
  "..yy..yy..",
  ".yy....yy.",
  "..........",
  "....yy....",
  "...yyyy...",
  "..yy..yy..",
  ".yy....yy.",
  "..........",
];

/** A star, for the activity rating. */
const STAR_ART = [
  "....y....",
  "....y....",
  "yyyyyyyyy",
  ".yyyyyyy.",
  "..yyyyy..",
  ".yy...yy.",
  ".y.....y.",
];

function EffectRow({ effect }: { effect: SlotUpgradeEffect }) {
  const art =
    effect.type === "activity_score" ? STAR_ART : effect.type === "slot_rate" ? RATE_ART : RATE_ART;
  const label =
    effect.type === "slot_rate"
      ? `Production ×${effect.value}`
      : effect.type === "resource_rate"
        ? `Ressource ×${effect.value}`
        : effect.type === "activity_score"
          ? `+${effect.value} d'activité`
          : `${effect.type} ${effect.mode === "mult" ? "×" : "+"}${effect.value}`;

  return (
    <li className="upgrade-effect">
      <PixelIcon art={art} palette={ICON} size={18} />
      {label}
    </li>
  );
}

interface Props {
  slot: RefugeSlotState;
  coins: number;
  busy: boolean;
  onBuy: () => void;
  onClose: () => void;
}

export function UpgradeDialog({ slot, coins, busy, onBuy, onClose }: Props) {
  useDialog(onClose);

  const ladder = slotUpgradeLadder(slot.type as never) as readonly SlotUpgradeTier[];
  const next = slot.upgrade.next;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <Frame className="modal" greenery="both" role="dialog" aria-modal aria-label={`Améliorer ${slot.label}`}>
        <div className="modal-head">
          <h2 className="modal-title">{slot.label}</h2>
          <span className="upgrade-purse">
            <span className="res-dot" style={{ ["--res-color" as string]: "var(--res-coin)" }}>
              <ResourceIcon resource="coin" />
            </span>
            {fr(coins)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>

        <p className="choice-prompt">
          Chaque palier <strong>remplace</strong> le précédent et ajoute une place. Une place, c'est
          un porteur de trait de plus pour tes synergies.
        </p>

        <ol className="ladder">
          {ladder.map((tier) => {
            const owned = tier.level <= slot.upgrade.level;
            const current = tier.level === slot.upgrade.level;
            const isNext = next?.level === tier.level;

            return (
              <li
                key={tier.level}
                className={`rung ${owned ? "rung-owned" : ""} ${current ? "rung-current" : ""} ${
                  isNext ? "rung-next" : ""
                }`}
              >
                <span className="rung-level">{tier.level}</span>

                <div className="rung-body">
                  <span className="rung-head">
                    <strong>{tier.label}</strong>
                    <span className="rung-seats">
                      <PixelIcon art={SEAT_ART} palette={ICON} size={16} />
                      {tier.capacity} place{tier.capacity > 1 ? "s" : ""}
                    </span>
                  </span>
                  <ul className="upgrade-effects">
                    {tier.effects.map((effect, i) => (
                      <EffectRow key={i} effect={effect} />
                    ))}
                  </ul>
                </div>

                <div className="rung-action">
                  {owned ? (
                    <span className="rung-tag">acquis</span>
                  ) : isNext ? (
                    <button
                      className="btn btn-magic btn-sm"
                      disabled={busy || !slot.upgrade.affordable}
                      onClick={onBuy}
                    >
                      {fr(tier.cost)} ¢
                    </button>
                  ) : (
                    <span className="rung-tag rung-tag-locked">{fr(tier.cost)} ¢</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {next && slot.upgrade.missing !== null && (
          <p className="upgrade-missing">Il te manque {fr(slot.upgrade.missing)} pièces.</p>
        )}
        {!next && <p className="upgrade-done">Niveau maximum atteint</p>}
      </Frame>
    </>
  );
}
