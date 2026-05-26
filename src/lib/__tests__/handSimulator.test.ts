import { describe, it, expect, vi } from 'vitest';
import {
  simulateOpeningHand,
  runMonteCarlo,
  evaluateHand,
} from '../handSimulator';

// A minimal 60-card deck: 24 lands + 36 spells
function buildTestDeck(landCount = 24, spellCount = 36) {
  const lands = Array.from({ length: landCount }, (_, i) => ({
    id: `land-${i}`,
    name: 'Plains',
    type_line: 'Basic Land — Plains',
    mana_cost: '',
    cmc: 0,
    colors: ['W'],
    color_identity: ['W'],
    oracle_text: '{T}: Add {W}.',
  }));
  const spells = Array.from({ length: spellCount }, (_, i) => ({
    id: `spell-${i}`,
    name: `Spell ${i}`,
    type_line: 'Instant',
    mana_cost: `{${(i % 5) + 1}}`,
    cmc: (i % 5) + 1,
    colors: ['W'],
    color_identity: ['W'],
    oracle_text: 'Draw a card.',
  }));
  return [...lands, ...spells];
}

describe('simulateOpeningHand', () => {
  it('returns exactly 7 cards', () => {
    const deck = buildTestDeck();
    const hand = simulateOpeningHand(deck);
    expect(hand).toHaveLength(7);
  });

  it('all cards in hand are from the deck', () => {
    const deck = buildTestDeck();
    const ids = new Set(deck.map((c) => c.id));
    const hand = simulateOpeningHand(deck);
    for (const card of hand) {
      expect(ids.has(card.id)).toBe(true);
    }
  });

  it('returns no duplicates for 60-card deck (no 4-ofs)', () => {
    const deck = buildTestDeck();
    const hand = simulateOpeningHand(deck);
    const ids = hand.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('respects custom hand size', () => {
    const deck = buildTestDeck();
    const hand = simulateOpeningHand(deck, 5);
    expect(hand).toHaveLength(5);
  });
});

describe('evaluateHand', () => {
  it('returns a score object with numeric fields', () => {
    const deck = buildTestDeck();
    const hand = simulateOpeningHand(deck);
    const result = evaluateHand(hand, deck);
    expect(typeof result.landCount).toBe('number');
    expect(typeof result.spellCount).toBe('number');
    expect(typeof result.avgCmc).toBe('number');
    expect(typeof result.keepable).toBe('boolean');
  });

  it('classifies a hand with 0 lands as not keepable', () => {
    const deck = buildTestDeck();
    const spells = deck.filter((c) => c.cmc > 0).slice(0, 7);
    const result = evaluateHand(spells, deck);
    expect(result.keepable).toBe(false);
  });

  it('classifies a hand with 7 lands as not keepable', () => {
    const deck = buildTestDeck();
    const lands = deck.filter((c) => c.type_line.includes('Land')).slice(0, 7);
    const result = evaluateHand(lands, deck);
    expect(result.keepable).toBe(false);
  });

  it('classifies a balanced 2–4 land hand as keepable', () => {
    const deck = buildTestDeck();
    const lands = deck.filter((c) => c.type_line.includes('Land')).slice(0, 3);
    const spells = deck.filter((c) => c.cmc > 0).slice(0, 4);
    const hand = [...lands, ...spells];
    const result = evaluateHand(hand, deck);
    expect(result.keepable).toBe(true);
  });
});

describe('runMonteCarlo', () => {
  it('returns statistics with correct shape', () => {
    const deck = buildTestDeck();
    const stats = runMonteCarlo(deck, { iterations: 100 });
    expect(typeof stats.avgLandCount).toBe('number');
    expect(typeof stats.keepPercentage).toBe('number');
    expect(typeof stats.avgCmc).toBe('number');
    expect(stats.iterations).toBe(100);
  });

  it('keep percentage is between 0 and 100', () => {
    const deck = buildTestDeck();
    const stats = runMonteCarlo(deck, { iterations: 200 });
    expect(stats.keepPercentage).toBeGreaterThanOrEqual(0);
    expect(stats.keepPercentage).toBeLessThanOrEqual(100);
  });

  it('average land count is between 2 and 3 for a balanced 24-land deck', () => {
    const deck = buildTestDeck(24, 36);
    const stats = runMonteCarlo(deck, { iterations: 500 });
    expect(stats.avgLandCount).toBeGreaterThan(1.5);
    expect(stats.avgLandCount).toBeLessThan(4.5);
  });

  it('runs without throwing for a minimal deck', () => {
    const deck = buildTestDeck(20, 40);
    expect(() => runMonteCarlo(deck, { iterations: 50 })).not.toThrow();
  });
});
