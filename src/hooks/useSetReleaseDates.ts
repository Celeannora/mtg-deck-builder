import { useState, useEffect } from "react";

/**
 * Fetches the Scryfall sets list and returns a Map<setCode, releasedAt>.
 * Results are cached in module-level memory so the fetch only happens once
 * per app session regardless of how many components use this hook.
 *
 * Previously rotation.ts received an empty Map (no caller populated it),
 * meaning all rotation warnings were silently suppressed. This hook wires
 * the real data through.
 */

type SetMap = Map<string, string>;

let cachedSets: SetMap | null = null;
let fetchPromise: Promise<SetMap> | null = null;

async function fetchSetReleaseDates(): Promise<SetMap> {
  if (cachedSets) return cachedSets;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const res = await fetch("https://api.scryfall.com/sets", {
      headers: { "User-Agent": "mtg-deck-builder/1.0" }
    });
    if (!res.ok) throw new Error(`Scryfall sets API error: ${res.status}`);
    const json = await res.json() as { data: { code: string; released_at: string }[] };
    const map: SetMap = new Map();
    for (const s of json.data) {
      map.set(s.code, s.released_at);
    }
    cachedSets = map;
    return map;
  })();

  return fetchPromise;
}

export function useSetReleaseDates(): {
  setReleaseDates: SetMap;
  loading: boolean;
  error: string | null;
} {
  const [setReleaseDates, setSetReleaseDates] = useState<SetMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSetReleaseDates()
      .then(map => {
        if (!cancelled) {
          setSetReleaseDates(map);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { setReleaseDates, loading, error };
}
