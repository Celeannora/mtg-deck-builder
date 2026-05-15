/**
 * useConsistencyReport
 *
 * Derives a ConsistencyReport from the live deck store.
 * Runs synchronously on a web worker via a setTimeout trick to keep the UI
 * responsive. The report is memoised and only recomputed when the deck changes.
 */
import { useMemo, useState, useEffect, useRef } from "react";
import { buildConsistencyReport } from "../lib/consistencyReport";
import type { ConsistencyReport, DeckEntry } from "../lib/consistencyReport";
import { useMainboardEntries } from "../store/deckStore";

export type ReportState =
  | { status: "idle" }
  | { status: "computing" }
  | { status: "ready"; report: ConsistencyReport }
  | { status: "error"; message: string };

const TRIALS = 10_000;

/**
 * Convert store entries into DeckEntry[] for the consistency lib.
 * Handles missing fields gracefully.
 */
function toDeckEntries(entries: ReturnType<typeof useMainboardEntries>): DeckEntry[] {
  return entries.map(e => ({
    name:            e.card.name,
    quantity:        e.quantity,
    cmc:             e.card.cmc ?? 0,
    manaCost:        e.card.manaCost ?? null,
    typeLine:        e.card.typeLine ?? "",
    producedManaJson: e.card.producedMana
      ? JSON.stringify(e.card.producedMana)
      : undefined,
  }));
}

export function useConsistencyReport(): ReportState {
  const mainEntries = useMainboardEntries();
  const [state, setState] = useState<ReportState>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable dependency key: only recompute when deck composition changes
  const deckKey = useMemo(
    () =>
      mainEntries
        .map(e => `${e.card.oracleId}:${e.quantity}`)
        .sort()
        .join("|"),
    [mainEntries]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (mainEntries.length === 0) {
      setState({ status: "idle" });
      return;
    }

    setState({ status: "computing" });

    // Defer so the "Computing…" spinner renders before the synchronous work begins
    timerRef.current = setTimeout(() => {
      try {
        const entries = toDeckEntries(mainEntries);
        const report = buildConsistencyReport(entries, TRIALS, true);
        setState({ status: "ready", report });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }, 0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [deckKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
