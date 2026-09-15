import type { PokemonSpecies, SlotDefinition } from "./types.js";

export const SLOTS: readonly SlotDefinition[] = [
  { type: "BERRY_FARM", label: "Champ de baies", resource: "berry", baseRatePerHour: 60 },
  { type: "FISHING_DOCK", label: "Ponton de pêche", resource: "fish", baseRatePerHour: 40 },
  { type: "WOODCUTTING", label: "Coupe de bois", resource: "wood", baseRatePerHour: 30 },
  { type: "MINING", label: "Mine", resource: "ore", baseRatePerHour: 20 },
];

export const SLOTS_BY_TYPE = Object.fromEntries(SLOTS.map((s) => [s.type, s])) as Record<
  SlotDefinition["type"],
  SlotDefinition
>;

/**
 * TODO_GAME_DESIGN — the species roster.
 *
 * Organised in evolution families, because that is how the game reads: a
 * Bulbizarre you levelled is a Florizarre you earned, not a different Pokémon
 * you happened to pull. Rarity follows the family: base commun, milieu rare,
 * final épique — so "rare" means "further along" as well as "harder to get".
 *
 * Every pen has one species of each rarity, so the ladder means the same thing
 * whichever pen you are staffing.
 *
 * `role` is a combat profile, not a permission — see types.ts. `trait` is the
 * Refuge job, and its absence only means the species cannot work a pen.
 * `evolvesTo` lists one target, or several when the player gets to choose
 * (Évoli). Types, learnsets and stat tiers live in data/species-battle.ts.
 */
