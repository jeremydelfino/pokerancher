/**
 * Where creature artwork comes from, chosen at build time by VITE_SPRITE_SOURCE.
 *
 * - "svg"     (default) — the parametric creatures drawn in CreatureAvatar. Fully
 *                         original artwork, nothing to license, nothing to take down.
 * - "pokeapi"           — official 2D sprites fetched by URL from the PokeAPI sprite
 *                         mirror. Those images belong to Nintendo / Game Freak /
 *                         The Pokémon Company. Nothing is copied into this repo, but
 *                         a public deployment using them is the usual trigger for a
 *                         takedown request. Keep it for local play.
 * - "custom"            — your own sprite set served from VITE_SPRITE_BASE_URL,
 *                         addressed as <base>/<dex>.png.
 *
 * Whatever the source, a failed image silently falls back to the SVG creature, so
 * the game never renders a broken frame.
 */

export type SpriteSource = "svg" | "pokeapi" | "custom";

const SOURCE = (import.meta.env.VITE_SPRITE_SOURCE ?? "svg") as SpriteSource;
const CUSTOM_BASE = import.meta.env.VITE_SPRITE_BASE_URL ?? "";

const POKEAPI_ROOT = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Generation V shipped the last animated 2D sprites; later species only have still art. */
const LAST_ANIMATED_DEX = 649;

export const spriteSource: SpriteSource = SOURCE;

export function spriteUrl(dex: number, back = false, shiny = false): string | null {
  if (!dex) return null;

  switch (SOURCE) {
    case "pokeapi": {
      // A battle wants the back sprite for your own Pokémon; only the animated
      // Gen-V set has one, so anything past it falls back to the front art.
      // The sprite set nests the same way at every level: back/, then shiny/.
      const facing = [back ? "back" : null, shiny ? "shiny" : null].filter(Boolean).join("/");
      if (dex <= LAST_ANIMATED_DEX) {
        const path = ["animated", facing].filter(Boolean).join("/");
        return `${POKEAPI_ROOT}/versions/generation-v/black-white/${path}/${dex}.gif`;
      }
      return `${POKEAPI_ROOT}/${facing ? `${facing}/` : ""}${dex}.png`;
    }
    case "custom": {
      if (!CUSTOM_BASE) return null;
      const facing = [back ? "back" : null, shiny ? "shiny" : null].filter(Boolean).join("/");
      return `${CUSTOM_BASE.replace(/\/$/, "")}/${facing ? `${facing}/` : ""}${dex}.png`;
    }
    default:
      return null;
  }
}

/** Animated sources move on their own, so the CSS idle bob is dropped for them. */
export function spriteIsAnimated(url: string): boolean {
  return url.endsWith(".gif");
}
