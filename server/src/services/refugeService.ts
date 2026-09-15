import {
  computePenProduction,
  POKEMON_BY_ID,
  refugeActivityStars,
  refugeComposition,
  refugeRateMultiplier,
  SLOTS,
  SLOTS_BY_TYPE,
  slotCapacity,
  slotUpgradeCost,
  slotUpgradeEffects,
  slotUpgradeState,
  type PenOccupant,
  type RefugeOccupant,
  type RunState,
  type SlotType,
} from "@pokerancher/shared";
import { prisma } from "../db.js";

/**
 * The Refuge, server-side.
 *
 * Two invariants live here and nowhere else:
 *
 *  1. Synergies and upgrades are applied on the server. The client may compute
 *     the same numbers to render them live, but what lands in the inventory is
 *     derived from rows the server owns.
 *  2. A Pokemon does one job at a time. The database unique on
 *     RefugeAssignment.pokemonUnitId stops it working two pens; the run check
 *     below stops it working a pen *and* fighting.
 */

type SlotWithWorkers = Awaited<ReturnType<typeof loadSlots>>[number];

function loadSlots(userId: string) {
  return prisma.refugeSlot.findMany({
    where: { userId },
    include: {
      workers: { include: { pokemonUnit: true }, orderBy: { seat: "asc" } },
    },
  });
}

/** The workers a pen's current level actually allows, in seat order. */
function activeWorkers(slot: SlotWithWorkers) {
  return slot.workers.slice(0, slotCapacity(slot.slotType as SlotType, slot.level));
}

function occupantsOf(slot: SlotWithWorkers): PenOccupant[] {
  return activeWorkers(slot).map((worker) => ({
    speciesId: worker.pokemonUnit.speciesId,
    duplicateCount: worker.pokemonUnit.quantity,
  }));
}

async function loadComposition(userId: string) {
  const slots = await loadSlots(userId);

  // Every worker counts toward every synergy — that is the whole point of a
  // bigger pen: four bodies are four trait holders, not one holder producing
  // four times as much.
  const occupants: RefugeOccupant[] = slots.flatMap((slot) =>
    activeWorkers(slot).map((worker) => ({
      slotType: slot.slotType as SlotType,
      speciesId: worker.pokemonUnit.speciesId,
    }))
  );

  // Bought upgrades enter through the same door as synergies: they are just
  // effects in the bag, so nothing downstream has to know they exist.
  const upgrades = slots.flatMap((slot) => slotUpgradeEffects(slot.slotType as SlotType, slot.level));

  return { slots, composition: refugeComposition(occupants, upgrades) };
}

function multiplierFor(
  composition: ReturnType<typeof refugeComposition>,
  slotType: SlotType
): number {
  return refugeRateMultiplier(composition.effects, slotType, SLOTS_BY_TYPE[slotType].resource);
}

/* --- Who is busy ---------------------------------------------------------- */

/**
 * Unit ids currently on an expedition.
 *
 * Read out of the stored run state rather than kept in a column: the run is
 * already the single source of truth for who left, and a second copy would be
 * one more thing that can disagree with it.
 */
export async function unitsOnExpedition(userId: string): Promise<Set<string>> {
  const run = await prisma.run.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return new Set();
  const state = run.state as unknown as RunState;
  return new Set(state.team.map((member) => member.key));
}

export async function unitsWorking(userId: string): Promise<Set<string>> {
  const rows = await prisma.refugeAssignment.findMany({
    where: { slot: { userId } },
    select: { pokemonUnitId: true },
  });
  return new Set(rows.map((row) => row.pokemonUnitId));
}

/* --- Production ----------------------------------------------------------- */

async function creditProduction(userId: string, slotType: SlotType) {
  const { slots, composition } = await loadComposition(userId);
  const slot = slots.find((candidate) => candidate.slotType === slotType);

  if (!slot || slot.workers.length === 0) return { resource: null, amount: 0 };

  const production = computePenProduction({
    slotType,
    occupants: occupantsOf(slot),
    elapsedMs: Date.now() - slot.lastCollectedAt.getTime(),
    synergyMultiplier: multiplierFor(composition, slotType),
  });

  if (production.amount > 0) {
    await prisma.inventoryItem.upsert({
      where: { userId_resource: { userId, resource: production.resource } },
      update: { quantity: { increment: production.amount } },
      create: { userId, resource: production.resource, quantity: production.amount },
    });
  }

  await prisma.refugeSlot.update({ where: { id: slot.id }, data: { lastCollectedAt: new Date() } });

  return { resource: production.resource, amount: production.amount };
}

