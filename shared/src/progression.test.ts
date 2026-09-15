import { describe, expect, it } from "vitest";
import { LEVEL_COST, LEVEL_RESOURCE, MAX_LEVEL } from "./data/levelling.js";
import { SPECIES_BATTLE } from "./data/species-battle.js";
import { POKEMON_BY_ID, POKEMON_SPECIES } from "./pokemon-data.js";
import {
  activeMoves,
  affordableLevels,
  canEvolveInto,
  evolutionOptions,
  knownMoves,
  learnsetOf,
  levelResource,
  levelUpCost,
  levelUpCostFor,
  movesLearnedBetween,
} from "./progression.js";

/**
 * These test the *rules*, not the numbers: every threshold is read back from
 * the data so a rebalance in levelling.ts cannot fail them.
 */

describe("levelResource", () => {
  it("feeds a working species on what its pen produces", () => {
    for (const species of POKEMON_SPECIES) {
      if (!species.trait) continue;
      expect(levelResource(species)).toBe(LEVEL_RESOURCE[species.trait.slot]);
    }
  });

  it("charges coins for a species with no job", () => {
    const jobless = POKEMON_SPECIES.find((species) => !species.trait)!;
    expect(levelResource(jobless)).toBe("coin");
  });
});

describe("levelUpCost", () => {
  it("costs more at every level", () => {
    let previous = 0;
    for (let level = 5; level < 60; level++) {
      const cost = levelUpCost("bulbasaur", level)!;
      expect(cost.amount).toBeGreaterThan(previous);
      previous = cost.amount;
    }
  });

  it("costs more for a rarer species at the same level", () => {
    // Same level, same formula — only the rarity factor differs, so the order
    // of the four factors has to survive into the price.
    const byRarity = (["common", "rare", "epic", "legendary"] as const).map((rarity) => {
      const species = POKEMON_SPECIES.find((s) => s.rarity === rarity)!;
      return levelUpCost(species.id, 30)!.amount;
    });
    expect(LEVEL_COST.rarityFactor.legendary).toBeGreaterThan(LEVEL_COST.rarityFactor.common);
    expect([...byRarity].sort((a, b) => a - b)).toEqual(byRarity);
  });

  it("stops selling levels at the cap", () => {
    expect(levelUpCost("bulbasaur", MAX_LEVEL)).toBeNull();
    expect(levelUpCostFor("bulbasaur", MAX_LEVEL, 10)).toBeNull();
  });

  it("prices ten levels as the ten single levels", () => {
    let sum = 0;
    for (let level = 12; level < 22; level++) sum += levelUpCost("onix", level)!.amount;
    expect(levelUpCostFor("onix", 12, 10)!.amount).toBe(sum);
  });

  it("prices a batch that runs into the cap at what is left to buy", () => {
    const near = MAX_LEVEL - 3;
    expect(levelUpCostFor("onix", near, 10)!.amount).toBe(levelUpCostFor("onix", near, 3)!.amount);
  });
});

describe("affordableLevels", () => {
  it("never promises a level the purse cannot pay for", () => {
    const balance = 4000;
    const bought = affordableLevels("bulbasaur", 10, balance);
    expect(levelUpCostFor("bulbasaur", 10, bought)!.amount).toBeLessThanOrEqual(balance);
    // ...and one more would not fit: that is what makes it the *most* it can buy.
    expect(levelUpCostFor("bulbasaur", 10, bought + 1)!.amount).toBeGreaterThan(balance);
  });

  it("buys nothing with an empty purse", () => {
    expect(affordableLevels("bulbasaur", 10, 0)).toBe(0);
  });
});

