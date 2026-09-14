import {
  abandonRun as abandonRunState,
  availableNodes,
  enterNode as enterNodeState,
  POKEMON_SPECIES,
  randomSeed,
  resolveChoice,
  rollGachaSpecies,
  runMap,
  RUN_CONFIG,
  startRun as startRunState,
  starTierForCount,
  type LootBag,
  type ResourceType,
  type RunRecruit,
  type RunState,
} from "@pokerancher/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

/**
 * Server-side run orchestration.
 *
 * The client never sends an outcome — only which node it walked into and which
 * option it picked. Everything else is recomputed here from the stored seed, so
 * a forged "I beat the boss" is worth nothing: the server fights the boss
 * itself and reaches its own conclusion.
 */

function asState(row: { state: Prisma.JsonValue }): RunState {
  return row.state as unknown as RunState;
}

function asJson(state: RunState): Prisma.InputJsonValue {
  return state as unknown as Prisma.InputJsonValue;
}

export async function getActiveRun(userId: string) {
  const row = await prisma.run.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return row ? { id: row.id, state: asState(row) } : null;
}

/** Loot lands in the account only once, when the run is over. */
async function awardLoot(userId: string, loot: LootBag) {
  const credited: Partial<Record<ResourceType, number>> = {};

  for (const [resource, amount] of Object.entries(loot.resources) as [ResourceType, number][]) {
    if (!amount || amount <= 0) continue;
    await prisma.inventoryItem.upsert({
      where: { userId_resource: { userId, resource } },
      update: { quantity: { increment: amount } },
      create: { userId, resource, quantity: amount },
    });
    credited[resource] = amount;
  }

  // An egg reward hatches here rather than handing out a voucher — that is the
  // link back to the Refuge: a run ends with new species, which changes which
  // synergies the next composition can reach.
  const hatched = [];
  for (let i = 0; i < loot.eggs; i++) {
    const species = rollGachaSpecies(POKEMON_SPECIES);
    const unit = await prisma.pokemonUnit.upsert({
      where: { userId_speciesId: { userId, speciesId: species.id } },
      update: { quantity: { increment: 1 } },
      create: { userId, speciesId: species.id, quantity: 1 },
    });
    hatched.push({
      species,
      quantity: unit.quantity,
      isNew: unit.quantity === 1,
      starTier: starTierForCount(unit.quantity),
    });
  }

  return { resources: credited, hatched };
}

async function persist(runId: string, userId: string, state: RunState) {
  const finished = state.status !== "active";
  const awarded = finished && state.outcome ? await awardLoot(userId, state.outcome.awarded) : null;

  await prisma.run.update({
    where: { id: runId },
    data: {
      state: asJson(state),
      status: state.status,
      endedAt: finished ? new Date() : null,
    },
  });

  return { id: runId, state, awarded };
}

export async function startRun(userId: string, unitIds: string[]) {
  const existing = await getActiveRun(userId);
  if (existing) throw new Error("Une expédition est déjà en cours");

  if (unitIds.length === 0) throw new Error("Choisis au moins un compagnon");

  const units = await prisma.pokemonUnit.findMany({
    where: { id: { in: unitIds.slice(0, RUN_CONFIG.teamSize) }, userId },
  });
  if (units.length === 0) throw new Error("Aucun de ces compagnons ne t'appartient");

  const recruits: RunRecruit[] = units.map((unit) => ({
    unitId: unit.id,
    speciesId: unit.speciesId,
    duplicateCount: unit.quantity,
  }));

  const state = startRunState(randomSeed(), recruits);
  const row = await prisma.run.create({
    data: { userId, status: state.status, state: asJson(state) },
  });

  return { id: row.id, state, awarded: null };
}

export async function enterNode(userId: string, nodeId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return persist(run.id, userId, enterNodeState(run.state, nodeId));
}

export async function chooseOption(userId: string, optionId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return persist(run.id, userId, resolveChoice(run.state, optionId));
}

export async function abandonRun(userId: string) {
  const run = await getActiveRun(userId);
  if (!run) throw new Error("Aucune expédition en cours");
  return persist(run.id, userId, abandonRunState(run.state));
}

/** Everything the Explore screen needs in one payload. */
export function describeRun(run: { id: string; state: RunState }) {
  return {
    id: run.id,
    state: run.state,
    map: runMap(run.state),
    available: availableNodes(run.state).map((node) => node.id),
  };
}

export async function recentRuns(userId: string, take = 5) {
  const rows = await prisma.run.findMany({
    where: { userId, status: { not: "active" } },
    orderBy: { endedAt: "desc" },
    take,
  });
  return rows.map((row) => {
    const state = asState(row);
    return {
      id: row.id,
      status: row.status,
      depth: state.outcome?.depth ?? state.path.length,
      endedAt: row.endedAt,
      message: state.outcome?.message ?? "",
    };
  });
}
