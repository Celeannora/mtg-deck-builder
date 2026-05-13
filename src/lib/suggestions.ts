import { db } from "./db";
import type { CardRecord } from "./types";
import { computeSynergy } from "./synergy";
import { assignRoles, type CardRole } from "./roles";
import { analyzeArchetype } from "./archetype";

export interface Suggestion {
  card: CardRecord;
  score: number;
  reasons: string[];
}

export interface SuggestionOptions {
  budget?: number; // max price USD
  maxResults?: number;
  excludeOracleIds?: Set<string>;
}

export async function getSuggestions(
  deckCards: CardRecord[],
  options: SuggestionOptions = {}
): Promise<Suggestion[]> {
  const { budget, maxResults = 20, excludeOracleIds = new Set() } = options;

  if (deckCards.length === 0) return [];

  // What roles are under-represented in the deck?
  const archResult = analyzeArchetype(deckCards);
  const { composition } = archResult;

  const wantedRoles: CardRole[] = [];
  if (composition.removal < 6) wantedRoles.push("Removal");
  if (composition.cardDraw < 4) wantedRoles.push("Card Draw");
  if (composition.threats < 16) wantedRoles.push("Beater", "Evasive Threat", "Value Engine");
  if (composition.counterspells < 4 && archResult.archetype === "Control")
    wantedRoles.push("Counterspell");
  if (composition.ramp < 4 && archResult.archetype === "Ramp")
    wantedRoles.push("Ramp");

  // Deck's color identity
  const colorCounts: Record<string, number> = {};
  for (const card of deckCards) {
    const colors = JSON.parse(card.colorIdentityJson) as string[];
    for (const c of colors) colorCounts[c] = (colorCounts[c] ?? 0) + 1;
  }
  const deckColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // Pull candidate cards from DB
  let candidates = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .toArray();

  candidates = candidates.filter((c) => {
    if (excludeOracleIds.has(c.oracleId)) return false;
    if (budget !== undefined && c.priceUsd !== null && c.priceUsd > budget) return false;
    const ci = JSON.parse(c.colorIdentityJson) as string[];
    // Must be within deck's color identity
    if (deckColors.length > 0 && !ci.every((color) => deckColors.includes(color))) return false;
    return true;
  });

  const scored: Suggestion[] = [];

  for (const card of candidates) {
    const synergy = computeSynergy(card, deckCards);
    if (synergy.score < 2) continue; // must have meaningful synergy

    const cardRoles = assignRoles(card);
    const roleBonus = cardRoles.filter((r) => wantedRoles.includes(r)).length * 2;

    scored.push({
      card,
      score: synergy.score + roleBonus,
      reasons: [
        ...synergy.reasons,
        ...(roleBonus > 0 ? [`Fills needed role(s): ${cardRoles.filter((r) => wantedRoles.includes(r)).join(", ")}`] : []),
      ],
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}
