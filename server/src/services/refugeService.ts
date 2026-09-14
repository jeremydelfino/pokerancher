import {
  computeProduction,
  POKEMON_BY_ID,
  refugeActivityStars,
  refugeComposition,
  refugeRateMultiplier,
  SLOTS,
  SLOTS_BY_TYPE,
  slotUpgradeCost,
  slotUpgradeEffects,
  slotUpgradeState,
  type RefugeOccupant,
  type SlotType,
} from "@pokerancher/shared";
import { prisma } from "../db.js";

/**
 * Synergies are applied here, on the server, for the same reason production
 * always was: the client may compute the same numbers to render them live, but
 * what actually lands in the inventory is derived from rows the server owns.
 */
async function loadComposition(userId: string) {
  const slots = await prisma.refugeSlot.findMany({
    where: { userId },
    include: { pokemonUnit: true },
  });

  const occupants: RefugeOccupant[] = slots
    .filter((slot) => slot.pokemonUnit)
    .map((slot) => ({ slotType: slot.slotType as SlotType, speciesId: slot.pokemonUnit!.speciesId }));

  // Bought upgrades enter through the same door as synergies: they are just
  // effects in the bag, so nothing downstream has to know they exist.
  const upgrades = slots.flatMap((slot) =>
    slotUpgradeEffects(slot.slotType as SlotType, slot.level)
  );

  return { slots, composition: refugeComposition(occupants, upgrades) };
}

function multiplierFor(
  composition: ReturnType<typeof refugeComposition>,
  slotType: SlotType
): number {
  return refugeRateMultiplier(composition.effects, slotType, SLOTS_BY_TYPE[slotType].resource);
}

async function creditProduction(userId: string, slotType: SlotType) {
  const { slots, composition } = await loadComposition(userId);
  const slot = slots.find((candidate) => candidate.slotType === slotType);

  if (!slot || !slot.pokemonUnit) return { resource: null, amount: 0 };

  const production = computeProduction({
    speciesId: slot.pokemonUnit.speciesId,
    slotType,
    elapsedMs: Date.now() - slot.lastCollectedAt.getTime(),
    duplicateCount: slot.pokemonUnit.quantity,
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

export async function assignPokemonToSlot(
  userId: string,
  slotType: SlotType,
  pokemonUnitId: string | null
) {
  if (pokemonUnitId) {
    const unit = await prisma.pokemonUnit.findUnique({ where: { id: pokemonUnitId } });
    if (!unit || unit.userId !== userId) {
      throw new Error("Pokemon not found in your collection");
    }
    const species = POKEMON_BY_ID[unit.speciesId];
    if (!species?.trait || species.trait.slot !== slotType) {
      throw new Error(`${species?.name ?? unit.speciesId} cannot be assigned to ${slotType}`);
    }

    const previousSlot = await prisma.refugeSlot.findUnique({ where: { pokemonUnitId } });
    if (previousSlot && previousSlot.slotType !== slotType) {
      await creditProduction(userId, previousSlot.slotType as SlotType);
      await prisma.refugeSlot.update({ where: { id: previousSlot.id }, data: { pokemonUnitId: null } });
    }
  }

  // Pay out at the old composition before the new one takes effect, so moving a
  // Pokemon never retroactively re-rates the hours it already worked.
  await creditProduction(userId, slotType);

  return prisma.refugeSlot.upsert({
    where: { userId_slotType: { userId, slotType } },
    update: { pokemonUnitId, lastCollectedAt: new Date() },
    create: { userId, slotType, pokemonUnitId, lastCollectedAt: new Date() },
  });
}

export async function getRefugeState(userId: string) {
  const [{ slots, composition }, units, inventory] = await Promise.all([
    loadComposition(userId),
    prisma.pokemonUnit.findMany({ where: { userId } }),
    prisma.inventoryItem.findMany({ where: { userId } }),
  ]);

  const slotsByType = new Map(slots.map((s) => [s.slotType, s]));
  const coins = inventory.find((item) => item.resource === "coin")?.quantity ?? 0;

  return {
    slots: SLOTS.map((def) => {
      const slot = slotsByType.get(def.type);
      const unit = slot?.pokemonUnit;
      const synergyMultiplier = multiplierFor(composition, def.type);
      const pending = unit
        ? computeProduction({
            speciesId: unit.speciesId,
            slotType: def.type,
            elapsedMs: Date.now() - slot!.lastCollectedAt.getTime(),
            duplicateCount: unit.quantity,
            synergyMultiplier,
          })
        : null;

      return {
        type: def.type,
        label: def.label,
        resource: def.resource,
        assigned: unit
          ? { pokemonUnitId: unit.id, speciesId: unit.speciesId, quantity: unit.quantity }
          : null,
        pendingAmount: pending?.amount ?? 0,
        synergyMultiplier,
        stars: refugeActivityStars(composition.effects, def.type, Boolean(unit)),
        upgrade: slotUpgradeState(def.type, slot?.level ?? 0, coins),
      };
    }),
    synergies: composition.synergies,
    units: units.map((u) => ({ id: u.id, speciesId: u.speciesId, quantity: u.quantity })),
    inventory: Object.fromEntries(inventory.map((i) => [i.resource, i.quantity])),
  };
}

/**
 * Buys the next upgrade tier for a pen.
 *
 * Production is cashed out first, at the level the Pokemon actually worked
 * under — the same rule as reassigning. Upgrading is otherwise a pure
 * transaction: coins out, level in, and the effect bag picks the rest up on the
 * next read.
 */
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

  return { slotType, level: level + 1, spent: cost };
}
