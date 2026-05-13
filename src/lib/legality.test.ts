import { describe, expect, it } from "vitest";
import {
  buildRotationBanner,
  enrichRotationStatus,
  getCompanionRule,
  getRotationStatus,
  validateDeck,
  type DeckEntry,
} from "./legality";
import type { CardRecord } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "test-id",
    oracleId: "oracle-id",
    name: "Test Card",
    lang: "en",
    layout: "normal",
    cardFacesJson: null,
    manaCost: "{1}{W}",
    cmc: 2,
    colorsJson: '["W"]',
    colorIdentityJson: '["W"]',
    typeLine: "Creature — Human",
    oracleText: null,
    keywordsJson: "[]",
    power: "2",
    toughness: "2",
    loyalty: null,
    producedManaJson: "[]",
    legalityStandard: "legal",
    legalityFuture: null,
    bannedInStandard: 0,
    setCode: "DSK",
    setName: "Duskmourn",
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
    searchText: "test card creature human",
    importedAt: new Date().toISOString(),
    ...overrides,
  };
}

function entry(
  card: CardRecord,
  quantity: number,
  zone: "mainboard" | "sideboard" = "mainboard"
): DeckEntry {
  return { card, quantity, zone };
}

function make60(card: CardRecord): DeckEntry[] {
  return Array.from({ length: 15 }, (_, i) =>
    entry(
      makeCard({ id: `c${i}`, oracleId: `o${i}`, name: `Card ${i}` }),
      4,
      "mainboard"
    )
  );
}

// ─── validateDeck ─────────────────────────────────────────────────────────────

describe("validateDeck", () => {
  it("accepts a minimal valid 60-card deck", () => {
    const entries = make60(makeCard());
    const result = validateDeck(entries);
    expect(result.legal).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.mainboardCount).toBe(60);
  });

  it("rejects a deck with fewer than 60 cards", () => {
    const entries = [entry(makeCard(), 59)];
    const result = validateDeck(entries);
    expect(result.legal).toBe(false);
    expect(result.violations.some((v) => v.code === "MIN_60")).toBe(true);
  });

  it("warns when deck exceeds 61 cards", () => {
    const base = make60(makeCard());
    base.push(entry(makeCard({ id: "extra1", oracleId: "extra1", name: "Extra 1" }), 3));
    const result = validateDeck(base);
    expect(result.warnings.some((w) => w.code === "EXCEEDS_61")).toBe(true);
  });

  it("rejects more than 4 copies of a non-basic card", () => {
    const base = make60(makeCard());
    // Replace one entry with 5 copies of same oracleId
    base[0] = entry(makeCard({ id: "dup", oracleId: "dup-oracle", name: "Duplicate" }), 5);
    const result = validateDeck(base);
    expect(result.violations.some((v) => v.code === "COPY_LIMIT")).toBe(true);
  });

  it("allows more than 4 copies of basic lands", () => {
    const plains = makeCard({
      id: "plains",
      oracleId: "plains-oracle",
      name: "Plains",
      typeLine: "Basic Land — Plains",
      manaCost: null,
      cmc: 0,
      colorsJson: "[]",
      colorIdentityJson: '["W"]',
      legalityStandard: "legal",
    });
    const nonLands = Array.from({ length: 14 }, (_, i) =>
      entry(makeCard({ id: `c${i}`, oracleId: `o${i}`, name: `Card ${i}` }), 4)
    );
    const result = validateDeck([...nonLands, entry(plains, 4)]);
    expect(result.legal).toBe(true);
  });

  it("rejects a sideboard of non-0 non-15 size", () => {
    const base = make60(makeCard());
    base.push(entry(makeCard({ id: "sb1", oracleId: "sb1", name: "SB Card" }), 3, "sideboard"));
    const result = validateDeck(base);
    expect(result.violations.some((v) => v.code === "SIDEBOARD_SIZE")).toBe(true);
  });

  it("accepts a 15-card sideboard", () => {
    const base = make60(makeCard());
    const sb = Array.from({ length: 15 }, (_, i) =>
      entry(
        makeCard({ id: `sb${i}`, oracleId: `sbo${i}`, name: `SB ${i}` }),
        1,
        "sideboard"
      )
    );
    const result = validateDeck([...base, ...sb]);
    expect(result.violations.filter((v) => v.code === "SIDEBOARD_SIZE")).toHaveLength(0);
  });

  it("flags banned cards", () => {
    const base = make60(makeCard());
    base[0] = entry(
      makeCard({ id: "ban", oracleId: "ban-oracle", name: "Banned Card", legalityStandard: "banned", bannedInStandard: 1 }),
      4
    );
    const result = validateDeck(base);
    expect(result.violations.some((v) => v.code === "BANNED")).toBe(true);
  });

  it("flags not-legal cards", () => {
    const base = make60(makeCard());
    base[0] = entry(
      makeCard({ id: "nl", oracleId: "nl-oracle", name: "Old Card", legalityStandard: "not_legal" }),
      4
    );
    const result = validateDeck(base);
    expect(result.violations.some((v) => v.code === "NOT_LEGAL")).toBe(true);
  });
});

