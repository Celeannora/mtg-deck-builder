import { describe, it, expect } from "vitest";
import { validateDeck, BASIC_LAND_NAMES } from "../lib/legality";
import { checkCompanionRestriction } from "../lib/companion";
import type { DeckEntry } from "../lib/legality";
import type { CardRecord } from "../lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: overrides.id ?? "card-id",
    oracleId: overrides.oracleId ?? "oracle-id",
    name: overrides.name ?? "Test Card",
    lang: "en",
    layout: "normal",
    cardFacesJson: null,
    manaCost: overrides.manaCost ?? "{1}{W}",
    cmc: overrides.cmc ?? 2,
    colorsJson: overrides.colorsJson ?? '["W"]',
    colorIdentityJson: overrides.colorIdentityJson ?? '["W"]',
    typeLine: overrides.typeLine ?? "Creature — Human",
    oracleText: overrides.oracleText ?? "",
    keywordsJson: overrides.keywordsJson ?? "[]",
    power: overrides.power ?? "2",
    toughness: overrides.toughness ?? "2",
    loyalty: null,
    producedManaJson: "[]",
    legalityStandard: overrides.legalityStandard ?? "legal",
    legalityFuture: "legal",
    bannedInStandard: overrides.bannedInStandard ?? 0,
    setCode: "xyz",
    setName: "Test Set",
    setType: "expansion",
    collectorNumber: "1",
    rarity: "common",
    imageNormal: null,
    priceUsd: null,
    priceUsdFoil: null,
    priceEur: null,
    edhrecRank: null,
    gameChanger: 0,
    flavorText: null,
    artist: null,
    searchText: "test card",
    importedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEntries(count: number, overrides: Partial<CardRecord> = {}): DeckEntry[] {
  return Array.from({ length: count }, (_, i) =>
    ({
      card: makeCard({ id: `card-${i}`, oracleId: `oracle-${i}`, name: `Card ${i}`, ...overrides }),
      quantity: 1,
      board: "main" as const,
    })
  );
}

function makeDeck60(): DeckEntry[] {
  return makeEntries(60);
}

// ─── MIN_60 ─────────────────────────────────────────────────────────────────

describe("MIN_60", () => {
  it("passes with exactly 60 main", () => {
    const result = validateDeck(makeDeck60());
    const rules = result.violations.map(v => v.rule);
    expect(rules).not.toContain("MIN_60");
    expect(rules).not.toContain("OVER_60");
  });

  it("fails with 59 main cards", () => {
    const entries = makeEntries(59);
    const result = validateDeck(entries);
    expect(result.violations.map(v => v.rule)).toContain("MIN_60");
    expect(result.legal).toBe(false);
  });

  it("warns with 61 main cards", () => {
    const entries = makeEntries(61);
    const result = validateDeck(entries);
    expect(result.violations.map(v => v.rule)).toContain("OVER_60");
  });

  it("reports correct mainCount", () => {
    const entries = makeEntries(45);
    const result = validateDeck(entries);
    expect(result.mainCount).toBe(45);
  });
});

// ─── SIDEBOARD_SIZE ──────────────────────────────────────────────────────────

describe("SIDEBOARD_SIZE", () => {
  it("passes with 0 sideboard cards", () => {
    const result = validateDeck(makeDeck60());
    expect(result.violations.map(v => v.rule)).not.toContain("SIDEBOARD_SIZE");
  });

  it("passes with 15 sideboard cards", () => {
    const main = makeDeck60();
    const side = makeEntries(15).map(e => ({ ...e, board: "side" as const }));
    const result = validateDeck([...main, ...side]);
    expect(result.violations.map(v => v.rule)).not.toContain("SIDEBOARD_SIZE");
    expect(result.sideCount).toBe(15);
  });

  it("fails with 7 sideboard cards", () => {
    const main = makeDeck60();
    const side = makeEntries(7).map(e => ({ ...e, board: "side" as const }));
    const result = validateDeck([...main, ...side]);
    expect(result.violations.map(v => v.rule)).toContain("SIDEBOARD_SIZE");
  });
});

