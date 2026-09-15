import { useEffect, useMemo, useRef, useState } from "react";
import {
  availableSwitches,
  MOVES,
  TYPE_CHART,
  effectiveness,
  type BattleAction,
  type BattleEvent,
  type BattleState,
  type Battler,
} from "@pokerancher/shared";
import { HealthBar } from "./HealthBar.js";
import { PokeSprite } from "./PokeSprite.js";
import { TypeBadges } from "./TypeBadge.js";
import {
  PixelLayer,
  box,
  makeGrid,
  noise,
  paintBands,
  put,
  ridge,
  stamp,
  toRows,
  type Grid,
  type Palette,
} from "./pixel.js";

/**
 * A Pokémon battle, the way a Pokémon battle looks.
 *
 * Your active Pokémon at the front-left with its back to you, the foe up on the
 * right, a health plate each, and a text box along the bottom that plays the
 * turn out one line at a time. The move menu only unlocks once the text has
 * caught up — reading what happened is part of the turn, not an interruption
 * of it.
 *
 * Everything here is a view of `battle`. The only thing the component can send
 * back is an action, and the server decides what it meant.
 */

const W = 112;
const H = 48;
const LINE_MS = 950;

const P: Palette = {
  "1": "var(--sc-1)", "2": "var(--sc-2)", "3": "var(--sc-3)", "4": "var(--sc-4)",
  "5": "var(--sc-5)", "6": "var(--sc-6)", "7": "var(--sc-7)", "8": "var(--sc-8)",
  F: "var(--sc-far)",
  g: "#7fb069", G: "#4e7a3f", H: "#2f5432",
  d: "#c9a06a", D: "#9a7448", E: "#6b4f30",
  s: "#8a84a0", S: "#5b5674",
  w: "#96663f",
};

const BUSH = ["..GGG..", ".GgggG.", "GgggggG", ".GGGGG."];

/** A flat arena with two platforms — the classic battle staging. */
function buildArena(): string[] {
  const g: Grid = makeGrid(W, H);

  paintBands(g, [["1", 3], ["2", 3], ["3", 3], ["4", 3], ["5", 3], ["6", 3], ["7", 2], ["8", 2]]);
  ridge(g, (x) => 22 - Math.round(Math.sin(x / 15) * 3 + noise(x * 0.6) * 2), "F", 26);

  // Ground, then the two ellipse platforms the fighters stand on.
  box(g, 0, 26, W, H - 26, "g");
  box(g, 0, 26, W, 1, "G");
  for (let i = 0; i < 50; i++) {
    const x = Math.round(noise(i * 3.7) * (W - 2));
    const y = 28 + Math.round(noise(i * 8.3) * 18);
    put(g, x, y, noise(i * 5.1) > 0.5 ? "G" : "H");
  }

  platform(g, 16, 40, 34, 5);
  platform(g, 68, 24, 30, 4);

  for (const x of [2, 9, 100, 106]) stamp(g, BUSH, x, 27 + Math.round(noise(x) * 2));

  return toRows(g);
}

/** A squashed disc of packed earth. */
function platform(g: Grid, cx: number, cy: number, width: number, height: number) {
  for (let dy = 0; dy < height; dy++) {
    const inset = Math.round((dy / Math.max(1, height - 1)) * (width / 3));
    box(g, cx - width / 2 + inset, cy + dy, width - inset * 2, 1, dy === 0 ? "d" : dy < height - 1 ? "D" : "E");
  }
}

/* --- Plates --------------------------------------------------------------- */

function Plate({ battler, side }: { battler: Battler; side: "team" | "foe" }) {
  return (
    <div className={`plate plate-${side}`}>
      <div className="plate-head">
        <span className="plate-name">{battler.name}</span>
        <span className="plate-level">N.{battler.level}</span>
      </div>
      <HealthBar hp={battler.hp} maxHp={battler.maxHp} size="lg" showNumbers={side === "team"} />
      <TypeBadges types={battler.types} size="sm" />
    </div>
  );
}

/* --- The component -------------------------------------------------------- */

interface Props {
  battle: BattleState;
  busy: boolean;
  onAction: (action: BattleAction) => void;
}

