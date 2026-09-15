import { resolveBattleTurn } from "../battle/engine.js";
import { makeBattler } from "../battle/stats.js";
import type { BattleAction, BattleState, Battler } from "../battle/types.js";
import { RUN_EVENTS } from "../data/events.js";
import { RELICS, RELIC_IDS } from "../data/relics.js";
import { REWARD_TEMPLATES, type RewardTemplate } from "../data/rewards.js";
import { RUN_CONFIG } from "../data/run-config.js";
import { FIRST_STAGE, STAGE_BY_ID, type StageDefinition } from "../data/stages.js";
import { EffectBag } from "../traits/effects.js";
import { resolveSynergies, synergyEffects } from "../traits/engine.js";
import type { SynergyState } from "../traits/types.js";
import { starTierForCount } from "../game-logic.js";
import type { ResourceType } from "../types.js";
import { generateRunMap, reachableFrom } from "./map.js";
import { makeRng, pick, pickWeighted, shuffle, subSeed } from "./rng.js";
import type {
  LootBag,
  PendingChoice,
  RunChoiceOption,
  RunMap,
  RunNode,
  RunNodeType,
  RunState,
  RunTeamMember,
} from "./types.js";

/**
 * The run state machine.
 *
 * Every function here is pure: state in, new state out. The server owns the
 * only real copy and replays these same functions; the client may run them too,
 * but only to render ahead of the response. The client never sends an outcome,
 * only a choice — a node id or an option id — which is what keeps a fabricated
 * victory from being worth anything.
 */

/* --- Loot ----------------------------------------------------------------- */

export function emptyLoot(): LootBag {
  return { resources: {}, eggs: 0 };
}

export function mergeLoot(a: LootBag, b: LootBag): LootBag {
  const resources: Partial<Record<ResourceType, number>> = { ...a.resources };
  for (const [resource, amount] of Object.entries(b.resources) as [ResourceType, number][]) {
    resources[resource] = (resources[resource] ?? 0) + amount;
  }
  return { resources, eggs: a.eggs + b.eggs };
}

export function scaleLoot(bag: LootBag, factor: number): LootBag {
  const resources: Partial<Record<ResourceType, number>> = {};
  for (const [resource, amount] of Object.entries(bag.resources) as [ResourceType, number][]) {
    const scaled = Math.floor(amount * factor);
    if (scaled > 0) resources[resource] = scaled;
  }
  return { resources, eggs: Math.floor(bag.eggs * factor) };
}

export function lootIsEmpty(bag: LootBag): boolean {
  return bag.eggs === 0 && Object.values(bag.resources).every((amount) => !amount);
}

/* --- Derived state -------------------------------------------------------- */

export function runStage(state: RunState): StageDefinition {
  return STAGE_BY_ID[state.stageId] ?? STAGE_BY_ID[FIRST_STAGE];
}

export function runMap(state: RunState): RunMap {
  return generateRunMap(state.seed, runStage(state).rows);
}

export function availableNodes(state: RunState): RunNode[] {
  // A fight in progress blocks the map as firmly as a pending choice does.
  if (state.status !== "active" || state.pending.length > 0 || state.battle) return [];
  return reachableFrom(runMap(state), state.currentNodeId);
}

export function runSynergies(state: RunState): SynergyState[] {
  return resolveSynergies(state.team);
}

/** Team synergies plus every relic picked up so far, in one bag. */
export function runEffectBag(state: RunState): EffectBag {
  const bag = new EffectBag().addAll(synergyEffects(runSynergies(state)));
  for (const relicId of state.relics) {
    const relic = RELICS[relicId];
    if (relic) bag.addAll(relic.effects);
  }
  return bag;
}

export function runDepth(state: RunState): number {
  return state.path.length;
}

/* --- Start ---------------------------------------------------------------- */

export interface RunRecruit {
  unitId: string;
  speciesId: string;
  /** The Pokémon's own level — bought with resources, not earned in battle. */
  level: number;
  /** The four it carries. Anything illegal is dropped, never rejected. */
  moves?: string[];
  shiny?: boolean;
}

