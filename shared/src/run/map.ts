import { RUN_CONFIG } from "../data/run-config.js";
import { makeRng, pickWeighted, subSeed } from "./rng.js";
import type { RunMap, RunNode, RunNodeType } from "./types.js";

/**
 * Procedural run map.
 *
 * Generated purely from the seed, so it is never stored: the server rebuilds
 * the same map to check that a node the client claims to have entered was
 * actually reachable from where the player stood.
 *
 * Rows fan out and back in, and every node in a row is guaranteed at least one
 * parent — a branch the player can see but never take is worse than no branch.
 */

const NODE_TYPES = Object.keys(RUN_CONFIG.earlyWeights) as RunNodeType[];

/** Blends the early and late tables, so difficulty drifts instead of stepping. */
function weightAt(type: RunNodeType, progress: number): number {
  const early = RUN_CONFIG.earlyWeights[type];
  const late = RUN_CONFIG.lateWeights[type];
  return early + (late - early) * progress;
}

export function generateRunMap(seed: number): RunMap {
  const rng = makeRng(subSeed(seed, 0x4d41_5000));
  const rows: RunNode[][] = [];

  for (let row = 0; row < RUN_CONFIG.rows; row++) {
    const span = RUN_CONFIG.maxWidth - RUN_CONFIG.minWidth + 1;
    const width = RUN_CONFIG.minWidth + Math.floor(rng() * span);
    const progress = RUN_CONFIG.rows > 1 ? row / (RUN_CONFIG.rows - 1) : 1;

    rows.push(
      Array.from({ length: width }, (_, col) => ({
        id: `n${row}-${col}`,
        // The opening row is always a plain fight: the first decision should be
        // which branch to take, not whether the run even started with a fight.
        type: row === 0 ? ("combat" as RunNodeType) : pickWeighted(NODE_TYPES, (t) => weightAt(t, progress), rng),
        row,
        col,
        next: [],
      }))
    );
  }

  rows.push([{ id: "boss", type: "boss", row: RUN_CONFIG.rows, col: 0, next: [] }]);

  for (let row = 0; row < rows.length - 1; row++) {
    const current = rows[row];
    const below = rows[row + 1];

    current.forEach((node, index) => {
      const anchor = Math.min(below.length - 1, Math.floor((index * below.length) / current.length));
      const links = new Set<number>([anchor]);
      // A second edge roughly half the time keeps the map from being a ladder.
      if (below.length > 1 && rng() < 0.5) {
        links.add(Math.min(below.length - 1, anchor + 1));
      }
      node.next = [...links].map((i) => below[i].id);
    });

    // Anything left unreachable gets adopted by the closest node above it.
    below.forEach((child, index) => {
      if (current.some((parent) => parent.next.includes(child.id))) return;
      const anchor = Math.min(current.length - 1, Math.floor((index * current.length) / below.length));
      current[anchor].next.push(child.id);
    });
  }

  const byId: Record<string, RunNode> = {};
  for (const row of rows) for (const node of row) byId[node.id] = node;

  return { rows, byId, entryIds: rows[0].map((node) => node.id) };
}

/** Nodes the player may legally enter next. */
export function reachableFrom(map: RunMap, currentNodeId: string | null): RunNode[] {
  if (currentNodeId === null) return map.entryIds.map((id) => map.byId[id]);
  return (map.byId[currentNodeId]?.next ?? []).map((id) => map.byId[id]).filter(Boolean);
}
