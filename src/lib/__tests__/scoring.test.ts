import { describe, it, expect } from "vitest";
import { scoreDeck } from "../scoring";
import type { CardRecord } from "../types";

function card(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "test-id",
    oracleId: "oracle-id",
    name: "Test Card",
    manaCost: "{2}{G}",
    cmc: 3,
    typeLine: "Creature — Human",
    oracleText: "",
    power: "2",
    toughness: "2",
    colorsJson: JSON.stringify(["G"]),
    colorIdentityJson: JSON.stringify(["G"]),
    setCode: "m21",
    setName: "Core Set 2021",
    rarity: "common",
    imageUri: "",
    legalityStandard: "legal",
    legalityPioneer: "legal",
    legalityModern: "legal",
    legalityLegacy: "legal",
    legalityVintage: "legal",
    legalityCommander: "legal",
    legalityPauper: "legal",
    prices: JSON.stringify({ usd: "0.10" }),
    ...overrides,
  };
}

describe("scoreDeck", () => {
  it("returns a number between 0 and 100", () => {
    const cards = [
      ...Array.from({ length: 24 }, () => card()),
      ...Array.from({ length: 24 }, () => card({ typeLine: "Basic Land — Forest", cmc: 0, manaCost: "" })),
    ];
    const score = scoreDeck(cards);
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 0 for an empty deck", () => {
    expect(scoreDeck([])).toBe(0);
  });

  it("a balanced deck scores higher than an all-land deck", () => {
    const onlyLands = Array.from({ length: 60 }, () =>
      card({ typeLine: "Basic Land — Forest", cmc: 0, manaCost: "" })
    );
    const balanced = [
      ...Array.from({ length: 24 }, () => card()),
      ...Array.from({ length: 24 }, () => card({ typeLine: "Basic Land — Forest", cmc: 0, manaCost: "" })),
      ...Array.from({ length: 12 }, () => card({ typeLine: "Instant", cmc: 2 })),
    ];
    expect(scoreDeck(balanced)).toBeGreaterThan(scoreDeck(onlyLands));
  });

  it("is deterministic", () => {
    const cards = Array.from({ length: 40 }, () => card());
    expect(scoreDeck(cards)).toBe(scoreDeck(cards));
  });
});
