import type { CardRecord } from "./types";
import { db } from "./db";

export interface ValidationResult {
  legal: boolean;
  violations: Violation[];
  warnings: Warning[];
  mainboardCount: number;
  sideboardCount: number;
}

export interface Violation {
  rule: string;
  message: string;
  cardNames?: string[];
}

export interface Warning {
  type: "rotation" | "oversized" | "future";
  message: string;
  cardNames?: string[];
  daysUntilRotation?: number;
}

export interface DeckEntry {
  card: CardRecord;
  quantity: number;
  board: "main" | "side";
}

const BASIC_LAND_NAMES = new Set([
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Wastes",
  "Snow-Covered Plains",
  "Snow-Covered Island",
  "Snow-Covered Swamp",
  "Snow-Covered Mountain",
  "Snow-Covered Forest",
]);

function isBasicLand(card: CardRecord): boolean {
  return (
    BASIC_LAND_NAMES.has(card.name) ||
    (card.typeLine.includes("Basic") && card.typeLine.includes("Land"))
  );
}

export function validateDeck(entries: DeckEntry[]): ValidationResult {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];

  const mainboard = entries.filter((e) => e.board === "main");
  const sideboard = entries.filter((e) => e.board === "side");

  const mainCount = mainboard.reduce((sum, e) => sum + e.quantity, 0);
  const sideCount = sideboard.reduce((sum, e) => sum + e.quantity, 0);

  if (mainCount < 60) {
    violations.push({
      rule: "MIN_DECK_SIZE",
      message: `Mainboard has ${mainCount} cards. Minimum is 60.`,
    });
  }

  if (mainCount > 61) {
    warnings.push({
      type: "oversized",
      message: `Mainboard has ${mainCount} cards. Running more than 61 reduces consistency.`,
    });
  }

  if (sideCount !== 0 && sideCount !== 15) {
    violations.push({
      rule: "SIDEBOARD_SIZE",
      message: `Sideboard has ${sideCount} cards. Must be exactly 0 or 15 for competitive play.`,
    });
  }

  const oracleCountMap = new Map<string, { count: number; name: string }>();
  for (const entry of entries) {
    if (isBasicLand(entry.card)) continue;
    const existing = oracleCountMap.get(entry.card.oracleId);
    if (existing) {
      existing.count += entry.quantity;
    } else {
      oracleCountMap.set(entry.card.oracleId, {
        count: entry.quantity,
        name: entry.card.name,
      });
    }
  }
  const overLimit: string[] = [];
  for (const { count, name } of oracleCountMap.values()) {
    if (count > 4) overLimit.push(`${name} (${count} copies)`);
  }
  if (overLimit.length > 0) {
    violations.push({
      rule: "MAX_COPIES",
      message: `Cards exceeding 4-copy limit: ${overLimit.join(", ")}`,
      cardNames: overLimit,
    });
  }

  const illegalCards: string[] = [];
  const bannedCards: string[] = [];
  for (const entry of entries) {
    if (entry.card.bannedInStandard === 1) {
      bannedCards.push(entry.card.name);
    } else if (entry.card.legalityStandard !== "legal") {
      illegalCards.push(entry.card.name);
    }
  }
  if (bannedCards.length > 0) {
    violations.push({
      rule: "BANNED_CARD",
      message: `Banned cards in deck: ${bannedCards.join(", ")}`,
      cardNames: bannedCards,
    });
  }
  if (illegalCards.length > 0) {
    violations.push({
      rule: "NOT_STANDARD_LEGAL",
      message: `Non-Standard cards: ${illegalCards.join(", ")}`,
      cardNames: illegalCards,
    });
  }

  const futureCards = entries
    .filter(
      (e) =>
        e.card.legalityFuture === "legal" && e.card.legalityStandard !== "legal"
    )
    .map((e) => e.card.name);
  if (futureCards.length > 0) {
    warnings.push({
      type: "future",
      message: `Cards not yet in Standard ("future" legal): ${futureCards.join(", ")}`,
      cardNames: futureCards,
    });
  }

  const companions = entries.filter(
    (e) =>
      e.board === "side" &&
      ((e.card.keywordsJson ?? "").includes("Companion") ||
        (e.card.oracleText ?? "").toLowerCase().includes("companion —"))
  );
  for (const companion of companions) {
    const restriction = extractCompanionRestriction(companion.card);
    if (restriction) {
      const passes = checkCompanionRestriction(
        restriction,
        mainboard.map((e) => e.card)
      );
      if (!passes) {
        violations.push({
          rule: "COMPANION_RESTRICTION",
          message: `Companion "${companion.card.name}" deck-building restriction not satisfied.`,
          cardNames: [companion.card.name],
        });
      }
    }
  }

  return {
    legal: violations.length === 0,
    violations,
    warnings,
    mainboardCount: mainCount,
    sideboardCount: sideCount,
  };
}

