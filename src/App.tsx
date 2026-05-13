import { useState } from "react";
import { BulkImporter } from "./components/BulkImporter";
import { CardSearchPanel } from "./components/CardSearchPanel";
import { DeckPanel } from "./components/DeckPanel";
import { RightPanel } from "./components/RightPanel";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { Header } from "./components/Header";
import { useDBStatus } from "./hooks/useDBStatus";
import type { CardRecord } from "./lib/types";

export type AppView = "builder" | "import";

export default function App() {
  const [view, setView] = useState<AppView>("builder");
  const [detailCard, setDetailCard] = useState<CardRecord | null>(null);
  const { isReady } = useDBStatus();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Header view={view} onViewChange={setView} />

      {view === "import" ? (
        <main className="flex flex-1 items-start justify-center overflow-y-auto p-8">
          <div className="w-full max-w-2xl">
            <BulkImporter onImportDone={() => setView("builder")} />
          </div>
        </main>
      ) : !isReady ? (
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-zinc-400">
            <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <p className="text-sm">Loading card database…</p>
            <button
              onClick={() => setView("import")}
              className="mt-2 rounded-lg border border-zinc-700 px-4 py-2 text-xs hover:bg-zinc-800"
            >
              Import Bulk File
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
            <RightPanel />
          </section>
        </main>
      )}

      {detailCard && (
        <CardDetailDrawer card={detailCard} onClose={() => setDetailCard(null)} />
      )}
    </div>
  );
}
