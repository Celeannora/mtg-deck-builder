import { describe, it, expect } from 'vitest';
import {
  hypergeometricPMF,
  hypergeometricCDF,
  probAtLeastOne,
  probByTurn,
  castabilityByTurn,
} from '../hypergeometric';

describe('hypergeometricPMF', () => {
  it('returns 0 when desired successes exceed successes in population', () => {
    expect(hypergeometricPMF(60, 2, 7, 3)).toBe(0);
  });

  it('returns 0 when sample size is 0 and k > 0', () => {
    expect(hypergeometricPMF(60, 4, 0, 1)).toBe(0);
  });

  it('returns 1 when drawing all cards and k equals total successes', () => {
    // P(X = 4 | N=60, K=4, n=60) = 1
    expect(hypergeometricPMF(60, 4, 60, 4)).toBeCloseTo(1, 5);
  });

  it('probabilities sum to 1 across all possible k', () => {
    const N = 20, K = 6, n = 5;
    let total = 0;
    for (let k = 0; k <= Math.min(K, n); k++) {
      total += hypergeometricPMF(N, K, n, k);
    }
    expect(total).toBeCloseTo(1, 5);
  });

  it('handles k=0 (probability of drawing zero copies)', () => {
    const p = hypergeometricPMF(60, 4, 7, 0);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('hypergeometricCDF (at-least)', () => {
  it('returns 1 when minK=0', () => {
    expect(hypergeometricCDF(60, 4, 7, 0)).toBeCloseTo(1, 5);
  });

  it('returns 0 when minK exceeds successes in population', () => {
    expect(hypergeometricCDF(60, 2, 7, 3)).toBe(0);
  });

  it('PMF and CDF are consistent: P(X>=1) + P(X=0) ≈ 1', () => {
    const atLeast1 = hypergeometricCDF(60, 4, 7, 1);
    const exactly0 = hypergeometricPMF(60, 4, 7, 0);
    expect(atLeast1 + exactly0).toBeCloseTo(1, 5);
  });
});

describe('probAtLeastOne', () => {
  it('returns ~0.397 for 4-of in 60-card deck, 7-card hand', () => {
    // Well-known MTG figure
    const p = probAtLeastOne(60, 4, 7);
    expect(p).toBeGreaterThan(0.39);
    expect(p).toBeLessThan(0.41);
  });

  it('returns 0 for 0 copies', () => {
    expect(probAtLeastOne(60, 0, 7)).toBe(0);
  });

  it('returns 1 when copies equals deck size', () => {
    expect(probAtLeastOne(4, 4, 4)).toBeCloseTo(1, 5);
  });
});

describe('probByTurn', () => {
  it('probability increases with more turns', () => {
    const p1 = probByTurn(60, 4, 1, true);
    const p5 = probByTurn(60, 4, 5, true);
    expect(p5).toBeGreaterThan(p1);
  });

  it('on-draw has higher probability than on-play same turn', () => {
    const onDraw = probByTurn(60, 4, 3, true);
    const onPlay = probByTurn(60, 4, 3, false);
    expect(onDraw).toBeGreaterThan(onPlay);
  });

  it('returns a value between 0 and 1', () => {
    const p = probByTurn(60, 4, 4, true);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('castabilityByTurn', () => {
  it('returns an array of length equal to turns parameter', () => {
    const result = castabilityByTurn(60, 4, 3, 24, 8, true);
    expect(result).toHaveLength(8);
  });

  it('each entry has the correct shape', () => {
    const result = castabilityByTurn(60, 4, 3, 24, 4, true);
    for (const entry of result) {
      expect(typeof entry.turn).toBe('number');
      expect(typeof entry.probDrawn).toBe('number');
      expect(typeof entry.probMana).toBe('number');
      expect(typeof entry.probCastable).toBe('number');
    }
  });

  it('turn numbers are sequential starting at 1', () => {
    const result = castabilityByTurn(60, 4, 2, 24, 5, true);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].turn).toBe(i + 1);
    }
  });

  it('cmc=0 card has probMana=1 on every turn', () => {
    const result = castabilityByTurn(60, 4, 0, 24, 4, true);
    for (const entry of result) {
      expect(entry.probMana).toBeCloseTo(1, 5);
    }
  });

  it('castability improves as turns increase', () => {
    const result = castabilityByTurn(60, 4, 3, 24, 8, true);
    expect(result[7].probCastable).toBeGreaterThan(result[0].probCastable);
  });
});
