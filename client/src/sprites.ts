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

export function spriteUrl(dex: number): string | null {
  if (!dex) return null;

  switch (SOURCE) {
    case "pokeapi":
      return dex <= LAST_ANIMATED_DEX
        ? `${POKEAPI_ROOT}/versions/generation-v/black-white/animated/${dex}.gif`
        : `${POKEAPI_ROOT}/${dex}.png`;
    case "custom":
      return CUSTOM_BASE ? `${CUSTOM_BASE.replace(/\/$/, "")}/${dex}.png` : null;
    default:
      return null;
  }
}

/** Animated sources move on their own, so the CSS idle bob is dropped for them. */
export function spriteIsAnimated(url: string): boolean {
  return url.endsWith(".gif");
}
