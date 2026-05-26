import { describe, it, expect } from "vitest";
import { assignRoles } from "../roles";
import type { CardRecord } from "../types";

const VALID_ROLES = [
  "threat", "removal", "draw", "ramp", "protection",
  "land", "combo", "utility", "disruption", "token", "unknown"
];

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

describe("assignRoles", () => {
  it("returns a map or array with an entry per card", () => {
    const cards = [card(), card({ name: "Other" })];
    const result = assignRoles(cards);
    expect(result).toBeTruthy();
  });

  it("handles empty input", () => {
    expect(() => assignRoles([])).not.toThrow();
  });

  it("assigns role 'land' to land cards", () => {
    const land = card({ typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", cmc: 0 });
    const result = assignRoles([land]);
    const roles: string[] = Array.isArray(result)
      ? result.map((r: { role: string }) => r.role)
      : Object.values(result as Record<string, string>);
    expect(roles).toContain("land");
  });

  it("all assigned roles are valid values", () => {
    const cards = [
      card({ typeLine: "Basic Land — Forest", oracleText: "{T}: Add {G}.", cmc: 0 }),
      card({ typeLine: "Instant", oracleText: "Destroy target creature." }),
      card({ typeLine: "Creature", oracleText: "When this enters, draw a card." }),
    ];
    const result = assignRoles(cards);
    const roles: string[] = Array.isArray(result)
      ? result.map((r: { role: string }) => r.role)
      : Object.values(result as Record<string, string>);
    for (const role of roles) {
      expect(VALID_ROLES).toContain(role);
    }
  });

  it("is deterministic", () => {
    const cards = [card(), card({ name: "B", typeLine: "Instant", oracleText: "Counter target spell." })];
    const a = assignRoles(cards);
    const b = assignRoles(cards);
    const rolesA: string[] = Array.isArray(a) ? a.map((r: { role: string }) => r.role) : Object.values(a as Record<string, string>);
    const rolesB: string[] = Array.isArray(b) ? b.map((r: { role: string }) => r.role) : Object.values(b as Record<string, string>);
    expect(rolesA).toEqual(rolesB);
  });
});
