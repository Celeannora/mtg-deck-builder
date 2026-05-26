import { describe, it, expect } from 'vitest';
import {
  simulateHands,
  isKeepable,
  deckToSimCards,
} from '../handSimulator';
import type { SimCard } from '../handSimulator';

// Build a flat SimCard array: landCount lands + spellCount spells
function buildSimDeck(landCount = 24, spellCount = 36): SimCard[] {
  const lands: SimCard[] = Array.from({ length: landCount }, (_, i) => ({
    name: 'Plains',
    cmc: 0,
    manaCost: null,
    isLand: true,
  }));
  const spells: SimCard[] = Array.from({ length: spellCount }, (_, i) => ({
    name: `Spell ${i}`,
    cmc: (i % 5) + 1,
    manaCost: `{${(i % 5) + 1}}`,
    isLand: false,
  }));
  return [...lands, ...spells];
}

describe('isKeepable', () => {
  it('returns true for a hand with 2 lands (min boundary)', () => {
    const hand: SimCard[] = [
      ...Array(2).fill({ name: 'Plains', cmc: 0, manaCost: null, isLand: true }),
      ...Array(5).fill({ name: 'Spell', cmc: 2, manaCost: '{2}', isLand: false }),
    ];
    expect(isKeepable(hand)).toBe(true);
  });

  it('returns true for a hand with 5 lands (max boundary)', () => {
    const hand: SimCard[] = [
      ...Array(5).fill({ name: 'Plains', cmc: 0, manaCost: null, isLand: true }),
      ...Array(2).fill({ name: 'Spell', cmc: 2, manaCost: '{2}', isLand: false }),
    ];
    expect(isKeepable(hand)).toBe(true);
  });

  it('returns false for a hand with 0 lands', () => {
    const hand: SimCard[] = Array(7).fill({ name: 'Spell', cmc: 2, manaCost: '{2}', isLand: false });
    expect(isKeepable(hand)).toBe(false);
  });

  it('returns false for a hand with 7 lands', () => {
    const hand: SimCard[] = Array(7).fill({ name: 'Plains', cmc: 0, manaCost: null, isLand: true });
    expect(isKeepable(hand)).toBe(false);
  });

  it('respects custom min/max parameters', () => {
    const hand: SimCard[] = [
      ...Array(1).fill({ name: 'Plains', cmc: 0, manaCost: null, isLand: true }),
      ...Array(6).fill({ name: 'Spell', cmc: 1, manaCost: '{1}', isLand: false }),
    ];
    expect(isKeepable(hand, 1, 6)).toBe(true);
    expect(isKeepable(hand, 2, 5)).toBe(false);
  });
});

describe('simulateHands', () => {
  it('returns a summary with correct shape', () => {
    const deck = buildSimDeck();
    const stats = simulateHands(deck, 200);
    expect(typeof stats.trials).toBe('number');
    expect(typeof stats.avgLandsInHand).toBe('number');
    expect(typeof stats.keepRate).toBe('number');
    expect(typeof stats.screwRate).toBe('number');
    expect(typeof stats.floodRate).toBe('number');
    expect(typeof stats.onCurveRates).toBe('object');
  });

  it('trials field matches the requested trial count', () => {
    const deck = buildSimDeck();
    const stats = simulateHands(deck, 150);
    expect(stats.trials).toBe(150);
  });

  it('keep rate is between 0 and 1', () => {
    const deck = buildSimDeck();
    const stats = simulateHands(deck, 300);
    expect(stats.keepRate).toBeGreaterThanOrEqual(0);
    expect(stats.keepRate).toBeLessThanOrEqual(1);
  });

  it('avgLandsInHand is between 2 and 3 for a balanced 24-land deck', () => {
    const deck = buildSimDeck(24, 36);
    const stats = simulateHands(deck, 1000, 7, 42);
    expect(stats.avgLandsInHand).toBeGreaterThan(1.5);
    expect(stats.avgLandsInHand).toBeLessThan(4.5);
  });

  it('screw + flood + middle rates are plausible', () => {
    const deck = buildSimDeck();
    const stats = simulateHands(deck, 500);
    expect(stats.screwRate).toBeGreaterThanOrEqual(0);
    expect(stats.floodRate).toBeGreaterThanOrEqual(0);
    expect(stats.screwRate + stats.floodRate).toBeLessThanOrEqual(1);
  });

  it('stores trials_detail only when trials <= 1000', () => {
    const deck = buildSimDeck();
    const small = simulateHands(deck, 100, 7, 1);
    expect(small.trials_detail).toBeDefined();
    expect(small.trials_detail!.length).toBe(100);

    const large = simulateHands(deck, 1001, 7, 1);
    expect(large.trials_detail).toBeUndefined();
  });

  it('produces deterministic results with the same seed', () => {
    const deck = buildSimDeck();
    const a = simulateHands(deck, 200, 7, 99);
    const b = simulateHands(deck, 200, 7, 99);
    expect(a.avgLandsInHand).toBe(b.avgLandsInHand);
    expect(a.keepRate).toBe(b.keepRate);
  });
});

describe('deckToSimCards', () => {
  it('expands quantity into flat array', () => {
    const entries = [
      { name: 'Island', quantity: 4, cmc: 0, manaCost: null, typeLine: 'Basic Land — Island', producedManaJson: '["U"]' },
      { name: 'Counterspell', quantity: 2, cmc: 2, manaCost: '{U}{U}', typeLine: 'Instant' },
    ];
    const cards = deckToSimCards(entries);
    expect(cards).toHaveLength(6);
    expect(cards.filter(c => c.isLand)).toHaveLength(4);
    expect(cards.filter(c => !c.isLand)).toHaveLength(2);
  });

  it('sets isLand correctly based on typeLine', () => {
    const entries = [
      { name: 'Forest', quantity: 1, cmc: 0, manaCost: null, typeLine: 'Basic Land — Forest' },
      { name: 'Lightning Bolt', quantity: 1, cmc: 1, manaCost: '{R}', typeLine: 'Instant' },
    ];
    const cards = deckToSimCards(entries);
    expect(cards.find(c => c.name === 'Forest')?.isLand).toBe(true);
    expect(cards.find(c => c.name === 'Lightning Bolt')?.isLand).toBe(false);
  });

  it('returns empty array for empty input', () => {
    expect(deckToSimCards([])).toHaveLength(0);
  });
});
