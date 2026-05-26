import { describe, it, expect } from "vitest";
import { computePowerScore } from "../powerScore";
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

describe("computePowerScore", () => {
  it("returns a number between 0 and 10", () => {
    const score = computePowerScore([card()]);
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("returns 0 for an empty array", () => {
    expect(computePowerScore([])).toBe(0);
  });

  it("mythics score higher than commons on average", () => {
    const commons = Array.from({ length: 20 }, () =>
      card({ rarity: "common" })
    );
    const mythics = Array.from({ length: 20 }, () =>
      card({ rarity: "mythic" })
    );
    expect(computePowerScore(mythics)).toBeGreaterThanOrEqual(
      computePowerScore(commons)
    );
  });

  it("is deterministic", () => {
    const cards = [card(), card({ cmc: 5, rarity: "rare" })];
    expect(computePowerScore(cards)).toBe(computePowerScore(cards));
  });
});
