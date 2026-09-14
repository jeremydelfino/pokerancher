import type { EffectBagEntry, TraitEffect } from "./types.js";

/**
 * Accumulates effects into a queryable bag.
 *
 * Every (type, target) pair keeps three independent accumulators so effects
 * that stack differently never fight: sums, products, and a running maximum.
 * An effect with no target is a wildcard and folds into every lookup of that
 * type, which is how "+10% to all resources" and "+10% to berries" coexist.
 */

interface Accumulator {
  type: string;
  target: string;
  add: number;
  mult: number;
  max: number | null;
}

const WILDCARD = "*";

/** Key parts are kept on the accumulator too, so nothing ever has to be
 *  parsed back out of the composite string. */
function keyOf(type: string, target: string): string {
  return `${type}::${target}`;
}

export class EffectBag {
  private readonly slots = new Map<string, Accumulator>();

  add(effect: TraitEffect): this {
    const target = effect.target ?? WILDCARD;
    const id = keyOf(effect.type, target);
    let slot = this.slots.get(id);
    if (!slot) {
      slot = { type: effect.type, target, add: 0, mult: 1, max: null };
      this.slots.set(id, slot);
    }
    switch (effect.mode ?? "add") {
      case "add":
        slot.add += effect.value;
        break;
      case "mult":
        slot.mult *= effect.value;
        break;
      case "max":
        slot.max = slot.max === null ? effect.value : Math.max(slot.max, effect.value);
        break;
    }
    return this;
  }

  addAll(effects: Iterable<TraitEffect>): this {
    for (const effect of effects) this.add(effect);
    return this;
  }

  private read(type: string, target?: string): Accumulator[] {
    const out: Accumulator[] = [];
    const wildcard = this.slots.get(keyOf(type, WILDCARD));
    if (wildcard) out.push(wildcard);
    if (target !== undefined && target !== WILDCARD) {
      const exact = this.slots.get(keyOf(type, target));
      if (exact) out.push(exact);
    }
    return out;
  }

  /** Summed flat bonus. 0 when nothing contributes. */
  flat(type: string, target?: string): number {
    return this.read(type, target).reduce((sum, slot) => sum + slot.add, 0);
  }

  /** Product of every multiplicative contribution. 1 when nothing contributes. */
  multiplier(type: string, target?: string): number {
    return this.read(type, target).reduce((product, slot) => product * slot.mult, 1);
  }

  /** Largest "max"-mode contribution, or null when nothing contributes. */
  cap(type: string, target?: string): number | null {
    const values = this.read(type, target)
      .map((slot) => slot.max)
      .filter((value): value is number => value !== null);
    return values.length > 0 ? Math.max(...values) : null;
  }

  /** The common "base, then flat, then rate" shape. */
  apply(base: number, type: string, target?: string): number {
    return (base + this.flat(type, target)) * this.multiplier(type, target);
  }

  /** Flat snapshot, for sending to the client or asserting in tests. */
  entries(): EffectBagEntry[] {
    return [...this.slots.values()].map((slot) => ({
      type: slot.type,
      target: slot.target === WILDCARD ? undefined : slot.target,
      add: slot.add,
      mult: slot.mult,
      max: slot.max,
    }));
  }

  isEmpty(): boolean {
    return this.slots.size === 0;
  }
}

export function buildEffectBag(effects: Iterable<TraitEffect>): EffectBag {
  return new EffectBag().addAll(effects);
}
