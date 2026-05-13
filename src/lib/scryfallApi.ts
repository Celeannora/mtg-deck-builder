import type { ScryfallBulkDataEntry } from "./types";

const BULK_DATA_URL = "https://api.scryfall.com/bulk-data";

export interface OracleCardsDump {
  downloadUri: string;
  updatedAt: string;
  sizeBytes: number;
}

export async function discoverOracleCardsDumpUri(): Promise<OracleCardsDump> {
  const res = await fetch(BULK_DATA_URL, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Scryfall bulk-data index returned ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { data: ScryfallBulkDataEntry[] };
  const entry = json.data.find((e) => e.type === "oracle_cards");

  if (!entry) {
    throw new Error("Could not find oracle_cards entry in Scryfall bulk-data index.");
  }

  return {
    downloadUri: entry.download_uri,
    updatedAt: entry.updated_at,
    sizeBytes: entry.size,
  };
}
