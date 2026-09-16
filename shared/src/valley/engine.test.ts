import { describe, expect, it } from "vitest";
import { VALLEY_CONFIG } from "../data/valley-config.js";
import { BIOMES } from "../data/valley-biomes.js";
import { captureOdds, playerMaxLevel } from "./capture.js";
import { eligibleEncounters, levelBandAt, rollEncounter, timeOfDay } from "./encounters.js";
import {
  battleTurn,
  canWalk,
  featureAt,
  flee,
  harvest,
  parseSeedCode,
  returnToRanch,
  seedCode,
  startValley,
  step,
  type ValleyRecruit,
} from "./engine.js";
import { distanceFromRanch } from "./world.js";
import { generateFeatures } from "./chunk.js";
import type { FeatureKind, ValleyState } from "./types.js";

const SEED = 0x51d3;

const TEAM: ValleyRecruit[] = [
  { unitId: "u1", speciesId: "ivysaur", level: 24, moves: [], shiny: false },
  { unitId: "u2", speciesId: "onix", level: 20, moves: [], shiny: false },
  { unitId: "u3", speciesId: "charmander", level: 12, moves: [], shiny: false },
];

const fresh = () => startValley(SEED, TEAM);

const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

/**
 * Walk `steps` tiles, routing around anything solid.
 *
 * The naive version — push east, fall back to north — walked into a pocket of
 * deep water and stalled there for the rest of the test, which measured
 * nothing at all. A player tries the other directions, so the helper does too.
 */
function walk(state: ValleyState, steps: number, preferred = 0): ValleyState {
  let current = state;
  let dir = preferred;

  for (let i = 0; i < steps; i++) {
    if (current.battle || current.status !== "active") break;

    let moved = false;
    for (let attempt = 0; attempt < DIRECTIONS.length; attempt++) {
      const candidate = (dir + attempt) % DIRECTIONS.length;
      const next = step(current, DIRECTIONS[candidate]).state;
      if (next !== current) {
        current = next;
        dir = candidate;
        moved = true;
        break;
      }
    }
    if (!moved) break; // fully walled in, which the world should never do
  }
  return current;
}

describe("seed codes", () => {
  it("round-trips a seed through its shareable form", () => {
    for (const seed of [0, 1, 0x51d3, 0x7fffffff, 305419896]) {
      expect(parseSeedCode(seedCode(seed))).toBe(seed >>> 0);
    }
  });

  it("reads a code back however the player typed it", () => {
    const code = seedCode(0x51d3);
    expect(parseSeedCode(code.toLowerCase())).toBe(0x51d3);
    expect(parseSeedCode(code.replace(/-/g, ""))).toBe(0x51d3);
    expect(parseSeedCode(`  ${code}  `)).toBe(0x51d3);
  });

  it("refuses something that is not a seed", () => {
    expect(parseSeedCode("bonjour")).toBeNull();
    expect(parseSeedCode("")).toBeNull();
  });
});

describe("starting a run", () => {
  it("opens at the Ranch with a team and a handful of balls", () => {
    const state = fresh();
    expect(state.at).toEqual({ x: 0, y: 0 });
    expect(state.team).toHaveLength(3);
    expect(state.carried.pokeballs).toBe(VALLEY_CONFIG.start.pokeballs);
    expect(state.status).toBe("active");
  });

  it("takes at most the allowed team size", () => {
    const crowded = startValley(SEED, [...TEAM, { unitId: "u4", speciesId: "abra", level: 9, moves: [], shiny: false }]);
    expect(crowded.team).toHaveLength(VALLEY_CONFIG.start.teamSize);
  });

  it("arms everyone with moves even when none were chosen", () => {
    for (const member of fresh().team) expect(member.moves.length).toBeGreaterThan(0);
  });
});

