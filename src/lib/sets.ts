/**
 * Phase 1+2 — Set metadata utilities
 *
 * Derives Standard-legal set information from the cards already stored in
 * IndexedDB. Scryfall doesn't include a separate sets table in the oracle_cards
 * bulk file, so we reconstruct set metadata from the card records themselves.
 */

import { db } from "./db";

export interface SetMeta {
  setCode: string;
  setName: string;
  setType: string | null;
  cardCount: number;
}

export interface DbStats {
  cardCount: number;
  lastImportedAt: string | null;
  setCount: number;
}

/**
 * Returns all distinct Standard-legal sets derived from the card records.
 */
export async function getStandardSets(): Promise<SetMeta[]> {
  const cards = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .toArray();

  const map = new Map<string, SetMeta>();

  for (const card of cards) {
    const existing = map.get(card.setCode);
    if (existing) {
      existing.cardCount++;
    } else {
      map.set(card.setCode, {
        setCode: card.setCode,
        setName: card.setName,
        setType: card.setType,
        cardCount: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.setName.localeCompare(b.setName)
  );
}

/**
 * Returns all cards with legalityFuture === 'legal' (Coming Soon).
 */
export async function getFutureCards() {
  return db.cards.where("legalityFuture").equals("legal").toArray();
}

/**
 * Returns high-level DB stats for the status bar.
 */
export async function getDbStats(): Promise<DbStats> {
  const [cardCount, metaRows, sets] = await Promise.all([
    db.cards.count(),
    db.meta.toArray(),
    getStandardSets(),
  ]);

  const lastImportedAtRow = metaRows.find((r) => r.key === "lastImportedAt");

  return {
    cardCount,
    lastImportedAt: lastImportedAtRow?.value ?? null,
    setCount: sets.length,
  };
}
