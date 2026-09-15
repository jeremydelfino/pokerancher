import { describe, expect, it } from "vitest";
import { evolutionLine, POKEMON_BY_ID, POKEMON_SPECIES, SLOTS } from "../pokemon-data.js";
import { MAX_LEVEL } from "./levelling.js";
import { MOVES } from "./moves.js";
import { SPECIES_BATTLE } from "./species-battle.js";
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

  it("gives every species a battle profile", () => {
    for (const species of POKEMON_SPECIES) {
      const profile = SPECIES_BATTLE[species.id];
      expect(profile, species.id).toBeDefined();
      expect(profile.types.length, species.id).toBeGreaterThan(0);
      expect(profile.learnset.length, species.id).toBeGreaterThan(0);
    }
  });

  it("only ever names a move that exists", () => {
    for (const [id, profile] of Object.entries(SPECIES_BATTLE)) {
      for (const entry of profile.learnset) {
        expect(MOVES[entry.move], `${id} → ${entry.move}`).toBeDefined();
        expect(entry.level, `${id} → ${entry.move}`).toBeGreaterThanOrEqual(1);
        expect(entry.level, `${id} → ${entry.move}`).toBeLessThanOrEqual(MAX_LEVEL);
      }
    }
  });

  it("gives everyone something to do at level 1", () => {
    // A Pokémon that hatches with no usable move would walk into its first
    // fight with nothing but Lutte.
    for (const species of POKEMON_SPECIES) {
      const early = SPECIES_BATTLE[species.id].learnset.filter((entry) => entry.level <= 5);
      expect(early.length, species.id).toBeGreaterThan(0);
    }
  });

  it("points every evolution at a species that exists, with a level", () => {
    for (const species of POKEMON_SPECIES) {
      if (!species.evolvesTo) continue;
      expect(species.evolvesAtLevel, species.id).toBeGreaterThan(1);
      for (const target of species.evolvesTo) {
        expect(POKEMON_BY_ID[target], `${species.id} → ${target}`).toBeDefined();
      }
    }
  });

  it("never loops an evolution line back on itself", () => {
    for (const species of POKEMON_SPECIES) {
      const line = evolutionLine(species.id);
      expect(new Set(line.map((s) => s.id)).size, species.id).toBe(line.length);
      expect(line.some((s) => s.id === species.id), species.id).toBe(true);
    }
  });

  it("never lets an evolution go backwards, and always pays off by the end", () => {
    // A single step may hold station — a cocoon is a waiting stage, and saying
    // otherwise would force Chrysacier to be "rare", which it plainly is not.
    // What must hold is that the *line* goes somewhere.
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

    for (const species of POKEMON_SPECIES) {
      for (const target of species.evolvesTo ?? []) {
        const evolved = POKEMON_BY_ID[target];
        expect(rank[evolved.rarity], `${species.id} → ${target}`).toBeGreaterThanOrEqual(
          rank[species.rarity]
        );
      }

      // A base form's family must end somewhere better than it started.
      const line = evolutionLine(species.id);
      if (line[0].id !== species.id || line.length < 2) continue;
      const best = Math.max(...line.map((s) => rank[s.rarity]));
      expect(best, `famille de ${species.id}`).toBeGreaterThan(rank[species.rarity]);
    }
  });

  it("raises the evolution level at each step of a line", () => {
    for (const species of POKEMON_SPECIES) {
      for (const target of species.evolvesTo ?? []) {
        const next = POKEMON_BY_ID[target];
        if (!next.evolvesAtLevel || !species.evolvesAtLevel) continue;
        expect(next.evolvesAtLevel, `${species.id} → ${target}`).toBeGreaterThan(
          species.evolvesAtLevel
        );
      }
    }
  });

  it("keeps a family in the same pen", () => {
    // Evolving must never strand a Pokémon out of the pen it was staffing.
    for (const species of POKEMON_SPECIES) {
      for (const target of species.evolvesTo ?? []) {
        expect(POKEMON_BY_ID[target].trait?.slot, `${species.id} → ${target}`).toBe(species.trait?.slot);
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
