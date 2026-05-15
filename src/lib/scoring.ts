/**
 * scoring.ts — Composite card scoring (0–100)
 *
 * Combines three sub-scores into a single normalized value with letter grades.
 * Used by ArchetypePanel, SuggestionPanel, and AdvisorPanel.
 */

import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";
import { computeSynergy } from "./synergy";
import { getPowerSignal } from "./powerSignal";
import { computePowerScore } from "./powerScore";

export type Grade = "S" | "A" | "B" | "C" | "D";

export interface ScoredCard {
  card: CardRecord;
  composite: number;    // 0–100
  powerScore: number;   // 0–40
  signalScore: number;  // 0–30
  synergyScore: number; // 0–30
  grade: Grade;
}

function toGrade(score: number): Grade {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function scoreCard(card: CardRecord, deckEntries: DeckEntry[]): ScoredCard {
  const synResult    = computeSynergy(card, deckEntries);
  const synergyScore = Math.min(30, synResult.score);
  const signalScore  = getPowerSignal(card, deckEntries);
  const powerScore   = Math.min(40, computePowerScore(card) * 40);
  const composite    = Math.round(powerScore + signalScore + synergyScore);

  return {
    card,
    composite: Math.min(100, composite),
    powerScore,
    signalScore,
    synergyScore,
    grade: toGrade(composite),
  };
}

export function scoreDeck(entries: DeckEntry[]): ScoredCard[] {
  return entries
    .filter((e) => e.board === "main" && !e.card.typeLine.includes("Land"))
    .map((e) => scoreCard(e.card, entries))
    .sort((a, b) => b.composite - a.composite);
}

export function rankCandidates(
  candidates: CardRecord[],
  deckEntries: DeckEntry[]
): ScoredCard[] {
  return candidates
    .map((c) => scoreCard(c, deckEntries))
    .sort((a, b) => b.composite - a.composite);
}
