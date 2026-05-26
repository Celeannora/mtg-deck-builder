import { describe, it, expect } from "vitest";
import { compareDecks } from "../deckCompare";
import type { CardRecord } from "../types";

function card(name: string, overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: name,
    oracleId: name,
    name,
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

const deckA = [card("Lightning Bolt"), card("Mountain"), card("Goblin Guide")];
const deckB = [card("Lightning Bolt"), card("Island"), card("Brainstorm")];

describe("compareDecks", () => {
  it("returns shared and unique cards", () => {
    const result = compareDecks(deckA, deckB);
    expect(result).toHaveProperty("shared");
    expect(result).toHaveProperty("onlyInA");
    expect(result).toHaveProperty("onlyInB");
  });

  it("shared contains cards present in both decks", () => {
    const result = compareDecks(deckA, deckB);
    const sharedNames = result.shared.map((c: CardRecord) => c.name);
    expect(sharedNames).toContain("Lightning Bolt");
  });

  it("onlyInA does not contain deckB-only cards", () => {
    const result = compareDecks(deckA, deckB);
    const names = result.onlyInA.map((c: CardRecord) => c.name);
    expect(names).not.toContain("Brainstorm");
  });

  it("similarity score is between 0 and 1", () => {
    const result = compareDecks(deckA, deckB);
    if ("similarity" in result) {
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    }
  });

  it("identical decks have maximum similarity", () => {
    const result = compareDecks(deckA, deckA);
    expect(result.shared.length).toBe(deckA.length);
    expect(result.onlyInA.length).toBe(0);
    expect(result.onlyInB.length).toBe(0);
  });

  it("handles empty decks", () => {
    expect(() => compareDecks([], [])).not.toThrow();
  });
});
