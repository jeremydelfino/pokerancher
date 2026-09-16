import { describe, expect, it } from "vitest";
import { SYNERGIES } from "../data/synergies.js";
import { activityStars } from "./stars.js";
import { EffectBag, buildEffectBag } from "./effects.js";
import { countTraits, resolveSynergies, resolveSynergy, resolveTraits, teamEffectBag } from "./engine.js";
import { describeEffect, describeEffects, describeThreshold, scopesOf } from "./describe.js";

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
  // Read the ladder rather than hardcoding it: these test the engine, and a
  // rebalance in data/synergies.ts must not be able to fail them.
  const LADDER = SYNERGIES.fertilisation.thresholds;
  const [T1, T2, TOP] = LADDER;

  it("reports no tier below the first threshold", () => {
    const state = resolveSynergy("fertilisation", T1.count - 1);
    expect(state.tierIndex).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.nextThreshold).toBe(T1.count);
    expect(state.toNext).toBe(1);
  });

  it("keeps every met tier and points at the next", () => {
    const state = resolveSynergy("fertilisation", T2.count);
    expect(state.tierIndex).toBe(2);
    expect(state.activeTiers).toHaveLength(2);
    expect(state.nextThreshold).toBe(TOP.count);
  });

  it("reports no next threshold at max", () => {
    const state = resolveSynergy("fertilisation", 99);
    expect(state.nextThreshold).toBeNull();
    expect(state.toNext).toBeNull();
  });

  it("applies only the highest tier by default, TFT style", () => {
    const state = resolveSynergy("fertilisation", TOP.count);
    expect(state.activeTiers).toHaveLength(LADDER.length);
    expect(state.effectiveTiers).toHaveLength(1);
    expect(state.effectiveTiers[0]).toBe(state.currentTier);
  });

  it("does not multiply the whole ladder together", () => {
    // The trap this guards: with cumulative stacking and absolute values, three
    // absolute tiers would compound instead of replacing one another.
    const holders = ["bulbasaur", "snivy", "sunkern", "torterra", "leafeon", "shaymin"]
      .slice(0, TOP.count)
      .map((speciesId) => ({ speciesId }));
    const bag = teamEffectBag(holders);

    const expected = TOP.effects.find((e) => e.type === "slot_rate" && e.target === "BERRY_FARM")!;
    expect(bag.multiplier("slot_rate", "BERRY_FARM")).toBeCloseTo(expected.value);
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

describe("describeEffects", () => {
  it("finds a sentence for every effect the game actually ships", () => {
    // The panel silently drops an effect it cannot read, so this is the test
    // that stops a new effect kind from shipping invisible to the player.
    for (const [traitId, synergy] of Object.entries(SYNERGIES)) {
      for (const tier of synergy.thresholds) {
        const lines = describeThreshold(tier);
        expect(
          lines.length,
          `${traitId} palier ${tier.count} : un effet n'a pas de phrase`
        ).toBe(tier.effects.length);
        for (const line of lines) expect(line.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("files a pen bonus under the Refuge and a damage bonus under the expedition", () => {
    expect(describeEffect({ type: "slot_rate", target: "BERRY_FARM", value: 1.35, mode: "mult" })).toEqual({
      scope: "farm",
      text: "Production du Champ de baies ×1.35",
    });
    // The feminine pens are the ones a naive `du ${label}` gets wrong.
    expect(describeEffect({ type: "slot_rate", target: "MINING", value: 1.7, mode: "mult" })!.text).toBe(
      "Production de la Mine ×1.7"
    );
    expect(describeEffect({ type: "activity_score", target: "WOODCUTTING", value: 2 })!.text).toBe(
      "+2 à l'activité de la Coupe de bois"
    );
    expect(describeEffect({ type: "combat_attack", value: 7 })).toEqual({
      scope: "combat",
      text: "+7 d'attaque pour toute l'équipe",
    });
  });

  it("says «tous» when an effect has no target", () => {
    expect(describeEffect({ type: "resource_rate", value: 1.1, mode: "mult" })!.text).toContain(
      "toutes les ressources"
    );
  });

  it("keeps a trait's scope stable across its whole ladder", () => {
    // Vigueur is a fighting trait at every tier; Fertilisation never is.
    expect(scopesOf(SYNERGIES.vigueur.thresholds)).toEqual(["combat"]);
    expect(scopesOf(SYNERGIES.fertilisation.thresholds)).toEqual(["farm"]);
    // Mysdibule's signature does both, and the panel has to show both.
    expect(scopesOf(SYNERGIES.machoire_double.thresholds)).toEqual(["farm", "combat"]);
  });

  it("stays silent rather than printing a raw effect it cannot read", () => {
    expect(describeEffect({ type: "quelque_chose_de_neuf", value: 3 })).toBeNull();
    expect(describeEffects([{ type: "quelque_chose_de_neuf", value: 3 }])).toEqual([]);
  });
});
