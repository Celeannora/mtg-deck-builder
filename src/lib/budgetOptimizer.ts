import type { DeckEntry } from "./legality";
import type { CardRecord } from "./types";
import { db } from "./db";
import { computeSynergy } from "./synergy";
import { computePowerSignal } from "./powerSignal";

export interface BudgetSwap {
  current: CardRecord;
  upgrade: CardRecord;
  currentPrice: number;
  upgradePrice: number;
  costDelta: number;
  scoreDelta: number;
}

export interface BudgetAnalysis {
  totalCurrentCost: number;
  totalPremiumCost: number;
  swaps: BudgetSwap[];
}

function cardScore(card: CardRecord, entries: DeckEntry[]): number {
  const syn = computeSynergy(card, entries);
  const pw  = computePowerSignal(card, syn.score);
  return pw.cardScore;
}

export async function analyzeBudget(
  entries: DeckEntry[],
  budgetCap: number
): Promise<BudgetAnalysis> {
  const mainEntries = entries.filter((e) => e.board === "main" && !e.card.typeLine.includes("Land"));
  const totalCurrentCost = mainEntries.reduce(
    (s, e) => s + (e.card.priceUsd ?? 0) * e.quantity, 0
  );

  const colorSet = new Set<string>();
  for (const e of entries) {
    const ci: string[] = JSON.parse(e.card.colorIdentityJson || "[]");
    ci.forEach((c) => colorSet.add(c));
  }
  const colors = [...colorSet];

  let pool = await db.cards.where("legalityStandard").equals("legal").toArray();
  pool = pool.filter((c) => {
    const ci: string[] = JSON.parse(c.colorIdentityJson || "[]");
    return ci.every((col) => colors.includes(col));
  });

  const usedIds = new Set(entries.map((e) => e.card.id));
  const swaps: BudgetSwap[] = [];
  let remainingBudget = budgetCap - totalCurrentCost;

  for (const entry of mainEntries) {
    if (remainingBudget <= 0) break;

    const currentPrice = (entry.card.priceUsd ?? 0) * entry.quantity;
    const currentScore = cardScore(entry.card, entries);

    // Find a higher-scored card in same CMC ±1 that fits remaining budget
    const alts = pool
      .filter(
        (c) =>
          !usedIds.has(c.id) &&
          c.id !== entry.card.id &&
          Math.abs(c.cmc - entry.card.cmc) <= 1 &&
          (c.priceUsd ?? 0) * entry.quantity <= remainingBudget + currentPrice
      )
      .map((c) => ({
        c,
        score: cardScore(c, entries),
        price: (c.priceUsd ?? 0) * entry.quantity,
      }))
      .filter((x) => x.score > currentScore + 0.5)
      .sort((a, b) => b.score - a.score);

    if (alts.length > 0) {
      const best = alts[0];
      const costDelta = best.price - currentPrice;
      if (remainingBudget - costDelta >= 0) {
        swaps.push({
          current: entry.card,
          upgrade: best.c,
          currentPrice,
          upgradePrice: best.price,
          costDelta,
          scoreDelta: best.score - currentScore,
        });
        remainingBudget -= costDelta;
        usedIds.add(best.c.id);
      }
    }
  }

  const totalPremiumCost = totalCurrentCost + swaps.reduce((s, sw) => s + sw.costDelta, 0);

  return {
    totalCurrentCost,
    totalPremiumCost,
    swaps: swaps.sort((a, b) => b.scoreDelta - a.scoreDelta).slice(0, 10),
  };
}
