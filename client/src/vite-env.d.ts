/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** "svg" (default) | "pokeapi" | "custom" — see src/sprites.ts */
  readonly VITE_SPRITE_SOURCE?: string;
  /** Base URL for the "custom" sprite source, sprites addressed as <base>/<dex>.png */
  readonly VITE_SPRITE_BASE_URL?: string;
}
