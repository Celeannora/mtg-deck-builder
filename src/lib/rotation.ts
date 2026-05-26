/**
 * rotation.ts
 *
 * Standard rotation schedule.
 *
 * Wizards moved to a 3-year rolling window starting with Wilds of Eldraine
 * (Sep 2023).  There is NO rotation in calendar year 2026; the next rotation
 * is expected in early Q1 2027 when Wilds of Eldraine, Lost Caverns of
 * Ixalan, Murders at Karlov Manor, and Outlaws of Thunder Junction leave
 * the format together.
 *
 * Sources:
 *   https://magic.wizards.com/en/formats/standard
 *   https://mtgazone.com/standard-rotation/
 *   https://articles.starcitygames.com/magic-the-gathering/mtg-standard-rotation-guide-2026/
 */

export interface RotationInfo {
  nextRotationDate: Date;
  daysUntilRotation: number;
  leavingSets: string[];
  currentSets: string[];
  isRotationImminent: boolean; // within 60 days
}

/**
 * Sets currently legal in Standard as of May 2026.
 * Listed oldest → newest.
 */
export const STANDARD_LEGAL_SETS: string[] = [
  'Wilds of Eldraine',       // WOE – Sep 2023
  'The Lost Caverns of Ixalan', // LCI – Nov 2023
  'Murders at Karlov Manor', // MKM – Feb 2024
  'Outlaws of Thunder Junction', // OTJ – Apr 2024
  'Bloomburrow',             // BLB – Aug 2024
  'Duskmourn: House of Horror', // DSK – Sep 2024
  'Magic: The Gathering Foundations', // FDN – Nov 2024
  'Aetherdrift',             // AER – Feb 2025
  'Tarkir: Dragonstorm',     // TDM – Apr 2025
];

/**
 * Sets that will leave Standard at the next rotation.
 * These are the four oldest sets in the current window.
 */
export const SETS_LEAVING_AT_NEXT_ROTATION: string[] = [
  'Wilds of Eldraine',
  'The Lost Caverns of Ixalan',
  'Murders at Karlov Manor',
  'Outlaws of Thunder Junction',
];

/**
 * The next Standard rotation date.
 *
 * Wizards has not published an exact date for 2027 rotation yet.
 * We use 2027-02-01 as a conservative early-Q1 placeholder that
 * will be updated once officially announced.
 *
 * DO NOT use a rolling "next October 1" calculation – there is
 * no rotation in 2026.
 */
export const NEXT_STANDARD_ROTATION: Date = new Date('2027-02-01T00:00:00Z');

/**
 * Returns full rotation info relative to `now` (defaults to today).
 */
export function getRotationInfo(now: Date = new Date()): RotationInfo {
  const msPerDay = 1_000 * 60 * 60 * 24;
  const msRemaining = NEXT_STANDARD_ROTATION.getTime() - now.getTime();
  const daysUntilRotation = Math.max(0, Math.ceil(msRemaining / msPerDay));

  return {
    nextRotationDate: NEXT_STANDARD_ROTATION,
    daysUntilRotation,
    leavingSets: SETS_LEAVING_AT_NEXT_ROTATION,
    currentSets: STANDARD_LEGAL_SETS,
    isRotationImminent: daysUntilRotation <= 60,
  };
}

/**
 * Returns true if the given set name will rotate out at the next rotation.
 */
export function isSetRotatingSoon(setName: string): boolean {
  return SETS_LEAVING_AT_NEXT_ROTATION.includes(setName);
}

/**
 * Returns true if the given set is currently Standard-legal.
 */
export function isSetStandardLegal(setName: string): boolean {
  return STANDARD_LEGAL_SETS.includes(setName);
}
