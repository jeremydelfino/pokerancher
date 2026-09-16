import type { BiomeDefinition, EncounterRule } from "../valley/types.js";

/**
 * TODO_GAME_DESIGN — the biomes of PokeValley.
 *
 * Data-driven on purpose: adding a fifth biome is adding an entry here plus its
 * two colours. No generator switches on a biome id, and nothing outside this
 * file knows there are four.
 *
 * ⚠️ How the level fields work, because it is not the obvious reading.
 *
 * The wild level is NOT taken from `minLevel`/`maxLevel`. It comes from how far
 * you have walked (see difficulty in valley-config.ts). Those two fields are a
 * *gate*: the band the species is willing to show up in. Chenipan is
 * `1..14`, Papilusion `12..40`, so walking further quietly swaps one family
 * stage for the next instead of handing you a level-40 Chenipan. Overlap the
 * bands a little and the transition stops feeling like a switch being thrown.
 */

const at = (
  speciesId: string,
  weight: number,
  minLevel: number,
  maxLevel: number,
  extra: Partial<EncounterRule> = {}
): EncounterRule => ({ speciesId, weight, minLevel, maxLevel, ...extra });

export const BIOMES: Record<string, BiomeDefinition> = {
  /* --- 🌾 Plaines -------------------------------------------------------- */
  plains: {
    id: "plains",
    name: "Plaines",
    temperature: 0.52,
    humidity: 0.38,
    ground: "grass",
    lowGround: "dirt",
    flora: [
      { terrain: "tall_grass", chance: 0.17 },
      { terrain: "flower", chance: 0.06 },
      { terrain: "tree", chance: 0.025 },
      { terrain: "bush", chance: 0.03 },
    ],
    resources: [
      { resource: "berry", weight: 5 },
      { resource: "wood", weight: 2 },
    ],
    pokeballDensity: 1.4,
    difficulty: 1,
    colors: { ground: "#7fb069", accent: "#b6d98f" },
    affinities: ["normal", "vol", "plante"],
    encounters: [
      at("pidgey", 10, 1, 16),
      at("rattata", 10, 1, 18),
      at("caterpie", 7, 1, 12),
      at("sunkern", 6, 1, 14),
      at("eevee", 3, 1, 24),
      at("chikorita", 5, 1, 14),
      at("snivy", 5, 1, 14),
      at("bulbasaur", 5, 1, 14),
      at("machop", 4, 4, 22),
      at("pidgeotto", 6, 14, 34),
      at("raticate", 6, 16, 40),
      at("sunflora", 4, 12, 40),
      at("butterfree", 3, 12, 40),
      at("bayleef", 4, 12, 30),
      at("servine", 4, 12, 30),
      at("ivysaur", 4, 12, 30),
      at("machoke", 3, 20, 44),
      at("pidgeot", 2, 32, 90),
      at("meganium", 1.5, 30, 90),
      at("serperior", 1.5, 30, 90),
      at("venusaur", 1.5, 30, 90),
      at("machamp", 1.2, 40, 90),
      at("leafeon", 0.8, 34, 90),
      // The reason to keep walking west at dawn.
      at("shaymin", 0.06, 45, 90, { time: ["morning"], minDistance: 4000 }),
    ],
  },

  /* --- 🌳 Forêt ---------------------------------------------------------- */
  forest: {
    id: "forest",
    name: "Forêt",
    temperature: 0.5,
    humidity: 0.82,
    ground: "grass",
    lowGround: "dirt",
    flora: [
      { terrain: "tree", chance: 0.22 },
      { terrain: "tall_grass", chance: 0.16 },
      { terrain: "bush", chance: 0.06 },
      { terrain: "flower", chance: 0.03 },
    ],
    resources: [
      { resource: "wood", weight: 6 },
      { resource: "berry", weight: 4 },
    ],
    pokeballDensity: 2.2,
    difficulty: 1.1,
    colors: { ground: "#3c6b4a", accent: "#5f9a5e" },
    affinities: ["plante", "insecte", "poison", "vol"],
    encounters: [
      at("caterpie", 10, 1, 13),
      at("weedle", 10, 1, 13),
      at("zubat", 7, 1, 20),
      at("bulbasaur", 6, 1, 14),
      at("chikorita", 5, 1, 14),
      at("turtwig", 5, 1, 14),
      at("snivy", 5, 1, 14),
      at("abra", 4, 4, 22),
      at("metapod", 5, 7, 18),
      at("kakuna", 5, 7, 18),
      at("bonsly", 4, 1, 18),
      at("gastly", 5, 6, 26, { time: ["evening", "night"] }),
      at("butterfree", 6, 12, 42),
      at("beedrill", 6, 12, 42),
      at("ivysaur", 5, 12, 30),
      at("bayleef", 4, 12, 30),
      at("grotle", 4, 12, 30),
      at("servine", 4, 12, 30),
      at("golbat", 5, 20, 46),
      at("haunter", 4, 22, 48, { time: ["evening", "night"] }),
      at("kadabra", 4, 18, 44),
      at("scyther", 3, 22, 60),
      at("sudowoodo", 3, 18, 50),
      at("venusaur", 2, 30, 90),
      at("meganium", 2, 30, 90),
      at("torterra", 2, 30, 90),
      at("serperior", 2, 30, 90),
      at("gengar", 1.5, 40, 90, { time: ["night"] }),
      at("alakazam", 1.5, 38, 90),
      at("leafeon", 1.2, 32, 90),
      at("celebi", 0.05, 48, 90, { time: ["night"], minDistance: 5000 }),
    ],
  },

  /* --- 🏜️ Désert --------------------------------------------------------- */
  desert: {
    id: "desert",
    name: "Désert",
    temperature: 0.92,
    humidity: 0.14,
    ground: "sand",
    lowGround: "sand",
    flora: [
      { terrain: "cactus", chance: 0.07 },
      { terrain: "rock", chance: 0.09 },
      { terrain: "tall_grass", chance: 0.05 },
    ],
    resources: [
      { resource: "ore", weight: 6 },
      { resource: "wood", weight: 1 },
    ],
    pokeballDensity: 0.6,
    difficulty: 1.35,
    colors: { ground: "#c9a06a", accent: "#e8cd9a" },
    affinities: ["sol", "roche", "feu"],
    encounters: [
      at("geodude", 10, 1, 18),
      at("onix", 6, 4, 26),
      at("larvitar", 5, 4, 24),
      at("aron", 6, 3, 22),
      at("vulpix", 6, 2, 22),
      at("charmander", 5, 2, 16),
      at("growlithe", 5, 3, 24),
      at("rattata", 5, 1, 16),
      at("bonsly", 4, 1, 18),
      at("graveler", 6, 18, 44),
      at("pupitar", 4, 22, 50),
      at("lairon", 5, 20, 46),
      at("charmeleon", 4, 14, 34),
      at("ninetales", 4, 22, 56),
      at("arcanine", 3, 26, 62),
      at("magmar", 4, 24, 58),
      at("sudowoodo", 3, 18, 50),
      at("steelix", 2.5, 32, 90),
      at("golem", 2, 34, 90),
      at("aggron", 2, 36, 90),
      at("tyranitar", 1.2, 46, 90),
      at("charizard", 1.2, 38, 90),
      at("mawile", 0.8, 28, 90),
      at("regirock", 0.05, 50, 90, { minDistance: 6000 }),
    ],
  },

  /* --- ❄️ Neige ---------------------------------------------------------- */
  snow: {
    id: "snow",
    name: "Neige",
    temperature: 0.08,
    humidity: 0.56,
    ground: "snow",
    lowGround: "ice",
    flora: [
      { terrain: "tree", chance: 0.12 },
      { terrain: "rock", chance: 0.06 },
      { terrain: "tall_grass", chance: 0.08 },
    ],
    resources: [
      { resource: "fish", weight: 5 },
      { resource: "ore", weight: 3 },
      { resource: "wood", weight: 2 },
    ],
    pokeballDensity: 1,
    difficulty: 1.25,
    colors: { ground: "#e8f1f7", accent: "#9fdbe8" },
    affinities: ["eau", "glace", "normal"],
    encounters: [
      at("squirtle", 8, 1, 15),
      at("totodile", 8, 1, 15),
      at("magikarp", 9, 1, 19),
      at("wailmer", 6, 4, 28),
      at("eevee", 4, 1, 24),
      at("pidgey", 5, 1, 16),
      at("rattata", 5, 1, 16),
      at("dratini", 4, 6, 28),
      at("aron", 4, 3, 22),
      at("bonsly", 3, 1, 18),
      at("wartortle", 5, 14, 34),
      at("croconaw", 5, 14, 34),
      at("lapras", 3, 20, 60),
      at("dragonair", 3, 28, 54),
      at("jolteon", 3, 22, 56),
      at("electabuzz", 3, 24, 58),
      at("vaporeon", 3, 22, 56),
      at("flareon", 2.5, 22, 56),
      at("gyarados", 2, 30, 90),
      at("blastoise", 1.8, 34, 90),
      at("feraligatr", 1.8, 34, 90),
      at("wailord", 1.5, 38, 90),
      at("dragonite", 1, 50, 90),
      at("manaphy", 0.05, 48, 90, { minDistance: 5500 }),
      at("keldeo", 0.05, 50, 90, { time: ["night"], minDistance: 6500 }),
    ],
  },
};

export const BIOME_LIST: readonly BiomeDefinition[] = Object.values(BIOMES);
