import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CardRecord } from "../types";

vi.mock("../db", () => ({
  db: {
    cards: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { generateSuggestions } from "../suggestions";

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

describe("generateSuggestions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves to an array", async () => {
    const result = await generateSuggestions([card()], "standard");
    expect(result).toBeInstanceOf(Array);
  });

  it("handles empty deck without throwing", async () => {
    await expect(generateSuggestions([], "standard")).resolves.not.toThrow();
  });

  it("returns at most 20 suggestions", async () => {
    const cards = Array.from({ length: 40 }, (_, i) => card({ id: `id-${i}`, name: `Card ${i}` }));
    const suggestions = await generateSuggestions(cards, "standard");
    expect(suggestions.length).toBeLessThanOrEqual(20);
  });
});
