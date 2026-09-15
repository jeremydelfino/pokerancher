import { useEffect, useMemo, useState } from "react";
import { MAX_OFFLINE_MS, POKEMON_BY_ID, computePenProduction, resolveTraits } from "@pokerancher/shared";
import type { RefugeSlotState } from "../api/client.js";
import { CreatureAvatar } from "./CreatureAvatar.js";
import { Frame } from "./Frame.js";
import { ResourceIcon, resourceLabel } from "./ResourceIcon.js";
import { SLOT_ACCENT, SlotScene } from "./SlotScene.js";
import { Stars } from "./Stars.js";
import { TraitChips } from "./TraitChip.js";

const HOUR_MS = 3_600_000;

/** Server rejects impossible pairings, but never let a data mismatch blank the page. */
function safeAmount(slot: RefugeSlotState, elapsedMs: number): number {
  try {
    return computePenProduction({
      slotType: slot.type as never,
      occupants: slot.workers.map((worker) => ({
        speciesId: worker.speciesId,
        duplicateCount: worker.quantity,
      })),
      elapsedMs,
      synergyMultiplier: slot.synergyMultiplier,
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
  onRelease: (pokemonUnitId: string) => void;
}

export function SlotCard({
  slot,
  fetchedAt,
  starsFor,
  busy,
  gain,
  onClaim,
  onOpenPicker,
  onRelease,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const staffed = slot.workers.length > 0;

  useEffect(() => {
    if (!staffed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [staffed]);

  // Idle maths run here, on the client, from the timestamp of the last read —
  // the server recomputes them from its own stored clock when the claim lands.
  const live = useMemo(() => {
    if (!staffed) return { amount: 0, max: 0, ratio: 0, perHour: 0 };
    const perHour = safeAmount(slot, HOUR_MS);
    const max = safeAmount(slot, MAX_OFFLINE_MS);
    const elapsedHours = Math.max(0, now - fetchedAt) / HOUR_MS;
    const amount = Math.min(max, Math.floor(slot.pendingAmount + perHour * elapsedHours));
    return { amount, max, perHour, ratio: max > 0 ? Math.min(1, amount / max) : 0 };
  }, [slot, staffed, fetchedAt, now]);

  const accent = SLOT_ACCENT[slot.type] ?? { accent: "#b6d98f", dark: "#5f9a5e" };
  const full = live.max > 0 && live.amount >= live.max;
  const room = slot.capacity - slot.workers.length;

  return (
    <Frame
      as="article"
      className="slot-card"
      greenery="corner"
      style={{
        ["--slot-accent" as string]: accent.accent,
        ["--slot-accent-dk" as string]: accent.dark,
      }}
    >
      <div className="slot-scene">
        <SlotScene slotType={slot.type} />
        <span className="scene-vignette" />
        {staffed ? (
          <>
            <span className="scene-floor" />
            {/* Everyone in the pen stands in the diorama. Four bodies is what a
                level-4 pen actually looks like, so it should look like it. */}
            <div className={`scene-crew crew-${slot.workers.length}`}>
              {slot.workers.map((worker) => (
                <CreatureAvatar
                  key={worker.pokemonUnitId}
                  speciesId={worker.speciesId}
                  size={slot.workers.length >= 4 ? 52 : slot.workers.length === 3 ? 62 : 84}
                />
              ))}
            </div>
          </>
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

        <div className="slot-rating">
          <Stars count={slot.stars.stars} total={slot.stars.maxStars} label={`${slot.stars.stars} étoiles`} />
          {slot.synergyMultiplier > 1 && (
            <span className="synergy-badge">×{slot.synergyMultiplier.toFixed(2)}</span>
          )}
          {/* One pip per seat: filled seats, then empty ones the level allows. */}
          <span className="seat-pips" title={`${slot.workers.length} / ${slot.capacity} places`}>
            {Array.from({ length: slot.capacity }, (_, i) => (
              <span key={i} className={`seat-pip ${i < slot.workers.length ? "seat-pip-on" : ""}`} />
            ))}
          </span>
        </div>

        {staffed ? (
          <ul className="crew-list">
            {slot.workers.map((worker) => {
              const species = POKEMON_BY_ID[worker.speciesId];
              return (
                <li key={worker.pokemonUnitId} className="crew-row">
                  <span className="crew-avatar">
                    <CreatureAvatar speciesId={worker.speciesId} size={28} still />
                  </span>
                  <span className="crew-ident">
                    <span className="crew-name">{species?.name ?? worker.speciesId}</span>
                    <Stars count={starsFor(worker.pokemonUnitId)} size={9} />
                  </span>
                  <button
                    className="crew-remove"
                    disabled={busy}
                    onClick={() => onRelease(worker.pokemonUnitId)}
                    title={`Retirer ${species?.name ?? ""}`}
                    aria-label={`Retirer ${species?.name ?? worker.speciesId}`}
                  >
                    ×
                  </button>
                  <span className="crew-traits">
                    <TraitChips traits={resolveTraits(worker.speciesId)} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted" style={{ fontSize: "var(--read-sm)" }}>
            Assigne un compagnon dont le métier correspond à cet enclos.
          </p>
        )}

        {staffed && (
          <>
            <div className="slot-pending">
              <span className="row">
                <span className="res-dot" style={{ ["--res-color" as string]: `var(--res-${slot.resource})` }}>
                  <ResourceIcon resource={slot.resource} />
                </span>
                <span className="slot-pending-value">{live.amount.toLocaleString("fr-FR")}</span>
              </span>
              <span className="res-name">
                {full ? "réservoir plein" : `${live.perHour.toLocaleString("fr-FR")}/h`}
              </span>
            </div>

            <div className={`slot-progress ${full ? "slot-progress-full" : ""}`}>
              <span className="slot-progress-fill" style={{ transform: `scaleX(${live.ratio})` }} />
            </div>
          </>
        )}

        <div className="slot-actions">
          {staffed && (
            <button className="btn btn-primary btn-sm" disabled={busy || live.amount === 0} onClick={onClaim}>
              Récolter
            </button>
          )}
          <button
            className={`btn btn-soft btn-sm ${staffed ? "" : "btn-block"}`}
            disabled={busy || room <= 0}
            onClick={onOpenPicker}
            title={room <= 0 ? "Améliore l'enclos pour ajouter une place" : undefined}
          >
            {room > 0 ? `Ajouter (${room} place${room > 1 ? "s" : ""})` : "Enclos plein"}
          </button>
        </div>
      </div>
    </Frame>
  );
}
