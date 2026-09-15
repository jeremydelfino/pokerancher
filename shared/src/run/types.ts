import type { BattleState, Battler } from "../battle/types.js";
import type { ResourceType } from "../types.js";
import type { TraitEffect } from "../traits/types.js";

/** Add a case here and the map generator will place it once it has a weight. */
export type RunNodeType = "combat" | "elite" | "event" | "reward" | "shop" | "rest" | "boss";

export interface RunNode {
  id: string;
  type: RunNodeType;
  row: number;
  col: number;
  /** Ids of the nodes reachable from here. Empty on the boss. */
  next: string[];
}

export interface RunMap {
  rows: RunNode[][];
  byId: Record<string, RunNode>;
  entryIds: string[];
}

/**
 * A team member is a full battler — `key` is its PokemonUnit id, so rewards can
 * still be attributed back to the collection.
 *
 * Base stats are kept alongside the live ones because trait and relic bonuses
 * are re-applied from the base every time the effect bag changes; recomputing
 * from the current value would compound a +25 PV relic on every pickup.
 */
export interface RunTeamMember extends Battler {
  /** Traits granted for this run only — relics write here. */
  extraTraits: string[];
  baseMaxHp: number;
  baseAttack: number;
}

export interface LootBag {
  resources: Partial<Record<ResourceType, number>>;
  eggs: number;
}

export interface RunRelic {
  id: string;
  name: string;
  description: string;
  effects: TraitEffect[];
  /** Traits handed to every team member for the rest of the run. */
  grantsTraits?: string[];
}

export type RunChoiceKind = "reward" | "event" | "secure" | "shop";

export interface RunChoiceOption {
  id: string;
  label: string;
  description: string;
  /** What taking this option does. The engine applies these. */
  grantRelic?: string;
  grantLoot?: LootBag;
  grantTraits?: string[];
  /** Fraction of max hit points restored to the whole team. */
  healPercent?: number;
  /** Fraction of max hit points taken off the whole team. */
  damagePercent?: number;
  /** "secure" options only: bank carried loot, or push on. */
  secure?: boolean;
  continueRun?: boolean;
}

export interface PendingChoice {
  kind: RunChoiceKind;
  title: string;
  prompt: string;
  options: RunChoiceOption[];
}

export type RunStatus = "active" | "won" | "lost" | "abandoned";

export interface RunState {
  seed: number;
  /** Which of the ten expeditions this is. */
  stageId: string;
  status: RunStatus;
  /** Node ids resolved so far, in order. The map comes back from the seed. */
  path: string[];
  /** Where the player stands. Null before the first step. */
  currentNodeId: string | null;
  team: RunTeamMember[];
  relics: string[];
  /** Banked. Survives a defeat. */
  secured: LootBag;
  /** Earned but still at risk. Lost on a defeat. */
  carried: LootBag;
  /**
   * Choices waiting on the player, oldest first. An elite can queue two — take
   * your reward, then decide whether to bank it — so this is a queue rather
   * than a single slot.
   */
  pending: PendingChoice[];
  /** Feeds sub-seeds so every resolution is independent and repeatable. */
  step: number;
  /**
   * The fight in progress, or null while walking the map.
   *
   * A battle is *interactive*: the player sends one action per turn and the
   * server resolves it, so this has to live in the run state rather than being
   * a recording produced and forgotten in one call.
   */
  battle: BattleState | null;
  /** Set once the run ends, for the summary screen. */
  outcome?: RunOutcome;
}

export interface RunOutcome {
  status: Exclude<RunStatus, "active">;
  /** What actually lands in the player's account. */
  awarded: LootBag;
  depth: number;
  message: string;
}

