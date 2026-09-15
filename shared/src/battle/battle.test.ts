import { describe, expect, it } from "vitest";
import { MOVES } from "../data/moves.js";
import { effectiveness } from "../data/types-chart.js";
import { availableSwitches, chooseFoeMove, damageOf, resolveBattleTurn } from "./engine.js";
import { makeBattler } from "./stats.js";
import type { BattleState, Battler } from "./types.js";

function battle(teamIds: string[], foeIds: string[], level = 20): BattleState {
  const team = teamIds.map((id, i) => makeBattler({ key: `t${i}`, id, level }));
  const foes = foeIds.map((id, i) => makeBattler({ key: `f${i}`, id, level }));
  return {
    team,
    activeIndex: 0,
    foes,
    foeIndex: 0,
    turn: 1,
    log: [],
    status: "active",
    awaitingSwitch: false,
    title: "Test",
    boss: false,
  };
}

const firstMove = (b: Battler) => b.moves[0].id;

describe("type chart", () => {
  it("doubles, halves and cancels the way the table says", () => {
    expect(effectiveness("feu", ["plante"])).toBe(2);
    expect(effectiveness("feu", ["eau"])).toBe(0.5);
    expect(effectiveness("electrik", ["sol"])).toBe(0);
    expect(effectiveness("normal", ["spectre"])).toBe(0);
  });

  it("multiplies across a dual type", () => {
    // Roche is strong on vol and on insecte, so Insécateur eats four times.
    expect(effectiveness("roche", ["insecte", "vol"])).toBe(4);
    // Plante is weak to both halves of acier/sol… except sol, which it beats.
    expect(effectiveness("plante", ["acier", "sol"])).toBe(1);
  });
});

describe("damage", () => {
  it("rewards the same type as the attacker and punishes a resisted hit", () => {
    const attacker = makeBattler({ key: "a", id: "caninos", level: 30 });
    const grass = makeBattler({ key: "b", id: "sunkern", level: 30 });
    const water = makeBattler({ key: "c", id: "magikarp", level: 30 });
    const roll = () => 1;

    const onGrass = damageOf(attacker, grass, MOVES.lance_flammes, roll);
    const onWater = damageOf(attacker, water, MOVES.lance_flammes, roll);

    expect(onGrass.multiplier).toBe(2);
    expect(onWater.multiplier).toBe(0.5);
    expect(onGrass.damage).toBeGreaterThan(onWater.damage);
  });

  it("never rounds a hit down to nothing", () => {
    const weak = makeBattler({ key: "a", id: "magikarp", level: 1 });
    const wall = makeBattler({ key: "b", id: "steelix", level: 90 });
    expect(damageOf(weak, wall, MOVES.charge, () => 0.85).damage).toBeGreaterThan(0);
  });

  it("deals nothing through an immunity", () => {
    const zap = makeBattler({ key: "a", id: "voltorbe", level: 40 });
    const ground = makeBattler({ key: "b", id: "onix", level: 20 });
    expect(damageOf(zap, ground, MOVES.eclair, () => 1).damage).toBe(0);
  });
});

