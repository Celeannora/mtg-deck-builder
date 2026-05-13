import { useEffect, useState } from "react";
import { BulkImporter } from "./components/BulkImporter";
import { CardSearchPanel } from "./components/CardSearchPanel";
import { DeckPanel } from "./components/DeckPanel";
import { RightPanel } from "./components/RightPanel";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { Header } from "./components/Header";
import { DatabaseStatusBar } from "./components/DatabaseStatusBar";
import { DeckImportPanel } from "./components/DeckImportPanel";
import { useDBStatus } from "./hooks/useDBStatus";
import { useDeckStore } from "./store/deckStore";
import { decodeShareableLink } from "./lib/deckExporter";
import type { CardRecord } from "./lib/types";
import type { DeckImportResult } from "./lib/deckParser";

export type AppView = "builder" | "import";
export type ImportMode = "db" | "deck";

export default function App() {
  const [view, setView]             = useState<AppView>("builder");
  const [importMode, setImportMode] = useState<ImportMode>("db");
  const [detailCard, setDetailCard] = useState<CardRecord | null>(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const { isReady, refresh }        = useDBStatus();
  const { activeDeckId, loadFromSnapshot } = useDeckStore();

  // Decode shareable link on mount
  useEffect(() => {
    const decoded = decodeShareableLink(window.location.hash);
    if (decoded && loadFromSnapshot) {
      loadFromSnapshot(decoded);
    }
  }, []);

  const handleDeckImported = (result: DeckImportResult) => {
    if (loadFromSnapshot) {
      const main: Record<string, number> = {};
      const side: Record<string, number> = {};
      for (const entry of result.resolved) {
        const map = entry.board === "main" ? main : side;
        map[entry.card.oracleId] = (map[entry.card.oracleId] ?? 0) + entry.quantity;
      }
      loadFromSnapshot({ name: "Imported Deck", main: Object.entries(main).map(([id, q]) => [q, id]), side: Object.entries(side).map(([id, q]) => [q, id]) });
    }
    setView("builder");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Header view={view} onViewChange={setView} />
      <DatabaseStatusBar onRequestImport={() => { setView("import"); setImportMode("db"); }} />

      {swUpdateReady && (
        <div className="shrink-0 flex items-center justify-between gap-3 bg-teal-900/60 border-b border-teal-700 px-4 py-2 text-sm">
          <span className="text-teal-200">A new version is available.</span>
          <button onClick={() => window.location.reload()}
            className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium hover:bg-teal-500">
            Reload
          </button>
        </div>
      )}

      {view === "import" ? (
        <main className="flex flex-1 items-start justify-center overflow-y-auto p-8">
          <div className="w-full max-w-2xl space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["db", "deck"] as ImportMode[]).map((m) => (
                <button key={m} onClick={() => setImportMode(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    importMode === m ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}>
                  {m === "db" ? "Load Card Database" : "Import Deck"}
                </button>
              ))}
            </div>

            {importMode === "db" ? (
              <BulkImporter onImportDone={() => { refresh(); setView("builder"); }} />
            ) : (
              <DeckImportPanel onImported={handleDeckImported} />
            )}
          </div>
        </main>
      ) : !isReady ? (
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-label="Loading">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <p className="text-sm">No card data found.</p>
            <button onClick={() => setView("import")}
              className="mt-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium hover:bg-teal-500 transition-colors">
              Import Card Database
            </button>
          </div>
        </main>
      ) : (
        <main className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "35% 40% 25%" }}>
          <section className="flex flex-col overflow-hidden border-r border-zinc-800">
            <CardSearchPanel onCardClick={setDetailCard} />
          </section>
          <section className="flex flex-col overflow-hidden border-r border-zinc-800">
            <DeckPanel onCardClick={setDetailCard} />
          </section>
          <section className="flex flex-col overflow-hidden">
            <RightPanel
              activeDeckId={activeDeckId ?? ""}
              onSwUpdateReady={() => setSwUpdateReady(true)}
            />
          </section>
        </main>
      )}

      {detailCard && (
        <CardDetailDrawer card={detailCard} onClose={() => setDetailCard(null)} />
      )}
    </div>
  );
}
