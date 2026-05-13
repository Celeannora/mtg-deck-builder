import { describe, expect, it } from "vitest";
import { validateDeck, type DeckValidationInput } from "../legality";

describe("validateDeck", () => {
  const makeCard = (oracleId: string, name: string, typeLine = "Creature"): DeckValidationInput["mainboard"][0] => ({
    oracleId,
    name,
    typeLine,
    legalityStandard: "legal",
    bannedInStandard: 0,
  });

  it("passes a valid 60-card deck with legal cards", () => {
    const mainboard = Array.from({ length: 15 }, (_, i) =>
      ({ ...makeCard(`id${i}`, `Card ${i}`), quantity: 4 })
    );
    const result = validateDeck({ mainboard, sideboard: [] });
    expect(result.isLegal).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("flags a deck with fewer than 60 cards", () => {
    const mainboard = [{ ...makeCard("id1", "Card 1"), quantity: 59 }];
    const result = validateDeck({ mainboard, sideboard: [] });
    expect(result.violations.some((v) => v.code === "UNDER_MINIMUM")).toBe(true);
  });

  it("flags more than 4 copies of a non-basic card", () => {
    const mainboard = [{ ...makeCard("id1", "Lightning Bolt"), quantity: 5 }];
    const result = validateDeck({ mainboard, sideboard: [] });
    expect(result.violations.some((v) => v.code === "OVER_FOUR_COPIES")).toBe(true);
  });

  it("allows any number of basic lands", () => {
    const mainboard = [{ ...makeCard("basic1", "Island", "Basic Land — Island"), quantity: 40 }];
    const result = validateDeck({ mainboard, sideboard: [] });
    expect(result.violations.filter((v) => v.code === "OVER_FOUR_COPIES")).toHaveLength(0);
  });

  it("flags banned cards", () => {
    const mainboard = [{ ...makeCard("banned1", "Banned Card"), bannedInStandard: 1, quantity: 1 }];
    const result = validateDeck({ mainboard, sideboard: [] });
    expect(result.violations.some((v) => v.code === "BANNED_CARD")).toBe(true);
  });

  it("flags sideboard over 15 cards", () => {
    const mainboard = [{ ...makeCard("id1", "Card"), quantity: 60 }];
    const sideboard = [{ ...makeCard("id2", "Side Card"), quantity: 16 }];
    const result = validateDeck({ mainboard, sideboard });
    expect(result.violations.some((v) => v.code === "SIDEBOARD_OVER_15")).toBe(true);
  });
});
