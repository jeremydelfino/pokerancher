import { BATTLE_CONFIG } from "../data/battle-config.js";
import { MOVES, STRUGGLE_MOVE, type MoveDefinition } from "../data/moves.js";
import { effectiveness, effectivenessLabel } from "../data/types-chart.js";
import { makeRng, subSeed } from "../rng.js";
import { effectiveAttack, effectiveDefense } from "./stats.js";
import type { BattleAction, BattleEvent, BattleState, Battler } from "./types.js";

/**
 * One turn of a Pokémon battle.
 *
 * Pure: state in, new state out, with a seed for every roll. The server owns the
 * only real copy and calls this; the client may call it too, but only to render
 * ahead of the response. The player sends a *choice* — which move, which
 * replacement — and never a result.
 *
 * Order of business each turn:
 *   1. the player's action and the foe's are picked
 *   2. a switch resolves first and forfeits the attack
 *   3. otherwise both attack, ordered by move priority then speed
 *   4. faints are handled between blows, never after both have swung
 */

const active = (state: BattleState): Battler => state.team[state.activeIndex];
const foe = (state: BattleState): Battler => state.foes[state.foeIndex];

function clone(state: BattleState): BattleState {
  return {
    ...state,
    team: state.team.map((b) => ({ ...b, moves: b.moves.map((m) => ({ ...m })) })),
    foes: state.foes.map((b) => ({ ...b, moves: b.moves.map((m) => ({ ...m })) })),
    log: [],
  };
}

function push(state: BattleState, event: Omit<BattleEvent, "activeHp" | "foeHp">) {
  state.log.push({
    ...event,
    activeHp: Math.max(0, active(state)?.hp ?? 0),
    foeHp: Math.max(0, foe(state)?.hp ?? 0),
  });
}

/* --- Damage --------------------------------------------------------------- */

export function damageOf(
  attacker: Battler,
  defender: Battler,
  move: MoveDefinition,
  rng: () => number
): { damage: number; multiplier: number } {
  const multiplier = effectiveness(move.type, defender.types);
  if (move.power <= 0 || multiplier === 0) return { damage: 0, multiplier };

  const { stab, rollMin, rollMax, minDamage } = BATTLE_CONFIG;
  const sameType = attacker.types.includes(move.type) ? stab : 1;
  const roll = rollMin + rng() * (rollMax - rollMin);

  // The classic shape: level and power up top, the defender's guard below.
  const base =
    ((2 * attacker.level) / 5 + 2) *
      move.power *
      (effectiveAttack(attacker) / effectiveDefense(defender)) /
      50 +
    2;

  return {
    damage: Math.max(minDamage, Math.round(base * multiplier * sameType * roll)),
    multiplier,
  };
}

/* --- One attack ----------------------------------------------------------- */

function moveFor(battler: Battler, moveId: string): MoveDefinition {
  const slot = battler.moves.find((m) => m.id === moveId);
  if (!slot || slot.pp <= 0) return MOVES[STRUGGLE_MOVE];
  return MOVES[moveId] ?? MOVES[STRUGGLE_MOVE];
}

function spend(battler: Battler, moveId: string) {
  const slot = battler.moves.find((m) => m.id === moveId);
  if (slot && slot.pp > 0) slot.pp -= 1;
}

/**
 * Applies a move's rider.
 *
 * `damageDealt` is what makes a drain move a drain move: on an attack, `heal`
 * is a fraction of the damage you just did, not of your own maximum. Reading it
 * as a fraction of max hit points let a level-60 Chenipan heal 60 with a hit
 * that dealt 21 — a fight that literally could not end.
 */
function applyStatus(
  state: BattleState,
  user: Battler,
  target: Battler,
  move: MoveDefinition,
  side: "team" | "foe",
  damageDealt = 0
) {
  const effect = move.effect;
  if (!effect) return;

  const { maxBuff, minDebuff } = BATTLE_CONFIG;

  switch (effect.kind) {
    case "heal": {
      const pool = move.power > 0 ? damageDealt : user.maxHp;
      const healed = Math.min(user.maxHp - user.hp, Math.round(pool * effect.value));
      if (healed <= 0) break;
      user.hp += healed;
      push(state, { kind: "heal", side, text: `${user.name} récupère ${healed} PV.`, amount: healed });
      break;
    }
    case "buff_attack":
      user.attackStage = Math.min(maxBuff, user.attackStage * effect.value);
      push(state, { kind: "buff", side, text: `L'Attaque de ${user.name} augmente !`, amount: effect.value });
      break;
    case "buff_defense":
      user.defenseStage = Math.min(maxBuff, user.defenseStage * effect.value);
      push(state, { kind: "buff", side, text: `La Défense de ${user.name} augmente !`, amount: effect.value });
      break;
    case "debuff_attack":
      target.attackStage = Math.max(minDebuff, target.attackStage * effect.value);
      push(state, { kind: "buff", side, text: `L'Attaque de ${target.name} baisse !`, amount: effect.value });
      break;
    case "debuff_defense":
      target.defenseStage = Math.max(minDebuff, target.defenseStage * effect.value);
      push(state, { kind: "buff", side, text: `La Défense de ${target.name} baisse !`, amount: effect.value });
      break;
  }
}

