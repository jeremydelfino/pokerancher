import { PixelIcon, type Palette } from "./pixel.js";

export const RESOURCE_LABEL: Record<string, string> = {
  berry: "Baies",
  fish: "Poissons",
  wood: "Bois",
  ore: "Minerai",
  egg_shard: "Éclats",
  coin: "Pièces",
};

export function resourceLabel(resource: string): string {
  return RESOURCE_LABEL[resource] ?? resource;
}

/** Icons sit on a resource-coloured chip, so they are drawn as flat silhouettes. */
const MONO: Palette = { i: "#fffdf5" };

const BERRY = [
  "....i...",
  "...ii...",
  "..iiii..",
  ".iiiiii.",
  ".iiiiii.",
  ".iiiiii.",
  "..iiii..",
  "........",
];

const FISH = [
  "........",
  "..iii.i.",
  ".iiiiiii",
  "iiiiiiii",
  ".iiiiiii",
  "..iii.i.",
  "........",
  "........",
];

const WOOD = [
  "........",
  ".iiiiii.",
  "iiiiiiii",
  "ii.iiiii",
  "ii.iiiii",
  "iiiiiiii",
  ".iiiiii.",
  "........",
];

const ORE = [
  "..iiii..",
  ".iiiiii.",
  "iiiiiiii",
  "iiiiiiii",
  ".iiiiii.",
  "..iiii..",
  "...ii...",
  "........",
];

const SHARD = [
  "...ii...",
  "..iiii..",
  ".iiiiii.",
  "iiiiiiii",
  "iiiiiiii",
  "iiiiiiii",
  ".iiiiii.",
  "..iiii..",
];

const DOT = [
  "........",
  "..iiii..",
  ".iiiiii.",
  ".iiiiii.",
  ".iiiiii.",
  "..iiii..",
  "........",
  "........",
];

const COIN = [
  "..iiii..",
  ".i....i.",
  "i..ii..i",
  "i.i..i.i",
  "i.i..i.i",
  "i..ii..i",
  ".i....i.",
  "..iiii..",
];

const ICONS: Record<string, string[]> = {
  berry: BERRY,
  fish: FISH,
  wood: WOOD,
  ore: ORE,
  egg_shard: SHARD,
  coin: COIN,
};

export function ResourceIcon({ resource, size = 12 }: { resource: string; size?: number }) {
  return <PixelIcon art={ICONS[resource] ?? DOT} palette={MONO} size={size} />;
}
