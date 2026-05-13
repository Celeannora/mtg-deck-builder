import Dexie, { type Table } from "dexie";
import type { CardRecord } from "./types";

export interface ImportMeta {
  key: string;
  value: string;
}

export class MTGDeckBuilderDB extends Dexie {
  cards!: Table<CardRecord, string>;
  meta!: Table<ImportMeta, string>;

  constructor() {
    super("mtgDeckBuilderDB");

    this.version(1).stores({
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
        "imageNormal",
        "importedAt",
        "*keywordsJson",
        "*colorsJson",
        "*colorIdentityJson",
        "typeLine",
      ].join(","),
      meta: "key",
    });
  }
}

export const db = new MTGDeckBuilderDB();

export async function replaceAllCards(
  cards: CardRecord[],
  importedAt: string
): Promise<void> {
  await db.transaction("rw", db.cards, db.meta, async () => {
    await db.cards.clear();
    await db.cards.bulkPut(cards);
    await db.meta.bulkPut([
      { key: "lastImportedAt", value: importedAt },
      { key: "cardCount", value: String(cards.length) },
    ]);
  });
}
