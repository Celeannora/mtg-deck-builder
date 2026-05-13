/**
 * Phase 2 — Format Legality Engine
 *
 * Covers:
 *  - Standard rotation awareness (90-day warning window)
 *  - All deck validation rules (copy limits, sideboard size, companion)
 *  - Real-time violation reporting
 */

import type { CardRecord } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────

export const ROTATION_WARNING_DAYS = 90;
export const MAINBOARD_MIN = 60;
export const MAINBOARD_WARN = 61;
export const SIDEBOARD_LEGAL_SIZES = [0, 15] as const;
export const MAX_COPIES = 4;

const BASIC_LAND_NAMES = new Set([
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Wastes",
  // Snow basics
  "Snow-Covered Plains",
  "Snow-Covered Island",
  "Snow-Covered Swamp",
  "Snow-Covered Mountain",
  "Snow-Covered Forest",
  "Snow-Covered Wastes",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeckEntry {
  card: CardRecord;
  quantity: number;
  zone: "mainboard" | "sideboard";
}

export type ViolationSeverity = "error" | "warning" | "info";

export interface LegalityViolation {
  code: string;
  severity: ViolationSeverity;
  message: string;
  cardNames?: string[];
}

export interface ValidationResult {
  legal: boolean;
  mainboardCount: number;
  sideboardCount: number;
  violations: LegalityViolation[];
  warnings: LegalityViolation[];
}

export interface RotationStatus {
  cardId: string;
  cardName: string;
  setCode: string;
  setName: string;
  releaseDate: string | null;
  rotationDate: string | null;
  daysUntilRotation: number | null;
  isRotatingSoon: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBasicLand(card: CardRecord): boolean {
  return (
    BASIC_LAND_NAMES.has(card.name) ||
    (card.typeLine.includes("Basic") && card.typeLine.includes("Land"))
  );
}

function cardCopiesInZone(
  entries: DeckEntry[],
  oracleId: string,
  zone: "mainboard" | "sideboard" | "all"
): number {
  return entries
    .filter((e) => e.card.oracleId === oracleId && (zone === "all" || e.zone === zone))
    .reduce((sum, e) => sum + e.quantity, 0);
}

// ─── Standard Rotation Awareness ─────────────────────────────────────────────

/**
 * Standard sets rotate annually, roughly 2 years after release.
 * We approximate the rotation date as releaseDate + 730 days.
 * Scryfall set data does not expose an explicit rotation date, so this
 * heuristic is the standard approach used by MTG tooling.
 */
export function approximateRotationDate(releaseDate: string): Date {
  const d = new Date(releaseDate);
  d.setDate(d.getDate() + 730); // ~2 years
  return d;
}

export function getRotationStatus(
  card: CardRecord,
  today: Date = new Date()
): RotationStatus {
  const releaseDate = null; // Populated by setData layer — cards table doesn't store set release dates directly
  // We derive from the card's importedAt and set data via the sets util.
  // For now return a best-effort object; the UI layer enriches this via getStandardSets().
  return {
    cardId: card.id,
    cardName: card.name,
    setCode: card.setCode,
    setName: card.setName,
    releaseDate,
    rotationDate: null,
    daysUntilRotation: null,
    isRotatingSoon: false,
  };
}

/**
 * Enrich rotation status given a set release date string (YYYY-MM-DD).
 */
export function enrichRotationStatus(
  status: RotationStatus,
  setReleaseDate: string,
  today: Date = new Date()
): RotationStatus {
  const rotationDate = approximateRotationDate(setReleaseDate);
  const msPerDay = 86_400_000;
  const daysUntilRotation = Math.floor(
    (rotationDate.getTime() - today.getTime()) / msPerDay
  );
  return {
    ...status,
    releaseDate: setReleaseDate,
    rotationDate: rotationDate.toISOString().slice(0, 10),
    daysUntilRotation,
    isRotatingSoon: daysUntilRotation >= 0 && daysUntilRotation <= ROTATION_WARNING_DAYS,
  };
}

// ─── Companion Rules ─────────────────────────────────────────────────────────

/**
 * Known companion restriction patterns extracted from oracle text.
 * Each entry: { companionName, test(mainboard) => boolean }
 *
 * Only companions currently legal in Standard (as of mid-2026) are included.
 * Add new ones as sets release.
 */
export interface CompanionRule {
  name: string;
  restriction: string;
  validate(mainboard: DeckEntry[]): boolean;
}

export const COMPANION_RULES: CompanionRule[] = [
  {
    name: "Kaheera, the Orphanguard",
    restriction: "Every non-land creature must be a Cat, Elemental, Nightmare, Dinosaur, or Beast.",
    validate(mainboard) {
      const ALLOWED_TYPES = ["Cat", "Elemental", "Nightmare", "Dinosaur", "Beast"];
      return mainboard
        .filter((e) => e.card.typeLine.includes("Creature") && !e.card.typeLine.includes("Land"))
        .every((e) => ALLOWED_TYPES.some((t) => e.card.typeLine.includes(t)));
    },
  },
  {
    name: "Lurrus of the Dream-Den",
    restriction: "Every permanent card in your deck must have mana value 2 or less.",
    validate(mainboard) {
      return mainboard
        .filter(
          (e) =>
            !e.card.typeLine.includes("Land") &&
            !e.card.typeLine.includes("Instant") &&
            !e.card.typeLine.includes("Sorcery")
        )
        .every((e) => e.card.cmc <= 2);
    },
  },
  {
    name: "Obosh, the Preypiercer",
    restriction: "Every nonland card in your main deck must have an odd mana value.",
    validate(mainboard) {
      return mainboard
        .filter((e) => !e.card.typeLine.includes("Land"))
        .every((e) => e.card.cmc % 2 !== 0);
    },
  },
  {
    name: "Yorion, Sky Nomad",
    restriction: "Your deck must contain at least 80 cards.",
    validate(mainboard) {
      return mainboard.reduce((sum, e) => sum + e.quantity, 0) >= 80;
    },
  },
  {
    name: "Jegantha, the Wellspring",
    restriction: "No card in your deck can have duplicate mana symbols in its mana cost.",
    validate(mainboard) {
      return mainboard.every((e) => {
        const cost = e.card.manaCost ?? "";
        const symbols = cost.match(/\{[^}]+\}/g) ?? [];
        const coloredPips = symbols.filter((s) => /^\{[WUBRG]\}$/.test(s));
        return new Set(coloredPips).size === coloredPips.length;
      });
    },
  },
  {
    name: "Keruga, the Macrosage",
    restriction: "Every nonland card in your deck must have a mana value of 3 or greater.",
    validate(mainboard) {
      return mainboard
        .filter((e) => !e.card.typeLine.includes("Land"))
        .every((e) => e.card.cmc >= 3);
    },
  },
  {
    name: "Umori, the Collector",
    restriction: "Every nonland card in your deck must share a card type.",
    validate(mainboard) {
      const TYPES = ["Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker"];
      const nonlands = mainboard.filter((e) => !e.card.typeLine.includes("Land"));
      return TYPES.some((t) => nonlands.every((e) => e.card.typeLine.includes(t)));
    },
  },
];

/**
 * Returns the companion rule for a card name, if it exists.
 */
export function getCompanionRule(name: string): CompanionRule | undefined {
  return COMPANION_RULES.find((r) => r.name === name);
}

// ─── Core Validation Engine ───────────────────────────────────────────────────

export function validateDeck(entries: DeckEntry[]): ValidationResult {
  const violations: LegalityViolation[] = [];
  const warnings: LegalityViolation[] = [];

  const mainboard = entries.filter((e) => e.zone === "mainboard");
  const sideboard = entries.filter((e) => e.zone === "sideboard");

  const mainboardCount = mainboard.reduce((s, e) => s + e.quantity, 0);
  const sideboardCount = sideboard.reduce((s, e) => s + e.quantity, 0);

  // ── Rule 1: Minimum 60 cards in mainboard ──────────────────────────────────
  if (mainboardCount < MAINBOARD_MIN) {
    violations.push({
      code: "MIN_60",
      severity: "error",
      message: `Mainboard has ${mainboardCount} cards. Minimum is ${MAINBOARD_MIN}.`,
    });
  }

  // ── Rule 2: Warn if mainboard exceeds 61 cards ────────────────────────────
  if (mainboardCount > MAINBOARD_WARN) {
    warnings.push({
      code: "EXCEEDS_61",
      severity: "warning",
      message: `Mainboard has ${mainboardCount} cards. Every card above 60 reduces consistency. Statistical disadvantage above 61.`,
    });
  }

  // ── Rule 3: Sideboard must be 0 or exactly 15 ────────────────────────────
  if (sideboardCount !== 0 && sideboardCount !== 15) {
    violations.push({
      code: "SIDEBOARD_SIZE",
      severity: "error",
      message: `Sideboard has ${sideboardCount} cards. Must be exactly 0 or 15 for competitive play.`,
    });
  }

  // ── Rule 4: Max 4 copies of any non-basic card (by oracleId) ─────────────
  const oracleIdsSeen = new Map<string, { name: string; total: number }>();

  for (const entry of entries) {
    if (isBasicLand(entry.card)) continue;
    const current = oracleIdsSeen.get(entry.card.oracleId) ?? { name: entry.card.name, total: 0 };
    oracleIdsSeen.set(entry.card.oracleId, {
      name: entry.card.name,
      total: current.total + entry.quantity,
    });
  }

  for (const [, { name, total }] of oracleIdsSeen.entries()) {
    if (total > MAX_COPIES) {
      violations.push({
        code: "COPY_LIMIT",
        severity: "error",
        message: `"${name}" has ${total} copies. Maximum is ${MAX_COPIES} (excluding basic lands).`,
        cardNames: [name],
      });
    }
  }

  // ── Rule 5: All cards must be Standard-legal ──────────────────────────────
  const illegalCards = entries.filter(
    (e) => e.card.legalityStandard !== "legal"
  );
  for (const entry of illegalCards) {
    const status =
      entry.card.legalityStandard === "banned" ? "BANNED" : "NOT LEGAL";
    violations.push({
      code: entry.card.bannedInStandard ? "BANNED" : "NOT_LEGAL",
      severity: "error",
      message: `"${entry.card.name}" is ${status} in Standard.`,
      cardNames: [entry.card.name],
    });
  }

  // ── Rule 6: Companion ─────────────────────────────────────────────────────
  const sideboardCompanions = sideboard.filter((e) =>
    e.card.typeLine.includes("Legendary") &&
    (e.card.oracleText ?? "").toLowerCase().includes("companion")
  );

  for (const companionEntry of sideboardCompanions) {
    const rule = getCompanionRule(companionEntry.card.name);
    if (rule) {
      const valid = rule.validate(mainboard);
      if (!valid) {
        violations.push({
          code: "COMPANION_RESTRICTION",
          severity: "error",
          message: `Companion "${companionEntry.card.name}" restriction not met: ${rule.restriction}`,
          cardNames: [companionEntry.card.name],
        });
      }
    }
  }

  const legal = violations.length === 0;
  return { legal, mainboardCount, sideboardCount, violations, warnings };
}

// ─── Rotation Banner helpers ──────────────────────────────────────────────────

export interface RotationBanner {
  show: boolean;
  message: string;
  count: number;
  earliestDays: number | null;
}

export function buildRotationBanner(
  statuses: RotationStatus[]
): RotationBanner {
  const rotatingSoon = statuses.filter((s) => s.isRotatingSoon);
  if (rotatingSoon.length === 0) {
    return { show: false, message: "", count: 0, earliestDays: null };
  }

  const days = rotatingSoon
    .map((s) => s.daysUntilRotation)
    .filter((d): d is number => d !== null);
  const earliest = Math.min(...days);
  const count = rotatingSoon.length;

  return {
    show: true,
    count,
    earliestDays: earliest,
    message: `${count} card${count !== 1 ? "s" : ""} in your deck rotate${count === 1 ? "s" : ""} out in ${earliest} day${earliest !== 1 ? "s" : ""}.`,
  };
}
