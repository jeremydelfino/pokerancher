import { Router, type RequestHandler, type Router as ExpressRouter } from "express";

/**
 * A Router that does not take the whole API down when a handler throws.
 *
 * Express 4 does not await route handlers, so a rejected promise inside an
 * `async (req, res) => …` becomes an unhandled rejection — and Node 15+ kills
 * the process for those by default. One request hitting one missing table took
 * the entire server down with it, which is how a stale Prisma client turned a
 * 500 on `/valley` into "the Ranch is offline too".
 *
 * Wrapping at the Router means the 37 handlers already written stay exactly as
 * they are: the ones with their own try/catch never reach this, and the ones
 * without get a 500 instead of a funeral.
 */

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

function guard(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try {
      // Handlers are typed as sync, but an async one returns a promise here.
      const result = handler(req, res, next) as unknown;
      if (result instanceof Promise) result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

/** Drop-in replacement for `Router()`. */
export function asyncRouter(): ExpressRouter {
  const router = Router();

  for (const method of METHODS) {
    const original = router[method].bind(router) as (...args: unknown[]) => ExpressRouter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (router as any)[method] = (path: unknown, ...handlers: unknown[]) =>
      original(path, ...handlers.map((h) => (typeof h === "function" ? guard(h as RequestHandler) : h)));
  }

  return router;
}