/**
 * Re-applies the effect bag to every member from their *base* stats.
 *
 * Recomputing from the live values would compound: a +25 PV relic would add 25
 * again on the next pickup. Anything newly gained above the old ceiling is also
 * handed over as real hit points here, once, so a "+PV" relic does something on
 * the turn you take it rather than only raising a number.
 */
export function refreshTeamStats(team: readonly RunTeamMember[], bag: EffectBag): RunTeamMember[] {
  return team.map((member) => {
    const maxHp = Math.max(1, Math.round(bag.apply(member.baseMaxHp, "combat_hp")));
    const attack = Math.max(1, Math.round(bag.apply(member.baseAttack, "combat_attack")));
    const gained = Math.max(0, maxHp - member.maxHp);

    return {
      ...member,
      maxHp,
      attack,
      hp: member.hp > 0 ? Math.min(maxHp, member.hp + gained) : 0,
    };
  });
}

export function startRun(
  seed: number,
  recruits: readonly RunRecruit[],
  stageId: string = FIRST_STAGE
): RunState {
  const stage = STAGE_BY_ID[stageId];
  if (!stage) throw new Error("Cette expédition n'existe pas");

  const team: RunTeamMember[] = recruits.slice(0, RUN_CONFIG.teamSize).map((recruit) => {
    // The Pokémon walks in at the level the player paid for. The stage's own
    // level is a *recommendation* shown on the selection screen, not a cap —
    // taking an under-levelled team into stage 8 is allowed, and it hurts.
    const battler = makeBattler({
      key: recruit.unitId,
      id: recruit.speciesId,
      level: recruit.level,
      moves: recruit.moves,
      shiny: recruit.shiny,
    });
    return {
      ...battler,
      extraTraits: [] as string[],
      baseMaxHp: battler.maxHp,
      baseAttack: battler.attack,
    };
  });

  const state: RunState = {
    seed,
    stageId,
    status: "active",
    path: [],
    currentNodeId: null,
    team,
    relics: [],
    secured: emptyLoot(),
    carried: emptyLoot(),
    pending: [],
    step: 0,
    battle: null,
  };

  // Synergies are live from the first step, not from the first relic.
  return { ...state, team: refreshTeamStats(state.team, runEffectBag(state)) };
}

/* --- Rewards -------------------------------------------------------------- */

function lootFromTemplate(template: RewardTemplate, bag: EffectBag): LootBag {
  const resources: Partial<Record<ResourceType, number>> = {};
  for (const [resource, amount] of Object.entries(template.resources ?? {}) as [ResourceType, number][]) {
    resources[resource] = Math.max(1, Math.floor(amount * bag.multiplier("run_loot", resource)));
  }
  return { resources, eggs: Math.floor((template.eggs ?? 0) * bag.multiplier("run_loot", "egg")) };
}

function rewardOption(template: RewardTemplate, bag: EffectBag, rng: () => number): RunChoiceOption {
  if (template.relic) {
    const relicId = pick(shuffle(RELIC_IDS, rng), rng);
    const relic = RELICS[relicId];
    return {
      id: `relic:${relicId}`,
      label: relic?.name ?? template.label,
      description: relic?.description ?? template.description,
      grantRelic: relicId,
    };
  }
  if (template.healPercent) {
    return {
      id: `heal:${template.id}`,
      label: template.label,
      description: template.description,
      healPercent: template.healPercent,
    };
  }
  const loot = lootFromTemplate(template, bag);
  const parts = [
    ...Object.entries(loot.resources).map(([resource, amount]) => `${amount} ${resource}`),
    ...(loot.eggs > 0 ? [`${loot.eggs} œuf`] : []),
  ];
  return {
    id: `loot:${template.id}`,
    label: template.label,
    description: parts.length > 0 ? parts.join(" · ") : template.description,
    grantLoot: loot,
  };
}

/**
 * Luck does not add loot, it tilts the roll toward the rarer half of the table.
 * A player stacking Chanceux sees relics and eggs more often, not bigger piles
 * of berries.
 */
