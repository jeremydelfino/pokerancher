import type { SlotType } from "@pokerancher/shared";
import { SLOTS } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  assignPokemonToSlot,
  claimAllSlots,
  claimSlot,
  clearSlot,
  getRefugeState,
  releasePokemon,
} from "../services/refugeService.js";

export const refugeRouter = Router();
refugeRouter.use(requireAuth);

const VALID_SLOT_TYPES = new Set(SLOTS.map((s) => s.type));

function isSlotType(value: unknown): value is SlotType {
  return typeof value === "string" && VALID_SLOT_TYPES.has(value as SlotType);
}

function fail(res: import("express").Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : "Action impossible" });
}

refugeRouter.get("/", async (req, res) => {
  res.json(await getRefugeState(req.userId!));
});

/** Adds one Pokemon to a pen. The pen decides whether it has room. */
refugeRouter.post("/slots/:slotType/assign", async (req, res) => {
  const { slotType } = req.params;
  const { pokemonUnitId } = req.body as { pokemonUnitId?: unknown };

  if (!isSlotType(slotType)) {
    res.status(400).json({ error: "Enclos inconnu" });
    return;
  }
  if (typeof pokemonUnitId !== "string") {
    res.status(400).json({ error: "pokemonUnitId manquant" });
    return;
  }

  try {
    await assignPokemonToSlot(req.userId!, slotType, pokemonUnitId);
    res.json(await getRefugeState(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});

/** Takes one Pokemon off the job, wherever it was working. */
refugeRouter.post("/release", async (req, res) => {
  const { pokemonUnitId } = req.body as { pokemonUnitId?: unknown };
  if (typeof pokemonUnitId !== "string") {
    res.status(400).json({ error: "pokemonUnitId manquant" });
    return;
  }
  try {
    await releasePokemon(req.userId!, pokemonUnitId);
    res.json(await getRefugeState(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});

refugeRouter.post("/slots/:slotType/clear", async (req, res) => {
  const { slotType } = req.params;
  if (!isSlotType(slotType)) {
    res.status(400).json({ error: "Enclos inconnu" });
    return;
  }
  await clearSlot(req.userId!, slotType);
  res.json(await getRefugeState(req.userId!));
});

refugeRouter.post("/slots/:slotType/claim", async (req, res) => {
  const { slotType } = req.params;
  if (!isSlotType(slotType)) {
    res.status(400).json({ error: "Enclos inconnu" });
    return;
  }
  res.json(await claimSlot(req.userId!, slotType));
});

refugeRouter.post("/claim-all", async (req, res) => {
  res.json({ claimed: await claimAllSlots(req.userId!) });
});
