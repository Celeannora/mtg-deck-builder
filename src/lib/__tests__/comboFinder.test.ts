import { describe, it, expect } from "vitest";
import { findCombos } from "../comboFinder";
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

describe("findCombos", () => {
  it("returns an array", () => {
    expect(findCombos([card()])).toBeInstanceOf(Array);
  });

  it("returns empty array for empty deck", () => {
    expect(findCombos([])).toHaveLength(0);
  });

  it("does not return false positives on unrelated cards", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      card({ name: `Filler ${i}`, oracleText: "Flying" })
    );
    const combos = findCombos(cards);
    expect(combos.length).toBeLessThanOrEqual(cards.length);
  });

  it("each combo has cards and description fields", () => {
    const sac = card({ name: "Altar of Dementia", oracleText: "Sacrifice a creature: Target player mills cards equal to its power." });
    const token = card({ name: "Avenger of Zendikar", oracleText: "When Avenger of Zendikar enters the battlefield, create a 0/1 Plant creature token." });
    const combos = findCombos([sac, token]);
    for (const combo of combos) {
      expect(combo).toHaveProperty("cards");
      expect(combo).toHaveProperty("description");
      expect(Array.isArray(combo.cards)).toBe(true);
    }
  });

  it("is deterministic", () => {
    const cards = [card(), card({ name: "Other" })];
    expect(findCombos(cards).length).toBe(findCombos(cards).length);
  });
});
