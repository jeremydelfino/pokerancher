import { RUN_CONFIG } from "@pokerancher/shared";
import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  abandonRun,
  chooseOption,
  describeRun,
  enterNode,
  getActiveRun,
  recentRuns,
  startRun,
} from "../services/runService.js";

export const runRouter = Router();
runRouter.use(requireAuth);

/**
 * Every mutating route takes a choice, never a result. The body is a node id or
 * an option id and nothing else — there is no shape in which the client can
 * report having won a fight.
 */

function fail(res: import("express").Response, err: unknown) {
  res.status(400).json({ error: err instanceof Error ? err.message : "Action impossible" });
}

runRouter.get("/", async (req, res) => {
  const run = await getActiveRun(req.userId!);
  res.json({
    config: { teamSize: RUN_CONFIG.teamSize, rows: RUN_CONFIG.rows },
    run: run ? describeRun(run) : null,
    history: await recentRuns(req.userId!),
  });
});

runRouter.post("/start", async (req, res) => {
  const { unitIds } = req.body as { unitIds?: unknown };
  if (!Array.isArray(unitIds) || unitIds.some((id) => typeof id !== "string")) {
    res.status(400).json({ error: "unitIds doit être une liste d'identifiants" });
    return;
  }
  try {
    const run = await startRun(req.userId!, unitIds as string[]);
    res.json({ run: describeRun(run), awarded: run.awarded });
  } catch (err) {
    fail(res, err);
  }
});

runRouter.post("/enter", async (req, res) => {
  const { nodeId } = req.body as { nodeId?: unknown };
  if (typeof nodeId !== "string") {
    res.status(400).json({ error: "nodeId manquant" });
    return;
  }
  try {
    const run = await enterNode(req.userId!, nodeId);
    res.json({ run: describeRun(run), awarded: run.awarded });
  } catch (err) {
    fail(res, err);
  }
});

runRouter.post("/choose", async (req, res) => {
  const { optionId } = req.body as { optionId?: unknown };
  if (typeof optionId !== "string") {
    res.status(400).json({ error: "optionId manquant" });
    return;
  }
  try {
    const run = await chooseOption(req.userId!, optionId);
    res.json({ run: describeRun(run), awarded: run.awarded });
  } catch (err) {
    fail(res, err);
  }
});

runRouter.post("/abandon", async (req, res) => {
  try {
    const run = await abandonRun(req.userId!);
    res.json({ run: describeRun(run), awarded: run.awarded });
  } catch (err) {
    fail(res, err);
  }
});
