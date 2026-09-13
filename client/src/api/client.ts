const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  discordLoginUrl: () => `${API_URL}/auth/discord/login`,
  me: () => request<{ id: string; username: string; avatarUrl: string | null }>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  refugeState: () => request<RefugeState>("/refuge"),
  assignPokemon: (slotType: string, pokemonUnitId: string | null) =>
    request<RefugeState>(`/refuge/slots/${slotType}/assign`, {
      method: "POST",
      body: JSON.stringify({ pokemonUnitId }),
    }),
  claimSlot: (slotType: string) =>
    request<{ resource: string | null; amount: number }>(`/refuge/slots/${slotType}/claim`, {
      method: "POST",
    }),
  claimAll: () => request<{ claimed: { slotType: string; resource: string; amount: number }[] }>(
    "/refuge/claim-all",
    { method: "POST" }
  ),

  pokemon: () => request<OwnedPokemon[]>("/pokemon"),

  gachaInfo: () => request<{ eggCost: { resource: string; amount: number } }>("/gacha"),
  gachaRoll: () => request<GachaResult>("/gacha/roll", { method: "POST" }),
};

export interface RefugeSlotState {
  type: string;
  label: string;
  resource: string;
  assigned: { pokemonUnitId: string; speciesId: string; quantity: number } | null;
  pendingAmount: number;
}

export interface RefugeState {
  slots: RefugeSlotState[];
  units: { id: string; speciesId: string; quantity: number }[];
  inventory: Record<string, number>;
}

export interface OwnedPokemon {
  id: string;
  speciesId: string;
  species: { id: string; name: string; rarity: string; role: string; trait?: { slot: string; multiplier: number } };
  quantity: number;
  starTier: { stars: number; currentCount: number; nextThreshold: number | null; statMultiplier: number };
}

export interface GachaResult {
  species: { id: string; name: string; rarity: string };
  quantity: number;
  isNew: boolean;
  starTier: { stars: number; nextThreshold: number | null; statMultiplier: number };
}
