import { VALLEY_CONFIG } from "../data/valley-config.js";
import { POKEMON_BY_ID } from "../pokemon-data.js";
import type { Battler } from "../battle/types.js";
import type { WildEncounter } from "./types.js";

/**
 * Throwing a Pokéball.
 *
 * Four factors, and the screen shows all four — not the formula, but what is
 * pushing the number around. A player who cannot see *why* a capture is hard
 * has no way to get better at capturing, and "throw balls until it works" is
 * not a decision.
 *
 *   how hurt it is    the big one: fight first, then throw
 *   level difference  you cannot walk out and net a level-40
 *   rarity           a legendary resists, an alpha resists harder
 *   the ball          a multiplier, so better balls slot in later
 */

export interface BallDefinition {
  id: string;
  name: string;
  /** Multiplies the whole chance. 1.0 is the plain Pokéball. */
  captureMultiplier: number;
}

/**
 * The MVP ships one ball. The architecture takes more without a rewrite: a
 * Super Ball is an entry here, nothing else changes.
 */
export const BALLS: Record<string, BallDefinition> = {
  pokeball: { id: "pokeball", name: "Pokéball", captureMultiplier: 1 },
};

export const DEFAULT_BALL = "pokeball";

export interface CaptureFactor {
  label: string;
  /** Signed contribution, for the bar the player reads. */
  delta: number;
}

export interface CaptureOdds {
  chance: number;
  factors: CaptureFactor[];
}

/**
 * The odds, and why.
 *
 * Pure and shared: the screen calls this to draw the bar and the server calls
 * the same function to resolve the throw, so what the player was shown is
 * exactly what they got.
 */
export function captureOdds(
  wild: WildEncounter,
  wildBattler: Pick<Battler, "hp" | "maxHp">,
  playerMaxLevel: number,
  ballId: string = DEFAULT_BALL
): CaptureOdds {
  const cfg = VALLEY_CONFIG.capture;
  const factors: CaptureFactor[] = [];

  let chance = cfg.base;
  factors.push({ label: "Base", delta: cfg.base });

  // --- How hurt it is. The reason to fight before throwing.
  const hpLeft = Math.max(0, Math.min(1, wildBattler.hp / Math.max(1, wildBattler.maxHp)));
  const hpBonus = (1 - hpLeft) * cfg.hpWeight;
  chance += hpBonus;
  factors.push({ label: `PV restants ${Math.round(hpLeft * 100)} %`, delta: hpBonus });

  // --- Level difference, measured against the best Pokémon you brought.
  const gap = playerMaxLevel - wild.level;
  const levelDelta =
    gap >= 0
      ? Math.min(cfg.levelBonusMax, gap * cfg.levelBonusPerLevel)
      : gap * cfg.levelPenaltyPerLevel;
  chance += levelDelta;
  factors.push({
    label:
      gap >= 0
        ? `Ton meilleur Pokémon a ${gap} niveau(x) d'avance`
        : `Il a ${-gap} niveau(x) d'avance sur toi`,
    delta: levelDelta,
  });

  // --- Rarity and alpha status multiply what is left.
  const rarity = POKEMON_BY_ID[wild.speciesId]?.rarity ?? "common";
  const rarityFactor = cfg.rarityFactor[rarity];
  const before = chance;
  chance *= rarityFactor;
  if (rarityFactor !== 1) {
    factors.push({ label: `Rareté ${rarityLabel(rarity)}`, delta: chance - before });
  }

  if (wild.alpha) {
    const alphaBefore = chance;
    chance *= cfg.alphaFactor;
    factors.push({ label: "Alpha", delta: chance - alphaBefore });
  }

  // --- The ball.
  const ball = BALLS[ballId] ?? BALLS[DEFAULT_BALL];
  if (ball.captureMultiplier !== 1) {
    const ballBefore = chance;
    chance *= ball.captureMultiplier;
    factors.push({ label: ball.name, delta: chance - ballBefore });
  }

  return {
    chance: Math.max(cfg.minChance, Math.min(cfg.maxChance, chance)),
    factors,
  };
}

const RARITY_LABEL: Record<string, string> = {
  common: "commune",
  rare: "rare",
  epic: "épique",
  legendary: "légendaire",
};

const rarityLabel = (rarity: string) => RARITY_LABEL[rarity] ?? rarity;

/** The best level you have in the field — the yardstick the wild is measured against. */
export function playerMaxLevel(team: readonly { level: number }[]): number {
  return team.reduce((best, member) => Math.max(best, member.level), 1);
}