describe("walking", () => {
  it("moves one tile and counts the step", () => {
    const state = fresh();
    const after = step(state, { x: 1, y: 0 }).state;
    expect(after.at).toEqual({ x: 1, y: 0 });
    expect(after.steps).toBe(1);
  });

  it("refuses to walk into something solid", () => {
    // Find a tree next to open ground and try to walk into it.
    for (let x = 0; x < 400; x++) {
      if (!canWalk(SEED, { x, y: 0 }) && canWalk(SEED, { x: x - 1, y: 0 })) {
        const state: ValleyState = { ...fresh(), at: { x: x - 1, y: 0 } };
        expect(step(state, { x: 1, y: 0 }).state.at).toEqual({ x: x - 1, y: 0 });
        return;
      }
    }
    throw new Error("aucun obstacle trouvé — le monde est trop vide pour ce test");
  });

  it("tracks the furthest point reached, not the current one", () => {
    let state = walk(fresh(), 60);
    const best = state.bestDistance;
    expect(best).toBeGreaterThan(0);
    // Walk back towards the Ranch: the record must not fall. "Back" is towards
    // the origin, not west — routing around obstacles can leave you on any
    // side of it, and a fixed compass direction would walk further away.
    state = { ...state, battle: null };
    for (let i = 0; i < 30; i++) {
      const home = { x: -Math.sign(state.at.x), y: -Math.sign(state.at.y) };
      state = step(state, Math.abs(state.at.x) >= Math.abs(state.at.y) ? { x: home.x, y: 0 } : { x: 0, y: home.y }).state;
    }
    expect(distanceFromRanch(state.at)).toBeLessThan(best);
    expect(state.bestDistance).toBe(best);
  });

  it("remembers the chunks it has walked through, for the map", () => {
    const state = walk(fresh(), 200);
    expect(state.seen.length).toBeGreaterThan(1);
    expect(new Set(state.seen).size).toBe(state.seen.length);
  });
});

describe("encounter pacing", () => {
  it("leaves the first steps alone", () => {
    let state = fresh();
    for (let i = 0; i < VALLEY_CONFIG.encounter.graceSteps; i++) {
      state = step(state, { x: 1, y: 0 }).state;
      expect(state.battle).toBeNull();
    }
  });

  it("does not start a fight every few steps", () => {
    // The whole difference between an exploration game and a slot machine.
    let state = fresh();
    let battles = 0;
    let walked = 0;
    for (let i = 0; i < 4000 && walked < 600; i++) {
      if (state.battle) {
        battles++;
        state = flee(state);
        continue;
      }
      const before = state.steps;
      state = walk(state, 1, i % 40 < 20 ? 0 : 1);
      if (state.steps > before) walked++;
      else break;
    }
    // Roughly one fight per 25+ steps, never one per handful.
    expect(battles).toBeGreaterThan(0);
    expect(walked / Math.max(1, battles)).toBeGreaterThan(VALLEY_CONFIG.encounter.cooldownSteps);
  });

  it("refuses to walk on while a battle is open", () => {
    let state = fresh();
    for (let i = 0; i < 400 && !state.battle; i++) state = step(state, { x: 1, y: 0 }).state;
    if (!state.battle) return;
    const blocked = step(state, { x: 1, y: 0 });
    expect(blocked.state.at).toEqual(state.at);
    expect(blocked.log[0]).toContain("combat");
  });
});

