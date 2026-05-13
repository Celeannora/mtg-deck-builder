import type { CardRecord } from "./types";

export interface DeckEntry {
  card: CardRecord;
  quantity: number;
  board: "main" | "side";
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  mainCount: number;
  sideCount: number;
  issues: ValidationIssue[];
}

export function validateDeck(entries: DeckEntry[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  const mainEntries = entries.filter((e) => e.board === "main");
  const sideEntries = entries.filter((e) => e.board === "side");

  const mainCount = mainEntries.reduce((s, e) => s + e.quantity, 0);
  const sideCount = sideEntries.reduce((s, e) => s + e.quantity, 0);

  if (mainCount < 60) {
    issues.push({
      severity: "error",
      message: `Deck has only ${mainCount}/60 cards`,
    });
  }
  if (mainCount > 60) {
    issues.push({
      severity: "warning",
      message: `Deck has ${mainCount} cards (60 recommended)`,
    });
  }
  if (sideCount > 15) {
    issues.push({
      severity: "error",
      message: `Sideboard has ${sideCount}/15 cards`,
    });
  }

  // 4-copy rule
  for (const entry of [...mainEntries, ...sideEntries]) {
    const { card, quantity } = entry;
    const isBasic =
      card.typeLine.includes("Basic") && card.typeLine.includes("Land");
    const isUnlimited =
      isBasic ||
      /a deck can have any number/i.test(card.oracleText ?? "");

    const totalCopies =
      entries
        .filter((e) => e.card.oracleId === card.oracleId)
        .reduce((s, e) => s + e.quantity, 0);

    if (!isUnlimited && totalCopies > 4) {
      issues.push({
        severity: "error",
        message: `"${card.name}" has ${totalCopies} copies (max 4)`,
      });
    }
  }

  // Standard legality — check all entries
  for (const entry of entries) {
    const { card } = entry;
    if (card.bannedInStandard === 1) {
      issues.push({
        severity: "error",
        message: `"${card.name}" is banned in Standard`,
      });
    } else if (card.legalityStandard !== "legal") {
      issues.push({
        severity: "error",
        message: `"${card.name}" is not legal in Standard`,
      });
    }
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    mainCount,
    sideCount,
    issues,
  };
}
