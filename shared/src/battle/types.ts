import type { PokeType } from "../data/types-chart.js";

/**
 * A Pokémon battle, as data.
 *
 * The client renders this and sends back one action per turn. It never sends a
 * result — picking a move is a *choice*, exactly like picking a map node, so
 * the anti-cheat contract is unchanged: the server resolves the turn from the
 * stored state plus a seeded roll and hands back the new state.
 */

export interface BattleMove {
  id: string;
  pp: number;
  maxPp: number;
}

export interface Battler {
  /** PokemonUnit id for a team member; a generated id for a foe. */
  key: string;
  speciesId: string;
  name: string;
  /** National Pokédex number, so the real sprite loads. */
  dex: number;
  types: PokeType[];
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  moves: BattleMove[];
  /** Multipliers accumulated by status moves. Reset between battles, not turns. */
  attackStage: number;
  defenseStage: number;
}

export type BattleEventKind =
  | "send"
  | "move"
  | "damage"
  | "miss"
  | "heal"
  | "buff"
  | "effectiveness"
  | "faint"
  | "info";

/**
 * One beat of the turn, in the order it happened.
 *
 * Every entry carries the hit points that follow it, so the client can animate
 * a bar straight from the log without recomputing anything — the same trick the
 * old auto-battler used, kept because it worked.
 */
export interface BattleEvent {
  kind: BattleEventKind;
  /** Who the beat is about. */
  side: "team" | "foe";
  text: string;
  /** Damage dealt, points healed, or the multiplier for a buff. */
  amount?: number;
  /** Type effectiveness of the blow, when this beat is a hit. */
  multiplier?: number;
  activeHp: number;
  foeHp: number;
}

export type BattleAction =
  | { kind: "move"; moveId: string }
  | { kind: "switch"; memberKey: string };

export interface BattleState {
  /** The run team, in the order it was recruited. */
  team: Battler[];
  activeIndex: number;
  /** One to three foes, fought in order. */
  foes: Battler[];
  foeIndex: number;
  turn: number;
  /** The most recent turn's beats. Replaced every turn, never appended forever. */
  log: BattleEvent[];
  status: "active" | "won" | "lost";
  /** The active member fainted: the player must send someone else out. */
  awaitingSwitch: boolean;
  /** Label for the encounter, shown above the arena. */
  title: string;
  /** Bosses get the full-screen treatment. */
  boss: boolean;
}