// ─── COPY_LIMIT ──────────────────────────────────────────────────────────────

describe("COPY_LIMIT", () => {
  it("passes with exactly 4 copies", () => {
    const base = makeEntries(56);
    const card = makeCard({ id: "dupe-1", oracleId: "dupe-oracle", name: "Dupe Card" });
    const quad: DeckEntry[] = [{ card, quantity: 4, board: "main" }];
    const result = validateDeck([...base, ...quad]);
    expect(result.violations.map(v => v.rule)).not.toContain("COPY_LIMIT");
  });

  it("fails with 5 copies of a non-basic", () => {
    const base = makeEntries(55);
    const card = makeCard({ id: "dupe-1", oracleId: "dupe-oracle", name: "Dupe Card" });
    const five: DeckEntry[] = [{ card, quantity: 5, board: "main" }];
    const result = validateDeck([...base, ...five]);
    expect(result.violations.map(v => v.rule)).toContain("COPY_LIMIT");
    expect(result.violations.find(v => v.rule === "COPY_LIMIT")?.cardNames).toContain("Dupe Card");
  });

  it("allows unlimited basic lands", () => {
    const island = makeCard({ id: "isl-1", oracleId: "isl-oracle", name: "Island", typeLine: "Basic Land — Island" });
    const entries: DeckEntry[] = [{ card: island, quantity: 20, board: "main" }, ...makeEntries(40)];
    const result = validateDeck(entries);
    expect(result.violations.map(v => v.rule)).not.toContain("COPY_LIMIT");
  });

  it("counts copies split across main and side by oracle id", () => {
    // 3 in main + 2 in side = 5 total → should flag
    const base = makeEntries(57);
    const card = makeCard({ id: "sp-1", oracleId: "sp-oracle", name: "Split Card" });
    const entries: DeckEntry[] = [
      ...base,
      { card, quantity: 3, board: "main" },
      { card: { ...card, id: "sp-2" }, quantity: 2, board: "side" },
    ];
    const result = validateDeck(entries);
    expect(result.violations.map(v => v.rule)).toContain("COPY_LIMIT");
  });
});

// ─── NOT_STANDARD_LEGAL ──────────────────────────────────────────────────────

describe("NOT_STANDARD_LEGAL", () => {
  it("passes with all legal cards", () => {
    const result = validateDeck(makeDeck60());
    expect(result.violations.map(v => v.rule)).not.toContain("NOT_STANDARD_LEGAL");
  });

  it("fails when a card has legalityStandard = 'not_legal'", () => {
    const base = makeEntries(59);
    const illegal = makeCard({ id: "ill-1", oracleId: "ill-oracle", name: "Old Card", legalityStandard: "not_legal" });
    const result = validateDeck([...base, { card: illegal, quantity: 1, board: "main" }]);
    expect(result.violations.map(v => v.rule)).toContain("NOT_STANDARD_LEGAL");
    expect(result.violations.find(v => v.rule === "NOT_STANDARD_LEGAL")?.cardNames).toContain("Old Card");
  });

  it("fails when a card has legalityStandard = 'banned'", () => {
    const base = makeEntries(59);
    const banned = makeCard({ id: "ban-1", oracleId: "ban-oracle", name: "Banned Card", legalityStandard: "banned", bannedInStandard: 1 });
    const result = validateDeck([...base, { card: banned, quantity: 1, board: "main" }]);
    expect(result.violations.map(v => v.rule)).toContain("BANNED");
  });
});

// ─── BANNED ──────────────────────────────────────────────────────────────────

