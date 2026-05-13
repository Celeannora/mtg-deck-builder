import type { CardRecord } from "./types";

export interface PowerSignalResult {
  powerScore: number;   // 0-10
  synergyScore: number; // 0-10 (normalized from raw synergy)
  cardScore: number;    // combined 0-10
  breakdown: string[];
}

/**
 * Compute raw power signal for a card independent of any deck.
 * Synergy score (0-20 raw from synergy.ts) is passed in normalized.
 */
export function computePowerSignal(
  card: CardRecord,
  rawSynergyScore: number // 0-20
): PowerSignalResult {
  const breakdown: string[] = [];
  let powerScore = 0;

  // EDHREC rank: normalize to 0-8 (lower rank = higher signal)
  if (card.edhrecRank != null) {
    const normalized = Math.max(0, 8 - (card.edhrecRank / 500));
    powerScore += normalized;
    breakdown.push(`EDHREC rank ${card.edhrecRank} → +${normalized.toFixed(1)}`);
  }

  // Game changer bonus
  if (card.gameChanger === 1) {
    powerScore += 3;
    breakdown.push("Game Changer designation → +3");
  }

  // Rarity baseline
  const rarityBonus: Record<string, number> = {
    mythic: 4, rare: 3, uncommon: 2, common: 1
  };
  const rb = rarityBonus[card.rarity ?? ""] ?? 0;
  powerScore += rb;
  if (rb > 0) breakdown.push(`${card.rarity} rarity → +${rb}`);

  const clampedPower = Math.min(Math.round(powerScore * 10) / 10, 10);
  const normalizedSynergy = Math.min((rawSynergyScore / 20) * 10, 10);
  const cardScore = Math.round((clampedPower * 0.5 + normalizedSynergy * 0.5) * 10) / 10;

  return {
    powerScore: clampedPower,
    synergyScore: Math.round(normalizedSynergy * 10) / 10,
    cardScore,
    breakdown
  };
}
