import type {
  ActivityStars,
  MarketListing,
  PokemonSpecies,
  RunMap,
  RunState,
  SlotUpgradeState,
  SlotUpgradeTier,
  StarTierInfo,
  SynergyState,
} from "@pokerancher/shared";

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

  gachaInfo: () =>
    request<{ eggCost: EggPrice; prices: Record<EggCurrency, EggPrice> }>("/gacha"),
  gachaRoll: (currency: EggCurrency = "egg_shard") =>
    request<GachaResult>("/gacha/roll", { method: "POST", body: JSON.stringify({ currency }) }),

  market: () => request<MarketState>("/market"),
  sell: (resource: string, quantity: number) =>
    request<SellResponse>("/market/sell", {
      method: "POST",
      body: JSON.stringify({ resource, quantity }),
    }),
  sellAll: () => request<SellResponse>("/market/sell-all", { method: "POST" }),
  upgradeSlot: (slotType: string) =>
    request<UpgradeResponse>(`/market/upgrade/${slotType}`, { method: "POST" }),

  runState: () => request<RunEnvelope>("/run"),
  runStart: (unitIds: string[]) =>
    request<RunAction>("/run/start", { method: "POST", body: JSON.stringify({ unitIds }) }),
  runEnter: (nodeId: string) =>
    request<RunAction>("/run/enter", { method: "POST", body: JSON.stringify({ nodeId }) }),
  runChoose: (optionId: string) =>
    request<RunAction>("/run/choose", { method: "POST", body: JSON.stringify({ optionId }) }),
  runAbandon: () => request<RunAction>("/run/abandon", { method: "POST" }),

  codex: () => request<CodexResponse>("/codex"),
};

export interface RunView {
  id: string;
  state: RunState;
  map: RunMap;
  available: string[];
}

/** What the server credited when a run ended: resources, plus any eggs hatched. */
export interface RunAward {
  resources: Record<string, number>;
  hatched: GachaResult[];
}

export interface RunAction {
  run: RunView;
  awarded: RunAward | null;
}

export interface RunEnvelope {
  config: { teamSize: number; rows: number };
  run: RunView | null;
  history: { id: string; status: string; depth: number; endedAt: string | null; message: string }[];
}

export interface CodexEntry {
  species: PokemonSpecies;
  traits: string[];
  owned: boolean;
  unitId: string | null;
  quantity: number;
  starTier: StarTierInfo;
}

export interface CodexResponse {
  entries: CodexEntry[];
  ownedCount: number;
  total: number;
}

export interface RefugeSlotState {
  type: string;
  label: string;
  resource: string;
  assigned: { pokemonUnitId: string; speciesId: string; quantity: number } | null;
  pendingAmount: number;
  /** Combined bonus from active synergies and bought upgrades. 1 means nothing is helping. */
  synergyMultiplier: number;
  stars: ActivityStars;
  upgrade: SlotUpgradeState;
}

export interface RefugeState {
  slots: RefugeSlotState[];
  synergies: SynergyState[];
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

export type EggCurrency = "egg_shard" | "coin";
export interface EggPrice {
  resource: string;
  amount: number;
}

export interface MarketStall extends MarketListing {
  owned: number;
  totalIfSoldAll: number;
}

export interface MarketUpgrade extends SlotUpgradeState {
  label: string;
  ladder: SlotUpgradeTier[];
}

export interface MarketState {
  coins: number;
  stalls: MarketStall[];
  upgrades: MarketUpgrade[];
  eggCoinCost: number;
  inventory: Record<string, number>;
}

export interface SellQuote {
  resource: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SellResponse {
  sold: SellQuote[];
  earned: number;
  market: MarketState;
}

export interface UpgradeResponse {
  slotType: string;
  level: number;
  spent: number;
  market: MarketState;
  refuge: RefugeState;
}
