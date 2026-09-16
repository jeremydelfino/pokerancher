import {
  battleTurn as battleTurnState,
  flee as fleeState,
  harvest as harvestState,
  parseSeedCode,
  POKEMON_BY_ID,
  randomSeed,
  returnToRanch as returnToRanchState,
  startValley as startValleyState,
  step as stepState,
  throwBall as throwBallState,
  VALLEY_CONFIG,
  type BattleAction,
  type ResourceType,
  type ValleyLoot,
  type ValleyRecruit,
  type ValleyState,
  type Vec2,
} from "@pokerancher/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { unitsWorking } from "./refugeService.js";

/**
 * PokeValley, server side.
 *
 * Same contract as the expedition: the client sends *intents* — one step in a
 * direction, one harvest where it stands, one move in a fight, one ball — and
 * never a result. Everything is replayed here against the stored seed.
 *
 * The world is not transmitted and not stored. The client generates the exact
 * same tiles locally from the seed, which is what makes an endless world
 * playable over HTTP: the only thing on the wire is a position.
 */

function asState(row: { state: Prisma.JsonValue }): ValleyState {
  return row.state as unknown as ValleyState;
}

function asJson(state: ValleyState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

export async function getActiveRun(userId: string) {
  const row = await prisma.valleyRun.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return row ? { id: row.id, state: asState(row) } : null;
}

/* --- Starting ------------------------------------------------------------- */

export async function startRun(userId: string, unitIds: string[], seedCode?: string) {
  const existing = await getActiveRun(userId);
  if (existing) throw new Error("Une expédition est déjà en cours");

  if (unitIds.length === 0) throw new Error("Emmène au moins un Pokémon");

  const units = await prisma.pokemonUnit.findMany({
    where: { userId, id: { in: unitIds.slice(0, VALLEY_CONFIG.start.teamSize) } },
  });
  if (units.length === 0) throw new Error("Aucun de ces Pokémon ne t'appartient");

  // One job at a time, exactly as the Refuge rule already says.
  const working = await unitsWorking(userId);
  const busy = units.filter((unit) => working.has(unit.id));
  if (busy.length > 0) {
    const names = busy.map((unit) => POKEMON_BY_ID[unit.speciesId]?.name ?? unit.speciesId);
    throw new Error(`${names.join(", ")} ${busy.length > 1 ? "travaillent" : "travaille"} au Refuge`);
  }

  // The player picked an order; `findMany` does not preserve it.
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const recruits: ValleyRecruit[] = unitIds
    .map((id) => byId.get(id))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))
    .map((unit) => ({
      unitId: unit.id,
      speciesId: unit.speciesId,
      level: unit.level,
      moves: unit.moves,
      shiny: unit.shiny,
    }));

  // A typed seed lets a player walk a friend's world; anything else is fresh.
  const seed = (seedCode ? parseSeedCode(seedCode) : null) ?? randomSeed();
  const state = startValleyState(seed, recruits);

  const row = await prisma.valleyRun.create({
    data: { userId, status: state.status, state: asJson(state) },
  });

  await prisma.valleyRecord.upsert({
    where: { userId },
    update: { runs: { increment: 1 } },
    create: { userId, runs: 1 },
  });

  return { id: row.id, state };
}

/* --- Persisting ----------------------------------------------------------- */

/** Writes the new state, and banks the run when it has ended. */
async function persist(runId: string, userId: string, state: ValleyState) {
  if (state.status === "active") {
    await prisma.valleyRun.update({ where: { id: runId }, data: { state: asJson(state) } });
    return { id: runId, state, awarded: null };
  }

  const awarded = await settle(userId, state);
  await prisma.valleyRun.update({
    where: { id: runId },
    data: { status: state.status, state: asJson(state), endedAt: new Date() },
  });
  return { id: runId, state, awarded };
}

export interface ValleyAward {
  resources: Partial<Record<ResourceType, number>>;
  /** Species that joined the collection, with what each one is. */
  caught: { speciesId: string; name: string; level: number; shiny: boolean; alpha: boolean; isNew: boolean }[];
}

/**
 * Pays out a finished run.
 *
 * Resources go through the same InventoryItem rows the Refuge uses — there is
 * no second inventory. Caught Pokémon go through the same PokemonUnit stack the
 * gacha writes to, so a Pokémon caught in the wild is indistinguishable from
 * one hatched at home, which is the point.
 */
