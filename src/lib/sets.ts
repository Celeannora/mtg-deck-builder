import { db } from "./db";
import type { CardRecord } from "./types";

export interface SetInfo {
  code: string;
  name: string;
  cardCount: number;
}

/**
 * Derives Standard set metadata directly from the cards table.
 * Phase 2 can enrich with release dates from Scryfall set objects.
 */
export async function getStandardSets(): Promise<SetInfo[]> {
  const cards = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .toArray();

  const map = new Map<string, SetInfo>();
  for (const card of cards) {
    const existing = map.get(card.setCode);
    if (existing) {
      existing.cardCount++;
    } else {
      map.set(card.setCode, {
        code: card.setCode,
        name: card.setName,
        cardCount: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Cards whose legalityFuture = "legal" but not yet Standard-legal.
 * Surfaced under the "Coming Soon" toggle in the UI.
 */
export async function getFutureCards(): Promise<CardRecord[]> {
  return db.cards.where("legalityFuture").equals("legal").toArray();
}

export async function getDbStats(): Promise<{
  cardCount: number;
  lastImportedAt: string | null;
}> {
  const countMeta = await db.meta.get("cardCount");
  const tsMeta = await db.meta.get("lastImportedAt");
  return {
    cardCount: Number(countMeta?.value ?? 0),
    lastImportedAt: tsMeta?.value ?? null,
  };
}
