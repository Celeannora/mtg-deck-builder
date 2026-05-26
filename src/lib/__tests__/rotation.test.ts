import { describe, it, expect } from 'vitest';
import {
  getRotationInfo,
  isSetRotatingSoon,
  isSetStandardLegal,
  NEXT_STANDARD_ROTATION,
  STANDARD_LEGAL_SETS,
  SETS_LEAVING_AT_NEXT_ROTATION,
} from '../rotation';

describe('NEXT_STANDARD_ROTATION constant', () => {
  it('is in 2027, not 2026', () => {
    expect(NEXT_STANDARD_ROTATION.getFullYear()).toBe(2027);
  });

  it('is a valid Date object', () => {
    expect(NEXT_STANDARD_ROTATION).toBeInstanceOf(Date);
    expect(isNaN(NEXT_STANDARD_ROTATION.getTime())).toBe(false);
  });
});

describe('STANDARD_LEGAL_SETS', () => {
  it('includes Wilds of Eldraine', () => {
    expect(STANDARD_LEGAL_SETS).toContain('Wilds of Eldraine');
  });

  it('includes Tarkir: Dragonstorm', () => {
    expect(STANDARD_LEGAL_SETS).toContain('Tarkir: Dragonstorm');
  });

  it('has at least 6 sets', () => {
    expect(STANDARD_LEGAL_SETS.length).toBeGreaterThanOrEqual(6);
  });
});

describe('SETS_LEAVING_AT_NEXT_ROTATION', () => {
  it('includes the four oldest sets', () => {
    expect(SETS_LEAVING_AT_NEXT_ROTATION).toContain('Wilds of Eldraine');
    expect(SETS_LEAVING_AT_NEXT_ROTATION).toContain('The Lost Caverns of Ixalan');
    expect(SETS_LEAVING_AT_NEXT_ROTATION).toContain('Murders at Karlov Manor');
    expect(SETS_LEAVING_AT_NEXT_ROTATION).toContain('Outlaws of Thunder Junction');
  });

  it('does not include newer sets', () => {
    expect(SETS_LEAVING_AT_NEXT_ROTATION).not.toContain('Tarkir: Dragonstorm');
    expect(SETS_LEAVING_AT_NEXT_ROTATION).not.toContain('Bloomburrow');
  });
});

describe('getRotationInfo', () => {
  it('returns more than 0 days when called today (2026)', () => {
    const info = getRotationInfo(new Date('2026-05-25'));
    expect(info.daysUntilRotation).toBeGreaterThan(200);
  });

  it('returns 0 days on or after rotation date', () => {
    const info = getRotationInfo(new Date('2027-03-01'));
    expect(info.daysUntilRotation).toBe(0);
  });

  it('isRotationImminent is false today', () => {
    const info = getRotationInfo(new Date('2026-05-25'));
    expect(info.isRotationImminent).toBe(false);
  });

  it('isRotationImminent is true 30 days before rotation', () => {
    const almostThere = new Date(NEXT_STANDARD_ROTATION);
    almostThere.setDate(almostThere.getDate() - 30);
    const info = getRotationInfo(almostThere);
    expect(info.isRotationImminent).toBe(true);
  });

  it('leavingSets and currentSets are non-empty arrays', () => {
    const info = getRotationInfo();
    expect(Array.isArray(info.leavingSets)).toBe(true);
    expect(info.leavingSets.length).toBeGreaterThan(0);
    expect(Array.isArray(info.currentSets)).toBe(true);
    expect(info.currentSets.length).toBeGreaterThan(0);
  });
});

describe('isSetRotatingSoon', () => {
  it('returns true for sets leaving at next rotation', () => {
    expect(isSetRotatingSoon('Wilds of Eldraine')).toBe(true);
  });

  it('returns false for sets staying in Standard', () => {
    expect(isSetRotatingSoon('Tarkir: Dragonstorm')).toBe(false);
  });

  it('returns false for unknown set names', () => {
    expect(isSetRotatingSoon('Totally Made Up Set')).toBe(false);
  });
});

describe('isSetStandardLegal', () => {
  it('returns true for all currently legal sets', () => {
    for (const set of STANDARD_LEGAL_SETS) {
      expect(isSetStandardLegal(set)).toBe(true);
    }
  });

  it('returns false for non-Standard sets', () => {
    expect(isSetStandardLegal('Khans of Tarkir')).toBe(false);
    expect(isSetStandardLegal('Innistrad')).toBe(false);
  });
});
