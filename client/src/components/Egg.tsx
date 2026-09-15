import { PixelLayer, type Palette } from "./pixel.js";

/**
 * The gacha egg: lit on the upper left, in shadow on the right, freckled.
 *
 * The palette is a prop rather than a constant so one silhouette can serve
 * every egg type — the shell tells you what you are about to open before you
 * open it, which is the only job the art has to do here.
 */

const EGG = [
  ".......ii.......",
  "......iiii......",
  ".....iihhii.....",
  "....iihhhhiio...",
  "...iihhhhiiiio..",
  "...iihhiiiiiio..",
  "..iiiiiiiiiiioo.",
  "..iiiiiiiiiiioo.",
  ".iiiiyyiiiiiiioo",
  ".iiiiyyiiiiiiioo",
  "iiiiiiiiiiyyiioo",
  "iiiiiiiiiiyyiioo",
  "iiiirriiiiiiiioo",
  "iiiirriiiiiiiioo",
  "iiiiiiiiiiiiiioo",
  "iiiiiiiiyyiiiioo",
  "iiiiiiiiyyiiiioo",
  ".iiiiiiiiiiiiooo",
  ".iiiiiiiiiiiioo.",
  "..iiiiiiiiiioo..",
  "...iiiiiiiooo...",
  "....iiiiooo.....",
];

export interface EggPalette {
  shell: string;
  shade: string;
  speck: string;
}

const DEFAULT_PALETTE: EggPalette = {
  shell: "#fbf3dd",
  shade: "#ddc49b",
  speck: "#f2b03d",
};

/** Lightens the shell for the lit crown without needing a fourth colour. */
function paletteFor(colors: EggPalette): Palette {
  return {
    i: colors.shell,
    h: "#fffdf5",
    o: colors.shade,
    y: colors.speck,
    r: colors.speck,
  };
}

export function Egg({ palette = DEFAULT_PALETTE, className }: { palette?: EggPalette; className?: string }) {
  return (
    <svg
      className={`egg-art ${className ?? ""}`.trim()}
      viewBox={`0 0 ${EGG[0].length} ${EGG.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelLayer rows={EGG} palette={paletteFor(palette)} />
    </svg>
  );
}
