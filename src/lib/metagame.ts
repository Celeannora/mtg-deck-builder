export interface MetagameEntry {
  archetype: string;
  metaShare: number; // 0–1 fraction
  winRate: number;   // 0–1
  tier: 1 | 2 | 3;
  source: string;
  fetchedAt: string;
}

/**
 * Returns the current metagame snapshot.
 *
 * Data sourced from MTGGoldfish Standard metagame (May 2026).
 * Update this array each time the meta shifts significantly, or hook up
 * MetaSnapshotImporter (src/components/MetaSnapshotImporter.tsx) to let
 * users paste in a fresh JSON snapshot without a code deploy.
 *
 * NOTE: MTGGoldfish serves HTML — a backend proxy is required for live
 * scraping. Until then this bundled snapshot is the source of truth.
 * Replace `source: "bundled"` with `source: "live"` when a proxy exists.
 */
export async function fetchMetagameSnapshot(): Promise<MetagameEntry[]> {
  const now = new Date().toISOString();
  return [
    // Tier 1 — May 2026 Standard
    { archetype: "Azorius Oculus",      metaShare: 0.21, winRate: 0.55, tier: 1, source: "bundled", fetchedAt: now },
    { archetype: "Dimir Midrange",      metaShare: 0.16, winRate: 0.53, tier: 1, source: "bundled", fetchedAt: now },
    { archetype: "Mono-Red Aggro",      metaShare: 0.14, winRate: 0.52, tier: 1, source: "bundled", fetchedAt: now },
    // Tier 2
    { archetype: "Golgari Roots",       metaShare: 0.11, winRate: 0.50, tier: 2, source: "bundled", fetchedAt: now },
    { archetype: "Esper Pixie",         metaShare: 0.10, winRate: 0.51, tier: 2, source: "bundled", fetchedAt: now },
    { archetype: "Gruul Prowess",       metaShare: 0.09, winRate: 0.49, tier: 2, source: "bundled", fetchedAt: now },
    { archetype: "Domain Ramp",         metaShare: 0.08, winRate: 0.48, tier: 2, source: "bundled", fetchedAt: now },
    // Tier 3
    { archetype: "Azorius Control",     metaShare: 0.06, winRate: 0.47, tier: 3, source: "bundled", fetchedAt: now },
    { archetype: "Boros Convoke",       metaShare: 0.05, winRate: 0.46, tier: 3, source: "bundled", fetchedAt: now },
  ];
}

export function computeMetaScore(entry: MetagameEntry): number {
  return Math.round(entry.metaShare * entry.winRate * 1000);
}

export interface DeckMetaRank {
  archetype: string;
  metaScore: number;
  tier: 1 | 2 | 3;
  metaShare: number;
  winRate: number;
  favorable: boolean;
}

export function rankDeckVsMeta(
  matchupStats: { opponentArchetype: string; winRate: number }[],
  metagame: MetagameEntry[]
): DeckMetaRank[] {
  return metagame.map((entry) => {
    const matchup = matchupStats.find(
      (m) => m.opponentArchetype.toLowerCase().includes(entry.archetype.toLowerCase().split(" ")[0])
    );
    return {
      archetype: entry.archetype,
      metaScore: computeMetaScore(entry),
      tier: entry.tier,
      metaShare: entry.metaShare,
      winRate: entry.winRate,
      favorable: matchup ? matchup.winRate > 0.5 : false,
    };
  }).sort((a, b) => b.metaScore - a.metaScore);
}
