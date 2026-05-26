import { describe, it, expect } from "vitest";
import { computeSynergyScore } from "../synergy";
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

describe("computeSynergyScore", () => {
  it("returns a number", () => {
    expect(typeof computeSynergyScore([card(), card()])).toBe("number");
  });

  it("returns 0 for empty deck", () => {
    expect(computeSynergyScore([])).toBe(0);
  });

  it("score is >= 0", () => {
    const cards = Array.from({ length: 20 }, () => card());
    expect(computeSynergyScore(cards)).toBeGreaterThanOrEqual(0);
  });

  it("thematic deck scores higher than random", () => {
    const tribal = Array.from({ length: 20 }, () =>
      card({ typeLine: "Creature — Elf Warrior", oracleText: "Other Elves you control get +1/+1." })
    );
    const random = [
      card({ typeLine: "Instant", oracleText: "Counter target spell." }),
      card({ typeLine: "Enchantment", oracleText: "At the beginning of your upkeep, scry 1." }),
      card({ typeLine: "Artifact", oracleText: "Tap: Add {C}." }),
    ];
    expect(computeSynergyScore(tribal)).toBeGreaterThanOrEqual(computeSynergyScore(random));
  });

  it("is deterministic", () => {
    const cards = [card(), card({ name: "Other", oracleText: "Flying" })];
    expect(computeSynergyScore(cards)).toBe(computeSynergyScore(cards));
  });
});