describe("knownMoves", () => {
  it("only hands over moves the level has reached", () => {
    for (const [speciesId, profile] of Object.entries(SPECIES_BATTLE)) {
      const known = new Set(knownMoves(speciesId, 20));
      // A move can be listed twice (the type ladder plus a species addition):
      // what decides is the *earliest* entry, not any entry.
      const earliest = new Map<string, number>();
      for (const entry of profile.learnset) {
        earliest.set(entry.move, Math.min(entry.level, earliest.get(entry.move) ?? entry.level));
      }
      for (const [move, level] of earliest) {
        expect(known.has(move)).toBe(level <= 20);
      }
    }
  });

  it("keeps the earliest level when a move is listed twice", () => {
    for (const [speciesId, profile] of Object.entries(SPECIES_BATTLE)) {
      const earliest = new Map<string, number>();
      for (const entry of profile.learnset) {
        earliest.set(entry.move, Math.min(entry.level, earliest.get(entry.move) ?? entry.level));
      }
      const sheet = learnsetOf(speciesId, 1);
      expect(sheet.length).toBe(earliest.size);
      for (const entry of sheet) expect(entry.level).toBe(earliest.get(entry.move));
    }
  });

  it("never forgets a move on the way up", () => {
    let previous: string[] = [];
    for (let level = 1; level <= MAX_LEVEL; level += 3) {
      const known = knownMoves("venusaur", level);
      for (const move of previous) expect(known).toContain(move);
      previous = known;
    }
  });

  it("flags the rest of the ladder as locked rather than hiding it", () => {
    const sheet = learnsetOf("venusaur", 10);
    expect(sheet.length).toBeGreaterThan(knownMoves("venusaur", 10).length);
    expect(sheet.every((entry) => entry.learned === entry.level <= 10)).toBe(true);
  });

  it("reports exactly what a level-up unlocked", () => {
    const before = new Set(knownMoves("venusaur", 20));
    const after = knownMoves("venusaur", 45);
    expect(movesLearnedBetween("venusaur", 20, 45)).toEqual(after.filter((m) => !before.has(m)));
  });
});

describe("activeMoves", () => {
  it("takes the player's picks, and only those", () => {
    const known = knownMoves("venusaur", 60);
    const picked = [known[0], known[1]];
    expect(activeMoves("venusaur", 60, picked)).toEqual(picked);
  });

  it("drops a move the species cannot use instead of failing", () => {
    const legal = knownMoves("venusaur", 60)[0];
    expect(activeMoves("venusaur", 60, [legal, "tonnerre", "nawak"])).toEqual([legal]);
  });

  it("never carries more than four", () => {
    expect(activeMoves("venusaur", MAX_LEVEL, knownMoves("venusaur", MAX_LEVEL))).toHaveLength(4);
  });

  it("falls back to the newest four when nothing legal was chosen", () => {
    const fallback = activeMoves("venusaur", 60, ["tonnerre"]);
    expect(fallback).toEqual(activeMoves("venusaur", 60, []));
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("gives every species something to fight with at every level", () => {
    for (const speciesId of Object.keys(SPECIES_BATTLE)) {
      expect(activeMoves(speciesId, 1).length).toBeGreaterThan(0);
      expect(activeMoves(speciesId, MAX_LEVEL).length).toBeGreaterThan(0);
    }
  });
});

describe("evolutionOptions", () => {
  const evolving = POKEMON_SPECIES.find((s) => (s.evolvesTo?.length ?? 0) > 0 && s.evolvesAtLevel)!;

  it("shows the target before it is reachable, and marks it locked", () => {
    const below = evolutionOptions(evolving.id, evolving.evolvesAtLevel! - 1);
    expect(below.length).toBeGreaterThan(0);
    expect(below.every((option) => !option.ready)).toBe(true);
  });

  it("opens it at exactly the stated level", () => {
    const at = evolutionOptions(evolving.id, evolving.evolvesAtLevel!);
    expect(at.every((option) => option.ready)).toBe(true);
    expect(canEvolveInto(evolving.id, evolving.evolvesAtLevel!, at[0].species.id)).toBe(true);
  });

  it("refuses a species that is not a direct evolution", () => {
    // Skipping a step is the tempting bug: Chenipan does not become Papilusion.
    const line = POKEMON_SPECIES.find((s) => s.id === "caterpie")!;
    expect(canEvolveInto(line.id, MAX_LEVEL, "butterfree")).toBe(false);
    expect(canEvolveInto(line.id, MAX_LEVEL, "metapod")).toBe(true);
  });

  it("offers nothing to a final stage", () => {
    const final = POKEMON_SPECIES.find((s) => !s.evolvesTo?.length)!;
    expect(evolutionOptions(final.id, MAX_LEVEL)).toEqual([]);
  });

  it("keeps every branch of a branching evolution at the same level", () => {
    for (const species of POKEMON_SPECIES) {
      if ((species.evolvesTo?.length ?? 0) < 2) continue;
      const levels = new Set(evolutionOptions(species.id, 1).map((option) => option.atLevel));
      expect(levels.size).toBe(1);
    }
  });
});

describe("POKEMON_BY_ID", () => {
  it("prices a level for every species in the roster", () => {
    for (const species of POKEMON_SPECIES) {
      expect(levelUpCost(species.id, 5)).not.toBeNull();
      expect(POKEMON_BY_ID[species.id]).toBeDefined();
    }
  });
});
