import { useState } from "react";
import { DeckStatsBar } from "./DeckStatsBar";
import { ManaCurveChart } from "./ManaCurveChart";
import { ManaBasePanel } from "./ManaBasePanel";
import { ArchetypePanel } from "./ArchetypePanel";
import { ValidationPanel } from "./ValidationPanel";
import { GamePlanSummary } from "./GamePlanSummary";

type Tab = "curve" | "mana" | "archetype" | "validate" | "gameplan";

const TABS: { id: Tab; label: string }[] = [
  { id: "curve",     label: "Curve" },
  { id: "mana",      label: "Mana" },
  { id: "archetype", label: "Archetype" },
  { id: "validate",  label: "Validate" },
  { id: "gameplan",  label: "Game Plan" },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("curve");
  return (
    <div className="flex flex-col h-full">
      <DeckStatsBar />
      <div className="flex shrink-0 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
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
        {tab === "curve"     && <ManaCurveChart />}
        {tab === "mana"      && <ManaBasePanel />}
        {tab === "archetype" && <ArchetypePanel />}
        {tab === "validate"  && <ValidationPanel />}
        {tab === "gameplan"  && <GamePlanSummary />}
      </div>
    </div>
  );
}
