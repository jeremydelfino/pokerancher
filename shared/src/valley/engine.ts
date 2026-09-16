import { battleIsOver, resolveBattleTurn } from "../battle/engine.js";
import { makeBattler } from "../battle/stats.js";
import type { BattleAction, BattleEvent, BattleState } from "../battle/types.js";
import { VALLEY_CONFIG } from "../data/valley-config.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import { activeMoves } from "../progression.js";
import { makeRng, subSeed } from "../rng.js";
import { teamEffectBag } from "../traits/engine.js";
import type { ResourceType } from "../types.js";
import { captureOdds, playerMaxLevel } from "./capture.js";
import { generateFeatures } from "./chunk.js";
import { rollEncounter, shouldEncounter, timeOfDay } from "./encounters.js";
import type {
  CaughtPokemon,
  Feature,
  ValleyLoot,
  ValleyState,
  Vec2,
} from "./types.js";
import { ENCOUNTER_TERRAIN, SOLID_TERRAIN } from "./types.js";
import { biomeAt, chunkKey, chunkOf, distanceFromRanch, sampleWorld } from "./world.js";

/**
 * PokeValley, as a state machine.
 *
 * Same contract as the expedition engine: pure functions, state in and state
 * out, every roll seeded off the run seed plus a step counter. The client sends
 * *intents* — one step, one harvest, one move, one throw — and never a result.
 * The server replays the same functions and keeps the answer.
 *
 * The world itself is not in the state. Position, what you are carrying and
 * what you have taken are; everything spatial regenerates from the seed, which
 * is why an endless world fits in a database row.
 */

export interface ValleyRecruit {
  unitId: string;
  speciesId: string;
  level: number;
  moves: string[];
  shiny: boolean;
}

const emptyLoot = (): ValleyLoot => ({ resources: {}, pokeballs: 0 });

