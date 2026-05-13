import type { ArchetypeEntry, MetaSnapshot } from "./metaTypes";
import { saveSnapshot } from "./metaStore";

// --- JSON import ---
export function importMetaFromJSON(raw: string): ArchetypeEntry[] {
  const parsed = JSON.parse(raw);
  const list: unknown[] = Array.isArray(parsed) ? parsed : parsed.archetypes ?? [];
  return list.map((item) => {
    const a = item as Record<string, unknown>;
    return {
      name: String(a.name ?? a.archetype ?? ""),
      metaShare: Number(a.metaShare ?? a.share ?? a.percentage ?? 0),
      colors: String(a.colors ?? ""),
      tier: (Number(a.tier ?? 2) as 1 | 2 | 3 | 4) || 2,
      sampleCards: Array.isArray(a.sampleCards) ? (a.sampleCards as string[]) : [],
    };
  });
}

// --- CSV import ---
// Expected columns: name, metaShare, colors, tier (optional)
export function importMetaFromCSV(raw: string): ArchetypeEntry[] {
  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const idx = (key: string) => header.indexOf(key);

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      name: cols[idx("name")] ?? cols[0] ?? "",
      metaShare: Number(cols[idx("metashare")] ?? cols[idx("share")] ?? cols[1] ?? 0),
      colors: cols[idx("colors")] ?? cols[2] ?? "",
      tier: (Number(cols[idx("tier")] ?? cols[3] ?? 2) as 1 | 2 | 3 | 4) || 2,
      sampleCards: [],
    };
  });
}

// --- MTGGoldfish scraper stub ---
// Returns cached snapshot if <24h old; otherwise attempts fetch via proxy.
export async function fetchMTGGoldfishMeta(): Promise<ArchetypeEntry[]> {
  // Direct scraping is blocked by CORS in-browser.
  // This stub returns an empty array; the user can paste data manually.
  // A server-side proxy or browser extension can fill this in.
  console.warn("fetchMTGGoldfishMeta: CORS prevents direct scraping — use manual import instead.");
  return [];
}

// --- Convenience: build + persist a snapshot ---
export async function buildAndSaveSnapshot(
  archetypes: ArchetypeEntry[],
  source: MetaSnapshot["source"],
  rawData?: string
): Promise<number> {
  return saveSnapshot({
    timestamp: new Date().toISOString(),
    source,
    archetypes,
    rawData,
  });
}
