import type { DeckEntry } from "./legality";
import type { CardRecord } from "./types";
import { db } from "./db";
import { computeSynergy } from "./synergy";
import { getPowerSignal } from "./powerSignal";

export interface BudgetSwap {
  current: CardRecord;
  upgrade: CardRecord;
  currentPrice: number;
  upgradePrice: number;
  scoreDelta: number;
}

export interface BudgetAnalysis {
  totalCurrentCost: number;
  totalPremiumCost: number;
  swaps: BudgetSwap[];
}

function cardScore(card: CardRecord, entries: DeckEntry[]): number {
  const syn = computeSynergy(card, entries);
  const signal = getPowerSignal(card, entries);
  return syn.score * 0.5 + signal * 0.5;
}

export async function analyzeBudget(
  entries: DeckEntry[],
  capUsd: number
): Promise<BudgetAnalysis> {
  const mainEntries = entries.filter(
    (e) => e.board === "main" && !e.card.typeLine.includes("Land")
  );

  const totalCurrentCost = mainEntries.reduce(
    (s, e) => s + (e.card.priceUsd ?? 0) * e.quantity,
    0
  );

  const colorSet = new Set<string>();
  for (const e of entries) {
    const ci: string[] = JSON.parse(e.card.colorIdentityJson || "[]");
    ci.forEach((c) => colorSet.add(c));
  }
  const colors = [...colorSet];
  const usedIds = new Set(entries.map((e) => e.card.id));

  let pool = await db.cards.where("legalityStandard").equals("legal").toArray();
  pool = pool.filter((c) => {
    const ci: string[] = JSON.parse(c.colorIdentityJson || "[]");
    return ci.every((col) => colors.includes(col)) && !usedIds.has(c.id);
  });

  const swaps: BudgetSwap[] = [];
  let runningCost = totalCurrentCost;

  const scored = mainEntries
    .map((e) => ({ entry: e, score: cardScore(e.card, entries) }))
    .sort((a, b) => a.score - b.score);

  for (const { entry, score: currentScore } of scored) {
    const currentPrice = entry.card.priceUsd ?? 0;

    const alts = pool
      .filter(
        (c) =>
          Math.abs(c.cmc - entry.card.cmc) <= 1 &&
          (c.priceUsd ?? 0) <= capUsd
      )
      .map((c) => ({ card: c, score: cardScore(c, entries) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const alt of alts) {
      const upgradePrice = alt.card.priceUsd ?? 0;
      const delta = runningCost - currentPrice * entry.quantity + upgradePrice * entry.quantity;

      if (alt.score > currentScore + 0.2 && delta <= capUsd) {
        swaps.push({
          current: entry.card,
          upgrade: alt.card,
          currentPrice,
          upgradePrice,
          scoreDelta: alt.score - currentScore,
        });
        runningCost = delta;
        usedIds.add(alt.card.id);
        pool = pool.filter((c) => c.id !== alt.card.id);
        break;
      }
    }

    if (swaps.length >= 10) break;
  }

  return {
    totalCurrentCost,
    totalPremiumCost: runningCost,
    swaps: swaps.sort((a, b) => b.scoreDelta - a.scoreDelta),
  };
}