describe("BANNED", () => {
  it("flags banned cards explicitly", () => {
    const base = makeEntries(59);
    const banned = makeCard({ id: "b1", oracleId: "b-oracle", name: "Banned", bannedInStandard: 1 });
    const result = validateDeck([...base, { card: banned, quantity: 1, board: "main" }]);
    const violation = result.violations.find(v => v.rule === "BANNED");
    expect(violation).toBeDefined();
    expect(violation?.cardNames).toContain("Banned");
  });

  it("does not flag non-banned cards", () => {
    const result = validateDeck(makeDeck60());
    expect(result.violations.map(v => v.rule)).not.toContain("BANNED");
  });
});

// ─── legal flag ──────────────────────────────────────────────────────────────

describe("validateDeck legal flag", () => {
  it("returns legal: true for a clean 60-card deck", () => {
    expect(validateDeck(makeDeck60()).legal).toBe(true);
  });

  it("returns legal: false when any violation exists", () => {
    expect(validateDeck(makeEntries(40)).legal).toBe(false);
  });
});

// ─── Companion: Lurrus ───────────────────────────────────────────────────────

describe("companion: Lurrus of the Dream-Den", () => {
  const lurrus = makeCard({
    id: "lurrus",
    oracleId: "lurrus-oracle",
    name: "Lurrus of the Dream-Den",
    typeLine: "Legendary Creature — Cat Nightmare",
    cmc: 3,
  });

  it("satisfied when all non-land permanents have CMC ≤ 2", () => {
    const main = makeEntries(58, { cmc: 2, typeLine: "Creature — Human" });
    const lands: DeckEntry[] = [
      { card: makeCard({ id: "l1", oracleId: "l-oracle", name: "Island", typeLine: "Basic Land — Island", cmc: 0 }), quantity: 2, board: "main" },
    ];
    const result = checkCompanionRestriction(
      [{ card: lurrus, quantity: 1, board: "side" }],
      [...main, ...lands].map(e => e.card)
    );
    expect(result?.satisfied).toBe(true);
  });

  it("fails when any non-land permanent has CMC > 2", () => {
    const main = makeEntries(59, { cmc: 2, typeLine: "Creature — Human" });
    const highCmc = makeCard({ id: "high", oracleId: "high-oracle", name: "Big Spell", cmc: 5, typeLine: "Creature — Human" });
    const result = checkCompanionRestriction(
      [{ card: lurrus, quantity: 1, board: "side" }],
      [...main.map(e => e.card), highCmc]
    );
    expect(result?.satisfied).toBe(false);
    expect(result?.failureReason).toContain("Big Spell");
  });
});

// ─── Companion: Yorion ───────────────────────────────────────────────────────

describe("companion: Yorion, Sky Nomad", () => {
  const yorion = makeCard({
    id: "yorion",
    oracleId: "yorion-oracle",
    name: "Yorion, Sky Nomad",
    typeLine: "Legendary Creature — Bird Snake",
    cmc: 5,
  });

  it("satisfied with 80+ card mainboard", () => {
    const main = makeEntries(80).map(e => e.card);
    const result = checkCompanionRestriction(
      [{ card: yorion, quantity: 1, board: "side" }],
      main
    );
    expect(result?.satisfied).toBe(true);
  });

  it("fails with fewer than 80 main cards", () => {
    const main = makeEntries(60).map(e => e.card);
    const result = checkCompanionRestriction(
      [{ card: yorion, quantity: 1, board: "side" }],
      main
    );
    expect(result?.satisfied).toBe(false);
    expect(result?.failureReason).toContain("80");
  });
});

// ─── Companion: Kaheera ──────────────────────────────────────────────────────

