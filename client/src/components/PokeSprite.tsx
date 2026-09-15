import { useState } from "react";
import { ProceduralCreature } from "./CreatureAvatar.js";
import { spriteIsAnimated, spriteUrl } from "../sprites.js";

/**
 * A Pokémon by Pokédex number, front or back.
 *
 * Separate from CreatureAvatar because a battler is not always in the
 * collection: wild Pokémon and bosses have a dex number and nothing else, and
 * the avatar keys everything off the roster. When no sprite source is
 * configured — or the image fails — this falls back to the parametric creature
 * rather than a broken frame, so a battle is legible with no sprite pack at all.
 */
export function PokeSprite({
  dex,
  name,
  size = 120,
  back = false,
  shiny = false,
}: {
  dex: number;
  name: string;
  size?: number;
  back?: boolean;
  shiny?: boolean;
}) {
  const url = spriteUrl(dex, back, shiny);
  const [broken, setBroken] = useState(false);
  const showSprite = url !== null && !broken;

  return (
    <span className={`pkspr ${shiny ? "pkspr-shiny" : ""}`} style={{ width: size, height: size }} title={name}>
      {showSprite ? (
        <img
          className={`pkspr-img ${spriteIsAnimated(url) ? "" : "pkspr-bob"}`}
          src={url}
          alt={name}
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        <ProceduralCreature speciesId={name} size={size} />
      )}
      <span className="pkspr-shadow" aria-hidden="true" />
    </span>
  );
}
