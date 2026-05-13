import Dexie, { Table } from "dexie";
import type { MetaSnapshot, SideboardPlan } from "./metaTypes";

class MetaDB extends Dexie {
  metaSnapshots!: Table<MetaSnapshot, number>;
  sideboardPlans!: Table<SideboardPlan, number>;

  constructor() {
    super("mtgMetaDB");
    this.version(1).stores({
      metaSnapshots: "++id, timestamp, source",
      sideboardPlans: "++id, deckId, vsArchetype, updatedAt",
    });
  }
}

export const metaDB = new MetaDB();

export async function saveSnapshot(snapshot: Omit<MetaSnapshot, "id">): Promise<number> {
  return metaDB.metaSnapshots.add(snapshot as MetaSnapshot);
}

export async function getLatestSnapshot(): Promise<MetaSnapshot | undefined> {
  return metaDB.metaSnapshots.orderBy("timestamp").last();
}

export async function getAllSnapshots(): Promise<MetaSnapshot[]> {
  return metaDB.metaSnapshots.orderBy("timestamp").reverse().toArray();
}

export async function saveSideboardPlan(plan: Omit<SideboardPlan, "id">): Promise<number> {
  const existing = await metaDB.sideboardPlans
    .where("deckId").equals(plan.deckId)
    .and((p) => p.vsArchetype === plan.vsArchetype)
    .first();

  if (existing?.id !== undefined) {
    await metaDB.sideboardPlans.update(existing.id, plan);
    return existing.id;
  }
  return metaDB.sideboardPlans.add(plan as SideboardPlan);
}

export async function getSideboardPlans(deckId: string): Promise<SideboardPlan[]> {
  return metaDB.sideboardPlans.where("deckId").equals(deckId).toArray();
}

export async function deleteSideboardPlan(id: number): Promise<void> {
  return metaDB.sideboardPlans.delete(id);
}
