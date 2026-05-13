import { useState } from "react";
import { useDeckStore } from "../store/deckStore";
import type { DeckCard } from "../store/deckStore";

type Board = "main" | "side";

function DeckEntry({
  entry,
  onIncrement,
  onDecrement,
  onRemove,
  onMove,
}: {
  entry: DeckCard;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onMove: () => void;
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

      <span className="flex-1 truncate text-xs text-zinc-100">{entry.card.name}</span>

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

export function DeckPanel() {
  const { name, setName, entries, validation, removeCard, setQuantity, moveCard, clearDeck } =
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

  const exportDecklist = () => {
    const main = entries.filter((e) => e.board === "main");
    const side = entries.filter((e) => e.board === "side");
    let text = main.map((e) => `${e.quantity} ${e.card.name}`).join("\n");
    if (side.length)
      text += "\n\n// Sideboard\n" + side.map((e) => `${e.quantity} ${e.card.name}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, "-")}.txt`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      {/* Tabs */}
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

      {/* Validation issues */}
      {validation && validation.issues.length > 0 && (
        <div className="space-y-1">
          {validation.issues.slice(0, 3).map((issue, i) => (
            <div
              key={i}
              className={`rounded px-2 py-1 text-xs ${
                issue.severity === "error"
                  ? "bg-red-950/40 text-red-300"
                  : "bg-amber-950/40 text-amber-300"
              }`}
            >
              {issue.message}
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
          <DeckEntry
            key={`${entry.card.oracleId}-${entry.board}`}
            entry={entry}
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
