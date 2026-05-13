import { db } from "./db";
import type { CardRecord } from "./types";

export interface CardFilters {
  name?: string;
  oracleText?: string;
  types?: string[];
  colors?: string[];
  colorMode?: "includes" | "exactly" | "atMost";
  cmcMin?: number;
  cmcMax?: number;
  rarities?: string[];
  sets?: string[];
  keywords?: string[];
  legalityStandard?: "legal" | "future";
  maxPriceUsd?: number;
  sortBy?: "name" | "cmc" | "priceUsd" | "edhrecRank";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const PAGE_SIZE_DEFAULT = 50;

function matchesColors(
  record: CardRecord,
  colors: string[],
  mode: "includes" | "exactly" | "atMost"
): boolean {
  const cardColors: string[] = JSON.parse(record.colorsJson ?? "[]");
  if (mode === "exactly") {
    return (
      cardColors.length === colors.length &&
      colors.every((c) => cardColors.includes(c))
    );
  }
  if (mode === "includes") {
    return colors.every((c) => cardColors.includes(c));
  }
  return cardColors.every((c) => colors.includes(c));
}

export interface SearchResult {
  cards: CardRecord[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export async function searchCards(
  filters: CardFilters
): Promise<SearchResult> {
  const {
    name,
    oracleText,
    types,
    colors,
    colorMode = "includes",
    cmcMin,
    cmcMax,
    rarities,
    sets,
    keywords,
    legalityStandard = "legal",
    maxPriceUsd,
    sortBy = "name",
    sortDir = "asc",
    page = 1,
    pageSize = PAGE_SIZE_DEFAULT,
  } = filters;

  const collection = db.cards
    .where("legalityStandard")
    .equals(legalityStandard);

  const results = await collection
    .filter((card) => {
      if (name?.trim()) {
        const q = name.trim().toLowerCase();
        if (!card.name.toLowerCase().includes(q)) return false;
      }
      if (oracleText?.trim()) {
        const q = oracleText.trim().toLowerCase();
        if (!(card.oracleText ?? "").toLowerCase().includes(q)) return false;
      }
      if (types && types.length > 0) {
        if (!types.every((t) => card.typeLine.includes(t))) return false;
      }
      if (cmcMin !== undefined && card.cmc < cmcMin) return false;
      if (cmcMax !== undefined && card.cmc > cmcMax) return false;
      if (rarities && rarities.length > 0) {
        if (!rarities.includes(card.rarity ?? "")) return false;
      }
      if (sets && sets.length > 0) {
        if (!sets.includes(card.setCode)) return false;
      }
      if (keywords && keywords.length > 0) {
        const cardKw: string[] = JSON.parse(card.keywordsJson ?? "[]");
        if (!keywords.every((k) => cardKw.includes(k))) return false;
      }
      if (colors && colors.length > 0) {
        if (!matchesColors(card, colors, colorMode)) return false;
      }
      if (maxPriceUsd !== undefined && maxPriceUsd > 0) {
        if ((card.priceUsd ?? Infinity) > maxPriceUsd) return false;
      }
      return true;
    })
    .toArray();

  const dir = sortDir === "desc" ? -1 : 1;
  results.sort((a, b) => {
    switch (sortBy) {
      case "cmc":
        return dir * (a.cmc - b.cmc);
      case "priceUsd":
        return dir * ((a.priceUsd ?? 0) - (b.priceUsd ?? 0));
      case "edhrecRank":
        return dir * ((a.edhrecRank ?? 999999) - (b.edhrecRank ?? 999999));
      default:
        return dir * a.name.localeCompare(b.name);
    }
  });

  const total = results.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), pages);
  const offset = (clampedPage - 1) * pageSize;
  const slice = results.slice(offset, offset + pageSize);

  return { cards: slice, total, page: clampedPage, pageSize, pages };
}

export async function getAllKeywords(): Promise<string[]> {
  const all = await db.cards.toArray();
  const set = new Set<string>();
  for (const card of all) {
    const kw: string[] = JSON.parse(card.keywordsJson ?? "[]");
    kw.forEach((k) => set.add(k));
  }
  return Array.from(set).sort();
}

export async function getAllSetCodes(): Promise<
  { code: string; name: string }[]
> {
  const all = await db.cards.toArray();
  const map = new Map<string, string>();
  for (const card of all) map.set(card.setCode, card.setName);
  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
