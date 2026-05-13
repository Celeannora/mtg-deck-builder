import { describe, expect, it } from "vitest";
import { isStandardEligible, toCardRecord } from "../scryfall";
import type { ScryfallCard } from "../types";

const base: ScryfallCard = {
  id: "abc",
  oracle_id: "oracle-abc",
  name: "Test Card",
  lang: "en",
  layout: "normal",
  cmc: 3,
  color_identity: ["R"],
  type_line: "Instant",
  legalities: { standard: "legal" },
  set: "bro",
  set_name: "The Brothers War",
  set_type: "expansion",
};

describe("isStandardEligible", () => {
  it("passes a legal English card", () => {
    expect(isStandardEligible(base)).toBe(true);
  });

  it("rejects non-English cards", () => {
    expect(isStandardEligible({ ...base, lang: "de" })).toBe(false);
  });

  it("rejects non-legal cards", () => {
    expect(isStandardEligible({ ...base, legalities: { standard: "not_legal" } })).toBe(false);
  });

  it("rejects Token type line", () => {
    expect(isStandardEligible({ ...base, type_line: "Token Creature — Goblin" })).toBe(false);
  });

  it("rejects token set_type", () => {
    expect(isStandardEligible({ ...base, set_type: "token" })).toBe(false);
  });
});

describe("toCardRecord", () => {
  it("produces a CardRecord with expected fields", () => {
    const record = toCardRecord(base, new Date().toISOString());
    expect(record.id).toBe("abc");
    expect(record.oracleId).toBe("oracle-abc");
    expect(record.legalityStandard).toBe("legal");
    expect(record.searchText).toContain("test card");
  });
});
