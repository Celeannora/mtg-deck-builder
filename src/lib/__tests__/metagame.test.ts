import { describe, it, expect } from 'vitest';
import {
  CURRENT_METAGAME,
  getMetaByTier,
  getMetaSorted,
  getSnapshotAgeDays,
  isSnapshotStale,
} from '../metagame';

describe('CURRENT_METAGAME snapshot', () => {
  it('has a snapshotDate string', () => {
    expect(typeof CURRENT_METAGAME.snapshotDate).toBe('string');
    expect(CURRENT_METAGAME.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('format is Standard', () => {
    expect(CURRENT_METAGAME.format).toBe('Standard');
  });

  it('has at least 5 entries', () => {
    expect(CURRENT_METAGAME.entries.length).toBeGreaterThanOrEqual(5);
  });

  it('all entries have required fields', () => {
    for (const entry of CURRENT_METAGAME.entries) {
      expect(typeof entry.archetype).toBe('string');
      expect(Array.isArray(entry.colors)).toBe(true);
      expect(typeof entry.metaShare).toBe('number');
      expect([1, 2, 3]).toContain(entry.tier);
      expect(['rising', 'stable', 'falling']).toContain(entry.trend);
      expect(Array.isArray(entry.keyCards)).toBe(true);
    }
  });

  it('meta shares sum to approximately 100', () => {
    const total = CURRENT_METAGAME.entries.reduce((s, e) => s + e.metaShare, 0);
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThanOrEqual(105);
  });

  it('Tier 1 entries all have metaShare >= 8', () => {
    const t1 = CURRENT_METAGAME.entries.filter((e) => e.tier === 1);
    for (const e of t1) {
      expect(e.metaShare).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('getMetaByTier', () => {
  it('returns only entries of the requested tier', () => {
    for (const tier of [1, 2, 3] as const) {
      const entries = getMetaByTier(tier);
      for (const e of entries) {
        expect(e.tier).toBe(tier);
      }
    }
  });

  it('returns non-empty arrays for all three tiers', () => {
    expect(getMetaByTier(1).length).toBeGreaterThan(0);
    expect(getMetaByTier(2).length).toBeGreaterThan(0);
    expect(getMetaByTier(3).length).toBeGreaterThan(0);
  });
});

describe('getMetaSorted', () => {
  it('returns entries sorted by metaShare descending', () => {
    const sorted = getMetaSorted();
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].metaShare).toBeGreaterThanOrEqual(sorted[i].metaShare);
    }
  });

  it('does not mutate the original entries array', () => {
    const original = [...CURRENT_METAGAME.entries];
    getMetaSorted();
    expect(CURRENT_METAGAME.entries[0].archetype).toBe(original[0].archetype);
  });
});

describe('getSnapshotAgeDays', () => {
  it('returns 0 on snapshot date', () => {
    const snapDate = new Date(CURRENT_METAGAME.snapshotDate);
    expect(getSnapshotAgeDays(snapDate)).toBe(0);
  });

  it('returns positive number for dates after snapshot', () => {
    const future = new Date(CURRENT_METAGAME.snapshotDate);
    future.setDate(future.getDate() + 10);
    expect(getSnapshotAgeDays(future)).toBe(10);
  });
});

describe('isSnapshotStale', () => {
  it('returns false on snapshot date', () => {
    const snapDate = new Date(CURRENT_METAGAME.snapshotDate);
    expect(isSnapshotStale(14, snapDate)).toBe(false);
  });

  it('returns true when older than threshold', () => {
    const old = new Date(CURRENT_METAGAME.snapshotDate);
    old.setDate(old.getDate() + 20);
    expect(isSnapshotStale(14, old)).toBe(true);
  });

  it('uses 14 days as default threshold', () => {
    const snapDate = new Date(CURRENT_METAGAME.snapshotDate);
    snapDate.setDate(snapDate.getDate() + 15);
    expect(isSnapshotStale(undefined, snapDate)).toBe(true);
  });
});
