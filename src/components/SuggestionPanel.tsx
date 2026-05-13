import { useEffect, useState } from "react";
import { useDeckStore } from "../store/deckStore";
import { getSuggestions, type Suggestion } from "../lib/suggestions";
import type { CardRecord } from "../lib/types";

export function SuggestionPanel() {
  const entries = useDeckStore((s) => s.entries);
  const addCard = useDeckStore((s) => s.addCard);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<string>("");

  const deckCards = entries
    .filter((e) => e.board === "main")
    .flatMap((e) => Array<CardRecord>(e.quantity).fill(e.card));

  const inDeckIds = new Set(entries.map((e) => e.card.oracleId));

  const refresh = async () => {
    if (deckCards.length < 4) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const results = await getSuggestions(deckCards, {
      budget: budget !== "" ? Number(budget) : undefined,
      excludeOracleIds: inDeckIds,
      maxResults: 15,
    });
    setSuggestions(results);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(refresh, 600);
    return () => clearTimeout(timer);
  }, [entries, budget]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">Suggestions</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Max $"
            className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500"
          />
          <button
            onClick={refresh}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {deckCards.length < 4 && (
          <p className="text-center text-xs text-zinc-600 py-8">
            Add at least 4 cards to get suggestions
          </p>
        )}
        {loading && (
          <p className="text-center text-xs text-zinc-500 py-4">Analyzing deck...</p>
        )}
        {!loading &&
          suggestions.map(({ card, score, reasons }) => (
            <div
              key={card.id}
              className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-100">{card.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400">+{score}</span>
                  <button
                    onClick={() => addCard(card)}
                    className="rounded bg-teal-700 px-2 py-0.5 text-xs text-white hover:bg-teal-500"
                    aria-label={`Add ${card.name}`}
                  >
                    Add
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 truncate">{card.typeLine}</p>
              {reasons.length > 0 && (
                <ul className="text-xs text-teal-500 space-y-0.5">
                  {reasons.slice(0, 2).map((r, i) => (
                    <li key={i} className="truncate">· {r}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        {!loading && suggestions.length === 0 && deckCards.length >= 4 && (
          <p className="text-center text-xs text-zinc-600 py-8">No strong synergies found</p>
        )}
      </div>
    </div>
  );
}
