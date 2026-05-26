import { describe, it, expect } from "vitest";
import { buildMatchupMatrix } from "../matchupMatrix";

describe("buildMatchupMatrix", () => {
  const archetypes = ["aggro", "control", "midrange"];

  it("returns a matrix object", () => {
    const result = buildMatchupMatrix(archetypes);
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });

  it("matrix has an entry for each archetype", () => {
    const result = buildMatchupMatrix(archetypes);
    for (const arch of archetypes) {
      expect(result).toHaveProperty(arch);
    }
  });

  it("win rates are between 0 and 100", () => {
    const result = buildMatchupMatrix(archetypes);
    for (const row of Object.values(result) as Record<string, number>[]) {
      for (const winRate of Object.values(row)) {
        expect(winRate).toBeGreaterThanOrEqual(0);
        expect(winRate).toBeLessThanOrEqual(100);
      }
    }
  });

  it("aggro vs control + control vs aggro = 100", () => {
    const result = buildMatchupMatrix(archetypes) as Record<string, Record<string, number>>;
    const aggroVsControl = result["aggro"]["control"];
    const controlVsAggro = result["control"]["aggro"];
    if (aggroVsControl !== undefined && controlVsAggro !== undefined) {
      expect(Math.round(aggroVsControl + controlVsAggro)).toBe(100);
    }
  });

  it("handles empty archetype list", () => {
    expect(() => buildMatchupMatrix([])).not.toThrow();
  });
});