function rollRewardChoice(
  state: RunState,
  bag: EffectBag,
  seed: number,
  title = "Victoire"
): PendingChoice {
  const rng = makeRng(seed);
  const luck = bag.flat("run_luck");
  const pool = [...REWARD_TEMPLATES];
  const options: RunChoiceOption[] = [];

  for (let i = 0; i < RUN_CONFIG.rewardOptions && pool.length > 0; i++) {
    const template = pickWeighted(pool, (t) => t.weight * (1 + luck * t.rarity * 4), rng);
    pool.splice(pool.indexOf(template), 1);
    options.push(rewardOption(template, bag, rng));
  }

  return { kind: "reward", title, prompt: "Choisis ta récompense.", options };
}

function rollEventChoice(seed: number): PendingChoice {
  const event = pick(RUN_EVENTS, makeRng(seed));
  return { kind: "event", title: event.title, prompt: event.prompt, options: event.options };
}

function rollShopChoice(bag: EffectBag, seed: number): PendingChoice {
  const rng = makeRng(seed);
  const offered = shuffle(RELIC_IDS, rng).slice(0, RUN_CONFIG.rewardOptions);
  return {
    kind: "shop",
    title: "Échoppe",
    prompt: "Une relique contre une part du butin non sécurisé.",
    options: [
      ...offered.map((relicId) => ({
        id: `buy:${relicId}`,
        label: RELICS[relicId].name,
        description: `${RELICS[relicId].description} — coûte 25 % du butin en cours.`,
        grantRelic: relicId,
      })),
      { id: "leave", label: "Ne rien acheter", description: "Repartir les mains vides." },
    ],
  };
}

function secureChoice(state: RunState): PendingChoice {
  const kept = Math.round(RUN_CONFIG.secureKeepRatio * 100);
  return {
    kind: "secure",
    title: "Faire le point",
    prompt: "Le butin en cours est perdu en cas de défaite.",
    options: [
      {
        id: "extract",
        label: "Rentrer au Refuge",
        description: "La run s'arrête ici. Tu gardes absolument tout.",
        secure: true,
      },
      {
        id: "bank",
        label: `Sécuriser ${kept} %`,
        description: `Met ${kept} % du butin en cours à l'abri, puis continue.`,
      },
      {
        id: "push",
        label: "Continuer",
        description: "Rien n'est mis à l'abri. Tout reste en jeu.",
        continueRun: true,
      },
    ],
  };
}

/* --- Node resolution ------------------------------------------------------ */


function finish(state: RunState, status: "won" | "lost" | "abandoned", message: string): RunState {
  const awarded =
    status === "lost"
      ? mergeLoot(state.secured, scaleLoot(state.carried, RUN_CONFIG.defeatKeepRatio))
      : mergeLoot(state.secured, state.carried);

  return {
    ...state,
    status,
    pending: [],
    outcome: { status, awarded, depth: runDepth(state), message },
  };
}

export function enterNode(state: RunState, nodeId: string): RunState {
  if (state.status !== "active") throw new Error("Cette expédition est terminée");
  if (state.pending.length > 0) throw new Error("Un choix est encore en attente");
  // Without this, a client could walk away from a fight it was losing — the
  // map being empty in the UI is a courtesy, not a rule.
  if (state.battle) throw new Error("Termine le combat avant de repartir");

  const legal = reachableFrom(runMap(state), state.currentNodeId);
  if (!legal.some((node) => node.id === nodeId)) {
    throw new Error("Ce lieu n'est pas accessible depuis ta position");
  }

  const node = runMap(state).byId[nodeId];
  const step = state.step + 1;
  const seed = subSeed(state.seed, step, node.row, node.col);
  const bag = runEffectBag(state);

  let next: RunState = {
    ...state,
    step,
    currentNodeId: nodeId,
    path: [...state.path, nodeId],
  };

  switch (node.type) {
    // A fight no longer resolves here. It *opens* here: the player now owes the
    // server one action per turn, and the node is only finished when the last
    // foe falls.
    case "combat":
    case "elite":
    case "boss":
      return { ...next, battle: openBattle(next, node, subSeed(seed, 1)) };

    case "reward":
      // Not a victory — nobody fought. Calling it one made a treasure chest read
      // as the end of a battle that never happened.
      next = { ...next, pending: [rollRewardChoice(next, bag, subSeed(seed, 3), "Trésor")] };
      break;

    case "event":
      next = { ...next, pending: [rollEventChoice(subSeed(seed, 4))] };
      break;

    case "shop":
      next = { ...next, pending: [rollShopChoice(bag, subSeed(seed, 5))] };
      break;

    case "rest":
      next = healTeam(next, RUN_CONFIG.restHealRatio);
      break;
  }

  return afterNode(next, node.type);
}

