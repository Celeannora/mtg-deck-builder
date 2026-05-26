import { describe, it, expect } from "vitest";
import { analyzeWhatsMissing } from "../whatsMissing";
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
    prices: JSON.stringify({ usd: "0.10" }),
    ...overrides,
  };
}

describe("analyzeWhatsMissing", () => {
  it("returns an array", () => {
    expect(analyzeWhatsMissing([card()])).toBeInstanceOf(Array);
  });

  it("handles empty deck without throwing", () => {
    expect(() => analyzeWhatsMissing([])).not.toThrow();
  });

  it("each entry has a category and description", () => {
    const result = analyzeWhatsMissing([card()]);
    for (const item of result) {
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("description");
    }
  });

  it("a creature-only deck flags missing interaction", () => {
    const onlyCreatures = Array.from({ length: 24 }, () => card({ typeLine: "Creature" }));
    const result = analyzeWhatsMissing(onlyCreatures);
    const categories = result.map((r: { category: string }) => r.category.toLowerCase());
    const hasInteraction = categories.some((c: string) =>
      c.includes("removal") || c.includes("interaction") || c.includes("instant") || c.includes("answer")
    );
    expect(hasInteraction).toBe(true);
  });

  it("is deterministic", () => {
    const cards = [card(), card({ typeLine: "Instant" })];
    const a = analyzeWhatsMissing(cards);
    const b = analyzeWhatsMissing(cards);
    expect(a.length).toBe(b.length);
  });
});
