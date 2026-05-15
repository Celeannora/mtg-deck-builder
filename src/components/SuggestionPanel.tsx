import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useDeckStore } from "../lib/deckStore";
import { detectArchetype } from "../lib/archetype";
import { rankCandidates } from "../lib/scoring";
import { getDeckMechanics } from "../lib/synergy";
import type { DeckEntry } from "../lib/legality";
import type { CardRecord } from "../lib/types";

type Mode = "upgrade" | "similar" | "fill-role";

const ROLE_QUERY: Record<string, string[]> = {
  Removal:      ["destroy", "exile", "damage to target"],
  CardDraw:     ["draw a card", "draw two", "draw three"],
  Ramp:         ["search your library for a basic land", "add {"],
  Counterspell: ["counter target spell"],
  BoardWipe:    ["destroy all", "exile all", "deals damage to each"],
};

export function SuggestionPanel() {
  const entries = useDeckStore(s => s.entries) as DeckEntry[];
  const addCard = useDeckStore(s => s.addCard);
  const [mode, setMode] = useState<Mode>("upgrade");
  const [selectedRole, setSelectedRole] = useState("Removal");

  const mainboard = useMemo(() => entries.filter(e => e.zone === "main"), [entries]);
  const existingIds = useMemo(
    () => new Set(mainboard.map(e => e.card.id)),
    [mainboard]
  );

  const archetype = useMemo(() => detectArchetype(mainboard).archetype, [mainboard]);
  const mechanics = useMemo(() => getDeckMechanics(mainboard), [mainboard]);

  const allCards = useLiveQuery(() =>
    db.cards.where("legalityStandard").equals("legal").toArray(),
    []
  ) ?? [];

  const suggestions = useMemo(() => {
    if (allCards.length === 0 || mainboard.length === 0) return [];

    let candidates: CardRecord[] = [];

    if (mode === "upgrade") {
      // Cards not in the deck that share the deck's colour identity and match mechanics
      const deckColors = new Set(
        mainboard.flatMap(e => JSON.parse(e.card.colorIdentityJson || "[]"))
      );
      candidates = allCards.filter(c => {
        if (existingIds.has(c.id)) return false;
        const ci: string[] = JSON.parse(c.colorIdentityJson || "[]");
        return ci.every(color => deckColors.has(color)) || ci.length === 0;
      });
    } else if (mode === "similar") {
      // Cards that share a mechanic keyword with the deck
      candidates = allCards.filter(c => {
        if (existingIds.has(c.id)) return false;
        const text = (c.oracleText ?? "").toLowerCase();
        return mechanics.some(kw => text.includes(kw));
      });
    } else if (mode === "fill-role") {
      // Cards whose oracle text matches the selected role patterns
      const patterns = ROLE_QUERY[selectedRole] ?? [];
      candidates = allCards.filter(c => {
        if (existingIds.has(c.id)) return false;
        const text = (c.oracleText ?? "").toLowerCase();
        return patterns.some(p => text.includes(p));
      });
    }

    return rankCandidates(candidates, mainboard).slice(0, 20);
  }, [mode, selectedRole, allCards, mainboard, existingIds, mechanics]);

  if (mainboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm">
        <p>Add cards to get suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">

      {/* Mode selector */}
      <div className="flex gap-1">
        {(["upgrade", "similar", "fill-role"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-teal-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {m === "upgrade" ? "Upgrades" : m === "similar" ? "Similar" : "Fill Role"}
          </button>
        ))}
      </div>

      {/* Role picker for fill-role mode */}
      {mode === "fill-role" && (
        <select
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-200"
        >
          {Object.keys(ROLE_QUERY).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {/* Context */}
      <p className="text-zinc-500">
        {archetype !== "Unknown" && `${archetype} deck · `}
        {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
      </p>

      {/* Results */}
      <div className="space-y-1.5">
        {suggestions.map(s => (
          <div
            key={s.cardId}
            className="flex items-center justify-between rounded-md bg-zinc-800 px-3 py-2"
          >
            <div>
              <span className="text-zinc-100">{s.cardName}</span>
              <div className="text-zinc-500 text-xs mt-0.5">
                {s.breakdown.join(" · ")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-bold ${
                s.grade === "S" ? "text-yellow-400" :
                s.grade === "A" ? "text-teal-400" :
                s.grade === "B" ? "text-blue-400" :
                s.grade === "C" ? "text-zinc-400" : "text-red-400"
              }`}>{s.grade}</span>
              <button
                onClick={() => {
                  const found = allCards.find(c => c.id === s.cardId);
                  if (found) addCard(found, "main");
                }}
                className="rounded bg-teal-700 hover:bg-teal-600 px-2 py-0.5 text-xs text-white"
              >
                +
              </button>
            </div>
          </div>
        ))}
        {suggestions.length === 0 && (
          <p className="text-center text-zinc-600 py-8">No suggestions found.</p>
        )}
      </div>
    </div>
  );
}
