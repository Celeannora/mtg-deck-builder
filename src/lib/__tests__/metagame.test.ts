import { describe, it, expect } from "vitest";
import { fetchMetagameSnapshot } from "../metagame";

describe("fetchMetagameSnapshot", () => {
  it("resolves to a non-empty array", async () => {
    const snapshot = await fetchMetagameSnapshot();
    expect(snapshot).toBeInstanceOf(Array);
    expect(snapshot.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", async () => {
    const snapshot = await fetchMetagameSnapshot();
    for (const deck of snapshot) {
      expect(typeof deck.name).toBe("string");
      expect(deck.name.length).toBeGreaterThan(0);
      expect(typeof deck.tier).toBe("string");
      expect(["S", "A", "B", "C", "D"]).toContain(deck.tier);
      expect(typeof deck.metaShare).toBe("number");
      expect(deck.metaShare).toBeGreaterThanOrEqual(0);
      expect(deck.metaShare).toBeLessThanOrEqual(100);
    }
  });

  it("meta shares sum to a plausible total", async () => {
    const snapshot = await fetchMetagameSnapshot();
    const total = snapshot.reduce((acc, d) => acc + d.metaShare, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(101);
  });

  it("contains at least one S or A tier deck", async () => {
    const snapshot = await fetchMetagameSnapshot();
    const topTier = snapshot.filter((d) => d.tier === "S" || d.tier === "A");
    expect(topTier.length).toBeGreaterThan(0);
  });

  it("is deterministic across repeated calls", async () => {
    const a = await fetchMetagameSnapshot();
    const b = await fetchMetagameSnapshot();
    expect(a.map((d) => d.name)).toEqual(b.map((d) => d.name));
  });
});
