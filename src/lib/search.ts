import { db } from "./db";
import type { CardRecord } from "./types";

export interface SearchFilters {
  query?: string;
  types?: string[];
  subtype?: string;
  supertype?: string;
  colors?: string[];
  colorMode?: "exactly" | "includes" | "at-most";
  colorless?: boolean;
  cmcMin?: number;
  cmcMax?: number;
  powerMin?: number;
  powerMax?: number;
  keywords?: string[];
  sets?: string[];
  rarities?: string[];
  roles?: string[];
  maxPriceUsd?: number;
  sortBy?: "name" | "cmc" | "price" | "rarity" | "edhrecRank";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

const RARITY_ORDER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  mythic: 4,
};

export async function searchCards(filters: SearchFilters): Promise<CardRecord[]> {
  let collection = db.cards.where("legalityStandard").equals("legal");

  // Pull into memory for complex filtering (IndexedDB lacks SQL-level expressions)
  let cards = await collection.toArray();

  const q = filters.query?.toLowerCase().trim();
  if (q) {
    cards = cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.oracleText ?? "").toLowerCase().includes(q) ||
        c.typeLine.toLowerCase().includes(q) ||
        c.searchText.includes(q)
    );
  }

  if (filters.types && filters.types.length > 0) {
    cards = cards.filter((c) =>
      filters.types!.some((t) => c.typeLine.toLowerCase().includes(t.toLowerCase()))
    );
  }

  if (filters.subtype) {
    const st = filters.subtype.toLowerCase();
    cards = cards.filter((c) => c.typeLine.toLowerCase().includes(st));
  }

  if (filters.supertype) {
    const sup = filters.supertype.toLowerCase();
    cards = cards.filter((c) => c.typeLine.toLowerCase().includes(sup));
  }

  if (filters.colorless) {
    cards = cards.filter((c) => {
      const colors = JSON.parse(c.colorsJson) as string[];
      return colors.length === 0;
    });
  } else if (filters.colors && filters.colors.length > 0) {
    const fc = filters.colors;
    const mode = filters.colorMode ?? "includes";
    cards = cards.filter((c) => {
      const colors = JSON.parse(c.colorIdentityJson) as string[];
      if (mode === "exactly") {
        return (
          fc.length === colors.length && fc.every((x) => colors.includes(x))
        );
      } else if (mode === "includes") {
        return fc.every((x) => colors.includes(x));
      } else {
        // at-most
        return colors.every((x) => fc.includes(x));
      }
    });
  }

  if (filters.cmcMin !== undefined) {
    cards = cards.filter((c) => c.cmc >= filters.cmcMin!);
  }
  if (filters.cmcMax !== undefined) {
    cards = cards.filter((c) => c.cmc <= filters.cmcMax!);
  }

  if (filters.powerMin !== undefined) {
    cards = cards.filter((c) => {
      const p = parseFloat(c.power ?? "");
      return !isNaN(p) && p >= filters.powerMin!;
    });
  }
  if (filters.powerMax !== undefined) {
    cards = cards.filter((c) => {
      const p = parseFloat(c.power ?? "");
      return !isNaN(p) && p <= filters.powerMax!;
    });
  }

  if (filters.keywords && filters.keywords.length > 0) {
    cards = cards.filter((c) => {
      const kws = JSON.parse(c.keywordsJson) as string[];
      return filters.keywords!.every((kw) => kws.includes(kw));
    });
  }

  if (filters.sets && filters.sets.length > 0) {
    cards = cards.filter((c) => filters.sets!.includes(c.setCode));
  }

  if (filters.rarities && filters.rarities.length > 0) {
    cards = cards.filter((c) => filters.rarities!.includes(c.rarity ?? ""));
  }

  if (filters.maxPriceUsd !== undefined) {
    cards = cards.filter(
      (c) => c.priceUsd !== null && c.priceUsd <= filters.maxPriceUsd!
    );
  }

  // Sort
  const dir = filters.sortDir === "asc" ? 1 : -1;
  cards.sort((a, b) => {
    switch (filters.sortBy) {
      case "name": return dir * a.name.localeCompare(b.name);
      case "cmc": return dir * (a.cmc - b.cmc);
      case "price": return dir * ((a.priceUsd ?? 0) - (b.priceUsd ?? 0));
      case "rarity":
        return dir * ((RARITY_ORDER[a.rarity ?? "common"] ?? 0) - (RARITY_ORDER[b.rarity ?? "common"] ?? 0));
      case "edhrecRank":
        return dir * ((a.edhrecRank ?? 99999) - (b.edhrecRank ?? 99999));
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;
  return cards.slice(offset, offset + limit);
}

export async function getDistinctKeywords(): Promise<string[]> {
  const all = await db.cards.toArray();
  const kwSet = new Set<string>();
  for (const card of all) {
    const kws = JSON.parse(card.keywordsJson) as string[];
    for (const kw of kws) kwSet.add(kw);
  }
  return [...kwSet].sort();
}

export async function getStandardSets(): Promise<Array<{ code: string; name: string }>> {
  const all = await db.cards.toArray();
  const seen = new Map<string, string>();
  for (const card of all) {
    if (!seen.has(card.setCode)) seen.set(card.setCode, card.setName);
  }
  return [...seen.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
