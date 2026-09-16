import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { codexRouter } from "./routes/codex.js";
import { gachaRouter } from "./routes/gacha.js";
import { marketRouter } from "./routes/market.js";
import { pokemonRouter } from "./routes/pokemon.js";
import { refugeRouter } from "./routes/refuge.js";
import { runRouter } from "./routes/run.js";
import { valleyRouter } from "./routes/valley.js";
import { env } from "./env.js";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/refuge", refugeRouter);
app.use("/gacha", gachaRouter);
app.use("/market", marketRouter);
app.use("/pokemon", pokemonRouter);
app.use("/run", runRouter);
app.use("/valley", valleyRouter);
app.use("/codex", codexRouter);

/**
 * The last stop for anything a route threw.
 *
 * Paired with `asyncRouter`, which forwards rejected promises here instead of
 * letting Node kill the process over an unhandled rejection. A failing request
 * should cost that request, never the whole API.
 */
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Erreur serveur";
  console.error("[api]", err);

  // A Prisma client that predates a migration fails here in a way worth naming:
  // it is the one error whose fix is a command, not a code change.
  const stale =
    message.includes("does not exist in the current database") ||
    /Cannot read properties of undefined \(reading '\w+'\)/.test(message);

  res.status(500).json({
    error: stale
      ? "La base n'est pas à jour — lance `npm run db:migrate` pour appliquer les migrations et régénérer le client Prisma."
      : message,
  });
});

app.listen(env.port, () => {
  console.log(`Pokerancher API listening on http://localhost:${env.port}`);
});
