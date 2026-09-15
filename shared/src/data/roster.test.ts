import { describe, expect, it } from "vitest";
import { POKEMON_SPECIES, SLOTS } from "../pokemon-data.js";
import { SPECIES_TRAITS } from "./species-traits.js";
import { SYNERGIES } from "./synergies.js";
import { TRAITS_PER_RARITY, TRAIT_DEFINITIONS } from "./traits.js";

/**
 * These are not engine tests — they guard the *data* against the rules the
 * design depends on. A roster that quietly drifts (a legendary with three
 * traits, a trait with no synergy, two species sharing a "signature") breaks
 * promises the UI makes to the player, and nothing else would catch it.
 */

describe("roster", () => {
  it("gives every species exactly the traits its rarity allows", () => {
    for (const species of POKEMON_SPECIES) {
      const traits = SPECIES_TRAITS[species.id] ?? [];
      expect(traits, `${species.name} (${species.rarity})`).toHaveLength(
        TRAITS_PER_RARITY[species.rarity]
      );
    }
  });

  it("never repeats a trait on the same species", () => {
    for (const [id, traits] of Object.entries(SPECIES_TRAITS)) {
      expect(new Set(traits).size, id).toBe(traits.length);
    }
  });

  it("gives a working species its job trait", () => {
    const jobTrait: Record<string, string> = {
      BERRY_FARM: "fertilisation",
      FISHING_DOCK: "pecheur",
      WOODCUTTING: "bucheron",
      MINING: "mineur",
    };
    for (const species of POKEMON_SPECIES) {
      if (!species.trait) continue;
      expect(SPECIES_TRAITS[species.id], species.name).toContain(jobTrait[species.trait.slot]);
    }
  });

  it("gives every legendary exactly one signature, and nobody else any", () => {
    for (const species of POKEMON_SPECIES) {
      const signatures = (SPECIES_TRAITS[species.id] ?? []).filter(
        (trait) => TRAIT_DEFINITIONS[trait]?.exclusive
      );
      expect(signatures, species.name).toHaveLength(species.rarity === "legendary" ? 1 : 0);
    }
  });

  it("keeps a signature trait to a single owner", () => {
    for (const [traitId, definition] of Object.entries(TRAIT_DEFINITIONS)) {
      if (!definition.exclusive) continue;
      const holders = Object.entries(SPECIES_TRAITS).filter(([, traits]) => traits.includes(traitId));
      expect(holders.map(([id]) => id), traitId).toHaveLength(1);
    }
  });

  it("lights a signature at a single holder — owning the legendary is the threshold", () => {
    for (const [traitId, definition] of Object.entries(TRAIT_DEFINITIONS)) {
      if (!definition.exclusive) continue;
      const synergy = SYNERGIES[traitId];
      expect(synergy, traitId).toBeDefined();
      expect(synergy.thresholds[0].count, traitId).toBe(1);
    }
  });

  it("defines and gives a synergy to every trait a species can carry", () => {
    const carried = new Set(Object.values(SPECIES_TRAITS).flat());
    for (const traitId of carried) {
      expect(TRAIT_DEFINITIONS[traitId], `definition for ${traitId}`).toBeDefined();
      expect(SYNERGIES[traitId], `synergy for ${traitId}`).toBeDefined();
    }
  });

  it("staffs every pen with one species of each rarity", () => {
    for (const slot of SLOTS) {
      const rarities = POKEMON_SPECIES.filter((s) => s.trait?.slot === slot.type).map((s) => s.rarity);
      for (const rarity of ["common", "rare", "epic", "legendary"] as const) {
        expect(rarities, `${slot.label} — ${rarity}`).toContain(rarity);
      }
    }
  });

  it("keeps species ids and dex numbers unique", () => {
    const ids = POKEMON_SPECIES.map((s) => s.id);
    const dex = POKEMON_SPECIES.map((s) => s.dex);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(dex).size).toBe(dex.length);
  });
});