describe("companion: Kaheera, the Orphanguard", () => {
  const kaheera = makeCard({
    id: "kaheera",
    oracleId: "kaheera-oracle",
    name: "Kaheera, the Orphanguard",
    typeLine: "Legendary Creature — Cat Elemental",
    cmc: 3,
  });

  it("satisfied when all creatures are valid subtypes", () => {
    const cats = makeEntries(60, { typeLine: "Creature — Cat" }).map(e => e.card);
    const result = checkCompanionRestriction(
      [{ card: kaheera, quantity: 1, board: "side" }],
      cats
    );
    expect(result?.satisfied).toBe(true);
  });

  it("fails when a creature is not a valid subtype", () => {
    const cats = makeEntries(59, { typeLine: "Creature — Cat" }).map(e => e.card);
    const goblin = makeCard({ id: "gob", oracleId: "gob-oracle", name: "Goblin Guide", typeLine: "Creature — Goblin" });
    const result = checkCompanionRestriction(
      [{ card: kaheera, quantity: 1, board: "side" }],
      [...cats, goblin]
    );
    expect(result?.satisfied).toBe(false);
    expect(result?.failureReason).toContain("Goblin Guide");
  });
});

// ─── Companion: Umori ────────────────────────────────────────────────────────

describe("companion: Umori, the Collector", () => {
  const umori = makeCard({
    id: "umori",
    oracleId: "umori-oracle",
    name: "Umori, the Collector",
    typeLine: "Legendary Creature — Ooze",
    cmc: 4,
  });

  it("satisfied when all non-lands share a type (Creature)", () => {
    const creatures = makeEntries(60, { typeLine: "Creature — Human" }).map(e => e.card);
    const result = checkCompanionRestriction(
      [{ card: umori, quantity: 1, board: "side" }],
      creatures
    );
    expect(result?.satisfied).toBe(true);
  });

  it("fails when non-lands have mixed types", () => {
    const creatures = makeEntries(58, { typeLine: "Creature — Human" }).map(e => e.card);
    const instant = makeCard({ id: "inst", oracleId: "inst-oracle", name: "Counterspell", typeLine: "Instant", cmc: 2 });
    const result = checkCompanionRestriction(
      [{ card: umori, quantity: 1, board: "side" }],
      [...creatures, instant]
    );
    expect(result?.satisfied).toBe(false);
  });
});

// ─── Companion: Jegantha ─────────────────────────────────────────────────────

describe("companion: Jegantha, the Wellspring", () => {
  const jegantha = makeCard({
    id: "jegantha",
    oracleId: "jegantha-oracle",
    name: "Jegantha, the Wellspring",
    typeLine: "Legendary Creature — Elemental Elk",
    cmc: 5,
  });

  it("satisfied when no card repeats a colored mana symbol", () => {
    const plain = makeEntries(60, { manaCost: "{1}{W}{U}" }).map(e => e.card);
    const result = checkCompanionRestriction(
      [{ card: jegantha, quantity: 1, board: "side" }],
      plain
    );
    expect(result?.satisfied).toBe(true);
  });

  it("fails when a card has repeated mana symbols", () => {
    const base = makeEntries(59, { manaCost: "{1}{W}" }).map(e => e.card);
    const doublepip = makeCard({ id: "dp", oracleId: "dp-oracle", name: "Double Pip", manaCost: "{W}{W}" });
    const result = checkCompanionRestriction(
      [{ card: jegantha, quantity: 1, board: "side" }],
      [...base, doublepip]
    );
    expect(result?.satisfied).toBe(false);
    expect(result?.failureReason).toContain("Double Pip");
  });
});

// ─── No companion in sideboard ───────────────────────────────────────────────

describe("checkCompanionRestriction with no companion", () => {
  it("returns null when no recognized companion is in the sideboard", () => {
    const main = makeEntries(60).map(e => e.card);
    const side: DeckEntry[] = [
      { card: makeCard({ id: "s1", name: "Random Card" }), quantity: 1, board: "side" },
    ];
    const result = checkCompanionRestriction(side, main);
    expect(result).toBeNull();
  });
});

// ─── BASIC_LAND_NAMES set ────────────────────────────────────────────────────

describe("BASIC_LAND_NAMES", () => {
  it("contains all 6 basic land names", () => {
    for (const name of ["Island", "Plains", "Swamp", "Mountain", "Forest", "Wastes"]) {
      expect(BASIC_LAND_NAMES.has(name)).toBe(true);
    }
  });
});