type CompanionRestriction =
  | { type: "all_same_cmc" }
  | { type: "no_nonland_below"; threshold: number }
  | { type: "all_odd_cmc" }
  | { type: "all_even_cmc" }
  | { type: "minimum_card_types"; min: number }
  | { type: "unknown" };

function extractCompanionRestriction(
  card: CardRecord
): CompanionRestriction | null {
  const text = (card.oracleText ?? "").toLowerCase();
  if (text.includes("each nonland card") && text.includes("same mana value"))
    return { type: "all_same_cmc" };
  if (text.includes("mana value 3 or less"))
    return { type: "no_nonland_below", threshold: 3 };
  if (text.includes("odd mana value")) return { type: "all_odd_cmc" };
  if (text.includes("even mana value")) return { type: "all_even_cmc" };
  if (text.includes("companion —")) return { type: "unknown" };
  return null;
}

function checkCompanionRestriction(
  restriction: CompanionRestriction,
  mainCards: CardRecord[]
): boolean {
  const nonlands = mainCards.filter(
    (c) => !c.typeLine.toLowerCase().includes("land")
  );
  switch (restriction.type) {
    case "all_same_cmc": {
      const cmcs = new Set(nonlands.map((c) => c.cmc));
      return cmcs.size <= 1;
    }
    case "no_nonland_below":
      return nonlands.every((c) => c.cmc >= restriction.threshold);
    case "all_odd_cmc":
      return nonlands.every((c) => c.cmc % 2 !== 0);
    case "all_even_cmc":
      return nonlands.every((c) => c.cmc % 2 === 0);
    case "minimum_card_types": {
      const types = new Set(
        mainCards.flatMap((c) =>
          c.typeLine
            .split(" — ")[0]
            .trim()
            .split(" ")
            .filter((t) => t.length > 2)
        )
      );
      return types.size >= restriction.min;
    }
    default:
      return true;
  }
}

export async function getRotationWarnings(
  entries: DeckEntry[]
): Promise<Warning[]> {
  const warnings: Warning[] = [];
  const ROTATION_WARN_DAYS = 90;
  const setReleaseMeta = await db.meta.get("setReleaseData");
  if (!setReleaseMeta) return warnings;

  let setReleaseMap: Record<string, string> = {};
  try {
    setReleaseMap = JSON.parse(setReleaseMeta.value) as Record<string, string>;
  } catch {
    return warnings;
  }

  const now = Date.now();
  const ROTATE_AFTER_MS = 21 * 30 * 24 * 60 * 60 * 1000;
  const WARN_WINDOW_MS = ROTATION_WARN_DAYS * 24 * 60 * 60 * 1000;

  const rotatingCards: string[] = [];
  for (const entry of entries) {
    const releaseDate = setReleaseMap[entry.card.setCode];
    if (!releaseDate) continue;
    const age = now - new Date(releaseDate).getTime();
    if (age >= ROTATE_AFTER_MS && age < ROTATE_AFTER_MS + WARN_WINDOW_MS) {
      rotatingCards.push(entry.card.name);
    }
  }

  if (rotatingCards.length > 0) {
    warnings.push({
      type: "rotation",
      message: `${rotatingCards.length} card(s) may rotate within ~90 days: ${rotatingCards.join(", ")}.`,
      cardNames: rotatingCards,
      daysUntilRotation: ROTATION_WARN_DAYS,
    });
  }

  return warnings;
}
