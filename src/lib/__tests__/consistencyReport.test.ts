import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateConsistencyReport,
  scoreConsistency,
  ConsistencyReport,
} from '../consistencyReport';

// Minimal card factory
const makeCard = (overrides: Record<string, unknown> = {}) => ({
  id: `card-${Math.random()}`,
  name: 'Test Card',
  type_line: 'Instant',
  mana_cost: '{2}{U}',
  cmc: 3,
  colors: ['U'],
  color_identity: ['U'],
  oracle_text: '',
  ...overrides,
});

const makeLand = (overrides: Record<string, unknown> = {}) =>
  makeCard({
    name: 'Island',
    type_line: 'Basic Land — Island',
    mana_cost: '',
    cmc: 0,
    oracle_text: '{T}: Add {U}.',
    ...overrides,
  });

function buildDeck(landCount = 24, spellCount = 36) {
  const entries = [
    ...Array.from({ length: landCount }, () => ({ card: makeLand(), quantity: 1 })),
    ...Array.from({ length: spellCount }, (_, i) => ({
      card: makeCard({ cmc: (i % 5) + 1 }),
      quantity: 1,
    })),
  ];
  return entries;
}

describe('generateConsistencyReport', () => {
  it('returns a report object with required fields', () => {
    const deck = buildDeck();
    const report: ConsistencyReport = generateConsistencyReport(deck);
    expect(report).toHaveProperty('landRatio');
    expect(report).toHaveProperty('avgCmc');
    expect(report).toHaveProperty('consistencyScore');
    expect(report).toHaveProperty('warnings');
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('land ratio is between 0 and 1', () => {
    const deck = buildDeck();
    const report = generateConsistencyReport(deck);
    expect(report.landRatio).toBeGreaterThan(0);
    expect(report.landRatio).toBeLessThanOrEqual(1);
  });

  it('warns when land count is too low', () => {
    const deck = buildDeck(10, 50);
    const report = generateConsistencyReport(deck);
    const hasLandWarning = report.warnings.some((w: string) =>
      w.toLowerCase().includes('land'));
    expect(hasLandWarning).toBe(true);
  });

  it('warns when land count is too high', () => {
    const deck = buildDeck(40, 20);
    const report = generateConsistencyReport(deck);
    const hasLandWarning = report.warnings.some((w: string) =>
      w.toLowerCase().includes('land'));
    expect(hasLandWarning).toBe(true);
  });

  it('produces no warnings for a balanced deck', () => {
    const deck = buildDeck(24, 36);
    const report = generateConsistencyReport(deck);
    expect(report.warnings.length).toBe(0);
  });

  it('avgCmc reflects the cards in the deck', () => {
    // All spells at cmc 2
    const deck = [
      ...Array.from({ length: 24 }, () => ({ card: makeLand(), quantity: 1 })),
      ...Array.from({ length: 36 }, () => ({ card: makeCard({ cmc: 2 }), quantity: 1 })),
    ];
    const report = generateConsistencyReport(deck);
    // Avg cmc of non-land cards should be exactly 2
    expect(report.avgCmc).toBeCloseTo(2, 1);
  });
});

describe('scoreConsistency', () => {
  it('returns a number between 0 and 100', () => {
    const deck = buildDeck();
    const score = scoreConsistency(deck);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('a balanced deck scores higher than a mana-flooded one', () => {
    const balanced = buildDeck(24, 36);
    const flooded = buildDeck(40, 20);
    expect(scoreConsistency(balanced)).toBeGreaterThan(scoreConsistency(flooded));
  });

  it('a balanced deck scores higher than a mana-starved one', () => {
    const balanced = buildDeck(24, 36);
    const starved = buildDeck(10, 50);
    expect(scoreConsistency(balanced)).toBeGreaterThan(scoreConsistency(starved));
  });

  it('does not throw for an empty deck', () => {
    expect(() => scoreConsistency([])).not.toThrow();
  });
});
