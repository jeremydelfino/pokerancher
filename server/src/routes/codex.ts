import {
  POKEMON_SPECIES,
  resolveTraits,
  starTierForCount,
  TRAIT_DEFINITIONS,
  type Rarity,
} from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";

export const codexRouter = Router();
codexRouter.use(requireAuth);

const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

/**
 * The full roster, owned or not, plus the counters the collection screen puts
 * in its rail.
 *
 * Traits are listed for every entry, including species the player has never
 * seen — knowing what a Pokemon would bring to a composition is the whole
 * reason to go looking for it.
 */
codexRouter.get("/", async (req, res) => {
  const units = await prisma.pokemonUnit.findMany({ where: { userId: req.userId } });
  const owned = new Map(units.map((unit) => [unit.speciesId, unit]));

  const entries = [...POKEMON_SPECIES]
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
    });

  // Counted here rather than on the client so the rail and the grid can never
  // disagree — they are two views of the same array.
  const byRarity = RARITIES.map((rarity) => {
    const pool = entries.filter((entry) => entry.species.rarity === rarity);
    return {
      rarity,
      owned: pool.filter((entry) => entry.owned).length,
      total: pool.length,
    };
  });

  const byTrait = Object.values(TRAIT_DEFINITIONS)
    .map((definition) => {
      const pool = entries.filter((entry) => entry.traits.includes(definition.id));
      return {
        traitId: definition.id,
        owned: pool.filter((entry) => entry.owned).length,
        total: pool.length,
      };
    })
    .filter((row) => row.total > 0);

  res.json({
    entries,
    ownedCount: owned.size,
    total: POKEMON_SPECIES.length,
    /** Copies held across the whole collection — the "how deep" number. */
    duplicates: units.reduce((sum, unit) => sum + unit.quantity, 0),
    starred: units.filter((unit) => starTierForCount(unit.quantity).stars > 0).length,
    byRarity,
    byTrait,
  });
});
