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
app.use("/codex", codexRouter);

app.listen(env.port, () => {
  console.log(`Pokerancher API listening on http://localhost:${env.port}`);
});
