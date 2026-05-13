import type { CardRecord } from "./types";

export interface ManaCurve {
  distribution: number[];
  averageMV: number;
  totalNonlands: number;
}

export interface LandRecommendation {
  recommended: number;
  min: number;
  max: number;
  rangeLabel: string;
}

const RAMP_PATTERNS = [
  /add \{/i,
  /search your library for a basic land/i,
  /you may put.*land.*onto the battlefield/i,
];

const DRAW_PATTERNS = [
  /draw (a|\d+|two|three) card/i,
  /look at the top/i,
  /scry/i,
];

function isRamp(card: CardRecord): boolean {
  const text = card.oracleText ?? "";
  if (card.producedManaJson !== "[]") return true;
  return RAMP_PATTERNS.some((re) => re.test(text));
}

function isDrawSpell(card: CardRecord): boolean {
  const text = card.oracleText ?? "";
  return DRAW_PATTERNS.some((re) => re.test(text));
}

function isLand(card: CardRecord): boolean {
  return card.typeLine.toLowerCase().includes("land");
}

function isModalDFCLand(card: CardRecord): boolean {
  if (!card.cardFacesJson) return false;
  try {
    const faces = JSON.parse(card.cardFacesJson) as Array<{ type_line?: string }>;
    return faces.some((f) => (f.type_line ?? "").toLowerCase().includes("land"));
  } catch {
    return false;
  }
}

export function computeManaCurve(cards: CardRecord[]): ManaCurve {
  const nonlands = cards.filter((c) => !isLand(c));
  const distribution = new Array<number>(8).fill(0);
  for (const card of nonlands) {
    const bucket = Math.min(Math.floor(card.cmc), 7);
    distribution[bucket]++;
  }
  const totalMV = nonlands.reduce((sum, c) => sum + c.cmc, 0);
  const averageMV = nonlands.length > 0 ? totalMV / nonlands.length : 0;
  return {
    distribution,
    averageMV: Math.round(averageMV * 100) / 100,
    totalNonlands: nonlands.length,
  };
}

export function recommendLandCount(cards: CardRecord[]): LandRecommendation {
  const nonlands = cards.filter((c) => !isLand(c));
  const totalMV = nonlands.reduce((sum, c) => sum + c.cmc, 0);
  const amv = nonlands.length > 0 ? totalMV / nonlands.length : 2.5;

  let base = 20 + Math.round((amv / 0.7) * 3);
  const rampCount = nonlands.filter(isRamp).length;
  base -= Math.round(rampCount * 0.5);
  const drawCount = nonlands.filter(isDrawSpell).length;
  base -= Math.floor(drawCount / 4);
  const mdfcLands = cards.filter(isModalDFCLand).length;
  base -= Math.round(mdfcLands * 0.5);

  const clamped = Math.max(18, Math.min(27, base));
  const low = Math.max(18, clamped - 1);
  const high = Math.min(27, clamped + 1);
  return { recommended: clamped, min: low, max: high, rangeLabel: `${low}–${high}` };
}

export type DualLandTier = 1 | 2 | 3;

export interface DualLandCandidate {
  card: CardRecord;
  tier: DualLandTier;
  tierLabel: string;
}

const ENTERS_TAPPED_PATTERNS = [/enters tapped/i, /enters the battlefield tapped/i];
const CONDITIONAL_UNTAPPED_PATTERNS = [/unless you control/i, /if you control/i, /as long as/i, /reveal/i];

function getDualTier(card: CardRecord): DualLandTier {
  const text = card.oracleText ?? "";
  const entersTapped = ENTERS_TAPPED_PATTERNS.some((re) => re.test(text));
  if (!entersTapped) return 1;
  const conditional = CONDITIONAL_UNTAPPED_PATTERNS.some((re) => re.test(text));
  if (conditional) return 2;
  return 3;
}

export function recommendDualLands(
  landPool: CardRecord[],
  neededColors: string[]
): DualLandCandidate[] {
  const duals = landPool.filter((c) => {
    if (!isLand(c)) return false;
    const identity = JSON.parse(c.colorIdentityJson) as string[];
    return identity.length >= 2 && neededColors.some((color) => identity.includes(color));
  });
  return duals
    .map((card) => {
      const tier = getDualTier(card);
      return {
        card,
        tier,
        tierLabel:
          tier === 1 ? "Enters untapped" : tier === 2 ? "Conditionally untapped" : "Enters tapped",
      };
    })
    .sort((a, b) => a.tier - b.tier || a.card.name.localeCompare(b.card.name));
}

export function computeCastingProbability(
  deckSize: number,
  copies: number,
  turnNumber: number,
  onDraw: boolean
): number {
  const n = 7 + (onDraw ? turnNumber : turnNumber - 1);
  const N = deckSize;
  const K = copies;
  if (K === 0) return 0;
  if (n >= N) return 1;

  function logFact(x: number): number {
    let result = 0;
    for (let i = 2; i <= x; i++) result += Math.log(i);
    return result;
  }
  function logComb(n: number, k: number): number {
    if (k > n || k < 0) return -Infinity;
    return logFact(n) - logFact(k) - logFact(n - k);
  }

  const logP0 = logComb(N - K, n) - logComb(N, n);
  const p0 = Math.exp(logP0);
  return Math.round((1 - p0) * 1000) / 1000;
}