export async function claimSlot(userId: string, slotType: SlotType) {
  return creditProduction(userId, slotType);
}

export async function claimAllSlots(userId: string) {
  const results = [];
  for (const slot of SLOTS) {
    results.push({ slotType: slot.type, ...(await creditProduction(userId, slot.type)) });
  }
  return results.filter((r) => r.amount > 0);
}

/* --- Assignment ----------------------------------------------------------- */

/** Ensures the pen row exists, and hands it back with its workers. */
async function ensureSlot(userId: string, slotType: SlotType) {
  await prisma.refugeSlot.upsert({
    where: { userId_slotType: { userId, slotType } },
    update: {},
    create: { userId, slotType, lastCollectedAt: new Date() },
  });
  const slots = await loadSlots(userId);
  return slots.find((slot) => slot.slotType === slotType)!;
}

/**
 * Puts one Pokemon to work in a pen.
 *
 * Production is cashed out first, at the composition the current workers
 * actually earned — otherwise adding a fourth worker would retroactively
 * re-rate the hours the first three already put in.
 */
export async function assignPokemonToSlot(userId: string, slotType: SlotType, pokemonUnitId: string) {
  const unit = await prisma.pokemonUnit.findUnique({
    where: { id: pokemonUnitId },
    include: { refugeWork: true },
  });
  if (!unit || unit.userId !== userId) throw new Error("Ce Pokémon n'est pas dans ta collection");

  const species = POKEMON_BY_ID[unit.speciesId];
  if (!species?.trait) {
    throw new Error(`${species?.name ?? unit.speciesId} n'a pas de métier et ne peut pas travailler`);
  }
  if (species.trait.slot !== slotType) {
    throw new Error(`${species.name} ne peut pas travailler dans cet enclos`);
  }

  const away = await unitsOnExpedition(userId);
  if (away.has(pokemonUnitId)) {
    throw new Error(`${species.name} est en expédition — il ne peut pas travailler en même temps`);
  }

  await creditProduction(userId, slotType);

  const slot = await ensureSlot(userId, slotType);
  const capacity = slotCapacity(slotType, slot.level);

  const already = slot.workers.some((worker) => worker.pokemonUnitId === pokemonUnitId);
  if (already) return slot;

  if (slot.workers.length >= capacity) {
    throw new Error(
      capacity === 1
        ? "Cet enclos ne tient qu'un Pokémon — améliore-le pour en accueillir plus"
        : `Cet enclos est plein (${capacity} Pokémon)`
    );
  }

  // If the Pokemon was working elsewhere, pay that pen out before moving it.
  if (unit.refugeWork) {
    const previous = await prisma.refugeSlot.findUnique({ where: { id: unit.refugeWork.slotId } });
    if (previous) await creditProduction(userId, previous.slotType as SlotType);
    await prisma.refugeAssignment.delete({ where: { id: unit.refugeWork.id } });
  }

  const taken = new Set(slot.workers.map((worker) => worker.seat));
  let seat = 0;
  while (taken.has(seat)) seat++;

  await prisma.refugeAssignment.create({ data: { slotId: slot.id, pokemonUnitId, seat } });
  return slot;
}

/** Takes one Pokemon off the job, paying out what it earned first. */
export async function releasePokemon(userId: string, pokemonUnitId: string) {
  const assignment = await prisma.refugeAssignment.findUnique({
    where: { pokemonUnitId },
    include: { slot: true },
  });
  if (!assignment || assignment.slot.userId !== userId) {
    throw new Error("Ce Pokémon ne travaille pas au Refuge");
  }

  await creditProduction(userId, assignment.slot.slotType as SlotType);
  await prisma.refugeAssignment.delete({ where: { id: assignment.id } });
}