export const POKEMON_SPECIES: readonly PokemonSpecies[] = [
  /* --- Champ de baies ------------------------------------------------ */
  { id: "bulbasaur", name: "Bulbizarre", dex: 1, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 }, evolvesTo: ["ivysaur"], evolvesAtLevel: 16 },
  { id: "ivysaur", name: "Herbizarre", dex: 2, rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 }, evolvesTo: ["venusaur"], evolvesAtLevel: 32 },
  { id: "venusaur", name: "Florizarre", dex: 3, rarity: "epic", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.8 } },
  { id: "chikorita", name: "Germignon", dex: 152, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 }, evolvesTo: ["bayleef"], evolvesAtLevel: 16 },
  { id: "bayleef", name: "Macronium", dex: 153, rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 }, evolvesTo: ["meganium"], evolvesAtLevel: 32 },
  { id: "meganium", name: "Méganium", dex: 154, rarity: "epic", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.8 } },
  { id: "sunkern", name: "Tournegrin", dex: 191, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 }, evolvesTo: ["sunflora"], evolvesAtLevel: 18 },
  { id: "sunflora", name: "Héliatronc", dex: 192, rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 } },
  { id: "snivy", name: "Vipélierre", dex: 495, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 }, evolvesTo: ["servine"], evolvesAtLevel: 17 },
  { id: "servine", name: "Lianaja", dex: 496, rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 }, evolvesTo: ["serperior"], evolvesAtLevel: 36 },
  { id: "serperior", name: "Majaspic", dex: 497, rarity: "epic", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.8 } },
  { id: "leafeon", name: "Phyllali", dex: 470, rarity: "epic", role: "offensive", trait: { slot: "BERRY_FARM", multiplier: 1.8 } },
  { id: "shaymin", name: "Shaymin", dex: 492, rarity: "legendary", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 2.2 } },

  /* --- Ponton de pêche ----------------------------------------------- */
  { id: "magikarp", name: "Magicarpe", dex: 129, rarity: "common", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 }, evolvesTo: ["gyarados"], evolvesAtLevel: 20 },
  { id: "gyarados", name: "Léviator", dex: 130, rarity: "epic", role: "offensive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "squirtle", name: "Carapuce", dex: 7, rarity: "common", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 }, evolvesTo: ["wartortle"], evolvesAtLevel: 16 },
  { id: "wartortle", name: "Carabaffe", dex: 8, rarity: "rare", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.5 }, evolvesTo: ["blastoise"], evolvesAtLevel: 36 },
  { id: "blastoise", name: "Tortank", dex: 9, rarity: "epic", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "totodile", name: "Kaiminus", dex: 158, rarity: "common", role: "offensive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 }, evolvesTo: ["croconaw"], evolvesAtLevel: 18 },
  { id: "croconaw", name: "Crocrodil", dex: 159, rarity: "rare", role: "offensive", trait: { slot: "FISHING_DOCK", multiplier: 1.5 }, evolvesTo: ["feraligatr"], evolvesAtLevel: 30 },
  { id: "feraligatr", name: "Aligatueur", dex: 160, rarity: "epic", role: "offensive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "lapras", name: "Lokhlass", dex: 131, rarity: "rare", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.5 } },
  { id: "wailmer", name: "Wailmer", dex: 320, rarity: "common", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 }, evolvesTo: ["wailord"], evolvesAtLevel: 40 },
  { id: "wailord", name: "Wailord", dex: 321, rarity: "epic", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "manaphy", name: "Manaphy", dex: 490, rarity: "legendary", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 2.2 } },

  /* --- Coupe de bois ------------------------------------------------- */
  { id: "bonsly", name: "Manzaï", dex: 438, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["sudowoodo"], evolvesAtLevel: 20 },
  { id: "sudowoodo", name: "Simularbre", dex: 185, rarity: "rare", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.5 } },
  { id: "turtwig", name: "Tortipouss", dex: 387, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["grotle"], evolvesAtLevel: 18 },
  { id: "grotle", name: "Boskara", dex: 388, rarity: "rare", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.5 }, evolvesTo: ["torterra"], evolvesAtLevel: 32 },
  { id: "torterra", name: "Torterra", dex: 389, rarity: "epic", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.8 } },
  { id: "caterpie", name: "Chenipan", dex: 10, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["metapod"], evolvesAtLevel: 7 },
  { id: "metapod", name: "Chrysacier", dex: 11, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["butterfree"], evolvesAtLevel: 10 },
  { id: "butterfree", name: "Papilusion", dex: 12, rarity: "rare", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.5 } },
  { id: "weedle", name: "Aspicot", dex: 13, rarity: "common", role: "offensive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["kakuna"], evolvesAtLevel: 7 },
  { id: "kakuna", name: "Coconfort", dex: 14, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 }, evolvesTo: ["beedrill"], evolvesAtLevel: 10 },
  { id: "beedrill", name: "Dardargnan", dex: 15, rarity: "rare", role: "offensive", trait: { slot: "WOODCUTTING", multiplier: 1.5 } },
  { id: "celebi", name: "Celebi", dex: 251, rarity: "legendary", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 2.2 } },

  /* --- Mine ---------------------------------------------------------- */
  { id: "onix", name: "Onix", dex: 95, rarity: "common", role: "passive", trait: { slot: "MINING", multiplier: 1.2 }, evolvesTo: ["steelix"], evolvesAtLevel: 40 },
  { id: "steelix", name: "Steelix", dex: 208, rarity: "rare", role: "passive", trait: { slot: "MINING", multiplier: 1.5 } },
  { id: "geodude", name: "Racaillou", dex: 74, rarity: "common", role: "passive", trait: { slot: "MINING", multiplier: 1.2 }, evolvesTo: ["graveler"], evolvesAtLevel: 25 },
  { id: "graveler", name: "Gravalanch", dex: 75, rarity: "rare", role: "passive", trait: { slot: "MINING", multiplier: 1.5 }, evolvesTo: ["golem"], evolvesAtLevel: 40 },
  { id: "golem", name: "Grolem", dex: 76, rarity: "epic", role: "passive", trait: { slot: "MINING", multiplier: 1.8 } },
  { id: "aron", name: "Galekid", dex: 304, rarity: "common", role: "passive", trait: { slot: "MINING", multiplier: 1.2 }, evolvesTo: ["lairon"], evolvesAtLevel: 32 },
  { id: "lairon", name: "Galegon", dex: 305, rarity: "rare", role: "passive", trait: { slot: "MINING", multiplier: 1.5 }, evolvesTo: ["aggron"], evolvesAtLevel: 42 },
  { id: "aggron", name: "Galeking", dex: 306, rarity: "epic", role: "offensive", trait: { slot: "MINING", multiplier: 1.8 } },
  { id: "larvitar", name: "Embrylex", dex: 246, rarity: "common", role: "offensive", trait: { slot: "MINING", multiplier: 1.2 }, evolvesTo: ["pupitar"], evolvesAtLevel: 30 },
  { id: "pupitar", name: "Ymphect", dex: 247, rarity: "rare", role: "offensive", trait: { slot: "MINING", multiplier: 1.5 }, evolvesTo: ["tyranitar"], evolvesAtLevel: 55 },
  { id: "tyranitar", name: "Tyranocif", dex: 248, rarity: "epic", role: "offensive", trait: { slot: "MINING", multiplier: 1.8 } },
  { id: "mawile", name: "Mysdibule", dex: 303, rarity: "legendary", role: "offensive", trait: { slot: "MINING", multiplier: 2.2 } },
  { id: "regirock", name: "Regirock", dex: 377, rarity: "legendary", role: "passive", trait: { slot: "MINING", multiplier: 2.2 } },

  /* --- Combattants — aucun métier, uniquement l'expédition ----------- */
  { id: "charmander", name: "Salamèche", dex: 4, rarity: "common", role: "offensive", evolvesTo: ["charmeleon"], evolvesAtLevel: 16 },
  { id: "charmeleon", name: "Reptincel", dex: 5, rarity: "rare", role: "offensive", evolvesTo: ["charizard"], evolvesAtLevel: 36 },
  { id: "charizard", name: "Dracaufeu", dex: 6, rarity: "epic", role: "offensive" },
  { id: "machop", name: "Machoc", dex: 66, rarity: "common", role: "offensive", evolvesTo: ["machoke"], evolvesAtLevel: 28 },
  { id: "machoke", name: "Machopeur", dex: 67, rarity: "rare", role: "offensive", evolvesTo: ["machamp"], evolvesAtLevel: 40 },
  { id: "machamp", name: "Mackogneur", dex: 68, rarity: "epic", role: "offensive" },
  { id: "abra", name: "Abra", dex: 63, rarity: "common", role: "offensive", evolvesTo: ["kadabra"], evolvesAtLevel: 16 },
  { id: "kadabra", name: "Kadabra", dex: 64, rarity: "rare", role: "offensive", evolvesTo: ["alakazam"], evolvesAtLevel: 36 },
  { id: "alakazam", name: "Alakazam", dex: 65, rarity: "epic", role: "offensive" },
  { id: "gastly", name: "Fantominus", dex: 92, rarity: "common", role: "offensive", evolvesTo: ["haunter"], evolvesAtLevel: 25 },
  { id: "haunter", name: "Spectrum", dex: 93, rarity: "rare", role: "offensive", evolvesTo: ["gengar"], evolvesAtLevel: 40 },
  { id: "gengar", name: "Ectoplasma", dex: 94, rarity: "epic", role: "offensive" },
  { id: "growlithe", name: "Caninos", dex: 58, rarity: "common", role: "offensive", evolvesTo: ["arcanine"], evolvesAtLevel: 32 },
  { id: "arcanine", name: "Arcanin", dex: 59, rarity: "rare", role: "offensive" },
  { id: "eevee", name: "Évoli", dex: 133, rarity: "common", role: "passive", evolvesTo: ["vaporeon", "jolteon", "flareon"], evolvesAtLevel: 25 },
  { id: "vaporeon", name: "Aquali", dex: 134, rarity: "rare", role: "passive" },
  { id: "jolteon", name: "Voltali", dex: 135, rarity: "rare", role: "offensive" },
  { id: "flareon", name: "Pyroli", dex: 136, rarity: "rare", role: "offensive" },
  { id: "rattata", name: "Rattata", dex: 19, rarity: "common", role: "offensive", evolvesTo: ["raticate"], evolvesAtLevel: 20 },
  { id: "raticate", name: "Rattatac", dex: 20, rarity: "rare", role: "offensive" },
  { id: "pidgey", name: "Roucool", dex: 16, rarity: "common", role: "passive", evolvesTo: ["pidgeotto"], evolvesAtLevel: 18 },
  { id: "pidgeotto", name: "Roucoups", dex: 17, rarity: "rare", role: "passive", evolvesTo: ["pidgeot"], evolvesAtLevel: 36 },
  { id: "pidgeot", name: "Roucarnage", dex: 18, rarity: "epic", role: "offensive" },
  { id: "zubat", name: "Nosferapti", dex: 41, rarity: "common", role: "offensive", evolvesTo: ["golbat"], evolvesAtLevel: 22 },
  { id: "golbat", name: "Nosferalto", dex: 42, rarity: "rare", role: "offensive" },
  { id: "vulpix", name: "Goupix", dex: 37, rarity: "common", role: "offensive", evolvesTo: ["ninetales"], evolvesAtLevel: 30 },
  { id: "ninetales", name: "Feunard", dex: 38, rarity: "rare", role: "offensive" },
  { id: "scyther", name: "Insécateur", dex: 123, rarity: "rare", role: "offensive" },
  { id: "magmar", name: "Magmar", dex: 126, rarity: "rare", role: "offensive" },
  { id: "electabuzz", name: "Élektek", dex: 125, rarity: "rare", role: "offensive" },
  { id: "dratini", name: "Minidraco", dex: 147, rarity: "common", role: "offensive", evolvesTo: ["dragonair"], evolvesAtLevel: 30 },
  { id: "dragonair", name: "Draco", dex: 148, rarity: "rare", role: "offensive", evolvesTo: ["dragonite"], evolvesAtLevel: 55 },
  { id: "dragonite", name: "Dracolosse", dex: 149, rarity: "epic", role: "offensive" },
  { id: "keldeo", name: "Keldeo", dex: 647, rarity: "legendary", role: "offensive" },
];

