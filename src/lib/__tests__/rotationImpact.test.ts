import { describe, expect, it, vi, beforeEach } from "vitest";
import { analyzeRotationImpact } from "../rotationImpact";
import type { CardRecord } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    name: "Test Card",
    typeLine: "Creature",
    oracleText: null,
    flavorText: null,
    cmc: 2,
    colorsJson: JSON.stringify(["W"]),
    manaCostJson: JSON.stringify([]),
    keywordsJson: JSON.stringify([]),
    power: null,
    toughness: null,
    loyalty: null,
    rarity: "common",
    setCode: "stx",
    setName: "Strixhaven",
    collectorNumber: "001",
    imageUriNormal: null,
    imageUriSmall: null,
    priceUsd: null,
    edhrecRank: null,
    gameChanger: 0,
    legalityStandard: "legal",
    legalityFuture: "legal",
    releasedAt: "2022-04-22",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cards used in mock db
// ---------------------------------------------------------------------------

// Rotating sets: mid, vow, neo, snc
const rotatingCard = makeCard({ id: "rot-1", name: "Adeline", setCode: "mid", setName: "Innistrad: Midnight Hunt", colorsJson: JSON.stringify(["W"]) });
const anotherRotating = makeCard({ id: "rot-2", name: "Burn Down", setCode: "vow", setName: "Innistrad: Crimson Vow", cmc: 4, colorsJson: JSON.stringify(["R"]) });
const nonRotatingCard = makeCard({ id: "safe-1", name: "Safe Creature", setCode: "stx", setName: "Strixhaven" });
const replacementCard = makeCard({ id: "repl-1", name: "Replacement", setCode: "neo", setName: "Kamigawa: Neon Dynasty", cmc: 2, colorsJson: JSON.stringify(["W"]), legalityStandard: "legal" });
// NOTE: replacementCard is from "neo" which is also rotating, but the mock db
// returns it as a replacement candidate — this mirrors the real function's
// behaviour of checking the DB, not the internal set list, for replacements.

const allCards = [rotatingCard, anotherRotating, nonRotatingCard, replacementCard];

// ---------------------------------------------------------------------------
// Mock db
// ---------------------------------------------------------------------------

vi.mock("../db", () => {
  return {
    db: {
      cards: {
        where: (index: string) => ({
          equals: (val: string) => ({
            first: async () => {
              if (index === "name") return allCards.find((c) => c.name === val);
              return undefined;
            },
            filter: (fn: (c: CardRecord) => boolean) => ({
              limit: (n: number) => ({
                toArray: async () => allCards.filter((c) => c.legalityStandard === "legal" && fn(c)).slice(0, n),
              }),
            }),
          }),
        }),
      },
    },
  };
});

// ---------------------------------------------------------------------------
// analyzeRotationImpact
// ---------------------------------------------------------------------------

describe("analyzeRotationImpact — severity", () => {
  it("returns low severity when no rotating cards are in deck", async () => {
    const report = await analyzeRotationImpact(["Safe Creature"], "deck-1");
    expect(report.severity).toBe("low");
    expect(report.rotatingCards).toHaveLength(0);
  });

  it("returns medium severity for 1-4 rotating cards", async () => {
    const report = await analyzeRotationImpact(["Adeline"], "deck-1");
    expect(report.severity).toBe("medium");
    expect(report.rotatingCards).toHaveLength(1);
  });

  it("returns high severity for >4 rotating cards", async () => {
    // Repeat names to simulate 5+ unique rotating entries
    // Since the mock dedupes by name lookup, we need 5 distinct rotating names.
    // We use the same two we have and extend the allCards list inline via a
    // secondary mock for this specific test.
    const manyNames = ["Adeline", "Burn Down", "Adeline", "Burn Down", "Adeline"];
    // 5 entries total; the real impl iterates deckCardNames so duplicates count
    const report = await analyzeRotationImpact(manyNames, "deck-2");
    expect(report.severity).toBe("high");
    expect(report.rotatingCards.length).toBeGreaterThanOrEqual(5);
  });
});

describe("analyzeRotationImpact — report shape", () => {
  it("populates deckId and generatedAt", async () => {
    const report = await analyzeRotationImpact(["Safe Creature"], "my-deck");
    expect(report.deckId).toBe("my-deck");
    expect(typeof report.generatedAt).toBe("string");
    expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
  });

  it("each rotatingCard entry has required fields", async () => {
    const report = await analyzeRotationImpact(["Adeline"], "deck-1");
    const rc = report.rotatingCards[0];
    expect(rc.cardName).toBe("Adeline");
    expect(rc.setCode).toBe("mid");
    expect(rc.setName).toBe("Innistrad: Midnight Hunt");
    expect(rc.rotatesAt).toBe("Next Standard rotation");
    expect(Array.isArray(rc.replacements)).toBe(true);
  });

  it("includes replacement suggestions for rotating cards", async () => {
    const report = await analyzeRotationImpact(["Adeline"], "deck-1");
    const rc = report.rotatingCards[0];
    // replacements is populated by findReplacements — should be an array
    expect(Array.isArray(rc.replacements)).toBe(true);
  });
});

describe("analyzeRotationImpact — edge cases", () => {
  it("handles empty deck gracefully", async () => {
    const report = await analyzeRotationImpact([], "deck-empty");
    expect(report.severity).toBe("low");
    expect(report.rotatingCards).toHaveLength(0);
  });

  it("skips card names not found in db", async () => {
    const report = await analyzeRotationImpact(["Ghost Card That Does Not Exist"], "deck-1");
    expect(report.rotatingCards).toHaveLength(0);
    expect(report.severity).toBe("low");
  });

  it("mixed deck: only rotating ones appear in report", async () => {
    const report = await analyzeRotationImpact(["Adeline", "Safe Creature"], "deck-mixed");
    expect(report.rotatingCards).toHaveLength(1);
    expect(report.rotatingCards[0].cardName).toBe("Adeline");
  });

  it("set code comparison is case-insensitive", async () => {
    // The impl calls .toLowerCase() on setCode before checking the Set
    // Verify a card stored with uppercase set code is still detected
    const upperCard = makeCard({ id: "upper-1", name: "Upper Card", setCode: "MID", setName: "Innistrad: Midnight Hunt" });
    allCards.push(upperCard);
    const report = await analyzeRotationImpact(["Upper Card"], "deck-case");
    expect(report.rotatingCards).toHaveLength(1);
    allCards.pop(); // cleanup
  });
});