/** A seed the player can read out loud and a friend can type back in. */
export function seedCode(seed: number): string {
  const hex = (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `POKE-${hex.slice(0, 4)}-${hex.slice(4)}`;
}

/** The inverse, tolerant of spacing and case. Returns null on nonsense. */
export function parseSeedCode(code: string): number | null {
  const clean = code.trim().toUpperCase().replace(/^POKE-?/, "").replace(/-/g, "");
  if (!/^[0-9A-F]{1,8}$/.test(clean)) return null;
  return parseInt(clean, 16) >>> 0;
}

export function startValley(seed: number, recruits: readonly ValleyRecruit[]): ValleyState {
  const team = recruits.slice(0, VALLEY_CONFIG.start.teamSize).map((recruit) => {
    const battler = makeBattler({
      key: recruit.unitId,
      id: recruit.speciesId,
      level: recruit.level,
      moves: recruit.moves.length > 0 ? recruit.moves : activeMoves(recruit.speciesId, recruit.level),
      shiny: recruit.shiny,
    });
    return { ...battler, extraTraits: [] as string[], baseMaxHp: battler.maxHp, baseAttack: battler.attack };
  });

  return {
    seed,
    code: seedCode(seed),
    status: "active",
    at: { x: 0, y: 0 },
    steps: 0,
    bestDistance: 0,
    team,
    carried: { resources: {}, pokeballs: VALLEY_CONFIG.start.pokeballs },
    secured: emptyLoot(),
    caught: [],
    taken: [],
    seen: [chunkKey(0, 0)],
    relics: [],
    battle: null,
    wild: null,
  };
}

/* --- Walking -------------------------------------------------------------- */

export interface StepResult {
  state: ValleyState;
  /** Something worth telling the player about, already in French. */
  log: string[];
}

/**
 * Steps since the last battle ended — the gate that keeps exploration walkable.
 *
 * Starts "already elapsed" so the very first encounter is not held back by a
 * cooldown that never ran.
 */
function stepsSinceBattle(state: ValleyState): number {
  return state.steps - (state.lastBattleStep ?? -VALLEY_CONFIG.encounter.cooldownSteps);
}

export function canWalk(seed: number, to: Vec2): boolean {
  const { terrain } = sampleWorld(seed, to.x, to.y);
  return !SOLID_TERRAIN.includes(terrain);
}

/**
 * One tile, in one of the four directions.
 *
 * Deliberately a single tile per call: it is the unit the server can check. A
 * client that wants smooth movement animates between two of these, and a client
 * that lies about where it is gets caught by the adjacency check.
 */
export function step(state: ValleyState, direction: Vec2): StepResult {
  const log: string[] = [];
  if (state.status !== "active") return { state, log };
  if (state.battle) return { state, log: ["Termine d'abord ce combat."] };

  // One axis at a time keeps the adjacency rule trivial for the server to
  // verify. A diagonal input resolves to whichever axis the player pushed
  // hardest, so a joystick feels right without the protocol allowing a
  // two-tile hop.
  const horizontal = Math.abs(direction.x) >= Math.abs(direction.y);
  const dx = horizontal ? Math.sign(direction.x) : 0;
  const dy = horizontal ? 0 : Math.sign(direction.y);
  if (dx === 0 && dy === 0) return { state, log };
  const to = { x: state.at.x + dx, y: state.at.y + dy };

  if (!canWalk(state.seed, to)) return { state, log: [] };

  const steps = state.steps + 1;
  const distance = distanceFromRanch(to);
  const key = chunkKey(chunkOf(to.x, to.y).cx, chunkOf(to.x, to.y).cy);

  let next: ValleyState = {
    ...state,
    at: to,
    steps,
    bestDistance: Math.max(state.bestDistance, distance),
    seen: state.seen.includes(key) ? state.seen : [...state.seen, key],
  };

  const { terrain, biome } = sampleWorld(state.seed, to.x, to.y);
  const inCover = ENCOUNTER_TERRAIN.includes(terrain);

  if (shouldEncounter(state.seed, steps, stepsSinceBattle(next), inCover)) {
    const wild = rollEncounter(state.seed, steps, biome, distance, timeOfDay(steps));
    if (wild) {
      next = openBattle(next, wild);
      const species = POKEMON_BY_ID[wild.speciesId];
      log.push(
        wild.alpha
          ? `Un ${species?.name ?? wild.speciesId} ALPHA surgit !`
          : `Un ${species?.name ?? wild.speciesId} sauvage apparaît !`
      );
      if (wild.shiny) log.push("Il brille d'un éclat inhabituel…");
    }
  }

  return { state: next, log };
}

/* --- Battle --------------------------------------------------------------- */

function openBattle(state: ValleyState, wild: ValleyState["wild"]): ValleyState {
  if (!wild) return state;

  const bag = teamEffectBag(state.team);
  const foe = makeBattler({
    key: `wild-${state.steps}`,
    id: wild.speciesId,
    level: wild.level,
    scale: wild.alpha ? VALLEY_CONFIG.alpha.statScale : 1,
    shiny: wild.shiny,
  });

  // The first Pokémon still standing leads.
  const activeIndex = Math.max(0, state.team.findIndex((member) => member.hp > 0));

  const species = POKEMON_BY_ID[wild.speciesId];
  const battle: BattleState = {
    team: state.team.map((member) => ({ ...member })),
    activeIndex,
    foes: [foe],
    foeIndex: 0,
    turn: 0,
    log: [],
    status: "active",
    awaitingSwitch: false,
    title: wild.alpha ? `${species?.name ?? "?"} ALPHA` : (species?.name ?? "Pokémon sauvage"),
    // An alpha earns the full-screen treatment a boss gets — it is the closest
    // thing PokeValley has to one.
    boss: wild.alpha,
  };

  void bag;
  return { ...state, battle, wild };
}

export interface TurnResult {
  state: ValleyState;
  events: BattleEvent[];
}

/** One battle turn. The action is a choice; the server resolves the outcome. */
export function battleTurn(state: ValleyState, action: BattleAction): TurnResult {
  if (!state.battle || state.status !== "active") return { state, events: [] };

  const battle = resolveBattleTurn(state.battle, action, subSeed(state.seed, 0xba77, state.steps));

  let next: ValleyState = { ...state, battle, team: syncTeam(state, battle) };

  if (battleIsOver(battle)) next = closeBattle(next, battle.status === "won");

  return { state: next, events: battle.log };
}

/** Carry hit points back out of the battle: the team is persistent across fights. */
function syncTeam(state: ValleyState, battle: BattleState): ValleyState["team"] {
  return state.team.map((member) => {
    const inBattle = battle.team.find((b) => b.key === member.key);
    return inBattle ? { ...member, hp: inBattle.hp, moves: inBattle.moves } : member;
  });
}

function closeBattle(state: ValleyState, won: boolean): ValleyState {
  const next: ValleyState = {
    ...state,
    battle: null,
    wild: null,
    lastBattleStep: state.steps,
  };

  if (!won && state.team.every((member) => member.hp <= 0)) return faint(next);
  return next;
}

/* --- Capture -------------------------------------------------------------- */

export interface CaptureResult {
  state: ValleyState;
  caught: boolean;
  chance: number;
  log: string[];
}

/**
 * Throwing a ball at the Pokémon currently in front of you.
 *
 * Costs a ball whatever happens — that is the whole reason Pokéballs are worth
 * looking for. A miss leaves the battle open so you can soften it further and
 * try again, which is the loop the mode is built around.
 */
export function throwBall(state: ValleyState, ballId?: string): CaptureResult {
  const log: string[] = [];
  if (!state.battle || !state.wild || state.status !== "active") {
    return { state, caught: false, chance: 0, log };
  }
  if (state.carried.pokeballs <= 0) {
    return { state, caught: false, chance: 0, log: ["Plus une seule Pokéball."] };
  }

  const foe = state.battle.foes[state.battle.foeIndex];
  const odds = captureOdds(state.wild, foe, playerMaxLevel(state.team), ballId);
  const rng = makeRng(subSeed(state.seed, 0xba11, state.steps, state.wild.attempts));
  const caught = rng() < odds.chance;

  const spent: ValleyState = {
    ...state,
    carried: { ...state.carried, pokeballs: state.carried.pokeballs - 1 },
    wild: { ...state.wild, attempts: state.wild.attempts + 1 },
  };

  const species = POKEMON_BY_ID[state.wild.speciesId];

  if (!caught) {
    log.push(`${species?.name ?? "Il"} s'échappe de la Pokéball !`);
    return { state: spent, caught: false, chance: odds.chance, log };
  }

  const trophy: CaughtPokemon = {
    speciesId: state.wild.speciesId,
    level: state.wild.level,
    shiny: state.wild.shiny,
    alpha: state.wild.alpha,
  };
  log.push(`${species?.name ?? "Le Pokémon"} est capturé !`);

  return {
    state: {
      ...spent,
      caught: [...spent.caught, trophy],
      battle: null,
      wild: null,
      lastBattleStep: spent.steps,
    },
    caught: true,
    chance: odds.chance,
    log,
  };
}

/** Walk away. The wild Pokémon keeps its ball-free life; you keep your time. */
export function flee(state: ValleyState): ValleyState {
  if (!state.battle) return state;
  return { ...state, battle: null, wild: null, lastBattleStep: state.steps };
}

/* --- The ground ----------------------------------------------------------- */

/**
 * The nearest thing worth picking up, within arm's reach.
 *
 * Reach rather than the exact tile, and that is a gameplay decision, not a
 * convenience: a first pass required standing on the precise tile and a 644-step
 * walk turned up one harvest, which is nowhere near enough to keep the Pokéball
 * economy running. You can see a plant a tile away — you should be able to take
 * it.
 *
 * A feature can sit in a neighbouring chunk, so the search covers the chunks the
 * reach touches rather than just the one underfoot.
 */
export const HARVEST_REACH = 1;

export function featureAt(state: ValleyState, at: Vec2 = state.at): Feature | null {
  const seen = new Set<string>();
  let best: Feature | null = null;
  let bestDistance = Infinity;

  for (let dy = -HARVEST_REACH; dy <= HARVEST_REACH; dy++) {
    for (let dx = -HARVEST_REACH; dx <= HARVEST_REACH; dx++) {
      const { cx, cy } = chunkOf(at.x + dx, at.y + dy);
      const key = `${cx},${cy}`;
      if (seen.has(key)) continue;
      seen.add(key);

      for (const feature of generateFeatures(state.seed, cx, cy)) {
        if (state.taken.includes(feature.id)) continue;
        const ox = Math.abs(feature.at.x - at.x);
        const oy = Math.abs(feature.at.y - at.y);
        if (ox > HARVEST_REACH || oy > HARVEST_REACH) continue;

        // Chebyshev, then a stable tie-break so two equidistant features always
        // resolve the same way on the client and on the server.
        const distance = Math.max(ox, oy);
        if (distance < bestDistance || (distance === bestDistance && best && feature.id < best.id)) {
          best = feature;
          bestDistance = distance;
        }
      }
    }
  }

  return best;
}

export interface HarvestResult {
  state: ValleyState;
  log: string[];
}

/**
 * Taking whatever is under your feet.
 *
 * `taken` is a list of feature ids rather than a copy of the world, so a
 * harvested plant stays harvested without the run storing a single tile.
 */
export function harvest(state: ValleyState): HarvestResult {
  if (state.status !== "active" || state.battle) return { state, log: [] };

  const feature = featureAt(state);
  if (!feature) return { state, log: [] };

  const rng = makeRng(subSeed(state.seed, 0x10a7, feature.at.x, feature.at.y));
  const bag = teamEffectBag(state.team);
  const carried: ValleyLoot = { resources: { ...state.carried.resources }, pokeballs: state.carried.pokeballs };
  const log: string[] = [];

  const between = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  const addResource = (resource: ResourceType, amount: number) => {
    // Exploration traits pay off here — the same effect bag the Refuge reads.
    const boosted = Math.max(1, Math.round(amount * bag.multiplier("run_loot", resource)));
    carried.resources[resource] = (carried.resources[resource] ?? 0) + boosted;
    log.push(`+${boosted} ${resource}`);
  };

  switch (feature.kind) {
    case "pokeball_plant": {
      const { min, max } = VALLEY_CONFIG.pokeballsPerPlant;
      const found = between(min, max);
      carried.pokeballs += found;
      log.push(`+${found} Pokéball${found > 1 ? "s" : ""}`);
      break;
    }
    case "resource": {
      const { min, max } = VALLEY_CONFIG.resourcesPerNode;
      addResource(feature.resource ?? "berry", between(min, max));
      break;
    }
    case "chest": {
      const { biome } = biomeAt(state.seed, feature.at.x, feature.at.y);
      const rolls = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < rolls; i++) {
        const pickRes = biome.resources[Math.floor(rng() * biome.resources.length)];
        addResource(pickRes.resource, between(8, 24));
      }
      const balls = between(1, 4);
      carried.pokeballs += balls;
      log.push(`+${balls} Pokéball${balls > 1 ? "s" : ""}`);
      break;
    }
    case "camp": {
      // A camp is the mode's only safe moment: bank what you carry and patch
      // the team up. That is what makes "rentrer ou continuer" a real choice.
      log.push("Le camp met ton butin à l'abri.");
      return {
        state: {
          ...state,
          carried: { resources: {}, pokeballs: carried.pokeballs },
          secured: mergeLoot(state.secured, { ...carried, pokeballs: 0 }),
          taken: [...state.taken, feature.id],
          team: state.team.map((member) => ({
            ...member,
            hp: member.hp > 0 ? member.maxHp : Math.ceil(member.maxHp * 0.5),
          })),
        },
        log: [...log, "Toute l'équipe est soignée."],
      };
    }
    case "cave":
    case "ruins":
    case "shrine": {
      const rolls = feature.kind === "shrine" ? 4 : feature.kind === "ruins" ? 3 : 2;
      const { biome } = biomeAt(state.seed, feature.at.x, feature.at.y);
      for (let i = 0; i < rolls; i++) {
        const pickRes = biome.resources[Math.floor(rng() * biome.resources.length)];
        addResource(pickRes.resource, between(12, 40));
      }
      const balls = between(2, 6);
      carried.pokeballs += balls;
      log.push(`+${balls} Pokéballs`);
      break;
    }
  }

  return {
    state: { ...state, carried, taken: [...state.taken, feature.id] },
    log,
  };
}

