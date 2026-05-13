import { db } from "./db";

export interface SetRecord {
  setCode: string;
  setName: string;
  setType: string | null;
  cardCount: number;
}

/** Derive set records from the cards table (no separate sets API call needed for Phase 1) */
export async function getSetSummaries(): Promise<SetRecord[]> {
  const all = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .toArray();

  const map = new Map<string, SetRecord>();
  for (const card of all) {
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
 * Phase 2 will enrich this with release_date from Scryfall set objects.
 * For now, returns the set list stub for rotation planning.
 */
export async function getSetsForRotationWarning(): Promise<SetRecord[]> {
  return getSetSummaries();
}
