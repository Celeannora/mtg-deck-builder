import { db } from "./db";
import type { CardRecord } from "./types";
import type { RotatingCardInfo, RotationImpactReport } from "./metaTypes";

// Cache Scryfall set release dates in-memory for the session.
let setReleaseDateCache: Map<string, string> | null = null;

async function fetchSetReleaseDates(): Promise<Map<string, string>> {
  if (setReleaseDateCache) return setReleaseDateCache;
  try {
    const res = await fetch("https://api.scryfall.com/sets");
    const json = await res.json() as { data: { code: string; released_at: string; set_type: string }[] };
    const map = new Map<string, string>();
    for (const s of json.data) {
      map.set(s.code.toLowerCase(), s.released_at);
    }
    setReleaseDateCache = map;
    return map;
  } catch {
    // Fallback: return empty map — cards without date entries will be skipped gracefully
    return new Map();
  }
}

/**
 * Determine which set codes will rotate at the next Standard rotation.
 * Standard rotates annually (each October). Sets released more than ~3 years ago
 * (>= 3 Standard rotations) are considered rotating.
 * We use a ~730-day threshold (2 years) so sets from 2 Standard cycles ago are flagged.
 */
async function getRotatingSetCodes(): Promise<Set<string>> {
  const releaseDates = await fetchSetReleaseDates();
  const now = Date.now();
  const TWO_YEARS_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

  // Next rotation is the next Oct 1
  const year = new Date().getFullYear();
  let nextRotation = new Date(`${year}-10-01`).getTime();
  if (nextRotation < now) nextRotation = new Date(`${year + 1}-10-01`).getTime();

  const rotating = new Set<string>();
  for (const [code, releasedAt] of releaseDates.entries()) {
    const releaseMs = new Date(releasedAt).getTime();
    // A set will rotate if it's old enough that it falls outside Standard's 2-year window
    // measured from the upcoming rotation date
    if (nextRotation - releaseMs >= TWO_YEARS_MS) {
      rotating.add(code);
    }
  }
  return rotating;
}

export async function analyzeRotationImpact(
  deckCardNames: string[],
  deckId: string
): Promise<RotationImpactReport> {
  const rotatingSetCodes = await getRotatingSetCodes();
  const rotating: RotatingCardInfo[] = [];

  // Compute human-readable rotation date
  const now = Date.now();
  const year = new Date().getFullYear();
  let nextRotation = new Date(`${year}-10-01`);
  if (nextRotation.getTime() < now) nextRotation = new Date(`${year + 1}-10-01`);
  const rotatesAt = nextRotation.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  for (const name of deckCardNames) {
    const card = await db.cards.where("name").equals(name).first();
    if (!card) continue;
    if (!rotatingSetCodes.has(card.setCode.toLowerCase())) continue;

    const replacements = await findReplacements(card, rotatingSetCodes);
    rotating.push({
      cardName: card.name,
      setCode: card.setCode,
      setName: card.setName,
      rotatesAt,
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

async function findReplacements(card: CardRecord, rotatingSetCodes: Set<string>): Promise<CardRecord[]> {
  const colors = JSON.parse(card.colorsJson) as string[];

  const candidates = await db.cards
    .where("legalityStandard").equals("legal")
    .filter((c) => {
      if (rotatingSetCodes.has(c.setCode.toLowerCase())) return false;
      if (Math.abs(c.cmc - card.cmc) > 1) return false;
      const cColors = JSON.parse(c.colorsJson) as string[];
      const overlap = cColors.filter((col) => colors.includes(col)).length;
      return overlap > 0 || colors.length === 0;
    })
    .limit(5)
    .toArray();

  return candidates;
}
