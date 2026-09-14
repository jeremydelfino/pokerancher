import { POKEMON_SPECIES, resolveTraits, starTierForCount } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";

export const codexRouter = Router();
codexRouter.use(requireAuth);

/**
 * The full roster, owned or not. Traits are listed for every entry, including
 * species the player has never seen — knowing what a Pokemon would bring to a
 * composition is the whole reason to go looking for it.
 */
codexRouter.get("/", async (req, res) => {
  const units = await prisma.pokemonUnit.findMany({ where: { userId: req.userId } });
  const owned = new Map(units.map((unit) => [unit.speciesId, unit]));

  res.json({
    entries: [...POKEMON_SPECIES]
      .sort((a, b) => a.dex - b.dex)
      .map((species) => {
        const unit = owned.get(species.id);
        return {
          species,
          traits: resolveTraits(species.id),
          owned: Boolean(unit),
          unitId: unit?.id ?? null,
          quantity: unit?.quantity ?? 0,
          starTier: starTierForCount(unit?.quantity ?? 0),
        };
      }),
    ownedCount: owned.size,
    total: POKEMON_SPECIES.length,
  });
});
