import { POKEMON_BY_ID, type ValleyState } from "@pokerancher/shared";
import { useState } from "react";
import { ProceduralCreature } from "../CreatureAvatar.js";
import { spriteUrl } from "../../sprites.js";

/**
 * Who you are in the field: the first Pokémon still standing in your team.
 *
 * Deliberately a DOM element layered over the canvas rather than something
 * drawn into it. The sprite sources serve **animated GIFs**, and `drawImage`
 * only ever paints a GIF's first frame — walking around behind a frozen sprite
 * is exactly the thing that made the mode feel dead. An `<img>` animates for
 * free, and CSS gets to own the bob, the shadow and the facing flip.
 *
 * It never moves: the camera keeps it dead centre and the world slides beneath.
 */

export function Walker({
  state,
  facing,
  moving,
  size = 72,
}: {
  state: ValleyState;
  /** -1 walking left, 1 walking right. Only the sign matters. */
  facing: number;
  moving: boolean;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  // Whoever is leading. A fainted Pokémon should not be the one walking.
  const leader = state.team.find((member) => member.hp > 0) ?? state.team[0];
  const species = leader ? POKEMON_BY_ID[leader.speciesId] : undefined;
  const url = leader && !broken ? spriteUrl(leader.dex ?? species?.dex ?? 0, false, leader.shiny) : null;

  return (
    <div
      className={`walker ${moving ? "walker-moving" : ""}`}
      style={{ width: size, height: size }}
      aria-label={species?.name ?? "Ton Pokémon de tête"}
    >
      <span className="walker-shadow" aria-hidden="true" />
      <span className="walker-art" style={{ transform: `scaleX(${facing < 0 ? -1 : 1})` }}>
        {url ? (
          <img src={url} alt="" draggable={false} onError={() => setBroken(true)} />
        ) : (
          <ProceduralCreature speciesId={leader?.speciesId ?? "pidgey"} size={size} />
        )}
      </span>
    </div>
  );
}