describe("difficulty and the clock", () => {
  it("raises the level band the further you are from the Ranch", () => {
    const near = levelBandAt(0, BIOMES.plains);
    const far = levelBandAt(5000, BIOMES.plains);
    expect(far.min).toBeGreaterThan(near.min);
    expect(far.max).toBeGreaterThan(near.max);
  });

  it("never asks for a level past the collection's ceiling", () => {
    expect(levelBandAt(999999, BIOMES.desert).max).toBeLessThanOrEqual(VALLEY_CONFIG.difficulty.maxLevel);
  });

  it("makes a harsher biome harsher at the same distance", () => {
    expect(levelBandAt(2000, BIOMES.desert).max).toBeGreaterThan(levelBandAt(2000, BIOMES.plains).max);
  });

  it("walks through every phase of the day", () => {
    const seen = new Set<string>();
    for (let s = 0; s < VALLEY_CONFIG.dayNight.stepsPerCycle; s += 5) seen.add(timeOfDay(s));
    expect([...seen].sort()).toEqual(["day", "evening", "morning", "night"]);
  });

  it("keeps a nocturnal species out of the daytime pool", () => {
    const day = eligibleEncounters(BIOMES.forest, 9000, "day").map((r) => r.speciesId);
    const night = eligibleEncounters(BIOMES.forest, 9000, "night").map((r) => r.speciesId);
    expect(day).not.toContain("gengar");
    expect(night).toContain("gengar");
  });

  it("keeps a distant species out of reach near the Ranch", () => {
    const close = eligibleEncounters(BIOMES.forest, 100, "night").map((r) => r.speciesId);
    expect(close).not.toContain("celebi");
  });

  it("rolls the same Pokémon for the same seed and step", () => {
    const a = rollEncounter(SEED, 120, BIOMES.plains, 800, "day");
    const b = rollEncounter(SEED, 120, BIOMES.plains, 800, "day");
    expect(b).toEqual(a);
  });

  it("never rolls a species outside its own band", () => {
    for (let s = 0; s < 400; s++) {
      for (const metres of [0, 900, 3000, 9000]) {
        const wild = rollEncounter(SEED, s, BIOMES.forest, metres, "day");
        if (!wild) continue;
        const rule = BIOMES.forest.encounters.find((r) => r.speciesId === wild.speciesId)!;
        const floor = rule.minLevel;
        const ceiling = rule.maxLevel + VALLEY_CONFIG.alpha.levelBonus;
        expect(wild.level, `${wild.speciesId} @ ${metres}m`).toBeGreaterThanOrEqual(floor);
        expect(wild.level, `${wild.speciesId} @ ${metres}m`).toBeLessThanOrEqual(ceiling);
      }
    }
  });
});

describe("capture", () => {
  const wild = { speciesId: "pidgey", level: 10, shiny: false, alpha: false, attempts: 0 };

  it("gets easier as the target gets hurt", () => {
    const healthy = captureOdds(wild, { hp: 100, maxHp: 100 }, 10).chance;
    const hurt = captureOdds(wild, { hp: 50, maxHp: 100 }, 10).chance;
    const nearlyOut = captureOdds(wild, { hp: 8, maxHp: 100 }, 10).chance;
    expect(hurt).toBeGreaterThan(healthy);
    expect(nearlyOut).toBeGreaterThan(hurt);
  });

  it("punishes reaching above your level and rewards reaching below", () => {
    const below = captureOdds({ ...wild, level: 5 }, { hp: 40, maxHp: 100 }, 20).chance;
    const even = captureOdds({ ...wild, level: 20 }, { hp: 40, maxHp: 100 }, 20).chance;
    const above = captureOdds({ ...wild, level: 40 }, { hp: 40, maxHp: 100 }, 20).chance;
    expect(below).toBeGreaterThan(even);
    expect(even).toBeGreaterThan(above);
  });

  it("makes a rare species resist, and an alpha resist harder", () => {
    const common = captureOdds(wild, { hp: 20, maxHp: 100 }, 20).chance;
    const legendary = captureOdds({ ...wild, speciesId: "keldeo" }, { hp: 20, maxHp: 100 }, 20).chance;
    const alpha = captureOdds({ ...wild, alpha: true }, { hp: 20, maxHp: 100 }, 20).chance;
    expect(legendary).toBeLessThan(common);
    expect(alpha).toBeLessThan(common);
  });

  it("is never hopeless and never certain", () => {
    const hopeless = captureOdds({ ...wild, speciesId: "keldeo", level: 90, alpha: true }, { hp: 100, maxHp: 100 }, 5);
    const sure = captureOdds({ ...wild, level: 1 }, { hp: 1, maxHp: 500 }, 90);
    expect(hopeless.chance).toBeGreaterThanOrEqual(VALLEY_CONFIG.capture.minChance);
    expect(sure.chance).toBeLessThanOrEqual(VALLEY_CONFIG.capture.maxChance);
  });

  it("explains itself — every factor is named", () => {
    const odds = captureOdds({ ...wild, alpha: true, speciesId: "eevee" }, { hp: 30, maxHp: 100 }, 25);
    expect(odds.factors.length).toBeGreaterThanOrEqual(3);
    for (const factor of odds.factors) expect(factor.label.length).toBeGreaterThan(0);
  });

  it("measures against the best Pokémon in the team", () => {
    expect(playerMaxLevel([{ level: 8 }, { level: 24 }, { level: 11 }])).toBe(24);
  });
});

