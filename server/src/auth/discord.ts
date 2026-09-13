import { env } from "../env.js";

const DISCORD_API = "https://discord.com/api/v10";

export function buildDiscordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.discord.clientId,
    redirect_uri: env.discord.redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

export async function exchangeDiscordCode(code: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.discord.clientId,
    client_secret: env.discord.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.discord.redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<DiscordUser>;
}

export function discordAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}
