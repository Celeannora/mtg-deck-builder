import type { MatchupMatrix, MatchupRating } from "./metaTypes";

// Archetype type taxonomy for heuristic triangle
const ARCHETYPE_TYPE: Record<string, "aggro" | "control" | "combo" | "midrange" | "ramp" | "tempo"> = {
  // Aggro
  "Mono Red Aggro": "aggro",
  "Izzet Prowess": "aggro",
  "Mono White Aggro": "aggro",
  // Midrange
  "Dimir Midrange": "midrange",
  "Golgari Roots": "midrange",
  "Mono Black Demons": "midrange",
  "Jund Midrange": "midrange",
  // Control
  "Azorius Control": "control",
  "Esper Control": "control",
  "Dimir Control": "control",
  // Combo
  "Azorius Combo": "combo",
  "Temur Combo": "combo",
  // Ramp
  "Domain Ramp": "ramp",
  "Temur Ramp": "ramp",
  // Tempo
  "Dimir Tempo": "tempo",
  "Izzet Tempo": "tempo",
};

type ArchetypeType = "aggro" | "control" | "combo" | "midrange" | "ramp" | "tempo" | "unknown";

function getType(name: string): ArchetypeType {
  const direct = ARCHETYPE_TYPE[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  if (lower.includes("aggro") || lower.includes("burn") || lower.includes("prowess")) return "aggro";
  if (lower.includes("control")) return "control";
  if (lower.includes("combo")) return "combo";
  if (lower.includes("ramp")) return "ramp";
  if (lower.includes("tempo")) return "tempo";
  if (lower.includes("midrange") || lower.includes("demons") || lower.includes("roots")) return "midrange";
  return "unknown";
}

// Heuristic win rates by type pair (A vs B)
const TYPE_MATRIX: Record<ArchetypeType, Partial<Record<ArchetypeType, MatchupRating>>> = {
  aggro:    { aggro: 50, control: 45, combo: 60, midrange: 55, ramp: 58, tempo: 50, unknown: 50 },
  control:  { aggro: 55, control: 50, combo: 55, midrange: 52, ramp: 48, tempo: 52, unknown: 50 },
  combo:    { aggro: 40, control: 45, combo: 50, midrange: 52, ramp: 50, tempo: 48, unknown: 50 },
  midrange: { aggro: 45, control: 48, combo: 48, midrange: 50, ramp: 52, tempo: 50, unknown: 50 },
  ramp:     { aggro: 42, control: 52, combo: 50, midrange: 48, ramp: 50, tempo: 48, unknown: 50 },
  tempo:    { aggro: 50, control: 48, combo: 52, midrange: 50, ramp: 52, tempo: 50, unknown: 50 },
  unknown:  { aggro: 50, control: 50, combo: 50, midrange: 50, ramp: 50, tempo: 50, unknown: 50 },
};

export function computeMatchupMatrix(archetypeNames: string[]): MatchupMatrix {
  const matchup: Record<string, Record<string, MatchupRating>> = {};

  for (const a of archetypeNames) {
    matchup[a] = {};
    const typeA = getType(a);
    for (const b of archetypeNames) {
      if (a === b) {
        matchup[a][b] = 50;
        continue;
      }
      const typeB = getType(b);
      const base = TYPE_MATRIX[typeA][typeB] ?? 50;
      // Add small noise ±3 seeded deterministically from name length difference
      const jitter = ((a.length - b.length) % 5) * 0.6;
      matchup[a][b] = Math.round(Math.min(70, Math.max(30, base + jitter)));
    }
  }

  return { matchup, archetypes: archetypeNames, generatedAt: new Date().toISOString() };
}

export function getMatchupRating(
  matrix: MatchupMatrix,
  yourArchetype: string,
  vsArchetype: string
): MatchupRating {
  return matrix.matchup[yourArchetype]?.[vsArchetype] ?? 50;
}

export function getMatchupStatus(
  rating: MatchupRating
): "favored" | "even" | "unfavored" {
  if (rating >= 55) return "favored";
  if (rating <= 44) return "unfavored";
  return "even";
}
