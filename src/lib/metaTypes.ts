import type { CardRecord } from "./types";

export type MetaGrade = "A" | "B" | "C" | "D" | "F";

export interface ArchetypeEntry {
  name: string;
  metaShare: number; // 0-100
  colors: string;
  tier: 1 | 2 | 3 | 4;
  sampleCards?: string[];
}

export interface MetaSnapshot {
  id?: number;
  timestamp: string;
  source: "manual" | "mtggoldfish" | "mtgdecks" | "mtgo" | "json" | "csv";
  archetypes: ArchetypeEntry[];
  rawData?: string;
}

export type MatchupRating = number; // 0-100, 50 = even

export interface MatchupMatrix {
  /** matchup[A][B] = win rate of A vs B */
  matchup: Record<string, Record<string, MatchupRating>>;
  archetypes: string[];
  generatedAt: string;
}

export interface SideboardPlanEntry {
  cardName: string;
  quantity: number;
  direction: "in" | "out";
}

export interface SideboardPlan {
  id?: number;
  deckId: string;
  vsArchetype: string;
  entries: SideboardPlanEntry[];
  notes?: string;
  updatedAt: string;
}

export interface RotatingCardInfo {
  cardName: string;
  setCode: string;
  setName: string;
  rotatesAt: string;
  replacements: CardRecord[];
}

export interface RotationImpactReport {
  deckId: string;
  rotatingCards: RotatingCardInfo[];
  severity: "low" | "medium" | "high";
  generatedAt: string;
}

export interface MetaPositionResult {
  score: number; // 0-100
  grade: MetaGrade;
  favorableMatchups: string[];
  unfavorableMatchups: string[];
  weightedWinRates: Record<string, number>;
  fieldCoverage: number; // % of meta by share covered
}

export interface MetaMatchupAdvisory {
  archetype: string;
  metaShare: number;
  estimatedWinRate: number;
  status: "favored" | "even" | "unfavored";
  sideboardSuggestions: string[];
}
