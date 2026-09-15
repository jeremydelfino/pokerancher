import { DEFAULT_EGG } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { eggCatalogue, rollEgg } from "../services/gachaService.js";

export const gachaRouter = Router();
gachaRouter.use(requireAuth);

gachaRouter.get("/", (_req, res) => {
  res.json({ eggs: eggCatalogue() });
});

gachaRouter.post("/roll", async (req, res) => {
  const { eggId } = req.body as { eggId?: unknown };
  if (eggId !== undefined && typeof eggId !== "string") {
    res.status(400).json({ error: "eggId invalide" });
    return;
  }

  try {
    res.json(await rollEgg(req.userId!, (eggId as string) ?? DEFAULT_EGG));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Éclosion impossible" });
  }
});
