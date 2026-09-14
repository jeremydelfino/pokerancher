import { describe, expect, it } from "vitest";
import { SLOT_UPGRADE_TIERS } from "./data/market.js";
import { EffectBag } from "./traits/effects.js";
import { activityStars } from "./traits/stars.js";
import {
  marketStalls,
  maxSlotLevel,
  nextSlotUpgrade,
  sellQuote,
  slotUpgradeCost,
  slotUpgradeEffects,
  slotUpgradeState,
} from "./market.js";

describe("selling", () => {
  it("prices a sale at the listed unit price", () => {
    const quote = sellQuote("ore", 10, 40);
    expect(quote.total).toBe(quote.unitPrice * 10);
  });

  it("refuses to sell currency", () => {
    expect(() => sellQuote("coin", 1, 99)).toThrow();
    expect(() => sellQuote("egg_shard", 1, 99)).toThrow();
  });

  it("refuses to sell more than is owned", () => {
    expect(() => sellQuote("berry", 10, 9)).toThrow();
  });

  it("refuses fractional and non-positive quantities", () => {
    expect(() => sellQuote("berry", 0, 50)).toThrow();
    expect(() => sellQuote("berry", -3, 50)).toThrow();
    expect(() => sellQuote("berry", 1.5, 50)).toThrow();
  });

  it("reports what the whole stock would fetch", () => {
    const stalls = marketStalls({ berry: 100, ore: 0 });
    const berry = stalls.find((s) => s.resource === "berry")!;
    expect(berry.totalIfSoldAll).toBe(berry.unitPrice * 100);
    expect(stalls.find((s) => s.resource === "ore")!.totalIfSoldAll).toBe(0);
  });
});

describe("pen upgrades", () => {
  it("targets its effects at the pen being upgraded, never another", () => {
    const effects = slotUpgradeEffects("MINING", 2);
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((e) => e.target === "MINING")).toBe(true);
  });

  it("applies one tier only, so the ladder never compounds", () => {
    const bag = new EffectBag().addAll(slotUpgradeEffects("MINING", 4));
    const top = SLOT_UPGRADE_TIERS[SLOT_UPGRADE_TIERS.length - 1];
    const expected = top.effects.find((e) => e.type === "slot_rate")!.value;
    expect(bag.multiplier("slot_rate", "MINING")).toBeCloseTo(expected);
  });

  it("grants nothing at level 0", () => {
    expect(slotUpgradeEffects("MINING", 0)).toEqual([]);
  });

  it("raises the pen's star rating", () => {
    const bare = activityStars("MINING", new EffectBag());
    const upgraded = activityStars("MINING", new EffectBag().addAll(slotUpgradeEffects("MINING", 3)));
    expect(upgraded.score).toBeGreaterThan(bare.score);
    expect(upgraded.stars).toBeGreaterThan(bare.stars);
  });

  it("stops at the top of the ladder", () => {
    const max = maxSlotLevel("MINING");
    expect(nextSlotUpgrade("MINING", max)).toBeNull();
    expect(() => slotUpgradeCost("MINING", max, 10_000_000)).toThrow();
  });

  it("refuses a purchase the player cannot afford", () => {
    const next = nextSlotUpgrade("BERRY_FARM", 0)!;
    expect(() => slotUpgradeCost("BERRY_FARM", 0, next.cost - 1)).toThrow();
    expect(slotUpgradeCost("BERRY_FARM", 0, next.cost)).toBe(next.cost);
  });

  it("reports the shortfall for the UI", () => {
    const next = nextSlotUpgrade("BERRY_FARM", 0)!;
    expect(slotUpgradeState("BERRY_FARM", 0, next.cost - 25).missing).toBe(25);
    expect(slotUpgradeState("BERRY_FARM", 0, next.cost).affordable).toBe(true);
    expect(slotUpgradeState("BERRY_FARM", maxSlotLevel("BERRY_FARM"), 0).next).toBeNull();
  });
});
