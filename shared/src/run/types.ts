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

export interface RunTeamMember {
  /** PokemonUnit id, so rewards can be attributed back to the collection. */
  unitId: string;
  speciesId: string;
  hp: number;
  maxHp: number;
  attack: number;
  /** Traits granted for this run only — relics write here. */
  extraTraits: string[];
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
  /** Set once the run ends, for the summary screen. */
  outcome?: RunOutcome;
  /** The fight just resolved, kept so the client can replay it as animation. */
  lastCombat?: CombatResult;
}

export interface RunOutcome {
  status: Exclude<RunStatus, "active">;
  /** What actually lands in the player's account. */
  awarded: LootBag;
  depth: number;
  message: string;
}

export interface CombatSide {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
}

/**
 * One swing.
 *
 * The fight is stored blow by blow rather than as a summary so the client can
 * *replay* it: every entry carries who swung, who was hit, and the hit points of
 * everyone afterwards, which is exactly what an animated health bar needs. The
 * server still decides the whole fight in one go — this is a recording, not a
 * conversation.
 */
export interface CombatBlow {
  /** 1-based. Each turn is: every living member swings once, then the enemy. */
  turn: number;
  /** Who is swinging. */
  side: "team" | "enemy";
  /** The member swinging (side "team") or being hit (side "enemy"). */
  memberIndex: number;
  damage: number;
  /** True when this blow took its target to zero. */
  fatal: boolean;
  enemyHp: number;
  /** Every member's hit points after the blow, in team order. */
  teamHp: number[];
}

export interface CombatResult {
  victory: boolean;
  blows: CombatBlow[];
  turns: number;
  /** The enemy as it started, with `hp` holding what was left of it. */
  enemy: CombatSide;
  /** Team hit points after the fight, same order as the team. */
  teamHp: number[];
  /** Ceilings used during the fight, so the client can draw bars without the bag. */
  teamMaxHp: number[];
  /** Attack values used, for the team panel. */
  teamAttack: number[];
}

export interface EnemyDefinition {
  id: string;
  name: string;
  /** Which node types may field this enemy. */
  tiers: RunNodeType[];
  hp: number;
  attack: number;
  /** Multiplies with run depth so later rows actually bite. */
  scaling?: number;
}
