import type { CardRecord } from "./types";
import { computeSynergy } from "./synergy";

export interface CardScore {
  powerSignal: number;
  synergyScore: number;
  combined: number;
}

const RARITY_SCORE: Record<string, number> = {
  mythic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

export function computePowerSignal(card: CardRecord): number {
  let score = 0;

  // EDHREC rank — lower = more played = higher power
  if (card.edhrecRank !== null) {
    // Normalize: rank 1 = 10, rank 5000+ = 0
    const normalized = Math.max(0, 10 - card.edhrecRank / 500);
    score += normalized * 0.6;
  }

  if (card.gameChanger === 1) score += 3;
  score += RARITY_SCORE[card.rarity ?? "common"] ?? 1;

  return Math.round(score * 10) / 10;
}

export function computeCardScore(
  card: CardRecord,
  deckCards: CardRecord[]
): CardScore {
  const powerSignal = computePowerSignal(card);
  const synergy = computeSynergy(card, deckCards);
  const combined =
    Math.round((powerSignal * 0.5 + synergy.score * 0.5) * 10) / 10;
  return { powerSignal, synergyScore: synergy.score, combined };
}
