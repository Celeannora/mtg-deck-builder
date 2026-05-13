import type { CardRecord } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface RotationWarning {
  cardName: string;
  setCode: string;
  setName: string;
  daysUntilRotation: number | null;
}

export function computeRotationWarnings(
  cards: CardRecord[],
  setReleaseDates: Map<string, string>
): RotationWarning[] {
  const now = Date.now();
  const warnings: RotationWarning[] = [];

  const year = new Date().getFullYear();
  let nextRotation = new Date(`${year}-10-01`).getTime();
  if (nextRotation < now) {
    nextRotation = new Date(`${year + 1}-10-01`).getTime();
  }

  const daysToRotation = (nextRotation - now) / MS_PER_DAY;
  const ROTATION_AGE_THRESHOLD_DAYS = 18 * 30;

  for (const card of cards) {
    const releasedAt = setReleaseDates.get(card.setCode);
    if (!releasedAt) continue;

    const releaseMs = new Date(releasedAt).getTime();
    const ageInDays = (now - releaseMs) / MS_PER_DAY;

    if (ageInDays >= ROTATION_AGE_THRESHOLD_DAYS && daysToRotation <= 90) {
      warnings.push({
        cardName: card.name,
        setCode: card.setCode,
        setName: card.setName,
        daysUntilRotation: Math.round(daysToRotation)
      });
    }
  }

  return warnings;
}

export function groupRotationWarningsBySet(
  warnings: RotationWarning[]
): Map<string, { setName: string; daysUntilRotation: number | null; cards: string[] }> {
  const map = new Map<string, { setName: string; daysUntilRotation: number | null; cards: string[] }>();

  for (const w of warnings) {
    const existing = map.get(w.setCode);
    if (existing) {
      existing.cards.push(w.cardName);
    } else {
      map.set(w.setCode, {
        setName: w.setName,
        daysUntilRotation: w.daysUntilRotation,
        cards: [w.cardName]
      });
    }
  }

  return map;
}
