import { asyncRouter } from "./asyncRouter.js";
import type { BattleAction, Vec2 } from "@pokerancher/shared";
import { requireAuth } from "../auth/middleware.js";
import {
  battleTurn,
  flee,
  getValleyState,
  harvest,
  returnToRanch,
  startRun,
  throwBall,
  walk,
} from "../services/valleyService.js";

export const valleyRouter = asyncRouter();

// Every route here reads `req.userId`, which only exists once this has run.
valleyRouter.use(requireAuth);

/**
 * PokeValley's API surface.
 *
 * Every route takes an intent and returns the new state. Nothing here accepts
 * a result: there is no shape in which a client can say "I walked 400 metres"
 * or "I caught it". It says which way it pressed, and the server walks.
 */

function fail(res: import("express").Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : "Action impossible" });
}

/** A direction is one of the four; anything else is refused rather than clamped. */
function readDirection(value: unknown): Vec2 | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y } = value as { x?: unknown; y?: unknown };
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Magnitude is ignored by the engine, but refusing anything but a unit step
  // keeps the wire format honest about what a step is.
  if (Math.abs(x) > 1 || Math.abs(y) > 1) return null;
  return { x, y };
}

valleyRouter.get("/", async (req, res) => {
  res.json(await getValleyState(req.userId!));
});

valleyRouter.post("/start", async (req, res) => {
  const { unitIds, seed } = req.body as { unitIds?: unknown; seed?: unknown };
  if (!Array.isArray(unitIds) || unitIds.some((id) => typeof id !== "string")) {
    res.status(400).json({ error: "unitIds doit être une liste d'identifiants" });
    return;
  }
  if (seed !== undefined && typeof seed !== "string") {
    res.status(400).json({ error: "seed invalide" });
    return;
  }
  try {
    res.json(await startRun(req.userId!, unitIds as string[], seed as string | undefined));
  } catch (err) {
    fail(res, err);
  }
});

/**
 * A short burst of steps.
 *
 * Batched because walking is continuous and one request per tile would make the
 * world feel like treacle — but the server still resolves every step in the
 * batch, one at a time, and stops the instant something interrupts.
 */
valleyRouter.post("/walk", async (req, res) => {
  const { path } = req.body as { path?: unknown };
  if (!Array.isArray(path) || path.length === 0) {
    res.status(400).json({ error: "path doit être une liste de directions" });
    return;
  }

  const directions: Vec2[] = [];
  for (const entry of path) {
    const direction = readDirection(entry);
    if (!direction) {
      res.status(400).json({ error: "Direction invalide" });
      return;
    }
    directions.push(direction);
  }

  try {
    res.json(await walk(req.userId!, directions));
  } catch (err) {
    fail(res, err);
  }
});

valleyRouter.post("/harvest", async (req, res) => {
  try {
    res.json(await harvest(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});

valleyRouter.post("/battle", async (req, res) => {
  const action = req.body as BattleAction;
  const valid =
    action &&
    ((action.kind === "move" && typeof action.moveId === "string") ||
      (action.kind === "switch" && typeof action.memberKey === "string"));
  if (!valid) {
    res.status(400).json({ error: "Action de combat invalide" });
    return;
  }
  try {
    res.json(await battleTurn(req.userId!, action));
  } catch (err) {
    fail(res, err);
  }
});

valleyRouter.post("/ball", async (req, res) => {
  const { ball } = req.body as { ball?: unknown };
  if (ball !== undefined && typeof ball !== "string") {
    res.status(400).json({ error: "ball invalide" });
    return;
  }
  try {
    res.json(await throwBall(req.userId!, ball as string | undefined));
  } catch (err) {
    fail(res, err);
  }
});

valleyRouter.post("/flee", async (req, res) => {
  try {
    res.json(await flee(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});

valleyRouter.post("/return", async (req, res) => {
  try {
    res.json(await returnToRanch(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});
