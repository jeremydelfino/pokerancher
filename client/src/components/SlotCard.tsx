import { useEffect, useMemo, useState } from "react";
import { MAX_OFFLINE_MS, POKEMON_BY_ID, computeProduction } from "@pokerancher/shared";
import type { RefugeSlotState } from "../api/client.js";
import { CreatureAvatar } from "./CreatureAvatar.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";
import { SCENE_COLORS, SlotScene } from "./SlotScene.js";
import { Stars } from "./Stars.js";

const HOUR_MS = 3_600_000;

/** Server rejects impossible pairings, but never let a data mismatch blank the page. */
function safeAmount(speciesId: string, slotType: string, elapsedMs: number, duplicateCount: number): number {
  try {
    return computeProduction({
      speciesId,
      slotType: slotType as never,
      elapsedMs,
      duplicateCount,
    }).amount;
  } catch {
    return 0;
  }
}

interface Props {
  slot: RefugeSlotState;
  /** When the pendingAmount in `slot` was read from the API. */
  fetchedAt: number;
  starsFor: (pokemonUnitId: string) => number;
  busy: boolean;
  gain: number | null;
  onClaim: () => void;
  onOpenPicker: () => void;
  onRelease: () => void;
}

export function SlotCard({ slot, fetchedAt, starsFor, busy, gain, onClaim, onOpenPicker, onRelease }: Props) {
  const [now, setNow] = useState(() => Date.now());

  const assigned = slot.assigned;
  const species = assigned ? POKEMON_BY_ID[assigned.speciesId] : undefined;

  useEffect(() => {
    if (!assigned) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [assigned]);

  // Idle maths run here, on the client, from the timestamp of the last read —
  // the server recomputes them from its own stored clock when the claim lands.
  const live = useMemo(() => {
    if (!assigned) return { amount: 0, max: 0, ratio: 0 };
    const perHour = safeAmount(assigned.speciesId, slot.type, HOUR_MS, assigned.quantity);
    const max = safeAmount(assigned.speciesId, slot.type, MAX_OFFLINE_MS, assigned.quantity);
    const elapsedHours = Math.max(0, now - fetchedAt) / HOUR_MS;
    const amount = Math.min(max, Math.floor(slot.pendingAmount + perHour * elapsedHours));
    return { amount, max, ratio: max > 0 ? Math.min(1, amount / max) : 0 };
  }, [assigned, slot.type, slot.pendingAmount, fetchedAt, now]);

  const scene = SCENE_COLORS[slot.type] ?? { sky: "#cfeaf5", ground: "#bfe0b5" };
  const full = live.max > 0 && live.amount >= live.max;

  return (
    <article className="slot-card">
      <div
        className="slot-scene"
        style={{ ["--scene-sky" as string]: scene.sky, ["--scene-ground" as string]: scene.ground }}
      >
        <SlotScene slotType={slot.type} />
        {assigned ? (
          <CreatureAvatar speciesId={assigned.speciesId} size={92} />
        ) : (
          <span className="slot-empty-hint">Enclos libre</span>
        )}
        {gain !== null && <span className="gain-float">+{gain.toLocaleString("fr-FR")}</span>}
      </div>

      <div className="slot-body">
        <div className="slot-head">
          <h3 className="slot-name">{slot.label}</h3>
          <span className="res-name">{resourceLabel(slot.resource)}</span>
        </div>

        {assigned ? (
          <>
            <div className="slot-occupant">
              <strong>{species?.name ?? assigned.speciesId}</strong>
              <Stars count={starsFor(assigned.pokemonUnitId)} />
            </div>

            <div className="slot-pending">
              <span className="row">
                <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${slot.resource})` }}>
                  <ResourceIcon resource={slot.resource} />
                </span>
                <span className="slot-pending-value">{live.amount.toLocaleString("fr-FR")}</span>
              </span>
              <span className="res-name">{full ? "réservoir plein" : `max ${live.max.toLocaleString("fr-FR")}`}</span>
            </div>

            <div className="slot-progress">
              <span
                className="slot-progress-fill"
                style={{ transform: `scaleX(${live.ratio})`, opacity: full ? 1 : 0.9 }}
              />
            </div>

            <div className="slot-actions">
              <button className="btn btn-primary btn-sm" disabled={busy || live.amount === 0} onClick={onClaim}>
                Récolter
              </button>
              <button className="btn btn-soft btn-sm" disabled={busy} onClick={onOpenPicker}>
                Changer
              </button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onRelease}>
                Retirer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
              Assigne un compagnon dont le talent correspond à cet enclos pour lancer la production.
            </p>
            <div className="slot-actions">
              <button className="btn btn-soft btn-sm btn-block" disabled={busy} onClick={onOpenPicker}>
                Choisir un compagnon
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
