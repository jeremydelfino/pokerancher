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
 * Every pen has one species of each rarity, so the collection ladder means the
 * same thing whichever pen you are staffing: a legendary is always a real
 * upgrade over the epic, never "the only body available".
 *
 * `role` is a combat profile, not a permission — see types.ts. `trait` is the
 * Refuge job, and its absence only means the species cannot work a pen.
 */
export const POKEMON_SPECIES: readonly PokemonSpecies[] = [
  // --- Champ de baies ---
  { id: "sunkern", name: "Tournegrin", dex: 191, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 } },
  { id: "bulbasaur", name: "Bulbizarre", dex: 1, rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.3 } },
  { id: "snivy", name: "Vipélierre", dex: 495, rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 } },
  { id: "leafeon", name: "Phyllali", dex: 470, rarity: "epic", role: "offensive", trait: { slot: "BERRY_FARM", multiplier: 1.8 } },
  { id: "shaymin", name: "Shaymin", dex: 492, rarity: "legendary", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 2.2 } },

  // --- Ponton de pêche ---
  { id: "magikarp", name: "Magicarpe", dex: 129, rarity: "common", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 } },
  { id: "lapras", name: "Lokhlass", dex: 131, rarity: "rare", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.5 } },
  { id: "wailord", name: "Wailord", dex: 321, rarity: "epic", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "manaphy", name: "Manaphy", dex: 490, rarity: "legendary", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 2.2 } },

  // --- Coupe de bois ---
  { id: "bonsly", name: "Manzaï", dex: 438, rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 } },
  { id: "sudowoodo", name: "Simularbre", dex: 185, rarity: "rare", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.5 } },
  { id: "torterra", name: "Torterra", dex: 389, rarity: "epic", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.8 } },
  { id: "celebi", name: "Celebi", dex: 251, rarity: "legendary", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 2.2 } },

  // --- Mine ---
  { id: "onix", name: "Onix", dex: 95, rarity: "common", role: "passive", trait: { slot: "MINING", multiplier: 1.2 } },
  { id: "steelix", name: "Steelix", dex: 208, rarity: "rare", role: "passive", trait: { slot: "MINING", multiplier: 1.5 } },
  { id: "aggron", name: "Galeking", dex: 306, rarity: "epic", role: "offensive", trait: { slot: "MINING", multiplier: 1.8 } },
  { id: "regirock", name: "Regirock", dex: 377, rarity: "legendary", role: "passive", trait: { slot: "MINING", multiplier: 2.2 } },

  // --- Combattants ---
  // Keldeo has no job at all: a pure fighter, and the proof that `role` and
  // `trait` are independent from the other side.
  { id: "keldeo", name: "Keldeo", dex: 647, rarity: "legendary", role: "offensive" },
  // Fights and mines: role and job are independent, so a species may hold both.
  { id: "mawile", name: "Mysdibule", dex: 303, rarity: "legendary", role: "offensive", trait: { slot: "MINING", multiplier: 1.6 } },
];

export const POKEMON_BY_ID = Object.fromEntries(POKEMON_SPECIES.map((p) => [p.id, p])) as Record<
  string,
  PokemonSpecies
>;

/** Species that can work the given pen. Used by the assignment UI and the server. */
export function speciesForSlot(slotType: SlotDefinition["type"]): PokemonSpecies[] {
  return POKEMON_SPECIES.filter((species) => species.trait?.slot === slotType);
}
