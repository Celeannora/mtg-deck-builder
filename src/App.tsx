import { useEffect, useState } from "react";
import { BulkImporter } from "./components/BulkImporter";
import { CardSearchPanel } from "./components/CardSearchPanel";
import { DeckPanel } from "./components/DeckPanel";
import { RightPanel } from "./components/RightPanel";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { Header } from "./components/Header";
import { DatabaseStatusBar } from "./components/DatabaseStatusBar";
import { DeckImportPanel } from "./components/DeckImportPanel";
import { DeckComparePanel } from "./components/DeckComparePanel";
import { useDBStatus } from "./hooks/useDBStatus";
import { useDeckStore } from "./store/deckStore";
import { decodeShareableLink } from "./lib/deckExporter";
import type { CardRecord } from "./lib/types";
import type { DeckImportResult } from "./lib/deckParser";

export type AppView = "builder" | "compare" | "import";
export type ImportMode = "db" | "deck";

export default function App() {
  const [view, setView]             = useState<AppView>("builder");
  const [importMode, setImportMode] = useState<ImportMode>("db");
  const [detailCard, setDetailCard] = useState<CardRecord | null>(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [mobilePanelIdx, setMobilePanelIdx] = useState(0);

  const { isReady, refresh } = useDBStatus();
  const activeDeckId         = useDeckStore(s => s.activeDeckId);
  const loadFromSnapshot     = useDeckStore(s => s.loadFromSnapshot);
  const addCard              = useDeckStore(s => s.addCard);

  useEffect(() => {
    const decoded = decodeShareableLink(window.location.hash);
    if (decoded) loadFromSnapshot(decoded);
  }, []);

  useEffect(() => {
    const handler = () => setSwUpdateReady(true);
    window.addEventListener("sw-update-ready", handler);
    return () => window.removeEventListener("sw-update-ready", handler);
  }, []);

  const handleDeckImported = (result: DeckImportResult) => {
    useDeckStore.getState().clearDeck();
    for (const { card, quantity, board } of result.resolved) {
      for (let i = 0; i < quantity; i++) addCard(card, board);
    }
    setView("builder");
  };

  // Mobile panel labels for the 3-column builder layout
  const mobilePanels = ["Search", "Deck", "Analysis"];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Header view={view} onViewChange={v => { setView(v); setMobilePanelIdx(0); }} />
      <DatabaseStatusBar onRequestImport={() => { setView("import"); setImportMode("db"); }} />

      {swUpdateReady && (
        <div className="shrink-0 flex items-center justify-between gap-3 bg-teal-900/60 border-b border-teal-700 px-4 py-2 text-sm">
          <span className="text-teal-200">A new version is available.</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium hover:bg-teal-500"
          >
            Reload
          </button>
        </div>
      )}

      {view === "import" ? (
        <main className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="w-full max-w-2xl space-y-4">
            <div className="flex gap-2">
              {(["db", "deck"] as ImportMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setImportMode(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    importMode === m
                      ? "bg-teal-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
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

      ) : view === "compare" ? (
        <main className="flex flex-1 overflow-hidden">
          <DeckComparePanel />
        </main>

      ) : !isReady ? (
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Loading">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <p className="text-sm">No card data found.</p>
            <button onClick={() => setView("import")} className="mt-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium hover:bg-teal-500 transition-colors">
              Import Card Database
            </button>
          </div>
        </main>

      ) : (
        <>
          {/* ── Mobile panel switcher tabs (hidden on md+) ── */}
          <div className="flex shrink-0 border-b border-zinc-800 md:hidden">
            {mobilePanels.map((label, i) => (
              <button
                key={label}
                onClick={() => setMobilePanelIdx(i)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  mobilePanelIdx === i
                    ? "border-b-2 border-teal-500 text-teal-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Main builder layout ── */}
          <main className="flex-1 overflow-hidden">
            {/* Desktop: fixed 3-column grid */}
            <div
              className="hidden md:grid h-full"
              style={{ gridTemplateColumns: "35% 40% 25%" }}
            >
              <section className="flex flex-col overflow-hidden border-r border-zinc-800">
                <CardSearchPanel onCardClick={setDetailCard} />
              </section>
              <section className="flex flex-col overflow-hidden border-r border-zinc-800">
                <DeckPanel onCardClick={setDetailCard} />
              </section>
              <section className="flex flex-col overflow-hidden">
                <RightPanel activeDeckId={activeDeckId} />
              </section>
            </div>

            {/* Mobile: single-panel view controlled by tab */}
            <div className="flex flex-col h-full overflow-hidden md:hidden">
              {mobilePanelIdx === 0 && <CardSearchPanel onCardClick={setDetailCard} />}
              {mobilePanelIdx === 1 && <DeckPanel onCardClick={setDetailCard} />}
              {mobilePanelIdx === 2 && <RightPanel activeDeckId={activeDeckId} />}
            </div>
          </main>
        </>
      )}

      {detailCard && (
        <CardDetailDrawer card={detailCard} onClose={() => setDetailCard(null)} />
      )}
    </div>
  );
}
