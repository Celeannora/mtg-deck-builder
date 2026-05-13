import type { CardRecord } from "./types";
import { assignRoles } from "./roles";

export interface SynergyResult {
  score: number;
  stars: 1 | 2 | 3 | 4 | 5;
  reasons: string[];
}

function parseJsonArray(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

function tokenizeOracleText(text: string): Set<string> {
  const STOP_WORDS = new Set([
    "a", "an", "the", "of", "to", "in", "is", "it", "you", "your", "and",
    "or", "for", "on", "at", "by", "from", "with", "this", "that", "as",
    "be", "are", "was", "were", "its", "may", "do", "not", "any",
  ]);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  );
}

export function computeSynergy(
  candidate: CardRecord,
  deckCards: CardRecord[]
): SynergyResult {
  let score = 0;
  const reasons: string[] = [];

  if (deckCards.length === 0) return { score: 0, stars: 1, reasons: [] };

  const candidateKeywords = parseJsonArray(candidate.keywordsJson);

  // Shared keywords with 3+ deck cards
  for (const kw of candidateKeywords) {
    const matches = deckCards.filter((c) =>
      parseJsonArray(c.keywordsJson).includes(kw)
    ).length;
    if (matches >= 3) {
      score += 2;
      reasons.push(`Shares keyword "${kw}" with ${matches} cards`);
    }
  }

  // Oracle text references a type that appears frequently
  const candidateText = candidate.oracleText ?? "";
  const TYPE_TRIGGERS = [
    ["instant", /whenever you cast an instant/i],
    ["sorcery", /whenever you cast a sorcery/i],
    ["creature", /whenever a creature enters/i],
    ["token", /whenever a token enters/i],
    ["artifact", /whenever you cast an artifact/i],
  ] as const;
  for (const [typeName, re] of TYPE_TRIGGERS) {
    if (re.test(candidateText)) {
      const count = deckCards.filter((c) =>
        c.typeLine.toLowerCase().includes(typeName)
      ).length;
      if (count >= 4) {
        score += 3;
        reasons.push(`Triggers on ${typeName}s — ${count} in deck`);
      }
    }
  }

  // Shared creature subtype with 3+ creatures
  const candidateSubtypes = candidate.typeLine.includes("—")
    ? candidate.typeLine
        .split("—")[1]
        .trim()
        .split(" ")
        .filter((s) => s.length > 1)
    : [];
  for (const subtype of candidateSubtypes) {
    const matches = deckCards.filter(
      (c) => c.typeLine.includes(subtype) && c.typeLine.includes("Creature")
    ).length;
    if (matches >= 3) {
      score += 2;
      reasons.push(`Shares subtype "${subtype}" with ${matches} creatures`);
    }
  }

  // Token synergy
  if (/create.*token/i.test(candidateText)) {
    const tokenMatters = deckCards.filter((c) =>
      /whenever a (creature|token) enters|creatures you control/i.test(
        c.oracleText ?? ""
      )
    ).length;
    if (tokenMatters >= 2) {
      score += 3;
      reasons.push(`Token producer — ${tokenMatters} payoffs in deck`);
    }
  }

  // Shared color identity with 90%+ of deck
  const candidateColors = parseJsonArray(candidate.colorIdentityJson);
  const deckColorMatch = deckCards.filter((c) => {
    const dc = parseJsonArray(c.colorIdentityJson);
    return candidateColors.some((col) => dc.includes(col));
  }).length;
  if (deckCards.length > 0 && deckColorMatch / deckCards.length >= 0.9) {
    score += 1;
  }

  // Oracle text token overlap with deck
  const candidateTokens = tokenizeOracleText(candidateText);
  let textOverlapScore = 0;
  for (const dc of deckCards) {
    const deckTokens = tokenizeOracleText(dc.oracleText ?? "");
    const overlap = [...candidateTokens].filter((t) => deckTokens.has(t)).length;
    if (overlap >= 3) textOverlapScore += 1;
  }
  if (textOverlapScore >= 3) {
    score += Math.min(3, Math.floor(textOverlapScore / 3));
    reasons.push(`Strong oracle text overlap with ${textOverlapScore} cards`);
  }

  const stars = Math.max(1, Math.min(5, Math.ceil(score / 2))) as 1 | 2 | 3 | 4 | 5;
  return { score, stars, reasons };
}
