import type { EffectMode } from "../traits/types.js";
import type { Rarity, ResourceType, SlotType } from "../types.js";

/**
 * TODO_GAME_DESIGN — the auction house and the pen upgrades it pays for.
 *
 * The market is deliberately boring: prices are fixed, there is no supply and
 * demand, no fluctuation, no haggling. That is a design choice, not a stub —
 * a fixed price means the player can do arithmetic in their head and decide
 * "two more hours of mining buys the next pen level", which is the whole point
 * of the sink. Everything below is a placeholder you can retune freely; nothing
 * outside this file knows these numbers.
 *
 * Coins exist only here. They are not produced by any pen and drop from no
 * expedition — the only way in is selling, and the only ways out are pen
 * upgrades and eggs. Keep it that way and the economy stays one closed loop you
 * can reason about.
 */

export interface MarketListing {
  resource: ResourceType;
  /** Coins paid per unit. Fixed forever. */
  unitPrice: number;
  /**
   * Perceived scarcity. Drives the price above, and the colour the client uses
   * to sort the stalls — it is not read by any rule.
   */
  grade: Rarity;
  /** Shown on the stall. Flavour only. */
  blurb: string;
}

/**
 * Price ladder. Note it runs opposite to the pens' production rates: berries
 * pour in at 60/h and sell for 1, ore trickles at 20/h and sells for 5, so an
 * hour of any pen is worth roughly the same. Break that on purpose if you want
 * a pen to be the obvious money-maker.
 */
export const MARKET_LISTINGS: readonly MarketListing[] = [
  { resource: "berry", unitPrice: 1, grade: "common", blurb: "Sucrées, périssables, toujours demandées." },
  { resource: "fish", unitPrice: 2, grade: "common", blurb: "Le marché du port en prend autant que tu en pêches." },
  { resource: "wood", unitPrice: 3, grade: "rare", blurb: "Les charpentiers paient bien les grumes droites." },
  { resource: "ore", unitPrice: 5, grade: "epic", blurb: "Rare, lourd, et la forge en veut encore." },
];

export const MARKET_BY_RESOURCE = Object.fromEntries(
  MARKET_LISTINGS.map((listing) => [listing.resource, listing])
) as Partial<Record<ResourceType, MarketListing>>;

/**
 * An upgrade's payload. Same vocabulary as trait effects, minus the target:
 * the engine fills it in with the pen being upgraded, so a tier can never be
 * pointed at the wrong slot by mistake.
 *
 * `slot_rate` (mult) multiplies production. `activity_score` (add) pushes the
 * pen up the star ladder in data/activity-stars.ts. Any other type works too —
 * it just needs a reader, exactly like a synergy effect.
 */
export interface SlotUpgradeEffect {
  type: string;
  value: number;
  mode?: EffectMode;
}

export interface SlotUpgradeTier {
  /** 1-based. Level 0 is the pen as built, and has no entry here. */
  level: number;
  label: string;
  /** Coins to go from the previous level to this one. */
  cost: number;
  effects: SlotUpgradeEffect[];
}

/**
 * The upgrade ladder, shared by every pen. Costs climb faster than output so
 * the last level is a long-term goal rather than the obvious next purchase.
 *
 * Want per-pen ladders? Turn this into a Record<SlotType, SlotUpgradeTier[]>
 * and make slotUpgradeLadder() read the slot — that function is the only place
 * that touches this constant.
 */
export const SLOT_UPGRADE_TIERS: readonly SlotUpgradeTier[] = [
  {
    level: 1,
    label: "Outils affûtés",
    cost: 150,
    effects: [
      { type: "slot_rate", value: 1.15, mode: "mult" },
      { type: "activity_score", value: 0.5 },
    ],
  },
  {
    level: 2,
    label: "Enclos agrandi",
    cost: 500,
    effects: [
      { type: "slot_rate", value: 1.35, mode: "mult" },
      { type: "activity_score", value: 1 },
    ],
  },
  {
    level: 3,
    label: "Atelier de tri",
    cost: 1400,
    effects: [
      { type: "slot_rate", value: 1.6, mode: "mult" },
      { type: "activity_score", value: 1.5 },
    ],
  },
  {
    level: 4,
    label: "Exploitation modèle",
    cost: 3500,
    effects: [
      { type: "slot_rate", value: 2, mode: "mult" },
      { type: "activity_score", value: 2 },
    ],
  },
];

/**
 * Upgrade tiers replace one another — reaching level 3 does NOT also apply
 * levels 1 and 2. Same rule as synergy "highest" stacking, and the same trap:
 * write each tier as the absolute value you want at that level, not as an
 * increment. Flip this to false and the ladder above compounds to x4.86.
 */
export const SLOT_UPGRADES_REPLACE_PREVIOUS = true;

/** Buying an egg with coins instead of shards. The shard price lives in game-logic.ts. */
export const EGG_COIN_COST = 400;

/** Purely cosmetic: which pen the market clerk name-drops when a stall is empty. */
export const MARKET_EMPTY_HINT: Record<SlotType, string> = {
  BERRY_FARM: "Remplis le champ de baies et reviens.",
  FISHING_DOCK: "Le ponton ne pêche pas tout seul.",
  WOODCUTTING: "La coupe de bois attend un bûcheron.",
  MINING: "Personne dans la mine, personne à payer.",
};
