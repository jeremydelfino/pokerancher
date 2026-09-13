import { POKEMON_BY_ID, starTierForCount } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";

export const pokemonRouter = Router();
pokemonRouter.use(requireAuth);

pokemonRouter.get("/", async (req, res) => {
  const units = await prisma.pokemonUnit.findMany({ where: { userId: req.userId } });
  res.json(
    units.map((u) => ({
      id: u.id,
      speciesId: u.speciesId,
      species: POKEMON_BY_ID[u.speciesId],
      quantity: u.quantity,
      starTier: starTierForCount(u.quantity),
    }))
  );
});
