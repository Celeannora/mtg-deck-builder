import { useMemo, useState } from "react";
import { DeckStatsBar } from "./DeckStatsBar";
import { ManaCurveChart } from "./ManaCurveChart";
import { ManaBasePanel } from "./ManaBasePanel";
import { ArchetypePanel } from "./ArchetypePanel";
import { ValidationPanel } from "./ValidationPanel";
import { GamePlanSummary } from "./GamePlanSummary";
import { Bo3Panel } from "./Bo3Panel";
import { SideboardPlanPanel } from "./SideboardPlanPanel";
import { CollectionPanel } from "./CollectionPanel";
import { DeckHistoryPanel } from "./DeckHistoryPanel";
import { MetagamePanel } from "./MetagamePanel";
import { DeckExportPanel } from "./DeckExportPanel";
import { AdvisorPanel } from "./AdvisorPanel";
import { ConsistencyPanel } from "./ConsistencyPanel";
import { useDeckStore, useMainboardEntries, useSideboardEntries } from "../store/deckStore";
import type { DeckSnapshot } from "../lib/deckHistory";

type Tab =
  | "curve" | "mana" | "archetype" | "validate" | "gameplan"
  | "bo3" | "sideboard" | "collection" | "history" | "export" | "meta" | "advisor"
  | "consistency";

const TABS: { id: Tab; label: string }[] = [
  { id: "curve",       label: "Curve" },
  { id: "mana",        label: "Mana" },
  { id: "consistency", label: "Odds" },
  { id: "archetype",   label: "Archetype" },
  { id: "validate",    label: "Validate" },
  { id: "gameplan",    label: "Plan" },
  { id: "bo3",         label: "Bo3" },
  { id: "sideboard",   label: "Side" },
  { id: "advisor",     label: "Advisor" },
  { id: "collection",  label: "Collect" },
  { id: "history",     label: "History" },
  { id: "export",      label: "Export" },
  { id: "meta",        label: "Meta" },
];

interface Props {
  activeDeckId: string;
}

export function RightPanel({ activeDeckId }: Props) {
  const [tab, setTab] = useState<Tab>("curve");

  const mainEntries = useMainboardEntries();
  const sideEntries = useSideboardEntries();
  const deckName    = useDeckStore(s => s.deckName);
  const loadFromSnapshot = useDeckStore(s => s.loadFromSnapshot);

  const mainCards = useMemo(() => mainEntries.map(e => e.card), [mainEntries]);
  const sideCards = useMemo(() => sideEntries.map(e => e.card), [sideEntries]);

  const deckCards = useMemo(() =>
    mainEntries.map(e => ({
      oracleId: e.card.oracleId,
      name:     e.card.name,
      quantity: e.quantity,
      priceUsd: e.card.priceUsd,
    })),
    [mainEntries]
  );

  const exportDeck = useMemo(() => ({
    name:      deckName,
    mainboard: mainEntries.map(e => ({ quantity: e.quantity, card: e.card })),
    sideboard: sideEntries.map(e => ({ quantity: e.quantity, card: e.card })),
  }), [mainEntries, sideEntries, deckName]);

  const handleRestore = (snapshot: DeckSnapshot) => {
    loadFromSnapshot({
      name: snapshot.name,
      main: Object.entries(snapshot.mainboard).map(([id, q]) => [q, id]),
      side: Object.entries(snapshot.sideboard).map(([id, q]) => [q, id]),
    });
  };

  const handleFork = (newId: string) => {
    console.info("Forked to new deck id:", newId);
  };

  return (
    <div className="flex flex-col h-full">
      <DeckStatsBar />

      {/* Scrollable tab bar */}
      <div className="flex shrink-0 overflow-x-auto border-b border-zinc-800 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-b-2 border-teal-400 text-teal-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "curve"       && <ManaCurveChart />}
        {tab === "mana"        && <ManaBasePanel />}
        {tab === "consistency" && <ConsistencyPanel />}
        {tab === "archetype"   && <ArchetypePanel />}
        {tab === "validate"    && <ValidationPanel />}
        {tab === "gameplan"    && <GamePlanSummary />}
        {tab === "bo3"         && <Bo3Panel deckId={activeDeckId} />}
        {tab === "sideboard"   && (
          <SideboardPlanPanel mainboard={mainCards} sideboard={sideCards} />
        )}
        {tab === "advisor"     && <AdvisorPanel />}
        {tab === "collection"  && <CollectionPanel deckCards={deckCards} />}
        {tab === "history"     && (
          <DeckHistoryPanel
            deckId={activeDeckId}
            onRestore={handleRestore}
            onFork={handleFork}
          />
        )}
        {tab === "export"      && <DeckExportPanel deck={exportDeck} />}
        {tab === "meta"        && <MetagamePanel />}
      </div>
    </div>
  );
}
