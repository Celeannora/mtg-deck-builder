import { db } from "./db";
import type { CardRecord } from "./types";
import type { RotatingCardInfo, RotationImpactReport } from "./metaTypes";
import {
  SETS_LEAVING_AT_NEXT_ROTATION,
  NEXT_STANDARD_ROTATION,
} from "./rotation";

/**
 * Derive the set codes for rotating sets dynamically from the local DB.
 *
 * Strategy: query all Standard-legal cards, collect distinct
 * (setCode → setName) pairs, then return the codes whose setName
 * appears in SETS_LEAVING_AT_NEXT_ROTATION.  No hardcoded codes,
 * no network call — works entirely from the already-imported bulk data.
 */
async function getRotatingSetCodes(): Promise<Set<string>> {
  const leavingNames = new Set(
    SETS_LEAVING_AT_NEXT_ROTATION.map((n) => n.toLowerCase())
  );

  // Sample one card per set — we only need the code/name mapping.
  const cards = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .toArray();

  const rotating = new Set<string>();
  for (const card of cards) {
    if (leavingNames.has(card.setName.toLowerCase())) {
      rotating.add(card.setCode.toLowerCase());
    }
  }
  return rotating;
}

const rotationDateStr = NEXT_STANDARD_ROTATION.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export async function analyzeRotationImpact(
  deckCardNames: string[],
  deckId: string
): Promise<RotationImpactReport> {
  const rotatingSetCodes = await getRotatingSetCodes();
  const rotating: RotatingCardInfo[] = [];

  for (const name of deckCardNames) {
    const card = await db.cards.where("name").equals(name).first();
    if (!card) continue;
    if (!rotatingSetCodes.has(card.setCode.toLowerCase())) continue;

    const replacements = await findReplacements(card, rotatingSetCodes);
    rotating.push({
      cardName: card.name,
      setCode: card.setCode,
      setName: card.setName,
      rotatesAt: rotationDateStr,
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

async function findReplacements(
  card: CardRecord,
  rotatingSetCodes: Set<string>
): Promise<CardRecord[]> {
  const colors = JSON.parse(card.colorsJson) as string[];

  const candidates = await db.cards
    .where("legalityStandard")
    .equals("legal")
    .filter((c) => {
      // Exclude the rotating sets themselves
      if (rotatingSetCodes.has(c.setCode.toLowerCase())) return false;
      // Similar mana value (±1)
      if (Math.abs(c.cmc - card.cmc) > 1) return false;
      // Color overlap (colorless cards always qualify)
      const cColors = JSON.parse(c.colorsJson) as string[];
      const overlap = cColors.filter((col) => colors.includes(col)).length;
      return overlap > 0 || colors.length === 0;
    })
    .limit(5)
    .toArray();

  return candidates;
}