function mergeLoot(a: ValleyLoot, b: ValleyLoot): ValleyLoot {
  const resources = { ...a.resources };
  for (const [resource, amount] of Object.entries(b.resources) as [ResourceType, number][]) {
    resources[resource] = (resources[resource] ?? 0) + amount;
  }
  return { resources, pokeballs: a.pokeballs + b.pokeballs };
}

/* --- Ending the run ------------------------------------------------------- */

/** Walking home. Everything you carry is banked, plus whatever a camp held. */
export function returnToRanch(state: ValleyState): ValleyState {
  if (state.status !== "active") return state;
  const banked = mergeLoot(state.secured, state.carried);

  return {
    ...state,
    status: "returned",
    battle: null,
    wild: null,
    outcome: {
      status: "returned",
      message: "Retour au Ranch, le sac plein.",
      bestDistance: state.bestDistance,
      banked,
      caught: state.caught,
    },
  };
}

/**
 * The team is down.
 *
 * Deliberately not ruinous: the Pokémon you caught and the loot you secured at
 * a camp come home with you. Only what you were carrying is lost — enough of a
 * sting to make a camp worth stopping at, not enough to make the walk back
 * feel compulsory.
 */
function faint(state: ValleyState): ValleyState {
  return {
    ...state,
    status: "lost",
    battle: null,
    wild: null,
    outcome: {
      status: "lost",
      message: "Ton équipe est hors de combat — un passant te ramène au Ranch.",
      bestDistance: state.bestDistance,
      banked: state.secured,
      caught: state.caught,
    },
  };
}
