import type { ArchetypeEntry, MetaGrade, MetaMatchupAdvisory, MetaPositionResult } from "./metaTypes";
import { computeMatchupMatrix, getMatchupStatus } from "./matchupMatrix";

export function gradeMetaScore(score: number): MetaGrade {
  if (score >= 57) return "A";
  if (score >= 53) return "B";
  if (score >= 49) return "C";
  if (score >= 44) return "D";
  return "F";
}

export function computeMetaPositionScore(
  yourArchetype: string,
  snapshot: ArchetypeEntry[]
): MetaPositionResult {
  const archetypeNames = snapshot.map((a) => a.name);
  const matrix = computeMatchupMatrix([yourArchetype, ...archetypeNames]);

  let weightedSum = 0;
  let totalShare = 0;
  const weightedWinRates: Record<string, number> = {};
  const favorableMatchups: string[] = [];
  const unfavorableMatchups: string[] = [];

  for (const entry of snapshot) {
    const wr = matrix.matchup[yourArchetype]?.[entry.name] ?? 50;
    const share = entry.metaShare / 100;
    weightedSum += wr * share;
    totalShare += share;
    weightedWinRates[entry.name] = wr;
    const status = getMatchupStatus(wr);
    if (status === "favored") favorableMatchups.push(entry.name);
    if (status === "unfavored") unfavorableMatchups.push(entry.name);
  }

  const score = totalShare > 0 ? Math.round(weightedSum / totalShare) : 50;

  return {
    score,
    grade: gradeMetaScore(score),
    favorableMatchups,
    unfavorableMatchups,
    weightedWinRates,
    fieldCoverage: Math.min(100, Math.round(totalShare * 100)),
  };
}

export function getMetaMatchupAdvisory(
  yourArchetype: string,
  snapshot: ArchetypeEntry[]
): MetaMatchupAdvisory[] {
  const archetypeNames = snapshot.map((a) => a.name);
  const matrix = computeMatchupMatrix([yourArchetype, ...archetypeNames]);

  return snapshot
    .sort((a, b) => b.metaShare - a.metaShare)
    .map((entry) => {
      const wr = matrix.matchup[yourArchetype]?.[entry.name] ?? 50;
      const status = getMatchupStatus(wr);
      const suggestions: string[] = [];

      if (status === "unfavored") {
        suggestions.push(`Add graveyard hate vs ${entry.name}`);
        suggestions.push(`Consider additional removal targeting key threats`);
      } else if (status === "favored") {
        suggestions.push(`Protect your advantage — don't over-sideboard`);
      }

      return {
        archetype: entry.name,
        metaShare: entry.metaShare,
        estimatedWinRate: wr,
        status,
        sideboardSuggestions: suggestions,
      };
    });
}
