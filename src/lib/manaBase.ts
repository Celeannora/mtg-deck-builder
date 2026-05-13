import type { CardRecord } from "./types";

export interface ManaCurve {
  /** Buckets: index = cmc, value = count of non-land cards */
  buckets: number[];
  avgCmc: number;
  peakCmc: number;
}

export interface LandRecommendation {
  total: number;
  breakdown: string;
  rationale: string;
}

export function computeManaCurve(mainCards: CardRecord[]): ManaCurve {
  const nonLands = mainCards.filter(
    (c) => !c.typeLine.toLowerCase().includes("land")
  );

  const buckets: number[] = Array(8).fill(0);
  for (const card of nonLands) {
    const bucket = Math.min(7, Math.floor(card.cmc));
    buckets[bucket]++;
  }

  const avgCmc =
    nonLands.length === 0
      ? 0
      : nonLands.reduce((s, c) => s + c.cmc, 0) / nonLands.length;

  const peakCmc = buckets.indexOf(Math.max(...buckets));

  return { buckets, avgCmc: Math.round(avgCmc * 100) / 100, peakCmc };
}

/**
 * Uses Frank Karsten's mana base formula:
 * recommended lands = round(19.59 + 1.90 * avgCmc)
 * Clamped to [18, 28] for Standard-legal 60-card decks.
 */
export function recommendLandCount(mainCards: CardRecord[]): LandRecommendation {
  const nonLands = mainCards.filter(
    (c) => !c.typeLine.toLowerCase().includes("land")
  );
  if (nonLands.length === 0) return { total: 24, breakdown: "No spells found", rationale: "Defaulting to 24" };

  const avgCmc =
    nonLands.reduce((s, c) => s + c.cmc, 0) / nonLands.length;

  const raw = 19.59 + 1.9 * avgCmc;
  const total = Math.max(18, Math.min(28, Math.round(raw)));

  const rationale = `Based on avg CMC ${avgCmc.toFixed(2)}: Karsten formula gives ${raw.toFixed(1)} → ${total} lands`;
  const breakdown = `${total} lands recommended (${60 - nonLands.length} currently in deck)`;

  return { total, breakdown, rationale };
}
