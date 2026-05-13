import { useState } from "react";
import { BulkImporter } from "./components/BulkImporter";
import { CardSearchPanel } from "./components/CardSearchPanel";
import { DeckPanel } from "./components/DeckPanel";
import { DeckStatsBar } from "./components/DeckStatsBar";
import { SuggestionPanel } from "./components/SuggestionPanel";
import { db } from "./lib/db";
import { useLiveQuery } from "dexie-react-hooks";

type Tab = "search" | "suggest";

export function App() {
  const [leftTab, setLeftTab] = useState<Tab>("search");
  const [showImporter, setShowImporter] = useState(false);

  const cardCount = useLiveQuery(() => db.cards.count(), []) ?? 0;
  const lastImported = useLiveQuery(
    () => db.meta.get("lastImportedAt").then((r) => r?.value ?? null),
    []
  );

  const hasCards = cardCount > 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <svg
            viewBox="0 0 32 32"
            width={28}
            height={28}
            fill="none"
            aria-label="MTG Deck Builder"
            className="shrink-0"
          >
            <rect x="3" y="3" width="26" height="26" rx="4" stroke="#4f98a3" strokeWidth="2" />
            <path d="M10 22 L16 6 L22 22" stroke="#4f98a3" strokeWidth="2" strokeLinejoin="round" />
            <line x1="12" y1="17" x2="20" y2="17" stroke="#4f98a3" strokeWidth="1.5" />
          </svg>
          <span className="text-sm font-semibold tracking-tight">MTG Deck Builder</span>
        </div>

        <div className="flex items-center gap-3">
          {hasCards && (
            <span className="text-xs text-zinc-500">
              {cardCount.toLocaleString()} cards
              {lastImported && (
                <> · {new Date(lastImported).toLocaleDateString()}</>
              )}
            </span>
          )}
          <button
            onClick={() => setShowImporter((v) => !v)}
            className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            {hasCards ? "Re-import" : "Import Cards"}
          </button>
        </div>
      </header>

      {/* Importer inline */}
      {showImporter && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-3">
          <BulkImporter />
        </div>
      )}

      {/* No cards state */}
      {!hasCards && !showImporter && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-2xl">🃏</p>
            <p className="text-sm text-zinc-400">No card data loaded yet</p>
            <button
              onClick={() => setShowImporter(true)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
            >
              Import oracle_cards.json
            </button>
          </div>
        </div>
      )}

      {/* Main 3-panel layout */}
      {hasCards && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Search + Suggest */}
          <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800">
            <div className="flex border-b border-zinc-800">
              {(["search", "suggest"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setLeftTab(t)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    leftTab === t
                      ? "border-b-2 border-teal-500 text-teal-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden p-3">
              {leftTab === "search" ? <CardSearchPanel /> : <SuggestionPanel />}
            </div>
          </aside>

          {/* Center: Deck */}
          <main className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden p-4">
              <DeckPanel />
            </div>
          </main>

          {/* Right: Stats */}
          <aside className="flex w-64 shrink-0 flex-col border-l border-zinc-800 overflow-hidden">
            <div className="border-b border-zinc-800 px-4 py-2">
              <span className="text-xs font-medium text-zinc-400">Stats &amp; Analysis</span>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <DeckStatsBar />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