async function settle(userId: string, state: ValleyState): Promise<ValleyAward> {
  const banked: ValleyLoot = state.outcome?.banked ?? { resources: {}, pokeballs: 0 };
  const resources: Partial<Record<ResourceType, number>> = {};

  for (const [resource, amount] of Object.entries(banked.resources) as [ResourceType, number][]) {
    if (!amount || amount <= 0) continue;
    await prisma.inventoryItem.upsert({
      where: { userId_resource: { userId, resource } },
      update: { quantity: { increment: amount } },
      create: { userId, resource, quantity: amount },
    });
    resources[resource] = amount;
  }

  const caught: ValleyAward["caught"] = [];
  for (const trophy of state.outcome?.caught ?? []) {
    const species = POKEMON_BY_ID[trophy.speciesId];
    if (!species) continue;

    const existing = await prisma.pokemonUnit.findUnique({
      where: { userId_speciesId: { userId, speciesId: trophy.speciesId } },
    });

    if (existing) {
      // Merging keeps the better level and never loses a shiny unlock — the
      // same rule evolution follows.
      await prisma.pokemonUnit.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: 1 },
          level: Math.max(existing.level, trophy.level),
          shinyUnlocked: existing.shinyUnlocked || trophy.shiny,
        },
      });
    } else {
      await prisma.pokemonUnit.create({
        data: {
          userId,
          speciesId: trophy.speciesId,
          quantity: 1,
          level: trophy.level,
          shiny: trophy.shiny,
          shinyUnlocked: trophy.shiny,
          moves: [],
        },
      });
    }

    caught.push({
      speciesId: trophy.speciesId,
      name: species.name,
      level: trophy.level,
      shiny: trophy.shiny,
      alpha: trophy.alpha,
      isNew: !existing,
    });
  }

  await bumpRecord(userId, state, caught.length);
  return { resources, caught };
}

/** The high-water mark: PokeValley's permanent progression. */
async function bumpRecord(userId: string, state: ValleyState, caughtCount: number) {
  const record = await prisma.valleyRecord.findUnique({ where: { userId } });
  const discovered = new Set(record?.discovered ?? []);
  for (const trophy of state.outcome?.caught ?? []) discovered.add(trophy.speciesId);

  await prisma.valleyRecord.upsert({
    where: { userId },
    update: {
      bestDistance: Math.max(record?.bestDistance ?? 0, state.bestDistance),
      pokemonCaught: { increment: caughtCount },
      discovered: [...discovered],
    },
    create: {
      userId,
      runs: 1,
      bestDistance: state.bestDistance,
      pokemonCaught: caughtCount,
      discovered: [...discovered],
    },
  });
}

/* --- Intents -------------------------------------------------------------- */

async function withRun<T>(userId: string, work: (run: { id: string; state: ValleyState }) => T) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return work(run);
}

/**
 * One step.
 *
 * Deliberately one tile per request: the server can check adjacency trivially,
 * and every encounter roll happens here rather than being reported by a client
 * that could re-roll until something rare turned up.
 */
export async function step(userId: string, direction: Vec2) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");

  const { state, log } = stepState(run.state, direction);
  const saved = await persist(run.id, userId, state);
  return { ...saved, log };
}

/**
 * Several steps in one request.
 *
 * Walking is the thing the player does most, and one HTTP round trip per tile
 * would make the world feel like treacle. The server still resolves every
 * single step — including every encounter roll — it just does them in a batch,
 * and stops early the moment something interrupts.
 */
export async function walk(userId: string, directions: Vec2[]) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  if (directions.length > 32) throw new Error("Trop de pas d'un coup");

  let state = run.state;
  const log: string[] = [];
  for (const direction of directions) {
    if (state.battle || state.status !== "active") break;
    const result = stepState(state, direction);
    state = result.state;
    log.push(...result.log);
  }

  const saved = await persist(run.id, userId, state);
  return { ...saved, log };
}

export async function harvest(userId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  const { state, log } = harvestState(run.state);
  const saved = await persist(run.id, userId, state);
  return { ...saved, log };
}

export async function battleTurn(userId: string, action: BattleAction) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  if (!run.state.battle) throw new Error("Aucun combat en cours");

  const { state, events } = battleTurnState(run.state, action);
  const saved = await persist(run.id, userId, state);
  return { ...saved, events };
}

export async function throwBall(userId: string, ballId?: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");

  const result = throwBallState(run.state, ballId);
  const saved = await persist(run.id, userId, result.state);
  return { ...saved, caught: result.caught, chance: result.chance, log: result.log };
}

export async function flee(userId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return persist(run.id, userId, fleeState(run.state));
}

export async function returnToRanch(userId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return persist(run.id, userId, returnToRanchState(run.state));
}

/* --- The screen ----------------------------------------------------------- */

export async function getValleyState(userId: string) {
  const [run, record, units] = await Promise.all([
    getActiveRun(userId),
    prisma.valleyRecord.findUnique({ where: { userId } }),
    prisma.pokemonUnit.findMany({ where: { userId }, orderBy: { speciesId: "asc" } }),
  ]);

  const working = await unitsWorking(userId);

  return {
    config: {
      teamSize: VALLEY_CONFIG.start.teamSize,
      chunkSize: VALLEY_CONFIG.chunkSize,
      loadRadius: VALLEY_CONFIG.loadRadius,
      metresPerTile: VALLEY_CONFIG.metresPerTile,
    },
    run: run?.state ?? null,
    record: record ?? { bestDistance: 0, runs: 0, pokemonCaught: 0, alphasDefeated: 0, discovered: [] },
    roster: units.map((unit) => ({
      id: unit.id,
      speciesId: unit.speciesId,
      species: POKEMON_BY_ID[unit.speciesId],
      level: unit.level,
      shiny: unit.shiny,
      moves: unit.moves,
      busy: working.has(unit.id),
    })),
  };
}
