import { useEffect, useState } from "react";
import { useDeckStore } from "../store/deckStore";
import type { SavedDeck } from "../lib/db";

function winRate(d: SavedDeck): string {
  const total = d.wins + d.losses + d.draws;
  if (total === 0) return "—";
  return Math.round((d.wins / total) * 100) + "%";
}

function recordStr(d: SavedDeck): string {
  return `${d.wins}W ${d.losses}L ${d.draws}D`;
}

interface Props {
  onClose: () => void;
}

export function DeckListPanel({ onClose }: Props) {
  const {
    activeDeckId,
    deckName,
    savedDecks,
    loadSavedDecks,
    saveCurrentDeck,
    loadSavedDeck,
    deleteSavedDeck,
    newDeck,
  } = useDeckStore();

  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => { loadSavedDecks(); }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveCurrentDeck();
    setSaving(false);
  };

  const handleLoad = async (id: string) => {
    await loadSavedDeck(id);
    onClose();
  };

  const handleDelete = async (id: string) => {
    if (confirm !== id) { setConfirm(id); return; }
    await deleteSavedDeck(id);
    setConfirm(null);
  };

  return (
    <aside className="flex flex-col h-full w-72 border-r border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">My Decks</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close deck list">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-b border-zinc-800">
        <button
          onClick={() => { newDeck(); onClose(); }}
          className="flex-1 rounded bg-zinc-800 px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
        >
          + New
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded bg-teal-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-teal-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Current"}
        </button>
      </div>

      {/* Deck list */}
      <div className="flex-1 overflow-y-auto">
        {savedDecks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
              <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
            </svg>
            <p className="text-xs">No saved decks yet</p>
          </div>
        )}
        {savedDecks.map(deck => (
          <div
            key={deck.id}
            className={`group flex items-start justify-between gap-2 px-3 py-2.5 border-b border-zinc-900 hover:bg-zinc-900 ${
              deck.id === activeDeckId ? "bg-zinc-900 border-l-2 border-l-teal-500" : ""
            }`}
          >
            <button
              onClick={() => handleLoad(deck.id)}
              className="flex-1 text-left min-w-0"
            >
              <p className="truncate text-xs font-medium text-zinc-200">{deck.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                <span className="text-teal-400 font-medium">{winRate(deck)}</span>
                {" "}
                <span className="text-zinc-600">{recordStr(deck)}</span>
              </p>
              <p className="text-xs text-zinc-700">
                {new Date(deck.updatedAt).toLocaleDateString()}
              </p>
            </button>
            <button
              onClick={() => handleDelete(deck.id)}
              className={`shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-xs transition-colors ${
                confirm === deck.id
                  ? "bg-red-900 text-red-200"
                  : "text-zinc-600 hover:text-red-400"
              }`}
              title={confirm === deck.id ? "Click again to confirm" : "Delete deck"}
            >
              {confirm === deck.id ? "Sure?" : "✕"}
            </button>
          </div>
        ))}
      </div>

      {/* Current deck hint */}
      <div className="px-3 py-2 border-t border-zinc-800 text-xs text-zinc-600">
        Active: <span className="text-zinc-400">{deckName}</span>
      </div>
    </aside>
  );
}
