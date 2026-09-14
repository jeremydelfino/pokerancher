import { describe, expect, it } from "vitest";
import { RUN_CONFIG } from "../data/run-config.js";
import { generateRunMap, reachableFrom } from "./map.js";
import { resolveCombat, rollEnemy } from "./combat.js";
import { EffectBag } from "../traits/effects.js";
import {
  abandonRun,
  availableNodes,
  enterNode,
  lootIsEmpty,
  mergeLoot,
  resolveChoice,
  runMap,
  scaleLoot,
  startRun,
  type RunRecruit,
} from "./engine.js";
import type { RunState } from "./types.js";

const RECRUITS: RunRecruit[] = [
  { unitId: "u1", speciesId: "keldeo", duplicateCount: 4 },
  { unitId: "u2", speciesId: "snivy", duplicateCount: 2 },
  { unitId: "u3", speciesId: "onix", duplicateCount: 1 },
  { unitId: "u4", speciesId: "lapras", duplicateCount: 1 },
];

/** Walks a run to its end by always taking the first legal option. */
function playOut(state: RunState, maxSteps = 200): RunState {
  let current = state;
  for (let i = 0; i < maxSteps && current.status === "active"; i++) {
    if (current.pending.length > 0) {
      current = resolveChoice(current, current.pending[0].options[0].id);
      continue;
    }
    const nodes = availableNodes(current);
    if (nodes.length === 0) break;
    current = enterNode(current, nodes[0].id);
  }
  return current;
}

describe("generateRunMap", () => {
  it("is fully determined by its seed", () => {
    const a = JSON.stringify(generateRunMap(1234).rows);
    const b = JSON.stringify(generateRunMap(1234).rows);
    expect(a).toBe(b);
  });

  it("gives different seeds different maps", () => {
    const a = JSON.stringify(generateRunMap(1).rows);
    const b = JSON.stringify(generateRunMap(2).rows);
    expect(a).not.toBe(b);
  });

  it("ends on a single boss", () => {
    const map = generateRunMap(99);
    const last = map.rows[map.rows.length - 1];
    expect(last).toHaveLength(1);
    expect(last[0].type).toBe("boss");
  });

  it("leaves no node unreachable", () => {
    const map = generateRunMap(7);
    for (let row = 1; row < map.rows.length; row++) {
      for (const node of map.rows[row]) {
        const hasParent = map.rows[row - 1].some((parent) => parent.next.includes(node.id));
        expect(hasParent, `${node.id} has no parent`).toBe(true);
      }
    }
  });

  it("opens on a fight so the first decision is which branch, not whether to fight", () => {
    expect(generateRunMap(42).rows[0].every((node) => node.type === "combat")).toBe(true);
  });
});

describe("resolveCombat", () => {
  it("replays identically from the same seed", () => {
    const state = startRun(555, RECRUITS);
    const enemy = rollEnemy("combat", 0, 1);
    const a = resolveCombat(state.team, enemy, 42, new EffectBag());
    const b = resolveCombat(state.team, enemy, 42, new EffectBag());
    expect(a.victory).toBe(b.victory);
    expect(a.rounds).toEqual(b.rounds);
  });

  it("lets relic bonuses bite without the team being rewritten", () => {
    const state = startRun(555, RECRUITS);
    const enemy = rollEnemy("boss", 8, 3);
    const bare = resolveCombat(state.team, enemy, 7, new EffectBag());
    const buffed = resolveCombat(
      state.team,
      enemy,
      7,
      new EffectBag().addAll([{ type: "combat_attack", value: 40 }])
    );
    // Round count is the wrong yardstick: against a boss this team loses either
    // way, on the same round. Damage dealt is what the bonus actually moves.
    expect(buffed.enemy.hp).toBeLessThan(bare.enemy.hp);
  });

  it("a full team clears an opening fight", () => {
    const state = startRun(555, RECRUITS);
    expect(resolveCombat(state.team, rollEnemy("combat", 0, 3), 7, new EffectBag()).victory).toBe(true);
  });

  it("a lone weakened member is not clearing a boss", () => {
    const solo = startRun(555, [{ unitId: "u", speciesId: "sunkern", duplicateCount: 1 }]);
    const battered = solo.team.map((m) => ({ ...m, hp: 1 }));
    expect(resolveCombat(battered, rollEnemy("boss", 8, 3), 7, new EffectBag()).victory).toBe(false);
  });

  it("always terminates", () => {
    const state = startRun(1, [{ unitId: "u", speciesId: "sunkern", duplicateCount: 1 }]);
    const enemy = rollEnemy("boss", 20, 9);
    expect(resolveCombat(state.team, enemy, 3, new EffectBag()).rounds.length).toBeGreaterThan(0);
  });
});

describe("startRun", () => {
  it("caps the team at the configured size", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      unitId: `u${i}`,
      speciesId: "snivy",
      duplicateCount: 1,
    }));
    expect(startRun(1, many).team).toHaveLength(RUN_CONFIG.teamSize);
  });

  it("starts with nothing banked and nothing pending", () => {
    const state = startRun(1, RECRUITS);
    expect(lootIsEmpty(state.secured)).toBe(true);
    expect(state.pending).toEqual([]);
    expect(state.currentNodeId).toBeNull();
  });

  it("offers the entry row and nothing else", () => {
    const state = startRun(1, RECRUITS);
    expect(availableNodes(state).map((n) => n.id).sort()).toEqual([...runMap(state).entryIds].sort());
  });
});

