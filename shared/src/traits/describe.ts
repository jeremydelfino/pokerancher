import { SLOTS_BY_TYPE } from "../pokemon-data.js";
import type { SynergyThreshold, TraitEffect } from "./types.js";

/**
 * Turning an effect into a sentence.
 *
 * The engine never interprets an effect's `type` — but the player has to. This
 * is the one place that does the interpreting, so the Refuge panel and the
 * expedition panel cannot drift apart, and adding a new effect kind means
 * adding a case here rather than hunting through two screens.
 *
 * Every line is tagged with *where* it bites, because that is the question a
 * player actually asks: "ça me sert à farmer, ou à me battre ?" A synergy that
 * only helps in a run is worthless in a pen, and the panel has to say so.
 */

export type EffectScope = "farm" | "combat";

export interface EffectLine {
  scope: EffectScope;
  text: string;
}

export const SCOPE_LABEL: Record<EffectScope, string> = {
  farm: "Refuge",
  combat: "Expédition",
};

/** Shown in the panel next to each group. Kept here so both screens agree. */
export const SCOPE_ICON: Record<EffectScope, string> = {
  farm: "🌱",
  combat: "⚔️",
};

/**
 * Pens, with their article already contracted.
 *
 * "Production du Mine" is the kind of wrong that makes a game read as
 * machine-written, and no amount of string interpolation fixes it from the
 * outside: the gender belongs to the name. Written out rather than derived,
 * because four entries are cheaper than a French gender heuristic that will be
 * wrong on the fifth pen anyway.
 */
const SLOT_OF: Record<string, string> = {
  BERRY_FARM: "du Champ de baies",
  FISHING_DOCK: "du Ponton de pêche",
  WOODCUTTING: "de la Coupe de bois",
  MINING: "de la Mine",
};

const RESOURCE_NAME: Record<string, string> = {
  berry: "baies",
  fish: "poissons",
  wood: "bois",
  ore: "minerai",
  egg_shard: "éclats d'œuf",
  coin: "pièces",
};

/** "1.35" reads as ×1.35, but "1.7" must not read as ×1.7000000000000002. */
const mult = (value: number) => `×${Number(value.toFixed(2))}`;
const percent = (value: number) => `${Math.round(value * 100)} %`;
const plus = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

/** "du Champ de baies", "de la Mine" — never "du Mine". */
const slotOf = (target?: string) => {
  if (!target) return null;
  return SLOT_OF[target] ?? `de ${SLOTS_BY_TYPE[target as keyof typeof SLOTS_BY_TYPE]?.label ?? target}`;
};

const resourceName = (target?: string) => (target ? (RESOURCE_NAME[target] ?? target) : null);

/**
 * One effect, in French, or null when the effect kind has no reader yet.
 *
 * Returning null rather than a fallback string is deliberate: a silent omission
 * is better than "run_luck +0.05" in the middle of a player-facing panel, and
 * a test asserts every effect in SYNERGIES produces a line.
 */
export function describeEffect(effect: TraitEffect): EffectLine | null {
  const { type, target, value } = effect;

  switch (type) {
    case "slot_rate": {
      const pen = slotOf(target);
      return {
        scope: "farm",
        text: pen ? `Production ${pen} ${mult(value)}` : `Production de tous les enclos ${mult(value)}`,
      };
    }

    case "resource_rate": {
      const resource = resourceName(target);
      return {
        scope: "farm",
        text: resource
          ? `Récolte de ${resource} ${mult(value)}`
          : `Récolte de toutes les ressources ${mult(value)}`,
      };
    }

    case "activity_score": {
      const pen = slotOf(target);
      return {
        scope: "farm",
        text: pen ? `${plus(value)} à l'activité ${pen}` : `${plus(value)} à l'activité de chaque enclos`,
      };
    }

    case "combat_attack":
      return { scope: "combat", text: `${plus(value)} d'attaque pour toute l'équipe` };

    case "combat_hp":
      return { scope: "combat", text: `${plus(value)} PV pour toute l'équipe` };

    case "run_loot": {
      const resource = resourceName(target);
      return {
        scope: "combat",
        text: resource ? `Butin en ${resource} ${mult(value)}` : `Tout le butin d'expédition ${mult(value)}`,
      };
    }

    case "run_luck":
      return { scope: "combat", text: `${plus(Math.round(value * 100))} % de chance sur la rareté des trouvailles` };

    default:
      return null;
  }
}

/** Every readable line of a list of effects, in the order they were written. */
export function describeEffects(effects: readonly TraitEffect[]): EffectLine[] {
  return effects
    .map(describeEffect)
    .filter((line): line is EffectLine => line !== null);
}

/** The same, grouped by where it bites — which is how the panel draws it. */
export function describeByScope(effects: readonly TraitEffect[]): Record<EffectScope, string[]> {
  const grouped: Record<EffectScope, string[]> = { farm: [], combat: [] };
  for (const line of describeEffects(effects)) grouped[line.scope].push(line.text);
  return grouped;
}

/** Convenience for a whole tier. */
export function describeThreshold(threshold: SynergyThreshold): EffectLine[] {
  return describeEffects(threshold.effects);
}

/**
 * Does this trait help at the Refuge, in a run, or both?
 *
 * Answered over the *whole* ladder rather than the active tier, because the
 * answer has to be stable: a trait does not stop being a combat trait because
 * you only have one holder.
 */
export function scopesOf(thresholds: readonly SynergyThreshold[]): EffectScope[] {
  const seen = new Set<EffectScope>();
  for (const tier of thresholds) {
    for (const line of describeThreshold(tier)) seen.add(line.scope);
  }
  return (["farm", "combat"] as const).filter((scope) => seen.has(scope));
}
