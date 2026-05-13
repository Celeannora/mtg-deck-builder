import { useDeckStore } from "../store/deckStore";

/**
 * Inline badge rendered in DeckStatsBar or the deck panel header.
 * Shows LEGAL / ILLEGAL and surfacing violation count.
 */
export function ValidationBadge() {
  const { legal, violations } = useDeckStore(s => s.validation);

  if (legal) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-700">
        <svg viewBox="0 0 8 8" className="h-2 w-2 fill-emerald-400" aria-hidden>
          <circle cx="4" cy="4" r="4" />
        </svg>
        LEGAL
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-red-900/60 px-2 py-0.5 text-xs font-semibold text-red-300 ring-1 ring-red-700"
      title={violations.map(v => v.message).join("\n")}
    >
      <svg viewBox="0 0 8 8" className="h-2 w-2 fill-red-400" aria-hidden>
        <circle cx="4" cy="4" r="4" />
      </svg>
      ILLEGAL · {violations.length}
    </span>
  );
}
