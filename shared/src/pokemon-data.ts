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
 * Starter species roster. Passive species carry a trait that boosts one Refuge
 * slot; offensive species have no trait and are meant for the (future) dungeon loop.
 */
export const POKEMON_SPECIES: readonly PokemonSpecies[] = [
  { id: "sunkern", name: "Tournegrin", rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.2 } },
  { id: "bulbasaur", name: "Bulbizarre", rarity: "common", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.3 } },
  { id: "victreebel", name: "Vipélierre", rarity: "rare", role: "passive", trait: { slot: "BERRY_FARM", multiplier: 1.5 } },
  { id: "magikarp", name: "Magicarpe", rarity: "common", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.2 } },
  { id: "lapras", name: "Lokhlass", rarity: "rare", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.5 } },
  { id: "wailord", name: "Wailord", rarity: "epic", role: "passive", trait: { slot: "FISHING_DOCK", multiplier: 1.8 } },
  { id: "bonsly", name: "Manzaï", rarity: "common", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.2 } },
  { id: "sudowoodo", name: "Simularbre", rarity: "rare", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.5 } },
  { id: "torterra", name: "Torterra", rarity: "epic", role: "passive", trait: { slot: "WOODCUTTING", multiplier: 1.8 } },
  { id: "onix", name: "Onix", rarity: "common", role: "passive", trait: { slot: "MINING", multiplier: 1.2 } },
  { id: "steelix", name: "Steelix", rarity: "rare", role: "passive", trait: { slot: "MINING", multiplier: 1.5 } },
  { id: "regirock", name: "Regirock", rarity: "legendary", role: "passive", trait: { slot: "MINING", multiplier: 2.2 } },
  { id: "keldeo", name: "Keldeo", rarity: "legendary", role: "offensive" },
  { id: "hoopa", name: "Mysdibule", rarity: "legendary", role: "offensive" },
];

export const POKEMON_BY_ID = Object.fromEntries(POKEMON_SPECIES.map((p) => [p.id, p])) as Record<
  string,
  PokemonSpecies
>;
