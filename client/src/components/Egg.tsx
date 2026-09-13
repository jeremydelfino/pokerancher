import { PixelLayer, type Palette } from "./pixel.js";

/** The gacha egg: shaded on the left, in shadow on the right, freckled. */

const SHELL: Palette = {
  h: "#fffdf5",
  i: "#fbf3dd",
  o: "#ddc49b",
  y: "#f2b03d",
  r: "#e07a86",
};

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

export function Egg() {
  return (
    <svg
      className="egg-art"
      viewBox={`0 0 ${EGG[0].length} ${EGG.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelLayer rows={EGG} palette={SHELL} />
    </svg>
  );
}
