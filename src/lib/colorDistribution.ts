import type { CardRecord } from "./types";

export type ManaColor = "W" | "U" | "B" | "R" | "G" | "C";

export interface PipCount {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
  total: number;
}

export interface ColorDistribution {
  pips: PipCount;
  ratios: Record<ManaColor, number>;
  recommendedSources: Record<ManaColor, number>;
  totalLands: number;
  insufficientColors: ManaColor[];
}

const HYBRID_RE = /\{([WUBRG])\/([WUBRG])\}/g;
const PHYREXIAN_RE = /\{([WUBRG])\/P\}/g;
const COLORED_RE = /\{([WUBRG])\}/g;

export function parsePips(manaCost: string): PipCount {
  const pips: PipCount = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, total: 0 };

  for (const match of manaCost.matchAll(HYBRID_RE)) {
    const c1 = match[1] as ManaColor;
    const c2 = match[2] as ManaColor;
    pips[c1] += 0.5;
    pips[c2] += 0.5;
    pips.total += 1;
  }

  for (const match of manaCost.matchAll(PHYREXIAN_RE)) {
    const c = match[1] as ManaColor;
    pips[c] += 0.5;
    pips.total += 0.5;
  }

  const stripped = manaCost.replace(HYBRID_RE, "").replace(PHYREXIAN_RE, "");
  for (const match of stripped.matchAll(COLORED_RE)) {
    const c = match[1] as ManaColor;
    pips[c] += 1;
    pips.total += 1;
  }

  return pips;
}

export function computeColorDistribution(
  cards: CardRecord[],
  totalLands: number
): ColorDistribution {
  const totalPips: PipCount = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, total: 0 };

  for (const card of cards) {
    if (!card.manaCost) continue;
    const pips = parsePips(card.manaCost);
    for (const color of ["W", "U", "B", "R", "G", "C"] as ManaColor[]) {
      totalPips[color] += pips[color];
    }
    totalPips.total += pips.total;
  }

  const ratios: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const recommendedSources: Record<ManaColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

  if (totalPips.total > 0) {
    for (const color of ["W", "U", "B", "R", "G", "C"] as ManaColor[]) {
      ratios[color] = totalPips[color] / totalPips.total;
      recommendedSources[color] = Math.round(ratios[color] * totalLands);
    }
  }

  const activeColors = (["W", "U", "B", "R", "G"] as ManaColor[]).filter(
    (c) => totalPips[c] > 0
  );
  const MIN_SOURCES = activeColors.length >= 3 ? 6 : 8;
  const insufficientColors = activeColors.filter(
    (c) => recommendedSources[c] < MIN_SOURCES
  );

  return { pips: totalPips, ratios, recommendedSources, totalLands, insufficientColors };
}
