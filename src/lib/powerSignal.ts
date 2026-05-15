/**
 * powerSignal.ts — Role-alignment signal (0–30)
 *
 * Measures how well a card's role matches the current deck's role composition.
 * Uses the archetype composition to determine what roles are most needed.
 */

import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";
import { assignRoles } from "./roles";
import { getRoleComposition } from "./archetype";

/**
 * Returns a signal score 0–30 representing how well this card
 * fills a role that the current deck needs.
 */
export function getPowerSignal(
  card: CardRecord,
  deckEntries: DeckEntry[]
): number {
  if (deckEntries.length === 0) return 10;

  const comp = getRoleComposition(deckEntries);
  const total = Math.max(comp.total, 1);
  const roles = assignRoles(card);

  let score = 0;

  const threatRatio  = comp.threats / total;
  const removalRatio = comp.removal / total;
  const drawRatio    = comp.cardDraw / total;
  const rampRatio    = comp.ramp / total;

  if (roles.includes("Threat") || roles.includes("Finisher")) {
    score += threatRatio < 0.25 ? 14 : threatRatio < 0.35 ? 8 : 4;
  }
  if (roles.includes("Removal")) {
    score += removalRatio < 0.10 ? 14 : removalRatio < 0.18 ? 8 : 4;
  }
  if (roles.includes("CardDraw")) {
    score += drawRatio < 0.08 ? 12 : drawRatio < 0.14 ? 7 : 3;
  }
  if (roles.includes("Ramp")) {
    score += rampRatio < 0.06 ? 10 : rampRatio < 0.12 ? 5 : 2;
  }
  if (roles.includes("Counterspell")) {
    score += comp.counterspells < 4 ? 8 : 3;
  }
  if (roles.includes("BoardWipe")) {
    score += comp.boardWipes < 2 ? 8 : 3;
  }

  return Math.min(30, score);
}

/** Alias used by consumers that import `computePowerSignal` */
export const computePowerSignal = getPowerSignal;
