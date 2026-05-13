import Dexie, { Table } from "dexie";

export interface OwnedCard {
  oracleId: string;
  quantity: number; // number of regular copies owned
  foilQuantity: number;
  updatedAt: string;
}

class CollectionDB extends Dexie {
  ownedCards!: Table<OwnedCard, string>;

  constructor() {
    super("mtgCollectionDB");
    this.version(1).stores({ ownedCards: "oracleId, updatedAt" });
  }
}

export const collectionDB = new CollectionDB();

export async function markOwned(oracleId: string, quantity: number, foilQuantity = 0): Promise<void> {
  await collectionDB.ownedCards.put({ oracleId, quantity, foilQuantity, updatedAt: new Date().toISOString() });
}

export async function getOwned(oracleId: string): Promise<OwnedCard | undefined> {
  return collectionDB.ownedCards.get(oracleId);
}

export async function getCollection(): Promise<OwnedCard[]> {
  return collectionDB.ownedCards.toArray();
}

export interface MissingCard {
  oracleId: string;
  name: string;
  quantity: number;
  owned: number;
  needed: number;
  priceUsd: number | null;
  acquireCost: number | null;
  tcgPlayerUrl: string;
}

export async function getMissingCards(
  deckCards: { oracleId: string; name: string; quantity: number; priceUsd: number | null }[]
): Promise<MissingCard[]> {
  const missing: MissingCard[] = [];

  for (const dc of deckCards) {
    const owned = await collectionDB.ownedCards.get(dc.oracleId);
    const ownedQty = owned?.quantity ?? 0;
    const needed = Math.max(0, dc.quantity - ownedQty);
    if (needed === 0) continue;

    const acquireCost = dc.priceUsd != null ? dc.priceUsd * needed : null;
    const tcgPlayerUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(dc.name)}&view=grid`;

    missing.push({ oracleId: dc.oracleId, name: dc.name, quantity: dc.quantity, owned: ownedQty, needed, priceUsd: dc.priceUsd, acquireCost, tcgPlayerUrl });
  }

  return missing;
}

// Import collection from MTG Arena CSV export (Name,Quantity format)
export async function importFromArenaCSV(raw: string): Promise<number> {
  const lines = raw.trim().split("\n").slice(1).filter(Boolean);
  let count = 0;

  for (const line of lines) {
    const parts = line.split(",");
    const name = parts[0]?.replace(/"/g, "").trim();
    const qty = Number(parts[1]?.trim() ?? 0);
    if (!name || !qty) continue;

    // Look up oracleId by name
    const { db } = await import("./db");
    const card = await db.cards.where("name").equalsIgnoreCase(name).first();
    if (!card) continue;

    await markOwned(card.oracleId, qty);
    count++;
  }

  return count;
}
