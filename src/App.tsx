import { useCallback, useEffect, useRef, useState } from "react";
import { BulkImporter } from "./components/BulkImporter";
import { CardSearchPanel } from "./components/CardSearchPanel";
import { DeckPanel } from "./components/DeckPanel";
import { RightPanel } from "./components/RightPanel";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { Header } from "./components/Header";
import { DatabaseStatusBar } from "./components/DatabaseStatusBar";
import { DeckImportPanel } from "./components/DeckImportPanel";
import { DeckComparePanel } from "./components/DeckComparePanel";
import { DeckListPanel } from "./components/DeckListPanel";
import { useDBStatus } from "./hooks/useDBStatus";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useDeckStore } from "./store/deckStore";
import { decodeShareableLink } from "./lib/deckExporter";
import type { CardRecord } from "./lib/types";
import type { DeckImportResult } from "./lib/deckParser";

export type AppView = "builder" | "compare" | "import";
export type ImportMode = "db" | "deck";

const MOBILE_PANELS = ["Search", "Deck", "Analysis"] as const;

// ── Keyboard cheatsheet modal ──────────────────────────────────────────────────

const SHORTCUTS = [
  { key: "?",       desc: "Show / hide this cheatsheet" },
  { key: "S",       desc: "Focus card search" },
  { key: "N",       desc: "New deck" },
  { key: "Ctrl+S",  desc: "Save current deck" },
  { key: "B",       desc: "Builder view" },
  { key: "C",       desc: "Compare view" },
  { key: "I",       desc: "Import view" },
  { key: "[ / ]",   desc: "Prev / next mobile panel" },
  { key: "Esc",     desc: "Close overlays" },
] as const;

function ShortcutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-80 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map(s => (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <kbd className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300 border border-zinc-700">
                {s.key}
              </kbd>
              <span className="text-xs text-zinc-400 text-right">{s.desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-600">Double-click a deck name to rename it inline.</p>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView]               = useState<AppView>("builder");
  const [importMode, setImportMode]   = useState<ImportMode>("db");
  const [detailCard, setDetailCard]   = useState<CardRecord | null>(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const [mobilePanelIdx, setMobilePanelIdx] = useState(0);
  const [deckListOpen, setDeckListOpen]     = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  const { isReady, refresh } = useDBStatus();
  const activeDeckId         = useDeckStore(s => s.activeDeckId);
  const loadFromSnapshot     = useDeckStore(s => s.loadFromSnapshot);
  const addCard              = useDeckStore(s => s.addCard);
  const newDeck              = useDeckStore(s => s.newDeck);
  const saveCurrentDeck      = useDeckStore(s => s.saveCurrentDeck);

  // Stable ref for handlers so useKeyboardShortcuts doesn't re-subscribe on every render
  const handlersRef = useRef({
    onToggleCheatsheet: () => setCheatsheetOpen(o => !o),
    onViewChange: (v: AppView) => { setView(v); setMobilePanelIdx(0); },
    onNewDeck: () => newDeck(),
    onSaveDeck: () => saveCurrentDeck(),
    onEscape: () => {
      if (cheatsheetOpen) { setCheatsheetOpen(false); return; }
      if (detailCard)     { setDetailCard(null); return; }
      if (deckListOpen)   { setDeckListOpen(false); return; }
    },
    onPrevPanel: () => setMobilePanelIdx(i => (i - 1 + MOBILE_PANELS.length) % MOBILE_PANELS.length),
    onNextPanel: () => setMobilePanelIdx(i => (i + 1) % MOBILE_PANELS.length),
    mobilePanelCount: MOBILE_PANELS.length,
  });

  // Keep ref current without triggering hook re-subscription
  useEffect(() => {
    handlersRef.current.onEscape = () => {
      if (cheatsheetOpen) { setCheatsheetOpen(false); return; }
      if (detailCard)     { setDetailCard(null); return; }
      if (deckListOpen)   { setDeckListOpen(false); return; }
    };
  }, [cheatsheetOpen, detailCard, deckListOpen]);

  const stableHandlers = useCallback(() => handlersRef.current, [])();
  useKeyboardShortcuts(stableHandlers);

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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Header view={view} onViewChange={v => { setView(v); setMobilePanelIdx(0); }} />
      <DatabaseStatusBar onRequestImport={() => { setView("import"); setImportMode("db"); }} />

      {swUpdateReady && (
        <div className="shrink-0 flex items-center justify-between gap-3 bg-teal-900/60 border-b border-teal-700 px-4 py-2 text-sm">
          <span className="text-teal-200">A new version is available.</span>
          <button onClick={() => window.location.reload()} className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium hover:bg-teal-500">
            Reload
          </button>
        </div>
      )}

      {view === "import" ? (
        <main className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="w-full max-w-2xl space-y-4">
            <div className="flex gap-2">
              {(["db", "deck"] as ImportMode[]).map((m) => (
                <button key={m} onClick={() => setImportMode(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    importMode === m ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {m === "db" ? "Load Card Database" : "Import Deck"}
                </button>
              ))}
            </div>
            {importMode === "db"
              ? <BulkImporter onImportDone={() => { refresh(); setView("builder"); }} />
              : <DeckImportPanel onImported={handleDeckImported} />}
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
          {/* Mobile panel switcher */}
          <div className="flex shrink-0 border-b border-zinc-800 md:hidden">
            <button
              onClick={() => setDeckListOpen(o => !o)}
              className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200 border-r border-zinc-800"
              aria-label="My decks"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
              </svg>
            </button>
            {MOBILE_PANELS.map((label, i) => (
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

          <main className="flex flex-1 overflow-hidden">
            {deckListOpen && (
              <DeckListPanel onClose={() => setDeckListOpen(false)} />
            )}

            {/* Desktop 3-column */}
            <div
              className={`hidden md:grid h-full flex-1 ${ deckListOpen ? "" : "w-full" }`}
              style={{ gridTemplateColumns: "35% 40% 25%" }}
            >
              <section className="flex flex-col overflow-hidden border-r border-zinc-800">
                <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
                  <button
                    onClick={() => setDeckListOpen(o => !o)}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
                      deckListOpen ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
                    }`}
                    aria-label="Toggle deck list"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" />
                    </svg>
                    My Decks
                  </button>
                  {/* Shortcut hint */}
                  <button
                    onClick={() => setCheatsheetOpen(o => !o)}
                    className="ml-auto rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    aria-label="Keyboard shortcuts"
                    title="Keyboard shortcuts (?)"
                  >
                    ?
                  </button>
                </div>
                <CardSearchPanel onCardClick={setDetailCard} />
              </section>
              <section className="flex flex-col overflow-hidden border-r border-zinc-800">
                <DeckPanel onCardClick={setDetailCard} />
              </section>
              <section className="flex flex-col overflow-hidden">
                <RightPanel activeDeckId={activeDeckId} />
              </section>
            </div>

            {/* Mobile single-panel */}
            <div className="flex flex-col h-full overflow-hidden md:hidden flex-1">
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

      {cheatsheetOpen && (
        <ShortcutModal onClose={() => setCheatsheetOpen(false)} />
      )}
    </div>
  );
}
