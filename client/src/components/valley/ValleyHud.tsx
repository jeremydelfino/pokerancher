import {
  dayProgress,
  distanceFromRanch,
  timeOfDay,
  type ValleyState,
} from "@pokerancher/shared";
import { CreatureAvatar } from "../CreatureAvatar.js";
import { HealthBar } from "../HealthBar.js";
import { POKEMON_BY_ID } from "@pokerancher/shared";
import { LIGHT } from "./tiles.js";

/**
 * The HUD.
 *
 * Deliberately three numbers and a team strip. PokeValley is a mode you look
 * *at* — anything the player does not need every second belongs in a panel they
 * open, not in a permanent frame around the world.
 */

const fr = (n: number) => n.toLocaleString("fr-FR");

/**
 * `overlay` floats over the world canvas; `rail` sits in a panel during a
 * battle, where absolute positioning would collapse it into a corner.
 */
export function ValleyHud({
  state,
  variant = "overlay",
}: {
  state: ValleyState;
  variant?: "overlay" | "rail";
}) {
  const time = timeOfDay(state.steps);
  const light = LIGHT[time];
  const metres = distanceFromRanch(state.at);
  const resources = Object.entries(state.carried.resources).filter(([, n]) => (n ?? 0) > 0);

  const rail = variant === "rail";

  return (
    <div className={rail ? "valley-hud-rail" : "contents"}>
      <div className={`valley-hud ${rail ? "" : "valley-hud-top"}`}>
        <span className="valley-stat" title="Pokéballs en poche">
          <span className="valley-stat-icon">⚾</span>
          {state.carried.pokeballs}
        </span>

        <span className="valley-stat" title="Distance depuis le Ranch">
          <span className="valley-stat-icon">📍</span>
          {fr(metres)} m
        </span>

        <span className="valley-stat valley-stat-soft" title={`${light.label} — le temps passe en marchant`}>
          <span className="valley-stat-icon">{time === "night" ? "🌙" : time === "evening" ? "🌆" : time === "morning" ? "🌅" : "☀️"}</span>
          {light.label}
        </span>

        {resources.length > 0 && (
          <span className="valley-stat valley-stat-soft" title="Butin transporté">
            <span className="valley-stat-icon">🎒</span>
            {fr(resources.reduce((sum, [, n]) => sum + (n ?? 0), 0))}
          </span>
        )}

        {state.caught.length > 0 && (
          <span className="valley-stat valley-stat-good" title="Pokémon capturés">
            <span className="valley-stat-icon">✦</span>
            {state.caught.length}
          </span>
        )}
      </div>

      {/* The day slides along a thin rail rather than announcing itself. */}
      {!rail && (
        <div className="valley-daybar" aria-hidden="true">
          <span style={{ transform: `scaleX(${dayProgress(state.steps)})` }} />
        </div>
      )}

      <div className="valley-team">
        {state.team.map((member) => {
          const species = POKEMON_BY_ID[member.speciesId];
          const down = member.hp <= 0;
          return (
            <div key={member.key} className={`valley-mate ${down ? "valley-mate-down" : ""}`}>
              <CreatureAvatar speciesId={member.speciesId} size={36} still />
              <div className="valley-mate-body">
                <span className="valley-mate-name">
                  {species?.name ?? member.name} <span className="party-level">N.{member.level}</span>
                </span>
                <HealthBar hp={member.hp} maxHp={member.maxHp} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
