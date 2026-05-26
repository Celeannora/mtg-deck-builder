import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    cards: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    },
  },
}));

import { optimizeBudget } from "../budgetOptimizer";
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
    prices: JSON.stringify({ usd: "5.00" }),
    ...overrides,
  };
}

describe("optimizeBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves to an object with replacements array", async () => {
    const result = await optimizeBudget([card()], 20);
    expect(result).toHaveProperty("replacements");
    expect(result.replacements).toBeInstanceOf(Array);
  });

  it("handles empty deck", async () => {
    await expect(optimizeBudget([], 50)).resolves.not.toThrow();
  });

  it("total cost of suggestions is within budget", async () => {
    const result = await optimizeBudget([card({ prices: JSON.stringify({ usd: "30.00" }) })], 10);
    const total = result.replacements.reduce((sum: number, r: { suggestedPrice: number }) => sum + (r.suggestedPrice ?? 0), 0);
    expect(total).toBeLessThanOrEqual(10 + 0.01);
  });

  it("is deterministic across calls", async () => {
    const cards = [card(), card({ name: "Other", prices: JSON.stringify({ usd: "1.00" }) })];
    const a = await optimizeBudget(cards, 5);
    const b = await optimizeBudget(cards, 5);
    expect(a.replacements.length).toBe(b.replacements.length);
  });
});
