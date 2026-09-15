import {
  activeMoves,
  affordableLevels,
  canEvolveInto,
  evolutionOptions,
  knownMoves,
  learnsetOf,
  levelResource,
  levelUpCost,
  levelUpCostFor,
  MAX_LEVEL,
  movesLearnedBetween,
  POKEMON_BY_ID,
  starTierForCount,
  type ResourceType,
} from "@pokerancher/shared";
import { prisma } from "../db.js";
import { unitsOnExpedition, unitsWorking } from "./refugeService.js";

/**
 * Growing a Pokémon: levels, moves, evolution, shiny.
 *
 * All four are *purchases or preferences*, never results: the client asks for
 * "one more level" or "carry this move" and the server prices it, checks it and
 * writes it. The rules themselves live in shared/progression.ts, so the button
 * and the check are reading the same function.
 *
 * A Pokémon that is out on an expedition is frozen. Changing its moveset or its
 * species mid-run would mean the stored battle and the collection disagree
 * about what is standing on the field.
 */

async function ownedUnit(userId: string, unitId: string) {
  const unit = await prisma.pokemonUnit.findUnique({ where: { id: unitId } });
  if (!unit || unit.userId !== userId) throw new Error("Ce Pokémon n'est pas dans ta collection");
  return unit;
}

async function assertAvailable(userId: string, unitId: string, name: string) {
  const away = await unitsOnExpedition(userId);
  if (away.has(unitId)) throw new Error(`${name} est en expédition — impossible de le modifier`);
}

async function balanceOf(userId: string, resource: ResourceType): Promise<number> {
  const row = await prisma.inventoryItem.findUnique({
    where: { userId_resource: { userId, resource } },
  });
  return row?.quantity ?? 0;
}

/* --- Level ---------------------------------------------------------------- */

export async function levelUp(userId: string, unitId: string, steps = 1) {
  const unit = await ownedUnit(userId, unitId);
  const species = POKEMON_BY_ID[unit.speciesId];
  if (!species) throw new Error("Espèce inconnue");
  await assertAvailable(userId, unitId, species.name);

  if (unit.level >= MAX_LEVEL) throw new Error(`${species.name} est déjà au niveau maximum`);

  const wanted = Math.max(1, Math.min(steps, MAX_LEVEL - unit.level));
  const resource = levelResource(species);
  const balance = await balanceOf(userId, resource);

  // Buy as many of the requested levels as the purse covers, rather than
  // refusing the whole batch: "+10" on a player who can afford seven should
  // give seven, not an error.
  const granted = affordableLevels(unit.speciesId, unit.level, balance, wanted);
  if (granted === 0) {
    const next = levelUpCost(unit.speciesId, unit.level);
    throw new Error(
      next ? `Il te manque ${next.amount - balance} ${resource} pour le niveau suivant` : "Niveau maximum"
    );
  }

  const cost = levelUpCostFor(unit.speciesId, unit.level, granted)!;
  const newLevel = unit.level + granted;

  await prisma.$transaction(async (tx) => {
    const paid = await tx.inventoryItem.updateMany({
      where: { userId, resource, quantity: { gte: cost.amount } },
      data: { quantity: { decrement: cost.amount } },
    });
    if (paid.count === 0) throw new Error("Ressources insuffisantes");

    await tx.pokemonUnit.updateMany({
      // Pinned to the level we priced: two clicks racing each other must not
      // buy the same level twice.
      where: { id: unitId, level: unit.level },
      data: { level: newLevel },
    });
  });

  return {
    level: newLevel,
    gained: granted,
    spent: cost,
    learned: movesLearnedBetween(unit.speciesId, unit.level, newLevel),
  };
}

/* --- Moves ---------------------------------------------------------------- */

export async function setMoves(userId: string, unitId: string, moves: string[]) {
  const unit = await ownedUnit(userId, unitId);
  const species = POKEMON_BY_ID[unit.speciesId];
  if (!species) throw new Error("Espèce inconnue");
  await assertAvailable(userId, unitId, species.name);

  const known = knownMoves(unit.speciesId, unit.level);
  const illegal = moves.find((move) => !known.includes(move));
  if (illegal) throw new Error(`${species.name} ne connaît pas cette attaque`);
  if (moves.length === 0) throw new Error("Garde au moins une attaque");
  if (moves.length > 4) throw new Error("Quatre attaques au maximum");
  if (new Set(moves).size !== moves.length) throw new Error("Deux fois la même attaque");

  await prisma.pokemonUnit.update({ where: { id: unitId }, data: { moves } });
  return { moves };
}

