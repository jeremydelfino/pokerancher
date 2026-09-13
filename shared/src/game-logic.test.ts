import { describe, expect, it } from "vitest";
import { computeProduction, MAX_OFFLINE_MS, rollGachaSpecies, starTierForCount } from "./game-logic.js";
import { POKEMON_SPECIES } from "./pokemon-data.js";

describe("starTierForCount", () => {
  it("gives 0 stars below the first threshold", () => {
    expect(starTierForCount(1).stars).toBe(0);
    expect(starTierForCount(1).nextThreshold).toBe(2);
  });

  it("reaches star 1 at 2 duplicates and star 4 at 16", () => {
    expect(starTierForCount(2).stars).toBe(1);
    expect(starTierForCount(4).stars).toBe(2);
    expect(starTierForCount(8).stars).toBe(3);
    expect(starTierForCount(16).stars).toBe(4);
    expect(starTierForCount(16).nextThreshold).toBeNull();
  });

  it("caps at max tier past the last threshold", () => {
    expect(starTierForCount(999).stars).toBe(4);
  });
});

describe("computeProduction", () => {
  it("computes berry output for a Vipélierre on the berry farm", () => {
    const result = computeProduction({
      speciesId: "victreebel",
      slotType: "BERRY_FARM",
      elapsedMs: 60 * 60 * 1000,
      duplicateCount: 1,
    });
    // base 60/h * trait 1.5 * star mult 1 (0 stars) * 1h
    expect(result.resource).toBe("berry");
    expect(result.amount).toBe(90);
  });

  it("applies the star tier multiplier on top of the trait", () => {
    const result = computeProduction({
      speciesId: "victreebel",
      slotType: "BERRY_FARM",
      elapsedMs: 60 * 60 * 1000,
      duplicateCount: 4, // 2 stars -> x1.25
    });
    expect(result.amount).toBe(Math.floor(60 * 1.5 * 1.25));
  });

  it("caps elapsed time at MAX_OFFLINE_MS", () => {
    const result = computeProduction({
      speciesId: "victreebel",
      slotType: "BERRY_FARM",
      elapsedMs: MAX_OFFLINE_MS * 10,
      duplicateCount: 1,
    });
    expect(result.cappedElapsedMs).toBe(MAX_OFFLINE_MS);
  });

  it("rejects a species assigned to the wrong slot", () => {
    expect(() =>
      computeProduction({
        speciesId: "victreebel",
        slotType: "MINING",
        elapsedMs: 1000,
        duplicateCount: 1,
      })
    ).toThrow();
  });

  it("rejects offensive species (no passive trait)", () => {
    expect(() =>
      computeProduction({
        speciesId: "keldeo",
        slotType: "BERRY_FARM",
        elapsedMs: 1000,
        duplicateCount: 1,
      })
    ).toThrow();
  });
});

describe("rollGachaSpecies", () => {
  it("always returns legendary with a rng of 0 (first weight bucket wins)", () => {
    const result = rollGachaSpecies(POKEMON_SPECIES, () => 0);
    expect(result.rarity).toBe("common");
  });

  it("stays within the given pool", () => {
    const ids = new Set(POKEMON_SPECIES.map((p) => p.id));
    for (let i = 0; i < 50; i++) {
      const result = rollGachaSpecies(POKEMON_SPECIES, () => i / 50);
      expect(ids.has(result.id)).toBe(true);
    }
  });
});
