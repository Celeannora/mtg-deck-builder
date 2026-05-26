import { describe, it, expect } from 'vitest';
import { buildConsistencyReport } from '../consistencyReport';
import type { DeckEntry, ConsistencyReport } from '../consistencyReport';

function makeLandEntry(overrides: Partial<DeckEntry> = {}): DeckEntry {
  return {
    name: 'Plains',
    quantity: 1,
    cmc: 0,
    manaCost: null,
    typeLine: 'Basic Land — Plains',
    producedManaJson: '["W"]',
    ...overrides,
  };
}

function makeSpellEntry(cmc: number, overrides: Partial<DeckEntry> = {}): DeckEntry {
  return {
    name: `Spell${cmc}`,
    quantity: 1,
    cmc,
    manaCost: `{${'W'.repeat(cmc)}}`,
    typeLine: 'Instant',
    ...overrides,
  };
}

function buildDeckEntries(landCount = 24, spellCount = 36): DeckEntry[] {
  return [
    ...Array.from({ length: landCount }, () => makeLandEntry()),
    ...Array.from({ length: spellCount }, (_, i) => makeSpellEntry((i % 5) + 1)),
  ];
}

describe('buildConsistencyReport — shape', () => {
  it('returns a report with all required top-level fields', () => {
    const deck = buildDeckEntries();
    const report: ConsistencyReport = buildConsistencyReport(deck, 100);
    expect(typeof report.deckSize).toBe('number');
    expect(typeof report.landCount).toBe('number');
    expect(typeof report.nonLandCount).toBe('number');
    expect(typeof report.avgManaValue).toBe('number');
    expect(typeof report.grade).toBe('string');
    expect(typeof report.summary).toBe('string');
    expect(Array.isArray(report.castabilityRows)).toBe(true);
    expect(Array.isArray(report.flaggedCards)).toBe(true);
    expect(Array.isArray(report.manaWarnings)).toBe(true);
    expect(report.handStats).toBeDefined();
  });

  it('deckSize = landCount + nonLandCount', () => {
    const deck = buildDeckEntries(24, 36);
    const report = buildConsistencyReport(deck, 100);
    expect(report.deckSize).toBe(60);
    expect(report.landCount).toBe(24);
    expect(report.nonLandCount).toBe(36);
  });

  it('grade is one of A B C D F', () => {
    const deck = buildDeckEntries();
    const report = buildConsistencyReport(deck, 100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
  });

  it('castabilityRows are sorted by cmc ascending', () => {
    const deck = buildDeckEntries();
    const report = buildConsistencyReport(deck, 100);
    for (let i = 1; i < report.castabilityRows.length; i++) {
      expect(report.castabilityRows[i].cmc).toBeGreaterThanOrEqual(
        report.castabilityRows[i - 1].cmc
      );
    }
  });

  it('flaggedCards is a subset of castabilityRows', () => {
    const deck = buildDeckEntries();
    const report = buildConsistencyReport(deck, 100);
    for (const flagged of report.flaggedCards) {
      expect(report.castabilityRows.some(r => r.cardName === flagged.cardName)).toBe(true);
    }
  });
});

describe('buildConsistencyReport — land counts', () => {
  it('warns (via flaggedCards or manaWarnings) for a severely mana-light deck', () => {
    // 10 lands / 50 spells — should not produce a perfect grade
    const deck = buildDeckEntries(10, 50);
    const report = buildConsistencyReport(deck, 200);
    const hasIssue =
      report.flaggedCards.length > 0 ||
      report.manaWarnings.length > 0 ||
      ['D', 'F'].includes(report.grade);
    expect(hasIssue).toBe(true);
  });

  it('a balanced deck (24 lands) scores A or B', () => {
    const deck = buildDeckEntries(24, 36);
    const report = buildConsistencyReport(deck, 500);
    expect(['A', 'B']).toContain(report.grade);
  });
});

describe('buildConsistencyReport — handStats', () => {
  it('handStats.keepRate is between 0 and 1', () => {
    const deck = buildDeckEntries();
    const report = buildConsistencyReport(deck, 200);
    expect(report.handStats.keepRate).toBeGreaterThanOrEqual(0);
    expect(report.handStats.keepRate).toBeLessThanOrEqual(1);
  });

  it('handStats.trials matches the passed-in trials count', () => {
    const deck = buildDeckEntries();
    const report = buildConsistencyReport(deck, 123);
    expect(report.handStats.trials).toBe(123);
  });
});

describe('buildConsistencyReport — edge cases', () => {
  it('does not throw for a very small deck (20 cards)', () => {
    const deck = buildDeckEntries(8, 12);
    expect(() => buildConsistencyReport(deck, 50)).not.toThrow();
  });

  it('does not throw for a land-only deck', () => {
    const deck = Array.from({ length: 60 }, () => makeLandEntry());
    expect(() => buildConsistencyReport(deck, 50)).not.toThrow();
  });
});
