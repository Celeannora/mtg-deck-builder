import { describe, it, expect } from "vitest";
import { exportDeckToText, exportDeckToArena, exportDeckToMTGO } from "../deckExporter";
import type { DeckEntry } from "../types";

function entry(name: string, qty: number, side = false): DeckEntry {
  return { cardName: name, quantity: qty, isSideboard: side };
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
    const output = exportDeckToText(mainboard);
    expect(output).toContain("Lightning Bolt");
    expect(output).toContain("Mountain");
    expect(output).toContain("Goblin Guide");
  });

  it("includes quantities", () => {
    const output = exportDeckToText(mainboard);
    expect(output).toContain("4");
    expect(output).toContain("20");
  });

  it("includes sideboard section when sideboard cards present", () => {
    const output = exportDeckToText(withSideboard);
    expect(output.toLowerCase()).toContain("sideboard");
    expect(output).toContain("Smash to Smithereens");
  });

  it("returns a non-empty string", () => {
    expect(exportDeckToText(mainboard).length).toBeGreaterThan(0);
  });
});

describe("exportDeckToArena", () => {
  it("produces a string with card names", () => {
    const output = exportDeckToArena(mainboard);
    expect(output).toContain("Lightning Bolt");
  });

  it("separates sideboard with a blank line", () => {
    const output = exportDeckToArena(withSideboard);
    // Arena format uses blank line between main and side
    expect(output).toMatch(/\n\n/);
  });
});

describe("exportDeckToMTGO", () => {
  it("produces a string with card names", () => {
    const output = exportDeckToMTGO(mainboard);
    expect(output).toContain("Lightning Bolt");
  });

  it("labels sideboard section", () => {
    const output = exportDeckToMTGO(withSideboard);
    expect(output.toLowerCase()).toContain("sideboard");
  });
});
