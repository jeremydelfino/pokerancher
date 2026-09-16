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

  // `size` is a *preferred* size, not a fixed one: the arena sprites are big
  // enough that a hard width would push the field off a narrow screen. The CSS
  // caps them at the column and keeps them square.
  return (
    <span
      className={`pkspr ${shiny ? "pkspr-shiny" : ""}`}
      style={{ ["--pkspr-size" as string]: `${size}px` }}
      title={name}
    >
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
