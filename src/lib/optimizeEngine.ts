import type { DeckEntry } from "./legality";
import type { CardRecord } from "./types";
import { computeSynergy } from "./synergy";
import { computePowerSignal } from "./powerSignal";
import { db } from "./db";

export interface SwapSuggestion {
  remove: CardRecord;
  add: CardRecord;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  reason: string;
}

function cardScore(card: CardRecord, entries: DeckEntry[]): number {
  const syn = computeSynergy(card, entries);
  const pw  = computePowerSignal(card, syn.score);
  return pw.cardScore;
}

async function getCandidatePool(entries: DeckEntry[]): Promise<CardRecord[]> {
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
  return pool;
}

export async function optimizeDeck(entries: DeckEntry[]): Promise<SwapSuggestion[]> {
  const mainEntries = entries.filter((e) => e.board === "main" && !e.card.typeLine.includes("Land"));
  const pool = await getCandidatePool(entries);
  const usedIds = new Set(entries.map((e) => e.card.id));

  // Score every main card
  const scored = mainEntries.map((e) => ({
    entry: e,
    score: cardScore(e.card, entries),
  })).sort((a, b) => a.score - b.score);

  // Bottom 10 by score
  const bottom = scored.slice(0, Math.min(10, scored.length));

  const suggestions: SwapSuggestion[] = [];

  for (const { entry, score: scoreBefore } of bottom) {
    // Find top 3 alternatives: same CMC ±1, not already in deck
    const alts = pool
      .filter(
        (c) =>
          !usedIds.has(c.id) &&
          Math.abs(c.cmc - entry.card.cmc) <= 1 &&
          c.id !== entry.card.id
      )
      .map((c) => ({
        card: c,
        score: cardScore(c, entries.filter((e) => e.card.id !== entry.card.id)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const alt of alts) {
      if (alt.score > scoreBefore + 0.3) {
        suggestions.push({
          remove: entry.card,
          add: alt.card,
          scoreBefore,
          scoreAfter: alt.score,
          delta: alt.score - scoreBefore,
          reason: `Higher synergy + power signal at MV ${alt.card.cmc}`,
        });
        break;
      }
    }
  }

  return suggestions.sort((a, b) => b.delta - a.delta).slice(0, 10);
}
