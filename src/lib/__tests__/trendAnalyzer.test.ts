import { describe, it, expect } from "vitest";
import { analyzeTrends } from "../trendAnalyzer";
import type { CardRecord } from "../types";

function card(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "id",
    oracleId: "oid",
    name: "Card",
    manaCost: "{2}{G}",
    cmc: 3,
    typeLine: "Creature",
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
    prices: JSON.stringify({ usd: "0.10", usd_foil: "1.00" }),
    ...overrides,
  };
}

describe("analyzeTrends", () => {
  it("returns an array", () => {
    expect(analyzeTrends([card()])).toBeInstanceOf(Array);
  });

  it("handles empty input", () => {
    expect(analyzeTrends([])).toHaveLength(0);
  });

  it("each entry has cardName and trend fields", () => {
    const result = analyzeTrends([card({ name: "Lightning Bolt", prices: JSON.stringify({ usd: "2.50" }) })]);
    for (const entry of result) {
      expect(entry).toHaveProperty("cardName");
      expect(entry).toHaveProperty("trend");
    }
  });

  it("trend values are valid", () => {
    const result = analyzeTrends([card(), card({ name: "Other" })]);
    const validTrends = ["rising", "falling", "stable", "unknown"];
    for (const entry of result) {
      expect(validTrends).toContain(entry.trend);
    }
  });

  it("is deterministic", () => {
    const cards = [card(), card({ name: "B", prices: JSON.stringify({ usd: "10.00" }) })];
    const a = analyzeTrends(cards);
    const b = analyzeTrends(cards);
    expect(a.map((e: { cardName: string }) => e.cardName)).toEqual(b.map((e: { cardName: string }) => e.cardName));
  });
});
