import { describe, it, expect } from 'vitest';
import {
  hypergeometric,
  probabilityOfDrawingAtLeast,
  probabilityOfDrawingExactly,
  landProbabilityTable,
} from '../hypergeometric';

describe('hypergeometric core', () => {
  it('returns 1 when drawing entire population', () => {
    // Drawing all 60 cards from 60-card deck — probability of any card = 1
    const p = hypergeometric({ populationSize: 60, successesInPop: 4, sampleSize: 60, desiredSuccesses: 1 });
    expect(p).toBeCloseTo(1, 5);
  });

  it('returns 0 when desired successes exceed successes in population', () => {
    const p = hypergeometric({ populationSize: 60, successesInPop: 2, sampleSize: 7, desiredSuccesses: 3 });
    expect(p).toBe(0);
  });

  it('returns 0 when sample size is 0', () => {
    const p = hypergeometric({ populationSize: 60, successesInPop: 4, sampleSize: 0, desiredSuccesses: 1 });
    expect(p).toBe(0);
  });

  it('computes known opening-hand probability for 4-of in 60-card deck', () => {
    // Drawing 7 cards, 4 copies of a card in 60-card deck
    // P(at least 1) ≈ 0.3966 is a well-known MTG figure
    const p = probabilityOfDrawingAtLeast({
      populationSize: 60,
      successesInPop: 4,
      sampleSize: 7,
      desiredSuccesses: 1,
    });
    expect(p).toBeGreaterThan(0.39);
    expect(p).toBeLessThan(0.41);
  });

  it('at-least and exactly are consistent for k=0', () => {
    const params = { populationSize: 60, successesInPop: 4, sampleSize: 7, desiredSuccesses: 0 };
    const exactly = probabilityOfDrawingExactly(params);
    const atLeast = probabilityOfDrawingAtLeast({ ...params, desiredSuccesses: 1 });
    expect(exactly + atLeast).toBeCloseTo(1, 5);
  });

  it('probabilities sum to 1 across all possible k', () => {
    const pop = 20, succ = 6, sample = 5;
    let total = 0;
    for (let k = 0; k <= Math.min(succ, sample); k++) {
      total += probabilityOfDrawingExactly({
        populationSize: pop,
        successesInPop: succ,
        sampleSize: sample,
        desiredSuccesses: k,
      });
    }
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('hypergeometric edge cases', () => {
  it('handles a 1-card population', () => {
    const p = probabilityOfDrawingAtLeast({ populationSize: 1, successesInPop: 1, sampleSize: 1, desiredSuccesses: 1 });
    expect(p).toBeCloseTo(1, 5);
  });

  it('returns 0 when no successes in population', () => {
    const p = probabilityOfDrawingAtLeast({ populationSize: 60, successesInPop: 0, sampleSize: 7, desiredSuccesses: 1 });
    expect(p).toBe(0);
  });

  it('desiredSuccesses 0 always returns non-zero probability', () => {
    const p = probabilityOfDrawingExactly({ populationSize: 60, successesInPop: 4, sampleSize: 7, desiredSuccesses: 0 });
    expect(p).toBeGreaterThan(0);
  });
});

describe('landProbabilityTable', () => {
  it('returns a table with entries for each land count', () => {
    const table = landProbabilityTable({ deckSize: 60, sampleSize: 7 });
    expect(Array.isArray(table)).toBe(true);
    expect(table.length).toBeGreaterThan(0);
  });

  it('each entry has landCount and probability fields', () => {
    const table = landProbabilityTable({ deckSize: 60, sampleSize: 7 });
    for (const row of table) {
      expect(typeof row.landCount).toBe('number');
      expect(typeof row.probability).toBe('number');
      expect(row.probability).toBeGreaterThanOrEqual(0);
      expect(row.probability).toBeLessThanOrEqual(1);
    }
  });

  it('probability peaks somewhere in the 2–3 land range for 24 lands / 7 cards', () => {
    const table = landProbabilityTable({ deckSize: 60, sampleSize: 7, landCount: 24 });
    const peak = table.reduce((best, row) =>
      row.probability > best.probability ? row : best, table[0]);
    expect(peak.landCount).toBeGreaterThanOrEqual(2);
    expect(peak.landCount).toBeLessThanOrEqual(3);
  });
});
