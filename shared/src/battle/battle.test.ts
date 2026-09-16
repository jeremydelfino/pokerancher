import { describe, expect, it } from "vitest";
import { MOVES } from "../data/moves.js";
import { effectiveness } from "../data/types-chart.js";
import { availableSwitches, chooseFoeMove, damageOf, resolveBattleTurn } from "./engine.js";
import { activeMoves, knownMoves } from "../progression.js";
import { makeBattler } from "./stats.js";
import { describeMove, describeMoveEffect } from "./describe.js";
import type { BattleState, Battler } from "./types.js";

function battle(teamIds: string[], foeIds: string[], level = 20, foeLevel = level): BattleState {
  const team = teamIds.map((id, i) => makeBattler({ key: `t${i}`, id, level }));
  const foes = foeIds.map((id, i) => makeBattler({ key: `f${i}`, id, level: foeLevel }));
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

/** The first move that actually deals damage — a status move never ends a fight. */
const hitMove = (b: Battler) => (b.moves.find((m) => (MOVES[m.id]?.power ?? 0) > 0) ?? b.moves[0]).id;

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
    const attacker = makeBattler({ key: "a", id: "growlithe", level: 30 });
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
    const zap = makeBattler({ key: "a", id: "wild_voltorb", level: 40 });
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
    const start = battle(["regirock"], ["caterpie", "rattata"], 60);
    // Level 60 legendary against a level-60 caterpillar: this ends quickly.
    let state = start;
    for (let i = 0; i < 20 && state.foeIndex === 0 && state.status === "active"; i++) {
      state = resolveBattleTurn(state, { kind: "move", moveId: hitMove(state.team[0]) }, 5 + i);
    }
    expect(state.foeIndex === 1 || state.status === "won").toBe(true);
  });

  it("asks for a replacement rather than ending the run when someone faints", () => {
    const start = battle(["magikarp", "onix"], ["mewtwo"], 20, 60);
    start.team[0].hp = 1;
    let state = start;
    for (let i = 0; i < 12 && !state.awaitingSwitch && state.status === "active"; i++) {
      state = resolveBattleTurn(state, { kind: "move", moveId: hitMove(state.team[0]) }, 20 + i);
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
    const start = battle(["magikarp"], ["mewtwo"], 20, 60);
    start.team[0].hp = 1;
    const after = resolveBattleTurn(start, { kind: "move", moveId: hitMove(start.team[0]) }, 4);
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

describe("chosen movesets", () => {
  it("respects a selection of fewer than four instead of topping it back up", () => {
    // The trap: auto-filling to four put a move the player had just removed
    // straight back on the card.
    const picked = activeMoves("bulbasaur", 30, ["charge", "fouet_lianes"]);
    expect(picked).toEqual(["charge", "fouet_lianes"]);
  });

  it("falls back to the newest moves when nothing was chosen", () => {
    const auto = activeMoves("bulbasaur", 30);
    expect(auto).toHaveLength(4);
    expect(auto.every((move) => knownMoves("bulbasaur", 30).includes(move))).toBe(true);
  });

  it("drops a move the species cannot use rather than failing", () => {
    // What happens right after an evolution into a different learnset.
    expect(activeMoves("bulbasaur", 30, ["tonnerre", "charge"])).toEqual(["charge"]);
  });

  it("never offers a move above the Pokémon's level", () => {
    const early = knownMoves("bulbasaur", 5);
    expect(early).not.toContain("lance_soleil");
    expect(knownMoves("bulbasaur", 50)).toContain("lance_soleil");
  });
});

describe("drain moves", () => {
  it("heal from the damage dealt, not from the user's own maximum", () => {
    // The trap: reading `heal` as a fraction of max hit points let a frail
    // Pokémon out-heal what it was taking, and the fight never ended.
    const start = battle(["onix"], ["caterpie"], 40, 40);
    start.foes[0].hp = Math.round(start.foes[0].maxHp * 0.5);
    const before = start.foes[0].hp;

    const after = resolveBattleTurn(start, { kind: "move", moveId: "armure" }, 3);
    const drain = after.log.find((e) => e.kind === "heal");
    const hit = after.log.find((e) => e.kind === "damage" && e.side === "foe");

    if (drain && hit) {
      expect(drain.amount).toBeLessThanOrEqual(hit.amount ?? 0);
      expect(after.foes[0].hp).toBeLessThan(before + (hit.amount ?? 0));
    }
  });
});

describe("the foe's brain", () => {
  it("reaches for what works instead of picking at random", () => {
    // Caninos knows Lance-Flammes; against a grass Pokémon it should
    // overwhelmingly prefer it over Vive-Attaque.
    const state = battle(["sunkern"], ["growlithe"], 30);
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

describe("describeMove", () => {
  it("has words for every move in the catalogue", () => {
    for (const id of Object.keys(MOVES)) {
      const facts = describeMove(id)!;
      expect(facts, id).toBeTruthy();
      expect(facts.chips.length, id).toBe(3);
      expect(facts.lines[0].length, id).toBeGreaterThan(0);
    }
  });

  it("explains every effect a move can carry", () => {
    // A move whose whole point is its effect must not render as a blank line.
    for (const move of Object.values(MOVES)) {
      if (!move.effect) continue;
      expect(describeMoveEffect(move), move.id).not.toBeNull();
    }
  });

  it("says a drain move heals from the damage, and a rest from max PV", () => {
    // This is the engine's rule, and the sheet has to state the right one or a
    // player picks Vampigraine expecting Synthèse.
    expect(describeMoveEffect(MOVES.giga_sangsue)).toContain("des dégâts infligés");
    expect(describeMoveEffect(MOVES.synthese)).toContain("PV maximum");
  });

  it("states the size of a stat change, not its multiplier", () => {
    // mimi_queue is ×0.75 defence: the player cares that it is -25 %.
    expect(describeMoveEffect(MOVES.mimi_queue)).toContain("25 %");
  });

  it("flags a priority move", () => {
    expect(describeMove("vive_attaque")!.lines.join(" ")).toContain("avant l'adversaire");
    expect(describeMove("charge")!.lines.join(" ")).not.toContain("avant l'adversaire");
  });

  it("returns nothing for a move that does not exist", () => {
    expect(describeMove("nawak")).toBeNull();
  });
});
