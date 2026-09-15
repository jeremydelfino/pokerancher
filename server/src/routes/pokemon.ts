import { POKEMON_BY_ID, starTierForCount } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { unitsOnExpedition } from "../services/refugeService.js";

export const pokemonRouter = Router();
pokemonRouter.use(requireAuth);

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
      starTier: starTierForCount(unit.quantity),
      busy: unit.refugeWork
        ? { kind: "refuge" as const, slotType: unit.refugeWork.slot.slotType }
        : away.has(unit.id)
          ? { kind: "expedition" as const }
          : null,
    }))
  );
});
