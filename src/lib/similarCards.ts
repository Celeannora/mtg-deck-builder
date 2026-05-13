import type { CardRecord } from "./types";
import { db } from "./db";
import { computeSynergy } from "./synergy";
import { computePowerSignal } from "./powerSignal";
import type { DeckEntry } from "./legality";

const STOP_WORDS = new Set([
  "a","an","the","of","to","in","or","and","is","it","its","as",
  "at","by","for","from","into","on","that","this","with","you",
  "your","each","any","all","another","that","than","then","them",
  "their","those","when","up","can","may","have","has","be","do",
  "not","no","if","one","two","three","target","becomes","become",
  "get","gets","other","put","until","end","turn","under","unless",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[{}/\\,\.\!\?;:]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((w) => b.has(w)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function findSimilarCards(
  card: CardRecord,
  deckEntries: DeckEntry[],
  limit = 10
): Promise<CardRecord[]> {
  const cardTokens = tokenize(`${card.oracleText ?? ""} ${card.typeLine}`);
  const ci: string[] = JSON.parse(card.colorIdentityJson || "[]");

  let pool = await db.cards.where("legalityStandard").equals("legal").toArray();

  // Same color identity
  pool = pool.filter((c) => {
    if (c.id === card.id) return false;
    const cCi: string[] = JSON.parse(c.colorIdentityJson || "[]");
    return cCi.every((col) => ci.includes(col));
  });

  // CMC ±1
  pool = pool.filter((c) => Math.abs(c.cmc - card.cmc) <= 1);

  return pool
    .map((c) => {
      const tokens = tokenize(`${c.oracleText ?? ""} ${c.typeLine}`);
      const textSim = jaccardSimilarity(cardTokens, tokens);
      const syn = computeSynergy(c, deckEntries);
      const pw = computePowerSignal(c, syn.score);
      return { c, score: textSim * 0.6 + pw.cardScore * 0.04 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ c }) => c);
}
