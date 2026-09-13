import { GACHA_EGG_COST } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { rollEgg } from "../services/gachaService.js";

export const gachaRouter = Router();
gachaRouter.use(requireAuth);

gachaRouter.get("/", (_req, res) => {
  res.json({ eggCost: GACHA_EGG_COST });
});

gachaRouter.post("/roll", async (req, res) => {
  try {
    const result = await rollEgg(req.userId!);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Gacha roll failed" });
  }
});
