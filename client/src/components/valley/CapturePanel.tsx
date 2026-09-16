import { captureOdds, playerMaxLevel, POKEMON_BY_ID, type ValleyState } from "@pokerancher/shared";
import { PokeSprite } from "../PokeSprite.js";

/**
 * The throw screen.
 *
 * It shows the odds *and what is moving them*. A player who can only see "38 %"
 * has no way to get better at capturing; one who can see that the target is at
 * full health and four levels above their best knows exactly what to do next —
 * which is the whole decision this mode is built around.
 */
export function CapturePanel({
  state,
  busy,
  onThrow,
  onFlee,
}: {
  state: ValleyState;
  busy: boolean;
  onThrow: () => void;
  onFlee: () => void;
}) {
  if (!state.wild || !state.battle) return null;

  const foe = state.battle.foes[state.battle.foeIndex];
  const odds = captureOdds(state.wild, foe, playerMaxLevel(state.team));
  const species = POKEMON_BY_ID[state.wild.speciesId];
  const percent = Math.round(odds.chance * 100);
  const noBalls = state.carried.pokeballs <= 0;

  return (
    <section className="capture-panel">
      <p className="rail-title">
        Capture <span>⚾ {state.carried.pokeballs}</span>
      </p>

      <div className="capture-target">
        <PokeSprite
          dex={species?.dex ?? 1}
          name={species?.name ?? state.wild.speciesId}
          size={72}
          shiny={state.wild.shiny}
        />
        <div>
          <p className="capture-name">
            {species?.name ?? state.wild.speciesId}
            {state.wild.alpha && <span className="badge badge-alpha">ALPHA</span>}
            {state.wild.shiny && <span className="badge">✦</span>}
          </p>
          <p className="capture-hp">
            N.{state.wild.level} · {foe.hp}/{foe.maxHp} PV
          </p>
        </div>
      </div>

      <p className="capture-odds-line">
        <span>Chance de capture</span>
        <strong>{percent} %</strong>
      </p>
      <span className="capture-bar">
        <span style={{ transform: `scaleX(${odds.chance})` }} />
      </span>

      <ul className="capture-factors">
        {odds.factors.map((factor) => (
          <li key={factor.label} className={factor.delta >= 0 ? "" : "capture-factor-bad"}>
            <span>{factor.label}</span>
            <strong>
              {factor.delta >= 0 ? "+" : "−"}
              {Math.abs(Math.round(factor.delta * 100))} %
            </strong>
          </li>
        ))}
      </ul>

      <button className="btn btn-magic btn-block" disabled={busy || noBalls} onClick={onThrow}>
        {noBalls ? "Plus de Pokéballs" : "Lancer une Pokéball"}
      </button>
      <button className="btn btn-ghost btn-block btn-sm" disabled={busy} onClick={onFlee}>
        Prendre la fuite
      </button>

      {noBalls && (
        <p className="capture-hint">
          Les plants à Pokéballs poussent surtout en forêt — les coffres et les camps en
          contiennent aussi.
        </p>
      )}
    </section>
  );
}
