import crypto from "node:crypto";
import { STARTER_EGG_SHARDS } from "@pokerancher/shared";
import { asyncRouter } from "./asyncRouter.js";
import { buildDiscordAuthorizeUrl, discordAvatarUrl, exchangeDiscordCode, fetchDiscordUser } from "../auth/discord.js";
import { SESSION_COOKIE, signSession } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { env } from "../env.js";

const OAUTH_STATE_COOKIE = "pr_oauth_state";

export const authRouter = asyncRouter();

authRouter.get("/discord/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(buildDiscordAuthorizeUrl(state));
});

authRouter.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE);

  if (typeof code !== "string" || typeof state !== "string" || !expectedState || state !== expectedState) {
    res.status(400).send("Invalid OAuth callback (missing code or mismatched state).");
    return;
  }

  try {
    const token = await exchangeDiscordCode(code);
    const discordUser = await fetchDiscordUser(token.access_token);

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: { username: discordUser.username, avatarUrl: discordAvatarUrl(discordUser) },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        avatarUrl: discordAvatarUrl(discordUser),
        // Starter grant so a fresh account can roll its first egg before any Refuge income exists.
        inventory: { create: { resource: "egg_shard", quantity: STARTER_EGG_SHARDS } },
      },
    });

    const sessionToken = signSession({ userId: user.id });
    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${env.clientUrl}/refuge`);
  } catch (err) {
    console.error("Discord OAuth callback failed", err);
    res.status(502).send("Discord login failed. Please try again.");
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
  });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});