/** Queues the "bank or push on" decision the config asks for after this node. */
function afterNode(state: RunState, type: RunNodeType): RunState {
  if (!RUN_CONFIG.secureAfter.includes(type)) return state;
  return { ...state, pending: [...state.pending, secureChoice(state)] };
}

function healTeam(state: RunState, ratio: number): RunState {
  return {
    ...state,
    team: state.team.map((member) =>
      member.hp > 0
        ? { ...member, hp: Math.min(member.maxHp, member.hp + Math.round(member.maxHp * ratio)) }
        : member
    ),
  };
}

/* --- Battles -------------------------------------------------------------- */

/** Who you meet on this node, and at what level. */
function rollFoes(state: RunState, node: RunNode, seed: number): Battler[] {
  const stage = runStage(state);
  const rng = makeRng(seed);

  if (node.type === "boss") {
    return [makeBattler({ key: `boss-${stage.boss}`, id: stage.boss, level: stage.bossLevel })];
  }

  const elite = node.type === "elite";
  const level =
    stage.level + node.row * RUN_CONFIG.depthLevels + (elite ? RUN_CONFIG.eliteLevelBonus : 0);
  // A plain fight fields one fewer than the stage's headline count; the elite is
  // what actually shows you all of them.
  const count = Math.max(1, elite ? stage.foes : stage.foes - 1);

  return Array.from({ length: count }, (_, i) => {
    const id = pick(stage.wild, rng);
    return makeBattler({
      key: `foe-${node.id}-${i}`,
      id,
      level,
      scale: elite ? RUN_CONFIG.eliteScale : 1,
    });
  });
}

function openBattle(state: RunState, node: RunNode, seed: number): BattleState {
  const foes = rollFoes(state, node, seed);
  const activeIndex = state.team.findIndex((member) => member.hp > 0);
  const boss = node.type === "boss";

  return {
    team: state.team,
    activeIndex: Math.max(0, activeIndex),
    foes,
    foeIndex: 0,
    turn: 1,
    log: [
      {
        kind: "send",
        side: "foe",
        text: boss
          ? `${foes[0].name} bloque le passage !`
          : foes.length > 1
            ? `${foes.length} Pokémon sauvages surgissent !`
            : `Un ${foes[0].name} sauvage apparaît !`,
        activeHp: state.team[Math.max(0, activeIndex)]?.hp ?? 0,
        foeHp: foes[0].hp,
      },
    ],
    status: "active",
    awaitingSwitch: false,
    title: boss ? `Boss — ${foes[0].name}` : node.type === "elite" ? "Rencontre d'élite" : "Combat",
    boss,
  };
}

/**
 * One turn of the current fight.
 *
 * The battle owns the team while it runs, so its outcome is written back onto
 * the run here — hit points survive from one node to the next, which is what
 * makes pushing deeper a real decision.
 */
