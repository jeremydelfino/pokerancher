import type { SlotType } from "@pokerancher/shared";
import { SLOTS } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { assignPokemonToSlot, claimAllSlots, claimSlot, getRefugeState } from "../services/refugeService.js";

export const refugeRouter = Router();
refugeRouter.use(requireAuth);

const VALID_SLOT_TYPES = new Set(SLOTS.map((s) => s.type));

function isSlotType(value: unknown): value is SlotType {
  return typeof value === "string" && VALID_SLOT_TYPES.has(value as SlotType);
}

refugeRouter.get("/", async (req, res) => {
  const state = await getRefugeState(req.userId!);
  res.json(state);
});

refugeRouter.post("/slots/:slotType/assign", async (req, res) => {
  const { slotType } = req.params;
  const { pokemonUnitId } = req.body as { pokemonUnitId: string | null };

  if (!isSlotType(slotType)) {
    res.status(400).json({ error: "Unknown slot type" });
    return;
  }

  try {
    await assignPokemonToSlot(req.userId!, slotType, pokemonUnitId ?? null);
    res.json(await getRefugeState(req.userId!));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Assignment failed" });
  }
});

refugeRouter.post("/slots/:slotType/claim", async (req, res) => {
  const { slotType } = req.params;
  if (!isSlotType(slotType)) {
    res.status(400).json({ error: "Unknown slot type" });
    return;
  }
  const result = await claimSlot(req.userId!, slotType);
  res.json(result);
});

refugeRouter.post("/claim-all", async (req, res) => {
  const results = await claimAllSlots(req.userId!);
  res.json({ claimed: results });
});