/** Returns true when the defender fainted. */
function attack(
  state: BattleState,
  side: "team" | "foe",
  moveId: string,
  rng: () => number
): boolean {
  const attacker = side === "team" ? active(state) : foe(state);
  const defender = side === "team" ? foe(state) : active(state);
  const move = moveFor(attacker, moveId);

  spend(attacker, move.id);
  push(state, { kind: "move", side, text: `${attacker.name} utilise ${move.name} !` });

  if (rng() > move.accuracy) {
    push(state, { kind: "miss", side, text: `${attacker.name} rate son attaque…` });
    return false;
  }

  if (move.category === "statut") {
    applyStatus(state, attacker, defender, move, side);
    return false;
  }

  const { damage, multiplier } = damageOf(attacker, defender, move, rng);
  defender.hp = Math.max(0, defender.hp - damage);

  push(state, {
    kind: "damage",
    side,
    text: `${defender.name} perd ${damage} PV.`,
    amount: damage,
    multiplier,
  });

  const note = effectivenessLabel(multiplier);
  if (note) push(state, { kind: "effectiveness", side, text: note, multiplier });

  // A damaging move can carry a rider — Close Combat's own guard drop, or the
  // life a drain move takes back out of the damage it just dealt.
  if (move.effect) applyStatus(state, attacker, defender, move, side, damage);

  if (defender.hp <= 0) {
    push(state, { kind: "faint", side: side === "team" ? "foe" : "team", text: `${defender.name} est K.O. !` });
    return true;
  }
  return false;
}

/* --- Foe brain ------------------------------------------------------------ */

/**
 * The foe's pick.
 *
 * Not random: it weighs each move by what it would actually do, so a Rattata
 * facing a Steelix reaches for the move that works instead of spamming Charge.
 * Deliberately shallow — it reads one turn ahead, never two.
 */
export function chooseFoeMove(state: BattleState, rng: () => number): string {
  const attacker = foe(state);
  const defender = active(state);
  const usable = attacker.moves.filter((slot) => slot.pp > 0);
  if (usable.length === 0) return STRUGGLE_MOVE;

  const scored = usable.map((slot) => {
    const move = MOVES[slot.id];
    if (!move) return { id: slot.id, weight: 1 };

    if (move.category === "statut") {
      // Healing is worth reaching for only when it would not be wasted.
      const hurt = 1 - attacker.hp / attacker.maxHp;
      const worth = move.effect?.kind === "heal" ? hurt * 3 : 0.6;
      return { id: slot.id, weight: Math.max(0.15, worth) };
    }

    const multiplier = effectiveness(move.type, defender.types);
    const sameType = attacker.types.includes(move.type) ? BATTLE_CONFIG.stab : 1;
    return { id: slot.id, weight: Math.max(0.1, move.power * multiplier * sameType * move.accuracy) };
  });

  const total = scored.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of scored) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return scored[scored.length - 1].id;
}

/* --- Turn ----------------------------------------------------------------- */

function sendNextFoe(state: BattleState) {
  state.foeIndex += 1;
  if (state.foeIndex >= state.foes.length) {
    state.status = "won";
    return;
  }
  push(state, { kind: "send", side: "foe", text: `${foe(state).name} entre en scène !` });
}

function afterActiveFaints(state: BattleState) {
  const standing = state.team.some((member) => member.hp > 0);
  if (!standing) {
    state.status = "lost";
    return;
  }
  state.awaitingSwitch = true;
}

export function battleIsOver(state: BattleState): boolean {
  return state.status !== "active";
}

/** Team members that can still be sent out. */
export function availableSwitches(state: BattleState): Battler[] {
  return state.team.filter((member, index) => member.hp > 0 && index !== state.activeIndex);
}

export function resolveBattleTurn(
  previous: BattleState,
  action: BattleAction,
  seed: number
): BattleState {
  if (previous.status !== "active") throw new Error("Ce combat est terminé");

  const state = clone(previous);
  const rng = makeRng(subSeed(seed, state.turn));

  /* --- A forced replacement is not a turn: nobody attacks. --------------- */
  if (state.awaitingSwitch) {
    if (action.kind !== "switch") throw new Error("Choisis un Pokémon pour continuer");
    const index = state.team.findIndex((m) => m.key === action.memberKey);
    if (index < 0 || state.team[index].hp <= 0) throw new Error("Ce Pokémon ne peut pas combattre");

    state.activeIndex = index;
    state.awaitingSwitch = false;
    push(state, { kind: "send", side: "team", text: `${active(state).name}, go !` });
    return state;
  }

  const foeMoveId = chooseFoeMove(state, rng);

  /* --- A voluntary switch costs the turn. -------------------------------- */
  if (action.kind === "switch") {
    const index = state.team.findIndex((m) => m.key === action.memberKey);
    if (index < 0 || state.team[index].hp <= 0 || index === state.activeIndex) {
      throw new Error("Ce Pokémon ne peut pas entrer");
    }
    state.activeIndex = index;
    push(state, { kind: "send", side: "team", text: `${active(state).name}, go !` });

    if (attack(state, "foe", foeMoveId, rng)) afterActiveFaints(state);
    state.turn += 1;
    return state;
  }

  /* --- Both attack, fastest first. --------------------------------------- */
  const playerMove = moveFor(active(state), action.moveId);
  const foeMove = MOVES[foeMoveId] ?? MOVES[STRUGGLE_MOVE];

  const playerPriority = playerMove.priority ?? 0;
  const foePriority = foeMove.priority ?? 0;
  const teamFirst =
    playerPriority !== foePriority
      ? playerPriority > foePriority
      : active(state).speed !== foe(state).speed
        ? active(state).speed > foe(state).speed
        : rng() < 0.5;

  const order: ("team" | "foe")[] = teamFirst ? ["team", "foe"] : ["foe", "team"];

  for (const side of order) {
    if (state.status !== "active" || state.awaitingSwitch) break;
    const moveId = side === "team" ? action.moveId : foeMoveId;
    const fainted = attack(state, side, moveId, rng);
    if (!fainted) continue;

    if (side === "team") sendNextFoe(state);
    else afterActiveFaints(state);
  }

  state.turn += 1;
  return state;
}
