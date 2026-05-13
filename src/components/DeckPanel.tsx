import { useState } from "react";
import { useDeckStore } from "../store/deckStore";
import type { DeckEntry } from "../lib/legality";

type Board = "main" | "side";

function DeckEntryRow({
  entry,
  onIncrement,
  onDecrement,
  onRemove,
  onMove,
  onCardClick,
}: {
  entry: DeckEntry;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onMove: () => void;
  onCardClick?: (card: DeckEntry["card"]) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          className="h-5 w-5 rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-4 text-center text-xs font-medium text-zinc-200">
          {entry.quantity}
        </span>
        <button
          onClick={onIncrement}
          className="h-5 w-5 rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        className="flex-1 truncate text-left text-xs text-zinc-100 hover:text-teal-300"
        onClick={() => onCardClick?.(entry.card)}
      >
        {entry.card.name}
      </button>

      <span className="shrink-0 text-xs text-zinc-500">{entry.card.cmc || ""}</span>

      <button
        onClick={onMove}
        className="shrink-0 text-xs text-zinc-500 hover:text-teal-400"
        title={`Move to ${entry.board === "main" ? "sideboard" : "main deck"}`}
      >
        ⇄
      </button>

      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-zinc-500 hover:text-red-400"
        aria-label={`Remove ${entry.card.name}`}
      >
        ✕
      </button>
    </div>
  );
}

export function DeckPanel({ onCardClick }: { onCardClick?: (card: DeckEntry["card"]) => void }) {
  const { deckName, setDeckName, entries, validation, removeCard, setQuantity, moveCard, clearDeck } =
    useDeckStore();
  const [activeBoard, setActiveBoard] = useState<Board>("main");

  const boardEntries = entries
    .filter((e) => e.board === activeBoard)
    .sort((a, b) => {
      const landA = a.card.typeLine.includes("Land") ? 1 : 0;
      const landB = b.card.typeLine.includes("Land") ? 1 : 0;
      if (landA !== landB) return landA - landB;
      return a.card.cmc - b.card.cmc || a.card.name.localeCompare(b.card.name);
    });

  const mainCount = entries
    .filter((e) => e.board === "main")
    .reduce((s, e) => s + e.quantity, 0);
  const sideCount = entries
    .filter((e) => e.board === "side")
    .reduce((s, e) => s + e.quantity, 0);

  // Map rule → severity for inline banners
  const errorRules = new Set(["MIN_60", "COPY_LIMIT", "NOT_STANDARD_LEGAL", "BANNED", "SIDEBOARD_SIZE"]);
  const inlineViolations = validation.violations.slice(0, 3);

  const exportDecklist = () => {
    const main = entries.filter((e) => e.board === "main");
    const side = entries.filter((e) => e.board === "side");
    let text = main.map((e) => `${e.quantity} ${e.card.name}`).join("\n");
    if (side.length)
      text += "\n\n// Sideboard\n" + side.map((e) => `${e.quantity} ${e.card.name}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${deckName.replace(/\s+/g, "-")}.txt`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="flex-1 rounded border border-zinc-700 bg-transparent px-2 py-1 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-teal-500"
          aria-label="Deck name"
        />
        <button
          onClick={exportDecklist}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          title="Export decklist"
        >
          Export
        </button>
        <button
          onClick={clearDeck}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-red-900 hover:text-red-200"
          title="Clear deck"
        >
          Clear
        </button>
      </div>

      {/* Board tabs */}
      <div className="flex gap-1">
        {(["main", "side"] as Board[]).map((b) => (
          <button
            key={b}
            onClick={() => setActiveBoard(b)}
            className={`rounded-full px-3 py-0.5 text-xs font-medium capitalize transition-colors ${
              activeBoard === b
                ? "bg-teal-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {b === "main" ? `Main (${mainCount})` : `Side (${sideCount})`}
          </button>
        ))}
      </div>

      {/* Inline validation banners (top 3) */}
      {inlineViolations.length > 0 && (
        <div className="space-y-1">
          {inlineViolations.map((v) => (
            <div
              key={v.rule}
              className={`rounded px-2 py-1 text-xs ${
                errorRules.has(v.rule)
                  ? "bg-red-950/40 text-red-300"
                  : "bg-amber-950/40 text-amber-300"
              }`}
            >
              {v.message}
            </div>
          ))}
        </div>
      )}

      {/* Card list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {boardEntries.length === 0 && (
          <div className="flex flex-col items-center py-10 text-zinc-600">
            <span className="text-3xl mb-2">🃏</span>
            <p className="text-xs">
              {activeBoard === "main" ? "Add cards from the search panel" : "No sideboard cards yet"}
            </p>
          </div>
        )}
        {boardEntries.map((entry) => (
          <DeckEntryRow
            key={`${entry.card.oracleId}-${entry.board}`}
            entry={entry}
            onCardClick={onCardClick}
            onIncrement={() =>
              setQuantity(entry.card.oracleId, entry.board, entry.quantity + 1)
            }
            onDecrement={() =>
              setQuantity(entry.card.oracleId, entry.board, entry.quantity - 1)
            }
            onRemove={() => removeCard(entry.card.oracleId, entry.board)}
            onMove={() =>
              moveCard(
                entry.card.oracleId,
                entry.board,
                entry.board === "main" ? "side" : "main"
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
