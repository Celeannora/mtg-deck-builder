import type { MetagameEntry } from "./metagame";

export interface TrendingArchetype {
  archetype: string;
  shareChange: number; // positive = rising
  direction: "up" | "down" | "stable";
}

export function diffMetaSnapshots(
  before: MetagameEntry[],
  after: MetagameEntry[]
): TrendingArchetype[] {
  const beforeMap = new Map(before.map((e) => [e.archetype, e.metaShare]));
  const afterMap = new Map(after.map((e) => [e.archetype, e.metaShare]));
  const archetypes = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  return [...archetypes].map((arch) => {
    const b = beforeMap.get(arch) ?? 0;
    const a = afterMap.get(arch) ?? 0;
    const shareChange = a - b;
    return {
      archetype: arch,
      shareChange,
      direction: shareChange > 0.01 ? "up" : shareChange < -0.01 ? "down" : "stable",
    };
  }).sort((a, b) => Math.abs(b.shareChange) - Math.abs(a.shareChange));
}

export function detectTrendingArchetypes(trends: TrendingArchetype[], direction: "up" | "down" = "up"): TrendingArchetype[] {
  return trends.filter((t) => t.direction === direction).slice(0, 5);
}

export function detectEmergingCards(
  _deckIds: string[]
): string[] {
  // Placeholder — in production compare card appearances across tournament decklists over time
  return ["Atraxa, Grand Unifier", "The One Ring", "Sunfall"];
}