describe("enterNode", () => {
  it("refuses a node that is not reachable from where the player stands", () => {
    const state = startRun(4321, RECRUITS);
    expect(() => enterNode(state, "boss")).toThrow(/accessible/);
  });

  it("refuses to advance while a choice is pending", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);
    if (state.status === "active" && state.pending.length > 0) {
      expect(() => enterNode(state, "n1-0")).toThrow(/attente/);
    }
  });

  it("resolves the opening fight and records it", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);
    expect(state.lastCombat).toBeDefined();
    expect(state.path).toHaveLength(1);
  });
});

describe("resolveChoice", () => {
  it("rejects an option that was not offered", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);
    if (state.pending.length > 0) {
      expect(() => resolveChoice(state, "not-a-real-option")).toThrow(/proposé/);
    }
  });

  it("hands over hit points the moment a +HP relic is taken, not at the next fight", () => {
    const base = startRun(1, RECRUITS);
    const state: RunState = {
      ...base,
      pending: [
        {
          kind: "reward",
          title: "",
          prompt: "",
          options: [{ id: "relic:armure", label: "", description: "", grantRelic: "armure" }],
        },
      ],
    };
    const after = resolveChoice(state, "relic:armure");
    expect(after.team[0].hp).toBeGreaterThan(base.team[0].hp);
  });

  it("does not re-grant those hit points on every later choice", () => {
    const base = startRun(1, RECRUITS);
    const withRelic: RunState = {
      ...base,
      relics: ["armure"],
      pending: [
        { kind: "event", title: "", prompt: "", options: [{ id: "noop", label: "", description: "" }] },
      ],
    };
    const after = resolveChoice(withRelic, "noop");
    expect(after.team[0].hp).toBe(withRelic.team[0].hp);
  });

  it("banking moves carried loot into the secured pile", () => {
    const state: RunState = {
      ...startRun(1, RECRUITS),
      carried: { resources: { berry: 100 }, eggs: 0 },
      pending: [
        {
          kind: "secure",
          title: "",
          prompt: "",
          options: [{ id: "bank", label: "", description: "" }],
        },
      ],
    };
    const banked = resolveChoice(state, "bank");
    expect(banked.secured.resources.berry).toBe(Math.floor(100 * RUN_CONFIG.secureKeepRatio));
    expect(lootIsEmpty(banked.carried)).toBe(true);
  });

  it("extracting ends the run with everything intact", () => {
    const state: RunState = {
      ...startRun(1, RECRUITS),
      carried: { resources: { berry: 60 }, eggs: 1 },
      secured: { resources: { ore: 10 }, eggs: 0 },
      pending: [
        {
          kind: "secure",
          title: "",
          prompt: "",
          options: [{ id: "extract", label: "", description: "", secure: true }],
        },
      ],
    };
    const done = resolveChoice(state, "extract");
    expect(done.status).toBe("won");
    expect(done.outcome?.awarded.resources.berry).toBe(60);
    expect(done.outcome?.awarded.eggs).toBe(1);
  });
});

describe("a full run", () => {
  it("always terminates, whatever the seed", () => {
    for (const seed of [1, 77, 1234, 98765]) {
      const final = playOut(startRun(seed, RECRUITS));
      expect(["won", "lost", "abandoned"], `seed ${seed}`).toContain(final.status);
      expect(final.outcome).toBeDefined();
    }
  });

  it("replays identically from the same seed", () => {
    const a = playOut(startRun(31337, RECRUITS));
    const b = playOut(startRun(31337, RECRUITS));
    expect(a.status).toBe(b.status);
    expect(a.path).toEqual(b.path);
    expect(a.outcome?.awarded).toEqual(b.outcome?.awarded);
  });

  it("keeps only the banked pile after a defeat", () => {
    const state: RunState = {
      ...startRun(1, RECRUITS),
      secured: { resources: { berry: 50 }, eggs: 0 },
      carried: { resources: { berry: 999 }, eggs: 3 },
      team: startRun(1, RECRUITS).team.map((m) => ({ ...m, hp: 1 })),
      pending: [
        {
          kind: "event",
          title: "",
          prompt: "",
          options: [{ id: "doom", label: "", description: "", damagePercent: 5 }],
        },
      ],
    };
    const dead = resolveChoice(state, "doom");
    expect(dead.status).toBe("lost");
    expect(dead.outcome?.awarded.resources.berry).toBe(50);
    expect(dead.outcome?.awarded.eggs).toBe(0);
  });

  it("abandoning banks what was already secured", () => {
    const state: RunState = {
      ...startRun(1, RECRUITS),
      secured: { resources: { wood: 20 }, eggs: 0 },
    };
    const done = abandonRun(state);
    expect(done.status).toBe("abandoned");
    expect(done.outcome?.awarded.resources.wood).toBe(20);
  });
});

describe("loot maths", () => {
  it("merges bags additively", () => {
    const merged = mergeLoot({ resources: { berry: 5 }, eggs: 1 }, { resources: { berry: 3, ore: 2 }, eggs: 2 });
    expect(merged.resources.berry).toBe(8);
    expect(merged.resources.ore).toBe(2);
    expect(merged.eggs).toBe(3);
  });

  it("drops entries that round away to nothing", () => {
    const scaled = scaleLoot({ resources: { berry: 1 }, eggs: 1 }, 0.4);
    expect(scaled.resources.berry).toBeUndefined();
    expect(scaled.eggs).toBe(0);
  });
});
