import { useEffect, useMemo, useRef, useState } from "react";
import { POKEMON_BY_ID, type CombatResult, type RunTeamMember } from "@pokerancher/shared";
import { CreatureAvatar } from "./CreatureAvatar.js";
import { Foe } from "./Foe.js";
import { HealthBar } from "./HealthBar.js";
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
 * The fight, replayed.
 *
 * The server resolved the whole thing before this component existed — what
 * arrives is a recording (`combat.blows`), and every frame drawn here is read
 * out of it. Nothing on screen can change the outcome, which is exactly why the
 * animation is allowed to be this elaborate.
 *
 * Pacing adapts to the fight's length so a twelve-blow brawl and a two-blow
 * ambush both land in roughly the same handful of seconds.
 */

const W = 96;
const H = 40;
const TOTAL_MS = 5200;
const MIN_STEP = 190;
const MAX_STEP = 620;

const P: Palette = {
  "1": "var(--sc-1)",
  "2": "var(--sc-2)",
  "3": "var(--sc-3)",
  "4": "var(--sc-4)",
  "5": "var(--sc-5)",
  "6": "var(--sc-6)",
  "7": "var(--sc-7)",
  "8": "var(--sc-8)",
  F: "var(--sc-far)",
  g: "#5f9a5e",
  G: "#3c6b4a",
  H: "#24452f",
  d: "#7a4f2c",
  D: "#4e3220",
  E: "#2f1e12",
  s: "#5b5674",
  S: "#3b3752",
  w: "#8b5e3c",
};

const PINE = [
  "...H...",
  "..HHH..",
  ".HHHHH.",
  "..HHH..",
  ".HHHHH.",
  "HHHHHHH",
  "...w...",
  "...w...",
];

/** A clearing at dusk: hazed treeline behind, packed earth underfoot. */
function buildArena(): string[] {
  const g: Grid = makeGrid(W, H);

  paintBands(g, [
    ["1", 3],
    ["2", 3],
    ["3", 3],
    ["4", 3],
    ["5", 3],
    ["6", 3],
    ["7", 3],
    ["8", 2],
  ]);

  // Distant ridge, hazed so it never competes with the fighters.
  ridge(g, (x) => 20 - Math.round(Math.sin(x / 13) * 3 + noise(x * 0.7) * 2), "F", 24);

  // Treeline, thinned out across the middle where the fight happens.
  for (let x = 1; x < W - 6; x += 7) {
    if (x > 30 && x < 62) continue;
    stamp(g, PINE, x, 15 + Math.round(noise(x) * 2));
  }

  // Grass shelf, then the earth floor the fighters stand on.
  ridge(g, (x) => 24 + Math.round(noise(x * 1.9) * 1.5), "G", 28);
  box(g, 0, 27, W, 2, "g");
  box(g, 0, 29, W, H - 29, "d");
  box(g, 0, 33, W, H - 33, "D");

  // Scattered stones and ruts so the floor is not a flat slab.
  for (let i = 0; i < 26; i++) {
    const x = Math.round(noise(i * 3.3) * (W - 4));
    const y = 30 + Math.round(noise(i * 7.1) * 8);
    const wide = noise(i * 11.7) > 0.6;
    box(g, x, y, wide ? 3 : 2, 1, noise(i * 5.5) > 0.5 ? "E" : "S");
  }

  // A worn path across the middle, marking the line the two sides meet on.
  for (let x = 0; x < W; x++) {
    if ((x + Math.round(noise(x * 2.2) * 2)) % 5 === 0) put(g, x, 31, "s");
  }

  return toRows(g);
}

function stepMs(count: number): number {
  return Math.max(MIN_STEP, Math.min(MAX_STEP, Math.round(TOTAL_MS / Math.max(1, count))));
}

interface Props {
  combat: CombatResult;
  team: readonly RunTeamMember[];
  /** Fires once the last blow has played. */
  onFinished?: () => void;
  /** Jump straight to the end — used when revisiting a fight already seen. */
  instant?: boolean;
}

export function BattleScene({ combat, team, onFinished, instant = false }: Props) {
  const arena = useMemo(buildArena, []);
  const blows = combat.blows ?? [];
  const last = blows.length - 1;

  const [step, setStep] = useState(instant ? last : -1);
  const done = step >= last;
  const finished = useRef(false);

  // Restart the replay whenever a different fight arrives.
  useEffect(() => {
    finished.current = false;
    setStep(instant ? last : -1);
  }, [combat, instant, last]);

  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setStep((s) => s + 1), stepMs(blows.length));
    return () => clearTimeout(id);
  }, [step, done, blows.length]);

  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true;
      onFinished?.();
    }
  }, [done, onFinished]);

  const blow = step >= 0 ? blows[step] : null;

  // Before the first blow everyone is at the hit points they walked in with.
  const teamHp = blow ? blow.teamHp : team.map((member) => member.hp);
  const enemyHp = blow ? blow.enemyHp : combat.enemy.maxHp;

  const enemyHit = blow?.side === "team";
  const memberHit = blow?.side === "enemy" ? blow.memberIndex : -1;
  const swinging = blow?.side === "team" ? blow.memberIndex : -1;

  return (
    <div className={`battle ${enemyHit && blow?.fatal ? "battle-quake" : ""}`}>
      <svg
        className="battle-bg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <PixelLayer rows={arena} palette={P} />
      </svg>
      <span className="battle-haze" aria-hidden="true" />

      {/* --- Enemy ---------------------------------------------------------- */}
      <div className="battle-foe">
        <div className="battle-nameplate">
          <span className="battle-name">{combat.enemy.name}</span>
          <HealthBar hp={enemyHp} maxHp={combat.enemy.maxHp} size="lg" />
        </div>
        <div
          className={`battle-actor ${enemyHit ? "actor-hit" : ""} ${
            blow?.side === "enemy" ? "actor-lunge-left" : ""
          } ${enemyHp <= 0 ? "actor-ko" : ""}`}
        >
          <Foe name={combat.enemy.name} size={148} />
          {enemyHit && (
            <span key={`e${step}`} className="damage damage-big">
              -{blow!.damage}
            </span>
          )}
        </div>
      </div>

      {/* --- Team ----------------------------------------------------------- */}
      <div className="battle-party">
        {team.map((member, index) => {
          const hp = teamHp[index] ?? 0;
          const maxHp = combat.teamMaxHp?.[index] ?? member.maxHp;
          const species = POKEMON_BY_ID[member.speciesId];
          return (
            <div
              key={member.unitId}
              className={`battle-fighter ${hp <= 0 ? "actor-ko" : ""} ${
                memberHit === index ? "actor-hit" : ""
              } ${swinging === index ? "actor-lunge-right" : ""}`}
            >
              <CreatureAvatar speciesId={member.speciesId} size={62} still />
              <span className="battle-fighter-name">{species?.name ?? member.speciesId}</span>
              <HealthBar hp={hp} maxHp={maxHp} size="sm" showNumbers={false} />
              {memberHit === index && (
                <span key={`m${step}`} className="damage">
                  -{blow!.damage}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Outcome -------------------------------------------------------- */}
      {done && (
        <div className={`battle-banner ${combat.victory ? "banner-win" : "banner-lose"}`}>
          {combat.victory ? "Victoire !" : "Défaite…"}
        </div>
      )}

      {!done && (
        <button className="battle-skip" onClick={() => setStep(last)}>
          Passer ▸▸
        </button>
      )}
    </div>
  );
}
