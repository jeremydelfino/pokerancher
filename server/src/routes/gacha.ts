import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { EGG_PRICES, isEggCurrency, rollEgg } from "../services/gachaService.js";

export const gachaRouter = Router();
gachaRouter.use(requireAuth);

gachaRouter.get("/", (_req, res) => {
  res.json({ eggCost: EGG_PRICES.egg_shard, prices: EGG_PRICES });
});

gachaRouter.post("/roll", async (req, res) => {
  const { currency } = req.body as { currency?: unknown };

  if (currency !== undefined && !isEggCurrency(currency)) {
    res.status(400).json({ error: "Monnaie inconnue" });
    return;
  }

  try {
    res.json(await rollEgg(req.userId!, currency ?? "egg_shard"));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Gacha roll failed" });
  }
});