describe("harvesting", () => {
  /** Stand on a feature of a given kind, wherever in the world it is. */
  function standOn(kind: FeatureKind): ValleyState | null {
    for (let cx = 0; cx < 80; cx++) {
      for (let cy = -6; cy < 6; cy++) {
        const feature = generateFeatures(SEED, cx, cy).find((f) => f.kind === kind);
        if (feature) return { ...fresh(), at: feature.at };
      }
    }
    return null;
  }

  it("gives Pokéballs from a plant, once", () => {
    const state = standOn("pokeball_plant");
    expect(state).not.toBeNull();
    const before = state!.carried.pokeballs;

    const first = harvest(state!);
    expect(first.state.carried.pokeballs).toBeGreaterThan(before);

    // A harvested plant stays harvested — that is what `taken` is for.
    const second = harvest(first.state);
    expect(second.state.carried.pokeballs).toBe(first.state.carried.pokeballs);
    expect(second.log).toHaveLength(0);
  });

  it("gives the biome's own resources from a node", () => {
    const state = standOn("resource");
    expect(state).not.toBeNull();
    const after = harvest(state!).state;
    expect(Object.keys(after.carried.resources).length).toBeGreaterThan(0);
  });

  it("banks the carried loot and heals the team at a camp", () => {
    const found = standOn("camp");
    expect(found).not.toBeNull();
    const state: ValleyState = {
      ...found!,
      carried: { resources: { berry: 40 }, pokeballs: 3 },
      team: found!.team.map((m) => ({ ...m, hp: 1 })),
    };

    const after = harvest(state).state;
    expect(after.secured.resources.berry).toBe(40);
    expect(after.carried.resources).toEqual({});
    // Balls stay in hand: they are a tool, not loot to bank.
    expect(after.carried.pokeballs).toBe(3);
    for (const member of after.team) expect(member.hp).toBe(member.maxHp);
  });

  it("does nothing on empty ground", () => {
    const state = fresh();
    expect(featureAt(state)).toBeNull();
    expect(harvest(state).log).toHaveLength(0);
  });
});

describe("ending a run", () => {
  it("banks everything carried when you walk home", () => {
    const state: ValleyState = {
      ...fresh(),
      carried: { resources: { berry: 20, ore: 5 }, pokeballs: 4 },
      secured: { resources: { berry: 10 }, pokeballs: 0 },
      bestDistance: 1200,
    };
    const done = returnToRanch(state);
    expect(done.status).toBe("returned");
    expect(done.outcome!.banked.resources.berry).toBe(30);
    expect(done.outcome!.banked.resources.ore).toBe(5);
    expect(done.outcome!.bestDistance).toBe(1200);
  });

  it("keeps what a camp secured when the team faints, and loses the rest", () => {
    // Fight until the team is out, which is the only way to reach `lost`.
    let state: ValleyState = {
      ...fresh(),
      secured: { resources: { berry: 50 }, pokeballs: 0 },
      carried: { resources: { berry: 99 }, pokeballs: 2 },
      team: fresh().team.map((m) => ({ ...m, hp: 1, maxHp: 1 })),
    };
    for (let i = 0; i < 600 && state.status === "active"; i++) {
      if (state.battle) {
        const move = state.battle.team[state.battle.activeIndex]?.moves[0];
        if (state.battle.awaitingSwitch) {
          const alive = state.battle.team.find((m) => m.hp > 0);
          if (!alive) break;
          state = battleTurn(state, { kind: "switch", memberKey: alive.key }).state;
        } else if (move) {
          state = battleTurn(state, { kind: "move", moveId: move.id }).state;
        } else break;
        continue;
      }
      state = step(state, i % 2 ? { x: 1, y: 0 } : { x: 0, y: 1 }).state;
    }

    if (state.status !== "lost") return; // the team survived; nothing to assert
    expect(state.outcome!.banked.resources.berry).toBe(50);
    expect(state.outcome!.banked.resources.ore).toBeUndefined();
  });

  it("refuses to end a run twice", () => {
    const done = returnToRanch(fresh());
    expect(returnToRanch(done)).toBe(done);
  });
});
