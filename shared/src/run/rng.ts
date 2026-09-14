/**
 * Deterministic RNG.
 *
 * Runs are stored as a seed plus the path taken, never as a pile of rolled
 * results. That keeps a run to a few hundred bytes and, more importantly, lets
 * the server regenerate any node from scratch and check the client's claim
 * about it. Every sub-roll derives its own stream from the run seed and a step
 * counter, so resolving node 4 twice always gives the same answer.
 */

/** mulberry32 — small, fast, good enough for loot tables, stable across engines. */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derives an independent stream from a parent seed and any number of labels. */
export function subSeed(seed: number, ...parts: number[]): number {
  let h = seed >>> 0;
  for (const part of parts) {
    h = (Math.imul(h ^ (part >>> 0), 2654435761) + 0x9e3779b9) >>> 0;
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return items[0];
  let roll = rng() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Fisher-Yates against a seeded stream — same seed, same order, every time. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
