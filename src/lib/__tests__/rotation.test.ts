import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { computeRotationWarnings, groupRotationWarningsBySet } from "../rotation";
import type { CardRecord } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    name: "Test Card",
    typeLine: "Creature",
    oracleText: null,
    flavorText: null,
    cmc: 2,
    colorsJson: JSON.stringify(["W"]),
    manaCostJson: JSON.stringify([]),
    keywordsJson: JSON.stringify([]),
    power: null,
    toughness: null,
    loyalty: null,
    rarity: "common",
    setCode: "mid",
    setName: "Innistrad: Midnight Hunt",
    collectorNumber: "001",
    imageUriNormal: null,
    imageUriSmall: null,
    priceUsd: null,
    edhrecRank: null,
    gameChanger: 0,
    legalityStandard: "legal",
    legalityFuture: "legal",
    releasedAt: "2021-09-24",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Date helpers for test scenarios
// We need:
//   - A date that makes a card "old enough" (>= 18 months)
//   - A mocked "now" that is within 90 days of the next Oct 1 rotation
// ---------------------------------------------------------------------------

// Freeze time to 2024-08-01 — within 90 days of Oct 1 2024 rotation
const FROZEN_NOW = new Date("2024-08-01T00:00:00.000Z").getTime();
// A set released ~2.5 years before frozen now (well past 18-month threshold)
const OLD_RELEASE = "2021-09-24"; // Innistrad: Midnight Hunt
// A set released ~6 months before frozen now (under 18-month threshold)
const NEW_RELEASE = "2024-02-01";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// computeRotationWarnings
// ---------------------------------------------------------------------------

describe("computeRotationWarnings", () => {
  it("returns a warning for an old card near rotation", () => {
    const cards = [makeCard({ setCode: "mid", setName: "Innistrad: Midnight Hunt" })];
    const releaseDates = new Map([["mid", OLD_RELEASE]]);

    const warnings = computeRotationWarnings(cards, releaseDates);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].cardName).toBe("Test Card");
    expect(warnings[0].setCode).toBe("mid");
    expect(warnings[0].daysUntilRotation).not.toBeNull();
  });

  it("returns no warning for a new set not near 18-month threshold", () => {
    const cards = [makeCard({ setCode: "mkm", setName: "Murders at Karlov Manor" })];
    const releaseDates = new Map([["mkm", NEW_RELEASE]]);

    const warnings = computeRotationWarnings(cards, releaseDates);
    expect(warnings).toHaveLength(0);
  });

  it("skips cards whose setCode has no release date entry", () => {
    const cards = [makeCard({ setCode: "unknown" })];
    const releaseDates = new Map<string, string>(); // empty

    const warnings = computeRotationWarnings(cards, releaseDates);
    expect(warnings).toHaveLength(0);
  });

  it("daysUntilRotation is a positive integer within ~90 days", () => {
    const cards = [makeCard({ setCode: "mid" })];
    const releaseDates = new Map([["mid", OLD_RELEASE]]);

    const warnings = computeRotationWarnings(cards, releaseDates);
    const days = warnings[0].daysUntilRotation;
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThan(0);
    expect(days!).toBeLessThanOrEqual(90);
  });

  it("returns warnings for all old cards in the list", () => {
    const cards = [
      makeCard({ id: "a", name: "Alpha", setCode: "mid" }),
      makeCard({ id: "b", name: "Beta", setCode: "mid" }),
      makeCard({ id: "c", name: "Gamma", setCode: "vow", setName: "Innistrad: Crimson Vow" }),
    ];
    const releaseDates = new Map([
      ["mid", OLD_RELEASE],
      ["vow", "2021-11-19"],
    ]);

    const warnings = computeRotationWarnings(cards, releaseDates);
    expect(warnings).toHaveLength(3);
  });

  it("returns no warnings when no cards are provided", () => {
    const warnings = computeRotationWarnings([], new Map());
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Time guard: if NOT within 90 days of rotation, no warnings should appear
// ---------------------------------------------------------------------------

describe("computeRotationWarnings — outside 90-day window", () => {
  it("returns no warnings when rotation is more than 90 days away", () => {
    // Jump to Jan 1 — far from Oct 1
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z").getTime());

    const cards = [makeCard({ setCode: "mid" })];
    const releaseDates = new Map([["mid", OLD_RELEASE]]);

    const warnings = computeRotationWarnings(cards, releaseDates);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupRotationWarningsBySet
// ---------------------------------------------------------------------------

describe("groupRotationWarningsBySet", () => {
  const makeWarning = (cardName: string, setCode: string, setName: string) => ({
    cardName,
    setCode,
    setName,
    daysUntilRotation: 30,
  });

  it("groups cards under their set code", () => {
    const warnings = [
      makeWarning("Alpha", "mid", "Innistrad: Midnight Hunt"),
      makeWarning("Beta", "mid", "Innistrad: Midnight Hunt"),
      makeWarning("Gamma", "vow", "Innistrad: Crimson Vow"),
    ];

    const grouped = groupRotationWarningsBySet(warnings);
    expect(grouped.size).toBe(2);
    expect(grouped.get("mid")?.cards).toEqual(["Alpha", "Beta"]);
    expect(grouped.get("vow")?.cards).toEqual(["Gamma"]);
  });

  it("preserves setName and daysUntilRotation", () => {
    const warnings = [makeWarning("Alpha", "mid", "Innistrad: Midnight Hunt")];
    const grouped = groupRotationWarningsBySet(warnings);
    const entry = grouped.get("mid")!;
    expect(entry.setName).toBe("Innistrad: Midnight Hunt");
    expect(entry.daysUntilRotation).toBe(30);
  });

  it("returns an empty map for empty input", () => {
    expect(groupRotationWarningsBySet([]).size).toBe(0);
  });

  it("handles a single card per set", () => {
    const warnings = [makeWarning("Solo Card", "neo", "Kamigawa: Neon Dynasty")];
    const grouped = groupRotationWarningsBySet(warnings);
    expect(grouped.get("neo")?.cards).toEqual(["Solo Card"]);
  });

  it("handles many sets", () => {
    const warnings = [
      makeWarning("A", "mid", "MID"),
      makeWarning("B", "vow", "VOW"),
      makeWarning("C", "neo", "NEO"),
      makeWarning("D", "snc", "SNC"),
    ];
    const grouped = groupRotationWarningsBySet(warnings);
    expect(grouped.size).toBe(4);
  });
});
