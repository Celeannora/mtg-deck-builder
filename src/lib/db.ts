import Dexie, { type Table } from "dexie";
import type { CardRecord, DatabaseStatus, SetRecord } from "./types";

export interface ImportMeta {
  key: string;
  value: string;
}

export interface UserDeck {
  id: string;
  name: string;
  archetypeTag: string | null;
  createdAt: string;
  updatedAt: string;
  mainboardJson: string;
  sideboardJson: string;
  notes: string | null;
  metaTier: string | null;
  winRate: number | null;
  pinnedCardIds: string[];
}

export interface DeckVersion {
  id?: number;
  deckId: string;
  mainboardJson: string;
  sideboardJson: string;
  savedAt: string;
}

const STALE_HOURS = 12;

export class MTGDeckBuilderDB extends Dexie {
  cards!: Table<CardRecord, string>;
  cardSets!: Table<SetRecord, string>;
  userDecks!: Table<UserDeck, string>;
  deckVersions!: Table<DeckVersion, number>;
  meta!: Table<ImportMeta, string>;

  constructor() {
    super("mtgDeckBuilderDB");

    this.version(2).stores({
      cards: [
        "id",
        "oracleId",
        "name",
        "cmc",
        "legalityStandard",
        "legalityFuture",
        "bannedInStandard",
        "setCode",
        "setName",
        "rarity",
        "releasedAt",
        "imageNormal",
        "importedAt",
        "typeLine",
      ].join(","),
      cardSets: "code, name, releaseDate, setType, importedAt",
      userDecks: "id, archetypeTag, createdAt, updatedAt",
      deckVersions: "++id, deckId, savedAt",
      meta: "key",
    });
  }
}

export const db = new MTGDeckBuilderDB();

export async function replaceAllCards(
  cards: CardRecord[],
  sets: SetRecord[],
  importedAt: string
): Promise<void> {
  await db.transaction("rw", db.cards, db.cardSets, db.meta, async () => {
    await db.cards.clear();
    await db.cardSets.clear();
    await db.cards.bulkPut(cards);
    await db.cardSets.bulkPut(sets);
    await db.meta.bulkPut([
      { key: "lastImportedAt", value: importedAt },
      { key: "cardCount", value: String(cards.length) },
      { key: "setCount", value: String(sets.length) },
    ]);
  });
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const [cardCount, setCount, lastMeta] = await Promise.all([
    db.cards.count(),
    db.cardSets.count(),
    db.meta.get("lastImportedAt"),
  ]);

  const lastImportedAt = lastMeta?.value ?? null;
  const isStale = lastImportedAt
    ? Date.now() - new Date(lastImportedAt).getTime() > STALE_HOURS * 60 * 60 * 1000
    : true;

  return {
    cardCount,
    setCount,
    lastImportedAt,
    isStale,
    isEmpty: cardCount === 0,
  };
}

export async function isDatabaseStale(): Promise<boolean> {
  const status = await getDatabaseStatus();
  return status.isStale;
}

export async function saveDeck(deck: UserDeck): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction("rw", db.userDecks, db.deckVersions, async () => {
    await db.userDecks.put({ ...deck, updatedAt: now });
    await db.deckVersions.add({
      deckId: deck.id,
      mainboardJson: deck.mainboardJson,
      sideboardJson: deck.sideboardJson,
      savedAt: now,
    });
    // Keep only last 20 versions per deck
    const versions = await db.deckVersions
      .where("deckId")
      .equals(deck.id)
      .sortBy("savedAt");
    if (versions.length > 20) {
      const toDelete = versions.slice(0, versions.length - 20).map((v) => v.id!);
      await db.deckVersions.bulkDelete(toDelete);
    }
  });
}

export async function getDeckVersions(deckId: string): Promise<DeckVersion[]> {
  return db.deckVersions.where("deckId").equals(deckId).sortBy("savedAt");
}