export const POKEMON_BY_ID = Object.fromEntries(POKEMON_SPECIES.map((p) => [p.id, p])) as Record<
  string,
  PokemonSpecies
>;

/** Species that can work the given pen. Used by the assignment UI and the server. */
export function speciesForSlot(slotType: SlotDefinition["type"]): PokemonSpecies[] {
  return POKEMON_SPECIES.filter((species) => species.trait?.slot === slotType);
}

/** Where a species sits in its family: what it came from, what it becomes. */
export function evolutionTargets(speciesId: string): PokemonSpecies[] {
  return (POKEMON_BY_ID[speciesId]?.evolvesTo ?? [])
    .map((id) => POKEMON_BY_ID[id])
    .filter((species): species is PokemonSpecies => Boolean(species));
}

export function preEvolutionOf(speciesId: string): PokemonSpecies | undefined {
  return POKEMON_SPECIES.find((species) => species.evolvesTo?.includes(speciesId));
}

/** The whole family line, base first. Used by the codex entry. */
export function evolutionLine(speciesId: string): PokemonSpecies[] {
  let root = POKEMON_BY_ID[speciesId];
  if (!root) return [];
  for (let guard = 0; guard < 8; guard++) {
    const previous = preEvolutionOf(root.id);
    if (!previous) break;
    root = previous;
  }

  const line: PokemonSpecies[] = [];
  const walk = (species: PokemonSpecies) => {
    if (line.some((entry) => entry.id === species.id)) return;
    line.push(species);
    for (const next of evolutionTargets(species.id)) walk(next);
  };
  walk(root);
  return line;
}