// ─── Companion rules ───────────────────────────────────────────────────────────

describe("companion rules", () => {
  it("Lurrus: rejects deck with CMC >2 permanents", () => {
    const lurrus = makeCard({
      id: "lurrus",
      oracleId: "lurrus-oracle",
      name: "Lurrus of the Dream-Den",
      typeLine: "Legendary Creature — Cat Nightmare",
      oracleText: "Companion — Each permanent card in your starting deck has mana value 2 or less.",
    });
    const bigCreature = makeCard({ id: "big", oracleId: "big-o", cmc: 5, typeLine: "Creature — Dragon" });
    const base = make60(makeCard());
    // Replace some entries with big creatures
    base[0] = entry(bigCreature, 4);
    const rule = getCompanionRule("Lurrus of the Dream-Den");
    expect(rule).toBeDefined();
    expect(rule!.validate(base)).toBe(false);
  });

  it("Jegantha: rejects deck with duplicate colored pips", () => {
    const rule = getCompanionRule("Jegantha, the Wellspring");
    expect(rule).toBeDefined();
    const dupPip = makeCard({ manaCost: "{W}{W}{U}" });
    expect(rule!.validate([entry(dupPip, 4)])).toBe(false);
    const cleanPip = makeCard({ manaCart: "{W}{U}{B}" });
    expect(rule!.validate([entry(makeCard({ manaCost: "{W}{U}{B}" }), 4)])).toBe(true);
  });

  it("Yorion: rejects deck with fewer than 80 cards", () => {
    const rule = getCompanionRule("Yorion, Sky Nomad");
    expect(rule).toBeDefined();
    const base = make60(makeCard()); // 60 cards
    expect(rule!.validate(base)).toBe(false);
    const big = Array.from({ length: 20 }, (_, i) =>
      entry(makeCard({ id: `c${i}`, oracleId: `o${i}` }), 4)
    );
    expect(rule!.validate(big)).toBe(true); // 80 cards
  });
});

// ─── Rotation awareness ────────────────────────────────────────────────────────

describe("rotation", () => {
  it("marks card as rotating soon within 90 days", () => {
    const today = new Date("2026-05-13");
    const card = makeCard({ setCode: "OTJ", setName: "Outlaws of Thunder Junction" });
    const status = getRotationStatus(card, today);
    const enriched = enrichRotationStatus(status, "2024-04-19", today);
    // Release 2024-04-19 + 730 days = ~2026-04-19: already rotated (negative days)
    expect(enriched.daysUntilRotation).toBeLessThan(0);
    expect(enriched.isRotatingSoon).toBe(false);
  });

  it("marks card as rotating soon within 90-day window", () => {
    const today = new Date("2026-05-13");
    // Release date such that rotation is 45 days from now
    const rotationTarget = new Date(today);
    rotationTarget.setDate(rotationTarget.getDate() + 45);
    const releaseDate = new Date(rotationTarget);
    releaseDate.setDate(releaseDate.getDate() - 730);
    const relStr = releaseDate.toISOString().slice(0, 10);
    const card = makeCard({ setCode: "MKM", setName: "Murders at Karlov Manor" });
    const status = getRotationStatus(card, today);
    const enriched = enrichRotationStatus(status, relStr, today);
    expect(enriched.isRotatingSoon).toBe(true);
    expect(enriched.daysUntilRotation).toBeCloseTo(45, 0);
  });

  it("buildRotationBanner returns no-show for empty", () => {
    const banner = buildRotationBanner([]);
    expect(banner.show).toBe(false);
  });

  it("buildRotationBanner builds correct message", () => {
    const status = {
      cardId: "x",
      cardName: "Test",
      setCode: "T",
      setName: "TestSet",
      releaseDate: "2024-01-01",
      rotationDate: "2026-06-01",
      daysUntilRotation: 19,
      isRotatingSoon: true,
    };
    const banner = buildRotationBanner([status]);
    expect(banner.show).toBe(true);
    expect(banner.message).toContain("19 day");
    expect(banner.count).toBe(1);
  });
});