/* --- Evolution ------------------------------------------------------------ */

export async function evolve(userId: string, unitId: string, targetId: string) {
  const unit = await ownedUnit(userId, unitId);
  const species = POKEMON_BY_ID[unit.speciesId];
  const target = POKEMON_BY_ID[targetId];
  if (!species || !target) throw new Error("Évolution inconnue");
  await assertAvailable(userId, unitId, species.name);

  const working = await unitsWorking(userId);
  if (working.has(unitId)) {
    throw new Error(`${species.name} travaille au Refuge — retire-le avant de le faire évoluer`);
  }

  if (!canEvolveInto(unit.speciesId, unit.level, targetId)) {
    const options = evolutionOptions(unit.speciesId, unit.level);
    const wanted = options.find((option) => option.species.id === targetId);

    // Two different failures, and telling them apart matters: a Chenipan that
    // is asked for Papilusion is not "too low level", it is being asked to skip
    // a step — and reporting the level would send the player off to grind for
    // nothing.
    if (!wanted) {
      throw new Error(
        options.length > 0
          ? `${species.name} n'évolue pas en ${target.name} — il devient ${options
              .map((option) => option.species.name)
              .join(" ou ")}`
          : `${species.name} n'évolue pas`
      );
    }
    throw new Error(`${species.name} évolue au niveau ${wanted.atLevel} (il est ${unit.level})`);
  }

  const existing = await prisma.pokemonUnit.findUnique({
    where: { userId_speciesId: { userId, speciesId: targetId } },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      // The player already owns the evolved form. Fold this one into that
      // stack rather than failing on the unique — keeping the better level and
      // the shiny unlock, because losing either to a technicality would feel
      // like a bug whatever the row constraints say.
      const merged = await tx.pokemonUnit.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: unit.quantity },
          level: Math.max(existing.level, unit.level),
          shinyUnlocked: existing.shinyUnlocked || unit.shinyUnlocked,
          shiny: existing.shiny || unit.shiny,
        },
      });
      await tx.pokemonUnit.delete({ where: { id: unitId } });
      return merged;
    }

    return tx.pokemonUnit.update({
      where: { id: unitId },
      // The new form has its own learnset, so the old picks are cleared and
      // rebuilt from what it now knows.
      data: { speciesId: targetId, moves: [] },
    });
  });

  return {
    unitId: result.id,
    speciesId: result.speciesId,
    merged: Boolean(existing),
    from: species.name,
    to: target.name,
  };
}

/* --- Shiny ---------------------------------------------------------------- */

export async function setShiny(userId: string, unitId: string, shiny: boolean) {
  const unit = await ownedUnit(userId, unitId);
  const species = POKEMON_BY_ID[unit.speciesId];
  if (shiny && !unit.shinyUnlocked) {
    throw new Error(`Tu n'as jamais obtenu de ${species?.name ?? "Pokémon"} chromatique`);
  }
  await prisma.pokemonUnit.update({ where: { id: unitId }, data: { shiny } });
  return { shiny };
}

/* --- Read ----------------------------------------------------------------- */

/** Everything the codex sheet needs about one owned Pokémon. */
export async function describeUnit(userId: string, unitId: string) {
  const unit = await ownedUnit(userId, unitId);
  const species = POKEMON_BY_ID[unit.speciesId];
  if (!species) throw new Error("Espèce inconnue");

  const resource = levelResource(species);
  const [balance, away, working] = await Promise.all([
    balanceOf(userId, resource),
    unitsOnExpedition(userId),
    unitsWorking(userId),
  ]);

  return {
    id: unit.id,
    speciesId: unit.speciesId,
    species,
    quantity: unit.quantity,
    level: unit.level,
    maxLevel: MAX_LEVEL,
    shiny: unit.shiny,
    shinyUnlocked: unit.shinyUnlocked,
    starTier: starTierForCount(unit.quantity),
    learnset: learnsetOf(unit.speciesId, unit.level),
    moves: activeMoves(unit.speciesId, unit.level, unit.moves),
    evolutions: evolutionOptions(unit.speciesId, unit.level),
    levelCost: levelUpCost(unit.speciesId, unit.level),
    levelCostTen: levelUpCostFor(unit.speciesId, unit.level, 10),
    affordable: affordableLevels(unit.speciesId, unit.level, balance, 10),
    balance: { resource, amount: balance },
    busy: away.has(unit.id)
      ? ({ kind: "expedition" } as const)
      : working.has(unit.id)
        ? ({ kind: "refuge" } as const)
        : null,
  };
}
