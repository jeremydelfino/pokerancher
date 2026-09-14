import { describe, expect, it } from "vitest";
import { activityStars } from "./stars.js";
import { EffectBag, buildEffectBag } from "./effects.js";
import { countTraits, resolveSynergies, resolveSynergy, resolveTraits, teamEffectBag } from "./engine.js";

describe("resolveTraits", () => {
  it("reads the species config", () => {
    expect(resolveTraits("bulbasaur")).toContain("fertilisation");
  });

  it("merges run-granted traits without duplicating", () => {
    const traits = resolveTraits("bulbasaur", ["carapace", "fertilisation"]);
    expect(traits).toContain("carapace");
    expect(traits.filter((t) => t === "fertilisation")).toHaveLength(1);
  });

  it("returns nothing for an unknown species rather than throwing", () => {
    expect(resolveTraits("missingno")).toEqual([]);
  });
});

describe("countTraits", () => {
  it("counts one holder per species, TFT style", () => {
    const counts = countTraits([
      { speciesId: "bulbasaur" },
      { speciesId: "bulbasaur" },
      { speciesId: "snivy" },
    ]);
    expect(counts.get("fertilisation")).toBe(2);
  });

  it("counts traits granted at run time", () => {
    const counts = countTraits([
      { speciesId: "onix", extraTraits: ["fertilisation"] },
      { speciesId: "steelix", extraTraits: ["fertilisation"] },
    ]);
    expect(counts.get("fertilisation")).toBe(2);
    expect(counts.get("mineur")).toBe(2);
  });
});

describe("resolveSynergy", () => {
  it("reports no tier below the first threshold", () => {
    const state = resolveSynergy("fertilisation", 1);
    expect(state.tierIndex).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.nextThreshold).toBe(2);
    expect(state.toNext).toBe(1);
  });

  it("keeps every met tier and points at the next", () => {
    const state = resolveSynergy("fertilisation", 3);
    expect(state.tierIndex).toBe(2);
    expect(state.activeTiers).toHaveLength(2);
    expect(state.nextThreshold).toBe(4);
  });

  it("reports no next threshold at max", () => {
    const state = resolveSynergy("fertilisation", 99);
    expect(state.nextThreshold).toBeNull();
    expect(state.toNext).toBeNull();
  });

  it("sorts strongest first so the panel reads top-down", () => {
    const states = resolveSynergies([
      { speciesId: "bulbasaur" },
      { speciesId: "snivy" },
      { speciesId: "torterra" },
    ]);
    expect(states[0].traitId).toBe("fertilisation");
  });
});

describe("EffectBag", () => {
  it("sums additive effects and multiplies rates independently", () => {
    const bag = buildEffectBag([
      { type: "combat_attack", value: 3 },
      { type: "combat_attack", value: 4 },
      { type: "slot_rate", target: "MINING", value: 1.5, mode: "mult" },
      { type: "slot_rate", target: "MINING", value: 2, mode: "mult" },
    ]);
    expect(bag.flat("combat_attack")).toBe(7);
    expect(bag.multiplier("slot_rate", "MINING")).toBe(3);
  });

  it("folds untargeted effects into every target of that type", () => {
    const bag = buildEffectBag([
      { type: "slot_rate", value: 1.1, mode: "mult" },
      { type: "slot_rate", target: "MINING", value: 2, mode: "mult" },
    ]);
    expect(bag.multiplier("slot_rate", "MINING")).toBeCloseTo(2.2);
    expect(bag.multiplier("slot_rate", "BERRY_FARM")).toBeCloseTo(1.1);
  });

  it("returns neutral values when nothing contributes", () => {
    const bag = new EffectBag();
    expect(bag.flat("whatever")).toBe(0);
    expect(bag.multiplier("whatever")).toBe(1);
    expect(bag.cap("whatever")).toBeNull();
  });

  it("keeps the largest max-mode contribution", () => {
    const bag = buildEffectBag([
      { type: "cap", value: 5, mode: "max" },
      { type: "cap", value: 9, mode: "max" },
      { type: "cap", value: 2, mode: "max" },
    ]);
    expect(bag.cap("cap")).toBe(9);
  });
});

describe("activityStars", () => {
  it("scores nothing for an empty pen", () => {
    const stars = activityStars("MINING", new EffectBag(), { occupied: false });
    expect(stars.stars).toBe(0);
    expect(stars.score).toBe(0);
  });

  it("climbs as synergies contribute score", () => {
    const bare = activityStars("MINING", new EffectBag());
    const boosted = activityStars(
      "MINING",
      buildEffectBag([{ type: "activity_score", target: "MINING", value: 3 }])
    );
    expect(boosted.stars).toBeGreaterThan(bare.stars);
  });

  it("points at the next threshold until the ladder runs out", () => {
    const stars = activityStars("MINING", new EffectBag());
    expect(stars.nextThreshold).not.toBeNull();
    expect(stars.toNext).toBeGreaterThan(0);
  });
});

describe("teamEffectBag", () => {
  it("turns an active synergy into a real Refuge multiplier", () => {
    const solo = teamEffectBag([{ speciesId: "bulbasaur" }]);
    const pair = teamEffectBag([{ speciesId: "bulbasaur" }, { speciesId: "snivy" }]);
    expect(solo.multiplier("slot_rate", "BERRY_FARM")).toBe(1);
    expect(pair.multiplier("slot_rate", "BERRY_FARM")).toBeGreaterThan(1);
  });
});
