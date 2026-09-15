import { POKEMON_BY_ID, starTierForCount, activeMoves } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import {
  describeUnit,
  evolve,
  levelUp,
  setMoves,
  setShiny,
} from "../services/pokemonService.js";
import { unitsOnExpedition } from "../services/refugeService.js";

export const pokemonRouter = Router();
pokemonRouter.use(requireAuth);

function fail(res: import("express").Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : "Action impossible" });
}

/**
 * The player's collection, each entry saying whether it is free.
 *
 * `busy` is what both pickers read: the Refuge greys out whoever left on an
 * expedition, the expedition greys out whoever is working a pen. The server
 * refuses either way, but a disabled card explains the rule better than an
 * error toast does.
 */
pokemonRouter.get("/", async (req, res) => {
  const [units, away] = await Promise.all([
    prisma.pokemonUnit.findMany({
      where: { userId: req.userId },
      include: { refugeWork: { include: { slot: true } } },
    }),
    unitsOnExpedition(req.userId!),
  ]);

  res.json(
    units.map((unit) => ({
      id: unit.id,
      speciesId: unit.speciesId,
      species: POKEMON_BY_ID[unit.speciesId],
      quantity: unit.quantity,
      level: unit.level,
      shiny: unit.shiny,
      shinyUnlocked: unit.shinyUnlocked,
      moves: activeMoves(unit.speciesId, unit.level, unit.moves),
      starTier: starTierForCount(unit.quantity),
      busy: unit.refugeWork
        ? { kind: "refuge" as const, slotType: unit.refugeWork.slot.slotType }
        : away.has(unit.id)
          ? { kind: "expedition" as const }
          : null,
    }))
  );
});

/** The full sheet for one Pokémon — what the codex opens. */
pokemonRouter.get("/:unitId", async (req, res) => {
  try {
    res.json(await describeUnit(req.userId!, req.params.unitId));
  } catch (err) {
    fail(res, err);
  }
});

pokemonRouter.post("/:unitId/level", async (req, res) => {
  const { steps } = req.body as { steps?: unknown };
  if (steps !== undefined && (typeof steps !== "number" || !Number.isFinite(steps))) {
    res.status(400).json({ error: "steps invalide" });
    return;
  }
  try {
    const result = await levelUp(req.userId!, req.params.unitId, Math.trunc((steps as number) ?? 1));
    res.json({ ...result, unit: await describeUnit(req.userId!, req.params.unitId) });
  } catch (err) {
    fail(res, err);
  }
});

pokemonRouter.post("/:unitId/moves", async (req, res) => {
  const { moves } = req.body as { moves?: unknown };
  if (!Array.isArray(moves) || moves.some((m) => typeof m !== "string")) {
    res.status(400).json({ error: "moves doit être une liste d'attaques" });
    return;
  }
  try {
    await setMoves(req.userId!, req.params.unitId, moves as string[]);
    res.json({ unit: await describeUnit(req.userId!, req.params.unitId) });
  } catch (err) {
    fail(res, err);
  }
});

pokemonRouter.post("/:unitId/evolve", async (req, res) => {
  const { targetId } = req.body as { targetId?: unknown };
  if (typeof targetId !== "string") {
    res.status(400).json({ error: "targetId manquant" });
    return;
  }
  try {
    const result = await evolve(req.userId!, req.params.unitId, targetId);
    res.json({ ...result, unit: await describeUnit(req.userId!, result.unitId) });
  } catch (err) {
    fail(res, err);
  }
});

pokemonRouter.post("/:unitId/shiny", async (req, res) => {
  const { shiny } = req.body as { shiny?: unknown };
  if (typeof shiny !== "boolean") {
    res.status(400).json({ error: "shiny doit être un booléen" });
    return;
  }
  try {
    await setShiny(req.userId!, req.params.unitId, shiny);
    res.json({ unit: await describeUnit(req.userId!, req.params.unitId) });
  } catch (err) {
    fail(res, err);
  }
});
