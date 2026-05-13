import { db } from "./db";
import type { CardRecord } from "./types";
import type { RotatingCardInfo, RotationImpactReport } from "./metaTypes";

// Sets known to rotate at the next Standard rotation boundary.
// In production, derive this from Scryfall set data (releaseDate < cutoff).
// This list is updated manually until a live rotation-date API is integrated.
const ROTATING_SET_CODES = new Set<string>([
  "mid", // Innistrad: Midnight Hunt
  "vow", // Innistrad: Crimson Vow
  "neo", // Kamigawa: Neon Dynasty
  "snc", // Streets of New Capenna
]);

export async function analyzeRotationImpact(
  deckCardNames: string[],
  deckId: string
): Promise<RotationImpactReport> {
  const rotating: RotatingCardInfo[] = [];

  for (const name of deckCardNames) {
    const card = await db.cards.where("name").equals(name).first();
    if (!card) continue;
    if (!ROTATING_SET_CODES.has(card.setCode.toLowerCase())) continue;

    const replacements = await findReplacements(card);
    rotating.push({
      cardName: card.name,
      setCode: card.setCode,
      setName: card.setName,
      rotatesAt: "Next Standard rotation",
      replacements,
    });
  }

  const severity: RotationImpactReport["severity"] =
    rotating.length === 0 ? "low" :
    rotating.length <= 4 ? "medium" : "high";

  return {
    deckId,
    rotatingCards: rotating,
    severity,
    generatedAt: new Date().toISOString(),
  };
}

async function findReplacements(card: CardRecord): Promise<CardRecord[]> {
  const colors = JSON.parse(card.colorsJson) as string[];

  // Find cards with similar CMC, same colors, same broad type
  const candidates = await db.cards
    .where("legalityStandard").equals("legal")
    .filter((c) => {
      if (ROTATING_SET_CODES.has(c.setCode.toLowerCase())) return false;
      if (Math.abs(c.cmc - card.cmc) > 1) return false;
      const cColors = JSON.parse(c.colorsJson) as string[];
      const overlap = cColors.filter((col) => colors.includes(col)).length;
      return overlap > 0 || colors.length === 0;
    })
    .limit(5)
    .toArray();

  return candidates;
}
