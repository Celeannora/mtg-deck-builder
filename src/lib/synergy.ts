import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";
import { assignRoles } from "./roles";

export interface SynergyResult {
  score: number;       // 0-20 raw
  stars: number;       // 1-5
  reasons: string[];
}

/**
 * Compute a synergy score for a candidate card against the current deck.
 * Higher = better fit.
 */
export function computeSynergy(
  candidate: CardRecord,
  deckEntries: DeckEntry[]
): SynergyResult {
  let score = 0;
  const reasons: string[] = [];
  const deckCards = deckEntries.map(e => e.card);

  // 1. Shared keywords
  const candKw: string[] = JSON.parse(candidate.keywordsJson || "[]");
  const kwCounts = new Map<string, number>();
  for (const entry of deckEntries) {
    const kws: string[] = JSON.parse(entry.card.keywordsJson || "[]");
    for (const k of kws) kwCounts.set(k, (kwCounts.get(k) ?? 0) + entry.quantity);
  }
  for (const kw of candKw) {
    const count = kwCounts.get(kw) ?? 0;
    if (count >= 3) {
      score += 2;
      reasons.push(`Shares "${kw}" keyword with ${count} deck cards`);
    }
  }

  // 2. Oracle text references a type/subtype frequently in the deck
  const candText = (candidate.oracleText ?? "").toLowerCase();
  const subtypeCounts = new Map<string, number>();
  for (const entry of deckEntries) {
    const typeParts = entry.card.typeLine.split(/[\/\u2014\s]+/).map(t => t.trim().toLowerCase());
    for (const t of typeParts) {
      if (t.length > 2) subtypeCounts.set(t, (subtypeCounts.get(t) ?? 0) + entry.quantity);
    }
  }
  for (const [subtype, count] of subtypeCounts) {
    if (count >= 3 && candText.includes(subtype)) {
      score += 3;
      reasons.push(`References "${subtype}" — appears ${count}x in deck`);
      break; // count once per pattern match
    }
  }

  // 3. Shared creature subtype (tribal synergy)
  const candTypeParts = candidate.typeLine.split(/[\/\u2014\s]+/).map(t => t.trim());
  const deckSubtypeCounts = new Map<string, number>();
  for (const entry of deckEntries) {
    if (!entry.card.typeLine.includes("Creature")) continue;
    const parts = entry.card.typeLine.split(/[\/\u2014\s]+/).map(t => t.trim());
    for (const p of parts) {
      if (p && p !== "Creature" && p.length > 2) {
        deckSubtypeCounts.set(p, (deckSubtypeCounts.get(p) ?? 0) + entry.quantity);
      }
    }
  }
  for (const part of candTypeParts) {
    const count = deckSubtypeCounts.get(part) ?? 0;
    if (count >= 3) {
      score += 2;
      reasons.push(`Tribal synergy: ${part} (${count} in deck)`);
      break;
    }
  }

  // 4. Token type cross-reference
  const tokenMatches = candText.match(/create[^.]*token/g) ?? [];
  if (tokenMatches.length > 0) {
    const deckRefs = deckCards.filter(c =>
      (c.oracleText ?? "").toLowerCase().includes("token")
    ).length;
    if (deckRefs >= 2) {
      score += 3;
      reasons.push(`Token producer synergizes with ${deckRefs} token-matters cards`);
    }
  }

  // 5. Combo pair detection (shared trigger chain)
  const triggerPattern = /whenever ([^,\.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = triggerPattern.exec(candText)) !== null) {
    const trigger = m[1].trim();
    for (const entry of deckEntries) {
      const entryText = (entry.card.oracleText ?? "").toLowerCase();
      if (entryText.includes(trigger) && entry.card.id !== candidate.id) {
        score += 10;
        reasons.push(`Combo pair: shares trigger "${trigger}" with ${entry.card.name}`);
        break;
      }
    }
    if (score >= 10) break; // one combo pair is enough
  }

  // 6. Color identity alignment
  const candCI: string[] = JSON.parse(candidate.colorIdentityJson || "[]");
  const deckColorCounts = new Map<string, number>();
  for (const entry of deckEntries) {
    const ci: string[] = JSON.parse(entry.card.colorIdentityJson || "[]");
    for (const c of ci) deckColorCounts.set(c, (deckColorCounts.get(c) ?? 0) + entry.quantity);
  }
  const totalDeckCards = deckEntries.reduce((s, e) => s + e.quantity, 0);
  const primaryColors = [...deckColorCounts.entries()]
    .filter(([, count]) => count / totalDeckCards >= 0.1)
    .map(([c]) => c);
  const candColorsAligned = candCI.every(c => primaryColors.includes(c));
  if (candColorsAligned && candCI.length > 0) {
    score += 1;
  }

  const clamped = Math.min(score, 20);
  const stars = Math.max(1, Math.min(5, Math.ceil(clamped / 4)));

  return { score: clamped, stars, reasons };
}
