import Dexie, { Table } from "dexie";
import type { CardRecord } from "./types";

export interface ImportMeta {
  key: string;
  value: string;
}

export interface SavedDeck {
  id: string;
  name: string;
  updatedAt: number;
  mainboard: Record<string, number>;
  sideboard: Record<string, number>;
  wins: number;
  losses: number;
  draws: number;
}

export interface MatchResult {
  id?: number;
  deckId: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  notes: string;
  playedAt: number;
}

export interface DatabaseStatus {
  cardCount: number;
  lastImportedAt: string | null;
  isReady: boolean;
}

export class MTGDeckBuilderDB extends Dexie {
  cards!:        Table<CardRecord,   string>;
  meta!:         Table<ImportMeta,   string>;
  savedDecks!:   Table<SavedDeck,    string>;
  matchResults!: Table<MatchResult,  number>;

  constructor() {
    super("mtgDeckBuilderDB");

    this.version(1).stores({
      cards: `
        id,
        oracleId,
        name,
        cmc,
        legalityStandard,
        legalityFuture,
        bannedInStandard,
        setCode,
        setName,
        rarity,
        imageNormal,
        importedAt,
        *keywordsJson,
        *colorsJson,
        *colorIdentityJson,
        typeLine
      `,
      meta: "key",
    });

    this.version(2).stores({
      cards: `
        id,
        oracleId,
        name,
        cmc,
        legalityStandard,
        legalityFuture,
        bannedInStandard,
        setCode,
        setName,
        rarity,
        imageNormal,
        importedAt,
        *keywordsJson,
        *colorsJson,
        *colorIdentityJson,
        typeLine
      `,
      meta:         "key",
      savedDecks:   "id, updatedAt",
      matchResults: "++id, deckId, playedAt",
    });
  }
}

export const db = new MTGDeckBuilderDB();

export async function replaceAllCards(cards: CardRecord[], importedAt: string) {
  await db.transaction("rw", db.cards, db.meta, async () => {
    await db.cards.clear();
    await db.cards.bulkPut(cards);
    await db.meta.bulkPut([
      { key: "lastImportedAt", value: importedAt },
      { key: "cardCount",      value: String(cards.length) },
    ]);
  });
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const [cardCountMeta, lastImportedAtMeta] = await Promise.all([
    db.meta.get("cardCount"),
    db.meta.get("lastImportedAt"),
  ]);
  const cardCount = cardCountMeta ? parseInt(cardCountMeta.value, 10) : 0;
  return {
    cardCount,
    lastImportedAt: lastImportedAtMeta?.value ?? null,
    isReady: cardCount > 0,
  };
}