describe("a turn", () => {
  it("is deterministic for a given seed", () => {
    const start = battle(["keldeo"], ["rattata"]);
    const move = firstMove(start.team[0]);
    const a = resolveBattleTurn(start, { kind: "move", moveId: move }, 42);
    const b = resolveBattleTurn(start, { kind: "move", moveId: move }, 42);
    expect(a.log).toEqual(b.log);
    expect(a.foes[0].hp).toBe(b.foes[0].hp);
  });

  it("never mutates the state it was handed", () => {
    const start = battle(["keldeo"], ["rattata"]);
    const before = JSON.stringify(start);
    resolveBattleTurn(start, { kind: "move", moveId: firstMove(start.team[0]) }, 7);
    expect(JSON.stringify(start)).toBe(before);
  });

  it("spends a PP for the move it used", () => {
    const start = battle(["keldeo"], ["rattata"]);
    const move = firstMove(start.team[0]);
    const after = resolveBattleTurn(start, { kind: "move", moveId: move }, 3);
    const slot = after.team[0].moves.find((m) => m.id === move)!;
    expect(slot.pp).toBe(slot.maxPp - 1);
  });

  it("lets priority beat speed", () => {
    // Snivy is fast, Onix is not; Onix's Vive-Attaque still lands first.
    const start = battle(["onix"], ["snivy"]);
    const quick = { ...start };
    quick.team[0].moves[0] = { id: "vive_attaque", pp: 15, maxPp: 15 };
    const after = resolveBattleTurn(quick, { kind: "move", moveId: "vive_attaque" }, 11);
    expect(after.log[0].side).toBe("team");
  });

  it("sends the next foe out when one drops", () => {
    const start = battle(["regirock"], ["chenipan", "rattata"], 60);
    // Level 60 legendary against a level-60 caterpillar: this ends quickly.
    let state = start;
    for (let i = 0; i < 20 && state.foeIndex === 0 && state.status === "active"; i++) {
      state = resolveBattleTurn(state, { kind: "move", moveId: firstMove(state.team[0]) }, 5 + i);
    }
    expect(state.foeIndex === 1 || state.status === "won").toBe(true);
  });

  it("asks for a replacement rather than ending the run when someone faints", () => {
    const start = battle(["magikarp", "onix"], ["mewtwo"], 40);
    start.team[0].hp = 1;
    let state = start;
    for (let i = 0; i < 12 && !state.awaitingSwitch && state.status === "active"; i++) {
      state = resolveBattleTurn(state, { kind: "move", moveId: firstMove(state.team[0]) }, 20 + i);
    }
    expect(state.awaitingSwitch || state.status === "won").toBe(true);
    if (state.awaitingSwitch) {
      expect(availableSwitches(state).length).toBeGreaterThan(0);
      const next = availableSwitches(state)[0];
      const swapped = resolveBattleTurn(state, { kind: "switch", memberKey: next.key }, 99);
      expect(swapped.awaitingSwitch).toBe(false);
      expect(swapped.team[swapped.activeIndex].key).toBe(next.key);
    }
  });

  it("loses only when the last member is down", () => {
    const start = battle(["magikarp"], ["mewtwo"], 50);
    start.team[0].hp = 1;
    const after = resolveBattleTurn(start, { kind: "move", moveId: firstMove(start.team[0]) }, 4);
    expect(after.status).toBe("lost");
  });

  it("refuses a move once the fight is over", () => {
    const done = { ...battle(["onix"], ["rattata"]), status: "won" as const };
    expect(() => resolveBattleTurn(done, { kind: "move", moveId: "charge" }, 1)).toThrow();
  });

  it("refuses to attack while a replacement is owed", () => {
    const stuck = { ...battle(["onix", "snivy"], ["rattata"]), awaitingSwitch: true };
    expect(() => resolveBattleTurn(stuck, { kind: "move", moveId: "charge" }, 1)).toThrow();
  });
});

describe("the foe's brain", () => {
  it("reaches for what works instead of picking at random", () => {
    // Caninos knows Lance-Flammes; against a grass Pokémon it should
    // overwhelmingly prefer it over Vive-Attaque.
    const state = battle(["sunkern"], ["caninos"], 30);
    const picks = Array.from({ length: 60 }, (_, i) => chooseFoeMove(state, makeSeededRng(i)));
    const fire = picks.filter((id) => MOVES[id]?.type === "feu").length;
    expect(fire).toBeGreaterThan(picks.length / 2);
  });

  it("only ever names a move it actually has", () => {
    const state = battle(["onix"], ["mewtwo"], 40);
    const known = new Set(state.foes[0].moves.map((m) => m.id));
    for (let i = 0; i < 30; i++) {
      expect(known.has(chooseFoeMove(state, makeSeededRng(i)))).toBe(true);
    }
  });
});

/** A tiny deterministic generator, so the AI tests do not depend on Math.random. */
function makeSeededRng(seed: number): () => number {
  let state = seed * 2654435761 + 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
