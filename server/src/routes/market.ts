import { SLOTS, type SlotType } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { getMarketState, sellEverything, sellResource } from "../services/marketService.js";
import { getRefugeState, upgradeSlot } from "../services/refugeService.js";

export const marketRouter = Router();
marketRouter.use(requireAuth);

const VALID_SLOT_TYPES = new Set<string>(SLOTS.map((s) => s.type));

marketRouter.get("/", async (req, res) => {
  res.json(await getMarketState(req.userId!));
});

marketRouter.post("/sell", async (req, res) => {
  const { resource, quantity } = req.body as { resource?: string; quantity?: number };

  if (typeof resource !== "string" || typeof quantity !== "number") {
    res.status(400).json({ error: "resource et quantity sont requis" });
    return;
  }

  try {
    const result = await sellResource(req.userId!, resource, Math.trunc(quantity));
    res.json({ ...result, market: await getMarketState(req.userId!) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Vente impossible" });
  }
});

marketRouter.post("/sell-all", async (req, res) => {
  const result = await sellEverything(req.userId!);
  res.json({ ...result, market: await getMarketState(req.userId!) });
});

marketRouter.post("/upgrade/:slotType", async (req, res) => {
  const { slotType } = req.params;
  if (!VALID_SLOT_TYPES.has(slotType)) {
    res.status(400).json({ error: "Enclos inconnu" });
    return;
  }

  try {
    const result = await upgradeSlot(req.userId!, slotType as SlotType);
    res.json({
      ...result,
      market: await getMarketState(req.userId!),
      refuge: await getRefugeState(req.userId!),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Amélioration impossible" });
  }
});
