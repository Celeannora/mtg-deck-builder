/**
 * scoring.ts — Composite card scoring engine
 *
 * Combines powerScore, powerSignal, and synergy into a single
 * normalized 0–100 score per card, relative to the current deck.
 */

import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";
import { computePowerScore } from "./powerScore";
import { getPowerSignal } from "./powerSignal";
import { computeSynergyScore } from "./synergy";

export interface CardScore {
  cardId: string;
  cardName: string;
  powerScore: number;   // 0–40: raw card quality
  signalScore: number;  // 0–30: role/signal alignment with archetype
  synergyScore: number; // 0–30: keyword/mechanic overlap with deck
  total: number;        // 0–100 composite
  grade: "S" | "A" | "B" | "C" | "D";
  breakdown: string[];
}

function toGrade(score: number): CardScore["grade"] {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

/**
 * Score a single card in the context of the current deck entries.
 * Returns a normalized 0–100 composite with grade and breakdown.
 */
export function scoreCard(
  card: CardRecord,
  deckEntries: DeckEntry[]
): CardScore {
  const power = Math.min(40, computePowerScore(card));
  const signal = Math.min(30, getPowerSignal(card, deckEntries));
  const synergy = Math.min(30, computeSynergyScore(card, deckEntries));
  const total = Math.round(power + signal + synergy);

  const breakdown: string[] = [];
  if (power >= 28) breakdown.push("High raw power");
  else if (power >= 18) breakdown.push("Solid raw power");
  else breakdown.push("Low raw power");

  if (signal >= 20) breakdown.push("Strong role fit");
  else if (signal >= 10) breakdown.push("Moderate role fit");

  if (synergy >= 20) breakdown.push("Excellent synergy");
  else if (synergy >= 10) breakdown.push("Some synergy");
  else breakdown.push("Low synergy with current deck");

  return {
    cardId: card.id,
    cardName: card.name,
    powerScore: Math.round(power),
    signalScore: Math.round(signal),
    synergyScore: Math.round(synergy),
    total,
    grade: toGrade(total),
    breakdown
  };
}

/**
 * Score all cards in the deck and return sorted results.
 */
export function scoreDeck(entries: DeckEntry[]): CardScore[] {
  return entries
    .map(e => scoreCard(e.card, entries))
    .sort((a, b) => b.total - a.total);
}

/**
 * Score a list of candidate cards (e.g. search results) relative to the deck.
 * Used by SuggestionPanel and AdvisorPanel to rank upgrades.
 */
export function rankCandidates(
  candidates: CardRecord[],
  deckEntries: DeckEntry[]
): CardScore[] {
  return candidates
    .map(card => scoreCard(card, deckEntries))
    .sort((a, b) => b.total - a.total);
}
