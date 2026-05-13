import { db } from "./db";
import type { DeckVersion } from "./types";

const DEBOUNCE_MS = 500;
const MAX_VERSIONS = 20;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface DeckSnapshot {
  mainboard: Record<string, number>; // oracleId -> quantity
  sideboard: Record<string, number>;
  name: string;
  notes?: string;
}

export function autosaveDeck(deckId: string, snapshot: DeckSnapshot): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => persistVersion(deckId, snapshot), DEBOUNCE_MS);
}

async function persistVersion(deckId: string, snapshot: DeckSnapshot): Promise<void> {
  await db.deckVersions.add({
    deckId,
    savedAt: new Date().toISOString(),
    mainboardJson: JSON.stringify(snapshot.mainboard),
    sideboardJson: JSON.stringify(snapshot.sideboard),
    name: snapshot.name,
    notes: snapshot.notes ?? "",
  } as unknown as DeckVersion);

  // Prune to MAX_VERSIONS
  const all = await db.deckVersions
    .where("deckId").equals(deckId)
    .sortBy("savedAt");

  if (all.length > MAX_VERSIONS) {
    const toDelete = all.slice(0, all.length - MAX_VERSIONS).map((v) => (v as unknown as { id: number }).id);
    await db.deckVersions.bulkDelete(toDelete);
  }
}

export async function getDeckVersions(deckId: string): Promise<(DeckVersion & { id: number })[]> {
  return db.deckVersions
    .where("deckId").equals(deckId)
    .reverse()
    .sortBy("savedAt") as unknown as Promise<(DeckVersion & { id: number })[]>;
}

export async function restoreDeckVersion(versionId: number): Promise<DeckSnapshot | null> {
  const v = await db.deckVersions.get(versionId) as unknown as (DeckVersion & { id: number; mainboardJson: string; sideboardJson: string }) | undefined;
  if (!v) return null;
  return {
    mainboard: JSON.parse(v.mainboardJson),
    sideboard: JSON.parse(v.sideboardJson),
    name: v.name ?? "",
    notes: v.notes ?? "",
  };
}

export interface DeckDiff {
  added: { name: string; oracleId: string; delta: number }[];
  removed: { name: string; oracleId: string; delta: number }[];
}

export async function diffDeckVersions(aId: number, bId: number): Promise<DeckDiff> {
  const [a, b] = await Promise.all([
    db.deckVersions.get(aId) as unknown as { mainboardJson: string } | undefined,
    db.deckVersions.get(bId) as unknown as { mainboardJson: string } | undefined,
  ]);
  if (!a || !b) return { added: [], removed: [] };

  const aBoard: Record<string, number> = JSON.parse(a.mainboardJson);
  const bBoard: Record<string, number> = JSON.parse(b.mainboardJson);
  const allIds = new Set([...Object.keys(aBoard), ...Object.keys(bBoard)]);

  const added: DeckDiff["added"] = [];
  const removed: DeckDiff["removed"] = [];

  for (const oracleId of allIds) {
    const qA = aBoard[oracleId] ?? 0;
    const qB = bBoard[oracleId] ?? 0;
    const delta = qB - qA;
    if (delta === 0) continue;
    const card = await db.cards.where("oracleId").equals(oracleId).first();
    const name = card?.name ?? oracleId;
    if (delta > 0) added.push({ name, oracleId, delta });
    else removed.push({ name, oracleId, delta: Math.abs(delta) });
  }

  return { added, removed };
}

export async function forkDeck(deckId: string, newName: string): Promise<string> {
  const versions = await getDeckVersions(deckId);
  const latest = versions[0];
  const newId = `deck_${Date.now()}`;
  if (latest) await persistVersion(newId, await restoreDeckVersion((latest as unknown as { id: number }).id) ?? { mainboard: {}, sideboard: {}, name: newName });
  return newId;
}
