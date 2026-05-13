import type { CardRecord } from "./types";

export const BASIC_LAND_NAMES = new Set([
  "Island", "Plains", "Swamp", "Mountain", "Forest", "Wastes"
]);

export interface DeckEntry {
  card: CardRecord;
  quantity: number;
  board: "main" | "side";
}

export interface ValidationViolation {
  rule: string;
  message: string;
  cardNames?: string[];
}

export interface ValidationResult {
  legal: boolean;
  mainCount: number;
  sideCount: number;
  violations: ValidationViolation[];
}

export function validateDeck(entries: DeckEntry[]): ValidationResult {
  const main = entries.filter(e => e.board === "main");
  const side = entries.filter(e => e.board === "side");

  const mainCount = main.reduce((s, e) => s + e.quantity, 0);
  const sideCount = side.reduce((s, e) => s + e.quantity, 0);
  const violations: ValidationViolation[] = [];

  if (mainCount < 60) {
    violations.push({
      rule: "MIN_60",
      message: `Mainboard has ${mainCount} cards — minimum is 60.`
    });
  }

  if (mainCount > 60) {
    violations.push({
      rule: "OVER_60",
      message: `Mainboard has ${mainCount} cards. 60 is statistically optimal — every extra card dilutes your best draws.`
    });
  }

  if (sideCount > 0 && sideCount !== 15) {
    violations.push({
      rule: "SIDEBOARD_SIZE",
      message: `Sideboard has ${sideCount} cards — must be exactly 0 or 15.`
    });
  }

  const oracleCount = new Map<string, { name: string; total: number }>();
  for (const entry of entries) {
    if (BASIC_LAND_NAMES.has(entry.card.name)) continue;
    const existing = oracleCount.get(entry.card.oracleId);
    if (existing) {
      existing.total += entry.quantity;
    } else {
      oracleCount.set(entry.card.oracleId, { name: entry.card.name, total: entry.quantity });
    }
  }

  const overLimit = [...oracleCount.entries()]
    .filter(([, v]) => v.total > 4)
    .map(([, v]) => v.name);

  if (overLimit.length > 0) {
    violations.push({
      rule: "COPY_LIMIT",
      message: `Too many copies (max 4 for non-basics).`,
      cardNames: overLimit
    });
  }

  const illegalCards = entries
    .filter(e => e.card.legalityStandard !== "legal")
    .map(e => e.card.name);

  if (illegalCards.length > 0) {
    violations.push({
      rule: "NOT_STANDARD_LEGAL",
      message: `Cards not legal in Standard.`,
      cardNames: [...new Set(illegalCards)]
    });
  }

  const bannedCards = entries
    .filter(e => e.card.bannedInStandard === 1)
    .map(e => e.card.name);

  if (bannedCards.length > 0) {
    violations.push({
      rule: "BANNED",
      message: `Banned in Standard.`,
      cardNames: [...new Set(bannedCards)]
    });
  }

  return {
    legal: violations.length === 0,
    mainCount,
    sideCount,
    violations
  };
}
