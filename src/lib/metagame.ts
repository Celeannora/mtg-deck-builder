export interface MetagameEntry {
  archetype: string;
  metaShare: number; // 0–1 fraction
  winRate: number;   // 0–1
  tier: 1 | 2 | 3;
  source: string;
  fetchedAt: string;
}

// Stub: in production, route through a server-side proxy to avoid CORS.
// MTGGoldfish /metagame/standard/ returns HTML; parsing requires a backend.
export async function fetchMetagameSnapshot(): Promise<MetagameEntry[]> {
  // Hardcoded representative snapshot for offline/demo use.
  // Replace with proxy fetch + HTML parse when a backend is available.
  const now = new Date().toISOString();
  return [
    { archetype: "Domain Ramp",      metaShare: 0.18, winRate: 0.53, tier: 1, source: "stub", fetchedAt: now },
    { archetype: "Esper Midrange",   metaShare: 0.15, winRate: 0.54, tier: 1, source: "stub", fetchedAt: now },
    { archetype: "Mono-Red Aggro",   metaShare: 0.13, winRate: 0.51, tier: 1, source: "stub", fetchedAt: now },
    { archetype: "Azorius Soldiers", metaShare: 0.10, winRate: 0.50, tier: 2, source: "stub", fetchedAt: now },
    { archetype: "Grixis Midrange",  metaShare: 0.09, winRate: 0.49, tier: 2, source: "stub", fetchedAt: now },
    { archetype: "Jund Midrange",    metaShare: 0.08, winRate: 0.51, tier: 2, source: "stub", fetchedAt: now },
    { archetype: "White Weenie",     metaShare: 0.07, winRate: 0.48, tier: 2, source: "stub", fetchedAt: now },
    { archetype: "Control",          metaShare: 0.06, winRate: 0.47, tier: 3, source: "stub", fetchedAt: now },
  ];
}

export function computeMetaScore(entry: MetagameEntry): number {
  // Weighted score: share * win rate, normalized 0–100
  return Math.round(entry.metaShare * entry.winRate * 1000);
}

export interface DeckMetaRank {
  archetype: string;
  metaScore: number;
  tier: 1 | 2 | 3;
  metaShare: number;
  winRate: number;
  favorable: boolean; // true if deck wins more than it loses vs this archetype
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
