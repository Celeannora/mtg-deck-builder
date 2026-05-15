/**
 * synergy.ts — Keyword/mechanic synergy score (0–30)
 *
 * Tokenises oracle text and keywords to find overlaps between
 * a candidate card and the existing deck's mechanic fingerprint.
 */

import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";

const SYNERGY_KEYWORDS = [
  // Graveyard
  "flashback", "escape", "embalm", "eternalize", "delve",
  "undergrowth", "reanimator", "surveil", "mill",
  // Sacrifice
  "sacrifice", "exploit", "improvise",
  // Tokens
  "create", "populate", "convoke",
  // +1/+1 counters
  "proliferate", "bolster", "adapt", "evolve",
  // ETB/Blink
  "flicker", "bounce", "blink", "enters the battlefield",
  // Spellslinger
  "magecraft", "storm", "prowess", "spells you cast",
  // Lands
  "landfall", "land from your library",
  // Equipment / Aura
  "equip", "aura", "attach",
  // Tribal
  "human", "elf", "goblin", "vampire", "zombie", "merfolk",
  "dragon", "angel", "warrior", "wizard", "knight",
  // Energy
  "energy counter",
  // Cycling
  "cycling",
  // Kicker
  "kicker",
  // Adventure
  "adventure",
];

/**
 * Build a frequency map of synergy keywords from the deck.
 * Returns Map<keyword, count-of-nonland-cards-containing-it>.
 */
function buildDeckFingerprint(entries: DeckEntry[]): Map<string, number> {
  const freq = new Map<string, number>();
  const nonlands = entries.filter(e => !e.card.typeLine.includes("Land"));

  for (const entry of nonlands) {
    const text = [
      entry.card.oracleText ?? "",
      entry.card.keywordsJson ? JSON.parse(entry.card.keywordsJson).join(" ") : ""
    ].join(" ").toLowerCase();

    for (const kw of SYNERGY_KEYWORDS) {
      if (text.includes(kw)) {
        freq.set(kw, (freq.get(kw) ?? 0) + entry.quantity);
      }
    }
  }

  return freq;
}

/**
 * Returns a synergy score 0–30 for a candidate card
 * based on keyword overlap with the current deck fingerprint.
 */
export function computeSynergyScore(
  card: CardRecord,
  deckEntries: DeckEntry[]
): number {
  if (deckEntries.length === 0) return 0;

  const fingerprint = buildDeckFingerprint(deckEntries);
  if (fingerprint.size === 0) return 0;

  const cardText = [
    card.oracleText ?? "",
    card.keywordsJson ? JSON.parse(card.keywordsJson).join(" ") : ""
  ].join(" ").toLowerCase();

  let score = 0;

  for (const [kw, freq] of fingerprint) {
    if (cardText.includes(kw)) {
      // More copies of the keyword in the deck = stronger synergy signal
      const weight = freq >= 8 ? 8 : freq >= 4 ? 5 : 3;
      score += weight;
    }
  }

  return Math.min(30, score);
}

/**
 * Returns the top synergy keywords present in the deck (for display).
 */
export function getDeckMechanics(entries: DeckEntry[]): string[] {
  const fingerprint = buildDeckFingerprint(entries);
  return [...fingerprint.entries()]
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([kw]) => kw);
}
