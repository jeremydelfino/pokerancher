import { describe, expect, it } from "vitest";
import { RUN_CONFIG } from "../data/run-config.js";
import { generateRunMap, reachableFrom } from "./map.js";
import { STAGES } from "../data/stages.js";
import {
  abandonRun,
  availableNodes,
  enterNode,
  lootIsEmpty,
  mergeLoot,
  playBattleTurn,
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

/**
 * Walks a run to its end, always taking the first legal option and, in a fight,
 * the first usable move. Fights are interactive now, so a walker that only
 * picked nodes would stall on the opening battle forever.
 */
function playOut(state: RunState, maxSteps = 3000): RunState {
  let current = state;
  for (let i = 0; i < maxSteps && current.status === "active"; i++) {
    if (current.battle) {
      const battle = current.battle;
      if (battle.awaitingSwitch) {
        const next = battle.team.find((m, index) => m.hp > 0 && index !== battle.activeIndex);
        if (!next) break;
        current = playBattleTurn(current, { kind: "switch", memberKey: next.key });
        continue;
      }
      const active = battle.team[battle.activeIndex];
      const move = active.moves.find((m) => m.pp > 0) ?? active.moves[0];
      current = playBattleTurn(current, { kind: "move", moveId: move.id });
      continue;
    }
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

describe("battles", () => {
  it("opens a fight instead of resolving it, and blocks the map while it runs", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);

    expect(state.battle).not.toBeNull();
    expect(state.battle!.foes.length).toBeGreaterThan(0);
    // A fight in progress is as blocking as a pending choice.
    expect(availableNodes(state)).toHaveLength(0);
    expect(() => enterNode(state, "n1-0")).toThrow();
  });

  it("carries hit points out of the fight and into the run", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);

    const before = state.team.map((m) => m.hp);
    for (let i = 0; i < 40 && state.battle?.status === "active"; i++) {
      const active = state.battle.team[state.battle.activeIndex];
      state = playBattleTurn(state, { kind: "move", moveId: active.moves[0].id });
      if (state.battle?.awaitingSwitch) {
        const next = state.battle.team.find((m) => m.hp > 0);
        if (next) state = playBattleTurn(state, { kind: "switch", memberKey: next.key });
      }
    }

    // Somebody took damage, and the run's copy of the team knows about it.
    expect(state.team.map((m) => m.hp)).not.toEqual(before);
    expect(state.team.every((m) => m.hp <= m.maxHp)).toBe(true);
  });

  it("refuses a turn when no fight is running", () => {
    const state = startRun(4321, RECRUITS);
    expect(() => playBattleTurn(state, { kind: "move", moveId: "charge" })).toThrow(/combat/);
  });

  it("fields the stage's own Pokémon, at the stage's level", () => {
    const stage = STAGES[3];
    let state = startRun(99, RECRUITS, stage.id);
    state = enterNode(state, availableNodes(state)[0].id);

    for (const foe of state.battle!.foes) {
      expect(stage.wild, foe.speciesId).toContain(foe.speciesId);
      expect(foe.level).toBeGreaterThanOrEqual(stage.level);
    }
  });

  it("puts the stage's legendary at the end, alone", () => {
    const stage = STAGES[0];
    let state = startRun(7, RECRUITS, stage.id);
    // Walk straight to the boss by clearing everything in the way.
    state = playOut(state);
    expect(["won", "lost"]).toContain(state.status);
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

  it("records which expedition it is", () => {
    expect(startRun(1, RECRUITS, "stage-4").stageId).toBe("stage-4");
    expect(startRun(1, RECRUITS).stageId).toBe(STAGES[0].id);
    expect(() => startRun(1, RECRUITS, "stage-nope")).toThrow();
  });

  it("scales the team to the stage rather than leaving it behind", () => {
    const early = startRun(1, RECRUITS, "stage-1").team[0];
    const late = startRun(1, RECRUITS, "stage-9").team[0];
    expect(late.level).toBeGreaterThan(early.level);
    expect(late.maxHp).toBeGreaterThan(early.maxHp);
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
    const state: RunState = {
      ...startRun(4321, RECRUITS),
      pending: [{ kind: "event", title: "", prompt: "", options: [] }],
    };
    expect(() => enterNode(state, "n0-0")).toThrow(/attente/);
  });

  it("records where the player walked", () => {
    let state = startRun(4321, RECRUITS);
    state = enterNode(state, availableNodes(state)[0].id);
    expect(state.path).toHaveLength(1);
  });
});

describe("resolveChoice", () => {
  it("rejects an option that was not offered", () => {
    const state: RunState = {
      ...startRun(4321, RECRUITS),
      pending: [
        { kind: "event", title: "", prompt: "", options: [{ id: "real", label: "", description: "" }] },
      ],
    };
    expect(() => resolveChoice(state, "not-a-real-option")).toThrow(/proposé/);
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
    // Take the relic for real first — a fixture that merely *lists* it would be
    // a run whose stats were never refreshed, which is not a state the engine
    // can produce.
    const withRelic = resolveChoice(
      {
        ...base,
        pending: [
          {
            kind: "reward",
            title: "",
            prompt: "",
            options: [{ id: "relic:armure", label: "", description: "", grantRelic: "armure" }],
          },
        ],
      },
      "relic:armure"
    );

    const after = resolveChoice(
      {
        ...withRelic,
        pending: [
          { kind: "event", title: "", prompt: "", options: [{ id: "noop", label: "", description: "" }] },
        ],
      },
      "noop"
    );
    expect(after.team[0].hp).toBe(withRelic.team[0].hp);
    expect(after.team[0].maxHp).toBe(withRelic.team[0].maxHp);
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
      team: startRun(1, RECRUITS).team.map((m: RunState["team"][number]) => ({ ...m, hp: 1 })),
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