/** Empties a pen in one go. */
export async function clearSlot(userId: string, slotType: SlotType) {
  await creditProduction(userId, slotType);
  await prisma.refugeAssignment.deleteMany({ where: { slot: { userId, slotType } } });
}

/* --- Upgrades ------------------------------------------------------------- */

export async function upgradeSlot(userId: string, slotType: SlotType) {
  await creditProduction(userId, slotType);

  const [slot, wallet] = await Promise.all([
    prisma.refugeSlot.findUnique({ where: { userId_slotType: { userId, slotType } } }),
    prisma.inventoryItem.findUnique({ where: { userId_resource: { userId, resource: "coin" } } }),
  ]);

  const level = slot?.level ?? 0;
  const coins = wallet?.quantity ?? 0;
  const cost = slotUpgradeCost(slotType, level, coins);

  await prisma.$transaction(async (tx) => {
    // Conditional debit, and the level is pinned to the one we priced: a second
    // request racing this one finds either the coins or the level moved, and
    // fails instead of buying two tiers for the price of one.
    const paid = await tx.inventoryItem.updateMany({
      where: { userId, resource: "coin", quantity: { gte: cost } },
      data: { quantity: { decrement: cost } },
    });
    if (paid.count === 0) throw new Error("Pièces insuffisantes");

    if (slot) {
      const bumped = await tx.refugeSlot.updateMany({
        where: { id: slot.id, level },
        data: { level: level + 1 },
      });
      if (bumped.count === 0) throw new Error("Cet enclos vient d'être amélioré");
    } else {
      await tx.refugeSlot.create({
        data: { userId, slotType, level: level + 1, lastCollectedAt: new Date() },
      });
    }
  });

  return { slotType, level: level + 1, spent: cost, capacity: slotCapacity(slotType, level + 1) };
}

/* --- Read ----------------------------------------------------------------- */

export async function getRefugeState(userId: string) {
  const [{ slots, composition }, units, inventory, away] = await Promise.all([
    loadComposition(userId),
    prisma.pokemonUnit.findMany({ where: { userId }, include: { refugeWork: { include: { slot: true } } } }),
    prisma.inventoryItem.findMany({ where: { userId } }),
    unitsOnExpedition(userId),
  ]);

  const slotsByType = new Map(slots.map((s) => [s.slotType, s]));
  const coins = inventory.find((item) => item.resource === "coin")?.quantity ?? 0;

  return {
    slots: SLOTS.map((def) => {
      const slot = slotsByType.get(def.type);
      const level = slot?.level ?? 0;
      const capacity = slotCapacity(def.type, level);
      const synergyMultiplier = multiplierFor(composition, def.type);
      const workers = slot ? activeWorkers(slot) : [];

      const pending = slot
        ? computePenProduction({
            slotType: def.type,
            occupants: occupantsOf(slot),
            elapsedMs: Date.now() - slot.lastCollectedAt.getTime(),
            synergyMultiplier,
          })
        : null;

      return {
        type: def.type,
        label: def.label,
        resource: def.resource,
        capacity,
        workers: workers.map((worker) => ({
          pokemonUnitId: worker.pokemonUnitId,
          speciesId: worker.pokemonUnit.speciesId,
          quantity: worker.pokemonUnit.quantity,
          seat: worker.seat,
        })),
        pendingAmount: pending?.amount ?? 0,
        synergyMultiplier,
        stars: refugeActivityStars(composition.effects, def.type, workers.length > 0),
        upgrade: slotUpgradeState(def.type, level, coins),
      };
    }),
    synergies: composition.synergies,
    units: units.map((unit) => ({
      id: unit.id,
      speciesId: unit.speciesId,
      quantity: unit.quantity,
      /** Why this Pokemon is unavailable, or null when it is free. */
      busy: unit.refugeWork
        ? ({ kind: "refuge", slotType: unit.refugeWork.slot.slotType } as const)
        : away.has(unit.id)
          ? ({ kind: "expedition" } as const)
          : null,
    })),
    inventory: Object.fromEntries(inventory.map((i) => [i.resource, i.quantity])),
  };
}
