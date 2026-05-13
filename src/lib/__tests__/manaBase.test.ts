import { describe, expect, it } from "vitest";
import { recommendLandCount } from "../manaBase";

describe("recommendLandCount", () => {
  it("recommends more lands for higher average CMC", () => {
    const low = recommendLandCount(2.0, 60);
    const high = recommendLandCount(3.5, 60);
    expect(high).toBeGreaterThan(low);
  });

  it("stays within 20–28 for 60-card decks", () => {
    for (const cmc of [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]) {
      const count = recommendLandCount(cmc, 60);
      expect(count).toBeGreaterThanOrEqual(20);
      expect(count).toBeLessThanOrEqual(28);
    }
  });
});
