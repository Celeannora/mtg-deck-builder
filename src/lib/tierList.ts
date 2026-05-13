import type { MetagameEntry } from "./metagame";

export interface TierEntry {
  archetype: string;
  tier: 1 | 2 | 3;
  metaShare: number;
  winRate: number;
  label: string;
}

export function buildTierList(entries: MetagameEntry[]): TierEntry[] {
  return entries
    .sort((a, b) => b.metaShare - a.metaShare || b.winRate - a.winRate)
    .map((e) => ({
      archetype: e.archetype,
      tier: e.tier,
      metaShare: e.metaShare,
      winRate: e.winRate,
      label: `T${e.tier}`,
    }));
}

export function getMetaTier(archetype: string, tierList: TierEntry[]): TierEntry | undefined {
  return tierList.find((t) => t.archetype.toLowerCase().includes(archetype.toLowerCase()));
}

export function compareTierPosition(a: TierEntry, b: TierEntry): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  return b.metaShare - a.metaShare;
}
