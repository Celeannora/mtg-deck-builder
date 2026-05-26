import { describe, it, expect } from "vitest";
import { exportDeckToText, exportDeckToArena, exportDeckToMTGO } from "../deckExporter";
import type { DeckEntry } from "../types";

function entry(cardName: string, quantity: number, isSideboard = false): DeckEntry {
  return { cardName, quantity, isSideboard };
}

const mainboard: DeckEntry[] = [
  entry("Lightning Bolt", 4),
  entry("Mountain", 20),
  entry("Goblin Guide", 4),
];

const withSideboard: DeckEntry[] = [
  ...mainboard,
  entry("Smash to Smithereens", 3, true),
  entry("Shattering Spree", 2, true),
];

describe("exportDeckToText", () => {
  it("includes all mainboard card names", () => {
    const out = exportDeckToText(mainboard);
    expect(out).toContain("Lightning Bolt");
    expect(out).toContain("Mountain");
    expect(out).toContain("Goblin Guide");
  });

  it("includes quantities", () => {
    const out = exportDeckToText(mainboard);
    expect(out).toContain("4");
    expect(out).toContain("20");
  });

  it("includes sideboard section label when sideboard is present", () => {
    const out = exportDeckToText(withSideboard);
    expect(out.toLowerCase()).toContain("sideboard");
    expect(out).toContain("Smash to Smithereens");
  });

  it("returns a non-empty string", () => {
    expect(exportDeckToText(mainboard).length).toBeGreaterThan(0);
  });
});

describe("exportDeckToArena", () => {
  it("includes card names", () => {
    expect(exportDeckToArena(mainboard)).toContain("Lightning Bolt");
  });

  it("separates sideboard with blank line", () => {
    expect(exportDeckToArena(withSideboard)).toMatch(/\n\n/);
  });
});

describe("exportDeckToMTGO", () => {
  it("includes card names", () => {
    expect(exportDeckToMTGO(mainboard)).toContain("Lightning Bolt");
  });

  it("labels sideboard section", () => {
    expect(exportDeckToMTGO(withSideboard).toLowerCase()).toContain("sideboard");
  });
});