export function PokemonBattle({ battle, busy, onAction }: Props) {
  const arena = useMemo(buildArena, []);
  const log = battle.log ?? [];

  // The log is replayed one line at a time; `shown` is how far it has got.
  const [shown, setShown] = useState(0);
  const [menu, setMenu] = useState<"moves" | "switch">("moves");
  const seen = useRef<BattleEvent[] | null>(null);

  useEffect(() => {
    if (seen.current === log) return;
    seen.current = log;
    setShown(log.length > 0 ? 1 : 0);
  }, [log]);

  useEffect(() => {
    if (shown >= log.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), LINE_MS);
    return () => clearTimeout(id);
  }, [shown, log.length]);

  const caughtUp = shown >= log.length;
  const event = log[Math.max(0, shown - 1)] ?? null;

  const active = battle.team[battle.activeIndex];
  const foe = battle.foes[battle.foeIndex];

  // While the log plays, the bars show the state *at that line* rather than the
  // end of the turn — otherwise the health drops before the text says why.
  const activeHp = event ? event.activeHp : active.hp;
  const foeHp = event ? event.foeHp : foe.hp;

  const hitSide =
    event && (event.kind === "damage" || event.kind === "faint")
      ? event.side === "team"
        ? "foe"
        : "team"
      : null;

  const bench = availableSwitches(battle);
  const locked = busy || !caughtUp || battle.status !== "active";

  return (
    <div className={`pkbattle ${hitSide === "team" ? "shake" : ""}`}>
      <svg
        className="pkbattle-bg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <PixelLayer rows={arena} palette={P} />
      </svg>

      <div className="pkbattle-field">
        {/* Foe, up and to the right. */}
        <div className="side side-foe">
          <Plate battler={{ ...foe, hp: foeHp }} side="foe" />
          <div className={`fighter ${hitSide === "foe" ? "fighter-hit" : ""} ${foeHp <= 0 ? "fighter-ko" : ""}`}>
            <PokeSprite dex={foe.dex} name={foe.name} size={132} />
            {event?.kind === "damage" && event.side === "team" && (
              <span key={`f${shown}`} className="damage damage-big">-{event.amount}</span>
            )}
          </div>
          {battle.foes.length > 1 && (
            <span className="foe-count">
              {battle.foeIndex + 1} / {battle.foes.length}
            </span>
          )}
        </div>

        {/* Yours, down and to the left, seen from behind. */}
        <div className="side side-team">
          <div className={`fighter ${hitSide === "team" ? "fighter-hit" : ""} ${activeHp <= 0 ? "fighter-ko" : ""}`}>
            <PokeSprite dex={active.dex} name={active.name} size={156} back />
            {event?.kind === "damage" && event.side === "foe" && (
              <span key={`t${shown}`} className="damage">-{event.amount}</span>
            )}
            {event?.kind === "heal" && (
              <span key={`h${shown}`} className="damage damage-heal">+{event.amount}</span>
            )}
          </div>
          <Plate battler={{ ...active, hp: activeHp }} side="team" />
        </div>
      </div>

      {/* --- Text box and menu --------------------------------------------- */}
      <div className="pkbattle-hud">
        <div className="pkbattle-text">
          {event ? event.text : `Que doit faire ${active.name} ?`}
          {!caughtUp && <span className="pkbattle-more" aria-hidden="true">▾</span>}
        </div>

        {battle.status !== "active" ? (
          <p className="pkbattle-outcome">
            {battle.status === "won" ? "Combat remporté !" : "Toute l'équipe est K.O."}
          </p>
        ) : battle.awaitingSwitch ? (
          <div className="move-grid">
            {bench.map((member) => (
              <button
                key={member.key}
                className="move switch-card"
                disabled={locked}
                onClick={() => onAction({ kind: "switch", memberKey: member.key })}
              >
                <span className="move-name">{member.name}</span>
                <span className="move-meta">
                  {member.hp}/{member.maxHp} PV
                </span>
              </button>
            ))}
          </div>
        ) : menu === "switch" ? (
          <div className="move-grid">
            {bench.map((member) => (
              <button
                key={member.key}
                className="move switch-card"
                disabled={locked}
                onClick={() => {
                  setMenu("moves");
                  onAction({ kind: "switch", memberKey: member.key });
                }}
              >
                <span className="move-name">{member.name}</span>
                <span className="move-meta">
                  {member.hp}/{member.maxHp} PV
                </span>
              </button>
            ))}
            <button className="move move-back" onClick={() => setMenu("moves")}>
              Retour
            </button>
          </div>
        ) : (
          <>
            <div className="move-grid">
              {active.moves.map((slot) => {
                const move = MOVES[slot.id];
                if (!move) return null;
                const multiplier = effectiveness(move.type, foe.types);
                const empty = slot.pp <= 0;
                return (
                  <button
                    key={slot.id}
                    className={`move ${empty ? "move-empty" : ""}`}
                    style={{ ["--type-color" as string]: TYPE_CHART[move.type].color }}
                    disabled={locked || empty}
                    title={move.description}
                    onClick={() => onAction({ kind: "move", moveId: slot.id })}
                  >
                    <span className="move-name">{move.name}</span>
                    <span className="move-meta">
                      <span className="move-type">{TYPE_CHART[move.type].label}</span>
                      <span className="move-pp">
                        {slot.pp}/{slot.maxPp}
                      </span>
                    </span>
                    {/* The one hint the screen gives: how this lands on what is
                        actually in front of you. */}
                    {move.power > 0 && multiplier !== 1 && (
                      <span className={`move-eff ${multiplier > 1 ? "eff-good" : "eff-bad"}`}>
                        ×{multiplier}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {bench.length > 0 && (
              <button className="btn btn-soft btn-sm pkbattle-swap" disabled={locked} onClick={() => setMenu("switch")}>
                Changer de Pokémon
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
