import { describe, it, expect } from "vitest";
import { detectArchetype } from "../archetype";
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

describe("detectArchetype", () => {
  it("returns a string", () => {
    expect(typeof detectArchetype([card()])).toBe("string");
  });

  it("returns 'aggro' for a low-curve creature-heavy deck", () => {
    const aggro = Array.from({ length: 36 }, () => card({ cmc: 1 }));
    expect(detectArchetype(aggro)).toBe("aggro");
  });

  it("returns 'control' for a deck heavy on instants/sorceries at high CMC", () => {
    const control = [
      ...Array.from({ length: 20 }, () => card({ cmc: 4, typeLine: "Instant" })),
      ...Array.from({ length: 16 }, () => card({ cmc: 5, typeLine: "Sorcery" })),
    ];
    expect(detectArchetype(control)).toBe("control");
  });

  it("returns 'midrange' for a balanced curve", () => {
    const midrange = [
      ...Array.from({ length: 12 }, () => card({ cmc: 2 })),
      ...Array.from({ length: 12 }, () => card({ cmc: 3 })),
      ...Array.from({ length: 12 }, () => card({ cmc: 4 })),
    ];
    expect(detectArchetype(midrange)).toBe("midrange");
  });

  it("handles empty deck without throwing", () => {
    expect(() => detectArchetype([])).not.toThrow();
  });
});