export function playBattleTurn(state: RunState, action: BattleAction): RunState {
  if (state.status !== "active") throw new Error("Cette expédition est terminée");
  if (!state.battle) throw new Error("Aucun combat en cours");

  const battle = resolveBattleTurn(state.battle, action, subSeed(state.seed, state.step, battleTurnSalt));
  const team = state.team.map((member) => {
    const fought = battle.team.find((b) => b.key === member.key);
    return fought ? { ...member, ...fought, extraTraits: member.extraTraits } : member;
  });

  const next: RunState = { ...state, team, battle };
  if (battle.status === "active") return next;

  const node = runMap(state).byId[state.currentNodeId ?? ""];
  const seed = subSeed(state.seed, state.step, 7);

  if (battle.status === "lost") {
    const winner = battle.foes[battle.foeIndex] ?? battle.foes[battle.foes.length - 1];
    return finish({ ...next, battle: null }, "lost", `${winner.name} a eu raison de l'équipe.`);
  }

  if (node?.type === "boss") {
    return finish({ ...next, battle: null }, "won", `${battle.foes[0].name} est vaincu. L'expédition est un succès.`);
  }

  const bag = runEffectBag(next);
  const rewarded: RunState = {
    ...next,
    battle: null,
    pending: [rollRewardChoice(next, bag, subSeed(seed, 3))],
  };

  return afterNode(rewarded, node?.type ?? "combat");
}

/** Salt keeping battle rolls out of the node-resolution seed space. */
const battleTurnSalt = 0x42_54_4c_00;

/* --- Choice resolution ---/* --- Choice resolution ---------------------------------------------------- */

function applyOption(state: RunState, option: RunChoiceOption): RunState {
  let next = { ...state };

  if (option.grantLoot) next = { ...next, carried: mergeLoot(next.carried, option.grantLoot) };

  if (option.grantRelic && RELICS[option.grantRelic]) {
    const relic = RELICS[option.grantRelic];
    next = { ...next, relics: [...next.relics, relic.id] };
    if (relic.grantsTraits?.length) {
      next = {
        ...next,
        team: next.team.map((member) => ({
          ...member,
          extraTraits: [...new Set([...member.extraTraits, ...relic.grantsTraits!])],
        })),
      };
    }
  }

  if (option.grantTraits?.length) {
    next = {
      ...next,
      team: next.team.map((member) => ({
        ...member,
        extraTraits: [...new Set([...member.extraTraits, ...option.grantTraits!])],
      })),
    };
  }

  // Anything that raised the hit-point ceiling hands the difference over as
  // real hit points, once, here. Raising only the ceiling would make a "+25 PV"
  // relic do nothing on the turn you pick it up, and re-deriving from the live
  // stats instead of the base ones would compound it at every pickup.
  next = { ...next, team: refreshTeamStats(next.team, runEffectBag(next)) };

  if (option.healPercent) {
    next = healTeam(next, option.healPercent);
  }

  if (option.damagePercent) {
    next = {
      ...next,
      team: next.team.map((member) => ({
        ...member,
        hp: Math.max(0, member.hp - Math.round(member.maxHp * option.damagePercent!)),
      })),
    };
  }

  return next;
}

export function resolveChoice(state: RunState, optionId: string): RunState {
  if (state.status !== "active") throw new Error("Cette expédition est terminée");
  const choice = state.pending[0];
  if (!choice) throw new Error("Aucun choix en attente");

  const option = choice.options.find((candidate) => candidate.id === optionId);
  if (!option) throw new Error("Ce choix n'est pas proposé");

  let next: RunState = { ...state, pending: state.pending.slice(1) };

  // Extracting ends the run with everything intact — the safe half of the
  // risk/reward pair, and the only way to keep carried loot for certain.
  if (choice.kind === "secure" && option.secure) {
    return finish(next, "won", "Retour au Refuge, butin en main.");
  }

  if (choice.kind === "secure" && option.id === "bank") {
    const banked = scaleLoot(next.carried, RUN_CONFIG.secureKeepRatio);
    return { ...next, secured: mergeLoot(next.secured, banked), carried: emptyLoot() };
  }

  if (choice.kind === "shop" && option.grantRelic) {
    next = { ...next, carried: scaleLoot(next.carried, 0.75) };
  }

  next = applyOption(next, option);

  // An event that hurt the team can end the run on the spot.
  if (next.team.every((member) => member.hp <= 0)) {
    return finish(next, "lost", "L'équipe est hors de combat.");
  }

  return next;
}

export function abandonRun(state: RunState): RunState {
  if (state.status !== "active") return state;
  return finish(state, "abandoned", "Expédition abandonnée.");
}
