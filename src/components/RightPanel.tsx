import { useEffect, useMemo, useState } from "react";
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
import { useDeckStore } from "../store/deckStore";
import { db } from "../lib/db";
import type { CardRecord } from "../lib/types";
import type { DeckSnapshot } from "../lib/deckHistory";

type Tab =
  | "curve" | "mana" | "archetype" | "validate" | "gameplan"
  | "bo3" | "sideboard" | "collection" | "history" | "export" | "meta";

const TABS: { id: Tab; label: string }[] = [
  { id: "curve",      label: "Curve" },
  { id: "mana",       label: "Mana" },
  { id: "archetype",  label: "Archetype" },
  { id: "validate",   label: "Validate" },
  { id: "gameplan",   label: "Plan" },
  { id: "bo3",        label: "Bo3" },
  { id: "sideboard",  label: "Side" },
  { id: "collection", label: "Collect" },
  { id: "history",    label: "History" },
  { id: "export",     label: "Export" },
  { id: "meta",       label: "Meta" },
];

interface Props {
  activeDeckId: string;
  onSwUpdateReady?: () => void;
}

export function RightPanel({ activeDeckId, onSwUpdateReady }: Props) {
  const [tab, setTab] = useState<Tab>("curve");
  const { mainboard, sideboard, deckName } = useDeckStore();

  // Resolved CardRecord arrays for panels that need them
  const [mainCards, setMainCards]   = useState<CardRecord[]>([]);
  const [sideCards, setSideCards]   = useState<CardRecord[]>([]);

  useEffect(() => {
    if (!mainboard || Object.keys(mainboard).length === 0) { setMainCards([]); return; }
    const ids = Object.keys(mainboard);
    db.cards.where("oracleId").anyOf(ids).toArray().then(setMainCards);
  }, [JSON.stringify(mainboard)]);

  useEffect(() => {
    if (!sideboard || Object.keys(sideboard).length === 0) { setSideCards([]); return; }
    const ids = Object.keys(sideboard);
    db.cards.where("oracleId").anyOf(ids).toArray().then(setSideCards);
  }, [JSON.stringify(sideboard)]);

  // SW update event listener
  useEffect(() => {
    const handler = () => onSwUpdateReady?.();
    window.addEventListener("sw-update-ready", handler);
    return () => window.removeEventListener("sw-update-ready", handler);
  }, [onSwUpdateReady]);

  const deckCards = useMemo(() =>
    mainCards.map((c) => ({
      oracleId: c.oracleId,
      name: c.name,
      quantity: mainboard?.[c.oracleId] ?? 1,
      priceUsd: c.priceUsd,
    })),
    [mainCards, mainboard]
  );

  const exportDeck = useMemo(() => ({
    name: deckName ?? "Untitled Deck",
    mainboard: mainCards.map((c) => ({ quantity: mainboard?.[c.oracleId] ?? 1, card: c })),
    sideboard: sideCards.map((c) => ({ quantity: sideboard?.[c.oracleId] ?? 1, card: c })),
  }), [mainCards, sideCards, mainboard, sideboard, deckName]);

  const handleRestore = (snapshot: DeckSnapshot) => {
    useDeckStore.getState().loadFromSnapshot?.({
      name: snapshot.name,
      main: Object.entries(snapshot.mainboard).map(([id, q]) => [q, id]),
      side: Object.entries(snapshot.sideboard).map(([id, q]) => [q, id]),
    });
  };

  const handleFork = (newId: string) => {
    // Switch active deck — store update handled externally if needed
    console.info("Forked to deck:", newId);
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
        {tab === "curve"      && <ManaCurveChart />}
        {tab === "mana"       && <ManaBasePanel />}
        {tab === "archetype"  && <ArchetypePanel />}
        {tab === "validate"   && <ValidationPanel />}
        {tab === "gameplan"   && <GamePlanSummary />}
        {tab === "bo3"        && <Bo3Panel deckId={activeDeckId} />}
        {tab === "sideboard"  && <SideboardPlanPanel mainboard={mainCards} sideboard={sideCards} />}
        {tab === "collection" && <CollectionPanel deckCards={deckCards} />}
        {tab === "history"    && (
          <DeckHistoryPanel
            deckId={activeDeckId}
            onRestore={handleRestore}
            onFork={handleFork}
          />
        )}
        {tab === "export"     && <DeckExportPanel deck={exportDeck} />}
        {tab === "meta"       && <MetagamePanel />}
      </div>
    </div>
  );
}
